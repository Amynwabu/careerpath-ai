import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRunAnalysis, useGetLatestAnalysis, useGetCareerGoal, getGetLatestAnalysisQueryKey, getGetDashboardSummaryQueryKey, getGetSkillGapsQueryKey, getGetRecentActivityQueryKey, getGetRoadmapQueryKey, getListMilestonesQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { CourseRecommendations } from "@/components/learning/course-recommendations";
import { MentorFeedbackLoop } from "@/components/execution/mentor-feedback-loop";
import { ProductEmptyState } from "@/components/product-empty-state";
import { ApplicationReadiness } from "@/components/trust/application-readiness";
import { JobMarketEvidencePanel } from "@/components/trust/job-market-evidence";
import { OutcomeTransparency } from "@/components/trust/outcome-transparency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BrainCircuit, Zap, TrendingUp, AlertTriangle, CheckCircle, BookOpen, FolderOpen, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CircularProgress } from "@/components/ui/circular-progress";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";

function AnalysisSection({ title, icon: Icon, content }: { title: string; icon: any; content: string }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="w-4 h-4 text-primary" />{title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{content}</p>
      </CardContent>
    </Card>
  );
}

function StructuredInsightList({
  title,
  icon: Icon,
  items,
  fallback,
}: {
  title: string;
  icon: any;
  items?: Array<{ title: string; detail: string; priority?: string; category?: string }>;
  fallback: string;
}) {
  if (!items?.length) {
    return <AnalysisSection title={title} icon={Icon} content={fallback} />;
  }

  return (
    <Card className="blue-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="w-4 h-4 text-primary" />{title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
            <div key={`${item.title}-${item.category ?? ""}`} className="rounded-lg blue-tile p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{item.title}</p>
              {item.priority && <Badge variant={item.priority === "High" ? "destructive" : "secondary"}>{item.priority}</Badge>}
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed mt-1">{item.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function priorityToCurrent(priority?: string): number {
  if (priority === "High") return 32;
  if (priority === "Medium") return 54;
  return 68;
}

function buildGapRadar(items?: Array<{ title: string; priority?: string; category?: string }>) {
  const source = items?.slice(0, 8) ?? [];
  const fallback = [
    "Technical depth",
    "Portfolio proof",
    "Leadership",
    "Domain fluency",
    "Communication",
    "Certifications",
  ];

  return (source.length ? source : fallback.map((title) => ({ title, priority: "Medium" }))).map((item) => ({
    dimension: ("category" in item && item.category) ? item.category : item.title.split(" ").slice(0, 2).join(" "),
    current: priorityToCurrent(item.priority),
    target: 88,
  }));
}

function AnalysisVisualLead({ analysis }: { analysis: any }) {
  const radarData = buildGapRadar(analysis.skillGapsStructured);
  const actions = (analysis.immediateActionsStructured ?? []).slice(0, 3);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <Card className="blue-card">
        <CardHeader>
          <CardTitle>Current vs Target Skill Shape</CardTitle>
        </CardHeader>
        <CardContent className="h-[390px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="74%">
              <PolarGrid stroke="rgba(255,255,255,0.12)" />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: "hsl(215 20% 78%)", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  color: "hsl(var(--foreground))",
                }}
              />
              <Radar name="Current" dataKey="current" stroke="hsl(215 20% 78%)" fill="hsl(215 20% 78%)" fillOpacity={0.15} />
              <Radar name="Target" dataKey="target" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.24} />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="blue-card-strong">
        <CardHeader>
          <CardTitle>Immediate Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(actions.length ? actions : analysis.skillGapsStructured?.slice(0, 3) ?? []).map((item: any, index: number) => (
            <div key={`${item.title}-${index}`} className="rounded-xl border border-white/35 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs font-semibold uppercase tracking-widest text-primary">0{index + 1}</span>
                {item.priority && (
                  <Badge className={item.priority === "High" ? "border-primary/30 bg-primary/20 text-primary" : ""} variant={item.priority === "High" ? "outline" : "secondary"}>
                    {item.priority}
                  </Badge>
                )}
              </div>
              <p className="mt-2 font-semibold">{item.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail ?? "Focus this area first to close the most visible gap."}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Analysis() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: analysis, isLoading, error } = useGetLatestAnalysis();
  const { data: goal } = useGetCareerGoal();
  const runAnalysis = useRunAnalysis();
  const [running, setRunning] = useState(false);
  const targetMonths = goal?.targetMonths ?? 12;

  const noAnalysis = !isLoading && (!analysis || (error as any)?.status === 404);

  const handleRun = async () => {
    setRunning(true);
    try {
      await runAnalysis.mutateAsync();
      await qc.invalidateQueries({ queryKey: getGetLatestAnalysisQueryKey() });
      await qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      await qc.invalidateQueries({ queryKey: getGetSkillGapsQueryKey() });
      await qc.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
      await qc.invalidateQueries({ queryKey: getGetRoadmapQueryKey() });
      await qc.invalidateQueries({ queryKey: getListMilestonesQueryKey() });
      toast({ title: "Analysis complete", description: "Your career intelligence report is ready." });
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err?.data?.error ?? "Please complete your profile and set a career goal first.", variant: "destructive" });
    }
    setRunning(false);
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Career Analysis</h1>
            <p className="text-muted-foreground mt-1">Your readiness, gaps, and next actions.</p>
          </div>
          <Button onClick={handleRun} disabled={running} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <BrainCircuit className="w-4 h-4 mr-2" />
            {running ? "Analysing..." : analysis ? "Re-run Analysis" : "Run Analysis"}
          </Button>
        </div>

        {running && (
          <Card className="blue-card">
            <CardContent className="pt-6 flex items-center gap-6">
              <div className="w-12 h-12 rounded-full border-2 border-t-primary border-primary/20 animate-spin" />
              <div>
                <p className="font-semibold text-primary">Analysing your profile...</p>
                <p className="text-sm text-muted-foreground mt-1">Checking your profile and target role.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading && !running && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {noAnalysis && !running && (
          <ProductEmptyState
            title="See your career readiness"
            description="Run your first analysis to get a readiness score, priority gaps, and the actions that matter next."
            cta="Run your first analysis"
            href="/analysis"
            onAction={handleRun}
            exampleScore={72}
          />
        )}

        {analysis && !running && (
          <>
            {/* Score Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="blue-card-strong md:col-span-1">
                <CardContent className="pt-6 flex flex-col items-center gap-4">
                  <CircularProgress value={analysis.readinessScore} size={120} colorClass="text-primary" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Readiness Score</p>
                    <Badge className="mt-2 bg-primary/20 text-primary border-primary/30">
                      {analysis.readinessScore >= 70 ? "Strong" : analysis.readinessScore >= 50 ? "Developing" : "Early Stage"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              <Card className="blue-card md:col-span-2">
                <CardHeader><CardTitle>Profile Summary</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground/80 leading-relaxed">{analysis.profileSummary}</p>
                  <p className="text-xs text-muted-foreground mt-4">Analysis run: {new Date(analysis.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="blue-card">
              <CardHeader><CardTitle>Readiness Sub-Scores</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(analysis.readinessSubScores).map(([label, value]) => (
                    <div key={label} className="rounded-lg blue-tile p-3">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold mt-1">{value}%</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <AnalysisVisualLead analysis={analysis} />

            <JobMarketEvidencePanel gaps={analysis.skillGapsStructured} />

            <div className="grid gap-6 lg:grid-cols-2">
              <OutcomeTransparency readinessScore={analysis.readinessScore} targetMonths={targetMonths} />
              <ApplicationReadiness
                readinessScore={analysis.readinessScore}
                subScores={analysis.readinessSubScores as unknown as Record<string, number>}
                gapCount={analysis.skillGapsStructured?.length ?? 0}
              />
            </div>

            <CourseRecommendations
              title="Curated Learning Paths"
              groups={analysis.learningRecommendations?.filter((group) => group.sourceType === "skill-gap") ?? []}
            />

            <MentorFeedbackLoop />

            {/* Analysis Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StructuredInsightList title="Current Strengths" icon={CheckCircle} items={analysis.currentStrengthsStructured} fallback={analysis.currentStrengths} />
              <StructuredInsightList title="Skill Gaps" icon={AlertTriangle} items={analysis.skillGapsStructured} fallback={analysis.skillGaps} />
              <AnalysisSection title="Experience Gaps" icon={TrendingUp} content={analysis.experienceGaps} />
              <AnalysisSection title="Projects" icon={FolderOpen} content={analysis.suggestedProjects} />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
