import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetProfile, useUpdateProfile, getGetProfileQueryKey,
  useListWorkExperiences, useCreateWorkExperience, useDeleteWorkExperience, getListWorkExperiencesQueryKey,
  useListEducation, useCreateEducation, useDeleteEducation, getListEducationQueryKey,
  useListSkills, useCreateSkill, useDeleteSkill, getListSkillsQueryKey,
  useListCertifications, useCreateCertification, useDeleteCertification, getListCertificationsQueryKey,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  UploadCloud,
  Edit3,
  Plus,
  Trash2,
  Save,
  User,
  Briefcase,
  GraduationCap,
  Star,
  Award,
  Sparkles,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const roleOptions = [
  "Data Analyst", "Business Analyst", "Software Engineer", "Frontend Developer", "Backend Developer", "Full-Stack Developer",
  "Product Manager", "Project Manager", "UX/UI Designer", "Cybersecurity Analyst", "Cloud Engineer", "DevOps Engineer",
  "Machine Learning Engineer", "AI Engineer", "Data Scientist", "Robotics Engineer", "Marketing Manager", "Operations Manager",
  "Finance Analyst", "HR Business Partner", "Teacher / Educator", "Healthcare Professional", "Entrepreneur / Founder", "Other",
];

const industryOptions = [
  "Technology", "Artificial Intelligence", "Software / SaaS", "Financial Services", "Healthcare", "Education", "Energy", "Manufacturing",
  "Retail / Ecommerce", "Consulting", "Public Sector", "Telecommunications", "Media / Creative", "Logistics", "Real Estate",
  "Legal", "Non-profit", "Other",
];

const careerLevelOptions = ["Entry-level", "Junior", "Associate", "Mid-level", "Senior", "Lead", "Principal", "Manager", "Director", "VP / Executive", "Founder", "Career Changer"];
const learningStyleOptions = ["Self-paced online", "Instructor-led live classes", "University-style programme", "Mentorship / coaching", "Project-based learning", "Bootcamp intensive", "Reading and research", "Mixed / blended learning"];
const experienceYearOptions = Array.from({ length: 41 }, (_, i) => String(i));
const experienceMonthOptions = Array.from({ length: 12 }, (_, i) => String(i));
const learningHourOptions = Array.from({ length: 41 }, (_, i) => String(i));
const learningMinuteOptions = ["0", "15", "30", "45"];
const summaryStarterOptions = [
  "Select a profile positioning statement",
  "Commercial professional transitioning into AI-enabled product leadership.",
  "Technical specialist building advanced expertise in cloud, data, and automation.",
  "Analytical operator focused on measurable business impact and scalable systems.",
  "Creative problem-solver with cross-functional experience and strong stakeholder communication.",
  "Emerging technology professional seeking a structured path into high-growth digital roles.",
];

const companyOptions = ["Accenture", "Amazon", "Apple", "Barclays", "Capgemini", "Deloitte", "Google", "IBM", "KPMG", "Meta", "Microsoft", "NHS", "PwC", "Salesforce", "Self-employed", "Startup", "University", "Other"];
const workTitleOptions = roleOptions;
const achievementOptions = [
  "Led cross-functional delivery, improved operational efficiency, and collaborated with senior stakeholders.",
  "Built dashboards, analysed performance data, and translated insights into practical decisions.",
  "Delivered customer-facing digital products while balancing quality, time, and commercial outcomes.",
  "Automated manual processes and documented repeatable workflows for team adoption.",
  "Managed projects, risks, budgets, and stakeholder communications from initiation to completion.",
];
const workSkillOptions = ["Python, SQL, Power BI", "React, TypeScript, APIs", "AWS, Docker, CI/CD", "Stakeholder management, agile delivery", "Data analysis, reporting, experimentation", "Leadership, communication, strategy"];

const institutionOptions = ["University of Manchester", "University College London", "King's College London", "Imperial College London", "Open University", "University of Lagos", "Coursera", "edX", "Udacity", "General Assembly", "Code First Girls", "Self-directed learning", "Other"];
const degreeOptions = ["High School / A Levels", "Diploma", "Certificate", "Bachelor's Degree", "Master's Degree", "MBA", "PhD / Doctorate", "Professional Qualification", "Bootcamp", "Online Specialisation"];
const fieldOptions = ["Computer Science", "Data Science", "Artificial Intelligence", "Software Engineering", "Business Administration", "Finance", "Marketing", "Education", "Engineering", "Healthcare", "Psychology", "Mathematics", "Design", "Project Management"];

const skillNameOptions = ["Python", "SQL", "TypeScript", "React", "Node.js", "Data Analysis", "Machine Learning", "Cloud Computing", "AWS", "Azure", "Docker", "Kubernetes", "Cybersecurity", "Product Strategy", "Agile Delivery", "Stakeholder Management", "Leadership", "Communication", "Prompt Engineering", "MLOps"];
const skillCategoryOptions = ["Technical", "AI & Data", "Cloud & DevOps", "Product", "Leadership", "Communication", "Analytical", "Management", "Design", "Cybersecurity", "Business", "Other"];
const proficiencyOptions = ["Beginner", "Foundation", "Intermediate", "Advanced", "Expert", "Strategic / Leadership"];

const certificationNameOptions = ["AWS Certified Cloud Practitioner", "AWS Solutions Architect Associate", "Microsoft Azure Fundamentals", "Google Data Analytics Certificate", "Google Project Management Certificate", "Professional Scrum Master", "PRINCE2 Foundation", "CompTIA Security+", "Certified Kubernetes Administrator", "TensorFlow Developer Certificate", "Meta Front-End Developer Certificate", "IBM Data Science Professional Certificate"];
const issuerOptions = ["Amazon Web Services", "Microsoft", "Google", "Coursera", "edX", "IBM", "Meta", "Scrum.org", "AXELOS", "CompTIA", "Linux Foundation", "Udacity", "University / College", "Professional Body"];
const credentialOptions = ["Credential ID available", "Digital badge issued", "In progress", "No credential ID", "Portfolio evidence available"];

const emptyWork = { company: "", title: "", startDate: "", endDate: "", isCurrent: false, description: "", skills: "" };
const emptyEdu = { institution: "", degree: "", fieldOfStudy: "", startDate: "", endDate: "", isCurrent: false };
const emptySkill = { name: "", category: "Technical", proficiencyLevel: "Intermediate", acquiredDate: "" };
const emptyCert = { name: "", issuingOrganization: "", issueDate: "", expiryDate: "", credentialId: "" };

function yearFromDate(date: string) {
  return date ? new Date(`${date}T00:00:00`).getFullYear() : undefined;
}

function FieldLabel({ children }: { children: string }) {
  return <label className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200/80 mb-2 block">{children}</label>;
}

function SelectField({ value, onChange, options, placeholder }: { value: string; onChange: (value: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-xl border border-cyan-300/20 bg-slate-950/70 px-3 text-sm text-foreground shadow-[0_0_20px_rgba(8,145,178,0.08)] outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-400/20"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

function DatalistInput({ id, value, onChange, options, placeholder, type = "text" }: { id: string; value: string; onChange: (value: string) => void; options: string[]; placeholder: string; type?: string }) {
  return (
    <>
      <Input
        type={type}
        list={id}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl border-cyan-300/20 bg-slate-950/70 focus-visible:ring-cyan-400/30"
      />
      <datalist id={id}>{options.map((option) => <option key={option} value={option} />)}</datalist>
    </>
  );
}

export default function Profile() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: profile, isLoading: loadingProfile } = useGetProfile();
  const { data: workExps, isLoading: loadingWork } = useListWorkExperiences();
  const { data: education, isLoading: loadingEdu } = useListEducation();
  const { data: skills, isLoading: loadingSkills } = useListSkills();
  const { data: certs, isLoading: loadingCerts } = useListCertifications();

  const updateProfile = useUpdateProfile();
  const createWorkExp = useCreateWorkExperience();
  const deleteWorkExp = useDeleteWorkExperience();
  const createEdu = useCreateEducation();
  const deleteEdu = useDeleteEducation();
  const createSkill = useCreateSkill();
  const deleteSkill = useDeleteSkill();
  const createCert = useCreateCertification();
  const deleteCert = useDeleteCertification();

  const [profileForm, setProfileForm] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [cvFileName, setCvFileName] = useState("");
  const [newWork, setNewWork] = useState(emptyWork);
  const [newEdu, setNewEdu] = useState(emptyEdu);
  const [newSkill, setNewSkill] = useState(emptySkill);
  const [newCert, setNewCert] = useState(emptyCert);

  const pf = (field: string) => profileForm[field] ?? (profile as any)?.[field]?.toString?.() ?? "";
  const setPf = (field: string, value: string) => setProfileForm(prev => ({ ...prev, [field]: value }));

  const handleCvUpload = (file?: File) => {
    if (!file) return;
    setCvFileName(file.name);
    const roleGuess = roleOptions.find((role) => file.name.toLowerCase().includes(role.toLowerCase().split(" ")[0]));
    setProfileForm((prev) => ({
      ...prev,
      ...(roleGuess ? { currentRole: roleGuess } : {}),
      professionalSummary: prev.professionalSummary ?? `CV uploaded: ${file.name}. Review the suggested fields below, then save your profile to complete the automation-ready setup.`,
    }));
    toast({ title: "CV captured", description: "Your PDF/Word CV is ready for profile automation. Review the suggested details or continue manually." });
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const data: any = {};
    const directFields = ["currentRole", "industry", "location", "phone", "linkedinUrl", "professionalSummary", "preferredLearningStyle", "salaryAspiration", "careerLevel"];
    directFields.forEach((field) => {
      if (profileForm[field] !== undefined) data[field] = profileForm[field];
    });
    if (profileForm.yearsExperience !== undefined) data.yearsExperience = Number(profileForm.yearsExperience || 0);
    if (profileForm.weeklyLearningHours !== undefined) data.weeklyLearningHours = Number(profileForm.weeklyLearningHours || 0);
    try {
      await updateProfile.mutateAsync({ data });
      qc.invalidateQueries({ queryKey: getGetProfileQueryKey() });
      toast({ title: "Profile saved", description: "Your personal and professional details have been updated." });
      setProfileForm({});
    } catch (error) {
      toast({ title: "Profile save failed", description: error instanceof Error ? error.message : "Please check the required fields and try again.", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const addWork = async () => {
    if (!newWork.company || !newWork.title || !newWork.startDate) {
      toast({ title: "Work entry needs company, title, and start date", variant: "destructive" });
      return;
    }
    try {
      await createWorkExp.mutateAsync({ data: { ...newWork, endDate: newWork.isCurrent ? undefined : newWork.endDate || undefined } });
      qc.invalidateQueries({ queryKey: getListWorkExperiencesQueryKey() });
      setNewWork(emptyWork);
      toast({ title: "Work experience added" });
    } catch (error) {
      toast({ title: "Could not add work experience", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    }
  };

  const addEducation = async () => {
    const startYear = yearFromDate(newEdu.startDate);
    const endYear = newEdu.isCurrent ? undefined : yearFromDate(newEdu.endDate);
    if (!newEdu.institution || !newEdu.degree || !startYear) {
      toast({ title: "Education needs institution, degree, and start date", variant: "destructive" });
      return;
    }
    try {
      await createEdu.mutateAsync({
        data: {
          institution: newEdu.institution,
          degree: newEdu.degree,
          fieldOfStudy: newEdu.fieldOfStudy || undefined,
          startYear,
          endYear,
          isCurrent: newEdu.isCurrent,
        },
      });
      qc.invalidateQueries({ queryKey: getListEducationQueryKey() });
      setNewEdu(emptyEdu);
      toast({ title: "Education added" });
    } catch (error) {
      toast({ title: "Could not add education", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    }
  };

  const addSkill = async () => {
    if (!newSkill.name) {
      toast({ title: "Choose a skill first", variant: "destructive" });
      return;
    }
    try {
      await createSkill.mutateAsync({ data: { ...newSkill, acquiredDate: newSkill.acquiredDate || undefined } });
      qc.invalidateQueries({ queryKey: getListSkillsQueryKey() });
      setNewSkill(emptySkill);
      toast({ title: "Skill added" });
    } catch (error) {
      toast({ title: "Could not add skill", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    }
  };

  const addCertification = async () => {
    if (!newCert.name || !newCert.issuingOrganization) {
      toast({ title: "Certification needs a name and issuing organisation", variant: "destructive" });
      return;
    }
    try {
      await createCert.mutateAsync({ data: { ...newCert, issueDate: newCert.issueDate || undefined, expiryDate: newCert.expiryDate || undefined, credentialId: newCert.credentialId || undefined } });
      qc.invalidateQueries({ queryKey: getListCertificationsQueryKey() });
      setNewCert(emptyCert);
      toast({ title: "Certification added" });
    } catch (error) {
      toast({ title: "Could not add certification", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.12),transparent_28%)] p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[2rem] border border-cyan-300/20 bg-slate-950/70 p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl glow-box">
              <Badge className="mb-5 border-cyan-300/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/10">
                <Sparkles className="mr-2 h-3.5 w-3.5" /> AI-ready professional profile
              </Badge>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white md:text-5xl">
                Build a bold, futuristic career profile from your CV or update it manually.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                Start by uploading a Word or PDF CV to prepare automated profile completion, or choose manual update to refine every professional detail with guided dropdowns, calendar dates, and structured career intelligence.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-200">
                  <UploadCloud className="mr-2 h-5 w-5" /> Upload CV in Word or PDF
                  <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(event) => handleCvUpload(event.target.files?.[0])} />
                </label>
                <Button type="button" variant="outline" className="rounded-xl border-cyan-300/30 bg-white/5 px-5 py-6 font-bold text-cyan-100 hover:bg-cyan-300/10" onClick={() => setActiveTab("personal")}>
                  <Edit3 className="mr-2 h-5 w-5" /> Manually update profile
                </Button>
              </div>
              {cvFileName && (
                <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                  <ShieldCheck className="mr-2 inline h-4 w-4" /> Uploaded CV: <span className="font-bold">{cvFileName}</span>. Review or complete the fields below, then save your profile.
                </div>
              )}
            </div>

            <Card className="rounded-[2rem] border-cyan-300/20 bg-slate-950/70 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-black"><CalendarDays className="h-5 w-5 text-cyan-300" /> Profile command centre</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="font-bold text-white">Guided fields</p>
                  <p className="mt-1">Most entries now include curated dropdowns or suggestion lists, reducing typing and keeping profile data consistent.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="font-bold text-white">Calendar-first dates</p>
                  <p className="mt-1">Work, education, and certification dates use calendar inputs by default.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="font-bold text-white">Functional add actions</p>
                  <p className="mt-1">Education, skills, and certifications include validation feedback and safe reset behaviour after saving.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="flex h-auto flex-wrap gap-2 rounded-2xl border border-cyan-300/20 bg-slate-950/80 p-2 shadow-xl shadow-cyan-950/20">
              <TabsTrigger value="personal" className="rounded-xl px-4 py-2 font-bold data-[state=active]:bg-cyan-300 data-[state=active]:text-slate-950"><User className="mr-2 h-4 w-4" /> Personal</TabsTrigger>
              <TabsTrigger value="work" className="rounded-xl px-4 py-2 font-bold data-[state=active]:bg-cyan-300 data-[state=active]:text-slate-950"><Briefcase className="mr-2 h-4 w-4" /> Work</TabsTrigger>
              <TabsTrigger value="education" className="rounded-xl px-4 py-2 font-bold data-[state=active]:bg-cyan-300 data-[state=active]:text-slate-950"><GraduationCap className="mr-2 h-4 w-4" /> Education</TabsTrigger>
              <TabsTrigger value="skills" className="rounded-xl px-4 py-2 font-bold data-[state=active]:bg-cyan-300 data-[state=active]:text-slate-950"><Star className="mr-2 h-4 w-4" /> Skills</TabsTrigger>
              <TabsTrigger value="certifications" className="rounded-xl px-4 py-2 font-bold data-[state=active]:bg-cyan-300 data-[state=active]:text-slate-950"><Award className="mr-2 h-4 w-4" /> Certifications</TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <Card className="rounded-[1.75rem] border-cyan-300/20 bg-slate-950/75 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
                <CardHeader><CardTitle className="text-2xl font-black">Personal and Professional Details</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {loadingProfile ? <Skeleton className="h-64 w-full" /> : (
                    <>
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                        <div><FieldLabel>Current role</FieldLabel><SelectField value={pf("currentRole")} onChange={(v) => setPf("currentRole", v)} options={roleOptions} placeholder="Choose current role" /></div>
                        <div><FieldLabel>Industry</FieldLabel><SelectField value={pf("industry")} onChange={(v) => setPf("industry", v)} options={industryOptions} placeholder="Choose industry" /></div>
                        <div><FieldLabel>Career level</FieldLabel><SelectField value={pf("careerLevel")} onChange={(v) => setPf("careerLevel", v)} options={careerLevelOptions} placeholder="Choose career level" /></div>
                        <div><FieldLabel>Location</FieldLabel><Input placeholder="e.g. London, UK" value={pf("location")} onChange={(e) => setPf("location", e.target.value)} className="h-11 rounded-xl border-cyan-300/20 bg-slate-950/70" /></div>
                        <div><FieldLabel>Phone</FieldLabel><Input placeholder="Optional phone number" value={pf("phone")} onChange={(e) => setPf("phone", e.target.value)} className="h-11 rounded-xl border-cyan-300/20 bg-slate-950/70" /></div>
                        <div><FieldLabel>LinkedIn URL</FieldLabel><Input placeholder="https://linkedin.com/in/..." value={pf("linkedinUrl")} onChange={(e) => setPf("linkedinUrl", e.target.value)} className="h-11 rounded-xl border-cyan-300/20 bg-slate-950/70" /></div>
                        <div><FieldLabel>Years of experience</FieldLabel><SelectField value={pf("yearsExperience")} onChange={(v) => setPf("yearsExperience", v)} options={experienceYearOptions} placeholder="Years" /></div>
                        <div><FieldLabel>Additional months</FieldLabel><SelectField value={profileForm.experienceMonths ?? ""} onChange={(v) => setPf("experienceMonths", v)} options={experienceMonthOptions} placeholder="Months" /></div>
                        <div><FieldLabel>Weekly learning hours</FieldLabel><SelectField value={pf("weeklyLearningHours")} onChange={(v) => setPf("weeklyLearningHours", v)} options={learningHourOptions} placeholder="Hours" /></div>
                        <div><FieldLabel>Additional minutes</FieldLabel><SelectField value={profileForm.learningMinutes ?? ""} onChange={(v) => setPf("learningMinutes", v)} options={learningMinuteOptions} placeholder="Minutes" /></div>
                        <div><FieldLabel>Preferred learning style</FieldLabel><SelectField value={pf("preferredLearningStyle")} onChange={(v) => setPf("preferredLearningStyle", v)} options={learningStyleOptions} placeholder="Choose learning style" /></div>
                        <div><FieldLabel>Salary aspiration</FieldLabel><Input placeholder="e.g. £80,000–£100,000" value={pf("salaryAspiration")} onChange={(e) => setPf("salaryAspiration", e.target.value)} className="h-11 rounded-xl border-cyan-300/20 bg-slate-950/70" /></div>
                      </div>
                      <div className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
                        <div><FieldLabel>Summary starter</FieldLabel><SelectField value="" onChange={(v) => v && setPf("professionalSummary", v)} options={summaryStarterOptions.slice(1)} placeholder={summaryStarterOptions[0]} /></div>
                        <div><FieldLabel>Professional summary</FieldLabel><Textarea rows={5} placeholder="Describe your achievements, direction, strengths, and target professional identity..." value={pf("professionalSummary")} onChange={(e) => setPf("professionalSummary", e.target.value)} className="rounded-xl border-cyan-300/20 bg-slate-950/70 resize-none" /></div>
                      </div>
                      <Button onClick={handleSaveProfile} disabled={savingProfile} className="rounded-xl bg-cyan-300 px-6 py-6 font-black text-slate-950 hover:bg-cyan-200">
                        <Save className="mr-2 h-4 w-4" />{savingProfile ? "Saving..." : "Save Profile"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="work" className="space-y-5">
              <Card className="rounded-[1.75rem] border-cyan-300/20 bg-slate-950/75 shadow-xl backdrop-blur-xl">
                <CardHeader><CardTitle className="text-2xl font-black">Add Work Experience</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div><FieldLabel>Company</FieldLabel><DatalistInput id="company-options" value={newWork.company} onChange={(v) => setNewWork(p => ({ ...p, company: v }))} options={companyOptions} placeholder="Choose or type company" /></div>
                    <div><FieldLabel>Job title</FieldLabel><DatalistInput id="work-title-options" value={newWork.title} onChange={(v) => setNewWork(p => ({ ...p, title: v }))} options={workTitleOptions} placeholder="Choose or type job title" /></div>
                    <div><FieldLabel>Start date</FieldLabel><Input type="date" value={newWork.startDate} onChange={(e) => setNewWork(p => ({ ...p, startDate: e.target.value }))} className="h-11 rounded-xl border-cyan-300/20 bg-slate-950/70" /></div>
                    <div><FieldLabel>End date</FieldLabel><Input type="date" disabled={newWork.isCurrent} value={newWork.endDate} onChange={(e) => setNewWork(p => ({ ...p, endDate: e.target.value }))} className="h-11 rounded-xl border-cyan-300/20 bg-slate-950/70 disabled:opacity-50" /></div>
                    <div><FieldLabel>Skills used</FieldLabel><DatalistInput id="work-skill-options" value={newWork.skills} onChange={(v) => setNewWork(p => ({ ...p, skills: v }))} options={workSkillOptions} placeholder="Choose or type skills" /></div>
                    <div className="flex items-end gap-3 rounded-xl border border-cyan-300/10 bg-white/[0.03] p-4"><Checkbox checked={newWork.isCurrent} onCheckedChange={(checked) => setNewWork(p => ({ ...p, isCurrent: Boolean(checked), endDate: checked ? "" : p.endDate }))} /><span className="text-sm font-bold text-slate-200">I currently work here</span></div>
                  </div>
                  <div><FieldLabel>Role description</FieldLabel><DatalistInput id="achievement-options" value={newWork.description} onChange={(v) => setNewWork(p => ({ ...p, description: v }))} options={achievementOptions} placeholder="Choose a description starter or write your achievements" /></div>
                  <Button onClick={addWork} className="rounded-xl bg-cyan-300 font-black text-slate-950 hover:bg-cyan-200"><Plus className="mr-2 h-4 w-4" /> Add Entry</Button>
                </CardContent>
              </Card>
              {loadingWork ? <Skeleton className="h-24 w-full" /> : workExps?.map(exp => (
                <Card key={exp.id} className="rounded-2xl border-cyan-300/10 bg-slate-950/70"><CardContent className="flex items-start justify-between gap-4 pt-5"><div><p className="font-black text-white">{exp.title}</p><p className="text-sm text-cyan-100/80">{exp.company} · {exp.startDate} – {exp.isCurrent ? "Present" : exp.endDate}</p>{exp.description && <p className="mt-2 text-sm text-slate-300">{exp.description}</p>}</div><Button variant="ghost" size="sm" onClick={async () => { await deleteWorkExp.mutateAsync({ id: exp.id }); qc.invalidateQueries({ queryKey: getListWorkExperiencesQueryKey() }); toast({ title: "Entry removed" }); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></CardContent></Card>
              ))}
            </TabsContent>

            <TabsContent value="education" className="space-y-5">
              <Card className="rounded-[1.75rem] border-cyan-300/20 bg-slate-950/75 shadow-xl backdrop-blur-xl">
                <CardHeader><CardTitle className="text-2xl font-black">Add Education</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div><FieldLabel>Institution</FieldLabel><DatalistInput id="institution-options" value={newEdu.institution} onChange={(v) => setNewEdu(p => ({ ...p, institution: v }))} options={institutionOptions} placeholder="Choose or type institution" /></div>
                    <div><FieldLabel>Degree</FieldLabel><SelectField value={newEdu.degree} onChange={(v) => setNewEdu(p => ({ ...p, degree: v }))} options={degreeOptions} placeholder="Choose degree" /></div>
                    <div><FieldLabel>Field of study</FieldLabel><SelectField value={newEdu.fieldOfStudy} onChange={(v) => setNewEdu(p => ({ ...p, fieldOfStudy: v }))} options={fieldOptions} placeholder="Choose field" /></div>
                    <div><FieldLabel>Start date</FieldLabel><Input type="date" value={newEdu.startDate} onChange={(e) => setNewEdu(p => ({ ...p, startDate: e.target.value }))} className="h-11 rounded-xl border-cyan-300/20 bg-slate-950/70" /></div>
                    <div><FieldLabel>End date</FieldLabel><Input type="date" disabled={newEdu.isCurrent} value={newEdu.endDate} onChange={(e) => setNewEdu(p => ({ ...p, endDate: e.target.value }))} className="h-11 rounded-xl border-cyan-300/20 bg-slate-950/70 disabled:opacity-50" /></div>
                    <div className="flex items-end gap-3 rounded-xl border border-cyan-300/10 bg-white/[0.03] p-4"><Checkbox checked={newEdu.isCurrent} onCheckedChange={(checked) => setNewEdu(p => ({ ...p, isCurrent: Boolean(checked), endDate: checked ? "" : p.endDate }))} /><span className="text-sm font-bold text-slate-200">I am currently studying here</span></div>
                  </div>
                  <Button onClick={addEducation} className="rounded-xl bg-cyan-300 font-black text-slate-950 hover:bg-cyan-200"><Plus className="mr-2 h-4 w-4" /> Add Education</Button>
                </CardContent>
              </Card>
              {loadingEdu ? <Skeleton className="h-24 w-full" /> : education?.map(edu => (
                <Card key={edu.id} className="rounded-2xl border-cyan-300/10 bg-slate-950/70"><CardContent className="flex items-start justify-between pt-5"><div><p className="font-black text-white">{edu.degree}</p><p className="text-sm text-cyan-100/80">{edu.institution} · {edu.startYear} – {edu.isCurrent ? "Present" : edu.endYear}</p>{edu.fieldOfStudy && <p className="text-sm text-slate-300">{edu.fieldOfStudy}</p>}</div><Button variant="ghost" size="sm" onClick={async () => { await deleteEdu.mutateAsync({ id: edu.id }); qc.invalidateQueries({ queryKey: getListEducationQueryKey() }); toast({ title: "Education removed" }); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></CardContent></Card>
              ))}
            </TabsContent>

            <TabsContent value="skills" className="space-y-5">
              <Card className="rounded-[1.75rem] border-cyan-300/20 bg-slate-950/75 shadow-xl backdrop-blur-xl"><CardHeader><CardTitle className="text-2xl font-black">Add Skill</CardTitle></CardHeader><CardContent className="space-y-5"><div className="grid grid-cols-1 gap-5 md:grid-cols-4"><div><FieldLabel>Skill</FieldLabel><SelectField value={newSkill.name} onChange={(v) => setNewSkill(p => ({ ...p, name: v }))} options={skillNameOptions} placeholder="Choose skill" /></div><div><FieldLabel>Category</FieldLabel><SelectField value={newSkill.category} onChange={(v) => setNewSkill(p => ({ ...p, category: v }))} options={skillCategoryOptions} /></div><div><FieldLabel>Proficiency</FieldLabel><SelectField value={newSkill.proficiencyLevel} onChange={(v) => setNewSkill(p => ({ ...p, proficiencyLevel: v }))} options={proficiencyOptions} /></div><div><FieldLabel>Date acquired / assessed</FieldLabel><Input type="date" value={newSkill.acquiredDate} onChange={(e) => setNewSkill(p => ({ ...p, acquiredDate: e.target.value }))} className="h-11 rounded-xl border-cyan-300/20 bg-slate-950/70" /></div></div><Button onClick={addSkill} className="rounded-xl bg-cyan-300 font-black text-slate-950 hover:bg-cyan-200"><Plus className="mr-2 h-4 w-4" /> Add Skill</Button></CardContent></Card>
              {loadingSkills ? <Skeleton className="h-16 w-full" /> : <div className="flex flex-wrap gap-3">{skills?.map(skill => <Badge key={skill.id} variant="secondary" className="gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100"><span>{skill.name}</span><span className="text-xs text-cyan-200/70">· {skill.proficiencyLevel}{(skill as any).acquiredDate ? ` · ${(skill as any).acquiredDate}` : ""}</span><button onClick={async () => { await deleteSkill.mutateAsync({ id: skill.id }); qc.invalidateQueries({ queryKey: getListSkillsQueryKey() }); }} className="ml-1 hover:text-destructive"><Trash2 className="h-3 w-3" /></button></Badge>)}</div>}
            </TabsContent>

            <TabsContent value="certifications" className="space-y-5">
              <Card className="rounded-[1.75rem] border-cyan-300/20 bg-slate-950/75 shadow-xl backdrop-blur-xl"><CardHeader><CardTitle className="text-2xl font-black">Add Certification</CardTitle></CardHeader><CardContent className="space-y-5"><div className="grid grid-cols-1 gap-5 md:grid-cols-2"><div><FieldLabel>Certification</FieldLabel><SelectField value={newCert.name} onChange={(v) => setNewCert(p => ({ ...p, name: v }))} options={certificationNameOptions} placeholder="Choose certification" /></div><div><FieldLabel>Issuing organisation</FieldLabel><SelectField value={newCert.issuingOrganization} onChange={(v) => setNewCert(p => ({ ...p, issuingOrganization: v }))} options={issuerOptions} placeholder="Choose issuer" /></div><div><FieldLabel>Issue date</FieldLabel><Input type="date" value={newCert.issueDate} onChange={(e) => setNewCert(p => ({ ...p, issueDate: e.target.value }))} className="h-11 rounded-xl border-cyan-300/20 bg-slate-950/70" /></div><div><FieldLabel>Expiry date</FieldLabel><Input type="date" value={newCert.expiryDate} onChange={(e) => setNewCert(p => ({ ...p, expiryDate: e.target.value }))} className="h-11 rounded-xl border-cyan-300/20 bg-slate-950/70" /></div><div className="md:col-span-2"><FieldLabel>Credential status / ID</FieldLabel><DatalistInput id="credential-options" value={newCert.credentialId} onChange={(v) => setNewCert(p => ({ ...p, credentialId: v }))} options={credentialOptions} placeholder="Choose status or enter credential ID" /></div></div><Button onClick={addCertification} className="rounded-xl bg-cyan-300 font-black text-slate-950 hover:bg-cyan-200"><Plus className="mr-2 h-4 w-4" /> Add Certification</Button></CardContent></Card>
              {loadingCerts ? <Skeleton className="h-16 w-full" /> : certs?.map(cert => <Card key={cert.id} className="rounded-2xl border-cyan-300/10 bg-slate-950/70"><CardContent className="flex items-start justify-between pt-5"><div><p className="font-black text-white">{cert.name}</p><p className="text-sm text-cyan-100/80">{cert.issuingOrganization}{cert.issueDate ? ` · ${cert.issueDate}` : ""}</p>{cert.credentialId && <p className="text-xs text-slate-400">Credential: {cert.credentialId}</p>}</div><Button variant="ghost" size="sm" onClick={async () => { await deleteCert.mutateAsync({ id: cert.id }); qc.invalidateQueries({ queryKey: getListCertificationsQueryKey() }); toast({ title: "Certification removed" }); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></CardContent></Card>)}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
