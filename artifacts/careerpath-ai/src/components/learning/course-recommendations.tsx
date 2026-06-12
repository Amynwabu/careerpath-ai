import type { LearningCourseRecommendation, LearningRecommendationGroup } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CourseRecommendationsProps = {
  title?: string;
  groups?: LearningRecommendationGroup[];
  className?: string;
  compact?: boolean;
  maxGroups?: number;
};

function formatDuration(hours: number) {
  if (hours < 10) return `${hours}h`;
  if (hours < 40) return `${hours}h practical`;
  return `${hours}h deep dive`;
}

export function CourseCard({ course, compact = false }: { course: LearningCourseRecommendation; compact?: boolean }) {
  return (
    <div className={cn("rounded-xl border border-primary/30 bg-primary/10 p-4", compact && "p-3")}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="border-primary/30 bg-primary/15 text-primary" variant="outline">{course.provider}</Badge>
        <Badge variant="secondary">{course.level}</Badge>
        <Badge variant="secondary">{course.cost}</Badge>
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{formatDuration(course.durationHours)}</span>
      </div>
      <h4 className="mt-3 text-sm font-semibold leading-5">{course.title}</h4>
      {!compact && <p className="mt-2 text-sm leading-6 text-muted-foreground">{course.description}</p>}
      <p className="mt-2 text-xs text-muted-foreground">Matched to {course.matchReason}</p>
      <Button asChild size="sm" className="mt-3 h-9 bg-primary text-primary-foreground hover:bg-primary/90">
        <a href={course.url} target="_blank" rel="noreferrer">
          Open in {course.provider}
        </a>
      </Button>
    </div>
  );
}

export function CourseRecommendations({ title = "Recommended Training", groups = [], className, compact = false, maxGroups }: CourseRecommendationsProps) {
  const visibleGroups = maxGroups ? groups.slice(0, maxGroups) : groups;

  if (visibleGroups.length === 0) return null;

  return (
    <Card className={cn("blue-card", className)}>
      <CardHeader>
        <p className="eyebrow">Curated Learning Paths</p>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {visibleGroups.map((group) => (
          <section key={`${group.sourceType}-${group.sourceId}`} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold">{group.sourceLabel}</h3>
                <p className="text-sm text-muted-foreground">
                  {group.skillLabel ?? group.timeframe ?? "Best next learning options"}
                </p>
              </div>
              {group.priority && <Badge variant={group.priority === "High" ? "destructive" : "secondary"}>{group.priority}</Badge>}
            </div>
            <div className={cn("grid gap-3", compact ? "grid-cols-1" : "md:grid-cols-3")}>
              {group.courses.map((course) => (
                <CourseCard key={`${group.sourceId}-${course.id}`} course={course} compact={compact} />
              ))}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
