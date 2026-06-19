import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api-request";
import { fileToBase64, validateCvFile } from "@/lib/cv-file";

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
  growthDirection?: "deeper" | "wider" | "adjacent";
}

interface IntakeResult {
  source: "cv" | "description";
  fileName: string | null;
  extracted: ExtractedProfile;
  options: CareerOption[];
  classification: { code: string; label: string; confidence: number } | null;
  needsClarification: boolean;
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
      toast({
        title: "Add a little more detail",
        description:
          "Use at least 40 characters so the mapping has enough career evidence.",
        variant: "destructive",
      });
      return;
    }
    if (mode === "cv" && !file) {
      toast({
        title: "Choose your CV",
        description: "Upload a PDF, DOCX, or TXT file up to 5 MB.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const fileType = file ? validateCvFile(file) : undefined;
      const fileBase64 = file ? await fileToBase64(file) : undefined;
      const intake = await apiRequest<IntakeResult>("/onboarding/intake", {
        method: "POST",
        body: JSON.stringify({
          description: description.trim() || undefined,
          targetRole: targetRole.trim() || undefined,
          fileName: file?.name,
          fileType,
          fileBase64,
        }),
      });
      setResult(intake);
      setSelectedId(intake.options[0]?.id ?? "");
    } catch (error) {
      toast({
        title: "We could not read that career evidence",
        description:
          error instanceof Error
            ? error.message
            : "Try another file or use a written description.",
        variant: "destructive",
      });
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
      toast({
        title: "Journey build stopped",
        description:
          error instanceof Error
            ? error.message
            : "Your saved progress is safe. Please try again.",
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  const useCustomDirection = () => {
    const role = targetRole.trim();
    if (!role) {
      toast({
        title: "Add a target role",
        description: "Name one role you would like the journey to explore.",
        variant: "destructive",
      });
      return;
    }
    setResult(
      (current) =>
        current && {
          ...current,
          needsClarification: false,
          options: [
            {
              id: "career-goal",
              title: role,
              durationMonths: 12,
              rationale:
                "Use this stated target as the starting direction and validate it against your experience during analysis.",
              skills: [
                "Role fundamentals",
                "Evidence portfolio",
                "Target-role validation",
              ],
              matchScore: 100,
            },
          ],
        },
    );
    setSelectedId("career-goal");
  };

  if (processing && result) {
    return (
      <main className="min-h-screen bg-background grid place-items-center px-6">
        <section className="w-full max-w-xl border border-primary/20 bg-card p-8 shadow-[0_0_60px_rgba(0,240,255,0.08)]">
          <div className="flex items-center gap-4 border-b border-white/10 pb-6">
            <BrandMark size="lg" className="animate-pulse" />
            <div>
              <p className="text-xs font-semibold uppercase text-primary">
                Career engine active
              </p>
              <h1 className="mt-1 text-2xl font-semibold">
                Building your route
              </h1>
            </div>
          </div>
          <div className="mt-7 space-y-3">
            {BUILD_STEPS.map((label, index) => (
              <div
                key={label}
                className="flex items-center gap-3 border border-white/10 bg-white/[0.02] p-4"
              >
                <div
                  className={`grid h-7 w-7 place-items-center border ${index < buildStep ? "border-primary bg-primary text-primary-foreground" : index === buildStep ? "border-primary text-primary" : "border-white/10 text-muted-foreground"}`}
                >
                  <span className="text-xs">
                    {index < buildStep ? "Done" : index + 1}
                  </span>
                </div>
                <span
                  className={
                    index <= buildStep
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {label}
                </span>
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
            <BrandMark />
            <div>
              <p className="font-semibold">CareerPath AI</p>
              <p className="text-xs text-muted-foreground">Profile mapping</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-white/15 text-muted-foreground"
          >
            First-time setup
          </Badge>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
        <section className="min-w-0">
          {!result ? (
            <div>
              <div className="border-b border-white/10 pb-9 sm:pb-11">
                <p className="text-xs font-semibold uppercase text-primary">
                  Career signal intake
                </p>
                <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">
                  Map your experience to a realistic next career move.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                  Describe your current work or upload your CV to start your
                  profile map.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    onClick={() => setMode("description")}
                    className="h-12 rounded-none px-6 text-base sm:min-w-52"
                  >
                    Describe what I do
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMode("cv")}
                    className="h-12 rounded-none border-white/15 px-6 text-base sm:min-w-52"
                  >
                    Upload my CV
                  </Button>
                </div>

                <p className="mt-5 text-sm text-muted-foreground">
                  Private workspace. Review and edit before analysis.
                </p>
              </div>

              <div className="py-8 sm:py-10">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-primary">
                      Your starting point
                    </p>
                    <h2 className="mt-2 text-xl font-semibold">
                      {mode === "description"
                        ? "Describe your current work"
                        : "Upload your CV"}
                    </h2>
                  </div>
                  <div className="flex border border-white/10 p-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={mode === "description" ? "secondary" : "ghost"}
                      onClick={() => setMode("description")}
                      className="rounded-none"
                      aria-label="Use work description"
                    >
                      Description
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={mode === "cv" ? "secondary" : "ghost"}
                      onClick={() => setMode("cv")}
                      className="rounded-none"
                      aria-label="Use CV upload"
                    >
                      CV upload
                    </Button>
                  </div>
                </div>

                <div className="space-y-6">
                  {mode === "description" ? (
                    <div>
                      <label
                        className="text-sm font-medium"
                        htmlFor="career-description"
                      >
                        What do you do today?
                      </label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Include responsibilities, tools, strengths, and work you
                        enjoy.
                      </p>
                      <Textarea
                        id="career-description"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        rows={9}
                        className="mt-3 resize-none rounded-none border-white/10 bg-black/20 text-base leading-7"
                        placeholder="I currently work in operations for a healthcare company. I coordinate projects, improve processes, build Excel reports, and work with senior stakeholders..."
                      />
                      <p className="mt-2 text-right text-xs text-muted-foreground">
                        {description.length} characters
                      </p>
                    </div>
                  ) : (
                    <div>
                      <input
                        ref={fileInput}
                        type="file"
                        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                        className="hidden"
                        onChange={(event) => {
                          const selected = event.target.files?.[0] ?? null;
                          if (!selected) {
                            setFile(null);
                            return;
                          }
                          try {
                            validateCvFile(selected);
                            setFile(selected);
                          } catch (error) {
                            event.target.value = "";
                            setFile(null);
                            toast({
                              title: "That CV cannot be uploaded",
                              description:
                                error instanceof Error
                                  ? error.message
                                  : "Choose a PDF, DOCX, or TXT file up to 5 MB.",
                              variant: "destructive",
                            });
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInput.current?.click()}
                        className="grid min-h-64 w-full place-items-center border border-dashed border-primary/30 bg-primary/[0.03] p-8 text-center transition-colors hover:bg-primary/[0.06]"
                      >
                        <span>
                          <span className="mt-4 block font-medium">
                            {file ? file.name : "Choose your CV"}
                          </span>
                          <span className="mt-2 block text-sm text-muted-foreground">
                            PDF, DOCX, or TXT up to 5 MB
                          </span>
                        </span>
                      </button>
                    </div>
                  )}

                  <div className="border-t border-white/10 pt-6">
                    <label
                      className="text-sm font-medium"
                      htmlFor="target-role"
                    >
                      Target role{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Leave this blank and the engine will recommend realistic
                      options.
                    </p>
                    <Input
                      id="target-role"
                      value={targetRole}
                      onChange={(event) => setTargetRole(event.target.value)}
                      className="mt-3 h-11 rounded-none border-white/10 bg-black/20"
                      placeholder="e.g. Product Manager"
                    />
                  </div>

                  <Button
                    onClick={analyseIntake}
                    disabled={processing}
                    className="h-12 w-full rounded-none text-base"
                  >
                    {processing
                      ? "Extracting career signals..."
                      : "Map my career options"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border border-white/10 bg-card/70 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-primary">
                      Profile mapped
                    </p>
                    <h2 className="mt-2 text-xl font-semibold">
                      We found your strongest career signals
                    </h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setResult(null)}
                  >
                    Edit input
                  </Button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[
                    result.extracted.currentRole ?? "Role not detected",
                    result.extracted.industry ?? "Cross-industry",
                    result.extracted.yearsExperience != null
                      ? `${result.extracted.yearsExperience} years`
                      : result.extracted.careerLevel,
                  ].map((value) => (
                    <div
                      key={value}
                      className="border border-white/10 bg-black/20 px-4 py-3 text-sm"
                    >
                      {value}
                    </div>
                  ))}
                </div>
                {result.extracted.skills.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.extracted.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-primary">
                  Recommended directions
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Choose a realistic next direction
                </h2>
                {result.classification && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Profession map:{" "}
                    <span className="font-medium text-foreground">
                      {result.classification.label}
                    </span>
                  </p>
                )}
                {result.needsClarification && result.options.length === 0 ? (
                  <div className="mt-5 border border-white/10 bg-card/50 p-5">
                    <p className="font-medium">
                      We need one more career signal.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Your description does not yet match a profession strongly
                      enough to recommend honest next steps. Add a role you want
                      to explore rather than receiving a generic technology
                      recommendation.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <Input
                        value={targetRole}
                        onChange={(event) => setTargetRole(event.target.value)}
                        className="h-11 rounded-none border-white/10 bg-black/20"
                        placeholder="e.g. Workshop Manager"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={useCustomDirection}
                        className="h-11 rounded-none"
                      >
                        Use this direction
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {result.options.map((option) => {
                      const selected = selectedId === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setSelectedId(option.id)}
                          className={`min-h-48 border p-5 text-left transition-colors ${selected ? "border-primary bg-primary/[0.06]" : "border-white/10 bg-card/50 hover:border-primary/40"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-semibold">{option.title}</h3>
                            <span
                              className={`border px-2 py-1 text-[10px] font-semibold uppercase ${selected ? "border-primary bg-primary text-primary-foreground" : "border-white/20 text-muted-foreground"}`}
                            >
                              {selected ? "Selected" : "Select"}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-muted-foreground">
                            {option.rationale}
                          </p>
                          {option.growthDirection && (
                            <p className="mt-3 text-xs uppercase text-muted-foreground">
                              {option.growthDirection} progression
                            </p>
                          )}
                          <p className="mt-4 text-xs font-medium text-primary">
                            Estimated route: {option.durationMonths} months
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <Button
                onClick={buildJourney}
                disabled={!selectedId}
                className="h-12 w-full rounded-none text-base"
              >
                Run analysis and build my journey
              </Button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
