import { useState } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const steps = [
  "Review profile",
  "Confirm current career",
  "Choose career goal",
  "View readiness",
  "Build action plan",
  "Track progress",
];

export default function CareerPlan() {
  const [target, setTarget] = useState("");
  const [horizon, setHorizon] = useState("12");
  const [weeklyHours, setWeeklyHours] = useState("");
  const [goalPrepared, setGoalPrepared] = useState(false);

  return (
    <AppLayout>
      <main className="mx-auto max-w-5xl space-y-8 p-6 md:p-8">
        <header>
          <p className="text-sm font-medium text-primary">Career planning</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Build an evidence-backed career plan
          </h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Review your evidence, confirm both occupations, then assess
            published requirements. Readiness is guidance—not a guarantee of
            employability or a measure of professional worth.
          </p>
        </header>

        <nav aria-label="Career planning steps">
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step} className="border border-border bg-card p-3">
                <span className="mr-2 font-mono text-sm text-muted-foreground">
                  {index + 1}
                </span>
                <span className="font-medium">{step}</span>
              </li>
            ))}
          </ol>
        </nav>

        <section aria-labelledby="profile-review-title">
          <Card>
            <CardHeader>
              <CardTitle id="profile-review-title">1. Review profile evidence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Correct employment, education, skills and missing evidence
                before assessment. Missing CV evidence is not treated as proof
                that a capability is absent.
              </p>
              <Button asChild variant="outline">
                <Link href="/profile">Review Career Profile</Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="goal-title">
          <Card>
            <CardHeader>
              <CardTitle id="goal-title">2–3. Confirm careers and prepare a goal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <label htmlFor="target-occupation" className="mb-2 block text-sm font-medium">
                  Desired occupation or career direction
                </label>
                <Input
                  id="target-occupation"
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                  placeholder="Use the language your profession uses"
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="career-horizon" className="mb-2 block text-sm font-medium">
                    Target horizon
                  </label>
                  <select
                    id="career-horizon"
                    value={horizon}
                    onChange={(event) => setHorizon(event.target.value)}
                    className="h-10 w-full border border-border bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="3">3 months</option>
                    <option value="6">6 months</option>
                    <option value="12">12 months</option>
                    <option value="24">2 years</option>
                    <option value="60">3–5 years</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="weekly-hours" className="mb-2 block text-sm font-medium">
                    Development hours per week
                  </label>
                  <Input
                    id="weekly-hours"
                    type="number"
                    min="0"
                    max="168"
                    value={weeklyHours}
                    onChange={(event) => setWeeklyHours(event.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <Button
                type="button"
                disabled={!target.trim()}
                onClick={() => setGoalPrepared(true)}
              >
                Prepare draft goal
              </Button>
              {goalPrepared && (
                <div role="status" className="border border-border bg-muted/40 p-4">
                  <p className="font-medium">Draft goal prepared locally</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {target}, {horizon} months
                    {weeklyHours ? `, shaped around ${weeklyHours} hours per week` : ""}.
                    This draft is not saved across sessions.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="readiness-title">
          <Card>
            <CardHeader>
              <CardTitle id="readiness-title">4–6. Readiness, action plan and progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                role="status"
                aria-live="polite"
                className="border-l-4 border-amber-500 bg-amber-500/10 p-4"
              >
                <p className="font-semibold">Canonical planning is currently unavailable</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Taxonomy v2026.1 is still an unpublished candidate. CareerPathX
                  will not calculate readiness, choose a canonical target,
                  generate transitions or present a live action plan from
                  unpublished records. Your draft goal can be reviewed, but no
                  fabricated score or recommendation is shown.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </AppLayout>
  );
}
