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

type ReviewStep = "options" | "profile";

interface ProfileDraft {
  currentRole: string;
  yearsExperience: string;
  industry: string;
  careerLevel: string;
  location: string;
  weeklyLearningHours: string;
  professionalSummary: string;
}

const BUILD_STEPS = [
  "Saving your verified profile",
  "Saving your career direction",
  "Running readiness and gap analysis",
  "Building your milestone journey",
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"description" | "cv">(() =>
    new URLSearchParams(window.location.search).get("mode") === "cv"
      ? "cv"
      : "description",
  );
  const [description, setDescription] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [reviewStep, setReviewStep] = useState<ReviewStep>("options");
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({
    currentRole: "",
    yearsExperience: "",
    industry: "",
    careerLevel: "",
    location: "",
    weeklyLearningHours: "5",
    professionalSummary: "",
  });
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
      setReviewStep("options");
      setProfileDraft({
        currentRole: intake.extracted.currentRole ?? "",
        yearsExperience:
          intake.extracted.yearsExperience != null
            ? String(intake.extracted.yearsExperience)
            : "",
        industry: intake.extracted.industry ?? "",
        careerLevel: intake.extracted.careerLevel ?? "",
        location: "",
        weeklyLearningHours: "5",
        professionalSummary: intake.extracted.professionalSummary,
      });
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

    if (
      !profileDraft.currentRole.trim() ||
      !profileDraft.industry.trim() ||
      profileDraft.professionalSummary.trim().length < 40
    ) {
      toast({
        title: "Complete the required profile details",
        description:
          "Confirm your current role, industry, and a professional summary of at least 40 characters.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      setBuildStep(0);
      const yearsExperience = Number(profileDraft.yearsExperience);
      const weeklyLearningHours = Number(profileDraft.weeklyLearningHours);
      await apiRequest("/profile", {
        method: "PATCH",
        body: JSON.stringify({
          currentRole: profileDraft.currentRole.trim(),
          industry: profileDraft.industry.trim(),
          careerLevel: profileDraft.careerLevel.trim() || undefined,
          location: profileDraft.location.trim() || undefined,
          professionalSummary: profileDraft.professionalSummary.trim(),
          yearsExperience:
            Number.isFinite(yearsExperience) && yearsExperience >= 0
              ? yearsExperience
              : undefined,
          weeklyLearningHours:
            Number.isFinite(weeklyLearningHours) && weeklyLearningHours > 0
              ? weeklyLearningHours
              : undefined,
        }),
      });

      setBuildStep(1);
      await apiRequest("/career-goal", {
        method: "PUT",
        body: JSON.stringify({
          targetRole: selected.title,
          targetYears: Math.max(1, Math.ceil(selected.durationMonths / 12)),
        }),
      });

      setBuildStep(2);
      await apiRequest("/analysis", {
        method: "POST",
        body: JSON.stringify({ skipMilestones: true }),
      });

      setBuildStep(3);
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

  const continueToProfile = () => {
    if (!selectedId) {
      toast({
        title: "Choose a career direction",
        description: "Select one option before verifying your profile.",
        variant: "destructive",
      });
      return;
    }
    setReviewStep("profile");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateProfileDraft = (field: keyof ProfileDraft, value: string) => {
    setProfileDraft((current) => ({ ...current, [field]: value }));
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
              <p className="font-semibold">CareerPathX</p>
              <p className="text-xs text-muted-foreground">Profile mapping</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-white/15 text-muted-foreground"
          >
            Career evidence review
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
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex gap-6 text-sm">
                  <span
                    className={
                      reviewStep === "options"
                        ? "font-semibold text-primary"
                        : "text-muted-foreground"
                    }
                  >
                    1. Career options
                  </span>
                  <span
                    className={
                      reviewStep === "profile"
                        ? "font-semibold text-primary"
                        : "text-muted-foreground"
                    }
                  >
                    2. Verify profile
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setResult(null);
                    setReviewStep("options");
                  }}
                >
                  Change career evidence
                </Button>
              </div>

              {reviewStep === "options" ? (
                <>
                  <div className="border border-white/10 bg-card/70 p-6">
                    <p className="text-xs font-semibold uppercase text-primary">
                      Career signals found
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {[
                        result.extracted.currentRole ?? "Role not detected",
                        result.extracted.industry ?? "Cross-industry",
                        result.extracted.yearsExperience != null
                          ? `${result.extracted.yearsExperience} years experience`
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
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-primary">
                      Recommended directions
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold">
                      Choose a realistic career option
                    </h1>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Select one route, then verify the profile evidence used to
                      build your analysis.
                    </p>
                    {result.classification && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Profession map:{" "}
                        <span className="font-medium text-foreground">
                          {result.classification.label}
                        </span>
                      </p>
                    )}
                    {result.needsClarification &&
                    result.options.length === 0 ? (
                      <div className="mt-5 border border-white/10 bg-card/50 p-5">
                        <p className="font-medium">
                          We need one more career signal.
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          Add one role you want to explore so the journey stays
                          grounded in a real profession.
                        </p>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                          <Input
                            value={targetRole}
                            onChange={(event) =>
                              setTargetRole(event.target.value)
                            }
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
                                <h2 className="font-semibold">{option.title}</h2>
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
                                Training plan: {option.durationMonths} months
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={continueToProfile}
                    disabled={!selectedId}
                    className="h-12 w-full rounded-none text-base"
                  >
                    Continue to verify my profile
                  </Button>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-semibold uppercase text-primary">
                      Profile verification
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold">
                      Verify and complete your profile
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                      Correct anything the CV or description extraction missed.
                      This saved profile will be used for your analysis and
                      training journey.
                    </p>
                  </div>

                  <div className="border border-white/10 bg-card/70 p-6">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="verify-current-role"
                          className="text-sm font-medium"
                        >
                          Current role *
                        </label>
                        <Input
                          id="verify-current-role"
                          value={profileDraft.currentRole}
                          onChange={(event) =>
                            updateProfileDraft("currentRole", event.target.value)
                          }
                          className="mt-2 h-11 rounded-none border-white/10 bg-black/20"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="verify-industry"
                          className="text-sm font-medium"
                        >
                          Industry or profession *
                        </label>
                        <Input
                          id="verify-industry"
                          value={profileDraft.industry}
                          onChange={(event) =>
                            updateProfileDraft("industry", event.target.value)
                          }
                          className="mt-2 h-11 rounded-none border-white/10 bg-black/20"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="verify-years"
                          className="text-sm font-medium"
                        >
                          Years of experience
                        </label>
                        <Input
                          id="verify-years"
                          type="number"
                          min="0"
                          max="50"
                          value={profileDraft.yearsExperience}
                          onChange={(event) =>
                            updateProfileDraft(
                              "yearsExperience",
                              event.target.value,
                            )
                          }
                          className="mt-2 h-11 rounded-none border-white/10 bg-black/20"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="verify-level"
                          className="text-sm font-medium"
                        >
                          Career level
                        </label>
                        <Input
                          id="verify-level"
                          value={profileDraft.careerLevel}
                          onChange={(event) =>
                            updateProfileDraft("careerLevel", event.target.value)
                          }
                          className="mt-2 h-11 rounded-none border-white/10 bg-black/20"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="verify-location"
                          className="text-sm font-medium"
                        >
                          Location
                        </label>
                        <Input
                          id="verify-location"
                          value={profileDraft.location}
                          onChange={(event) =>
                            updateProfileDraft("location", event.target.value)
                          }
                          placeholder="e.g. London, UK"
                          className="mt-2 h-11 rounded-none border-white/10 bg-black/20"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="verify-learning-hours"
                          className="text-sm font-medium"
                        >
                          Weekly learning hours
                        </label>
                        <Input
                          id="verify-learning-hours"
                          type="number"
                          min="1"
                          max="40"
                          value={profileDraft.weeklyLearningHours}
                          onChange={(event) =>
                            updateProfileDraft(
                              "weeklyLearningHours",
                              event.target.value,
                            )
                          }
                          className="mt-2 h-11 rounded-none border-white/10 bg-black/20"
                        />
                      </div>
                    </div>

                    <div className="mt-5">
                      <label
                        htmlFor="verify-summary"
                        className="text-sm font-medium"
                      >
                        Professional summary *
                      </label>
                      <Textarea
                        id="verify-summary"
                        rows={7}
                        value={profileDraft.professionalSummary}
                        onChange={(event) =>
                          updateProfileDraft(
                            "professionalSummary",
                            event.target.value,
                          )
                        }
                        className="mt-2 resize-none rounded-none border-white/10 bg-black/20 leading-7"
                      />
                    </div>

                    {result.extracted.skills.length > 0 && (
                      <div className="mt-5 border-t border-white/10 pt-5">
                        <p className="text-sm font-medium">Extracted skills</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {result.extracted.skills.map((skill) => (
                            <Badge key={skill} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border border-primary/20 bg-primary/[0.04] p-5">
                    <p className="text-xs font-semibold uppercase text-primary">
                      Selected direction
                    </p>
                    <p className="mt-2 font-semibold">
                      {
                        result.options.find(
                          (option) => option.id === selectedId,
                        )?.title
                      }
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Training plans run for a minimum of 3 months and a maximum
                      of 12 months.
                    </p>
                  </div>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setReviewStep("options")}
                      className="h-12 rounded-none"
                    >
                      Back to career options
                    </Button>
                    <Button
                      onClick={buildJourney}
                      className="h-12 rounded-none px-6 text-base"
                    >
                      Save profile and build my journey
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
