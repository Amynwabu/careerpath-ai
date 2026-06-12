import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetProfileQueryKey,
  getListCertificationsQueryKey,
  getListEducationQueryKey,
  getListSkillsQueryKey,
  getListWorkExperiencesQueryKey,
  useCreateCertification,
  useCreateEducation,
  useCreateSkill,
  useCreateWorkExperience,
  useGetProfile,
  useImportCv,
  useUpdateProfile,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Check, FileText, Pencil, Upload } from "lucide-react";
import Profile from "@/pages/profile";

const PARSE_STEPS = ["Extracting text", "Identifying sections", "Matching to taxonomy"];

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame = 0;
    const started = performance.now();
    const animate = (now: number) => {
      const progress = Math.min(1, (now - started) / 520);
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span>{display}</span>;
}

type CvProfileSuggestion = {
  currentRole?: string;
  totalExperienceMonths?: number;
  industry?: string;
  location?: string;
  phone?: string;
  linkedinUrl?: string;
  professionalSummary?: string;
  careerLevel?: string;
};

type CvWorkSuggestion = {
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
  skills?: string;
};

type CvEducationSuggestion = {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
};

type CvSkillSuggestion = {
  name: string;
  category: string;
  proficiencyLevel: string;
};

type CvCertificationSuggestion = {
  name: string;
  issuingOrganization: string;
  issueDate?: string;
  expiryDate?: string;
};

type CvImportSuggestion = {
  fileName: string;
  mimeType: string;
  profile: CvProfileSuggestion;
  workExperiences: CvWorkSuggestion[];
  education: CvEducationSuggestion[];
  skills: CvSkillSuggestion[];
  certifications: CvCertificationSuggestion[];
  warnings: string[];
};

export function ProfileGate() {
  const { data: profile, isLoading } = useGetProfile();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-8 max-w-5xl mx-auto">
          <Skeleton className="h-48 w-full" />
        </div>
      </AppLayout>
    );
  }

  return profile?.cvImportCompletedAt ? <Profile /> : <ProfileImport />;
}

export default function ProfileImport() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [suggestion, setSuggestion] = useState<CvImportSuggestion | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [parseStep, setParseStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const updateProfile = useUpdateProfile();
  const importCv = useImportCv();
  const createWork = useCreateWorkExperience();
  const createEducation = useCreateEducation();
  const createSkill = useCreateSkill();
  const createCertification = useCreateCertification();

  const counts = useMemo(() => {
    if (!suggestion) return null;
    return [
      ["Work", suggestion.workExperiences.length],
      ["Education", suggestion.education.length],
      ["Skills", suggestion.skills.length],
      ["Certifications", suggestion.certifications.length],
    ];
  }, [suggestion]);

  useEffect(() => {
    if (!uploading) return;
    setParseStep(0);
    const timer = window.setInterval(() => {
      setParseStep((step) => Math.min(PARSE_STEPS.length - 1, step + 1));
    }, 520);
    return () => window.clearInterval(timer);
  }, [uploading]);

  const uploadCv = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const parsed = await importCv.mutateAsync({ data: { file } });
      setParseStep(PARSE_STEPS.length - 1);
      setSuggestion(parsed);
      toast({ title: "CV parsed", description: "Review the suggestions before saving them." });
    } catch (error: any) {
      toast({ title: "Could not import CV", description: error?.data?.error ?? error?.message ?? "Please try another file.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const selectFile = (nextFile?: File | null) => {
    if (!nextFile) return;
    setFile(nextFile);
    setSuggestion(null);
  };

  const confirmImport = async () => {
    if (!suggestion) return;
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        data: {
          ...suggestion.profile,
          cvImportCompletedAt: new Date().toISOString(),
        },
      });

      for (const item of suggestion.workExperiences) {
        if (item.company && item.title && item.startDate) await createWork.mutateAsync({ data: { ...item, isCurrent: toBoolean(item.isCurrent) } });
      }
      for (const item of suggestion.education) {
        if (item.institution && item.degree && item.startDate) {
          await createEducation.mutateAsync({
            data: {
              ...item,
              isCurrent: toBoolean(item.isCurrent),
            },
          });
        }
      }
      for (const item of suggestion.skills) {
        if (item.name) await createSkill.mutateAsync({ data: item });
      }
      for (const item of suggestion.certifications) {
        if (item.name && item.issuingOrganization) await createCertification.mutateAsync({ data: item });
      }

      await Promise.all([
        qc.invalidateQueries({ queryKey: getGetProfileQueryKey() }),
        qc.invalidateQueries({ queryKey: getListWorkExperiencesQueryKey() }),
        qc.invalidateQueries({ queryKey: getListEducationQueryKey() }),
        qc.invalidateQueries({ queryKey: getListSkillsQueryKey() }),
        qc.invalidateQueries({ queryKey: getListCertificationsQueryKey() }),
      ]);
      toast({ title: "Profile populated", description: "Your reviewed CV details have been saved." });
      setLocation("/profile/manual");
    } catch {
      toast({ title: "Import not saved", description: "Please review the highlighted fields and try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Set Up Your Profile</h1>
            <p className="text-muted-foreground mt-1">Upload a CV or enter details manually.</p>
          </div>
          <Link href="/profile/manual">
            <Button variant="outline">
              <Pencil className="w-4 h-4 mr-2" />
              Enter manually
            </Button>
          </Link>
        </div>

        <Card className="blue-card-strong">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Upload CV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                selectFile(event.dataTransfer.files?.[0]);
              }}
              className={`min-h-[200px] rounded-2xl border border-dashed p-6 transition-all ${dragging ? "border-primary bg-primary/10 shadow-[0_0_28px_hsl(var(--primary)/0.18)]" : "border-border bg-background/50"}`}
            >
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => selectFile(event.target.files?.[0])}
                className="sr-only"
              />
              <div className="flex h-full min-h-[150px] flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                  <FileText className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold">{file ? "CV ready to parse" : "Drop your CV here"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">PDF or DOCX, max 5 MB.</p>
                </div>
                {file && (
                  <div className="flex max-w-full items-center gap-3 rounded-xl blue-tile px-4 py-3 text-left">
                    <FileText className="h-5 w-5 flex-shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{file.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                )}
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Choose CV
                </Button>
              </div>
            </div>
            <Button onClick={uploadCv} disabled={!file || uploading} className="bg-primary text-primary-foreground">
              <FileText className="w-4 h-4 mr-2" />
              {uploading ? "Parsing..." : "Parse CV"}
            </Button>
            {uploading && (
              <div className="grid gap-2 rounded-xl blue-tile p-4">
                {PARSE_STEPS.map((label, index) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${index <= parseStep ? "bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.7)]" : "bg-white/15"}`} />
                    <span className={index <= parseStep ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {suggestion && (
          <div className="space-y-6">
            <Card className="blue-card">
              <CardContent className="grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">Parser Summary</p>
                  <h2 className="mt-2 text-2xl font-bold">Review what we found</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Review before saving.</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl blue-tile p-3">
                    <p className="font-mono text-3xl font-bold text-primary"><CountUp value={suggestion.workExperiences.length} /></p>
                    <p className="text-xs text-muted-foreground">roles</p>
                  </div>
                  <div className="rounded-xl blue-tile p-3">
                    <p className="font-mono text-3xl font-bold text-primary"><CountUp value={suggestion.skills.length} /></p>
                    <p className="text-xs text-muted-foreground">skills</p>
                  </div>
                  <div className="rounded-xl blue-tile p-3">
                    <p className="font-mono text-3xl font-bold text-primary"><CountUp value={suggestion.education.length + suggestion.certifications.length} /></p>
                    <p className="text-xs text-muted-foreground">qualifications</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{suggestion.fileName}</Badge>
              {counts?.map(([label, count]) => <Badge key={label} variant="outline">{label}: {count}</Badge>)}
            </div>

            {suggestion.warnings.length > 0 && (
              <Card className="border-amber-500/40 bg-amber-500/5">
                <CardContent className="pt-4 space-y-2">
                  {suggestion.warnings.map((warning) => (
                    <div key={warning} className="flex items-start gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 mt-0.5 text-amber-500" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <ReviewProfile suggestion={suggestion} onChange={setSuggestion} />

            <div className="flex gap-3">
              <Button onClick={confirmImport} disabled={saving} className="bg-primary text-primary-foreground">
                <Check className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Confirm and save"}
              </Button>
              <Link href="/profile/manual">
                <Button variant="ghost">Skip import</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function toBoolean(value: unknown): boolean {
  return value === true || String(value).toLowerCase() === "true";
}

function ReviewProfile({ suggestion, onChange }: { suggestion: CvImportSuggestion; onChange: (next: CvImportSuggestion) => void }) {
  const setProfileField = (field: keyof CvProfileSuggestion, value: string) => {
    onChange({ ...suggestion, profile: { ...suggestion.profile, [field]: field === "totalExperienceMonths" ? Number(value) : value } });
  };

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader><CardTitle>Review Profile Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ["currentRole", "Current role"],
              ["industry", "Industry"],
              ["careerLevel", "Career level"],
              ["location", "Location"],
              ["phone", "Phone"],
              ["linkedinUrl", "LinkedIn URL"],
              ["totalExperienceMonths", "Experience in months"],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">{label}</label>
                <Input
                  type={key === "totalExperienceMonths" ? "number" : "text"}
                  value={String(suggestion.profile[key as keyof CvProfileSuggestion] ?? "")}
                  onChange={(event) => setProfileField(key as keyof CvProfileSuggestion, event.target.value)}
                  className="bg-background border-border"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Professional summary</label>
            <Textarea
              rows={4}
              value={suggestion.profile.professionalSummary ?? ""}
              onChange={(event) => setProfileField("professionalSummary", event.target.value)}
              className="bg-background border-border resize-none"
            />
          </div>
        </CardContent>
      </Card>

      <ReviewList title="Work experience" items={suggestion.workExperiences} onChange={(workExperiences) => onChange({ ...suggestion, workExperiences })} />
      <ReviewList title="Education" items={suggestion.education} onChange={(education) => onChange({ ...suggestion, education })} />
      <ReviewList title="Skills" items={suggestion.skills} onChange={(skills) => onChange({ ...suggestion, skills })} />
      <ReviewList title="Certifications" items={suggestion.certifications} onChange={(certifications) => onChange({ ...suggestion, certifications })} />
    </div>
  );
}

function ReviewList<T extends Record<string, unknown>>({ title, items, onChange }: { title: string; items: T[]; onChange: (items: T[]) => void }) {
  if (items.length === 0) return null;

  return (
    <Card className="border-border bg-card">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-border rounded-lg p-4">
            {Object.entries(item).map(([field, value]) => (
              <div key={field}>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{field}</label>
                <Input
                  value={String(value ?? "")}
                  onChange={(event) => {
                    const next = [...items];
                    const numeric = typeof value === "number";
                    next[index] = { ...item, [field]: numeric ? Number(event.target.value) : event.target.value };
                    onChange(next);
                  }}
                  className="bg-background border-border"
                />
              </div>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
