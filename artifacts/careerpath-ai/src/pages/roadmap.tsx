import { useGetRoadmap } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, CheckCircle2, Map, Target } from "lucide-react";
import { Link } from "wouter";

export default function Roadmap() {
  const { data: roadmap, isLoading } = useGetRoadmap();
  const noRoadmap = !isLoading && !roadmap;

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Map className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Career Roadmap
              </h1>
              <p className="text-muted-foreground mt-1">
                Follow the phases from your latest career analysis.
              </p>
            </div>
          </div>

          {roadmap && (
            <div className="flex items-center gap-3">
              <Badge className="bg-primary/20 text-primary border-primary/30">
                {roadmap.readinessScore}% ready
              </Badge>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="w-4 h-4 text-primary" />
                <span>{roadmap.targetRole}</span>
              </div>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton key={item} className="h-48 w-full" />
            ))}
          </div>
        )}

        {noRoadmap && (
          <Card className="border-border bg-card">
            <CardContent className="pt-12 pb-12 flex flex-col items-center text-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Map className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">No Roadmap Yet</h2>
                <p className="text-muted-foreground mt-2 max-w-md">
                  Run your career analysis to generate a phased roadmap for your
                  target role.
                </p>
              </div>
              <Button
                asChild
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Link href="/analysis">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Run Career Analysis
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {roadmap && (
          <div className="space-y-4">
            {roadmap.phases.map((phase, index) => (
              <Card
                key={`${phase.label}-${phase.timeframe}`}
                className="border-border bg-card"
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{phase.label}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {phase.focus}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{phase.timeframe}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {phase.actions.map((action) => (
                      <div
                        key={action}
                        className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3"
                      >
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                        <p className="text-sm leading-relaxed text-foreground/85">
                          {action}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
