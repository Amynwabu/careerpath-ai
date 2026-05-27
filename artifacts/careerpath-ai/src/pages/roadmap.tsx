import { useGetRoadmap, useListMilestones } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, CheckCircle2, Circle, Map, Route } from "lucide-react";
import { Link } from "wouter";

export default function Roadmap() {
  const { data: roadmap, isLoading, error } = useGetRoadmap();
  const { data: milestones } = useListMilestones();

  const completed = milestones?.filter(m => m.completed).length ?? 0;
  const total = milestones?.length ?? 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Map className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Career Roadmap</h1>
              <p className="text-muted-foreground mt-1">A structured path from your current profile to your target role.</p>
            </div>
          </div>
          {roadmap && (
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-sm">{roadmap.targetRole}</Badge>
              <Badge className="text-sm">{roadmap.readinessScore}% ready</Badge>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
          </div>
        )}

        {!isLoading && error && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>No roadmap yet</CardTitle>
              <CardDescription>Run a career analysis to generate your personalised roadmap and milestones.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/analysis"><Button>Run analysis <ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
            </CardContent>
          </Card>
        )}

        {roadmap && (
          <>
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Progress overview</CardTitle>
                <CardDescription>{completed} of {total} milestones completed for the current analysis.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-muted/40 rounded-full h-3 overflow-hidden">
                    <div className="bg-primary h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{progress}%</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-5">
              {roadmap.phases.map((phase, index) => {
                const phaseMilestones = milestones?.filter(m => m.phase === phase.label) ?? [];
                return (
                  <Card key={`${phase.label}-${index}`} className="border-border bg-card overflow-hidden">
                    <CardHeader className="border-b border-border/60">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <Route className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle>{phase.label}</CardTitle>
                            <CardDescription className="mt-1">{phase.timeframe}</CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline">Phase {index + 1}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-5">
                      <div>
                        <p className="text-sm font-medium mb-2">Focus</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{phase.focus}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-3">Actions</p>
                        <div className="space-y-3">
                          {phase.actions.map((action, actionIndex) => {
                            const matchingMilestone = phaseMilestones.find(m => m.description === action || m.title === action.replace(/\.$/, ""));
                            const isDone = Boolean(matchingMilestone?.completed);
                            return (
                              <div key={`${phase.label}-${actionIndex}`} className="flex gap-3 text-sm">
                                {isDone ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />}
                                <span className={isDone ? "text-muted-foreground line-through" : "text-foreground"}>{action}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
