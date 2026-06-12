import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ProductEmptyStateProps = {
  title: string;
  description: string;
  cta: string;
  href: string;
  onAction?: () => void;
  exampleScore?: number;
};

export function ProductEmptyState({
  title,
  description,
  cta,
  href,
  onAction,
  exampleScore = 72,
}: ProductEmptyStateProps) {
  return (
    <Card className="blue-card-strong overflow-hidden">
      <CardContent className="grid gap-8 p-8 md:grid-cols-[240px_1fr] md:items-center">
        <div className="mx-auto flex h-52 w-52 flex-col items-center justify-center rounded-full border border-primary/45 bg-primary/10 shadow-[0_0_44px_hsl(var(--primary)/0.22)]">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-primary">Example</p>
          <p className="mt-2 font-mono text-7xl font-black leading-none text-primary">{exampleScore}</p>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.22em] text-slate-300">Readiness</p>
        </div>
        <div className="max-w-xl space-y-5 text-center md:text-left">
          <div>
            <p className="eyebrow mb-3">Start Here</p>
            <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
            <p className="mt-3 text-muted-foreground">{description}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {["Score", "Gaps", "Roadmap"].map((item) => (
              <div key={item} className="blue-tile rounded-lg px-3 py-2 text-center font-mono text-xs font-semibold uppercase tracking-wider text-slate-100">
                {item}
              </div>
            ))}
          </div>
          {onAction ? (
            <Button size="lg" onClick={onAction} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {cta}
            </Button>
          ) : (
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href={href}>{cta}</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
