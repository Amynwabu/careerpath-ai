import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import mammoth from "mammoth";
import type { CareerIntelligenceEngine } from "@workspace/career-intelligence";
import type {
  AchievementEvidence,
  CareerProfile,
  CredentialEvidence,
  DetectedSection,
  EducationEpisode,
  EmploymentEpisode,
  ExtractedDocument,
  FileType,
  NormalizedDateRange,
  ProfileCorrection,
  ProfileValidation,
  ProjectEvidence,
  RawSkillEvidence,
  RetentionMode,
  SourceReference,
} from "./types";

const pdfParse = createRequire(import.meta.url)(
  "pdf-parse/lib/pdf-parse.js",
) as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;

const maxFileSize = 8 * 1024 * 1024;
const supported: Record<string, { type: FileType; mime: string[] }> = {
  pdf: { type: "pdf", mime: ["application/pdf"] },
  docx: {
    type: "docx",
    mime: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
  txt: { type: "text", mime: ["text/plain"] },
  md: { type: "markdown", mime: ["text/markdown", "text/plain"] },
};

const headingTypes: Array<[RegExp, string]> = [
  [/^(profile|professional summary|career summary|summary)$/i, "summary"],
  [/^(employment history|work experience|professional experience|experience)$/i, "employment"],
  [/^(education|academic background)$/i, "education"],
  [/^(qualifications?)$/i, "qualifications"],
  [/^(certifications?|training|licences?)$/i, "certifications"],
  [/^(skills|technical skills|core competencies)$/i, "skills"],
  [/^(projects?|selected projects)$/i, "projects"],
  [/^(achievements?|awards?)$/i, "achievements"],
  [/^(professional memberships?)$/i, "memberships"],
  [/^(publications?)$/i, "publications"],
  [/^(volunteering|voluntary experience)$/i, "volunteering"],
  [/^(languages?)$/i, "languages"],
  [/^(references?)$/i, "references"],
];

export async function parseCareerDocument(input: {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  retentionMode?: RetentionMode;
}): Promise<ExtractedDocument> {
  const retentionMode = input.retentionMode ?? "process_only";
  const extension = safeExtension(input.fileName);
  const config = supported[extension];
  if (!config) throw profileError("unsupported_file_type", "Unsupported file type.");
  if (!config.mime.includes(input.mimeType)) {
    throw profileError("mime_mismatch", "File MIME type does not match its extension.");
  }
  if (input.bytes.byteLength === 0) throw profileError("empty_file", "File is empty.");
  if (input.bytes.byteLength > maxFileSize) {
    throw profileError("file_too_large", `File exceeds ${maxFileSize} bytes.`);
  }
  validateSignature(config.type, input.bytes);
  const documentId = `doc_${hash(input.bytes, 16)}`;
  let originalText = "";
  let pageCount: number | null = 1;
  const warnings: string[] = [];
  if (config.type === "pdf") {
    const raw = Buffer.from(input.bytes);
    if (raw.includes(Buffer.from("/Encrypt"))) {
      throw profileError("password_protected", "Password-protected PDFs are unsupported.");
    }
    try {
      const result = await pdfParse(raw) as {
        text: string;
        numpages: number;
      };
      originalText = result.text;
      pageCount = result.numpages;
    } catch {
      throw profileError("corrupt_pdf", "PDF text extraction failed.");
    }
    if (!originalText.trim()) {
      return {
        documentId,
        fileSizeBytes: input.bytes.byteLength,
        fileType: "pdf",
        pageCount,
        originalText: "",
        text: "",
        blocks: [],
        warnings: ["No embedded text was found; explicit OCR is required."],
        extractionStatus: "ocr_required",
        extractionConfidence: 0,
        retentionMode,
      };
    }
  } else if (config.type === "docx") {
    const raw = Buffer.from(input.bytes);
    validateDocxArchive(raw);
    if (raw.includes(Buffer.from("vbaProject.bin"))) {
      throw profileError("macro_enabled_document", "Macro-enabled Office documents are unsupported.");
    }
    try {
      const result = await mammoth.extractRawText({
        buffer: raw,
      });
      originalText = result.value;
      warnings.push(
        ...result.messages.map((message) => `DOCX parser: ${message.message}`),
      );
    } catch {
      throw profileError("corrupt_docx", "DOCX text extraction failed.");
    }
  } else {
    originalText = new TextDecoder("utf-8", { fatal: false }).decode(input.bytes);
    if (originalText.includes("\uFFFD")) {
      warnings.push("Malformed Unicode bytes were replaced during decoding.");
    }
  }
  if (/https?:\/\//i.test(originalText)) {
    warnings.push("External links were preserved as text and were not followed.");
  }
  const text = normalizeDocumentText(originalText);
  const blocks = blockify(documentId, text);
  return {
    documentId,
    fileSizeBytes: input.bytes.byteLength,
    fileType: config.type,
    pageCount,
    originalText,
    text,
    blocks,
    warnings,
    extractionStatus: "complete",
    extractionConfidence: config.type === "pdf" ? 0.97 : 0.99,
    retentionMode,
  };
}

export function normalizeDocumentText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\0/g, "")
    .replace(/[•◦▪●]/g, "-")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/[ \t]+/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function detectSections(document: ExtractedDocument): DetectedSection[] {
  const lines = document.text.split("\n");
  const offsets: number[] = [];
  let offset = 0;
  for (const line of lines) {
    offsets.push(offset);
    offset += line.length + 1;
  }
  const headings = lines
    .map((line, index) => {
      const clean = line.replace(/^#+\s*/, "").replace(/:$/, "").trim();
      const type = headingTypes.find(([pattern]) => pattern.test(clean))?.[1];
      return type ? { index, heading: clean, type } : null;
    })
    .filter(Boolean) as Array<{ index: number; heading: string; type: string }>;
  if (!headings.length) {
    return [{
      sectionId: `section_${hash(document.documentId + ":unknown", 12)}`,
      sectionType: "unknown",
      heading: "",
      startOffset: 0,
      endOffset: document.text.length,
      confidence: 0.4,
      text: document.text,
    }];
  }
  return headings.map((heading, index) => {
    const start = offsets[heading.index] ?? 0;
    const end = offsets[headings[index + 1]?.index ?? lines.length] ?? document.text.length;
    return {
      sectionId: `section_${hash(`${document.documentId}:${heading.type}:${start}`, 12)}`,
      sectionType: heading.type,
      heading: heading.heading,
      startOffset: start,
      endOffset: end,
      confidence: 0.97,
      text: document.text.slice(start, end),
    };
  });
}

export function normalizeDateRange(raw: string): NormalizedDateRange {
  const cleaned = raw.trim();
  const parts = cleaned.split(/\s+(?:-|to)\s+/i);
  const start = parsePartialDate(parts[0] ?? "");
  const endRaw = parts[1] ?? "";
  const current = /^(present|current|ongoing|now)$/i.test(endRaw);
  const end = current ? null : parsePartialDate(endRaw);
  const precision =
    start.precision === "month" && (current || end?.precision === "month")
      ? "month"
      : start.precision === "year"
        ? "year"
        : start.precision;
  return {
    raw: cleaned,
    start: start.value,
    end: end?.value ?? null,
    precision,
    confidence: start.value && (end?.value || current) ? 0.98 : start.confidence,
  };
}

export function buildCareerProfile(input: {
  document: ExtractedDocument;
  structured?: {
    jobTitle?: string;
    careerSummary?: string;
    employment?: Partial<EmploymentEpisode>[];
    education?: Partial<EducationEpisode>[];
    certifications?: string[];
    skills?: string[];
    projects?: Partial<ProjectEvidence>[];
    desiredOccupation?: string;
    desiredCareerHorizon?: string;
  };
  now?: string;
}): CareerProfile {
  if (input.document.extractionStatus !== "complete") {
    throw profileError("extraction_incomplete", "Document extraction is incomplete.");
  }
  const sections = detectSections(input.document);
  const provenance: SourceReference[] = [];
  const employment = extractEmployment(input.document, sections, provenance);
  const education = extractEducation(input.document, sections, provenance);
  const certifications = extractCredentials(input.document, sections, provenance);
  const projects = extractProjects(input.document, sections, provenance);
  const achievements = extractAchievements(input.document, sections, provenance);
  const rawSkillEvidence = extractSkillEvidence(input.document, sections, provenance);
  const structured = input.structured ?? {};
  if (structured.jobTitle) {
    employment.unshift({
      employmentId: `employment_${hash(`manual:${structured.jobTitle}`, 12)}`,
      employer: null,
      jobTitle: structured.jobTitle,
      location: null,
      dates: null,
      isCurrent: true,
      durationMonths: null,
      summary: "",
      responsibilities: [],
      achievements: [],
      projects: [],
      tools: [],
      skillEvidence: [],
      sourceReferences: [],
      evidenceState: "user_confirmed",
    });
  }
  for (const skill of structured.skills ?? []) {
    rawSkillEvidence.push({
      evidenceId: `evidence_${hash(`manual:${skill}`, 12)}`,
      rawSkill: skill,
      sourceText: skill,
      section: "structured_input",
      employmentId: null,
      evidenceType: "explicit",
      confidence: 1,
      ruleId: null,
      sourceReferences: [],
      state: "user_confirmed",
    });
  }
  const personalData = extractPersonalData(input.document.text);
  const now = input.now ?? new Date().toISOString();
  const combinedEmployment = [
    ...employment,
    ...(structured.employment ?? []).map((item, index) =>
      normalizeStructuredEmployment(item, index),
    ),
  ];
  const combinedEducation = [
    ...education,
    ...(structured.education ?? []).map((item, index) =>
      normalizeStructuredEducation(item, index),
    ),
  ];
  const combinedProjects = [
    ...projects,
    ...(structured.projects ?? []).map((item, index) =>
      normalizeStructuredProject(item, index),
    ),
  ];
  const summary =
    structured.careerSummary ??
    sections.find((section) => section.sectionType === "summary")?.text
      .replace(/^.*\n?/, "")
      .trim() ??
    "";
  const profileId = `cpx_profile_${hash(
    `${input.document.documentId}:${summary}:${employment.map((item) => item.jobTitle).join("|")}`,
    16,
  )}`;
  const profile: CareerProfile = {
    profileVersion: "1.0",
    profileId,
    sourceDocumentIds: [input.document.documentId],
    personalData,
    summary,
    employment: combinedEmployment,
    education: combinedEducation,
    certifications: [
      ...certifications,
      ...(structured.certifications ?? []).map((name) =>
        manualCredential(name),
      ),
    ],
    professionalMemberships: [],
    projects: combinedProjects,
    achievements,
    languages: extractListSection(sections, "languages"),
    rawSkillEvidence: dedupeBy(rawSkillEvidence, (item) => item.evidenceId),
    resolvedSkills: [],
    occupationResolution: null,
    occupationEvidence: {
      titles: combinedEmployment
        .filter((item) => item.jobTitle)
        .map((item) => ({
          title: item.jobTitle!,
          employmentId: item.employmentId,
          isCurrent: item.isCurrent,
        })),
      industries: [],
      rawSkillTerms: rawSkillEvidence.map((item) => item.rawSkill),
      senioritySignals: combinedEmployment
        .flatMap((item) =>
          (item.jobTitle ?? "").match(/\b(senior|lead|principal|head|director)\b/gi) ?? [],
        )
        .map((item) => item.toLowerCase()),
    },
    careerPreferences:
      structured.desiredOccupation || structured.desiredCareerHorizon
        ? {
            desiredOccupation: structured.desiredOccupation ?? null,
            desiredCareerHorizon: structured.desiredCareerHorizon ?? null,
          }
        : null,
    warnings: [...input.document.warnings],
    provenance,
    confidence: {
      textExtraction: input.document.extractionConfidence,
      sectionDetection: average(sections.map((item) => item.confidence)),
      fieldExtraction: combinedEmployment.length || combinedEducation.length ? 0.82 : 0.5,
      evidence: rawSkillEvidence.length ? average(rawSkillEvidence.map((item) => item.confidence)) : 0,
      taxonomyResolution: null,
      profileCompleteness: completeness({
        employment: combinedEmployment,
        education: combinedEducation,
        rawSkillEvidence,
        certifications,
        careerGoal: structured.desiredOccupation,
      }),
    },
    corrections: [],
    retentionMode: input.document.retentionMode,
    createdAt: now,
    updatedAt: now,
  };
  return profile;
}

export async function resolveCareerProfile(
  profile: CareerProfile,
  engine: CareerIntelligenceEngine,
) {
  const skillText = profile.rawSkillEvidence.map((item) => item.rawSkill).join("\n");
  const skillResolution = await engine.resolveSkills({ text: skillText });
  const current = profile.occupationEvidence.titles.find((item) => item.isCurrent) ??
    profile.occupationEvidence.titles[0];
  const occupationResolution = await engine.resolveOccupation({
    jobTitle: current?.title,
    text: profile.summary,
    skillCodes: skillResolution.skills.map((item) => item.skillCode),
  });
  return {
    ...profile,
    resolvedSkills: skillResolution.skills,
    occupationResolution,
    confidence: {
      ...profile.confidence,
      taxonomyResolution: Math.min(
        skillResolution.confidence,
        occupationResolution.confidence,
      ),
    },
    updatedAt: new Date().toISOString(),
  };
}

export function validateCareerProfile(profile: CareerProfile): ProfileValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const reviewItems: string[] = [];
  if (!profile.profileId || profile.profileVersion !== "1.0")
    errors.push("Profile identity or version is invalid.");
  if (!profile.sourceDocumentIds.length)
    errors.push("At least one source document is required.");
  for (const key of [
    profile.confidence.textExtraction,
    profile.confidence.sectionDetection,
    profile.confidence.fieldExtraction,
    profile.confidence.evidence,
  ]) {
    if (key < 0 || key > 1) errors.push("Confidence values must be between 0 and 1.");
  }
  const references = new Set(profile.provenance.map((item) => item.referenceId));
  for (const employment of profile.employment) {
    for (const reference of employment.sourceReferences) {
      if (!references.has(reference))
        errors.push(`Broken provenance reference: ${reference}`);
    }
    if (
      employment.dates?.start &&
      employment.dates.end &&
      employment.dates.end < employment.dates.start
    ) {
      errors.push(`Employment date order is invalid: ${employment.employmentId}`);
    }
  }
  if (profile.employment.filter((item) => item.isCurrent).length > 1) {
    reviewItems.push("Multiple current roles may represent concurrent employment.");
  }
  if (!profile.employment.length) warnings.push("No employment evidence was extracted.");
  if (!profile.rawSkillEvidence.length) warnings.push("No raw skill evidence was extracted.");
  if (profile.occupationResolution === null)
    reviewItems.push("Canonical occupation resolution is not attached.");
  return { valid: errors.length === 0, errors, warnings, reviewItems };
}

export function redactCareerProfile(
  profile: CareerProfile,
  options: {
    employers?: boolean;
    clientNames?: string[];
  } = {},
): CareerProfile {
  const replacements = new Map<string, string>();
  for (const value of [
    profile.personalData.name,
    profile.personalData.email,
    profile.personalData.phone,
    profile.personalData.location,
    ...profile.personalData.personalUrls,
    ...profile.certifications.map((item) => item.credentialIdentifier),
    ...(options.clientNames ?? []),
  ].filter(Boolean) as string[]) {
    replacements.set(value, "[REDACTED]");
  }
  if (options.employers) {
    for (const employment of profile.employment) {
      if (employment.employer) replacements.set(employment.employer, "[EMPLOYER]");
    }
  }
  const redact = (value: string) => {
    let result = value;
    for (const [source, replacement] of replacements)
      result = result.replaceAll(source, replacement);
    return result;
  };
  return {
    ...structuredClone(profile),
    personalData: {
      name: null,
      email: null,
      phone: null,
      location: null,
      personalUrls: [],
    },
    summary: redact(profile.summary),
    employment: profile.employment.map((item) => ({
      ...item,
      employer: options.employers && item.employer ? "[EMPLOYER]" : item.employer,
      summary: redact(item.summary),
      responsibilities: item.responsibilities.map(redact),
      achievements: item.achievements.map(redact),
    })),
    certifications: profile.certifications.map((item) => ({
      ...item,
      credentialIdentifier: item.credentialIdentifier ? "[REDACTED]" : null,
    })),
    provenance: profile.provenance.map((item) => ({
      ...item,
      sourceText: redact(item.sourceText),
    })),
  };
}

export function applyProfileCorrection(
  profile: CareerProfile,
  correction: Omit<ProfileCorrection, "correctionId">,
) {
  if (!correction.correctedBy || !correction.correctedAt || !correction.correctionReason)
    throw profileError("invalid_correction", "Correction evidence is incomplete.");
  const copy = structuredClone(profile);
  const allowed = /^employment\[(\d+)\]\.(jobTitle|employer|dates)$/.exec(
    correction.fieldPath,
  );
  if (!allowed) {
    throw profileError("unsupported_correction_path", "Correction field is unsupported.");
  }
  const index = Number(allowed[1]);
  const field = allowed[2] as "jobTitle" | "employer" | "dates";
  const employment = copy.employment[index];
  if (!employment) throw profileError("invalid_correction_path", "Correction target does not exist.");
  employment[field] = correction.correctedValue as never;
  employment.evidenceState = "user_confirmed";
  copy.corrections.push({
    ...correction,
    correctionId: `correction_${hash(JSON.stringify(correction), 16)}`,
  });
  copy.updatedAt = correction.correctedAt;
  return copy;
}

export function safeLogMetadata(input: {
  document: ExtractedDocument;
  profile?: CareerProfile;
  durationMs: number;
  validationStatus?: string;
}) {
  return {
    documentId: input.document.documentId,
    fileType: input.document.fileType,
    fileSize: input.document.fileSizeBytes,
    extractionDurationMs: Math.round(input.durationMs),
    sectionCount: input.document.blocks.filter((item) => item.type === "heading").length,
    employmentCount: input.profile?.employment.length ?? 0,
    skillEvidenceCount: input.profile?.rawSkillEvidence.length ?? 0,
    validationStatus: input.validationStatus ?? "not_run",
  };
}

function extractEmployment(
  document: ExtractedDocument,
  sections: DetectedSection[],
  provenance: SourceReference[],
) {
  const section = sections.find((item) => item.sectionType === "employment");
  if (!section) return [];
  const lines = contentLines(section.text);
  const episodes: EmploymentEpisode[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const dateMatch = line.match(
      /((?:[A-Za-z]{3,9}\s+)?\d{4})\s*(?:-|to)\s*((?:[A-Za-z]{3,9}\s+)?\d{4}|present|current|ongoing)/i,
    );
    if (!dateMatch) continue;
    const prefix = line.slice(0, dateMatch.index).replace(/[|,]\s*$/, "").trim();
    const parts = prefix.split(/\s+[|@]\s+|\s+-\s+/).map((item) => item.trim());
    const jobTitle = parts[0] || null;
    const employer = parts[1] || null;
    const start = section.startOffset + section.text.indexOf(line);
    const reference = sourceRef(document, `employment[${episodes.length}].jobTitle`, line, start, "employment-extractor", 0.88);
    provenance.push(reference);
    const following = lines.slice(index + 1, index + 5).filter((item) => !/\d{4}\s*(?:-|to)\s*/i.test(item));
    episodes.push({
      employmentId: `employment_${hash(`${document.documentId}:${line}`, 12)}`,
      employer,
      jobTitle,
      location: null,
      dates: normalizeDateRange(`${dateMatch[1]} - ${dateMatch[2]}`),
      isCurrent: /present|current|ongoing/i.test(dateMatch[2]!),
      durationMonths: durationMonths(
        normalizeDateRange(`${dateMatch[1]} - ${dateMatch[2]}`),
      ),
      summary: following.join(" "),
      responsibilities: following.filter((item) => !metric(item)),
      achievements: following.filter(metric),
      projects: [],
      tools: extractTools(following.join(" ")),
      skillEvidence: [],
      sourceReferences: [reference.referenceId],
      evidenceState: "known",
    });
  }
  return episodes;
}

function extractEducation(document: ExtractedDocument, sections: DetectedSection[], provenance: SourceReference[]) {
  const section = sections.find((item) => item.sectionType === "education");
  if (!section) return [];
  return contentLines(section.text).filter((line) => /\b(BSc|BA|MSc|MA|PhD|Bachelor|Master|Diploma|Degree)\b/i.test(line)).map((line, index) => {
    const start = section.startOffset + section.text.indexOf(line);
    const reference = sourceRef(document, `education[${index}].qualification`, line, start, "education-extractor", 0.85);
    provenance.push(reference);
    const year = line.match(/\b(19|20)\d{2}\b/)?.[0];
    return {
      educationId: `education_${hash(`${document.documentId}:${line}`, 12)}`,
      institution: line.split(/\s+-\s+|\s+at\s+/i)[1] ?? null,
      qualification: line.replace(/\b(19|20)\d{2}\b/g, "").trim(),
      subject: null,
      classification: null,
      dates: year ? normalizeDateRange(year) : null,
      status: null,
      location: null,
      sourceReferences: [reference.referenceId],
    };
  });
}

function extractCredentials(document: ExtractedDocument, sections: DetectedSection[], provenance: SourceReference[]) {
  const section = sections.find((item) => item.sectionType === "certifications");
  if (!section) return [];
  return contentLines(section.text).map((line, index): CredentialEvidence => {
    const start = section.startOffset + section.text.indexOf(line);
    const reference = sourceRef(document, `certifications[${index}].name`, line, start, "certification-extractor", 0.82);
    provenance.push(reference);
    return {
      credentialId: `credential_${hash(`${document.documentId}:${line}`, 12)}`,
      name: line,
      issuingOrganisation: null,
      issueDate: line.match(/\b(19|20)\d{2}\b/)?.[0] ?? null,
      expiryDate: null,
      credentialIdentifier: line.match(/\b(?:credential|certificate)\s*(?:id|no\.?)[:\s]+([A-Z0-9-]+)/i)?.[1] ?? null,
      status: "unknown",
      type: /\blicen[cs]e\b/i.test(line) ? "licence" : /\btraining|course\b/i.test(line) ? "training" : "certification",
      sourceReferences: [reference.referenceId],
    };
  });
}

function extractProjects(document: ExtractedDocument, sections: DetectedSection[], provenance: SourceReference[]) {
  const section = sections.find((item) => item.sectionType === "projects");
  if (!section) return [];
  return contentLines(section.text).map((line, index): ProjectEvidence => {
    const start = section.startOffset + section.text.indexOf(line);
    const reference = sourceRef(document, `projects[${index}].projectName`, line, start, "project-extractor", 0.75);
    provenance.push(reference);
    return {
      projectId: `project_${hash(`${document.documentId}:${line}`, 12)}`,
      projectName: line.split(/[:|-]/)[0]?.trim() || null,
      organisation: null,
      role: null,
      industry: null,
      location: null,
      dates: null,
      projectValue: null,
      technologies: extractTools(line),
      responsibilities: [line],
      outcomes: metric(line) ? [line] : [],
      skillEvidence: [],
      sourceReferences: [reference.referenceId],
    };
  });
}

function extractAchievements(document: ExtractedDocument, sections: DetectedSection[], provenance: SourceReference[]) {
  const lines = sections.flatMap((section) => contentLines(section.text).map((line) => ({ line, section }))).filter(({ line }) => metric(line));
  return lines.map(({ line, section }, index): AchievementEvidence => {
    const match = line.match(/(?:£|\$)?([\d,.]+)\s*(%|percent|million|m|k)?/i);
    const start = section.startOffset + section.text.indexOf(line);
    const reference = sourceRef(document, `achievements[${index}].statement`, line, start, "achievement-extractor", 0.9);
    provenance.push(reference);
    return {
      achievementId: `achievement_${hash(`${document.documentId}:${line}`, 12)}`,
      statement: line,
      metricType: /cost|saving/i.test(line) ? "cost_saving" : /revenue/i.test(line) ? "revenue_impact" : "measured_outcome",
      value: match ? Number(match[1]!.replaceAll(",", "")) : null,
      unit: match?.[2]?.toLowerCase() ?? null,
      confidence: match ? 0.92 : 0.7,
      sourceText: line,
      sourceReferences: [reference.referenceId],
    };
  });
}

function extractSkillEvidence(document: ExtractedDocument, sections: DetectedSection[], provenance: SourceReference[]) {
  const evidence: RawSkillEvidence[] = [];
  const skillSections = sections.filter((item) => ["skills", "employment", "projects"].includes(item.sectionType));
  for (const section of skillSections) {
    for (const line of contentLines(section.text)) {
      const terms = section.sectionType === "skills" ? line.split(/[,;|]/) : extractTools(line);
      for (const raw of terms.map((item) => item.trim()).filter((item) => item.length >= 2 && item.length <= 80)) {
        const start = section.startOffset + section.text.indexOf(line);
        const reference = sourceRef(document, `rawSkillEvidence[${evidence.length}]`, line, start, "skill-evidence-extractor", section.sectionType === "skills" ? 0.95 : 0.8);
        provenance.push(reference);
        evidence.push({
          evidenceId: `evidence_${hash(`${document.documentId}:${section.sectionType}:${raw}:${start}`, 12)}`,
          rawSkill: raw,
          sourceText: line,
          section: section.sectionType,
          employmentId: null,
          evidenceType: section.sectionType === "skills" ? "explicit" : "tool_usage",
          confidence: section.sectionType === "skills" ? 0.95 : 0.8,
          ruleId: section.sectionType === "skills" ? null : "tool-token-v1",
          sourceReferences: [reference.referenceId],
          state: "known",
        });
      }
    }
  }
  const deterministicRules: Array<[RegExp, string, string]> = [
    [/\bled (?:a |the )?(?:team|programme|project)\b/i, "Leadership", "led-team-v1"],
    [/\bmanaged (?:a )?(?:budget|cost|programme value)\b/i, "Budget Management", "managed-budget-v1"],
    [/\bstakeholder(?:s| engagement| management)\b/i, "Stakeholder Management", "stakeholder-evidence-v1"],
  ];
  for (const [pattern, skill, ruleId] of deterministicRules) {
    const match = pattern.exec(document.text);
    if (!match) continue;
    const reference = sourceRef(document, `rawSkillEvidence[${evidence.length}]`, match[0], match.index, "skill-evidence-extractor", 0.72);
    provenance.push(reference);
    evidence.push({
      evidenceId: `evidence_${hash(`${document.documentId}:${ruleId}:${match.index}`, 12)}`,
      rawSkill: skill,
      sourceText: match[0],
      section: "document",
      employmentId: null,
      evidenceType: "inferred_context",
      confidence: 0.72,
      ruleId,
      sourceReferences: [reference.referenceId],
      state: "inferred",
    });
  }
  return evidence;
}

function extractPersonalData(text: string) {
  return {
    name: text.split("\n").find((line) => /^[A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){1,3}$/.test(line.trim()))?.trim() ?? null,
    email: text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)?.[0] ?? null,
    phone: text.match(/(?:\+?\d[\d ()-]{7,}\d)/)?.[0] ?? null,
    location: null,
    personalUrls: text.match(/https?:\/\/(?:www\.)?(?:linkedin\.com|github\.com|[A-Za-z0-9.-]+\.[A-Za-z]{2,})\/\S*/gi) ?? [],
  };
}

function blockify(documentId: string, text: string) {
  const blocks = [];
  let offset = 0;
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      offset += line.length + 1;
      continue;
    }
    const heading = headingTypes.some(([pattern]) => pattern.test(trimmed.replace(/:$/, "").replace(/^#+\s*/, "")));
    blocks.push({
      blockId: `block_${hash(`${documentId}:${offset}:${trimmed}`, 12)}`,
      type: heading ? "heading" as const : /^[-*]\s+/.test(trimmed) ? "list_item" as const : "paragraph" as const,
      text: trimmed,
      startOffset: offset,
      endOffset: offset + line.length,
      page: null,
    });
    offset += line.length + 1;
  }
  return blocks;
}

function sourceRef(document: ExtractedDocument, fieldPath: string, sourceText: string, startOffset: number, extractor: string, confidence: number): SourceReference {
  return {
    referenceId: `prov_${hash(`${document.documentId}:${fieldPath}:${startOffset}:${sourceText}`, 14)}`,
    fieldPath,
    documentId: document.documentId,
    page: null,
    startOffset,
    endOffset: startOffset + sourceText.length,
    sourceText,
    extractor,
    extractorVersion: "1.0",
    confidence,
  };
}

function safeExtension(fileName: string) {
  if (fileName.includes("/") || fileName.includes("\\") || fileName.includes(".."))
    throw profileError("unsafe_file_name", "Unsafe file name.");
  const extension = fileName.toLowerCase().split(".").pop() ?? "";
  if (extension === "docm") throw profileError("macro_document", "Macro-enabled documents are unsupported.");
  return extension;
}

function validateSignature(type: FileType, bytes: Uint8Array) {
  const buffer = Buffer.from(bytes);
  if (type === "pdf" && buffer.subarray(0, 5).toString() !== "%PDF-")
    throw profileError("signature_mismatch", "PDF signature mismatch.");
  if (type === "docx" && buffer.subarray(0, 2).toString() !== "PK")
    throw profileError("signature_mismatch", "DOCX signature mismatch.");
  if ((type === "text" || type === "markdown") && buffer.includes(0))
    throw profileError("binary_text", "Text input contains binary content.");
}

function validateDocxArchive(buffer: Buffer) {
  let offset = 0;
  let entries = 0;
  let uncompressedBytes = 0;
  while ((offset = buffer.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]), offset)) !== -1) {
    if (offset + 46 > buffer.length)
      throw profileError("suspicious_archive", "DOCX archive directory is truncated.");
    entries += 1;
    uncompressedBytes += buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  if (entries === 0)
    throw profileError("corrupt_docx", "DOCX archive directory was not found.");
  if (
    entries > 2_000 ||
    uncompressedBytes > 32 * 1024 * 1024 ||
    uncompressedBytes > Math.max(buffer.length * 100, 1024 * 1024)
  ) {
    throw profileError("suspicious_archive", "DOCX archive expansion exceeds safety limits.");
  }
}

function parsePartialDate(raw: string): { value: string | null; precision: NormalizedDateRange["precision"]; confidence: number } {
  const value = raw.trim();
  const month = value.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+((?:19|20)\d{2})\b/i);
  if (month) {
    const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
    return { value: `${month[2]}-${String(months.indexOf(month[1]!.slice(0, 3).toLowerCase()) + 1).padStart(2, "0")}`, precision: "month", confidence: 0.99 };
  }
  const year = value.match(/\b(19|20)\d{2}\b/)?.[0];
  if (year) return { value: year, precision: /spring|summer|autumn|fall|winter/i.test(value) ? "season" : "year", confidence: 0.95 };
  return { value: null, precision: "unknown", confidence: 0 };
}

function durationMonths(range: NormalizedDateRange) {
  if (!range.start || !range.end || range.precision !== "month") return null;
  const [startYear, startMonth] = range.start.split("-").map(Number);
  const [endYear, endMonth] = range.end.split("-").map(Number);
  return (endYear! - startYear!) * 12 + endMonth! - startMonth!;
}

function extractTools(text: string) {
  const catalogue = [
    "Python", "JavaScript", "TypeScript", "React", "SQL", "Power BI", "Tableau",
    "Excel", "AWS", "Azure", "Primavera P6", "MS Project", "AutoCAD", "Revit",
    "NEC4", "SAP", "Salesforce", "Figma", "Git",
  ];
  return catalogue.filter((tool) => new RegExp(`\\b${escapeRegex(tool)}\\b`, "i").test(text));
}

function contentLines(text: string) {
  return text.split("\n").slice(1).map((line) => line.replace(/^[-*]\s*/, "").trim()).filter(Boolean);
}

function metric(value: string) {
  return /(?:£|\$)\s?\d|\d+(?:\.\d+)?\s?%|\b(?:reduced|increased|improved|saved|delivered)\b/i.test(value);
}

function manualCredential(name: string): CredentialEvidence {
  return {
    credentialId: `credential_${hash(`manual:${name}`, 12)}`,
    name,
    issuingOrganisation: null,
    issueDate: null,
    expiryDate: null,
    credentialIdentifier: null,
    status: "unknown",
    type: "unknown",
    sourceReferences: [],
  };
}

function normalizeStructuredEmployment(
  item: Partial<EmploymentEpisode>,
  index: number,
): EmploymentEpisode {
  return {
    employmentId:
      item.employmentId ??
      `employment_${hash(`structured:${index}:${item.jobTitle ?? ""}:${item.employer ?? ""}`, 12)}`,
    employer: item.employer ?? null,
    jobTitle: item.jobTitle ?? null,
    location: item.location ?? null,
    dates: item.dates ?? null,
    isCurrent: item.isCurrent ?? false,
    durationMonths: item.durationMonths ?? null,
    summary: item.summary ?? "",
    responsibilities: item.responsibilities ?? [],
    achievements: item.achievements ?? [],
    projects: item.projects ?? [],
    tools: item.tools ?? [],
    skillEvidence: item.skillEvidence ?? [],
    sourceReferences: item.sourceReferences ?? [],
    evidenceState: item.evidenceState ?? "user_confirmed",
  };
}

function normalizeStructuredEducation(
  item: Partial<EducationEpisode>,
  index: number,
): EducationEpisode {
  return {
    educationId:
      item.educationId ??
      `education_${hash(`structured:${index}:${item.qualification ?? ""}`, 12)}`,
    institution: item.institution ?? null,
    qualification: item.qualification ?? null,
    subject: item.subject ?? null,
    classification: item.classification ?? null,
    dates: item.dates ?? null,
    status: item.status ?? null,
    location: item.location ?? null,
    sourceReferences: item.sourceReferences ?? [],
  };
}

function normalizeStructuredProject(
  item: Partial<ProjectEvidence>,
  index: number,
): ProjectEvidence {
  return {
    projectId:
      item.projectId ??
      `project_${hash(`structured:${index}:${item.projectName ?? ""}`, 12)}`,
    projectName: item.projectName ?? null,
    organisation: item.organisation ?? null,
    role: item.role ?? null,
    industry: item.industry ?? null,
    location: item.location ?? null,
    dates: item.dates ?? null,
    projectValue: null,
    technologies: item.technologies ?? [],
    responsibilities: item.responsibilities ?? [],
    outcomes: item.outcomes ?? [],
    skillEvidence: item.skillEvidence ?? [],
    sourceReferences: item.sourceReferences ?? [],
  };
}

function completeness(input: {
  employment: EmploymentEpisode[];
  education: EducationEpisode[];
  rawSkillEvidence: RawSkillEvidence[];
  certifications: CredentialEvidence[];
  careerGoal?: string;
}) {
  const values = {
    employment: input.employment.length ? 100 : 0,
    education: input.education.length ? 100 : 0,
    skills: Math.min(100, input.rawSkillEvidence.length * 10),
    certifications: input.certifications.length ? 100 : 0,
    careerGoal: input.careerGoal ? 100 : 0,
  };
  return { overall: Math.round(Object.values(values).reduce((sum, value) => sum + value, 0) / 5), ...values };
}

function extractListSection(sections: DetectedSection[], type: string) {
  const section = sections.find((item) => item.sectionType === type);
  return section ? contentLines(section.text).flatMap((line) => line.split(/[,;|]/).map((item) => item.trim()).filter(Boolean)) : [];
}

function average(values: number[]) {
  return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100 : 0;
}

function dedupeBy<T>(values: T[], keyFor: (value: T) => string) {
  return [...new Map(values.map((value) => [keyFor(value), value])).values()];
}

function hash(value: string | Uint8Array, length: number) {
  return createHash("sha256").update(value).digest("hex").slice(0, length);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function profileError(code: string, message: string) {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}
