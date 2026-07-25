import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/api-request";

type AdvisorCase = {
  id: string;
  ownerUserId: number;
  serviceType: string;
  caseStatus: string;
  caseStage: string;
  priority: string;
  nextReviewAt: string | null;
  recordVersion: number;
};
type CaseList = { items: AdvisorCase[]; persistenceStatus: "persistent" };
type CaseResponse = { case: AdvisorCase; persistenceStatus: "persistent" };

export default function AdvisorWorkspace() {
  const params = useParams<{ caseId?: string }>();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState("");
  const cases = useQuery({
    queryKey: ["advisor-cases"],
    queryFn: () => apiRequest<CaseList>("/advisor/cases"),
  });
  const selected = useQuery({
    queryKey: ["advisor-case", params.caseId],
    enabled: Boolean(params.caseId),
    queryFn: () => apiRequest<CaseResponse>(`/advisor/cases/${params.caseId}`),
  });

  async function transition(action: "accept" | "hold" | "resume" | "close") {
    const item = selected.data?.case;
    if (!item) return;
    setNotice("");
    try {
      await apiRequest(`/advisor/cases/${item.id}/${action}`, {
        method: "POST",
        headers: { "If-Match": String(item.recordVersion) },
      });
      setNotice(`Case ${action} was confirmed by the server.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["advisor-cases"] }),
        queryClient.invalidateQueries({ queryKey: ["advisor-case", item.id] }),
      ]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The case could not be updated.");
    }
  }

  return (
    <AppLayout>
      <main className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
        <header className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Advisor workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight">Scoped client cases</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Only cases backed by your verified advisor profile, current grant, and assigned scopes are returned.
          </p>
        </header>

        {cases.isLoading && <p role="status">Loading your persisted caseload…</p>}
        {cases.isError && (
          <Card><CardContent className="pt-6 text-sm text-destructive">
            Your advisor profile is not operational, or the caseload could not be loaded.
          </CardContent></Card>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <Card>
            <CardHeader><CardTitle>Caseload</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {cases.data?.items.length === 0 && <p className="text-sm text-muted-foreground">No accessible cases.</p>}
              {cases.data?.items.map((item) => (
                <a
                  key={item.id}
                  href={`/advisor/cases/${item.id}`}
                  className="block rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{item.serviceType}</span>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs">{item.caseStatus}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.caseStage.replaceAll("_", " ")} · {item.priority}
                  </p>
                </a>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{params.caseId ? "Case overview" : "Select a case"}</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {selected.isLoading && <p role="status">Loading the authorized case…</p>}
              {selected.isError && <p className="text-sm text-destructive">The case was not found or access is no longer active.</p>}
              {selected.data?.case && (
                <>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <Field label="Status" value={selected.data.case.caseStatus} />
                    <Field label="Stage" value={selected.data.case.caseStage} />
                    <Field label="Service" value={selected.data.case.serviceType} />
                    <Field label="Priority" value={selected.data.case.priority} />
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    {selected.data.case.caseStatus === "pending_acceptance" && <Button onClick={() => transition("accept")}>Accept case</Button>}
                    {selected.data.case.caseStatus === "active" && <Button variant="outline" onClick={() => transition("hold")}>Put on hold</Button>}
                    {selected.data.case.caseStatus === "on_hold" && <Button onClick={() => transition("resume")}>Resume</Button>}
                    {["active", "on_hold", "awaiting_client", "awaiting_advisor"].includes(selected.data.case.caseStatus) &&
                      <Button variant="outline" onClick={() => transition("close")}>Close case</Button>}
                  </div>
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Shared resources, sessions, notes, actions, evidence, reviews, outcomes, and follow-ups remain unavailable
                    until their persistent API contracts pass the same authorization checks.
                  </div>
                </>
              )}
              {notice && <p role="status" className="text-sm">{notice}</p>}
            </CardContent>
          </Card>
        </div>
      </main>
    </AppLayout>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value.replaceAll("_", " ")}</dd></div>;
}
