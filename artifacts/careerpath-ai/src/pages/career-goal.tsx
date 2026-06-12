import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);

export default function CareerGoal() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: goal, isLoading } = useGetCareerGoal();
  const setGoal = useSetCareerGoal();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Record<string, string>>({});
  const [targetMonths, setTargetMonths] = useState<number | null>(null);
  const f = (key: string) => form[key] ?? (goal as any)?.[key] ?? "";
  const months = targetMonths ?? goal?.targetMonths ?? 12;

  const handleSave = async () => {
    if (!f("targetRole")) {
      toast({ title: "Target role required", description: `Please enter your desired ${months}-month role.`, variant: "destructive" });
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
        targetMonths: months,
      } });
      qc.invalidateQueries({ queryKey: getGetCareerGoalQueryKey() });
      setForm({});
      toast({ title: "Career goal saved", description: `Your ${months}-month target has been updated.` });
      setLocation("/analysis");
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
          <Card className="blue-card">
            <CardHeader>
              <CardTitle>Target Role Definition</CardTitle>
              <CardDescription>Keep it focused. You can refine this later.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-semibold mb-3 block">Months to achieve this goal</label>
                <select
                  value={months}
                  onChange={event => setTargetMonths(Number(event.target.value))}
                  className="w-full bg-background border border-border rounded-md px-4 py-3 text-base font-semibold"
                >
                  {MONTH_OPTIONS.map(option => (
                    <option key={option} value={option}>{option} month{option !== 1 ? "s" : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Desired Role in {months} Months <span className="text-primary">*</span></label>
                <Input
                  placeholder="e.g. Senior Product Manager"
                  value={f("targetRole")}
                  onChange={e => setForm(p => ({ ...p, targetRole: e.target.value }))}
                  className="bg-background border-border text-base"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Target Industry / Sector</label>
                  <Input placeholder="e.g. FinTech" value={f("targetIndustry")} onChange={e => setForm(p => ({ ...p, targetIndustry: e.target.value }))} className="bg-background border-border" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Geographic Preference</label>
                  <Input placeholder="e.g. London or Remote" value={f("geographicPreference")} onChange={e => setForm(p => ({ ...p, geographicPreference: e.target.value }))} className="bg-background border-border" />
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
                <Textarea rows={2} placeholder="e.g. data analysis, stakeholder communication" value={f("strengthsToBuild")} onChange={e => setForm(p => ({ ...p, strengthsToBuild: e.target.value }))} className="bg-background border-border resize-none" />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Areas You Want to Improve</label>
                <Textarea rows={2} placeholder="e.g. leadership, cloud architecture" value={f("areasToImprove")} onChange={e => setForm(p => ({ ...p, areasToImprove: e.target.value }))} className="bg-background border-border resize-none" />
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
