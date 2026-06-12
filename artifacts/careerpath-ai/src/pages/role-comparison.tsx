import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const ROLES = [
  {
    title: "AI Engineer",
    transition: "6-12 months",
    overlap: ["Python", "ML fundamentals", "APIs", "Cloud deployment"],
    missing: ["MLOps", "model evaluation", "production monitoring"],
    employerFit: "Startups, consultancies, enterprise AI teams",
  },
  {
    title: "AI Architect",
    transition: "9-18 months",
    overlap: ["Cloud", "systems design", "security", "stakeholder leadership"],
    missing: ["AI governance", "platform architecture", "cost controls"],
    employerFit: "Enterprise, NHS, consultancies, regulated sectors",
  },
  {
    title: "AI Product Manager",
    transition: "4-10 months",
    overlap: ["Product strategy", "user research", "AI literacy", "delivery"],
    missing: ["model limits", "data ethics", "technical trade-offs"],
    employerFit: "SaaS, fintech, healthtech, AI platform teams",
  },
];

const SHARED_SKILLS = ["AI literacy", "data fluency", "stakeholder communication", "portfolio proof", "delivery discipline"];

export default function RoleComparison() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-8 p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Decision Mode</p>
            <h1 className="text-3xl font-bold tracking-tight">Compare AI Career Paths</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              Compare overlap, missing skills, employer fit, and time-to-transition before committing to one target role.
            </p>
          </div>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/career-goal">Choose target role</Link>
          </Button>
        </div>

        <Card className="blue-card-strong">
          <CardContent className="grid gap-4 p-5 md:grid-cols-5">
            {SHARED_SKILLS.map((skill) => (
              <div key={skill} className="rounded-xl blue-tile p-4 text-center">
                <p className="font-mono text-xs uppercase tracking-widest text-primary/80">Overlap</p>
                <p className="mt-2 text-sm font-semibold">{skill}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-3">
          {ROLES.map((role) => (
            <Card key={role.title} className="blue-card">
              <CardHeader>
                <CardTitle>{role.title}</CardTitle>
                <p className="font-mono text-sm font-semibold text-primary">{role.transition}</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <RoleList title="Overlap you can reuse" items={role.overlap} />
                <RoleList title="Likely missing skills" items={role.missing} priority />
                <div>
                  <p className="font-mono text-xs font-semibold uppercase tracking-widest text-primary/80">Employer fit</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{role.employerFit}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

function RoleList({ title, items, priority = false }: { title: string; items: string[]; priority?: boolean }) {
  return (
    <div>
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-primary/80">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant={priority ? "outline" : "secondary"} className={priority ? "border-primary/30 bg-primary/10" : ""}>
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}
