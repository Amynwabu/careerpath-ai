import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetCareerGoal, useSetCareerGoal, getGetCareerGoalQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const LEADERSHIP_OPTIONS = ["Individual Contributor", "Team Lead", "Manager", "Senior Manager", "Director", "VP", "C-Suite"];
const WORK_MODE_OPTIONS = ["Remote", "Hybrid", "On-site", "No preference"];
const MONTH_OPTIONS = [1, 3, 6, 9, 12, 18, 24, 36, 48, 60, 72, 96, 120];

export default function CareerGoal() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: goal, isLoading } = useGetCareerGoal();
  const setGoal = useSetCareerGoal();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Record<string, string>>({});
  const [targetMonths, setTargetMonths] = useState<number | null>(null);
  const f = (key: string) => form[key] ?? (goal as any)?.[key] ?? "";
  const months = targetMonths ?? (goal as any)?.targetYears ?? 24;

  const handleSave = async () => {
    if (!f("targetRole")) {
      toast({ title: "Target role required", description: `Please enter your desired role for the selected month timeline.`, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await setGoal.mutateAsync({ data: {
        targetRole: f("targetRole"),
        targetIndustry: f("targetIndustry") || undefined,
        targetLevel: f("targetLevel") || undefined,
        leadershipPreference: f("leadershipPreference") || undefined,
        geographicPreference: f("geographicPreference") || undefined,
        workModePreference: f("workModePreference") || undefined,
        strengthsToBuild: f("strengthsToBuild") || undefined,
        areasToImprove: f("areasToImprove") || undefined,
        targetYears: months,
      } });
      qc.invalidateQueries({ queryKey: getGetCareerGoalQueryKey() });
      setForm({});
      toast({ title: "Career goal saved", description: `Your ${months}-month target has been updated.` });
    } catch {
      toast({ title: "Error", description: "Failed to save career goal.", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Target className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your {months}-Month Career Target</h1>
            <p className="text-muted-foreground mt-1">Define where you want to be — your AI roadmap will be built around this goal.</p>
          </div>
        </div>

        {isLoading ? <Skeleton className="h-96 w-full" /> : (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Target Role Definition</CardTitle>
              <CardDescription>The more specific you are, the more accurate your roadmap will be.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-semibold mb-3 block">Months to achieve this goal</label>
                <div className="flex flex-wrap gap-2">
                  {MONTH_OPTIONS.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTargetMonths(m)}
                      className={`w-10 h-10 rounded-lg text-sm font-semibold border transition-all ${
                        months === m
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary hover:text-foreground bg-background"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Desired Role in {months} Months <span className="text-primary">*</span></label>
                <Input
                  placeholder="e.g. Head of AI Engineering, Senior Product Manager, Director of Digital Transformation"
                  value={f("targetRole")}
                  onChange={e => setForm(p => ({ ...p, targetRole: e.target.value }))}
                  className="bg-background border-border text-base"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Target Industry / Sector</label>
                  <Input placeholder="e.g. FinTech, Healthcare, Public Sector" value={f("targetIndustry")} onChange={e => setForm(p => ({ ...p, targetIndustry: e.target.value }))} className="bg-background border-border" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Geographic Preference</label>
                  <Input placeholder="e.g. London, UK or Remote globally" value={f("geographicPreference")} onChange={e => setForm(p => ({ ...p, geographicPreference: e.target.value }))} className="bg-background border-border" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Leadership Level</label>
                  <select value={f("leadershipPreference")} onChange={e => setForm(p => ({ ...p, leadershipPreference: e.target.value }))} className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm">
                    <option value="">Select...</option>
                    {LEADERSHIP_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Work Mode Preference</label>
                  <select value={f("workModePreference")} onChange={e => setForm(p => ({ ...p, workModePreference: e.target.value }))} className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm">
                    <option value="">Select...</option>
                    {WORK_MODE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Strengths You Want to Build On</label>
                <Textarea rows={3} placeholder="e.g. My technical expertise in data engineering, stakeholder communication skills, strategic thinking..." value={f("strengthsToBuild")} onChange={e => setForm(p => ({ ...p, strengthsToBuild: e.target.value }))} className="bg-background border-border resize-none" />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Areas You Want to Improve</label>
                <Textarea rows={3} placeholder="e.g. Leadership and people management, executive presence, commercial awareness..." value={f("areasToImprove")} onChange={e => setForm(p => ({ ...p, areasToImprove: e.target.value }))} className="bg-background border-border resize-none" />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11">
                <Save className="w-4 h-4 mr-2" />{saving ? "Saving..." : "Save Career Target"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
