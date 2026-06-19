import { useQueryClient } from "@tanstack/react-query";
import { useListMilestones, useCompleteMilestone, getListMilestonesQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const PHASE_ORDER = ["Immediate (0-90 days)", "Year 1", "Year 2-3", "Year 4-5"];

export default function Milestones() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: milestones, isLoading } = useListMilestones();
  const completeMilestone = useCompleteMilestone();

  const noMilestones = !isLoading && (!milestones || milestones.length === 0);

  const grouped = milestones?.reduce((acc: Record<string, typeof milestones>, m) => {
    const phase = m.phase;
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(m);
    return acc;
  }, {});

  const completed = milestones?.filter(m => m.completed).length ?? 0;
  const total = milestones?.length ?? 0;

  const handleComplete = async (id: number) => {
    try {
      await completeMilestone.mutateAsync({ id });
      qc.invalidateQueries({ queryKey: getListMilestonesQueryKey() });
      qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      toast({ title: "Milestone completed!", description: "Progress updated." });
    } catch {
      toast({ title: "Error", description: "Failed to mark milestone.", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Milestones</h1>
              <p className="text-muted-foreground mt-1">Track your progress through each phase of your career journey.</p>
            </div>
          </div>
          {total > 0 && (
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">{completed}/{total}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          )}
        </div>

        {total > 0 && (
          <div className="w-full bg-muted/30 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
            />
          </div>
        )}

        {isLoading && (
          <div className="space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        )}

        {noMilestones && (
          <Card className="border-border bg-card">
            <CardContent className="pt-12 pb-12 flex flex-col items-center text-center gap-6">
              <div>
                <h2 className="text-2xl font-bold">No Milestones Yet</h2>
                <p className="text-muted-foreground mt-2 max-w-md">
                  Run your career analysis to auto-generate a set of milestones tailored to your career target and development timeline.
                </p>
              </div>
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/analysis">Run Career Analysis</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {grouped && PHASE_ORDER.map(phase => {
          const items = grouped[phase];
          if (!items || items.length === 0) return null;
          const phaseCompleted = items.filter(m => m.completed).length;
          return (
            <div key={phase} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wider text-sm">{phase}</h2>
                <Badge variant="secondary">{phaseCompleted}/{items.length}</Badge>
              </div>
              {items.map(m => (
                <Card key={m.id} className={`border transition-all ${m.completed ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
                  <CardContent className="pt-4 pb-4 flex items-start gap-4">
                    {m.completed && <span className="mt-0.5 flex-shrink-0 text-xs font-semibold text-primary">Done</span>}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${m.completed ? "line-through text-muted-foreground" : ""}`}>{m.title}</p>
                      {m.description && <p className="text-sm text-muted-foreground mt-1">{m.description}</p>}
                      {m.completedAt && (
                        <p className="text-xs text-primary mt-2">
                          Completed {new Date(m.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      )}
                    </div>
                    {!m.completed && (
                      <Button size="sm" variant="ghost" onClick={() => handleComplete(m.id)} className="flex-shrink-0">
                        Mark done
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
