import mammoth from "mammoth";
import { commonSkills } from "@workspace/taxonomy";

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

export type CvImportSuggestion = {
  profile: CvProfileSuggestion;
  workExperiences: CvWorkSuggestion[];
  education: CvEducationSuggestion[];
  skills: CvSkillSuggestion[];
  certifications: CvCertificationSuggestion[];
  warnings: string[];
};

const SECTION_ALIASES: Record<string, string[]> = {
  summary: ["summary", "profile", "professional summary", "career profile", "about"],
  experience: ["experience", "employment", "work experience", "professional experience", "career history"],
  education: ["education", "academic background", "qualifications"],
  skills: ["skills", "technical skills", "key skills", "competencies"],
  certifications: ["certifications", "certificates", "licenses", "licences", "professional development"],
};

const SKILL_WORDS = commonSkills.map((skill) => skill.label.toLowerCase());
const CV_PARSE_TIMEOUT_MS = 10_000;

export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await withParsingTimeout(parser.getText());
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await withParsingTimeout(mammoth.extractRawText({ buffer }));
    return result.value;
  }

  throw new Error("Only PDF and DOCX files are supported.");
}

function withParsingTimeout<T>(task: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      reject(new Error("CV parsing timed out. Please try a simpler PDF or DOCX file."));
    }, CV_PARSE_TIMEOUT_MS);
  });

  return Promise.race([task, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

export function parseCvText(text: string): CvImportSuggestion {
  const normalized = text.replace(/\r/g, "\n").replace(/\t/g, " ").replace(/[ ]{2,}/g, " ");
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const sections = splitSections(lines);
  const fullText = lines.join("\n");

  const profile = parseProfile(lines, sections, fullText);
  const skills = parseSkills(sections.skills ?? [], fullText);
  const workExperiences = parseWork(sections.experience ?? []);
  const education = parseEducation(sections.education ?? []);
  const certifications = parseCertifications(sections.certifications ?? []);
  const warnings: string[] = [];

  if (!profile.currentRole) warnings.push("Could not confidently identify a current role.");
  if (workExperiences.length === 0) warnings.push("No structured work experience entries were detected.");
  if (education.length === 0) warnings.push("No structured education entries were detected.");
  if (skills.length === 0) warnings.push("No skills were detected from the CV text.");

  return {
    profile,
    workExperiences,
    education,
    skills,
    certifications,
    warnings,
  };
}

function splitSections(lines: string[]): Record<string, string[]> {
  const sections: Record<string, string[]> = {};
  let current = "summary";

  for (const line of lines) {
    const key = detectSection(line);
    if (key) {
      current = key;
      sections[current] ??= [];
      continue;
    }

    sections[current] ??= [];
    sections[current].push(line);
  }

  return sections;
}

function detectSection(line: string): string | null {
  const normalized = line.toLowerCase().replace(/[:\-]/g, "").trim();
  if (normalized.length > 40) return null;

  for (const [key, aliases] of Object.entries(SECTION_ALIASES)) {
    if (aliases.includes(normalized)) return key;
  }

  return null;
}

function parseProfile(lines: string[], sections: Record<string, string[]>, fullText: string): CvProfileSuggestion {
  const emailIndex = lines.findIndex((line) => /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(line));
  const phone = fullText.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim();
  const linkedinUrl = fullText.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+|linkedin\.com\/[^\s)]+/i)?.[0];
  const yearsExperience = Number(fullText.match(/(\d{1,2})\+?\s+years?(?:\s+of)?\s+experience/i)?.[1]);
  const headlineCandidates = lines.slice(0, Math.max(emailIndex, 5)).filter((line) => {
    return !line.includes("@") && !/\d{3,}/.test(line) && !/linkedin|github|portfolio/i.test(line);
  });
  const currentRole = headlineCandidates.find((line) => /manager|engineer|analyst|developer|consultant|director|lead|specialist|architect|officer|coordinator/i.test(line));
  const summaryLines = (sections.summary ?? []).filter((line) => line.length > 30).slice(0, 4);

  return compactObject({
    currentRole,
    totalExperienceMonths: Number.isFinite(yearsExperience) ? yearsExperience * 12 : undefined,
    location: findLocation(lines),
    phone,
    linkedinUrl: linkedinUrl?.startsWith("http") ? linkedinUrl : linkedinUrl ? `https://${linkedinUrl}` : undefined,
    professionalSummary: summaryLines.join(" "),
    careerLevel: inferCareerLevel(currentRole, yearsExperience),
  });
}

function parseSkills(sectionLines: string[], fullText: string): CvSkillSuggestion[] {
  const raw = sectionLines.length > 0 ? sectionLines.join(", ") : fullText;
  const explicit = raw
    .split(/[,;|•]/)
    .map((part) => part.replace(/^[-*]\s*/, "").trim())
    .filter((part) => part.length >= 2 && part.length <= 40);
  const keywordMatches = SKILL_WORDS.filter((skill) => new RegExp(`\\b${escapeRegExp(skill)}\\b`, "i").test(fullText));
  const names = unique([...explicit, ...keywordMatches]).slice(0, 20);

  return names.map((name) => ({
    name,
    category: inferSkillCategory(name),
    proficiencyLevel: "Intermediate",
  }));
}

function parseWork(lines: string[]): CvWorkSuggestion[] {
  const entries: CvWorkSuggestion[] = [];
  const datePattern = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+)?(20\d{2}|19\d{2})\s*(?:-|–|to)\s*((?:present|current)|(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+)?(?:20\d{2}|19\d{2}))/i;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const dateMatch = line.match(datePattern);
    if (!dateMatch) continue;

    const previous = lines[index - 1] ?? "";
    const titleCompany = previous || line.replace(datePattern, "").trim();
    const [title, company] = splitTitleCompany(titleCompany);
    const startDate = normalizeMonthYear(`${dateMatch[1] ?? ""}${dateMatch[2]}`);
    const isCurrent = /present|current/i.test(dateMatch[3]);
    const description = lines.slice(index + 1, index + 5).filter((item) => !datePattern.test(item)).join(" ");

    if (title && company && startDate) {
      entries.push({
        company,
        title,
        startDate,
        endDate: isCurrent ? undefined : normalizeMonthYear(dateMatch[3]),
        isCurrent,
        description: description || undefined,
      });
    }
  }

  return entries.slice(0, 6);
}

function parseEducation(lines: string[]): CvEducationSuggestion[] {
  const entries: CvEducationSuggestion[] = [];
  const degreePattern = /\b(PhD|Doctorate|MBA|MSc|MA|BSc|BA|BEng|MEng|Bachelor|Master|Diploma|Certificate)\b/i;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!degreePattern.test(line)) continue;

    const years = line.match(/(19\d{2}|20\d{2})/g) ?? lines[index + 1]?.match(/(19\d{2}|20\d{2})/g) ?? [];
    const startYear = Number(years[0] ?? years[years.length - 1]);
    if (!Number.isFinite(startYear)) continue;

    const institution = lines[index + 1] && !/(19\d{2}|20\d{2})/.test(lines[index + 1]) ? lines[index + 1] : "Institution";

    entries.push({
      institution,
      degree: line.replace(/\s+(19\d{2}|20\d{2}).*$/, "").trim(),
      startDate: `${startYear}-01-01`,
      endDate: years[1] ? `${Number(years[1])}-01-01` : undefined,
      isCurrent: /present|current/i.test(line),
    });
  }

  return entries.slice(0, 4);
}

function parseCertifications(lines: string[]): CvCertificationSuggestion[] {
  return lines
    .filter((line) => /certified|certificate|certification|license|licence|aws|azure|pmp|scrum|prince2/i.test(line))
    .slice(0, 8)
    .map((line) => ({
      name: line.replace(/\s+(19\d{2}|20\d{2}).*$/, "").trim(),
      issuingOrganization: "Review required",
      issueDate: normalizeMonthYear(line.match(/(19\d{2}|20\d{2})/)?.[0] ?? ""),
    }));
}

function splitTitleCompany(value: string): [string, string] {
  const parts = value.split(/\s+(?:at|@|-|–)\s+/i).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts.slice(1).join(" - ")];
  return ["", ""];
}

function normalizeMonthYear(value: string): string {
  const match = value.match(/(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+)?(20\d{2}|19\d{2})/i);
  if (!match) return "";
  const month = match[1] ? monthNumber(match[1]) : "01";
  return `${match[2]}-${month}-01`;
}

function monthNumber(value: string): string {
  const key = value.toLowerCase().slice(0, 3);
  const month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(key) + 1;
  return String(Math.max(1, Math.min(12, month || 1))).padStart(2, "0");
}

function inferCareerLevel(role?: string, yearsExperience?: number): string | undefined {
  if (role && /director|head|chief|vp|vice president/i.test(role)) return "Executive";
  if (role && /senior|lead|principal|manager/i.test(role)) return "Senior";
  if (yearsExperience != null && yearsExperience >= 8) return "Senior";
  if (yearsExperience != null && yearsExperience >= 3) return "Mid-level";
  if (yearsExperience != null) return "Early career";
  return undefined;
}

function inferSkillCategory(skill: string): string {
  if (/leadership|management|stakeholder|budget|risk|agile/i.test(skill)) return "Management";
  if (/communication|presentation|writing/i.test(skill)) return "Communication";
  if (/analysis|sql|tableau|excel|machine learning/i.test(skill)) return "Analytical";
  return "Technical";
}

function findLocation(lines: string[]): string | undefined {
  return lines.slice(0, 8).find((line) => /\b(UK|United Kingdom|London|Manchester|Birmingham|Remote|Hybrid)\b/i.test(line));
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== "")) as T;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
