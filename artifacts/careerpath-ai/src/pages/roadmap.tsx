import { useGetRoadmap, type LearningRecommendationGroup, type RoadmapPhase } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { CourseCard } from "@/components/learning/course-recommendations";
import { ProductEmptyState } from "@/components/product-empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BrainCircuit, CheckCircle2, MapIcon, Target } from "lucide-react";
import { Link } from "wouter";

const FALLBACK_MARKERS = ["Months 0-3", "Months 3-9", "Months 9-18", "Months 18+"];

function PhaseCourses({ group }: { group?: LearningRecommendationGroup }) {
  if (!group?.courses.length) return null;

  return (
    <div className="mt-4 border-t border-primary/20 pt-4">
      <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-widest text-primary/80">Recommended Training</p>
      <div className="grid gap-3">
        {group.courses.slice(0, 2).map((course) => (
          <CourseCard key={`${group.sourceId}-${course.id}`} course={course} compact />
        ))}
      </div>
    </div>
  );
}

export default function Roadmap() {
  const { data: roadmap, isLoading } = useGetRoadmap();

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <MapIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Career Roadmap</h1>
              <p className="text-muted-foreground mt-1">
                Your phases, focus areas, and next actions.
              </p>
            </div>
          </div>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/analysis">
              <BrainCircuit className="w-4 h-4 mr-2" />
              Run Analysis
            </Link>
          </Button>
        </div>

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full" />
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-40 w-full" />
            ))}
          </div>
        )}

        {!isLoading && !roadmap && (
          <ProductEmptyState
            title="Unlock your roadmap"
            description="Run analysis to generate phases, timelines, and actions for your target role."
            cta="Generate roadmap"
            href="/analysis"
            exampleScore={74}
          />
        )}

        {roadmap && (
          <>
            <Card className="blue-card-strong">
              <CardContent className="pt-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-2 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Target Role</p>
                      <p className="text-xl font-semibold mt-1">{roadmap.targetRole}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Readiness</p>
                    <p className="text-3xl font-bold text-primary mt-1">{roadmap.readinessScore}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="relative">
              <div className="absolute left-5 top-8 bottom-8 w-px bg-primary/30 md:left-0 md:right-0 md:top-16 md:bottom-auto md:h-px md:w-auto" />
              <div className="grid gap-5 md:grid-cols-4">
                {roadmap.phases.map((phase: RoadmapPhase, index: number) => {
                  const phaseRecommendations = roadmap.learningRecommendations?.find((group) => group.sourceId === `roadmap-phase-${index}`);

                  return (
                  <div
                    key={`${phase.label}-${index}`}
                    className="group relative rounded-xl text-left"
                  >
                    <div className="mb-3 ml-0 flex items-center gap-3 md:flex-col md:items-start">
                      <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-background font-mono text-sm font-bold text-primary shadow-[0_0_20px_hsl(var(--primary)/0.22)]">
                        {index + 1}
                      </span>
                      <span className="font-mono text-xs font-semibold uppercase tracking-widest text-primary/80">
                        {phase.timeframe || FALLBACK_MARKERS[index] || `Phase ${index + 1}`}
                      </span>
                    </div>
                    <Card
                      id={`roadmap-phase-${index}`}
                      className="blue-card min-h-56 transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/55 group-hover:shadow-[0_0_34px_hsl(var(--primary)/0.16)]"
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{phase.label}</CardTitle>
                        <p className="text-sm leading-6 text-muted-foreground">{phase.focus}</p>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Badge variant="secondary" className="font-mono text-[0.7rem] uppercase tracking-wider">
                          {FALLBACK_MARKERS[index] ?? phase.timeframe}
                        </Badge>
                        <div className="max-h-16 space-y-2 overflow-hidden opacity-75 transition-all duration-200 group-hover:max-h-52 group-hover:opacity-100">
                          {phase.actions.slice(0, 3).map((action: string) => (
                            <div key={action} className="flex items-start gap-2 rounded-lg blue-tile p-2.5">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                              <p className="text-sm leading-6">{action}</p>
                            </div>
                          ))}
                        </div>
                        <PhaseCourses group={phaseRecommendations} />
                      </CardContent>
                    </Card>
                  </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
