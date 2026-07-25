import { createHash } from "node:crypto";
import type { CareerProfile } from "@workspace/career-profile";
import type { CanonicalVacancy } from "@workspace/opportunity-intelligence";
import type {
  ApplicationAnalysis,
  ApplicationEntitlements,
  ApplicationReadiness,
  AtsDocumentInput,
  AtsFinding,
  ClaimValidation,
  CvAlignmentScore,
  CvRecommendation,
  CvTemplate,
  EvidenceAlignment,
  KeywordFinding,
  OptimisationSession,
  ProvenancedContent,
  RedlineChange,
  TailoredCvDraft,
  TargetFormat,
  VacancyRequirement,
} from "./types";

export const applicationAlignmentWeights = {
  mandatoryCoverage: 0.35,
  preferredCoverage: 0.15,
  experienceEvidence: 0.2,
  achievementEvidence: 0.1,
  skillsPresentation: 0.1,
  atsStructure: 0.1,
} as const;

export const standardApplicationEntitlements: ApplicationEntitlements = {
  canAnalyseCvAgainstJob: true,
  canViewFullAtsReport: false,
  canGenerateTailoredCv: false,
  canGenerateMultipleDrafts: false,
  canExportDocx: false,
  canExportPdf: false,
  canGenerateCoverLetter: false,
  canGenerateApplicationAnswers: false,
  canRequestAdvisorReview: false,
  canViewVersionHistory: false,
};

export const premiumApplicationEntitlements: ApplicationEntitlements = {
  canAnalyseCvAgainstJob: true,
  canViewFullAtsReport: true,
  canGenerateTailoredCv: true,
  canGenerateMultipleDrafts: true,
  canExportDocx: false,
  canExportPdf: false,
  canGenerateCoverLetter: true,
  canGenerateApplicationAnswers: true,
  canRequestAdvisorReview: true,
  canViewVersionHistory: true,
};

export function createOptimisationSession(input: {
  ownerUserId: string;
  profile: CareerProfile;
  vacancy: CanonicalVacancy;
  matchResult: OptimisationSession["matchResult"];
  sourceCv: AtsDocumentInput;
  targetFormat?: TargetFormat;
  targetLocale?: string;
  selectedTemplate?: CvTemplate;
  now?: Date;
}): OptimisationSession {
  if (!input.profile?.profileId || !input.vacancy?.jobId || !input.sourceCv?.text) {
    throw applicationError("profile_invalid");
  }
  if (!input.vacancy.taxonomyVersion) throw applicationError("vacancy_unresolved");
  const now = input.now ?? new Date();
  return {
    sessionId: id("cpx_cvopt", `${input.ownerUserId}:${input.profile.profileId}:${input.vacancy.jobId}:${now.toISOString()}`),
    ownerUserId: input.ownerUserId,
    profileId: input.profile.profileId,
    sourceDocumentId: input.profile.sourceDocumentIds[0] ?? "parsed_profile",
    vacancyId: input.vacancy.jobId,
    matchResultId: `match_${input.matchResult.jobId}`,
    sessionVersion: "1.0",
    status: "draft",
    targetFormat: input.targetFormat ?? "two_page_cv",
    targetLocale: input.targetLocale ?? "en-GB",
    selectedTemplate: input.selectedTemplate ?? "professional",
    profile: structuredClone(input.profile),
    vacancy: structuredClone(input.vacancy),
    matchResult: structuredClone(input.matchResult),
    sourceCv: structuredClone(input.sourceCv),
    analysis: null,
    recommendations: [],
    drafts: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    recordVersion: 1,
  };
}

export function classifyVacancyRequirements(vacancy: CanonicalVacancy): VacancyRequirement[] {
  const results: VacancyRequirement[] = [];
  const add = (
    type: VacancyRequirement["type"],
    rawText: string,
    importance: VacancyRequirement["importance"],
    canonicalSkillCode: string | null = null,
  ) => {
    const occurrence = findOffset(vacancy.description, rawText);
    results.push({
      requirementId: id("req", `${vacancy.jobId}:${type}:${rawText}`),
      type,
      rawText,
      canonicalSkillCode,
      importance,
      sourceOffset: occurrence,
      confidence: occurrence.start >= 0 ? 0.98 : 0.9,
    });
  };
  vacancy.requiredSkills.forEach((code) => add("mandatory_skill", code, "mandatory", code));
  vacancy.preferredSkills.forEach((code) => add("preferred_skill", code, "preferred", code));
  vacancy.unresolvedRequiredSkills.forEach((term) => add(classifyText(term), term, "mandatory"));
  vacancy.unresolvedPreferredSkills.forEach((term) => add(classifyText(term), term, "preferred"));
  vacancy.qualifications.forEach((term) => add("qualification_requirement", term, "mandatory"));
  vacancy.certifications.forEach((term) => add("certification_requirement", term, "mandatory"));
  if (vacancy.securityClearance) add("security_clearance_requirement", "Security clearance required", "mandatory");
  if (vacancy.visaSponsorship !== null) add("work_authorisation_requirement", "Work authorisation or sponsorship statement", "context");
  vacancy.responsibilities.forEach((term) => add("responsibility", term, "context"));
  const experience = vacancy.description.match(/\b(?:at least\s+)?\d{1,2}\+?\s+years?[^.!?\n]*/i)?.[0];
  if (experience) add("experience_requirement", experience.trim(), "mandatory");
  return uniqueBy(results, (item) => `${item.type}:${normal(item.rawText)}`);
}

export function alignEvidence(
  requirements: VacancyRequirement[],
  profile: CareerProfile,
  sourceCvText: string,
): EvidenceAlignment[] {
  const cv = normal(sourceCvText);
  const skills = new Map(profile.resolvedSkills.map((skill) => [skill.skillCode, skill]));
  const profileEvidence = profileTextEvidence(profile);
  return requirements.map((requirement) => {
    const skill = requirement.canonicalSkillCode ? skills.get(requirement.canonicalSkillCode) : undefined;
    const evidenceIds = skill?.evidence ?? matchingEvidenceIds(requirement.rawText, profile);
    const inCv = containsPhrase(cv, requirement.rawText) ||
      (!!skill && containsPhrase(cv, skill.canonicalName));
    const hasProfileEvidence = evidenceIds.length > 0;
    const confirmed = evidenceIds.some((value) => /confirmed|verified/i.test(value)) ||
      profile.rawSkillEvidence.some((item) =>
        item.state === "user_confirmed" &&
        (normal(item.rawSkill) === normal(requirement.rawText) ||
          item.sourceReferences.some((ref) => evidenceIds.includes(ref))),
      );
    let alignmentStatus: EvidenceAlignment["alignmentStatus"] = "missing_evidence";
    let confidence = 0.95;
    let tier: number | null = null;
    if (hasProfileEvidence && inCv && (skill?.confidence ?? 0) >= 0.9) {
      alignmentStatus = "strong_evidence";
      tier = confirmed ? 4 : 2;
    } else if (hasProfileEvidence && inCv) {
      alignmentStatus = "moderate_evidence";
      tier = confirmed ? 4 : 3;
      confidence = 0.8;
    } else if (hasProfileEvidence) {
      alignmentStatus = confirmed ? "moderate_evidence" : "weak_evidence";
      tier = confirmed ? 4 : 7;
      confidence = 0.75;
    } else if (containsPhrase(profileEvidence, requirement.rawText)) {
      alignmentStatus = "unconfirmed_evidence";
      tier = 9;
      confidence = 0.55;
    }
    return {
      requirementId: requirement.requirementId,
      alignmentStatus,
      profileEvidenceIds: evidenceIds,
      confidence,
      reason: alignmentReason(alignmentStatus),
      evidenceTier: tier,
    };
  });
}

export function analyseAts(input: AtsDocumentInput): AtsFinding[] {
  const findings: AtsFinding[] = [];
  const add = (
    risk: AtsFinding["risk"],
    category: AtsFinding["category"],
    title: string,
    recommendation: string,
    evidence: string[],
    section: string | null = null,
  ) => findings.push({
    findingId: id("ats", `${risk}:${category}:${title}`),
    risk,
    category,
    title,
    description: `${title}. This is a generic structural risk, not a prediction about a commercial ATS.`,
    affectedSection: section,
    recommendation,
    evidence,
  });
  if (!["pdf", "docx", "text", "markdown"].includes(input.fileType)) {
    add("critical", "file", "Unsupported CV file type", "Use DOCX, PDF, plain text or Markdown.", [input.fileType]);
  }
  if (input.embeddedScripts) add("critical", "security", "Embedded scripts detected", "Remove executable content before processing.", ["embeddedScripts=true"]);
  if (input.imageOnlyContent) add("high", "content", "Career information is image-only", "Provide selectable text for career information.", ["imageOnlyContent=true"]);
  if ((input.tableCount ?? 0) > 2) add("high", "layout", "CV uses excessive tables", "Move critical content into a single-column reading order.", [`tableCount=${input.tableCount}`]);
  if ((input.columnCount ?? 1) > 1) add("medium", "layout", "Multi-column layout detected", "Use a single-column ATS-conscious template.", [`columnCount=${input.columnCount}`]);
  if ((input.textBoxCount ?? 0) > 0) add("high", "layout", "Text boxes detected", "Move text-box content into normal document flow.", [`textBoxCount=${input.textBoxCount}`]);
  if (input.headerHasCriticalContent || input.footerHasCriticalContent) {
    add("high", "layout", "Critical content appears in a header or footer", "Place contact and career content in the document body.", []);
  }
  if (input.hiddenTextDetected) add("critical", "content", "Hidden text detected", "Remove hidden text and retain only visible truthful content.", ["hiddenTextDetected=true"]);
  if ((input.minimumFontSizePt ?? 11) < 9) add("medium", "layout", "Very small text detected", "Use accessible body text of at least 9pt.", [`minimumFontSizePt=${input.minimumFontSizePt}`]);
  if (input.unsupportedFonts?.length) add("low", "layout", "Uncommon fonts detected", "Use a broadly supported accessible font.", input.unsupportedFonts);
  const headings = input.sectionHeadings.map(normal);
  for (const section of ["employment", "education", "skills"]) {
    if (!headings.some((heading) => heading.includes(section) || (section === "employment" && heading.includes("experience")))) {
      add("medium", "structure", `Missing standard ${section} heading`, `Add a clear ${section} section label.`, [], section);
    }
  }
  if (new Set(input.dateFormats ?? []).size > 1) add("medium", "structure", "Inconsistent date formatting", "Use one date format throughout.", input.dateFormats ?? []);
  const repeated = overusedTerms(input.text);
  if (repeated.length) add("medium", "content", "Excessive keyword repetition", "Remove repetition and keep only evidence-backed uses.", repeated);
  if (!findings.length) add("informational", "structure", "No generic structural ATS risks detected", "Retain a simple logical reading order.", []);
  return findings;
}

export function analyseKeywords(
  requirements: VacancyRequirement[],
  alignments: EvidenceAlignment[],
  sourceCvText: string,
): KeywordFinding[] {
  const cv = normal(sourceCvText);
  return requirements.map((requirement) => {
    const alignment = alignments.find((item) => item.requirementId === requirement.requirementId)!;
    const present = containsPhrase(cv, requirement.rawText);
    const supported = alignment.profileEvidenceIds.length > 0;
    const occurrences = countPhrase(cv, requirement.rawText);
    return {
      term: requirement.rawText,
      canonicalSkillCode: requirement.canonicalSkillCode,
      state: occurrences > 4
        ? "overused"
        : present && supported
          ? "present_with_evidence"
          : present
            ? "present_without_evidence"
            : supported
              ? "missing_but_supported"
              : "missing_and_unsupported",
      evidenceIds: alignment.profileEvidenceIds,
    };
  });
}

export function scoreCvAlignment(
  requirements: VacancyRequirement[],
  alignments: EvidenceAlignment[],
  atsFindings: AtsFinding[],
  profile: CareerProfile,
  sourceCvText: string,
): CvAlignmentScore {
  const coverage = (importance: "mandatory" | "preferred") => {
    const relevant = requirements.filter((item) => item.importance === importance);
    if (!relevant.length) return 100;
    const value = relevant.reduce((sum, requirement) => {
      const status = alignments.find((item) => item.requirementId === requirement.requirementId)?.alignmentStatus;
      return sum + alignmentValue(status);
    }, 0);
    return Math.round((value / relevant.length) * 100);
  };
  const mandatoryCoverage = coverage("mandatory");
  const preferredCoverage = coverage("preferred");
  const experienceEvidence = profile.employment.length
    ? Math.round(profile.employment.filter((item) => item.sourceReferences.length > 0).length / profile.employment.length * 100)
    : 0;
  const achievementEvidence = profile.achievements.length
    ? Math.round(profile.achievements.filter((item) => item.sourceReferences.length > 0).length / profile.achievements.length * 100)
    : 0;
  const supportedSkills = profile.resolvedSkills.filter((skill) =>
    containsPhrase(normal(sourceCvText), skill.canonicalName),
  ).length;
  const skillsPresentation = profile.resolvedSkills.length
    ? Math.round(supportedSkills / profile.resolvedSkills.length * 100)
    : 0;
  const atsPenalty = atsFindings.reduce((sum, finding) =>
    sum + ({ critical: 30, high: 20, medium: 10, low: 3, informational: 0 }[finding.risk]), 0);
  const atsStructure = Math.max(0, 100 - atsPenalty);
  const overallScore = Math.round(
    mandatoryCoverage * 0.35 + preferredCoverage * 0.15 +
    experienceEvidence * 0.2 + achievementEvidence * 0.1 +
    skillsPresentation * 0.1 + atsStructure * 0.1,
  );
  return {
    overallScore,
    band: overallScore >= 90 ? "highly_aligned" : overallScore >= 75 ? "well_aligned" :
      overallScore >= 60 ? "partially_aligned" : overallScore >= 40 ? "weakly_aligned" :
        "substantially_misaligned",
    mandatoryCoverage,
    preferredCoverage,
    experienceEvidence,
    achievementEvidence,
    skillsPresentation,
    atsStructure,
    disclaimer: "CV alignment measures evidence presentation and does not predict hiring decisions.",
  };
}

export function generateRecommendations(
  requirements: VacancyRequirement[],
  alignments: EvidenceAlignment[],
  atsFindings: AtsFinding[],
  keywords: KeywordFinding[],
): CvRecommendation[] {
  const recommendations: CvRecommendation[] = [];
  for (const keyword of keywords) {
    const requirement = requirements.find((item) => item.rawText === keyword.term)!;
    const source = requirement.requirementId;
    if (keyword.state === "missing_but_supported") {
      recommendations.push(recommendation(
        requirement.importance === "mandatory" ? "high" : "medium",
        `Add the supported term “${keyword.term}” where its evidence is described.`,
        "The Career Profile contains evidence, but the current CV does not express the vacancy-relevant term.",
        "vacancy_requirement",
        source,
      ));
    }
    if (keyword.state === "missing_and_unsupported" || keyword.state === "present_without_evidence") {
      recommendations.push(recommendation(
        requirement.importance === "mandatory" ? "critical" : "high",
        `Do not claim “${keyword.term}” without additional confirmed evidence.`,
        "The selected vacancy mentions this term, but the Career Profile does not support it.",
        "missing_evidence",
        source,
      ));
    }
    if (keyword.state === "overused") {
      recommendations.push(recommendation("medium", `Reduce repetition of “${keyword.term}”.`, "Repeated terminology can obscure evidence quality.", "claim_quality", source));
    }
  }
  for (const finding of atsFindings.filter((item) => item.risk !== "informational")) {
    recommendations.push(recommendation(
      finding.risk === "critical" ? "critical" : finding.risk === "high" ? "high" : "medium",
      finding.recommendation,
      finding.description,
      "ats_finding",
      finding.findingId,
    ));
  }
  for (const alignment of alignments.filter((item) => item.alignmentStatus === "unconfirmed_evidence")) {
    recommendations.push(recommendation("high", "Request user confirmation before using ambiguous evidence.", alignment.reason, "missing_evidence", alignment.requirementId));
  }
  return uniqueBy(recommendations, (item) => `${item.action}:${item.sourceId}`);
}

export function analyseApplicationSession(session: OptimisationSession, now = new Date()): OptimisationSession {
  const requirements = classifyVacancyRequirements(session.vacancy);
  const alignments = alignEvidence(requirements, session.profile, session.sourceCv.text);
  const atsFindings = analyseAts(session.sourceCv);
  const keywords = analyseKeywords(requirements, alignments, session.sourceCv.text);
  const recommendations = generateRecommendations(requirements, alignments, atsFindings, keywords);
  const cvAlignment = scoreCvAlignment(requirements, alignments, atsFindings, session.profile, session.sourceCv.text);
  const analysis: ApplicationAnalysis = {
    analysisId: id("analysis", `${session.sessionId}:${session.recordVersion}`),
    requirements,
    alignments,
    atsFindings,
    keywords,
    recommendations,
    cvAlignment,
    analysedAt: now.toISOString(),
    engineVersion: "1.0",
  };
  const requiresEvidence = alignments.some((item) =>
    item.alignmentStatus === "missing_evidence" || item.alignmentStatus === "unconfirmed_evidence",
  );
  return {
    ...structuredClone(session),
    analysis,
    recommendations,
    status: requiresEvidence ? "requires_evidence" : "ready_for_generation",
    updatedAt: now.toISOString(),
    recordVersion: session.recordVersion + 1,
  };
}

export function validateClaim(input: {
  text: string;
  sourceTexts: Array<{ evidenceId: string; text: string }>;
  originalText?: string;
}): ClaimValidation {
  const text = input.text.trim();
  const combined = input.sourceTexts.map((item) => item.text).join(" ");
  const evidenceIds = input.sourceTexts.map((item) => item.evidenceId);
  const reasons: string[] = [];
  let status: ClaimValidation["status"] = "supported_rewrite";
  if (!text || !input.sourceTexts.length) {
    status = "unsupported";
    reasons.push("No source evidence was supplied.");
  }
  const proposedMetrics = metrics(text);
  const sourceMetrics = new Set(metrics(combined));
  const newMetrics = proposedMetrics.filter((item) => !sourceMetrics.has(item));
  if (newMetrics.length) {
    status = "unsupported";
    reasons.push(`Unsupported metric(s): ${newMetrics.join(", ")}.`);
  }
  if (leadershipInflation(text, combined)) {
    status = "unsupported";
    reasons.push("The wording adds leadership scope not present in the source evidence.");
  }
  if (dateConflict(text, combined)) {
    status = "conflicting";
    reasons.push("The proposed dates conflict with source evidence.");
  }
  if (input.originalText && normal(text) === normal(input.originalText)) {
    status = "directly_supported";
  } else if (status === "supported_rewrite" && tokenCoverage(text, combined) < 0.3) {
    status = "user_confirmation_required";
    reasons.push("The rewrite contains substantial wording not grounded in source evidence.");
  }
  if (!reasons.length) reasons.push("All factual tokens and metrics are grounded in the supplied evidence.");
  return {
    claimId: id("claim", `${text}:${evidenceIds.join(":")}`),
    text,
    status,
    sourceEvidenceIds: evidenceIds,
    reasons,
    automaticallyIncludable: ["directly_supported", "supported_rewrite", "supported_summary"].includes(status),
  };
}

export function buildTailoredDraft(
  session: OptimisationSession,
  now = new Date(),
): TailoredCvDraft {
  if (!session.analysis) throw applicationError("analysis_failed");
  if (!["ready_for_generation", "requires_evidence", "generated", "user_review"].includes(session.status)) {
    throw applicationError("analysis_failed");
  }
  const relevantSkillCodes = new Set(
    session.analysis.requirements.map((item) => item.canonicalSkillCode).filter(Boolean),
  );
  const skills = session.profile.resolvedSkills
    .filter((skill) => relevantSkillCodes.has(skill.skillCode))
    .map((skill) => content(
      skill.canonicalName,
      skill.evidence,
      "supported_summary",
      "supported_summary",
    ));
  const employment = session.profile.employment.map((episode) => ({
    employmentId: episode.employmentId,
    employer: episode.employer,
    jobTitle: episode.jobTitle,
    dates: episode.dates?.raw ?? null,
    bullets: [...episode.achievements, ...episode.responsibilities]
      .filter((text) => relevantText(text, session.analysis!.requirements))
      .slice(0, 6)
      .map((text) => content(text, episode.sourceReferences, "directly_supported", "unchanged")),
  })).filter((item) => item.bullets.length > 0);
  const strongest = [
    ...skills.slice(0, 4).map((item) => item.text),
    ...employment.flatMap((item) => item.bullets.slice(0, 1).map((bullet) => bullet.text)),
  ].slice(0, 4);
  const occupation = session.vacancy.occupationTitle;
  const summaryText = strongest.length
    ? `${occupation} candidate with evidenced experience in ${joinNatural(strongest)}.`
    : "";
  const summary = summaryText
    ? content(
        summaryText,
        [...skills.flatMap((item) => item.sourceEvidenceIds), ...employment.flatMap((item) => item.bullets.flatMap((bullet) => bullet.sourceEvidenceIds))],
        "supported_summary",
        "supported_summary",
      )
    : null;
  const claimValidation = [
    ...(summary ? [validateClaim({
      text: summary.text,
      sourceTexts: sourceTexts(summary.sourceEvidenceIds, session.profile),
    })] : []),
    ...employment.flatMap((item) => item.bullets.map((bullet) =>
      validateClaim({
        text: bullet.text,
        originalText: bullet.text,
        sourceTexts: sourceTexts(bullet.sourceEvidenceIds, session.profile, bullet.text),
      }),
    )),
  ];
  if (claimValidation.some((item) => item.status === "unsupported" || item.status === "conflicting")) {
    throw applicationError("unsupported_claim_detected");
  }
  const supported = session.analysis.alignments
    .filter((item) => item.profileEvidenceIds.length > 0)
    .map((item) => item.requirementId);
  return {
    draftId: id("cpx_cvdraft", `${session.sessionId}:${session.drafts.length + 1}:${now.toISOString()}`),
    sessionId: session.sessionId,
    draftVersion: session.drafts.length + 1,
    template: session.selectedTemplate,
    targetVacancyId: session.vacancyId,
    sections: {
      contact: {
        name: session.profile.personalData.name,
        email: session.profile.personalData.email,
        phone: session.profile.personalData.phone,
        location: session.profile.personalData.location,
      },
      summary,
      skills,
      employment,
      education: session.profile.education.map((item) =>
        content(
          [item.qualification, item.subject, item.institution].filter(Boolean).join(", "),
          item.sourceReferences,
          "directly_supported",
          "unchanged",
        ),
      ),
      certifications: session.profile.certifications.map((item) =>
        content(
          `${item.name}${item.status === "unknown" ? " — expiry not recorded" : item.status === "expired" ? " — expired" : ""}`,
          item.sourceReferences,
          "directly_supported",
          "unchanged",
        ),
      ),
      projects: session.profile.projects
        .filter((item) => relevantText(`${item.projectName ?? ""} ${item.responsibilities.join(" ")}`, session.analysis!.requirements))
        .map((item) => content(
          [item.projectName, ...item.outcomes].filter(Boolean).join(" — "),
          item.sourceReferences,
          "directly_supported",
          "unchanged",
        )),
      memberships: session.profile.professionalMemberships.map((item) =>
        content(item.name, item.sourceReferences, "directly_supported", "unchanged"),
      ),
    },
    claimValidation,
    coverage: {
      supportedRequirementIds: supported,
      missingRequirementIds: session.analysis.requirements
        .map((item) => item.requirementId)
        .filter((item) => !supported.includes(item)),
    },
    reviewStatus: "pending",
    createdAt: now.toISOString(),
    recordVersion: 1,
  };
}

export function compareDrafts(
  before: TailoredCvDraft | null,
  after: TailoredCvDraft,
): RedlineChange[] {
  const oldItems = before ? flattenDraft(before) : [];
  const newItems = flattenDraft(after);
  const changes: RedlineChange[] = [];
  for (const item of newItems) {
    const exact = oldItems.find((old) => normal(old.text) === normal(item.text));
    if (!exact) {
      const related = oldItems.find((old) => overlap(old.text, item.text) >= 0.45);
      changes.push({
        changeId: id("change", `${item.id}:${related?.id ?? "new"}`),
        type: related ? "rewritten_content" : "added_supported_content",
        before: related?.text ?? null,
        after: item.text,
        reason: related ? "Wording changed while retaining source provenance." : "Vacancy-relevant supported evidence was added.",
        sourceEvidenceIds: item.evidence,
      });
    }
  }
  for (const item of oldItems) {
    if (!newItems.some((next) => normal(next.text) === normal(item.text) || overlap(next.text, item.text) >= 0.45)) {
      changes.push({
        changeId: id("change", `${item.id}:removed`),
        type: "removed_irrelevant_content",
        before: item.text,
        after: null,
        reason: "Content was not selected for the current vacancy and remains in the previous version.",
        sourceEvidenceIds: item.evidence,
      });
    }
  }
  return changes;
}

export function calculateApplicationReadiness(input: {
  analysis: ApplicationAnalysis;
  draft: TailoredCvDraft | null;
  contactConfirmed: boolean;
  workAuthorisationConfirmed?: boolean;
  coverLetterRequired?: boolean;
  coverLetterReady?: boolean;
  questionsComplete?: boolean;
}): ApplicationReadiness {
  const blockers: ApplicationReadiness["blockers"] = [];
  const mandatoryMissing = input.analysis.alignments.filter((alignment) => {
    const requirement = input.analysis.requirements.find((item) => item.requirementId === alignment.requirementId);
    return requirement?.importance === "mandatory" &&
      ["missing_evidence", "unconfirmed_evidence"].includes(alignment.alignmentStatus);
  });
  mandatoryMissing.forEach((item) => blockers.push({
    code: item.alignmentStatus === "unconfirmed_evidence" ? "user_confirmation_required" : "mandatory_evidence_missing",
    category: item.alignmentStatus === "unconfirmed_evidence" ? "user_confirmation" : "evidence",
    message: "A mandatory vacancy requirement lacks confirmed Career Profile evidence.",
  }));
  if (!input.contactConfirmed) blockers.push({ code: "missing_contact_information", category: "user_confirmation", message: "Contact information has not been confirmed." });
  if (input.analysis.atsFindings.some((item) => item.risk === "critical")) blockers.push({ code: "critical_ats_risk", category: "document_quality", message: "Resolve critical structural or security findings before export." });
  if (input.draft?.claimValidation.some((item) => item.status === "unsupported")) blockers.push({ code: "unsupported_mandatory_claim", category: "evidence", message: "The draft contains an unsupported claim." });
  if (input.coverLetterRequired && !input.coverLetterReady) blockers.push({ code: "application_incomplete", category: "document_quality", message: "A required cover letter is not ready." });
  const claimScore = input.draft
    ? Math.round(input.draft.claimValidation.filter((item) => item.automaticallyIncludable).length / Math.max(1, input.draft.claimValidation.length) * 100)
    : 0;
  const completeness = [
    !!input.draft,
    input.contactConfirmed,
    !input.coverLetterRequired || !!input.coverLetterReady,
    input.questionsComplete !== false,
  ].filter(Boolean).length / 4 * 100;
  const score = Math.round(
    input.analysis.cvAlignment.overallScore * 0.4 +
    input.analysis.cvAlignment.mandatoryCoverage * 0.25 +
    input.analysis.cvAlignment.atsStructure * 0.15 +
    claimScore * 0.1 +
    completeness * 0.1,
  );
  return {
    score,
    blockers,
    disclaimer: "Application readiness measures document completeness and evidence safety; it does not predict an employer decision.",
  };
}

export function buildCoverLetterContext(input: {
  session: OptimisationSession;
  motivation?: string;
  employerName?: string;
  closingPreference?: string;
}) {
  if (!input.session.analysis) throw applicationError("analysis_failed");
  const supported = input.session.analysis.alignments
    .filter((item) => ["strong_evidence", "moderate_evidence"].includes(item.alignmentStatus))
    .slice(0, 3);
  return {
    vacancyTitle: input.session.vacancy.title,
    employerName: input.employerName?.trim() || null,
    strengths: supported.map((alignment) => ({
      requirement: input.session.analysis!.requirements.find((item) => item.requirementId === alignment.requirementId)?.rawText,
      evidenceIds: alignment.profileEvidenceIds,
    })),
    motivation: input.motivation?.trim() || { status: "user_input_required" as const },
    closingPreference: input.closingPreference?.trim() || { status: "user_input_required" as const },
    prohibitedInferences: ["employer_values", "salary_expectations", "availability", "work_authorisation", "referrals"],
  };
}

export function buildApplicationQuestionContext(input: {
  session: OptimisationSession;
  question: string;
  userFacts?: Record<string, string>;
}) {
  const personalDecision = /salary|start|sponsor|authori[sz]ation|why.*employer/i.test(input.question);
  if (personalDecision && !Object.keys(input.userFacts ?? {}).length) {
    return { status: "user_input_required" as const, question: input.question, facts: [] };
  }
  const facts = input.session.analysis?.alignments
    .filter((item) => ["strong_evidence", "moderate_evidence"].includes(item.alignmentStatus))
    .slice(0, 3)
    .map((item) => ({ requirementId: item.requirementId, evidenceIds: item.profileEvidenceIds })) ?? [];
  return { status: facts.length || input.userFacts ? "context_ready" as const : "user_input_required" as const, question: input.question, facts, userFacts: input.userFacts ?? {} };
}

function classifyText(text: string): VacancyRequirement["type"] {
  const value = normal(text);
  if (/certif|licen[cs]e|registration/.test(value)) return "certification_requirement";
  if (/degree|diploma|qualification/.test(value)) return "qualification_requirement";
  if (/lead|manage|supervis/.test(value)) return "leadership_requirement";
  if (/language|fluent/.test(value)) return "language_requirement";
  if (/experience/.test(value)) return "experience_requirement";
  return "tool_or_technology";
}

function profileTextEvidence(profile: CareerProfile) {
  return normal([
    ...profile.employment.flatMap((item) => [item.summary, ...item.responsibilities, ...item.achievements]),
    ...profile.projects.flatMap((item) => [...item.responsibilities, ...item.outcomes]),
    ...profile.rawSkillEvidence.map((item) => item.sourceText),
  ].join(" "));
}

function matchingEvidenceIds(term: string, profile: CareerProfile) {
  const result: string[] = [];
  for (const item of profile.rawSkillEvidence) {
    if (containsPhrase(normal(`${item.rawSkill} ${item.sourceText}`), term)) result.push(item.evidenceId);
  }
  for (const item of profile.employment) {
    if (containsPhrase(normal(`${item.summary} ${item.responsibilities.join(" ")} ${item.achievements.join(" ")}`), term)) {
      result.push(item.employmentId, ...item.sourceReferences);
    }
  }
  for (const item of profile.projects) {
    if (containsPhrase(normal(`${item.responsibilities.join(" ")} ${item.outcomes.join(" ")}`), term)) {
      result.push(item.projectId, ...item.sourceReferences);
    }
  }
  return [...new Set(result)];
}

function alignmentReason(status: EvidenceAlignment["alignmentStatus"]) {
  return {
    strong_evidence: "The current CV presents high-confidence Career Profile evidence for this requirement.",
    moderate_evidence: "Career Profile evidence is present but has limited confirmation or examples.",
    weak_evidence: "The Career Profile contains relevant evidence that is weakly presented in the current CV.",
    unconfirmed_evidence: "Related wording exists, but confirmation is required before it can support a claim.",
    missing_evidence: "No confirmed Career Profile evidence supports this requirement.",
    not_applicable: "The requirement does not apply to this document analysis.",
  }[status];
}

function content(
  text: string,
  evidence: string[],
  claimStatus: ProvenancedContent["claimStatus"],
  transformationType: ProvenancedContent["transformationType"],
): ProvenancedContent {
  return {
    contentId: id("content", `${text}:${evidence.join(":")}`),
    text,
    claimStatus,
    sourceEvidenceIds: [...new Set(evidence)],
    transformationType,
    generatedBy: "deterministic_template",
    reviewStatus: "pending",
  };
}

function sourceTexts(ids: string[], profile: CareerProfile, fallback = "") {
  const references = new Map(profile.provenance.map((item) => [item.referenceId, item.sourceText]));
  return ids.map((evidenceId) => ({ evidenceId, text: references.get(evidenceId) ?? fallback })).filter((item) => item.text);
}

function flattenDraft(draft: TailoredCvDraft) {
  const items = [
    ...(draft.sections.summary ? [draft.sections.summary] : []),
    ...draft.sections.skills,
    ...draft.sections.employment.flatMap((item) => item.bullets),
    ...draft.sections.education,
    ...draft.sections.certifications,
    ...draft.sections.projects,
    ...draft.sections.memberships,
  ];
  return items.map((item) => ({ id: item.contentId, text: item.text, evidence: item.sourceEvidenceIds }));
}

function recommendation(
  priority: CvRecommendation["priority"],
  action: string,
  reason: string,
  sourceType: CvRecommendation["sourceType"],
  sourceId: string,
): CvRecommendation {
  return {
    recommendationId: id("rec", `${action}:${sourceId}`),
    priority,
    action,
    reason,
    sourceType,
    sourceId,
    status: "pending",
  };
}

function alignmentValue(status?: EvidenceAlignment["alignmentStatus"]) {
  return {
    strong_evidence: 1,
    moderate_evidence: 0.75,
    weak_evidence: 0.4,
    unconfirmed_evidence: 0.2,
    missing_evidence: 0,
    not_applicable: 1,
  }[status ?? "missing_evidence"];
}

function relevantText(text: string, requirements: VacancyRequirement[]) {
  const value = normal(text);
  return requirements.some((item) =>
    overlap(value, item.rawText) >= 0.25 ||
    (item.canonicalSkillCode && containsPhrase(value, item.canonicalSkillCode)),
  );
}

function overusedTerms(text: string) {
  const words = normal(text).split(" ").filter((word) => word.length > 5);
  const counts = new Map<string, number>();
  words.forEach((word) => counts.set(word, (counts.get(word) ?? 0) + 1));
  return [...counts].filter(([, count]) => count > 12).map(([word]) => word);
}

function metrics(text: string) {
  return [...text.matchAll(/\b(?:£|\$|€)?\d+(?:[.,]\d+)?%?(?:\s*(?:million|billion|k|m))?\b/gi)]
    .map((match) => match[0].toLowerCase());
}

function leadershipInflation(proposed: string, source: string) {
  const leadership = /\b(?:led|managed|directed|headed|supervised|owned)\b/i;
  return leadership.test(proposed) && !leadership.test(source);
}

function dateConflict(proposed: string, source: string) {
  const proposedYears = new Set(proposed.match(/\b(?:19|20)\d{2}\b/g) ?? []);
  const sourceYears = new Set(source.match(/\b(?:19|20)\d{2}\b/g) ?? []);
  return proposedYears.size > 0 && [...proposedYears].some((year) => !sourceYears.has(year));
}

function tokenCoverage(proposed: string, source: string) {
  const proposedTokens = new Set(tokens(proposed));
  const sourceTokens = new Set(tokens(source));
  if (!proposedTokens.size) return 0;
  return [...proposedTokens].filter((token) => sourceTokens.has(token)).length / proposedTokens.size;
}

function overlap(left: string, right: string) {
  const a = new Set(tokens(left));
  const b = new Set(tokens(right));
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((item) => b.has(item)).length;
  return intersection / Math.min(a.size, b.size);
}

function tokens(value: string) {
  return normal(value).split(" ").filter((item) => item.length > 2);
}

function findOffset(text: string, phrase: string) {
  const start = text.toLowerCase().indexOf(phrase.toLowerCase());
  return { start, end: start < 0 ? -1 : start + phrase.length };
}

function countPhrase(text: string, phrase: string) {
  if (!phrase.trim()) return 0;
  return text.split(normal(phrase)).length - 1;
}

function containsPhrase(text: string, phrase: string) {
  const normalized = normal(phrase);
  return !!normalized && text.includes(normalized);
}

function normal(value: string) {
  return value.toLocaleLowerCase("en-GB").replace(/[^\p{L}\p{N}%£$€+#.]+/gu, " ").trim();
}

function joinNatural(values: string[]) {
  return values.length <= 1 ? values[0] ?? "" : `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`;
}

function uniqueBy<T>(values: T[], key: (value: T) => string) {
  return [...new Map(values.map((value) => [key(value), value])).values()];
}

function id(prefix: string, seed: string) {
  return `${prefix}_${createHash("sha256").update(seed).digest("hex").slice(0, 20)}`;
}

function applicationError(code: string) {
  return Object.assign(new Error(code), { code });
}
