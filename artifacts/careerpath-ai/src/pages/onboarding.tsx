import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useUpdateProfile, useCreateWorkExperience, useCreateEducation, useCreateSkill, useSetCareerGoal, getGetProfileQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STEPS = [
  { id: 1, label: "Basics" },
  { id: 2, label: "Experience" },
  { id: 3, label: "Education" },
  { id: 4, label: "Skills" },
  { id: 5, label: "Career Target" },
];

const SKILL_SUGGESTIONS = ["Project Management", "Data Analysis", "Python", "Leadership", "Stakeholder Management", "Agile", "Communication", "Microsoft Azure", "Machine Learning", "SQL"];

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
  const [basics, setBasics] = useState({ currentRole: "", yearsExperience: "", industry: "", careerLevel: "", location: "", professionalSummary: "" });
  const [work, setWork] = useState({ company: "", title: "", startDate: "", description: "" });
  const [edu, setEdu] = useState({ institution: "", degree: "", fieldOfStudy: "", startYear: "", endYear: "" });
  const [skills, setSkills] = useState<string[]>([]);
  const [goal, setGoalState] = useState({ targetRole: "", targetIndustry: "", targetLevel: "", workModePreference: "", targetYears: 24 });

  const handleNext = async () => {
    setLoading(true);
    try {
      if (step === 1) {
        if (!basics.currentRole) { toast({ title: "Current role required", variant: "destructive" }); setLoading(false); return; }
        await updateProfile.mutateAsync({ data: {
          currentRole: basics.currentRole,
          yearsExperience: basics.yearsExperience ? parseInt(basics.yearsExperience) : undefined,
          industry: basics.industry || undefined,
          careerLevel: basics.careerLevel || undefined,
          location: basics.location || undefined,
          professionalSummary: basics.professionalSummary || undefined,
        } });
        qc.invalidateQueries({ queryKey: getGetProfileQueryKey() });
      } else if (step === 2) {
        if (work.company && work.title && work.startDate) {
          await createWork.mutateAsync({ data: { company: work.company, title: work.title, startDate: work.startDate, description: work.description || undefined, isCurrent: true } });
        }
      } else if (step === 3) {
        if (edu.institution && edu.degree && edu.startYear) {
          await createEdu.mutateAsync({ data: { institution: edu.institution, degree: edu.degree, fieldOfStudy: edu.fieldOfStudy || undefined, startYear: parseInt(edu.startYear), endYear: edu.endYear ? parseInt(edu.endYear) : undefined, isCurrent: false } });
        }
      } else if (step === 4) {
        for (const s of skills) {
          await createSkill.mutateAsync({ data: { name: s, category: "Technical", proficiencyLevel: "Intermediate" } });
        }
      } else if (step === 5) {
        if (!goal.targetRole) { toast({ title: "Career target required", variant: "destructive" }); setLoading(false); return; }
        await setGoal.mutateAsync({ data: { targetRole: goal.targetRole, targetIndustry: goal.targetIndustry || undefined, targetLevel: goal.targetLevel || undefined, workModePreference: goal.workModePreference || undefined, targetYears: goal.targetYears } });
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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Progress steps */}
        <div className="w-full max-w-2xl mb-8">
          <div className="flex items-center gap-2 justify-center">
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

        <div className="w-full max-w-2xl">
          {/* Step 1: Basics */}
          {step === 1 && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-2xl">Your Professional Basics</CardTitle>
                <CardDescription>Tell us about your current role and experience level.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Current Job Title <span className="text-primary">*</span></label>
                  <Input placeholder="e.g. Project Manager, Data Analyst, Software Engineer" value={basics.currentRole} onChange={e => setBasics(p => ({ ...p, currentRole: e.target.value }))} className="bg-background border-border" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Years of Experience</label>
                    <Input type="number" placeholder="e.g. 5" value={basics.yearsExperience} onChange={e => setBasics(p => ({ ...p, yearsExperience: e.target.value }))} className="bg-background border-border" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Career Level</label>
                    <select value={basics.careerLevel} onChange={e => setBasics(p => ({ ...p, careerLevel: e.target.value }))} className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm h-10">
                      <option value="">Select...</option>
                      {["Entry-level", "Mid-level", "Senior", "Lead/Principal", "Manager", "Director", "VP", "C-Suite"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Industry</label>
                    <Input placeholder="e.g. Technology, Finance" value={basics.industry} onChange={e => setBasics(p => ({ ...p, industry: e.target.value }))} className="bg-background border-border" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Location</label>
                    <Input placeholder="e.g. London, UK" value={basics.location} onChange={e => setBasics(p => ({ ...p, location: e.target.value }))} className="bg-background border-border" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Professional Summary</label>
                  <Textarea rows={3} placeholder="Brief overview of your background and expertise..." value={basics.professionalSummary} onChange={e => setBasics(p => ({ ...p, professionalSummary: e.target.value }))} className="bg-background border-border resize-none" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Work Experience */}
          {step === 2 && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-2xl">Most Recent Work Experience</CardTitle>
                <CardDescription>Add your current or most recent role. You can add more later in your profile.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Company</label>
                    <Input placeholder="Company name" value={work.company} onChange={e => setWork(p => ({ ...p, company: e.target.value }))} className="bg-background border-border" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Job Title</label>
                    <Input placeholder="Your role" value={work.title} onChange={e => setWork(p => ({ ...p, title: e.target.value }))} className="bg-background border-border" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Start Date</label>
                  <Input type="month" value={work.startDate} onChange={e => setWork(p => ({ ...p, startDate: e.target.value }))} className="bg-background border-border" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Key Responsibilities & Achievements</label>
                  <Textarea rows={4} placeholder="Describe what you did and the impact you made..." value={work.description} onChange={e => setWork(p => ({ ...p, description: e.target.value }))} className="bg-background border-border resize-none" />
                </div>
                <p className="text-sm text-muted-foreground">You can skip this step and add work experience later in your profile.</p>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Education */}
          {step === 3 && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-2xl">Education</CardTitle>
                <CardDescription>Add your highest qualification. You can add more later.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Institution</label>
                  <Input placeholder="University, college, or school name" value={edu.institution} onChange={e => setEdu(p => ({ ...p, institution: e.target.value }))} className="bg-background border-border" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Degree / Qualification</label>
                  <Input placeholder="e.g. BSc Computer Science, MBA, BTEC" value={edu.degree} onChange={e => setEdu(p => ({ ...p, degree: e.target.value }))} className="bg-background border-border" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Field of Study</label>
                  <Input placeholder="e.g. Business Administration" value={edu.fieldOfStudy} onChange={e => setEdu(p => ({ ...p, fieldOfStudy: e.target.value }))} className="bg-background border-border" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Start Year</label>
                    <Input type="number" placeholder="e.g. 2018" value={edu.startYear} onChange={e => setEdu(p => ({ ...p, startYear: e.target.value }))} className="bg-background border-border" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">End Year</label>
                    <Input type="number" placeholder="e.g. 2021" value={edu.endYear} onChange={e => setEdu(p => ({ ...p, endYear: e.target.value }))} className="bg-background border-border" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">You can skip this step and add education later.</p>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Skills */}
          {step === 4 && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-2xl">Your Key Skills</CardTitle>
                <CardDescription>Select or type your main professional skills. You can add more later.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {SKILL_SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])} className={`px-3 py-1.5 rounded-full text-sm border transition-all ${skills.includes(s) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-foreground"}`}>
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
                          <button onClick={() => setSkills(prev => prev.filter(x => x !== s))} className="ml-1 text-muted-foreground hover:text-foreground">×</button>
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
          {step === 5 && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-2xl">Your {goal.targetYears}-Month Career Target</CardTitle>
                <CardDescription>Where do you want to be? This powers your entire roadmap.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Months to achieve this goal</label>
                  <div className="flex flex-wrap gap-2">
                    {[1,3,6,9,12,18,24,36,48,60].map(y => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setGoalState(p => ({ ...p, targetYears: y }))}
                        className={`w-10 h-10 rounded-lg text-sm font-semibold border transition-all ${
                          goal.targetYears === y
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
                  <label className="text-sm font-medium mb-1.5 block">Desired Role in {goal.targetYears} Months <span className="text-primary">*</span></label>
                  <Input placeholder="e.g. Head of AI Engineering, Senior Product Manager, Director of Technology" value={goal.targetRole} onChange={e => setGoalState(p => ({ ...p, targetRole: e.target.value }))} className="bg-background border-border text-base" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Target Industry</label>
                    <Input placeholder="e.g. FinTech, AI, Healthcare" value={goal.targetIndustry} onChange={e => setGoalState(p => ({ ...p, targetIndustry: e.target.value }))} className="bg-background border-border" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Target Level</label>
                    <select value={goal.targetLevel} onChange={e => setGoalState(p => ({ ...p, targetLevel: e.target.value }))} className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm h-10">
                      <option value="">Select...</option>
                      {["Senior", "Lead/Principal", "Manager", "Senior Manager", "Director", "VP", "C-Suite"].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Work Mode Preference</label>
                  <select value={goal.workModePreference} onChange={e => setGoalState(p => ({ ...p, workModePreference: e.target.value }))} className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm h-10">
                    <option value="">Select...</option>
                    {["Remote", "Hybrid", "On-site", "No preference"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between mt-6">
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
    </div>
  );
}
