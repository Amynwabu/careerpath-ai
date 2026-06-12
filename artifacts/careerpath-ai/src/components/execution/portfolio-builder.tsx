import type { RoadmapPhase } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PortfolioBuilder({ phases = [] }: { phases?: RoadmapPhase[] }) {
  if (phases.length === 0) return null;

  return (
    <Card className="blue-card">
      <CardHeader>
        <p className="eyebrow">Portfolio Builder</p>
        <CardTitle>Convert Milestones Into Employer Evidence</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        {phases.slice(0, 3).map((phase, index) => (
          <div key={`${phase.label}-${index}`} className="rounded-xl blue-tile p-4">
            <Badge className="border-primary/30 bg-primary/15 text-primary" variant="outline">Project brief {index + 1}</Badge>
            <h3 className="mt-3 font-semibold">{phase.label} proof project</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{phase.actions[0] ?? phase.focus}</p>
            <div className="mt-4 grid gap-2 text-sm">
              <p><span className="text-primary">Repo:</span> README, dataset notes, reproducible setup</p>
              <p><span className="text-primary">Deck:</span> problem, method, result, next step</p>
              <p><span className="text-primary">Review:</span> AI critique plus mentor feedback</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
