import { useGetDashboardSummary, useGetSkillGaps, useGetCareerGoal, useGetProfile, useListMilestones, useGetRoadmap } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { CircularProgress } from "@/components/ui/circular-progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { BrainCircuit, AlertTriangle, ArrowRight, Target, CheckCircle2, Zap, Bot, Clock, Rocket, MapPin, ChevronRight, Flag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function InsightCard({ icon, label, value, sub, href, loading }: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  sub?: string;
  href?: string;
  loading?: boolean;
}) {
  const inner = (
    <Card className="glass-panel border-white/5 hover:border-primary/20 transition-colors cursor-pointer group">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            {loading ? (
              <Skeleton className="h-5 w-32 mt-1.5" />
            ) : (
              <p className="font-semibold mt-1 leading-tight truncate text-sm" title={value ?? undefined}>
                {value ?? <span className="text-muted-foreground italic">Not set</span>}
              </p>
            )}
            {sub && !loading && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>
            )}
          </div>
          {href && <ArrowRight className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />}
        </div>
      </CardContent>
    </Card>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: skillGaps, isLoading: loadingGaps } = useGetSkillGaps();
  const { data: goal, isLoading: loadingGoal } = useGetCareerGoal();
  const { data: profile, isLoading: loadingProfile } = useGetProfile();
  const { data: milestones, isLoading: loadingMilestones } = useListMilestones();
  const { data: roadmap, isLoading: loadingRoadmap } = useGetRoadmap();

  const targetYears = (goal as any)?.targetYears ?? 5;
  const readiness = summary?.readinessScore ?? 0;
  const hasAnalysis = readiness > 0;

  // Urgency calculation
  const atCurrentPace = hasAnalysis
    ? Math.round(targetYears * (1 + ((100 - readiness) / 100) * 1.5) * 10) / 10
    : null;
  const withAI = hasAnalysis
    ? Math.round(targetYears * 0.56 * 10) / 10
    : null;
  const timeSaved = atCurrentPace && withAI ? Math.round((atCurrentPace - withAI) * 10) / 10 : null;

  // AI Coach tip
  const topGap = skillGaps?.[0];
  const targetRole = summary?.targetRole ?? (goal as any)?.targetRole;
  const coachTip = topGap
    ? `Focus on ${topGap.skill} this week — it's your highest-priority skill gap on your path to ${targetRole ?? "your target role"}.`
    : targetRole
      ? `Run your first analysis to unlock personalised coaching tips for your path to ${targetRole}.`
      : "Set your career goal and run an analysis to unlock your personalised AI coaching tips.";

  // Next milestone
  const nextMilestone = milestones?.find(m => !m.completed);

  // Top missing skill
  const topMissing = skillGaps?.[0]?.skill;

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Career Dashboard</h1>
            <p className="text-muted-foreground mt-1">Everything you need to reach your career goal, faster.</p>
          </div>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 glow-box">
            <Link href="/analysis">
              <BrainCircuit className="w-4 h-4 mr-2" />
              Run Analysis
            </Link>
          </Button>
        </div>

        {/* Top 4-card insight strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <InsightCard
            icon={<Target className="w-4 h-4 text-primary" />}
            label="🎯 Your Target Role"
            value={targetRole ?? null}
            sub={targetYears ? `${targetYears}-year goal` : undefined}
            href="/career-goal"
            loading={loadingGoal || loadingSummary}
          />
          <InsightCard
            icon={<MapPin className="w-4 h-4 text-primary" />}
            label="📍 Where You Are"
            value={(profile as any)?.currentRole ?? null}
            sub={hasAnalysis ? `${readiness}% ready` : (profile as any)?.careerLevel ?? undefined}
            href="/profile"
            loading={loadingProfile}
          />
          <InsightCard
            icon={<Zap className="w-4 h-4 text-yellow-400" />}
            label="⚡ What's Missing"
            value={topMissing ?? (loadingGaps ? null : "Run analysis to find gaps")}
            sub={skillGaps && skillGaps.length > 1 ? `+${skillGaps.length - 1} more gaps identified` : undefined}
            href="/analysis"
            loading={loadingGaps}
          />
          <InsightCard
            icon={<Rocket className="w-4 h-4 text-primary" />}
            label="🚀 What To Do Next"
            value={nextMilestone?.title ?? (loadingMilestones ? null : "Run analysis to generate milestones")}
            sub={nextMilestone?.phase ?? undefined}
            href="/milestones"
            loading={loadingMilestones}
          />
        </div>

        {/* Urgency + AI Coach row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Urgency widget */}
          <Card className="glass-panel border-white/5 lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="w-4 h-4 text-primary" />
                Time to Goal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!hasAnalysis ? (
                <div className="flex flex-col items-center text-center py-4 gap-3">
                  <p className="text-sm text-muted-foreground">Run your first analysis to see how long your journey will take — and how much time AI coaching can save you.</p>
                  <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link href="/analysis"><BrainCircuit className="w-3.5 h-3.5 mr-1.5" />Run Analysis</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  {/* At current pace */}
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">⏳ At your current pace</p>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold text-muted-foreground">{atCurrentPace}</span>
                      <span className="text-sm text-muted-foreground mb-1.5">years</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2">
                      <div
                        className="bg-muted-foreground/40 h-2 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, (readiness / 100) * 60 + 10)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">→ Without structured guidance</p>
                  </div>

                  {/* With CareerPath AI */}
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">⚡ With CareerPath AI</p>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold text-primary">{withAI}</span>
                      <span className="text-sm text-muted-foreground mb-1.5">years</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(0,240,255,0.5)]"
                        style={{ width: `${Math.min(100, (readiness / 100) * 40 + 20)}%` }}
                      />
                    </div>
                    <p className="text-xs text-primary">→ Save ~{timeSaved} year{timeSaved !== 1 ? "s" : ""} with AI coaching</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Coach card */}
          <Card className="glass-panel border-primary/20 lg:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="relative">
                  <Bot className="w-4 h-4 text-primary" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
                </div>
                AI Coach
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-sm leading-relaxed text-foreground/90">
                    "{coachTip}"
                  </p>
                </div>
                {topGap && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Recommended focus</p>
                      <p className="text-sm font-semibold text-primary mt-0.5">{topGap.skill}</p>
                    </div>
                    <Badge variant={topGap.priority === "High" ? "destructive" : "secondary"} className="text-xs">
                      {topGap.priority} priority
                    </Badge>
                  </div>
                )}
                {!topGap && (
                  <Button asChild size="sm" variant="outline" className="w-full border-primary/20 hover:bg-primary/5 text-primary">
                    <Link href="/analysis">Unlock personalised tips <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Career path visual */}
        <Card className="glass-panel border-white/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Rocket className="w-4 h-4 text-primary" />
                Your Career Path
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary">
                <Link href="/roadmap">View full roadmap <ChevronRight className="w-3.5 h-3.5 ml-1" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingRoadmap ? (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-48 flex-shrink-0 rounded-xl" />)}
              </div>
            ) : roadmap?.phases?.length ? (
              <div className="relative">
                <div className="flex items-start gap-3 overflow-x-auto pb-2">
                  {/* Start node */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 text-center w-16">Now</p>
                  </div>

                  {roadmap.phases.map((phase, idx) => (
                    <div key={idx} className="flex items-start gap-3 flex-shrink-0">
                      {/* Connector line */}
                      <div className="mt-5 w-6 h-0.5 bg-gradient-to-r from-primary/40 to-primary/20 flex-shrink-0" />

                      {/* Phase card */}
                      <div className={`w-44 rounded-xl border p-3 space-y-1.5 flex-shrink-0 ${
                        idx === 0
                          ? "border-primary/40 bg-primary/5"
                          : idx === 1
                            ? "border-cyan-500/30 bg-cyan-500/5"
                            : idx === 2
                              ? "border-purple-500/30 bg-purple-500/5"
                              : "border-amber-500/30 bg-amber-500/5"
                      }`}>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-foreground truncate">{phase.label}</span>
                          <Badge className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${
                            idx === 0 ? "bg-primary/20 text-primary border-primary/30"
                            : idx === 1 ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                            : idx === 2 ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                            : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          }`}>
                            {phase.timeframe}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{phase.focus}</p>
                      </div>
                    </div>
                  ))}

                  {/* End node */}
                  <div className="flex items-start gap-3 flex-shrink-0">
                    <div className="mt-5 w-6 h-0.5 bg-gradient-to-r from-primary/20 to-primary/40 flex-shrink-0" />
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-primary border-2 border-primary flex items-center justify-center glow-box">
                        <Target className="w-4 h-4 text-primary-foreground" />
                      </div>
                      <p className="text-xs text-primary font-medium mt-1.5 text-center w-20 truncate">{targetRole ?? "Your goal"}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center py-6 gap-3">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 opacity-40" />
                  </div>
                  <div className="w-16 h-0.5 border-t-2 border-dashed border-white/10" />
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 opacity-40" />
                  </div>
                  <div className="w-16 h-0.5 border-t-2 border-dashed border-white/10" />
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center">
                    <Target className="w-4 h-4 text-primary opacity-50" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Run your career analysis to generate a personalised roadmap.</p>
                <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link href="/analysis"><BrainCircuit className="w-3.5 h-3.5 mr-1.5" />Generate Roadmap</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom 2-col: Skill gaps + Next actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Skill gaps */}
          <Card className="glass-panel border-white/5 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  Priority Skill Gaps
                </CardTitle>
                {skillGaps && skillGaps.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{skillGaps.length} gap{skillGaps.length !== 1 ? "s" : ""}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              {loadingGaps ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : !skillGaps || skillGaps.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-8 gap-3 text-muted-foreground">
                  <AlertTriangle className="w-10 h-10 opacity-20" />
                  <p className="text-sm">No gaps identified yet.</p>
                  <Button variant="outline" size="sm" className="border-white/10" asChild>
                    <Link href="/analysis">Run Analysis</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {skillGaps.slice(0, 5).map((gap, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{gap.skill}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{gap.category} · {gap.currentLevel || "No experience"} → {gap.requiredLevel}</p>
                      </div>
                      <Badge variant={gap.priority === "High" ? "destructive" : "secondary"} className="text-xs flex-shrink-0">
                        {gap.priority}
                      </Badge>
                    </div>
                  ))}
                  {skillGaps.length > 5 && (
                    <Button asChild variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-primary mt-1">
                      <Link href="/analysis">View all {skillGaps.length} gaps <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next milestones */}
          <Card className="glass-panel border-white/5 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Flag className="w-4 h-4 text-primary" />
                  Next Actions
                </CardTitle>
                {milestones && milestones.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {milestones.filter(m => m.completed).length} / {milestones.length} done
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              {loadingMilestones ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : !milestones || milestones.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-8 gap-3 text-muted-foreground">
                  <Flag className="w-10 h-10 opacity-20" />
                  <p className="text-sm">No milestones yet.</p>
                  <Button variant="outline" size="sm" className="border-white/10" asChild>
                    <Link href="/analysis">Run Analysis</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {milestones.filter(m => !m.completed).slice(0, 4).map((m, idx) => (
                    <div key={m.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${idx === 0 ? "bg-primary/5 border-primary/20" : "bg-white/5 border-white/5"}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${idx === 0 ? "border-primary" : "border-white/20"}`}>
                        {idx === 0 && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium truncate ${idx === 0 ? "text-foreground" : "text-muted-foreground"}`}>{m.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{m.phase}</p>
                      </div>
                      {idx === 0 && <Badge className="bg-primary/20 text-primary border-primary/30 text-xs flex-shrink-0">Up next</Badge>}
                    </div>
                  ))}
                  {milestones.filter(m => !m.completed).length > 4 && (
                    <Button asChild variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-primary mt-1">
                      <Link href="/milestones">View all milestones <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></Link>
                    </Button>
                  )}
                  {milestones.filter(m => !m.completed).length === 0 && (
                    <div className="flex items-center gap-2 text-primary p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                      <p className="text-sm font-medium">All milestones complete! 🎉</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </AppLayout>
  );
}
