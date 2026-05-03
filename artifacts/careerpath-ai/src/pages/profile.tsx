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
import { Plus, Trash2, Save, User, Briefcase, GraduationCap, Star, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  const pf = (field: string) => profileForm[field] ?? (profile as any)?.[field] ?? "";

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const data: any = {};
    if (profileForm.currentRole !== undefined) data.currentRole = profileForm.currentRole;
    if (profileForm.yearsExperience !== undefined) data.yearsExperience = parseInt(profileForm.yearsExperience);
    if (profileForm.industry !== undefined) data.industry = profileForm.industry;
    if (profileForm.location !== undefined) data.location = profileForm.location;
    if (profileForm.phone !== undefined) data.phone = profileForm.phone;
    if (profileForm.linkedinUrl !== undefined) data.linkedinUrl = profileForm.linkedinUrl;
    if (profileForm.professionalSummary !== undefined) data.professionalSummary = profileForm.professionalSummary;
    if (profileForm.preferredLearningStyle !== undefined) data.preferredLearningStyle = profileForm.preferredLearningStyle;
    if (profileForm.weeklyLearningHours !== undefined) data.weeklyLearningHours = parseInt(profileForm.weeklyLearningHours);
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
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Professional Profile</h1>
          <p className="text-muted-foreground mt-1">Build a complete picture of your career to date.</p>
        </div>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="personal"><User className="w-4 h-4 mr-2" />Personal</TabsTrigger>
            <TabsTrigger value="work"><Briefcase className="w-4 h-4 mr-2" />Work History</TabsTrigger>
            <TabsTrigger value="education"><GraduationCap className="w-4 h-4 mr-2" />Education</TabsTrigger>
            <TabsTrigger value="skills"><Star className="w-4 h-4 mr-2" />Skills</TabsTrigger>
            <TabsTrigger value="certifications"><Award className="w-4 h-4 mr-2" />Certifications</TabsTrigger>
          </TabsList>

          {/* Personal Tab */}
          <TabsContent value="personal">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle>Personal & Professional Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {loadingProfile ? <Skeleton className="h-40 w-full" /> : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: "Current Role", key: "currentRole", placeholder: "e.g. Senior Project Manager" },
                        { label: "Industry", key: "industry", placeholder: "e.g. Technology, Finance" },
                        { label: "Career Level", key: "careerLevel", placeholder: "e.g. Mid-level, Senior, Director" },
                        { label: "Location", key: "location", placeholder: "e.g. London, UK" },
                        { label: "Phone", key: "phone", placeholder: "Optional" },
                        { label: "LinkedIn URL", key: "linkedinUrl", placeholder: "https://linkedin.com/in/..." },
                        { label: "Years of Experience", key: "yearsExperience", placeholder: "e.g. 5", type: "number" },
                        { label: "Weekly Learning Hours", key: "weeklyLearningHours", placeholder: "e.g. 5", type: "number" },
                        { label: "Preferred Learning Style", key: "preferredLearningStyle", placeholder: "e.g. Self-paced, Instructor-led" },
                        { label: "Salary Aspiration", key: "salaryAspiration", placeholder: "e.g. £80,000–£100,000" },
                      ].map(({ label, key, placeholder, type }) => (
                        <div key={key}>
                          <label className="text-sm font-medium text-muted-foreground mb-1 block">{label}</label>
                          <Input
                            type={type ?? "text"}
                            placeholder={placeholder}
                            value={pf(key)}
                            onChange={e => setProfileForm(prev => ({ ...prev, [key]: e.target.value }))}
                            className="bg-background border-border"
                          />
                        </div>
                      ))}
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
                  <Plus className="w-4 h-4 mr-2" /> Add Entry
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
                  }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
                  <Plus className="w-4 h-4 mr-2" /> Add Education
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
                  }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
                    <button onClick={async () => {
                      await deleteSkill.mutateAsync({ id: skill.id });
                      qc.invalidateQueries({ queryKey: getListSkillsQueryKey() });
                    }} className="ml-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
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
                  <Plus className="w-4 h-4 mr-2" /> Add Certification
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
                  }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
