import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/api-request";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Session = {
  sessionId: string;
  vacancyId: string;
  status: string;
  selectedTemplate: string;
  recordVersion: number;
  vacancy: {
    title: string;
    occupationTitle: string;
    expiryDate: string | null;
  };
  matchResult: { overallScore: number };
  analysis: null | {
    cvAlignment: {
      overallScore: number;
      band: string;
      disclaimer: string;
    };
    atsFindings: Array<{
      findingId: string;
      risk: string;
      title: string;
      recommendation: string;
    }>;
    alignments: Array<{
      requirementId: string;
      alignmentStatus: string;
      reason: string;
    }>;
    requirements: Array<{
      requirementId: string;
      rawText: string;
      importance: string;
    }>;
  };
  recommendations: Array<{
    recommendationId: string;
    priority: string;
    action: string;
    reason: string;
    status: string;
  }>;
  drafts: Array<{
    draftId: string;
    draftVersion: number;
    template: string;
    reviewStatus: string;
    sections: {
      summary: { text: string; claimStatus: string } | null;
      skills: Array<{ text: string; claimStatus: string }>;
      employment: Array<{
        employmentId: string;
        employer: string | null;
        jobTitle: string | null;
        bullets: Array<{ text: string; claimStatus: string }>;
      }>;
    };
  }>;
};

export default function CvOptimisation() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const { data, isLoading, error } = useQuery<{ items: Session[] }>({
    queryKey: ["/cv-optimisation/sessions"],
    queryFn: () => apiRequest("/cv-optimisation/sessions"),
  });
  const selected = data?.items.find((item) => item.sessionId === selectedId) ??
    data?.items[0] ?? null;
  const refresh = () => queryClient.invalidateQueries({
    queryKey: ["/cv-optimisation/sessions"],
  });
  const analyse = useMutation({
    mutationFn: (session: Session) => apiRequest(
      `/cv-optimisation/sessions/${session.sessionId}/analyse`,
      {
        method: "POST",
        headers: { "Idempotency-Key": `analyse-${session.sessionId}-${session.recordVersion}` },
      },
    ),
    onSuccess: refresh,
  });
  const generate = useMutation({
    mutationFn: (session: Session) => apiRequest(
      `/cv-optimisation/sessions/${session.sessionId}/drafts`,
      {
        method: "POST",
        headers: { "Idempotency-Key": `draft-${session.sessionId}-${session.recordVersion}` },
      },
    ),
    onSuccess: refresh,
  });
  const latestDraft = selected?.drafts.at(-1);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium text-blue-700">Application intelligence</p>
            <h1 className="text-2xl font-semibold">CV optimisation workspace</h1>
          </div>
          <Button asChild variant="outline"><Link href="/opportunities">Back to opportunities</Link></Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[260px_1fr]">
        <aside>
          <Card>
            <CardHeader><CardTitle className="text-base">Application sessions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {isLoading && <p>Loading…</p>}
              {error && <p className="text-sm text-red-700">Sessions could not be loaded.</p>}
              {data?.items.map((session) => (
                <button
                  className="w-full rounded border p-3 text-left focus-visible:outline focus-visible:outline-2"
                  key={session.sessionId}
                  onClick={() => setSelectedId(session.sessionId)}
                >
                  <strong className="block">{session.vacancy.title}</strong>
                  <span className="text-xs text-slate-600">{session.status.replaceAll("_", " ")}</span>
                </button>
              ))}
              {!isLoading && !data?.items.length && (
                <p className="text-sm text-slate-600">
                  Select a matched vacancy to start an evidence-grounded session.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-5" aria-label="CV optimisation workflow">
          {selected && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>1. Selected vacancy</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-3">
                  <div><span className="text-xs text-slate-500">Role</span><p>{selected.vacancy.title}</p></div>
                  <div><span className="text-xs text-slate-500">Job match</span><p>{selected.matchResult.overallScore}</p></div>
                  <div><span className="text-xs text-slate-500">Template</span><p>{selected.selectedTemplate}</p></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>2. Analyse current CV</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {!selected.analysis ? (
                    <Button onClick={() => analyse.mutate(selected)} disabled={analyse.isPending}>
                      {analyse.isPending ? "Analysing…" : "Run evidence and ATS analysis"}
                    </Button>
                  ) : (
                    <>
                      <div className="flex items-end gap-3">
                        <span className="text-4xl font-semibold text-blue-700">
                          {selected.analysis.cvAlignment.overallScore}
                        </span>
                        <span className="pb-1">{selected.analysis.cvAlignment.band.replaceAll("_", " ")}</span>
                      </div>
                      <p className="text-xs text-slate-500">{selected.analysis.cvAlignment.disclaimer}</p>
                      <div>
                        <h3 className="font-medium">ATS structural findings</h3>
                        <ul className="mt-2 space-y-2">
                          {selected.analysis.atsFindings.map((finding) => (
                            <li className="rounded border p-3 text-sm" key={finding.findingId}>
                              <Badge variant="secondary">{finding.risk}</Badge>{" "}
                              <strong>{finding.title}</strong>
                              <p className="mt-1 text-slate-600">{finding.recommendation}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {selected.analysis && (
                <Card>
                  <CardHeader><CardTitle>3. Review recommendations</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {selected.recommendations.map((item) => (
                      <article className="rounded border p-3" key={item.recommendationId}>
                        <div className="flex items-center gap-2">
                          <Badge>{item.priority}</Badge>
                          <strong>{item.action}</strong>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{item.reason}</p>
                        <p className="mt-2 text-xs">Status: {item.status}</p>
                      </article>
                    ))}
                    <p className="text-sm text-slate-600">
                      Missing evidence is never inserted as a claim. User confirmation and advisor review
                      remain explicit review states.
                    </p>
                  </CardContent>
                </Card>
              )}

              {selected.analysis && (
                <Card>
                  <CardHeader><CardTitle>4. Generate tailored draft</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {!latestDraft && (
                      <Button onClick={() => generate.mutate(selected)} disabled={generate.isPending}>
                        {generate.isPending ? "Generating…" : "Generate from supported evidence"}
                      </Button>
                    )}
                    {latestDraft && (
                      <>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Version {latestDraft.draftVersion}</Badge>
                          <span className="text-sm">{latestDraft.reviewStatus}</span>
                        </div>
                        {latestDraft.sections.summary && (
                          <div>
                            <h3 className="font-medium">Professional summary</h3>
                            <p className="mt-1">{latestDraft.sections.summary.text}</p>
                            <p className="text-xs text-slate-500">
                              Claim status: {latestDraft.sections.summary.claimStatus}
                            </p>
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium">Skills</h3>
                          <ul className="mt-1 list-disc pl-5">
                            {latestDraft.sections.skills.map((skill) => (
                              <li key={skill.text}>{skill.text} — {skill.claimStatus}</li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {latestDraft && (
                <Card>
                  <CardHeader><CardTitle>5. Compare versions</CardTitle></CardHeader>
                  <CardContent>
                    <Button variant="outline" onClick={() => setCompareMode((value) => !value)}>
                      {compareMode ? "Hide accessible comparison" : "Show accessible comparison"}
                    </Button>
                    {compareMode && (
                      <div className="mt-4 rounded border p-4" aria-label="Version comparison">
                        <h3 className="font-medium">Change descriptions</h3>
                        <p className="mt-2 text-sm">
                          Added supported content is labelled in text, not only by colour. Removed content
                          remains available in previous immutable versions.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {latestDraft && (
                <Card>
                  <CardHeader><CardTitle>6. Validate and export</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <p>Claim validation must pass before approval or export.</p>
                    <p className="text-sm text-slate-600">
                      Implemented exports: plain text, Markdown and structured JSON. DOCX and PDF are not
                      presented as available.
                    </p>
                    <p className="text-sm">
                      Advisor review requires an active scoped grant and is not inferred from membership.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
