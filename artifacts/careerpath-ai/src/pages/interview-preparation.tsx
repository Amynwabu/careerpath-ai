import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/api-request";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type InterviewSession = {
  sessionId: string;
  status: string;
  interviewType: string;
  interviewFormatStatus: string;
  vacancy: { title: string; expiryDate: string | null };
  matchResult: { overallScore: number };
  cvAnalysis: { cvAlignment: { overallScore: number } } | null;
  competencies: Array<{
    competencyId: string;
    label: string;
    importance: string;
    confidence: number;
    vacancyRequirementIds: string[];
  }>;
  questionPlan: Array<{
    questionId: string;
    questionType: string;
    text: string;
    preparationLabel: string;
    sourceReason: string;
  }>;
  evidenceSelections: Array<{
    questionId: string;
    evidenceStrength: string;
    verificationStatus: string;
    selectionReason: string;
  }>;
  responses: Array<{
    responseId: string;
    questionId: string;
    overallClaimStatus: string;
    reviewStatus: string;
  }>;
  practiceSessions: Array<{
    practiceSessionId: string;
    mode: string;
    status: string;
  }>;
  readiness: null | {
    score: number;
    blockers: Array<{ code: string; category: string; message: string }>;
    disclaimer: string;
  };
};

export default function InterviewPreparation() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery<{ items: InterviewSession[] }>({
    queryKey: ["/interview-intelligence/sessions"],
    queryFn: () => apiRequest("/interview-intelligence/sessions"),
  });
  const selected = data?.items.find((item) => item.sessionId === selectedId) ??
    data?.items[0] ?? null;
  const question = selected?.questionPlan.find((item) => item.questionId === activeQuestion) ??
    selected?.questionPlan[0] ?? null;
  const evidence = selected?.evidenceSelections.find((item) =>
    item.questionId === question?.questionId,
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium text-blue-700">Interview intelligence</p>
            <h1 className="text-2xl font-semibold">Evidence-grounded interview preparation</h1>
          </div>
          <Button asChild variant="outline"><Link href="/cv-optimisation">CV workspace</Link></Button>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[250px_1fr]">
        <aside>
          <Card>
            <CardHeader><CardTitle className="text-base">Interview sessions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {isLoading && <p>Loading…</p>}
              {error && <p className="text-sm text-red-700">Sessions could not be loaded.</p>}
              {data?.items.map((item) => (
                <button
                  key={item.sessionId}
                  className="w-full rounded border p-3 text-left focus-visible:outline focus-visible:outline-2"
                  onClick={() => setSelectedId(item.sessionId)}
                >
                  <strong>{item.vacancy.title}</strong>
                  <span className="block text-xs">{item.status.replaceAll("_", " ")}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </aside>
        <section className="space-y-5" aria-label="Interview preparation workflow">
          {selected && (
            <>
              <Card>
                <CardHeader><CardTitle>1. Interview overview</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-4">
                  <p><strong>Role</strong><br />{selected.vacancy.title}</p>
                  <p><strong>Job match</strong><br />{selected.matchResult.overallScore}</p>
                  <p><strong>CV alignment</strong><br />{selected.cvAnalysis?.cvAlignment.overallScore ?? "Unavailable"}</p>
                  <p><strong>Format</strong><br />{selected.interviewFormatStatus}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>2. Competency map</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {selected.competencies.map((item) => (
                    <article className="rounded border p-3" key={item.competencyId}>
                      <Badge>{item.importance}</Badge>
                      <h3 className="mt-2 font-medium">{item.label}</h3>
                      <p className="text-sm">Confidence {Math.round(item.confidence * 100)}%</p>
                      <p className="text-xs text-slate-500">{item.vacancyRequirementIds.length} mapped vacancy requirements</p>
                    </article>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>3. Question plan</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {selected.questionPlan.map((item) => (
                    <button
                      className="w-full rounded border p-3 text-left"
                      key={item.questionId}
                      onClick={() => setActiveQuestion(item.questionId)}
                    >
                      <Badge variant="secondary">{item.questionType}</Badge>
                      <span className="ml-2">{item.text}</span>
                      <span className="block text-xs text-slate-500">{item.preparationLabel.replaceAll("_", " ")}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>4. Build STAR responses</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {question && <p className="font-medium">{question.text}</p>}
                  <p className="text-sm">
                    Evidence: <strong>{evidence?.evidenceStrength ?? "evidence required"}</strong> ·{" "}
                    {evidence?.verificationStatus ?? "unconfirmed"}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {["Situation", "Task", "Action", "Result", "Learning"].map((field) => (
                      <label key={field} className="text-sm font-medium">
                        {field}
                        <textarea
                          className="mt-1 min-h-20 w-full rounded border p-2"
                          aria-label={`${field} response`}
                          placeholder="Enter only supported or explicitly confirmed details"
                        />
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">Every edit is claim-validated; unsupported metrics and ownership claims are blocked.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>5. Practice</CardTitle></CardHeader>
                <CardContent>
                  <p>Guided, timed, competency, technical, leadership and full-mock modes are modelled.</p>
                  <p className="text-sm text-slate-600">No voice, video, emotion, accent or biometric analysis is performed.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>6. Review feedback</CardTitle></CardHeader>
                <CardContent>
                  <p>Feedback covers relevance, clarity, specificity, evidence, ownership, structure, result, reflection and overclaim risk.</p>
                  <p className="text-sm">Risk states use words and explanations, not colour alone.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>7. Interview readiness</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-4xl font-semibold text-blue-700">{selected.readiness?.score ?? "—"}</p>
                  {selected.readiness?.blockers.map((blocker) => (
                    <p className="rounded border p-3 text-sm" key={blocker.code}>
                      <strong>{blocker.category}</strong>: {blocker.message}
                    </p>
                  ))}
                  <p className="text-xs text-slate-500">
                    {selected.readiness?.disclaimer ?? "Readiness is not a prediction of interview success."}
                  </p>
                  <p className="text-sm">Advisor review requires a genuine persistent scoped grant. Export remains owner-bound.</p>
                </CardContent>
              </Card>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
