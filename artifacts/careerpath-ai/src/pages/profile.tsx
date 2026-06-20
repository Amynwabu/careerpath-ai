import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetProfile, useUpdateProfile, getGetProfileQueryKey,
  useListWorkExperiences, useCreateWorkExperience, useUpdateWorkExperience, useDeleteWorkExperience, getListWorkExperiencesQueryKey,
  useListEducation, useCreateEducation, useUpdateEducation, useDeleteEducation, getListEducationQueryKey,
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
import { useToast } from "@/hooks/use-toast";

const ROLE_OPTIONS = [
  "Accountant",
  "Administrative Assistant",
  "Business Analyst",
  "Care Assistant",
  "Chef",
  "Customer Service Manager",
  "Data Analyst",
  "Electrician",
  "Engineer",
  "Finance Manager",
  "Healthcare Assistant",
  "Human Resources Manager",
  "Marketing Manager",
  "Nurse",
  "Operations Manager",
  "Product Manager",
  "Project Manager",
  "Sales Manager",
  "Social Worker",
  "Software Engineer",
  "Teacher",
];

const INDUSTRY_OPTIONS = [
  "Agriculture and Environment",
  "Arts, Media and Entertainment",
  "Construction and Property",
  "Education and Training",
  "Energy and Utilities",
  "Financial Services",
  "Government and Public Sector",
  "Healthcare and Social Care",
  "Hospitality and Tourism",
  "Legal Services",
  "Manufacturing and Engineering",
  "Professional Services",
  "Retail and Consumer Goods",
  "Technology and Digital",
  "Transport and Logistics",
];

const CAREER_LEVEL_OPTIONS = [
  "Entry level",
  "Junior",
  "Mid-level",
  "Senior",
  "Lead",
  "Manager",
  "Director",
  "Executive",
  "Founder / Self-employed",
];

const LOCATION_OPTIONS = [
  "Remote",
  "Belfast, UK",
  "Birmingham, UK",
  "Bristol, UK",
  "Cardiff, UK",
  "Edinburgh, UK",
  "Glasgow, UK",
  "Leeds, UK",
  "Liverpool, UK",
  "London, UK",
  "Manchester, UK",
  "Newcastle, UK",
  "Nottingham, UK",
  "Sheffield, UK",
];

const EXPERIENCE_OPTIONS = Array.from({ length: 21 }, (_, years) => ({
  value: String(years),
  label: years === 0 ? "Less than 1 year" : `${years} ${years === 1 ? "year" : "years"}`,
}));

const WEEKLY_HOUR_OPTIONS = [1, 2, 3, 5, 7, 10, 15, 20];

const SELECT_CLASS = "h-12 w-full border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none transition-colors focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400";

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
  const [newEdu, setNewEdu] = useState({ institution: "", degree: "", fieldOfStudy: "", startYear: "", endYear: "", isCurrent: false });
  const [newSkill, setNewSkill] = useState({ name: "", category: "Technical", proficiencyLevel: "Intermediate" });
  const [newCert, setNewCert] = useState({ name: "", issuingOrganization: "", issueDate: "", expiryDate: "" });

  const pf = (field: string) => String(profileForm[field] ?? (profile as any)?.[field] ?? "");
  const coreFields = ["currentRole", "industry", "careerLevel", "yearsExperience", "location"];
  const completedCoreFields = coreFields.filter(field => pf(field).trim()).length;

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const data: any = {};
    if (profileForm.currentRole !== undefined) data.currentRole = profileForm.currentRole;
    if (profileForm.yearsExperience !== undefined && profileForm.yearsExperience !== "") data.yearsExperience = Number(profileForm.yearsExperience);
    if (profileForm.industry !== undefined) data.industry = profileForm.industry;
    if (profileForm.location !== undefined) data.location = profileForm.location;
    if (profileForm.phone !== undefined) data.phone = profileForm.phone;
    if (profileForm.linkedinUrl !== undefined) data.linkedinUrl = profileForm.linkedinUrl;
    if (profileForm.professionalSummary !== undefined) data.professionalSummary = profileForm.professionalSummary;
    if (profileForm.preferredLearningStyle !== undefined) data.preferredLearningStyle = profileForm.preferredLearningStyle;
    if (profileForm.weeklyLearningHours !== undefined && profileForm.weeklyLearningHours !== "") data.weeklyLearningHours = Number(profileForm.weeklyLearningHours);
    if (profileForm.salaryAspiration !== undefined) data.salaryAspiration = profileForm.salaryAspiration;
    if (profileForm.careerLevel !== undefined) data.careerLevel = profileForm.careerLevel;
    try {
      await updateProfile.mutateAsync({ data });
      qc.invalidateQueries({ queryKey: getGetProfileQueryKey() });
      toast({ title: "Profile saved", description: "Your changes have been saved." });
      setProfileForm({});
    } catch {
      toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" });
    }
    setSavingProfile(false);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <div className="border-y border-cyan-400/20 bg-cyan-400/[0.03] px-5 py-7 sm:flex sm:items-end sm:justify-between sm:gap-8 sm:px-7">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase text-cyan-300">Career record</p>
            <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Professional Profile</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Review the information mapped from your CV or career description, then complete any missing details.
            </p>
          </div>
          <div className="mt-6 border-l-2 border-cyan-400 pl-4 sm:mt-0 sm:min-w-48">
            <p className="text-2xl font-semibold text-foreground">{completedCoreFields}/5</p>
            <p className="mt-1 text-xs uppercase text-muted-foreground">Core signals complete</p>
          </div>
        </div>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="h-auto w-full justify-start overflow-x-auto border-b border-border bg-transparent p-0">
            <TabsTrigger value="personal" className="min-h-11 shrink-0 rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-cyan-400 data-[state=active]:bg-cyan-400/10 data-[state=active]:text-cyan-200">Personal</TabsTrigger>
            <TabsTrigger value="work" className="min-h-11 shrink-0 rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-fuchsia-400 data-[state=active]:bg-fuchsia-400/10 data-[state=active]:text-fuchsia-200">Work History</TabsTrigger>
            <TabsTrigger value="education" className="min-h-11 shrink-0 rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-amber-400 data-[state=active]:bg-amber-400/10 data-[state=active]:text-amber-200">Education</TabsTrigger>
            <TabsTrigger value="skills" className="min-h-11 shrink-0 rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-emerald-400 data-[state=active]:bg-emerald-400/10 data-[state=active]:text-emerald-200">Skills</TabsTrigger>
            <TabsTrigger value="certifications" className="min-h-11 shrink-0 rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-rose-400 data-[state=active]:bg-rose-400/10 data-[state=active]:text-rose-200">Certifications</TabsTrigger>
          </TabsList>

          {/* Personal Tab */}
          <TabsContent value="personal">
            <section className="border border-white/10 bg-card/60">
              <div className="border-b border-white/10 px-5 py-5 sm:flex sm:items-center sm:justify-between sm:px-7">
                <div>
                  <p className="text-xs font-semibold uppercase text-cyan-300">Profile signal 01</p>
                  <h2 className="mt-2 text-xl font-semibold text-foreground">Career details</h2>
                </div>
                <p className="mt-2 text-sm text-muted-foreground sm:mt-0">Mapped values remain editable.</p>
              </div>

              <div className="space-y-9 p-5 sm:p-7">
                {loadingProfile ? <Skeleton className="h-80 w-full" /> : (
                  <>
                    <div>
                      <div className="mb-5 flex items-end justify-between gap-4 border-b border-white/10 pb-3">
                        <div>
                          <h3 className="text-sm font-semibold uppercase text-foreground">Core career signals</h3>
                          <p className="mt-1 text-sm text-muted-foreground">These fields shape your career options and journey.</p>
                        </div>
                        <span className="text-sm font-medium text-cyan-300">{completedCoreFields}/5</span>
                      </div>

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                          <label htmlFor="currentRole" className="mb-2 block text-sm font-medium text-foreground">Current role</label>
                          <Input
                            id="currentRole"
                            list="profile-role-options"
                            placeholder="Search or enter your role"
                            value={pf("currentRole")}
                            onChange={e => setProfileForm(prev => ({ ...prev, currentRole: e.target.value }))}
                            className="h-12 rounded-none border-white/10 bg-background/70 focus-visible:ring-cyan-400"
                          />
                          <datalist id="profile-role-options">{ROLE_OPTIONS.map(option => <option key={option} value={option} />)}</datalist>
                        </div>

                        <div>
                          <label htmlFor="industry" className="mb-2 block text-sm font-medium text-foreground">Industry</label>
                          <Input
                            id="industry"
                            list="profile-industry-options"
                            placeholder="Search or enter your industry"
                            value={pf("industry")}
                            onChange={e => setProfileForm(prev => ({ ...prev, industry: e.target.value }))}
                            className="h-12 rounded-none border-white/10 bg-background/70 focus-visible:ring-cyan-400"
                          />
                          <datalist id="profile-industry-options">{INDUSTRY_OPTIONS.map(option => <option key={option} value={option} />)}</datalist>
                        </div>

                        <div>
                          <label htmlFor="careerLevel" className="mb-2 block text-sm font-medium text-foreground">Career level</label>
                          <select id="careerLevel" value={pf("careerLevel")} onChange={e => setProfileForm(prev => ({ ...prev, careerLevel: e.target.value }))} className={SELECT_CLASS}>
                            <option value="">Select career level</option>
                            {pf("careerLevel") && !CAREER_LEVEL_OPTIONS.includes(pf("careerLevel")) && <option value={pf("careerLevel")}>{pf("careerLevel")}</option>}
                            {CAREER_LEVEL_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </div>

                        <div>
                          <label htmlFor="yearsExperience" className="mb-2 block text-sm font-medium text-foreground">Years of experience</label>
                          <select id="yearsExperience" value={pf("yearsExperience")} onChange={e => setProfileForm(prev => ({ ...prev, yearsExperience: e.target.value }))} className={SELECT_CLASS}>
                            <option value="">Select experience</option>
                            {pf("yearsExperience") && !EXPERIENCE_OPTIONS.some(option => option.value === pf("yearsExperience")) && <option value={pf("yearsExperience")}>{pf("yearsExperience")} years</option>}
                            {EXPERIENCE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label htmlFor="location" className="mb-2 block text-sm font-medium text-foreground">Location</label>
                          <Input
                            id="location"
                            list="profile-location-options"
                            placeholder="Search or enter your location"
                            value={pf("location")}
                            onChange={e => setProfileForm(prev => ({ ...prev, location: e.target.value }))}
                            className="h-12 rounded-none border-white/10 bg-background/70 focus-visible:ring-cyan-400"
                          />
                          <datalist id="profile-location-options">{LOCATION_OPTIONS.map(option => <option key={option} value={option} />)}</datalist>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-5 border-b border-white/10 pb-3">
                        <h3 className="text-sm font-semibold uppercase text-foreground">Additional details</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Contact information and learning preferences.</p>
                      </div>
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                          <label htmlFor="phone" className="mb-2 block text-sm font-medium text-foreground">Phone</label>
                          <Input id="phone" placeholder="Optional" value={pf("phone")} onChange={e => setProfileForm(prev => ({ ...prev, phone: e.target.value }))} className="h-12 rounded-none border-white/10 bg-background/70" />
                        </div>
                        <div>
                          <label htmlFor="linkedinUrl" className="mb-2 block text-sm font-medium text-foreground">LinkedIn URL</label>
                          <Input id="linkedinUrl" type="url" placeholder="https://linkedin.com/in/..." value={pf("linkedinUrl")} onChange={e => setProfileForm(prev => ({ ...prev, linkedinUrl: e.target.value }))} className="h-12 rounded-none border-white/10 bg-background/70" />
                        </div>
                        <div>
                          <label htmlFor="weeklyLearningHours" className="mb-2 block text-sm font-medium text-foreground">Weekly learning hours</label>
                          <select id="weeklyLearningHours" value={pf("weeklyLearningHours")} onChange={e => setProfileForm(prev => ({ ...prev, weeklyLearningHours: e.target.value }))} className={SELECT_CLASS}>
                            <option value="">Select weekly hours</option>
                            {pf("weeklyLearningHours") && !WEEKLY_HOUR_OPTIONS.some(hours => String(hours) === pf("weeklyLearningHours")) && <option value={pf("weeklyLearningHours")}>{pf("weeklyLearningHours")} hours</option>}
                            {WEEKLY_HOUR_OPTIONS.map(hours => <option key={hours} value={hours}>{hours} {hours === 1 ? "hour" : "hours"}</option>)}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="preferredLearningStyle" className="mb-2 block text-sm font-medium text-foreground">Preferred learning style</label>
                          <select id="preferredLearningStyle" value={pf("preferredLearningStyle")} onChange={e => setProfileForm(prev => ({ ...prev, preferredLearningStyle: e.target.value }))} className={SELECT_CLASS}>
                            <option value="">Select learning style</option>
                            {pf("preferredLearningStyle") && !["Self-paced", "Instructor-led", "Blended", "Practical / on-the-job", "Peer learning"].includes(pf("preferredLearningStyle")) && <option value={pf("preferredLearningStyle")}>{pf("preferredLearningStyle")}</option>}
                            {["Self-paced", "Instructor-led", "Blended", "Practical / on-the-job", "Peer learning"].map(option => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label htmlFor="salaryAspiration" className="mb-2 block text-sm font-medium text-foreground">Salary aspiration</label>
                          <Input id="salaryAspiration" placeholder="e.g. £80,000 to £100,000" value={pf("salaryAspiration")} onChange={e => setProfileForm(prev => ({ ...prev, salaryAspiration: e.target.value }))} className="h-12 rounded-none border-white/10 bg-background/70" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="professionalSummary" className="mb-2 block text-sm font-medium text-foreground">Professional summary</label>
                      <Textarea
                        id="professionalSummary"
                        rows={5}
                        placeholder="Summarise your professional background, expertise and career direction."
                        value={pf("professionalSummary")}
                        onChange={e => setProfileForm(prev => ({ ...prev, professionalSummary: e.target.value }))}
                        className="resize-none rounded-none border-white/10 bg-background/70 focus-visible:ring-cyan-400"
                      />
                    </div>

                    <div className="flex justify-end border-t border-white/10 pt-5">
                      <Button onClick={handleSaveProfile} disabled={savingProfile} className="h-11 rounded-none bg-cyan-300 px-7 font-semibold text-slate-950 hover:bg-cyan-200">
                        {savingProfile ? "Saving..." : "Save profile"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </section>
          </TabsContent>

          {/* Work Experience Tab */}
          <TabsContent value="work" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle>Add Work Experience</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input placeholder="Company" value={newWork.company} onChange={e => setNewWork(p => ({ ...p, company: e.target.value }))} className="bg-background border-border" />
                  <Input placeholder="Job Title" value={newWork.title} onChange={e => setNewWork(p => ({ ...p, title: e.target.value }))} className="bg-background border-border" />
                  <Input type="month" placeholder="Start Date" value={newWork.startDate} onChange={e => setNewWork(p => ({ ...p, startDate: e.target.value }))} className="bg-background border-border" />
                  <Input type="month" placeholder="End Date (leave blank if current)" value={newWork.endDate} onChange={e => setNewWork(p => ({ ...p, endDate: e.target.value }))} className="bg-background border-border" />
                </div>
                <Textarea rows={3} placeholder="Role description and key achievements..." value={newWork.description} onChange={e => setNewWork(p => ({ ...p, description: e.target.value }))} className="bg-background border-border resize-none" />
                <Button onClick={async () => {
                  if (!newWork.company || !newWork.title || !newWork.startDate) return;
                  await createWorkExp.mutateAsync({ data: { ...newWork, isCurrent: !newWork.endDate } });
                  qc.invalidateQueries({ queryKey: getListWorkExperiencesQueryKey() });
                  setNewWork({ company: "", title: "", startDate: "", endDate: "", isCurrent: false, description: "", skills: "" });
                  toast({ title: "Work experience added" });
                }} className="bg-primary text-primary-foreground">
                  Add Entry
                </Button>
              </CardContent>
            </Card>
            {loadingWork ? <Skeleton className="h-24 w-full" /> : workExps?.map(exp => (
              <Card key={exp.id} className="border-border bg-card">
                <CardContent className="pt-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{exp.title}</p>
                    <p className="text-sm text-muted-foreground">{exp.company} · {exp.startDate} – {exp.isCurrent ? "Present" : exp.endDate}</p>
                    {exp.description && <p className="text-sm mt-2">{exp.description}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={async () => {
                    await deleteWorkExp.mutateAsync({ id: exp.id });
                    qc.invalidateQueries({ queryKey: getListWorkExperiencesQueryKey() });
                    toast({ title: "Entry removed" });
                  }} className="text-destructive">Remove</Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Education Tab */}
          <TabsContent value="education" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle>Add Education</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input placeholder="Institution" value={newEdu.institution} onChange={e => setNewEdu(p => ({ ...p, institution: e.target.value }))} className="bg-background border-border" />
                  <Input placeholder="Degree (e.g. BSc Computer Science)" value={newEdu.degree} onChange={e => setNewEdu(p => ({ ...p, degree: e.target.value }))} className="bg-background border-border" />
                  <Input placeholder="Field of Study" value={newEdu.fieldOfStudy} onChange={e => setNewEdu(p => ({ ...p, fieldOfStudy: e.target.value }))} className="bg-background border-border" />
                  <Input type="number" placeholder="Start Year" value={newEdu.startYear} onChange={e => setNewEdu(p => ({ ...p, startYear: e.target.value }))} className="bg-background border-border" />
                  <Input type="number" placeholder="End Year" value={newEdu.endYear} onChange={e => setNewEdu(p => ({ ...p, endYear: e.target.value }))} className="bg-background border-border" />
                </div>
                <Button onClick={async () => {
                  if (!newEdu.institution || !newEdu.degree || !newEdu.startYear) return;
                  await createEdu.mutateAsync({ data: { ...newEdu, startYear: parseInt(newEdu.startYear), endYear: newEdu.endYear ? parseInt(newEdu.endYear) : undefined, isCurrent: false } });
                  qc.invalidateQueries({ queryKey: getListEducationQueryKey() });
                  setNewEdu({ institution: "", degree: "", fieldOfStudy: "", startYear: "", endYear: "", isCurrent: false });
                  toast({ title: "Education added" });
                }} className="bg-primary text-primary-foreground">
                  Add Education
                </Button>
              </CardContent>
            </Card>
            {loadingEdu ? <Skeleton className="h-24 w-full" /> : education?.map(edu => (
              <Card key={edu.id} className="border-border bg-card">
                <CardContent className="pt-4 flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{edu.degree}</p>
                    <p className="text-sm text-muted-foreground">{edu.institution} · {edu.startYear} – {edu.isCurrent ? "Present" : edu.endYear}</p>
                    {edu.fieldOfStudy && <p className="text-sm">{edu.fieldOfStudy}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={async () => {
                    await deleteEdu.mutateAsync({ id: edu.id });
                    qc.invalidateQueries({ queryKey: getListEducationQueryKey() });
                    toast({ title: "Education removed" });
                  }} className="text-destructive">Remove</Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Skills Tab */}
          <TabsContent value="skills" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle>Add Skill</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input placeholder="Skill name (e.g. Python)" value={newSkill.name} onChange={e => setNewSkill(p => ({ ...p, name: e.target.value }))} className="bg-background border-border" />
                  <select value={newSkill.category} onChange={e => setNewSkill(p => ({ ...p, category: e.target.value }))} className="bg-background border border-border rounded-md px-3 py-2 text-sm">
                    <option>Technical</option><option>Leadership</option><option>Communication</option><option>Analytical</option><option>Management</option><option>Other</option>
                  </select>
                  <select value={newSkill.proficiencyLevel} onChange={e => setNewSkill(p => ({ ...p, proficiencyLevel: e.target.value }))} className="bg-background border border-border rounded-md px-3 py-2 text-sm">
                    <option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>Expert</option>
                  </select>
                </div>
                <Button onClick={async () => {
                  if (!newSkill.name) return;
                  await createSkill.mutateAsync({ data: newSkill });
                  qc.invalidateQueries({ queryKey: getListSkillsQueryKey() });
                  setNewSkill({ name: "", category: "Technical", proficiencyLevel: "Intermediate" });
                  toast({ title: "Skill added" });
                }} className="bg-primary text-primary-foreground">
                  Add Skill
                </Button>
              </CardContent>
            </Card>
            {loadingSkills ? <Skeleton className="h-16 w-full" /> : (
              <div className="flex flex-wrap gap-2">
                {skills?.map(skill => (
                  <Badge key={skill.id} variant="secondary" className="flex items-center gap-2 px-3 py-1.5 text-sm">
                    <span>{skill.name}</span>
                    <span className="text-muted-foreground text-xs">· {skill.proficiencyLevel}</span>
                    <button onClick={async () => {
                      await deleteSkill.mutateAsync({ id: skill.id });
                      qc.invalidateQueries({ queryKey: getListSkillsQueryKey() });
                    }} className="ml-1 text-xs text-muted-foreground hover:text-destructive">Remove</button>
                  </Badge>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Certifications Tab */}
          <TabsContent value="certifications" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle>Add Certification</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input placeholder="Certification name" value={newCert.name} onChange={e => setNewCert(p => ({ ...p, name: e.target.value }))} className="bg-background border-border" />
                  <Input placeholder="Issuing organization" value={newCert.issuingOrganization} onChange={e => setNewCert(p => ({ ...p, issuingOrganization: e.target.value }))} className="bg-background border-border" />
                  <Input type="month" placeholder="Issue Date" value={newCert.issueDate} onChange={e => setNewCert(p => ({ ...p, issueDate: e.target.value }))} className="bg-background border-border" />
                  <Input type="month" placeholder="Expiry Date (optional)" value={newCert.expiryDate} onChange={e => setNewCert(p => ({ ...p, expiryDate: e.target.value }))} className="bg-background border-border" />
                </div>
                <Button onClick={async () => {
                  if (!newCert.name || !newCert.issuingOrganization) return;
                  await createCert.mutateAsync({ data: newCert });
                  qc.invalidateQueries({ queryKey: getListCertificationsQueryKey() });
                  setNewCert({ name: "", issuingOrganization: "", issueDate: "", expiryDate: "" });
                  toast({ title: "Certification added" });
                }} className="bg-primary text-primary-foreground">
                  Add Certification
                </Button>
              </CardContent>
            </Card>
            {loadingCerts ? <Skeleton className="h-16 w-full" /> : certs?.map(cert => (
              <Card key={cert.id} className="border-border bg-card">
                <CardContent className="pt-4 flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{cert.name}</p>
                    <p className="text-sm text-muted-foreground">{cert.issuingOrganization}{cert.issueDate ? ` · ${cert.issueDate}` : ""}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={async () => {
                    await deleteCert.mutateAsync({ id: cert.id });
                    qc.invalidateQueries({ queryKey: getListCertificationsQueryKey() });
                    toast({ title: "Certification removed" });
                  }} className="text-destructive">Remove</Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
