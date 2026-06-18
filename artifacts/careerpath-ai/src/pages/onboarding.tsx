import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  FileText,
  Loader2,
  Radar,
  Route,
  ScanLine,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api-request";

interface ExtractedProfile {
  currentRole?: string;
  yearsExperience?: number;
  industry?: string;
  careerLevel?: string;
  skills: string[];
  professionalSummary: string;
}

interface CareerOption {
  id: string;
  title: string;
  durationMonths: number;
  rationale: string;
  skills: string[];
  matchScore: number;
}

interface IntakeResult {
  source: "cv" | "description";
  fileName: string | null;
  extracted: ExtractedProfile;
  options: CareerOption[];
}

const BUILD_STEPS = [
  "Saving your career direction",
  "Running readiness and gap analysis",
  "Building your milestone journey",
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"description" | "cv">("description");
  const [description, setDescription] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [buildStep, setBuildStep] = useState(0);

  const analyseIntake = async () => {
    if (mode === "description" && description.trim().length < 40) {
      toast({ title: "Add a little more detail", description: "Use at least 40 characters so the mapping has enough career evidence.", variant: "destructive" });
      return;
    }
    if (mode === "cv" && !file) {
      toast({ title: "Choose your CV", description: "Upload a PDF, DOCX, or TXT file up to 5 MB.", variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      const form = new FormData();
      if (description.trim()) form.append("description", description.trim());
      if (targetRole.trim()) form.append("targetRole", targetRole.trim());
      if (file) form.append("cv", file);
      const intake = await apiRequest<IntakeResult>("/onboarding/intake", { method: "POST", body: form });
      setResult(intake);
      setSelectedId(intake.options[0]?.id ?? "");
    } catch (error) {
      toast({ title: "We could not read that career evidence", description: error instanceof Error ? error.message : "Try another file or use a written description.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const buildJourney = async () => {
    const selected = result?.options.find((option) => option.id === selectedId);
    if (!selected) return;

    setProcessing(true);
    try {
      setBuildStep(0);
      await apiRequest("/career-goal", {
        method: "PUT",
        body: JSON.stringify({
          targetRole: selected.title,
          targetYears: Math.max(1, Math.ceil(selected.durationMonths / 12)),
        }),
      });

      setBuildStep(1);
      await apiRequest("/analysis", {
        method: "POST",
        body: JSON.stringify({ skipMilestones: true }),
      });

      setBuildStep(2);
      await apiRequest("/journey/build", {
        method: "POST",
        body: JSON.stringify({ selectedDirectionId: selected.id }),
      });

      await queryClient.invalidateQueries();
      setLocation("/dashboard");
    } catch (error) {
      toast({ title: "Journey build stopped", description: error instanceof Error ? error.message : "Your saved progress is safe. Please try again.", variant: "destructive" });
      setProcessing(false);
    }
  };

  if (processing && result) {
    return (
      <main className="min-h-screen bg-background grid place-items-center px-6">
        <section className="w-full max-w-xl border border-primary/20 bg-card p-8 shadow-[0_0_60px_rgba(0,240,255,0.08)]">
          <div className="flex items-center gap-4 border-b border-white/10 pb-6">
            <div className="grid h-12 w-12 place-items-center bg-primary/10 border border-primary/30">
              <ScanLine className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-primary">Career engine active</p>
              <h1 className="mt-1 text-2xl font-semibold">Building your route</h1>
            </div>
          </div>
          <div className="mt-7 space-y-3">
            {BUILD_STEPS.map((label, index) => (
              <div key={label} className="flex items-center gap-3 border border-white/10 bg-white/[0.02] p-4">
                <div className={`grid h-7 w-7 place-items-center border ${index < buildStep ? "border-primary bg-primary text-primary-foreground" : index === buildStep ? "border-primary text-primary" : "border-white/10 text-muted-foreground"}`}>
                  {index < buildStep ? <Check className="h-4 w-4" /> : index === buildStep ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="text-xs">{index + 1}</span>}
                </div>
                <span className={index <= buildStep ? "text-foreground" : "text-muted-foreground"}>{label}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center border border-primary/30 bg-primary/10">
              <Radar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">CareerPath AI</p>
              <p className="text-xs text-muted-foreground">Career signal intake</p>
            </div>
          </div>
          <Badge variant="outline" className="border-primary/20 text-primary">Private workspace</Badge>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[280px_1fr] lg:py-16">
        <aside className="min-w-0 space-y-8">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">First-use calibration</p>
            <h1 className="mt-3 break-words text-3xl font-bold leading-tight">Turn your experience into a realistic next move.</h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">Share what you do now. The career engine maps your evidence, measures readiness, and builds the first milestone route.</p>
          </div>
          <ol className="space-y-4 border-l border-white/10 pl-5">
            {[
              [BriefcaseBusiness, "Understand", "Extract roles, skills, and experience"],
              [Sparkles, "Map", "Rank credible career directions"],
              [Route, "Build", "Create analysis and milestones"],
            ].map(([Icon, title, copy], index) => {
              const StepIcon = Icon as typeof BriefcaseBusiness;
              return (
                <li key={String(title)} className="relative flex gap-3">
                  <span className="absolute -left-[27px] top-1 grid h-4 w-4 place-items-center border border-primary/40 bg-background text-[9px] text-primary">{index + 1}</span>
                  <StepIcon className="mt-0.5 h-4 w-4 text-primary" />
                  <div><p className="text-sm font-medium">{String(title)}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{String(copy)}</p></div>
                </li>
              );
            })}
          </ol>
        </aside>

        <section className="min-w-0">
          {!result ? (
            <div className="border border-white/10 bg-card/70 p-6 sm:p-8">
              <div className="flex flex-wrap gap-1 border-b border-white/10 pb-5">
                <Button type="button" variant={mode === "description" ? "default" : "ghost"} onClick={() => setMode("description")} className="min-w-0 rounded-none">
                  <FileText className="mr-2 h-4 w-4" /> Describe my work
                </Button>
                <Button type="button" variant={mode === "cv" ? "default" : "ghost"} onClick={() => setMode("cv")} className="min-w-0 rounded-none">
                  <Upload className="mr-2 h-4 w-4" /> Upload CV
                </Button>
              </div>

              <div className="mt-6 space-y-6">
                {mode === "description" ? (
                  <div>
                    <label className="text-sm font-medium" htmlFor="career-description">What do you do today?</label>
                    <p className="mt-1 text-xs text-muted-foreground">Include responsibilities, tools, strengths, and work you enjoy.</p>
                    <Textarea id="career-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={9} className="mt-3 resize-none rounded-none border-white/10 bg-black/20 text-base leading-7" placeholder="I currently work in operations for a healthcare company. I coordinate projects, improve processes, build Excel reports, and work with senior stakeholders..." />
                    <p className="mt-2 text-right text-xs text-muted-foreground">{description.length} characters</p>
                  </div>
                ) : (
                  <div>
                    <input ref={fileInput} type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
                    <button type="button" onClick={() => fileInput.current?.click()} className="grid min-h-64 w-full place-items-center border border-dashed border-primary/30 bg-primary/[0.03] p-8 text-center transition-colors hover:bg-primary/[0.06]">
                      <span>
                        <span className="mx-auto grid h-12 w-12 place-items-center border border-primary/30 bg-primary/10"><Upload className="h-5 w-5 text-primary" /></span>
                        <span className="mt-4 block font-medium">{file ? file.name : "Choose your CV"}</span>
                        <span className="mt-2 block text-sm text-muted-foreground">PDF, DOCX, or TXT up to 5 MB</span>
                      </span>
                    </button>
                  </div>
                )}

                <div className="border-t border-white/10 pt-6">
                  <label className="text-sm font-medium" htmlFor="target-role">Target role <span className="font-normal text-muted-foreground">(optional)</span></label>
                  <p className="mt-1 text-xs text-muted-foreground">Leave this blank and the engine will recommend realistic options.</p>
                  <Input id="target-role" value={targetRole} onChange={(event) => setTargetRole(event.target.value)} className="mt-3 h-11 rounded-none border-white/10 bg-black/20" placeholder="e.g. Product Manager" />
                </div>

                <Button onClick={analyseIntake} disabled={processing} className="h-12 w-full rounded-none text-base">
                  {processing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Extracting career signals</> : <>Map my career options <ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border border-white/10 bg-card/70 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><p className="text-xs font-semibold uppercase text-primary">Profile mapped</p><h2 className="mt-2 text-xl font-semibold">We found your strongest career signals</h2></div>
                  <Button variant="ghost" size="sm" onClick={() => setResult(null)}>Edit input</Button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[result.extracted.currentRole ?? "Role not detected", result.extracted.industry ?? "Cross-industry", result.extracted.yearsExperience != null ? `${result.extracted.yearsExperience} years` : result.extracted.careerLevel].map((value) => (
                    <div key={value} className="border border-white/10 bg-black/20 px-4 py-3 text-sm">{value}</div>
                  ))}
                </div>
                {result.extracted.skills.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{result.extracted.skills.map((skill) => <Badge key={skill} variant="secondary">{skill}</Badge>)}</div>}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-primary">Recommended directions</p>
                <h2 className="mt-2 text-2xl font-semibold">Choose the route that fits your ambition</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {result.options.map((option) => {
                    const selected = selectedId === option.id;
                    return (
                      <button key={option.id} type="button" onClick={() => setSelectedId(option.id)} className={`min-h-48 border p-5 text-left transition-colors ${selected ? "border-primary bg-primary/[0.06]" : "border-white/10 bg-card/50 hover:border-primary/40"}`}>
                        <div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{option.title}</h3><span className={`grid h-6 w-6 place-items-center border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-white/20"}`}>{selected && <Check className="h-4 w-4" />}</span></div>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">{option.rationale}</p>
                        <p className="mt-4 text-xs font-medium text-primary">Estimated route: {option.durationMonths} months</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button onClick={buildJourney} disabled={!selectedId} className="h-12 w-full rounded-none text-base">Run analysis and build my journey <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
