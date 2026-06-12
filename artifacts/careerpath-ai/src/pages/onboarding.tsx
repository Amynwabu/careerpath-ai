import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useUpdateProfile, useCreateWorkExperience, useCreateEducation, useCreateSkill, useSetCareerGoal, getGetProfileQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  careerLevels,
  commonSkills,
  educationDegrees,
  fieldsOfStudy,
  industries,
  jobTitles,
  workModes,
} from "@workspace/taxonomy";

const STEPS = [
  { id: 1, label: "Role" },
  { id: 2, label: "Experience" },
  { id: 3, label: "Education" },
  { id: 4, label: "Skills" },
  { id: 5, label: "Target" },
  { id: 6, label: "Launch" },
];

const toOptions = (items: readonly { code: string; label: string; group?: string }[]) =>
  items.map((item) => ({ value: item.code, label: item.label, group: item.group }));

const taxonomyOptions = {
  careerLevels: toOptions(careerLevels),
  degrees: toOptions(educationDegrees),
  fieldsOfStudy: toOptions(fieldsOfStudy),
  industries: toOptions(industries),
  jobTitles: toOptions(jobTitles),
  skills: toOptions(commonSkills),
  workModes: toOptions(workModes),
};

const SKILL_SUGGESTIONS = commonSkills.slice(0, 8).map((skill) => skill.label);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);
const EXPERIENCE_YEARS = Array.from({ length: 51 }, (_, index) => index);
const EXPERIENCE_MONTHS = Array.from({ length: 12 }, (_, index) => index);

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const updateProfile = useUpdateProfile();
  const createWork = useCreateWorkExperience();
  const createEdu = useCreateEducation();
  const createSkill = useCreateSkill();
  const setGoal = useSetCareerGoal();

  // Form state per step
  const [basics, setBasics] = useState({ currentRole: "", experienceYears: 0, experienceMonths: 0, industry: "", careerLevel: "", location: "", professionalSummary: "" });
  const [work, setWork] = useState({ company: "", title: "", startDate: "", description: "" });
  const [edu, setEdu] = useState({ institution: "", degree: "", fieldOfStudy: "", startDate: "", endDate: "" });
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState("");
  const [goal, setGoalState] = useState({ targetRole: "", targetIndustry: "", targetLevel: "", workModePreference: "", targetMonths: 12 });

  const saveSection = async (currentStep: number, silent = false) => {
    if (currentStep === 1) {
      if (!basics.currentRole) {
        if (!silent) toast({ title: "Current role required", variant: "destructive" });
        return false;
      }
      await updateProfile.mutateAsync({ data: {
        currentRole: basics.currentRole,
        totalExperienceMonths: basics.experienceYears * 12 + basics.experienceMonths,
        industry: basics.industry || undefined,
        careerLevel: basics.careerLevel || undefined,
        location: basics.location || undefined,
        professionalSummary: basics.professionalSummary || undefined,
      } });
      qc.invalidateQueries({ queryKey: getGetProfileQueryKey() });
    } else if (currentStep === 2) {
      if (work.company && work.title && work.startDate) {
        await createWork.mutateAsync({ data: { company: work.company, title: work.title, startDate: work.startDate, description: work.description || undefined, isCurrent: true } });
      }
    } else if (currentStep === 3) {
      if (edu.institution && edu.degree && edu.startDate) {
        await createEdu.mutateAsync({ data: { institution: edu.institution, degree: edu.degree, fieldOfStudy: edu.fieldOfStudy || undefined, startDate: edu.startDate, endDate: edu.endDate || undefined, isCurrent: false } });
      }
    } else if (currentStep === 4) {
      for (const s of skills) {
        await createSkill.mutateAsync({ data: { name: s, category: "Technical", proficiencyLevel: "Intermediate" } });
      }
    } else if (currentStep === 5) {
      if (!goal.targetRole) {
        if (!silent) toast({ title: "Career target required", variant: "destructive" });
        return false;
      }
      await setGoal.mutateAsync({ data: { targetRole: goal.targetRole, targetIndustry: goal.targetIndustry || undefined, targetLevel: goal.targetLevel || undefined, workModePreference: goal.workModePreference || undefined, targetMonths: goal.targetMonths } });
    }
    return true;
  };

  const autosave = async (currentStep: number) => {
    try {
      await saveSection(currentStep, true);
    } catch {
      // Autosave is intentionally quiet; explicit navigation still surfaces errors.
    }
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      const saved = await saveSection(step);
      if (!saved) { setLoading(false); return; }
      if (step >= 5) {
        setLocation("/dashboard");
        return;
      }
      setStep(s => s + 1);
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b border-white/35 bg-background/85 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-primary">Setup {Math.round((Math.min(step, 6) / 6) * 100)}% complete</p>
            <button className="text-sm text-muted-foreground hover:text-primary" onClick={() => setLocation("/dashboard")}>Skip for now</button>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${(Math.min(step, 6) / 6) * 100}%` }} />
          </div>
          <div className="mt-4 flex items-center gap-2 overflow-x-auto">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  step === s.id ? "bg-primary text-primary-foreground" :
                  step > s.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : <span>{s.id}</span>}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {idx < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:gap-8 sm:p-8">
          {/* Step 1: Basics */}
          {step >= 1 && (
            <Card className={`blue-card transition-all ${step === 1 ? "ring-1 ring-primary/40" : "opacity-80"}`}>
              <CardHeader>
                <CardTitle className="text-2xl">Your Professional Basics</CardTitle>
                <CardDescription>Your current starting point.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Current Job Title <span className="text-primary">*</span></label>
                  <Combobox placeholder="Search or type your role" value={basics.currentRole} options={taxonomyOptions.jobTitles} onChange={value => setBasics(p => ({ ...p, currentRole: value }))} />
                  <p className="mt-2 text-sm text-muted-foreground">Used to calibrate your roadmap.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Years of Experience</label>
                    <div className="grid grid-cols-2 gap-2">
                      <select value={basics.experienceYears} onChange={e => setBasics(p => ({ ...p, experienceYears: Number(e.target.value) }))} className="bg-background border border-border rounded-md px-3 py-2 text-sm h-10">
                        {EXPERIENCE_YEARS.map(year => <option key={year} value={year}>{year} year{year === 1 ? "" : "s"}</option>)}
                      </select>
                      <select value={basics.experienceMonths} onChange={e => setBasics(p => ({ ...p, experienceMonths: Number(e.target.value) }))} className="bg-background border border-border rounded-md px-3 py-2 text-sm h-10">
                        {EXPERIENCE_MONTHS.map(month => <option key={month} value={month}>{month} month{month === 1 ? "" : "s"}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Career Level</label>
                    <Combobox placeholder="Select or type your level" value={basics.careerLevel} options={taxonomyOptions.careerLevels} onChange={value => setBasics(p => ({ ...p, careerLevel: value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Industry</label>
                    <Combobox placeholder="Search or type your industry" value={basics.industry} options={taxonomyOptions.industries} onChange={value => setBasics(p => ({ ...p, industry: value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Location</label>
                    <Input placeholder="e.g. London, UK" value={basics.location} onBlur={() => autosave(1)} onChange={e => setBasics(p => ({ ...p, location: e.target.value }))} className="bg-background border-border" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Professional Summary</label>
                  <Textarea rows={2} placeholder="Brief background summary..." value={basics.professionalSummary} onBlur={() => autosave(1)} onChange={e => setBasics(p => ({ ...p, professionalSummary: e.target.value }))} className="bg-background border-border resize-none" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Work Experience */}
          {step >= 2 && (
            <Card className={`blue-card transition-all ${step === 2 ? "ring-1 ring-primary/40" : "opacity-80"}`}>
              <CardHeader>
                <CardTitle className="text-2xl">Most Recent Work Experience</CardTitle>
                <CardDescription>Add one recent role. More can come later.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Company</label>
                    <Input placeholder="Company name" value={work.company} onBlur={() => autosave(2)} onChange={e => setWork(p => ({ ...p, company: e.target.value }))} className="bg-background border-border" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Job Title</label>
                    <Combobox placeholder="Search or type your role" value={work.title} options={taxonomyOptions.jobTitles} onChange={value => setWork(p => ({ ...p, title: value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Start Date</label>
                  <DatePicker value={work.startDate} onChange={value => setWork(p => ({ ...p, startDate: value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Key Responsibilities & Achievements</label>
                  <Textarea rows={2} placeholder="Key responsibility or achievement..." value={work.description} onBlur={() => autosave(2)} onChange={e => setWork(p => ({ ...p, description: e.target.value }))} className="bg-background border-border resize-none" />
                </div>
                <p className="text-sm text-muted-foreground">You can skip this step and add work experience later in your profile.</p>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Education */}
          {step >= 3 && (
            <Card className={`blue-card transition-all ${step === 3 ? "ring-1 ring-primary/40" : "opacity-80"}`}>
              <CardHeader>
                <CardTitle className="text-2xl">Education</CardTitle>
                <CardDescription>Your highest or most relevant qualification.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Institution</label>
                  <Input placeholder="University, college, or school name" value={edu.institution} onBlur={() => autosave(3)} onChange={e => setEdu(p => ({ ...p, institution: e.target.value }))} className="bg-background border-border" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Degree / Qualification</label>
                  <Combobox placeholder="Degree or qualification" value={edu.degree} options={taxonomyOptions.degrees} onChange={value => setEdu(p => ({ ...p, degree: value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Field of Study</label>
                  <Combobox placeholder="Field of study" value={edu.fieldOfStudy} options={taxonomyOptions.fieldsOfStudy} onChange={value => setEdu(p => ({ ...p, fieldOfStudy: value }))} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Start Month</label>
                    <MonthYearPicker placeholder="Start month" value={edu.startDate} onChange={value => setEdu(p => ({ ...p, startDate: value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">End Month</label>
                    <MonthYearPicker placeholder="End month" value={edu.endDate} onChange={value => setEdu(p => ({ ...p, endDate: value }))} />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">You can skip this step and add education later.</p>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Skills */}
          {step >= 4 && (
            <Card className={`blue-card transition-all ${step === 4 ? "ring-1 ring-primary/40" : "opacity-80"}`}>
              <CardHeader>
                <CardTitle className="text-2xl">Your Key Skills</CardTitle>
                <CardDescription>Add only your strongest skills for now.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Add a skill</label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Combobox
                      placeholder="Search or type a skill"
                      value={skillDraft}
                      options={taxonomyOptions.skills}
                      onChange={setSkillDraft}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        const next = skillDraft.trim();
                        if (next && !skills.includes(next)) setSkills(prev => [...prev, next]);
                        setSkillDraft("");
                      }}
                    >
                      Add Skill
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SKILL_SUGGESTIONS.map(s => (
                    <button key={s} type="button" onClick={() => setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])} className={`px-3 py-1.5 rounded-full text-sm border transition-all ${skills.includes(s) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-foreground"}`}>
                      {s}
                    </button>
                  ))}
                </div>
                {skills.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Selected skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {skills.map(s => (
                        <Badge key={s} variant="secondary" className="gap-1">
                          {s}
                          <button type="button" aria-label={`Remove ${s}`} onClick={() => setSkills(prev => prev.filter(x => x !== s))} className="ml-1 text-muted-foreground hover:text-foreground">×</button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">You can skip this and add skills in your profile.</p>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Career Goal */}
          {step >= 5 && (
            <Card className={`blue-card-strong transition-all ${step === 5 ? "ring-1 ring-primary/40" : "opacity-80"}`}>
              <CardHeader>
                <CardTitle className="text-2xl">Your {goal.targetMonths}-Month Career Target</CardTitle>
                <CardDescription>The role your roadmap should target.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Months to achieve this goal</label>
                  <select
                    value={goal.targetMonths}
                    onChange={event => setGoalState(p => ({ ...p, targetMonths: Number(event.target.value) }))}
                    className="w-full bg-background border border-border rounded-md px-4 py-3 text-base font-semibold"
                  >
                    {MONTH_OPTIONS.map(months => (
                      <option key={months} value={months}>{months} month{months !== 1 ? "s" : ""}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Desired Role in {goal.targetMonths} Months <span className="text-primary">*</span></label>
                  <Combobox placeholder="Search or type your target role" value={goal.targetRole} options={taxonomyOptions.jobTitles} onChange={value => setGoalState(p => ({ ...p, targetRole: value }))} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Target Industry</label>
                    <Combobox placeholder="Search or type target industry" value={goal.targetIndustry} options={taxonomyOptions.industries} onChange={value => setGoalState(p => ({ ...p, targetIndustry: value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Target Level</label>
                    <Combobox placeholder="Select or type target level" value={goal.targetLevel} options={taxonomyOptions.careerLevels} onChange={value => setGoalState(p => ({ ...p, targetLevel: value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Work Mode Preference</label>
                  <Combobox placeholder="Select or type work mode" value={goal.workModePreference} options={taxonomyOptions.workModes} onChange={value => setGoalState(p => ({ ...p, workModePreference: value }))} />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between pb-16">
            <Button variant="ghost" onClick={() => step > 1 ? setStep(s => s - 1) : setLocation("/dashboard")} className="text-muted-foreground">
              {step > 1 ? "Back" : "Skip to Dashboard"}
            </Button>
            <Button onClick={handleNext} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90 px-8">
              {loading ? "Saving..." : step === 5 ? (
                <><ArrowRight className="w-4 h-4 mr-2" /> Complete Setup</>
              ) : (
                <>Next <ChevronRight className="w-4 h-4 ml-1" /></>
              )}
            </Button>
          </div>
      </div>
    </div>
  );
}
