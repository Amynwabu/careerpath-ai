import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  useGetProfile, useUpdateProfile, getGetProfileQueryKey,
  useListWorkExperiences, useCreateWorkExperience, useUpdateWorkExperience, useDeleteWorkExperience, getListWorkExperiencesQueryKey,
  useListEducation, useCreateEducation, useUpdateEducation, useDeleteEducation, getListEducationQueryKey,
  useListSkills, useCreateSkill, useDeleteSkill, getListSkillsQueryKey,
  useListCertifications, useCreateCertification, useDeleteCertification, getListCertificationsQueryKey,
  type WorkExperience,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Save, User, Briefcase, GraduationCap, Star, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  careerLevels,
  commonCertifications,
  commonSkills,
  educationDegrees,
  fieldsOfStudy,
  industries,
  jobTitles,
  learningStyles,
  proficiencyLevels,
  skillCategories,
} from "@workspace/taxonomy";

const toOptions = (items: readonly { code: string; label: string; group?: string }[]) =>
  items.map((item) => ({ value: item.code, label: item.label, group: item.group }));

const taxonomyOptions = {
  careerLevels: toOptions(careerLevels),
  certifications: toOptions(commonCertifications),
  degrees: toOptions(educationDegrees),
  fieldsOfStudy: toOptions(fieldsOfStudy),
  industries: toOptions(industries),
  jobTitles: toOptions(jobTitles),
  learningStyles: toOptions(learningStyles),
  proficiencyLevels: toOptions(proficiencyLevels),
  skillCategories: toOptions(skillCategories),
  skills: toOptions(commonSkills),
};

const EXPERIENCE_YEARS = Array.from({ length: 51 }, (_, index) => index);
const EXPERIENCE_MONTHS = Array.from({ length: 12 }, (_, index) => index);
const LEARNING_HOURS = Array.from({ length: 41 }, (_, index) => index);
const LEARNING_MINUTES = [0, 15, 30, 45];

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatDate = (value?: string | null) => value ? value.slice(0, 10) : "";
const requiredMessage = "This field is required.";
const clean = (value: string) => value.trim() || undefined;
const scrollToFirstFormError = () => {
  requestAnimationFrame(() => {
    document.querySelector(".text-destructive")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
};

type FieldErrors = Record<string, string>;

function CompletionRing({ value }: { value: number }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference;
  return (
    <div className="flex items-center gap-4 rounded-2xl blue-card-strong px-4 py-3">
      <div className="relative h-20 w-20">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-mono text-lg font-bold text-primary">{value}%</div>
      </div>
      <div>
        <p className="font-semibold">Profile {value}% complete</p>
        <p className="text-sm text-muted-foreground">Add evidence to improve analysis.</p>
      </div>
    </div>
  );
}

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return "Please check the fields and try again.";
}

export default function Profile() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: profile, isLoading: loadingProfile } = useGetProfile();
  const { data: workExps, isLoading: loadingWork } = useListWorkExperiences();
  const { data: education, isLoading: loadingEdu } = useListEducation();
  const { data: skills, isLoading: loadingSkills } = useListSkills();
  const { data: certs, isLoading: loadingCerts } = useListCertifications();

  const updateProfile = useUpdateProfile();
  const createWorkExp = useCreateWorkExperience();
  const updateWorkExp = useUpdateWorkExperience();
  const deleteWorkExp = useDeleteWorkExperience();
  const createEdu = useCreateEducation();
  const deleteEdu = useDeleteEducation();
  const createSkill = useCreateSkill();
  const deleteSkill = useDeleteSkill();
  const createCert = useCreateCertification();
  const deleteCert = useDeleteCertification();

  // Profile form state
  const [profileForm, setProfileForm] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);

  // New item forms
  const [newWork, setNewWork] = useState({ company: "", title: "", startDate: "", endDate: "", isCurrent: false, description: "", skills: "" });
  const [newEdu, setNewEdu] = useState({ institution: "", degree: "", fieldOfStudy: "", startDate: "", endDate: "", isCurrent: false });
  const [newSkill, setNewSkill] = useState({ name: "", category: "Technical", proficiencyLevel: "Intermediate" });
  const [newCert, setNewCert] = useState({ name: "", issuingOrganization: "", issueDate: "", expiryDate: "" });
  const [workErrors, setWorkErrors] = useState<FieldErrors>({});
  const [educationErrors, setEducationErrors] = useState<FieldErrors>({});
  const [skillErrors, setSkillErrors] = useState<FieldErrors>({});
  const [certErrors, setCertErrors] = useState<FieldErrors>({});
  const [editingWorkId, setEditingWorkId] = useState<number | null>(null);
  const [workDraft, setWorkDraft] = useState({ company: "", title: "", startDate: "", endDate: "", description: "", skills: "" });
  const [workEditErrors, setWorkEditErrors] = useState<FieldErrors>({});

  const pf = (field: string) => profileForm[field] ?? (profile as any)?.[field] ?? "";
  const totalExperienceMonths = toNumber(pf("totalExperienceMonths"));
  const weeklyLearningMinutes = toNumber(pf("weeklyLearningMinutes"));
  const setTotalExperienceMonths = (years: number, months: number) =>
    setProfileForm(prev => ({ ...prev, totalExperienceMonths: String(years * 12 + months) }));
  const setWeeklyLearningMinutes = (hours: number, minutes: number) =>
    setProfileForm(prev => ({ ...prev, weeklyLearningMinutes: String(hours * 60 + minutes) }));

  const completionItems = [
    Boolean((profile as any)?.currentRole),
    Boolean((profile as any)?.industry),
    Boolean((profile as any)?.careerLevel),
    Boolean((profile as any)?.location),
    Boolean((profile as any)?.professionalSummary),
    toNumber((profile as any)?.totalExperienceMonths) > 0,
    toNumber((profile as any)?.weeklyLearningMinutes) > 0,
    Boolean(workExps?.length),
    Boolean(education?.length),
    Boolean(skills?.length),
    Boolean(certs?.length),
  ];
  const completionPercent = loadingProfile ? 0 : Math.round((completionItems.filter(Boolean).length / completionItems.length) * 100);
  const personalCount = ["location", "phone", "linkedinUrl"].filter((key) => Boolean((profile as any)?.[key])).length;

  const beginWorkEdit = (exp: WorkExperience) => {
    setEditingWorkId(exp.id);
    setWorkEditErrors({});
    setWorkDraft({
      company: exp.company ?? "",
      title: exp.title ?? "",
      startDate: formatDate(exp.startDate),
      endDate: formatDate(exp.endDate),
      description: exp.description ?? "",
      skills: exp.skills ?? "",
    });
  };

  const saveInlineWork = async (id: number) => {
    if (editingWorkId !== id) return;
    const errors: FieldErrors = {};
    if (!clean(workDraft.company)) errors.company = requiredMessage;
    if (!clean(workDraft.title)) errors.title = requiredMessage;
    if (!workDraft.startDate) errors.startDate = requiredMessage;
    setWorkEditErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      await updateWorkExp.mutateAsync({
        id,
        data: {
          company: clean(workDraft.company)!,
          title: clean(workDraft.title)!,
          startDate: workDraft.startDate,
          endDate: workDraft.endDate || undefined,
          isCurrent: !workDraft.endDate,
          description: clean(workDraft.description),
          skills: clean(workDraft.skills),
        },
      });
      await qc.invalidateQueries({ queryKey: getListWorkExperiencesQueryKey() });
      setEditingWorkId(null);
      setWorkEditErrors({});
      toast({ title: "Work experience saved" });
    } catch (error) {
      toast({ title: "Could not save work experience", description: errorMessage(error), variant: "destructive" });
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const data: any = {};
    if (profileForm.currentRole !== undefined) data.currentRole = profileForm.currentRole;
    if (profileForm.totalExperienceMonths !== undefined) data.totalExperienceMonths = parseInt(profileForm.totalExperienceMonths);
    if (profileForm.industry !== undefined) data.industry = profileForm.industry;
    if (profileForm.location !== undefined) data.location = profileForm.location;
    if (profileForm.phone !== undefined) data.phone = profileForm.phone;
    if (profileForm.linkedinUrl !== undefined) data.linkedinUrl = profileForm.linkedinUrl;
    if (profileForm.professionalSummary !== undefined) data.professionalSummary = profileForm.professionalSummary;
    if (profileForm.preferredLearningStyle !== undefined) data.preferredLearningStyle = profileForm.preferredLearningStyle;
    if (profileForm.weeklyLearningMinutes !== undefined) data.weeklyLearningMinutes = parseInt(profileForm.weeklyLearningMinutes);
    if (profileForm.salaryAspiration !== undefined) data.salaryAspiration = profileForm.salaryAspiration;
    if (profileForm.careerLevel !== undefined) data.careerLevel = profileForm.careerLevel;
    if (Object.keys(data).length === 0) {
      toast({ title: "Nothing to save", description: "Make a change first, then save your profile." });
      setSavingProfile(false);
      return;
    }
    try {
      await updateProfile.mutateAsync({ data });
      qc.invalidateQueries({ queryKey: getGetProfileQueryKey() });
      toast({ title: "Profile saved", description: "Your changes have been saved." });
      setProfileForm({});
      setLocation("/career-goal");
    } catch {
      toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" });
    }
    setSavingProfile(false);
  };

  const addWorkExperience = async () => {
    const errors: FieldErrors = {};
    if (!clean(newWork.company)) errors.company = requiredMessage;
    if (!clean(newWork.title)) errors.title = requiredMessage;
    if (!newWork.startDate) errors.startDate = requiredMessage;
    setWorkErrors(errors);
    if (Object.keys(errors).length > 0) {
      scrollToFirstFormError();
      toast({ title: "Please fill required fields", description: "Company, job title, and start date are required.", variant: "destructive" });
      return;
    }

    try {
      await createWorkExp.mutateAsync({
        data: {
          company: clean(newWork.company)!,
          title: clean(newWork.title)!,
          startDate: newWork.startDate,
          endDate: newWork.endDate || undefined,
          isCurrent: !newWork.endDate,
          description: clean(newWork.description),
          skills: clean(newWork.skills),
        },
      });
      qc.invalidateQueries({ queryKey: getListWorkExperiencesQueryKey() });
      setNewWork({ company: "", title: "", startDate: "", endDate: "", isCurrent: false, description: "", skills: "" });
      toast({ title: "Work experience added" });
    } catch (error) {
      toast({ title: "Could not add work experience", description: errorMessage(error), variant: "destructive" });
    }
  };

  const addEducation = async () => {
    const errors: FieldErrors = {};
    if (!clean(newEdu.institution)) errors.institution = requiredMessage;
    if (!clean(newEdu.degree)) errors.degree = requiredMessage;
    if (!newEdu.startDate) errors.startDate = requiredMessage;
    setEducationErrors(errors);
    if (Object.keys(errors).length > 0) {
      scrollToFirstFormError();
      toast({ title: "Please fill required fields", description: "Institution, degree, and start month are required.", variant: "destructive" });
      return;
    }

    try {
      await createEdu.mutateAsync({
        data: {
          institution: clean(newEdu.institution)!,
          degree: clean(newEdu.degree)!,
          fieldOfStudy: clean(newEdu.fieldOfStudy),
          startDate: newEdu.startDate,
          endDate: newEdu.endDate || undefined,
          isCurrent: false,
        },
      });
      qc.invalidateQueries({ queryKey: getListEducationQueryKey() });
      setNewEdu({ institution: "", degree: "", fieldOfStudy: "", startDate: "", endDate: "", isCurrent: false });
      toast({ title: "Education added" });
    } catch (error) {
      toast({ title: "Could not add education", description: errorMessage(error), variant: "destructive" });
    }
  };

  const addSkill = async () => {
    const errors: FieldErrors = {};
    if (!clean(newSkill.name)) errors.name = requiredMessage;
    if (!clean(newSkill.category)) errors.category = requiredMessage;
    if (!clean(newSkill.proficiencyLevel)) errors.proficiencyLevel = requiredMessage;
    setSkillErrors(errors);
    if (Object.keys(errors).length > 0) {
      scrollToFirstFormError();
      toast({ title: "Please fill required fields", description: "Skill name, category, and proficiency are required.", variant: "destructive" });
      return;
    }

    try {
      await createSkill.mutateAsync({
        data: {
          name: clean(newSkill.name)!,
          category: clean(newSkill.category)!,
          proficiencyLevel: clean(newSkill.proficiencyLevel)!,
        },
      });
      qc.invalidateQueries({ queryKey: getListSkillsQueryKey() });
      setNewSkill({ name: "", category: "Technical", proficiencyLevel: "Intermediate" });
      toast({ title: "Skill added" });
    } catch (error) {
      toast({ title: "Could not add skill", description: errorMessage(error), variant: "destructive" });
    }
  };

  const addCertification = async () => {
    const errors: FieldErrors = {};
    if (!clean(newCert.name)) errors.name = requiredMessage;
    if (!clean(newCert.issuingOrganization)) errors.issuingOrganization = requiredMessage;
    setCertErrors(errors);
    if (Object.keys(errors).length > 0) {
      scrollToFirstFormError();
      toast({ title: "Please fill required fields", description: "Certification name and issuing organization are required.", variant: "destructive" });
      return;
    }

    try {
      await createCert.mutateAsync({
        data: {
          name: clean(newCert.name)!,
          issuingOrganization: clean(newCert.issuingOrganization)!,
          issueDate: newCert.issueDate || undefined,
          expiryDate: newCert.expiryDate || undefined,
        },
      });
      qc.invalidateQueries({ queryKey: getListCertificationsQueryKey() });
      setNewCert({ name: "", issuingOrganization: "", issueDate: "", expiryDate: "" });
      toast({ title: "Certification added" });
    } catch (error) {
      toast({ title: "Could not add certification", description: errorMessage(error), variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow mb-2">Profile Completeness</p>
            <h1 className="text-3xl font-bold tracking-tight">Professional Profile</h1>
            <p className="text-muted-foreground mt-1">Keep the key details your analysis needs.</p>
          </div>
          <CompletionRing value={completionPercent} />
        </div>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="blue-card h-auto flex-wrap justify-start gap-2 p-2">
            <TabsTrigger value="personal"><User className="w-4 h-4 mr-2" />Profile <Badge variant="secondary" className="ml-2">{personalCount}/3</Badge></TabsTrigger>
            <TabsTrigger value="work"><Briefcase className="w-4 h-4 mr-2" />Work <Badge variant="secondary" className="ml-2">{workExps?.length ?? 0}</Badge></TabsTrigger>
            <TabsTrigger value="education"><GraduationCap className="w-4 h-4 mr-2" />Education <Badge variant="secondary" className="ml-2">{education?.length ?? 0}</Badge></TabsTrigger>
            <TabsTrigger value="skills"><Star className="w-4 h-4 mr-2" />Skills/Certs <Badge variant="secondary" className="ml-2">{(skills?.length ?? 0) + (certs?.length ?? 0)}</Badge></TabsTrigger>
          </TabsList>

          {/* Personal Tab */}
          <TabsContent value="personal" className="space-y-4">
            {!loadingProfile && (
              <Card className="blue-card">
                <CardHeader>
                  <p className="eyebrow">Identity Layer</p>
                  <CardTitle>Personal Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: "Location", key: "location", placeholder: "e.g. London, UK" },
                      { label: "Phone", key: "phone", placeholder: "Optional" },
                      { label: "LinkedIn URL", key: "linkedinUrl", placeholder: "https://linkedin.com/in/..." },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key}>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">{label}</label>
                        <Input
                          placeholder={placeholder}
                          value={pf(key)}
                          onChange={e => setProfileForm(prev => ({ ...prev, [key]: e.target.value }))}
                          className="bg-background border-border"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="blue-card">
              <CardHeader>
                <p className="eyebrow">Career Signal</p>
                <CardTitle>Professional Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingProfile ? <Skeleton className="h-40 w-full" /> : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: "Current Role", key: "currentRole", placeholder: "Search or type your role", options: taxonomyOptions.jobTitles },
                        { label: "Industry", key: "industry", placeholder: "Search or type your industry", options: taxonomyOptions.industries },
                        { label: "Career Level", key: "careerLevel", placeholder: "Select or type your level", options: taxonomyOptions.careerLevels },
                        { label: "Preferred Learning Style", key: "preferredLearningStyle", placeholder: "Select or type your learning style", options: taxonomyOptions.learningStyles },
                        { label: "Salary Aspiration", key: "salaryAspiration", placeholder: "e.g. £80,000–£100,000" },
                      ].map(({ label, key, placeholder, options }) => (
                        <div key={key}>
                          <label className="text-sm font-medium text-muted-foreground mb-1 block">{label}</label>
                          {options ? (
                            <Combobox
                              placeholder={placeholder}
                              value={pf(key)}
                              options={options}
                              onChange={value => setProfileForm(prev => ({ ...prev, [key]: value }))}
                            />
                          ) : (
                            <Input
                              placeholder={placeholder}
                              value={pf(key)}
                              onChange={e => setProfileForm(prev => ({ ...prev, [key]: e.target.value }))}
                              className="bg-background border-border"
                            />
                          )}
                        </div>
                      ))}
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">Experience</label>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={Math.floor(totalExperienceMonths / 12)}
                            onChange={e => setTotalExperienceMonths(Number(e.target.value), totalExperienceMonths % 12)}
                            className="bg-background border border-border rounded-md px-3 py-2 text-sm"
                          >
                            {EXPERIENCE_YEARS.map(year => <option key={year} value={year}>{year} year{year === 1 ? "" : "s"}</option>)}
                          </select>
                          <select
                            value={totalExperienceMonths % 12}
                            onChange={e => setTotalExperienceMonths(Math.floor(totalExperienceMonths / 12), Number(e.target.value))}
                            className="bg-background border border-border rounded-md px-3 py-2 text-sm"
                          >
                            {EXPERIENCE_MONTHS.map(month => <option key={month} value={month}>{month} month{month === 1 ? "" : "s"}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">Weekly Learning Time</label>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={Math.floor(weeklyLearningMinutes / 60)}
                            onChange={e => setWeeklyLearningMinutes(Number(e.target.value), weeklyLearningMinutes % 60)}
                            className="bg-background border border-border rounded-md px-3 py-2 text-sm"
                          >
                            {LEARNING_HOURS.map(hour => <option key={hour} value={hour}>{hour} hr{hour === 1 ? "" : "s"}</option>)}
                          </select>
                          <select
                            value={weeklyLearningMinutes % 60}
                            onChange={e => setWeeklyLearningMinutes(Math.floor(weeklyLearningMinutes / 60), Number(e.target.value))}
                            className="bg-background border border-border rounded-md px-3 py-2 text-sm"
                          >
                            {LEARNING_MINUTES.map(minute => <option key={minute} value={minute}>{minute} min</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-1 block">Professional Summary</label>
                      <Textarea
                        rows={4}
                        placeholder="Write a brief overview of your professional background, expertise, and career direction..."
                        value={pf("professionalSummary")}
                        onChange={e => setProfileForm(prev => ({ ...prev, professionalSummary: e.target.value }))}
                        className="bg-background border-border resize-none"
                      />
                    </div>
                    <Button onClick={handleSaveProfile} disabled={savingProfile} className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <Save className="w-4 h-4 mr-2" />{savingProfile ? "Saving..." : "Save Profile"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Work Experience Tab */}
          <TabsContent value="work" className="space-y-4">
            <Card className="blue-card">
              <CardHeader>
                <p className="eyebrow">Experience Evidence</p>
                <CardTitle>Add Work Experience</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Input placeholder="Company" value={newWork.company} onChange={e => setNewWork(p => ({ ...p, company: e.target.value }))} className={`bg-background ${workErrors.company ? "border-destructive" : "border-border"}`} />
                    {workErrors.company && <p className="mt-1 text-xs text-destructive">{workErrors.company}</p>}
                  </div>
                  <div>
                    <Combobox placeholder="Job title" value={newWork.title} options={taxonomyOptions.jobTitles} onChange={value => setNewWork(p => ({ ...p, title: value }))} />
                    {workErrors.title && <p className="mt-1 text-xs text-destructive">{workErrors.title}</p>}
                  </div>
                  <div>
                    <DatePicker placeholder="Start date" value={newWork.startDate} onChange={value => setNewWork(p => ({ ...p, startDate: value }))} className={workErrors.startDate ? "border-destructive" : undefined} />
                    {workErrors.startDate && <p className="mt-1 text-xs text-destructive">{workErrors.startDate}</p>}
                  </div>
                  <DatePicker placeholder="End date (leave blank if current)" value={newWork.endDate} onChange={value => setNewWork(p => ({ ...p, endDate: value }))} />
                </div>
                <Textarea rows={3} placeholder="Role description and key achievements..." value={newWork.description} onChange={e => setNewWork(p => ({ ...p, description: e.target.value }))} className="bg-background border-border resize-none" />
                <Button onClick={addWorkExperience} className="bg-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" /> Add Entry
                </Button>
              </CardContent>
            </Card>
            {loadingWork ? <Skeleton className="h-24 w-full" /> : workExps?.map(exp => (
              <Card key={exp.id} className="blue-card group">
                <CardContent
                  className="pt-4"
                  onBlur={(event) => {
                    if (editingWorkId === exp.id && !event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      void saveInlineWork(exp.id);
                    }
                  }}
                >
                  {editingWorkId === exp.id ? (
                    <div className="grid gap-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <Input
                            autoFocus
                            value={workDraft.title}
                            onChange={(event) => setWorkDraft((prev) => ({ ...prev, title: event.target.value }))}
                            onKeyDown={(event) => { if (event.key === "Enter") void saveInlineWork(exp.id); }}
                            className={`bg-background ${workEditErrors.title ? "border-destructive" : "border-border"}`}
                          />
                          {workEditErrors.title && <p className="mt-1 text-xs text-destructive">{workEditErrors.title}</p>}
                        </div>
                        <div>
                          <Input
                            value={workDraft.company}
                            onChange={(event) => setWorkDraft((prev) => ({ ...prev, company: event.target.value }))}
                            onKeyDown={(event) => { if (event.key === "Enter") void saveInlineWork(exp.id); }}
                            className={`bg-background ${workEditErrors.company ? "border-destructive" : "border-border"}`}
                          />
                          {workEditErrors.company && <p className="mt-1 text-xs text-destructive">{workEditErrors.company}</p>}
                        </div>
                        <div>
                          <DatePicker placeholder="Start date" value={workDraft.startDate} onChange={(value) => setWorkDraft((prev) => ({ ...prev, startDate: value }))} className={workEditErrors.startDate ? "border-destructive" : undefined} />
                          {workEditErrors.startDate && <p className="mt-1 text-xs text-destructive">{workEditErrors.startDate}</p>}
                        </div>
                        <DatePicker placeholder="End date" value={workDraft.endDate} onChange={(value) => setWorkDraft((prev) => ({ ...prev, endDate: value }))} />
                      </div>
                      <Textarea
                        rows={2}
                        value={workDraft.description}
                        onChange={(event) => setWorkDraft((prev) => ({ ...prev, description: event.target.value }))}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void saveInlineWork(exp.id);
                          if (event.key === "Escape") setEditingWorkId(null);
                        }}
                        className="bg-background border-border resize-none"
                      />
                      <p className="text-xs text-muted-foreground">Blur saves. Esc cancels.</p>
                    </div>
                  ) : (
                  <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{exp.title}</p>
                    <p className="text-sm text-muted-foreground">{exp.company} · {formatDate(exp.startDate)} – {exp.isCurrent ? "Present" : formatDate(exp.endDate)}</p>
                    {exp.description && <p className="text-sm mt-2">{exp.description}</p>}
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <Button variant="ghost" size="sm" onClick={() => beginWorkEdit(exp)} aria-label="Edit work experience">
                    <Pencil className="inline-edit-icon w-4 h-4 text-primary" />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label="Delete work experience" onClick={async () => {
                    await deleteWorkExp.mutateAsync({ id: exp.id });
                    qc.invalidateQueries({ queryKey: getListWorkExperiencesQueryKey() });
                    toast({ title: "Entry removed" });
                  }}><Trash2 className="inline-edit-icon w-4 h-4 text-destructive" /></Button>
                  </div>
                  </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Education Tab */}
          <TabsContent value="education" className="space-y-4">
            <Card className="blue-card">
              <CardHeader>
                <p className="eyebrow">Credential Signal</p>
                <CardTitle>Add Education</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Input placeholder="Institution" value={newEdu.institution} onChange={e => setNewEdu(p => ({ ...p, institution: e.target.value }))} className={`bg-background ${educationErrors.institution ? "border-destructive" : "border-border"}`} />
                    {educationErrors.institution && <p className="mt-1 text-xs text-destructive">{educationErrors.institution}</p>}
                  </div>
                  <div>
                    <Combobox placeholder="Degree or qualification" value={newEdu.degree} options={taxonomyOptions.degrees} onChange={value => setNewEdu(p => ({ ...p, degree: value }))} />
                    {educationErrors.degree && <p className="mt-1 text-xs text-destructive">{educationErrors.degree}</p>}
                  </div>
                  <Combobox placeholder="Field of study" value={newEdu.fieldOfStudy} options={taxonomyOptions.fieldsOfStudy} onChange={value => setNewEdu(p => ({ ...p, fieldOfStudy: value }))} />
                  <div>
                    <MonthYearPicker placeholder="Start month" value={newEdu.startDate} onChange={value => setNewEdu(p => ({ ...p, startDate: value }))} className={educationErrors.startDate ? "border-destructive" : undefined} />
                    {educationErrors.startDate && <p className="mt-1 text-xs text-destructive">{educationErrors.startDate}</p>}
                  </div>
                  <MonthYearPicker placeholder="End month" value={newEdu.endDate} onChange={value => setNewEdu(p => ({ ...p, endDate: value }))} />
                </div>
                <Button onClick={addEducation} className="bg-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" /> Add Education
                </Button>
              </CardContent>
            </Card>
            {loadingEdu ? <Skeleton className="h-24 w-full" /> : education?.map(edu => (
              <Card key={edu.id} className="blue-card">
                <CardContent className="pt-4 flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{edu.degree}</p>
                    <p className="text-sm text-muted-foreground">{edu.institution} · {formatDate(edu.startDate)} – {edu.isCurrent ? "Present" : formatDate(edu.endDate)}</p>
                    {edu.fieldOfStudy && <p className="text-sm">{edu.fieldOfStudy}</p>}
                  </div>
                  <Button variant="ghost" size="sm" aria-label="Delete education entry" onClick={async () => {
                    await deleteEdu.mutateAsync({ id: edu.id });
                    qc.invalidateQueries({ queryKey: getListEducationQueryKey() });
                    toast({ title: "Education removed" });
                  }}><Trash2 className="inline-edit-icon w-4 h-4 text-destructive" /></Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Skills Tab */}
          <TabsContent value="skills" className="space-y-4">
            <Card className="blue-card">
              <CardHeader>
                <p className="eyebrow">Capability Matrix</p>
                <CardTitle>Add Skill</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Combobox placeholder="Skill name" value={newSkill.name} options={taxonomyOptions.skills} onChange={value => setNewSkill(p => ({ ...p, name: value }))} />
                    {skillErrors.name && <p className="mt-1 text-xs text-destructive">{skillErrors.name}</p>}
                  </div>
                  <div>
                    <Combobox placeholder="Skill category" value={newSkill.category} options={taxonomyOptions.skillCategories} onChange={value => setNewSkill(p => ({ ...p, category: value }))} />
                    {skillErrors.category && <p className="mt-1 text-xs text-destructive">{skillErrors.category}</p>}
                  </div>
                  <div>
                    <Combobox placeholder="Proficiency" value={newSkill.proficiencyLevel} options={taxonomyOptions.proficiencyLevels} onChange={value => setNewSkill(p => ({ ...p, proficiencyLevel: value }))} />
                    {skillErrors.proficiencyLevel && <p className="mt-1 text-xs text-destructive">{skillErrors.proficiencyLevel}</p>}
                  </div>
                </div>
                <Button onClick={addSkill} className="bg-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" /> Add Skill
                </Button>
              </CardContent>
            </Card>
            {loadingSkills ? <Skeleton className="h-16 w-full" /> : (
              <div className="flex flex-wrap gap-2">
                {skills?.map(skill => (
                  <Badge key={skill.id} variant="secondary" className="flex items-center gap-2 px-3 py-1.5 text-sm">
                    <span>{skill.name}</span>
                    <span className="text-muted-foreground text-xs">· {skill.proficiencyLevel}</span>
                    <button aria-label={`Delete skill ${skill.name}`} onClick={async () => {
                      await deleteSkill.mutateAsync({ id: skill.id });
                      qc.invalidateQueries({ queryKey: getListSkillsQueryKey() });
                    }} className="ml-1 text-muted-foreground hover:text-destructive"><Trash2 className="inline-edit-icon w-3 h-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Certifications Tab */}
          <TabsContent value="skills" className="space-y-4">
            <Card className="blue-card">
              <CardHeader>
                <p className="eyebrow">Verified Proof</p>
                <CardTitle>Add Certification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Combobox placeholder="Certification name" value={newCert.name} options={taxonomyOptions.certifications} onChange={value => setNewCert(p => ({ ...p, name: value }))} />
                    {certErrors.name && <p className="mt-1 text-xs text-destructive">{certErrors.name}</p>}
                  </div>
                  <div>
                    <Input placeholder="Issuing organization" value={newCert.issuingOrganization} onChange={e => setNewCert(p => ({ ...p, issuingOrganization: e.target.value }))} className={`bg-background ${certErrors.issuingOrganization ? "border-destructive" : "border-border"}`} />
                    {certErrors.issuingOrganization && <p className="mt-1 text-xs text-destructive">{certErrors.issuingOrganization}</p>}
                  </div>
                  <MonthYearPicker placeholder="Issue month" value={newCert.issueDate} onChange={value => setNewCert(p => ({ ...p, issueDate: value }))} />
                  <MonthYearPicker placeholder="Expiry month (optional)" value={newCert.expiryDate} onChange={value => setNewCert(p => ({ ...p, expiryDate: value }))} />
                </div>
                <Button onClick={addCertification} className="bg-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" /> Add Certification
                </Button>
              </CardContent>
            </Card>
            {loadingCerts ? <Skeleton className="h-16 w-full" /> : certs?.map(cert => (
              <Card key={cert.id} className="blue-card">
                <CardContent className="pt-4 flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{cert.name}</p>
                    <p className="text-sm text-muted-foreground">{cert.issuingOrganization}{cert.issueDate ? ` · ${formatDate(cert.issueDate)}` : ""}</p>
                  </div>
                  <Button variant="ghost" size="sm" aria-label="Delete certification" onClick={async () => {
                    await deleteCert.mutateAsync({ id: cert.id });
                    qc.invalidateQueries({ queryKey: getListCertificationsQueryKey() });
                    toast({ title: "Certification removed" });
                  }}><Trash2 className="inline-edit-icon w-4 h-4 text-destructive" /></Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
