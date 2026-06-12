import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OutcomeTransparency({
  readinessScore,
  targetMonths,
}: {
  readinessScore?: number;
  targetMonths?: number;
}) {
  const months = targetMonths ?? 12;
  const readiness = readinessScore ?? 50;
  const lower = Math.max(1, Math.round(months * 0.75));
  const upper = Math.max(lower + 1, Math.round(months * (1.15 + (100 - readiness) / 140)));

  return (
    <Card className="blue-card">
      <CardHeader>
        <p className="eyebrow">Outcome Transparency</p>
        <CardTitle>Estimated Transition Range</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-xl blue-tile p-5">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">Likely range</p>
          <p className="mt-2 font-mono text-5xl font-black text-primary">{lower}-{upper}</p>
          <p className="mt-1 text-sm text-muted-foreground">months, assuming steady weekly effort and portfolio proof.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Assumption title="Assumes" text="Profile data is accurate, learning time is realistic, and milestones are completed weekly." />
          <Assumption title="Improves with" text="More project evidence, recent certifications, interview practice, and mentor feedback." />
          <Assumption title="Slows with" text="Low weekly learning time, missing portfolio work, weak role focus, or region mismatch." />
        </div>
      </CardContent>
    </Card>
  );
}

function Assumption({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
