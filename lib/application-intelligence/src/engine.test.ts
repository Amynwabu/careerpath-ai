import { describe, expect, it } from "vitest";
import type { CareerProfile } from "@workspace/career-profile";
import type {
  CanonicalVacancy,
  EmployabilityResult,
} from "@workspace/opportunity-intelligence";
import {
  alignEvidence,
  analyseApplicationSession,
  analyseAts,
  analyseKeywords,
  buildTailoredDraft,
  calculateApplicationReadiness,
  classifyVacancyRequirements,
  compareDrafts,
  createOptimisationSession,
  validateClaim,
} from "./engine";

const vacancy = {
  jobId: "job_fixture",
  title: "Senior Project Manager",
  description: "Mandatory: 5 years project delivery. Project planning and NEC4 certification required.",
  requiredSkills: ["SK-PLAN"],
  preferredSkills: ["SK-RISK"],
  unresolvedRequiredSkills: ["NEC4 certification"],
  unresolvedPreferredSkills: ["Power sector experience"],
  qualifications: ["Degree"],
  certifications: ["NEC4"],
  responsibilities: ["Coordinate project delivery"],
  securityClearance: false,
  visaSponsorship: null,
  occupationCode: "OCC-PM",
  occupationTitle: "Project Manager",
  taxonomyVersion: "2026.1",
} as unknown as CanonicalVacancy;

const profile = {
  profileId: "profile_fixture",
  sourceDocumentIds: ["doc_fixture"],
  personalData: {
    name: "Synthetic Candidate",
    email: "candidate@example.test",
    phone: null,
    location: "London",
    personalUrls: [],
  },
  resolvedSkills: [{
    skillCode: "SK-PLAN",
    canonicalName: "Project planning",
    category: "delivery",
    confidence: 0.98,
    sourceText: "Project planning",
    extractionType: "explicit",
    evidence: ["ref_employment_1"],
  }],
  rawSkillEvidence: [{
    evidenceId: "skill_evidence_1",
    rawSkill: "Project planning",
    sourceText: "Managed project planning activities",
    section: "employment",
    employmentId: "employment_1",
    evidenceType: "responsibility",
    confidence: 0.95,
    ruleId: null,
    sourceReferences: ["ref_employment_1"],
    state: "known",
  }],
  employment: [{
    employmentId: "employment_1",
    employer: "Synthetic Infrastructure Ltd",
    jobTitle: "Project Manager",
    location: "London",
    dates: { raw: "2020–2026", start: "2020", end: "2026", precision: "year", confidence: 1 },
    isCurrent: true,
    durationMonths: 72,
    summary: "Managed project planning activities.",
    responsibilities: ["Coordinated project delivery and maintained project plans."],
    achievements: ["Managed project schedules and contributed to reducing delivery delays."],
    projects: [],
    tools: [],
    skillEvidence: ["Project planning"],
    sourceReferences: ["ref_employment_1"],
    evidenceState: "known",
  }],
  education: [{
    educationId: "education_1",
    institution: "Synthetic University",
    qualification: "BSc Degree",
    subject: "Project Management",
    classification: null,
    dates: null,
    status: "completed",
    location: null,
    sourceReferences: ["ref_education_1"],
  }],
  certifications: [],
  professionalMemberships: [],
  projects: [],
  achievements: [{
    achievementId: "achievement_1",
    statement: "Contributed to reducing delivery delays.",
    metricType: "none",
    value: null,
    unit: null,
    confidence: 0.9,
    sourceText: "Contributed to reducing delivery delays.",
    sourceReferences: ["ref_employment_1"],
  }],
  provenance: [
    { referenceId: "ref_employment_1", sourceText: "Managed project schedules and contributed to reducing delivery delays." },
    { referenceId: "ref_education_1", sourceText: "BSc Degree in Project Management" },
  ],
} as unknown as CareerProfile;

const match = {
  jobId: vacancy.jobId,
  overallScore: 70,
  matchBand: "Strong Match",
  confidence: 0.8,
  gaps: [],
  strengths: [],
  explanations: [],
  disclaimer: "",
  taxonomyVersion: "2026.1",
} as unknown as EmployabilityResult;

const sourceCv = {
  fileType: "docx" as const,
  text: "Employment\nProject Manager\n2020–2026\nManaged project planning activities.\nEducation\nBSc Degree\nSkills\nProject planning",
  sectionHeadings: ["Employment", "Education", "Skills"],
  dateFormats: ["YYYY–YYYY"],
  tableCount: 0,
  columnCount: 1,
};

describe("requirement and evidence analysis", () => {
  it("classifies canonical, experience, qualification and certification requirements", () => {
    const requirements = classifyVacancyRequirements(vacancy);
    expect(requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "mandatory_skill", canonicalSkillCode: "SK-PLAN" }),
      expect.objectContaining({ type: "experience_requirement" }),
      expect.objectContaining({ type: "qualification_requirement" }),
      expect.objectContaining({ type: "certification_requirement" }),
    ]));
    expect(requirements.every((item) => item.sourceOffset)).toBe(true);
  });

  it("distinguishes strong evidence, supported missing wording and unsupported terms", () => {
    const requirements = classifyVacancyRequirements(vacancy);
    const alignments = alignEvidence(requirements, profile, sourceCv.text);
    const keywords = analyseKeywords(requirements, alignments, sourceCv.text);
    expect(alignments.find((item) =>
      requirements.find((requirement) => requirement.requirementId === item.requirementId)?.canonicalSkillCode === "SK-PLAN",
    )?.alignmentStatus).toBe("strong_evidence");
    expect(keywords).toEqual(expect.arrayContaining([
      expect.objectContaining({ term: "SK-RISK", state: "missing_and_unsupported" }),
      expect.objectContaining({ term: "NEC4", state: "missing_and_unsupported" }),
    ]));
  });
});

describe("generic ATS analysis", () => {
  it("detects table, column, header, hidden-text and date risks without predicting rejection", () => {
    const findings = analyseAts({
      ...sourceCv,
      tableCount: 4,
      columnCount: 2,
      headerHasCriticalContent: true,
      hiddenTextDetected: true,
      dateFormats: ["MM/YYYY", "YYYY"],
    });
    expect(findings.map((item) => item.title)).toEqual(expect.arrayContaining([
      "CV uses excessive tables",
      "Multi-column layout detected",
      "Critical content appears in a header or footer",
      "Hidden text detected",
      "Inconsistent date formatting",
    ]));
    expect(findings.every((item) => !item.description.includes("will reject"))).toBe(true);
  });

  it("blocks embedded scripts and unsupported files", () => {
    const findings = analyseAts({
      ...sourceCv,
      fileType: "other",
      embeddedScripts: true,
    });
    expect(findings.filter((item) => item.risk === "critical")).toHaveLength(2);
  });
});

describe("claim safety", () => {
  it("allows a grounded rewrite without adding metrics", () => {
    const result = validateClaim({
      text: "Managed project scheduling activities and contributed to reducing delivery delays.",
      sourceTexts: [{
        evidenceId: "ref_1",
        text: "Managed project schedule and helped reduce delay.",
      }],
    });
    expect(result.status).toBe("supported_rewrite");
    expect(result.automaticallyIncludable).toBe(true);
  });

  it("blocks unsupported metrics", () => {
    const result = validateClaim({
      text: "Reduced delays by 35% and saved £2 million.",
      sourceTexts: [{ evidenceId: "ref_1", text: "Helped reduce delay." }],
    });
    expect(result.status).toBe("unsupported");
    expect(result.automaticallyIncludable).toBe(false);
  });

  it("blocks inflated leadership and conflicting dates", () => {
    expect(validateClaim({
      text: "Led the programme team.",
      sourceTexts: [{ evidenceId: "ref_1", text: "Supported the programme team." }],
    }).status).toBe("unsupported");
    expect(validateClaim({
      text: "Project Manager, 2018–2022",
      sourceTexts: [{ evidenceId: "ref_1", text: "Project Manager, 2020–2026" }],
    }).status).toBe("conflicting");
  });
});

describe("draft, redline and readiness", () => {
  it("builds a versioned provenance-preserving draft and redline", () => {
    const initial = createOptimisationSession({
      ownerUserId: "synthetic-user",
      profile,
      vacancy,
      matchResult: match,
      sourceCv,
      now: new Date("2026-07-25T10:00:00Z"),
    });
    const analysed = analyseApplicationSession(initial, new Date("2026-07-25T10:01:00Z"));
    const draft = buildTailoredDraft(analysed, new Date("2026-07-25T10:02:00Z"));
    expect(draft.draftVersion).toBe(1);
    expect(draft.sections.skills[0]).toMatchObject({
      text: "Project planning",
      claimStatus: "supported_summary",
      sourceEvidenceIds: ["ref_employment_1"],
    });
    expect(draft.claimValidation.every((item) => item.automaticallyIncludable)).toBe(true);
    expect(compareDrafts(null, draft)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "added_supported_content" }),
    ]));
  });

  it("separates evidence, document and confirmation blockers", () => {
    const session = analyseApplicationSession(createOptimisationSession({
      ownerUserId: "synthetic-user",
      profile,
      vacancy,
      matchResult: match,
      sourceCv: { ...sourceCv, hiddenTextDetected: true },
    }));
    const readiness = calculateApplicationReadiness({
      analysis: session.analysis!,
      draft: null,
      contactConfirmed: false,
    });
    expect(readiness.blockers.map((item) => item.category)).toEqual(expect.arrayContaining([
      "evidence",
      "document_quality",
      "user_confirmation",
    ]));
    expect(readiness.disclaimer).toContain("does not predict");
  });

  it("meets deterministic performance targets on the synthetic scenario", () => {
    const start = performance.now();
    const session = analyseApplicationSession(createOptimisationSession({
      ownerUserId: "synthetic-user",
      profile,
      vacancy,
      matchResult: match,
      sourceCv,
    }));
    expect(performance.now() - start).toBeLessThan(500);
    const draftStart = performance.now();
    const draft = buildTailoredDraft(session);
    expect(performance.now() - draftStart).toBeLessThan(500);
    const redlineStart = performance.now();
    compareDrafts(null, draft);
    expect(performance.now() - redlineStart).toBeLessThan(300);
  });
});
