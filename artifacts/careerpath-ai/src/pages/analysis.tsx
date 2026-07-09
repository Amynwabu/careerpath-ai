import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRunAnalysis, useGetLatestAnalysis, useGetCareerGoal, getGetLatestAnalysisQueryKey, getGetDashboardSummaryQueryKey, getGetSkillGapsQueryKey, getGetRecentActivityQueryKey, getGetRoadmapQueryKey, getListMilestonesQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CircularProgress } from "@/components/ui/circular-progress";

function AnalysisSection({ title, content }: { title: string; content: string }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-base text-foreground/80 leading-7 whitespace-pre-line">{content}</p>
      </CardContent>
    </Card>
  );
}

export default function Analysis() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: analysis, isLoading, error } = useGetLatestAnalysis();
  const { data: goal } = useGetCareerGoal();
  const runAnalysis = useRunAnalysis();
  const [running, setRunning] = useState(false);
  const targetRole =
    (analysis as { targetRole?: string } | undefined)?.targetRole ??
    (goal as { targetRole?: string } | undefined)?.targetRole ??
    "your target role";

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
      toast({ title: "Analysis complete", description: "Your career plan is ready." });
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
            <h1 className="text-3xl font-bold tracking-tight">Your Analysis</h1>
            <p className="text-muted-foreground mt-1">A short view of where you are, what is missing, and what to do next.</p>
          </div>
          <Button onClick={handleRun} disabled={running} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {running ? "Analysing..." : analysis ? "Re-run Analysis" : "Run Analysis"}
          </Button>
        </div>

        {running && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6 flex items-center gap-6">
              <div className="w-12 h-12 rounded-full border-2 border-t-primary border-primary/20 animate-spin" />
              <div>
                <p className="font-semibold text-primary">Analysing your profile...</p>
                <p className="text-sm text-muted-foreground mt-1">Analysing your profile, experience, and target role...</p>
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
          <Card className="border-border bg-card">
            <CardContent className="pt-12 pb-12 flex flex-col items-center text-center gap-6">
              <div>
                <h2 className="text-2xl font-bold">No Analysis Yet</h2>
                <p className="text-muted-foreground mt-2 max-w-md">
                  Complete your profile and set your target role, then run your first analysis to get a readiness score, gap summary, and roadmap.
                </p>
              </div>
              <Button onClick={handleRun} size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Run Analysis
              </Button>
            </CardContent>
          </Card>
        )}

        {analysis && !running && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-primary/30 bg-card md:col-span-1">
                <CardContent className="pt-6 flex flex-col items-center gap-4">
                  <CircularProgress value={analysis.readinessScore} size={120} colorClass="text-primary" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Readiness score</p>
                    <Badge className="mt-2 bg-primary/20 text-primary border-primary/30">
                      {analysis.readinessScore >= 70 ? "Strong" : analysis.readinessScore >= 50 ? "Developing" : "Early Stage"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border bg-card md:col-span-2">
                <CardHeader><CardTitle>Current role summary</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-base text-foreground/80 leading-7">{analysis.profileSummary}</p>
                  <p className="mt-5 text-sm font-medium text-muted-foreground">Target role</p>
                  <p className="mt-1 text-xl font-semibold text-primary">{targetRole}</p>
                  <p className="text-xs text-muted-foreground mt-4">Analysis run: {new Date(analysis.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnalysisSection title="Top transferable strengths" content={analysis.currentStrengths} />
              <AnalysisSection title="Main skill gaps" content={analysis.skillGaps} />
              <AnalysisSection title="Best next step" content={analysis.immediateActions} />
              <AnalysisSection title="Portfolio proof" content={analysis.suggestedProjects} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AnalysisSection title="Months 1 to 2" content={analysis.immediateActions} />
              <AnalysisSection title="Months 3 to 4" content={analysis.year1Priorities} />
              <AnalysisSection title="Months 5 to 6" content={analysis.year2To3Plan} />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
