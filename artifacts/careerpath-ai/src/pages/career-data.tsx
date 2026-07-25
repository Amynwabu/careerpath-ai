import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api-request";

type Collection = { items: Array<Record<string, unknown>>; persistenceStatus: "persistent" };

export default function CareerData() {
  const client = useQueryClient();
  const [retentionMode, setRetentionMode] = useState("persist_profile_only");
  const [uploadStatus, setUploadStatus] = useState("");
  const [advisorId, setAdvisorId] = useState("");
  const [notice, setNotice] = useState("");
  const profiles = useQuery({
    queryKey: ["persistent-profiles"],
    queryFn: () => apiRequest<Collection>("/profiles?limit=25"),
  });
  const plans = useQuery({
    queryKey: ["persistent-plans"],
    queryFn: () => apiRequest<Collection>("/career-plans?limit=25"),
  });
  const assessments = useQuery({
    queryKey: ["persistent-assessments"],
    queryFn: () => apiRequest<Collection>("/career-assessments?limit=25"),
  });
  const grants = useQuery({
    queryKey: ["advisor-access"],
    queryFn: () => apiRequest<Collection>("/advisor-access"),
  });

  async function upload(file?: File) {
    if (!file) return;
    setUploadStatus("Uploading privately and awaiting malware scan");
    try {
      const contentBase64 = await fileBase64(file);
      await apiRequest("/profile-documents/upload", {
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          contentBase64,
          retentionMode,
        }),
      });
      setUploadStatus("Upload stored privately and scan policy passed");
      await client.invalidateQueries({ queryKey: ["persistent-profiles"] });
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : "Upload failed");
    }
  }

  async function requestExport() {
    try {
      await apiRequest("/account/export", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ format: "json" }),
      });
      setNotice("Export request saved. Private document files are excluded.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Export request failed");
    }
  }

  async function grantAccess() {
    try {
      await apiRequest("/advisor-access", {
        method: "POST",
        body: JSON.stringify({
          advisorUserId: Number(advisorId),
          scopes: ["redacted_profile_read", "assessment_read", "plan_read"],
        }),
      });
      setNotice("Scoped advisor access granted by the server.");
      await grants.refetch();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Advisor access failed");
    }
  }

  async function requestDeletion() {
    try {
      await apiRequest("/account/deletion-request", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({}),
      });
      setNotice("Account-data deletion request recorded. Completion is reported only after configured systems confirm deletion.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Deletion request failed");
    }
  }

  return (
    <AppLayout>
      <main className="mx-auto max-w-5xl space-y-8 p-6 md:p-8">
        <header>
          <p className="text-sm font-medium text-primary">Data and privacy</p>
          <h1 className="mt-2 text-3xl font-bold">Your saved career data</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Career data is private to your account. Advisor access is denied by
            default and must be explicitly scoped. Deterministic services—not
            an LLM—choose canonical career outputs.
          </p>
        </header>

        <section aria-labelledby="saved-data-title">
          <Card>
            <CardHeader><CardTitle id="saved-data-title">Resume and history</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Count label="Saved profiles" query={profiles} />
              <Count label="Assessment history" query={assessments} />
              <Count label="Saved plan versions" query={plans} />
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="upload-title">
          <Card>
            <CardHeader><CardTitle id="upload-title">Private CV upload</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                PDF, DOCX, TXT or Markdown; maximum 8 MiB. Files remain private.
                Production parsing requires a clean malware-scan result.
              </p>
              <div>
                <label htmlFor="retention-mode" className="mb-2 block text-sm font-medium">
                  Source-document retention
                </label>
                <select
                  id="retention-mode"
                  value={retentionMode}
                  onChange={(event) => setRetentionMode(event.target.value)}
                  className="h-10 w-full border border-border bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="persist_profile_only">Save profile, delete source after processing</option>
                  <option value="temporary">Keep source temporarily</option>
                  <option value="persist_document">Keep source until deletion or policy expiry</option>
                  <option value="process_only">Process without retaining source</option>
                </select>
              </div>
              <div>
                <label htmlFor="career-document" className="mb-2 block text-sm font-medium">
                  Choose career document
                </label>
                <Input
                  id="career-document"
                  type="file"
                  accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                  onChange={(event) => void upload(event.target.files?.[0])}
                />
              </div>
              {uploadStatus && <p role="status" className="text-sm">{uploadStatus}</p>}
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="advisor-title">
          <Card>
            <CardHeader><CardTitle id="advisor-title">Advisor access</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Redacted sharing excludes contact details. Grants are scoped,
                revocable and may expire. Active grants: {grants.data?.items.length ?? 0}.
              </p>
              <div>
                <label htmlFor="advisor-id" className="mb-2 block text-sm font-medium">
                  Advisor user ID
                </label>
                <Input id="advisor-id" inputMode="numeric" value={advisorId} onChange={(event) => setAdvisorId(event.target.value)} />
              </div>
              <Button type="button" disabled={!advisorId} onClick={() => void grantAccess()}>
                Grant redacted plan access
              </Button>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="lifecycle-title">
          <Card>
            <CardHeader><CardTitle id="lifecycle-title">Export and deletion</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generated exports expire under the configured retention policy.
                Deletion is scheduled and remains auditable; minimal tombstone
                records contain no full personal data.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" onClick={() => void requestExport()}>
                  Request JSON export
                </Button>
                <Button type="button" variant="destructive" onClick={() => void requestDeletion()}>
                  Request account-data deletion
                </Button>
              </div>
              {notice && <p role="status" className="text-sm">{notice}</p>}
            </CardContent>
          </Card>
        </section>
      </main>
    </AppLayout>
  );
}

function Count({ label, query }: {
  label: string;
  query: { data?: Collection; isLoading: boolean; isError: boolean };
}) {
  return (
    <div className="border border-border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">
        {query.isLoading ? "…" : query.isError ? "Unavailable" : query.data?.items.length ?? 0}
      </p>
    </div>
  );
}

function fileBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File could not be read."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}
