import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useGetCareerGoal,
  useSetCareerGoal,
  getGetCareerGoalQueryKey,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api-request";

const LEADERSHIP_OPTIONS = [
  "Individual Contributor",
  "Team Lead",
  "Manager",
  "Senior Manager",
  "Director",
  "VP",
  "C-Suite",
];
const WORK_MODE_OPTIONS = ["Remote", "Hybrid", "On-site", "No preference"];
const YEAR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type CareerSuggestion = {
  id: string;
  title: string;
  durationMonths: number;
  rationale: string;
  growthDirection?: "deeper" | "wider" | "adjacent";
};

type CareerSuggestionsResponse = {
  classification: { label: string } | null;
  options: CareerSuggestion[];
};

export default function CareerGoal() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: goal, isLoading } = useGetCareerGoal();
  const { data: suggestions } = useQuery({
    queryKey: ["career-goal", "suggestions"],
    queryFn: () =>
      apiRequest<CareerSuggestionsResponse>("/career-goal/suggestions"),
  });
  const setGoal = useSetCareerGoal();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Record<string, string>>({});
  const [targetYears, setTargetYears] = useState<number | null>(null);
  const f = (key: string) => form[key] ?? (goal as any)?.[key] ?? "";
  const years = targetYears ?? (goal as any)?.targetYears ?? 5;

  const handleSave = async () => {
    if (!f("targetRole")) {
      toast({
        title: "Target role required",
        description: `Please enter your desired ${years}-year role.`,
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      await setGoal.mutateAsync({
        data: {
          targetRole: f("targetRole"),
          targetIndustry: f("targetIndustry") || undefined,
          targetLevel: f("targetLevel") || undefined,
          leadershipPreference: f("leadershipPreference") || undefined,
          geographicPreference: f("geographicPreference") || undefined,
          workModePreference: f("workModePreference") || undefined,
          strengthsToBuild: f("strengthsToBuild") || undefined,
          areasToImprove: f("areasToImprove") || undefined,
          targetYears: years,
        },
      });
      qc.invalidateQueries({ queryKey: getGetCareerGoalQueryKey() });
      setForm({});
      toast({
        title: "Career goal saved",
        description: `Your ${years}-year target has been updated.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save career goal.",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-3xl mx-auto space-y-8">
        <div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Your {years}-Year Career Target
            </h1>
            <p className="text-muted-foreground mt-1">
              Define where you want to be — your AI roadmap will be built around
              this goal.
            </p>
          </div>
        </div>

        {suggestions && suggestions.options.length > 0 && (
          <section>
            <p className="text-sm font-semibold">
              Realistic directions from your profile
            </p>
            {suggestions.classification && (
              <p className="mt-1 text-sm text-muted-foreground">
                Profession map: {suggestions.classification.label}
              </p>
            )}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {suggestions.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setForm((current) => ({
                      ...current,
                      targetRole: option.title,
                    }));
                    setTargetYears(
                      Math.max(1, Math.ceil(option.durationMonths / 12)),
                    );
                  }}
                  className={`border p-4 text-left transition-colors ${f("targetRole") === option.title ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-semibold">{option.title}</span>
                    {option.growthDirection && (
                      <span className="text-xs uppercase text-muted-foreground">
                        {option.growthDirection}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {option.rationale}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Target Role Definition</CardTitle>
              <CardDescription>
                The more specific you are, the more accurate your roadmap will
                be.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-semibold mb-3 block">
                  Years to achieve this goal
                </label>
                <div className="flex flex-wrap gap-2">
                  {YEAR_OPTIONS.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setTargetYears(y)}
                      className={`w-10 h-10 rounded-lg text-sm font-semibold border transition-all ${
                        years === y
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary hover:text-foreground bg-background"
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">
                  Desired Role in {years} Years{" "}
                  <span className="text-primary">*</span>
                </label>
                <Input
                  placeholder="e.g. Head of AI Engineering, Senior Product Manager, Director of Digital Transformation"
                  value={f("targetRole")}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, targetRole: e.target.value }))
                  }
                  className="bg-background border-border text-base"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Target Industry / Sector
                  </label>
                  <Input
                    placeholder="e.g. FinTech, Healthcare, Public Sector"
                    value={f("targetIndustry")}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, targetIndustry: e.target.value }))
                    }
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Geographic Preference
                  </label>
                  <Input
                    placeholder="e.g. London, UK or Remote globally"
                    value={f("geographicPreference")}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        geographicPreference: e.target.value,
                      }))
                    }
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Leadership Level
                  </label>
                  <select
                    value={f("leadershipPreference")}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        leadershipPreference: e.target.value,
                      }))
                    }
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Select...</option>
                    {LEADERSHIP_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Work Mode Preference
                  </label>
                  <select
                    value={f("workModePreference")}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        workModePreference: e.target.value,
                      }))
                    }
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Select...</option>
                    {WORK_MODE_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Strengths You Want to Build On
                </label>
                <Textarea
                  rows={3}
                  placeholder="e.g. My technical expertise in data engineering, stakeholder communication skills, strategic thinking..."
                  value={f("strengthsToBuild")}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, strengthsToBuild: e.target.value }))
                  }
                  className="bg-background border-border resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Areas You Want to Improve
                </label>
                <Textarea
                  rows={3}
                  placeholder="e.g. Leadership and people management, executive presence, commercial awareness..."
                  value={f("areasToImprove")}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, areasToImprove: e.target.value }))
                  }
                  className="bg-background border-border resize-none"
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11"
              >
                {saving ? "Saving..." : "Save Career Target"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
