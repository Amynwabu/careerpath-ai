import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/api-request";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Opportunity = {
  vacancy: {
    jobId: string;
    title: string;
    occupationTitle: string;
    location: string | null;
    remoteType: string;
    employmentType: string;
    salaryMin: number | null;
    salaryMax: number | null;
    currency: string | null;
  };
  match: {
    overallScore: number;
    matchBand: string;
    confidence: number;
    strengths: Array<{ requirement: string; evidence: string[] }>;
    gaps: Array<{ kind: string; requirement: string; evidence: string[]; action: string }>;
    explanations: string[];
    disclaimer: string;
  };
  rankScore: number;
};

export default function Opportunities() {
  const [query, setQuery] = useState("");
  const [minimumScore, setMinimumScore] = useState(0);
  const [saved, setSaved] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [active, setActive] = useState<Opportunity | null>(null);
  const { data, isLoading, error } = useQuery<{ items: Opportunity[] }>({
    queryKey: ["/api/job-matches"],
    queryFn: async () => {
      return apiRequest<{ items: Opportunity[] }>("/job-matches");
    },
  });
  const items = useMemo(
    () => (data?.items ?? []).filter((item) =>
      item.match.overallScore >= minimumScore &&
      `${item.vacancy.title} ${item.vacancy.occupationTitle} ${item.vacancy.location ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    ),
    [data, minimumScore, query],
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium text-blue-700">Opportunity intelligence</p>
            <h1 className="text-2xl font-semibold text-slate-950">Recommended jobs</h1>
          </div>
          <Button asChild variant="outline"><Link href="/dashboard">Dashboard</Link></Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Filter and search</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <label className="block text-sm font-medium" htmlFor="job-search">Keywords or location</label>
              <Input id="job-search" value={query} onChange={(event) => setQuery(event.target.value)} />
              <label className="block text-sm font-medium" htmlFor="minimum-score">Minimum match score</label>
              <Input
                id="minimum-score"
                type="number"
                min={0}
                max={100}
                value={minimumScore}
                onChange={(event) => setMinimumScore(Number(event.target.value))}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Workspace</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-700">
              <p>{items.length} recommended jobs</p>
              <p>{saved.length} saved jobs</p>
              <p>{selected.length} selected for comparison</p>
              <p>Advisor review: available with an eligible membership</p>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-4" aria-label="Recommended opportunities">
          {isLoading && <Card><CardContent className="py-8">Loading recommendations…</CardContent></Card>}
          {error && (
            <Card><CardContent className="py-8 text-red-700">
              Recommendations could not be loaded. Your CV and private advisor notes were not exposed.
            </CardContent></Card>
          )}
          {!isLoading && !error && items.length === 0 && (
            <Card><CardContent className="py-8">
              No matches are available yet. Complete your Career Profile and run deterministic matching.
            </CardContent></Card>
          )}
          {items.map((item) => (
            <Card key={item.vacancy.jobId}>
              <CardContent className="grid gap-4 py-5 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{item.vacancy.title}</h2>
                    <Badge variant="secondary">{item.match.matchBand}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.vacancy.location ?? "Location not supplied"} · {item.vacancy.remoteType} · {item.vacancy.employmentType}
                  </p>
                  <p className="mt-3 text-sm">{item.match.explanations[0]}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {item.match.gaps.length} missing or unresolved requirements
                  </p>
                </div>
                <div className="min-w-36 text-right">
                  <p className="text-3xl font-semibold text-blue-700">{item.match.overallScore}</p>
                  <p className="text-xs text-slate-500">evidence alignment</p>
                  <div className="mt-3 flex flex-col gap-2">
                    <Button size="sm" onClick={() => setActive(item)}>Why this job?</Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSaved((current) =>
                        current.includes(item.vacancy.jobId)
                          ? current.filter((id) => id !== item.vacancy.jobId)
                          : [...current, item.vacancy.jobId],
                      )}
                    >
                      {saved.includes(item.vacancy.jobId) ? "Saved" : "Save job"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelected((current) =>
                        current.includes(item.vacancy.jobId)
                          ? current.filter((id) => id !== item.vacancy.jobId)
                          : current.length < 3 ? [...current, item.vacancy.jobId] : current,
                      )}
                    >
                      Compare
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {active && (
            <Card className="border-blue-200" aria-label="Recommendation explanation">
              <CardHeader><CardTitle>Why {active.vacancy.title}?</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <h3 className="font-medium">Matched evidence</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {active.match.strengths.map((strength) => (
                      <li key={strength.requirement}>{strength.requirement}: {strength.evidence.join("; ")}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium">Missing skills and requirements</h3>
                  <ul className="mt-2 space-y-2 text-sm">
                    {active.match.gaps.map((gap) => (
                      <li key={`${gap.kind}:${gap.requirement}`} className="rounded bg-amber-50 p-3">
                        <strong>{gap.requirement}</strong><br />{gap.action}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-slate-500">{active.match.disclaimer}</p>
                <div className="rounded border p-3 text-sm">
                  <strong>Advisor workflow:</strong> Advisors may explain recommendations, comment on evidence,
                  approve actions and track placement only when their account is authorised. Private notes are
                  never included in the matching payload.
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}
