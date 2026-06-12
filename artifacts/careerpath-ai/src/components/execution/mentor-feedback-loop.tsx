import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const LOOPS = [
  {
    title: "Mock interview",
    cadence: "When readiness passes 70%",
    detail: "Practice target-role questions and convert weak answers into study tasks.",
  },
  {
    title: "Project review",
    cadence: "After each portfolio milestone",
    detail: "Review scope, README quality, employer relevance, and evidence of impact.",
  },
  {
    title: "AI critique",
    cadence: "Before applications",
    detail: "Check CV, LinkedIn, and portfolio claims against the selected role path.",
  },
];

export function MentorFeedbackLoop() {
  return (
    <Card className="blue-card">
      <CardHeader>
        <p className="eyebrow">Feedback Loop</p>
        <CardTitle>Mentor-style Review Points</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        {LOOPS.map((loop) => (
          <div key={loop.title} className="rounded-xl blue-tile p-4">
            <Badge className="border-primary/30 bg-primary/15 text-primary" variant="outline">{loop.cadence}</Badge>
            <h3 className="mt-3 font-semibold">{loop.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{loop.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
