import {
  ArrowRight,
  BarChart3,
  Bot,
  CalendarRange,
  Check,
  ChevronRight,
  Clock3,
  FileUp,
  Focus,
  Gauge,
  Radar,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Link } from "wouter";
import { useReducedMotion } from "framer-motion";
import {
  useGetCareerGoal,
  useGetDashboardSummary,
  useGetProfile,
  useGetRoadmap,
  useGetSkillGaps,
  useListMilestones,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type PhaseState = "complete" | "active" | "upcoming";

const panelClass = "rounded-lg border border-white/[0.08] bg-[#0d1114] shadow-[0_18px_60px_rgba(0,0,0,0.22)]";

const priorityStyles: Record<string, string> = {
  High: "border-red-400/25 bg-red-400/[0.08] text-red-200",
  Medium: "border-amber-400/25 bg-amber-400/[0.08] text-amber-200",
  Low: "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-200",
};

const levelValues: Record<string, number> = {
  "No experience": 6,
  Beginner: 20,
  Intermediate: 45,
  Advanced: 72,
  Expert: 94,
};

function PanelHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-semibold uppercase text-primary/75">{eyebrow}</p>
        <h2 className="mt-1.5 text-base font-semibold text-white">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export default function Dashboard() {
  const prefersReducedMotion = useReducedMotion();
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: skillGaps, isLoading: loadingGaps } = useGetSkillGaps();
  const { data: goal, isLoading: loadingGoal } = useGetCareerGoal();
  const { data: profile, isLoading: loadingProfile } = useGetProfile();
  const { data: milestones, isLoading: loadingMilestones } = useListMilestones();
  const { data: roadmap, isLoading: loadingRoadmap } = useGetRoadmap();

  const liveSummary = summary as (typeof summary & {
    userStatus?: string;
    journeyProgress?: number;
    nextAction?: string;
  });

  const readiness = summary?.readinessScore ?? 0;
  const journeyProgress = liveSummary?.journeyProgress ?? 0;
  const targetYears = goal?.targetYears ?? 1;
  const targetRole = summary?.targetRole ?? goal?.targetRole ?? "Define your target role";
  const currentRole = profile?.currentRole ?? "Complete your current role";
  const hasAnalysis = readiness > 0;
  const incompleteMilestones = milestones?.filter((milestone) => !milestone.completed) ?? [];
  const completedMilestones = milestones?.filter((milestone) => milestone.completed).length ?? 0;
  const nextMilestone = incompleteMilestones[0];
  const nextAction = liveSummary?.nextAction ?? nextMilestone?.title ?? "Run your first career analysis";
  const topGap = skillGaps?.[0];

  const atCurrentPace = hasAnalysis
    ? Math.round(targetYears * (1 + ((100 - readiness) / 100) * 1.5) * 10) / 10
    : null;
  const withCareerPathX = hasAnalysis ? Math.round(targetYears * 0.56 * 10) / 10 : null;
  const timeSaved = atCurrentPace && withCareerPathX
    ? Math.round((atCurrentPace - withCareerPathX) * 10) / 10
    : null;

  const coachTip = topGap
    ? `Focus on ${topGap.skill} this week. It is your highest-priority capability gap on the path to ${targetRole}.`
    : `Run your career analysis to identify the highest-leverage move on your path to ${targetRole}.`;

  const getPhaseState = (index: number, phaseCount: number): PhaseState => {
    const total = milestones?.length ?? 0;
    if (total === 0) return index === 0 ? "active" : "upcoming";
    if (completedMilestones === total) return "complete";
    const activeIndex = Math.min(phaseCount - 1, Math.floor((completedMilestones / total) * phaseCount));
    if (index < activeIndex) return "complete";
    return index === activeIndex ? "active" : "upcoming";
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1540px] space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-primary/75">
              <span className="h-1.5 w-1.5 bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.8)]" />
              Live career intelligence
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Career Mission Control</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Track readiness, close evidence gaps, and accelerate your path to leadership.
            </p>
          </div>
          <Button asChild className="h-11 self-start bg-primary px-5 text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.12)] hover:bg-primary/90 xl:self-auto">
            <Link href="/analysis">
              <Radar className="h-4 w-4" />
              Run analysis
            </Link>
          </Button>
        </header>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <section className={cn(panelClass, "mission-grid relative overflow-hidden p-5 sm:p-7 xl:col-span-8")}>
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-primary" />
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Career progression signal</p>
                </div>
                <Badge className="border-primary/20 bg-primary/[0.08] text-[10px] font-medium text-primary">
                  {targetYears}-year goal
                </Badge>
              </div>

              <div className="mt-8 grid items-center gap-8 lg:grid-cols-[1fr_auto]">
                <div>
                  <div className="grid gap-4 sm:grid-cols-[1fr_auto_1.2fr] sm:items-center">
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">Current position</p>
                      {loadingProfile ? <Skeleton className="mt-2 h-7 w-40" /> : <p className="mt-2 text-xl font-semibold text-white sm:text-2xl">{currentRole}</p>}
                    </div>
                    <div className="hidden items-center gap-2 text-primary sm:flex" aria-hidden="true">
                      <span className="h-px w-8 bg-primary/30" />
                      <ArrowRight className="h-4 w-4" />
                      <span className="h-px w-8 bg-primary/30" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-primary/75">Target position</p>
                      {loadingGoal || loadingSummary ? <Skeleton className="mt-2 h-7 w-56" /> : <p className="mt-2 text-xl font-semibold leading-tight text-primary sm:text-2xl">{targetRole}</p>}
                    </div>
                  </div>

                  <p className="mt-7 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Your pathway is mapped around verified experience, priority capability gaps, and measurable evidence of leadership impact.
                  </p>
                </div>

                <div className="flex items-center gap-5 border-l-0 border-white/[0.07] lg:border-l lg:pl-8">
                  <div
                    className="grid h-28 w-28 shrink-0 place-items-center rounded-full p-2"
                    style={{ background: `conic-gradient(hsl(var(--primary)) ${readiness * 3.6}deg, rgba(255,255,255,0.07) 0deg)` }}
                    aria-label={`${readiness}% career readiness`}
                  >
                    <div className="grid h-full w-full place-items-center rounded-full border border-white/[0.06] bg-[#0b0f12]">
                      <div className="text-center">
                        <p className="text-3xl font-semibold text-white">{readiness}%</p>
                        <p className="text-[10px] font-medium uppercase text-muted-foreground">Ready</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-4 border-t border-white/[0.07] pt-5 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <div className="flex items-center justify-between gap-4 text-xs">
                    <span className="text-muted-foreground">Journey execution</span>
                    <span className="font-semibold text-primary">{journeyProgress}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden bg-white/[0.06]">
                    <div
                      className={cn("h-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.7)]", !prefersReducedMotion && "transition-[width] duration-700")}
                      style={{ width: `${journeyProgress}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{liveSummary?.userStatus ?? "Profile signal ready"}</p>
              </div>
            </div>
          </section>

          <section className={cn(panelClass, "relative flex flex-col overflow-hidden border-primary/20 p-5 sm:p-6 xl:col-span-4")}>
            <div className="absolute inset-y-0 left-0 w-0.5 bg-primary" aria-hidden="true" />
            <PanelHeading
              eyebrow="Weekly mission"
              title="Highest-leverage action"
              action={<Focus className="h-5 w-5 text-primary" />}
            />
            <div className="flex flex-1 flex-col justify-between">
              <div className="mt-8">
                <Badge className="border-primary/20 bg-primary/[0.08] text-[10px] uppercase text-primary">Up next</Badge>
                <h3 className="mt-4 text-xl font-semibold leading-8 text-white">{nextAction}</h3>
                <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarRange className="h-4 w-4 text-primary/80" />
                  <span>{nextMilestone?.phase ?? "Immediate action"}</span>
                </div>
              </div>
              <Button asChild variant="outline" className="mt-8 w-full border-primary/25 text-primary hover:bg-primary/[0.06]">
                <Link href="/milestones">
                  Open milestone
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <section className={cn(panelClass, "p-5 sm:p-6 xl:col-span-5")}>
            <PanelHeading eyebrow="Time acceleration" title="Projected time to goal" action={<TrendingUp className="h-5 w-5 text-primary" />} />
            {!hasAnalysis ? (
              <div className="mt-7 border-t border-white/[0.07] pt-6">
                <p className="text-sm leading-6 text-muted-foreground">Run an analysis to model your current pace against a structured, evidence-led pathway.</p>
                <Button asChild size="sm" variant="outline" className="mt-5 border-primary/25 text-primary">
                  <Link href="/analysis">Calculate acceleration</Link>
                </Button>
              </div>
            ) : (
              <div className="mt-7 space-y-6">
                <div>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">At your current pace</p>
                      <p className="mt-1 text-3xl font-semibold text-white">{atCurrentPace} <span className="text-sm font-normal text-muted-foreground">years</span></p>
                    </div>
                    <Clock3 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="mt-3 h-1.5 bg-white/[0.06]"><div className="h-full w-full bg-white/20" /></div>
                </div>
                <div>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs text-primary">With CareerPathX</p>
                      <p className="mt-1 text-3xl font-semibold text-primary">{withCareerPathX} <span className="text-sm font-normal text-muted-foreground">years</span></p>
                    </div>
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="mt-3 h-1.5 bg-white/[0.06]"><div className="h-full w-[34%] bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.6)]" /></div>
                </div>
                <div className="border-t border-white/[0.07] pt-4 text-sm text-primary">Save about {timeSaved} year{timeSaved !== 1 ? "s" : ""} with focused AI coaching.</div>
              </div>
            )}
          </section>

          <section className={cn(panelClass, "relative overflow-hidden p-5 sm:p-6 xl:col-span-7")}>
            <PanelHeading eyebrow="AI strategist" title="This week's coaching signal" action={<Bot className="h-5 w-5 text-primary" />} />
            <div className="mt-7 border-l-2 border-primary bg-primary/[0.035] px-5 py-4">
              <p className="text-base leading-7 text-white">“{coachTip}”</p>
            </div>
            <div className="mt-6 grid gap-4 border-t border-white/[0.07] pt-5 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Recommended focus</p>
                <p className="mt-2 text-sm font-semibold text-primary">{topGap?.skill ?? "Career evidence analysis"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Priority</p>
                <Badge className={cn("mt-2 text-[10px]", priorityStyles[topGap?.priority ?? "High"])}>{topGap?.priority ?? "High"}</Badge>
              </div>
            </div>
            <Button asChild variant="ghost" className="mt-5 justify-start px-0 text-primary hover:bg-transparent">
              <Link href="/advisors">
                Open AI advisor
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </section>
        </div>

        <section className={cn(panelClass, "overflow-hidden p-5 sm:p-6")}>
          <PanelHeading
            eyebrow="Strategic pathway"
            title="Career path roadmap"
            action={(
              <Button asChild variant="ghost" size="sm" className="hidden text-muted-foreground hover:text-primary sm:inline-flex">
                <Link href="/roadmap">View full roadmap <ChevronRight className="h-4 w-4" /></Link>
              </Button>
            )}
          />
          {loadingRoadmap ? (
            <div className="mt-7 grid gap-3 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-28 w-full rounded-md" />)}</div>
          ) : roadmap?.phases?.length ? (
            <div className="relative mt-8">
              <div className="absolute left-5 right-5 top-5 hidden h-px bg-white/[0.08] lg:block" aria-hidden="true" />
              <div className="relative grid gap-3 lg:grid-cols-4">
                {roadmap.phases.map((phase, index) => {
                  const state = getPhaseState(index, roadmap.phases.length);
                  return (
                    <div key={`${phase.label}-${index}`} className={cn("relative border border-white/[0.07] bg-[#0a0e11] p-4", state === "active" && "border-primary/30 bg-primary/[0.035]")}>
                      <div className="flex items-center justify-between gap-3">
                        <span className={cn("grid h-10 w-10 place-items-center rounded-full border bg-[#0d1114] text-xs font-semibold", state === "active" ? "border-primary text-primary" : state === "complete" ? "border-emerald-400/40 text-emerald-300" : "border-white/10 text-muted-foreground")}>
                          {state === "complete" ? <Check className="h-4 w-4" /> : index + 1}
                        </span>
                        <Badge className={cn("border-white/10 bg-white/[0.04] text-[10px] text-muted-foreground", state === "active" && "border-primary/20 bg-primary/[0.08] text-primary")}>{state === "active" ? "In progress" : state === "complete" ? "Complete" : "Upcoming"}</Badge>
                      </div>
                      <p className="mt-4 text-sm font-semibold text-white">{phase.label}</p>
                      <p className="mt-1 text-xs text-primary/80">{phase.timeframe}</p>
                      <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">{phase.focus}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between border border-primary/20 bg-primary/[0.035] px-4 py-3">
                <div className="flex items-center gap-3"><Target className="h-4 w-4 text-primary" /><span className="text-xs font-semibold uppercase text-muted-foreground">Destination</span></div>
                <span className="text-sm font-semibold text-primary">{targetRole}</span>
              </div>
            </div>
          ) : (
            <div className="mt-7 flex flex-col items-start border-t border-white/[0.07] pt-6">
              <p className="text-sm text-muted-foreground">Generate your analysis to unlock a staged career roadmap.</p>
              <Button asChild size="sm" className="mt-4"><Link href="/analysis">Generate roadmap</Link></Button>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <section className={cn(panelClass, "p-5 sm:p-6 xl:col-span-7")}>
            <PanelHeading
              eyebrow="Capability intelligence"
              title="Priority skill gaps"
              action={<span className="text-xs text-muted-foreground">{skillGaps?.length ?? 0} signals</span>}
            />
            {loadingGaps ? (
              <div className="mt-6 space-y-3">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-20 w-full rounded-md" />)}</div>
            ) : skillGaps?.length ? (
              <div className="mt-6 divide-y divide-white/[0.07] border-y border-white/[0.07]">
                {skillGaps.slice(0, 5).map((gap, index) => {
                  const currentLevel = gap.currentLevel ?? "No experience";
                  const currentValue = levelValues[currentLevel] ?? 6;
                  const requiredValue = levelValues[gap.requiredLevel] ?? 72;
                  return (
                    <div key={`${gap.skill}-${index}`} className="group py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white">{gap.skill}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{currentLevel} to {gap.requiredLevel}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={cn("text-[10px]", priorityStyles[gap.priority] ?? priorityStyles.Low)}>{gap.priority}</Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                        </div>
                      </div>
                      <div className="relative mt-3 h-1.5 bg-white/[0.06]">
                        <div className="absolute inset-y-0 left-0 bg-white/20" style={{ width: `${currentValue}%` }} />
                        <div className="absolute inset-y-0 w-px bg-primary shadow-[0_0_7px_hsl(var(--primary)/0.8)]" style={{ left: `${requiredValue}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 border-t border-white/[0.07] pt-6"><p className="text-sm text-muted-foreground">No skill gaps identified yet.</p></div>
            )}
          </section>

          <section className={cn(panelClass, "p-5 sm:p-6 xl:col-span-5")}>
            <PanelHeading
              eyebrow="Execution queue"
              title="Next actions"
              action={<span className="text-xs text-muted-foreground">{completedMilestones} / {milestones?.length ?? 0} done</span>}
            />
            {loadingMilestones ? (
              <div className="mt-6 space-y-3">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-16 w-full rounded-md" />)}</div>
            ) : incompleteMilestones.length ? (
              <div className="mt-6 divide-y divide-white/[0.07] border-y border-white/[0.07]">
                {incompleteMilestones.slice(0, 4).map((milestone, index) => (
                  <div key={milestone.id} className="flex gap-3 py-4">
                    <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px]", index === 0 ? "border-primary bg-primary/10 text-primary" : "border-white/15 text-muted-foreground")}>{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-5 text-white">{milestone.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{milestone.phase}</p>
                    </div>
                    {index === 0 && <Badge className="h-fit border-primary/20 bg-primary/[0.08] text-[10px] text-primary">Up next</Badge>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 border-t border-white/[0.07] pt-6"><p className="text-sm text-muted-foreground">Your next actions will appear after analysis.</p></div>
            )}
            <Button asChild variant="ghost" className="mt-5 w-full justify-between border border-white/[0.07] text-muted-foreground hover:text-primary">
              <Link href="/milestones">View all milestones <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </section>
        </div>

        <section className={cn(panelClass, "grid gap-5 border-primary/15 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center")}>
          <div className="flex gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center border border-primary/20 bg-primary/[0.06] text-primary"><RefreshCw className="h-4 w-4" /></span>
            <div>
              <p className="text-[10px] font-semibold uppercase text-primary/75">Career evidence update</p>
              <h2 className="mt-1.5 text-base font-semibold text-white">Changed role, responsibilities, or CV?</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">Replace your description or upload a newer CV, review career options again, and rerun profile analysis.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" className="border-white/10 text-foreground hover:border-primary/25 hover:text-primary">
              <Link href="/onboarding?mode=description"><BarChart3 className="h-4 w-4" />Change description</Link>
            </Button>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/onboarding?mode=cv"><FileUp className="h-4 w-4" />Upload a new CV</Link>
            </Button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
