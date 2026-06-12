import { useMemo, useState } from "react";
import {
  useGetProfile,
  useListCertifications,
  useListEducation,
  useListSkills,
  useListWorkExperiences,
  type Certification,
  type Education,
  type Profile,
  type Skill,
  type WorkExperience,
  useGetMe,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type CvTemplate = "modern" | "ats" | "executive" | "academic";
type LanguageStyle = "human" | "confident" | "concise";

const TEMPLATES: Array<{ id: CvTemplate; label: string; description: string }> = [
  { id: "modern", label: "Modern Impact", description: "Readable, polished, and strong for digital roles." },
  { id: "ats", label: "ATS Clean", description: "Simple structure for recruiter systems and job boards." },
  { id: "executive", label: "Executive", description: "Leadership-forward with stronger commercial framing." },
  { id: "academic", label: "Academic", description: "Qualifications, research, and evidence first." },
];

const LANGUAGE_STYLES: Array<{ id: LanguageStyle; label: string; description: string }> = [
  { id: "human", label: "Humanised", description: "Natural, warm, and credible." },
  { id: "confident", label: "Confident", description: "Sharper impact language." },
  { id: "concise", label: "Concise", description: "Short, direct, and ATS-friendly." },
];

export default function CvStudio() {
  const { toast } = useToast();
  const { data: user } = useGetMe();
  const { data: profile, isLoading: loadingProfile } = useGetProfile();
  const { data: work = [], isLoading: loadingWork } = useListWorkExperiences();
  const { data: education = [], isLoading: loadingEducation } = useListEducation();
  const { data: skills = [], isLoading: loadingSkills } = useListSkills();
  const { data: certifications = [], isLoading: loadingCertifications } = useListCertifications();
  const [template, setTemplate] = useState<CvTemplate>("modern");
  const [languageStyle, setLanguageStyle] = useState<LanguageStyle>("human");

  const loading = loadingProfile || loadingWork || loadingEducation || loadingSkills || loadingCertifications;
  const cv = useMemo(
    () => buildCv({
      profile,
      work,
      education,
      skills,
      certifications,
      name: user?.name,
      template,
      languageStyle,
    }),
    [certifications, education, languageStyle, profile, skills, template, user?.name, work],
  );

  const copyText = async () => {
    await navigator.clipboard.writeText(cv.plainText);
    toast({ title: "CV copied", description: "The recreated CV text is ready to paste into Word, Google Docs, or LinkedIn." });
  };

  const downloadHtml = () => {
    const blob = new Blob([cv.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slug(profile?.currentRole ?? "careerpathx-cv")}-${template}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-8 p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">CV Studio</p>
            <h1 className="text-3xl font-bold tracking-tight">Recreate Your CV</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              Turn your saved profile into a cleaner CV with template choices and more human language. Review everything before sending it to employers.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={copyText}>Copy text</Button>
            <Button variant="outline" onClick={() => window.print()}>Print</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={downloadHtml}>Download HTML</Button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <Skeleton className="h-96" />
            <Skeleton className="h-[720px]" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <aside className="space-y-5">
              <Card className="blue-card">
                <CardHeader>
                  <CardTitle>Template</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {TEMPLATES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTemplate(item.id)}
                      className={`rounded-xl border p-4 text-left transition-colors ${template === item.id ? "border-primary bg-primary/15" : "border-border bg-background/40 hover:border-primary/40"}`}
                    >
                      <span className="font-semibold">{item.label}</span>
                      <span className="mt-1 block text-sm leading-6 text-muted-foreground">{item.description}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className="blue-card">
                <CardHeader>
                  <CardTitle>Language</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {LANGUAGE_STYLES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLanguageStyle(item.id)}
                      className={`rounded-xl border p-4 text-left transition-colors ${languageStyle === item.id ? "border-primary bg-primary/15" : "border-border bg-background/40 hover:border-primary/40"}`}
                    >
                      <span className="font-semibold">{item.label}</span>
                      <span className="mt-1 block text-sm leading-6 text-muted-foreground">{item.description}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className="blue-card-strong">
                <CardHeader>
                  <CardTitle>Readiness Check</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CheckRow label="Profile" complete={Boolean(profile?.currentRole && profile.professionalSummary)} />
                  <CheckRow label="Work history" complete={work.length > 0} />
                  <CheckRow label="Skills" complete={skills.length >= 3} />
                  <CheckRow label="Education" complete={education.length > 0} />
                  <p className="pt-2 text-sm leading-6 text-muted-foreground">
                    The CV is regenerated from your saved data. Edit profile details first if something looks wrong.
                  </p>
                </CardContent>
              </Card>
            </aside>

            <main className="space-y-5">
              <Card className="blue-card">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-primary/30 bg-primary/15 text-primary" variant="outline">{templateLabel(template)}</Badge>
                    <Badge variant="secondary">{languageLabel(languageStyle)}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <CvPreview cv={cv} template={template} />
                </CardContent>
              </Card>

              <Card className="blue-card">
                <CardHeader>
                  <CardTitle>Plain Text Version</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea value={cv.plainText} readOnly rows={16} className="border-border bg-background font-mono text-sm leading-6" />
                </CardContent>
              </Card>
            </main>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function CheckRow({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg blue-tile px-3 py-2">
      <span className="text-sm font-medium">{label}</span>
      <Badge variant={complete ? "secondary" : "outline"}>{complete ? "Ready" : "Needs review"}</Badge>
    </div>
  );
}

function CvPreview({ cv, template }: { cv: BuiltCv; template: CvTemplate }) {
  return (
    <article className={`rounded-2xl bg-white p-8 text-slate-950 shadow-2xl ${template === "executive" ? "border-t-8 border-slate-900" : template === "modern" ? "border-t-8 border-cyan-500" : "border border-slate-200"}`}>
      <header className={template === "ats" ? "border-b border-slate-300 pb-4" : "pb-5"}>
        <h2 className="text-3xl font-black tracking-tight">{cv.name}</h2>
        <p className="mt-1 text-lg font-semibold text-slate-700">{cv.headline}</p>
        <p className="mt-2 text-sm text-slate-600">{cv.contactLine}</p>
      </header>

      <PreviewSection title={template === "executive" ? "Executive Profile" : "Profile"} items={[cv.summary]} paragraph />
      <PreviewSection title="Core Skills" items={cv.skillLines} compact />
      <PreviewSection title="Experience" items={cv.experienceLines} />
      <PreviewSection title="Education" items={cv.educationLines} />
      {cv.certificationLines.length > 0 && <PreviewSection title="Certifications" items={cv.certificationLines} compact />}
    </article>
  );
}

function PreviewSection({ title, items, paragraph = false, compact = false }: { title: string; items: string[]; paragraph?: boolean; compact?: boolean }) {
  if (items.length === 0) return null;

  return (
    <section className="mt-6">
      <h3 className="border-b border-slate-300 pb-1 text-sm font-black uppercase tracking-widest text-slate-700">{title}</h3>
      {paragraph ? (
        <p className="mt-3 text-sm leading-7 text-slate-700">{items[0]}</p>
      ) : compact ? (
        <p className="mt-3 text-sm leading-7 text-slate-700">{items.join(" | ")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item} className="text-sm leading-7 text-slate-700">{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

type BuildCvInput = {
  profile?: Profile;
  work: WorkExperience[];
  education: Education[];
  skills: Skill[];
  certifications: Certification[];
  name?: string;
  template: CvTemplate;
  languageStyle: LanguageStyle;
};

type BuiltCv = {
  name: string;
  headline: string;
  contactLine: string;
  summary: string;
  skillLines: string[];
  experienceLines: string[];
  educationLines: string[];
  certificationLines: string[];
  plainText: string;
  html: string;
};

function buildCv(input: BuildCvInput): BuiltCv {
  const { profile, work, education, skills, certifications, name: accountName, template, languageStyle } = input;
  const name = accountName?.trim() || "Your Name";
  const headline = profile?.currentRole ?? "Career transition candidate";
  const contactLine = [profile?.location, profile?.phone, profile?.linkedinUrl].filter(Boolean).join(" | ") || "Location | Phone | LinkedIn";
  const topSkills = skills.slice(0, 12).map((skill) => skill.name);
  const summary = buildSummary(profile, topSkills, languageStyle, template);
  const skillLines = groupSkills(skills);
  const experienceLines = buildExperience(work, languageStyle);
  const educationLines = education.map((item) => `${item.degree}${item.fieldOfStudy ? `, ${item.fieldOfStudy}` : ""} - ${item.institution} (${formatDateRange(item.startDate, item.endDate, item.isCurrent)})`);
  const certificationLines = certifications.map((item) => `${item.name} - ${item.issuingOrganization}${item.issueDate ? ` (${formatYear(item.issueDate)})` : ""}`);
  const sections = [
    name,
    headline,
    contactLine,
    "",
    "PROFILE",
    summary,
    "",
    "CORE SKILLS",
    skillLines.join(" | "),
    "",
    "EXPERIENCE",
    ...experienceLines,
    "",
    "EDUCATION",
    ...educationLines,
    "",
    "CERTIFICATIONS",
    ...certificationLines,
  ].filter((line, index, list) => line !== "CERTIFICATIONS" || certificationLines.length > 0 || list[index + 1]);
  const plainText = sections.join("\n");

  return {
    name,
    headline,
    contactLine,
    summary,
    skillLines,
    experienceLines,
    educationLines,
    certificationLines,
    plainText,
    html: buildHtml({ name, headline, contactLine, summary, skillLines, experienceLines, educationLines, certificationLines }, template),
  };
}

function buildSummary(profile: Profile | undefined, skills: string[], style: LanguageStyle, template: CvTemplate) {
  if (profile?.professionalSummary) {
    return humanise(profile.professionalSummary, style);
  }

  const focus = skills.slice(0, 4).join(", ") || "career development, stakeholder communication, and delivery";
  if (template === "executive") {
    return humanise(`Commercially minded professional with experience across ${focus}. Known for translating complex goals into practical plans, building trust with stakeholders, and keeping delivery focused on measurable outcomes.`, style);
  }
  if (template === "academic") {
    return humanise(`Evidence-led professional with a developing profile across ${focus}. Brings structured thinking, research discipline, and a clear commitment to building credible role-ready proof.`, style);
  }
  return humanise(`Motivated professional building a focused path into the target role, with strengths across ${focus}. Combines practical learning with a clear bias for useful, employer-ready evidence.`, style);
}

function humanise(text: string, style: LanguageStyle) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (style === "concise") return cleaned.split(".").filter(Boolean).slice(0, 2).join(". ") + ".";
  if (style === "confident") return cleaned.replace(/\bhelped\b/gi, "led").replace(/\bworked on\b/gi, "delivered").replace(/\bresponsible for\b/gi, "owned");
  return cleaned.replace(/\butilized\b/gi, "used").replace(/\bleveraged\b/gi, "used").replace(/\bsynergy\b/gi, "collaboration");
}

function buildExperience(work: WorkExperience[], style: LanguageStyle) {
  if (work.length === 0) {
    return ["Add work experience in My Profile to generate stronger role-specific achievement bullets."];
  }

  return work.flatMap((item) => {
    const dateRange = formatDateRange(item.startDate, item.endDate, item.isCurrent);
    const intro = `${item.title} - ${item.company} (${dateRange})`;
    const description = item.description
      ? humanise(item.description, style)
      : `Delivered practical work across ${item.skills || "core responsibilities"}, building evidence of ownership, communication, and reliable follow-through.`;
    const bullet = style === "concise"
      ? `- ${description}`
      : `- ${description} Focused on outcomes, clarity, and visible progress.`;
    return [intro, bullet];
  });
}

function groupSkills(skills: Skill[]) {
  if (skills.length === 0) return ["Add skills in My Profile to populate this section."];
  const groups = skills.reduce<Record<string, string[]>>((acc, skill) => {
    acc[skill.category] ??= [];
    acc[skill.category].push(skill.name);
    return acc;
  }, {});
  return Object.entries(groups).map(([category, names]) => `${category}: ${names.slice(0, 8).join(", ")}`);
}

function formatDateRange(startDate: string, endDate?: string | null, isCurrent?: boolean) {
  return `${formatYear(startDate)} - ${isCurrent ? "Present" : endDate ? formatYear(endDate) : "Present"}`;
}

function formatYear(value?: string | null) {
  if (!value) return "Present";
  return value.slice(0, 4);
}

function templateLabel(template: CvTemplate) {
  return TEMPLATES.find((item) => item.id === template)?.label ?? template;
}

function languageLabel(languageStyle: LanguageStyle) {
  return LANGUAGE_STYLES.find((item) => item.id === languageStyle)?.label ?? languageStyle;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "careerpathx-cv";
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildHtml(cv: Omit<BuiltCv, "plainText" | "html">, template: CvTemplate) {
  const accent = template === "modern" ? "#0891b2" : template === "executive" ? "#111827" : template === "academic" ? "#4f46e5" : "#334155";
  const list = (items: string[]) => items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(cv.name)} CV</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 40px; line-height: 1.55; }
    h1 { margin: 0; font-size: 34px; }
    h2 { color: ${accent}; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 28px; font-size: 14px; letter-spacing: 0.12em; text-transform: uppercase; }
    .headline { font-size: 18px; font-weight: 700; color: #334155; margin-top: 4px; }
    .contact { color: #64748b; margin-top: 8px; font-size: 13px; }
    li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(cv.name)}</h1>
  <div class="headline">${escapeHtml(cv.headline)}</div>
  <div class="contact">${escapeHtml(cv.contactLine)}</div>
  <h2>Profile</h2>
  <p>${escapeHtml(cv.summary)}</p>
  <h2>Core Skills</h2>
  <p>${cv.skillLines.map(escapeHtml).join(" | ")}</p>
  <h2>Experience</h2>
  <ul>${list(cv.experienceLines)}</ul>
  <h2>Education</h2>
  <ul>${list(cv.educationLines)}</ul>
  ${cv.certificationLines.length ? `<h2>Certifications</h2><ul>${list(cv.certificationLines)}</ul>` : ""}
</body>
</html>`;
}
