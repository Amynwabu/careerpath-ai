import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type MilestoneLike = {
  id: number;
  title: string;
  phase: string;
  completed: boolean;
};

export function AccountabilityPanel({ milestones = [] }: { milestones?: MilestoneLike[] }) {
  const open = milestones.filter((milestone) => !milestone.completed);
  const completed = milestones.length - open.length;
  const recoveryFocus = open[0]?.title ?? "Run analysis to generate your next accountable action.";

  return (
    <Card className="blue-card-strong">
      <CardHeader>
        <p className="eyebrow">Execution System</p>
        <CardTitle>Weekly Accountability</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <ExecutionTile title="This week" value={open.slice(0, 2).map((item) => item.title).join(" + ") || "No open milestones"} />
        <ExecutionTile title="Check-in" value={`${completed}/${milestones.length || 0} completed`} badge={milestones.length ? "Active" : "Waiting"} />
        <ExecutionTile title="Recovery plan" value={`If missed: reduce scope, keep ${recoveryFocus}, and move one low-priority task.`} />
      </CardContent>
    </Card>
  );
}

function ExecutionTile({ title, value, badge }: { title: string; value: string; badge?: string }) {
  return (
    <div className="rounded-xl blue-tile p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-primary/80">{title}</p>
        {badge && <Badge variant="secondary">{badge}</Badge>}
      </div>
      <p className="mt-3 text-sm font-medium leading-6">{value}</p>
    </div>
  );
}
