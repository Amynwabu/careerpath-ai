import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Scores = Record<string, number>;

export function ApplicationReadiness({
  readinessScore,
  subScores,
  gapCount = 0,
}: {
  readinessScore?: number;
  subScores?: Scores;
  gapCount?: number;
}) {
  const base = readinessScore ?? 0;
  const rows = [
    { label: "CV fit", value: Math.round((subScores?.profile ?? base) * 0.9 + 6), note: "Role keywords, chronology, and achievements." },
    { label: "LinkedIn fit", value: Math.round((subScores?.profile ?? base) * 0.82 + 8), note: "Headline, proof points, and discoverability." },
    { label: "Interview readiness", value: Math.max(18, Math.round((subScores?.skills ?? base) - gapCount * 4)), note: "Skill depth and story quality." },
    { label: "Portfolio coverage", value: Math.max(12, Math.round((subScores?.experience ?? base) - gapCount * 3)), note: "Projects mapped to target-role outcomes." },
  ];

  return (
    <Card className="blue-card">
      <CardHeader>
        <p className="eyebrow">Application Readiness</p>
        <CardTitle>When You Are Ready To Apply</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-xl blue-tile p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="font-semibold">{row.label}</p>
              <p className="font-mono text-2xl font-black text-primary">{Math.min(100, row.value)}%</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, row.value)}%` }} />
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{row.note}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
