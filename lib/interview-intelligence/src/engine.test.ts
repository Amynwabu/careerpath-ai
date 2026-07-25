import { describe, expect, it } from "vitest";
import type { CareerProfile } from "@workspace/career-profile";
import type { CanonicalVacancy, EmployabilityResult } from "@workspace/opportunity-intelligence";
import {
  analyseInterviewSession,
  buildFollowUpQuestions,
  buildQuestionPlan,
  buildStarResponse,
  calculateInterviewReadiness,
  completePracticeSession,
  createInterviewSession,
  createPracticeSession,
  generateCoachingFeedback,
  interviewProgress,
  mapInterviewCompetencies,
  scoreAnswerCompleteness,
  selectEvidenceForQuestions,
} from "./engine";

const vacancy = {
  jobId: "job_fixture",
  title: "Programme Director",
  description: "Requires 7 years programme delivery, stakeholder management, risk management and leadership.",
  requiredSkills: ["SK-DELIVERY", "SK-RISK"],
  preferredSkills: ["SK-STAKEHOLDER"],
  unresolvedRequiredSkills: ["Team leadership"],
  unresolvedPreferredSkills: [],
  qualifications: ["Degree"],
  certifications: [],
  responsibilities: ["Lead programme delivery"],
  occupationCode: "OCC-DIRECTOR",
  occupationTitle: "Programme Director",
  taxonomyVersion: "2026.1",
  expiryDate: null,
} as unknown as CanonicalVacancy;

const profile = {
  profileId: "profile_fixture",
  employment: [{
    employmentId: "employment_1",
    achievements: ["Managed programme delivery and contributed to reducing delays."],
    responsibilities: ["Coordinated stakeholders and maintained the risk register."],
    sourceReferences: ["ref_1"],
    evidenceState: "known",
  }],
  projects: [],
  achievements: [],
  rawSkillEvidence: [],
} as unknown as CareerProfile;

const match = { jobId: vacancy.jobId } as EmployabilityResult;

function analysed() {
  return analyseInterviewSession(createInterviewSession({
    ownerUserId: "synthetic-user",
    profile,
    vacancy,
    matchResult: match,
    interviewType: "mixed",
    now: new Date("2026-07-25T10:00:00Z"),
  }));
}

describe("competency and question planning", () => {
  it("maps every competency to vacancy requirements without promoting preferred requirements", () => {
    const session = createInterviewSession({ ownerUserId: "u", profile, vacancy, matchResult: match });
    const competencies = mapInterviewCompetencies(session.requirements);
    expect(competencies.length).toBeGreaterThan(2);
    expect(competencies.every((item) => item.vacancyRequirementIds.length > 0)).toBe(true);
    const preferred = session.requirements.find((item) => item.canonicalSkillCode === "SK-STAKEHOLDER");
    expect(preferred?.importance).toBe("preferred");
  });

  it("creates traceable technical, leadership and candidate questions", () => {
    const session = createInterviewSession({ ownerUserId: "u", profile, vacancy, matchResult: match });
    const competencies = mapInterviewCompetencies(session.requirements);
    const questions = buildQuestionPlan(competencies, session.requirements, { includeTechnical: true });
    expect(questions.map((item) => item.questionType)).toEqual(expect.arrayContaining([
      "technical", "leadership", "candidate_questions",
    ]));
    expect(questions.filter((item) => item.requirementIds.length).every((item) => item.sourceReason.includes("mapped"))).toBe(true);
    expect(questions.every((item) => !item.text.includes("will definitely"))).toBe(true);
  });
});

describe("evidence selection", () => {
  it("selects document-supported evidence and marks missing questions explicitly", () => {
    const session = analysed();
    expect(session.evidenceSelections).toEqual(expect.arrayContaining([
      expect.objectContaining({ verificationStatus: "document_supported" }),
      expect.objectContaining({ evidenceStrength: "missing" }),
    ]));
  });

  it("tracks evidence reuse rather than inventing weak examples", () => {
    const session = analysed();
    const progress = interviewProgress(session);
    expect(progress.evidenceReuse.every((item) => item.count > 1)).toBe(true);
  });
});

describe("STAR claim safety and coaching", () => {
  it("builds a supported response with provenance and completeness feedback", () => {
    const session = analysed();
    const supportedSelection = session.evidenceSelections.find((item) => item.evidenceStrength !== "missing")!;
    const question = session.questionPlan.find((item) => item.questionId === supportedSelection.questionId)!;
    const evidence = [supportedSelection];
    const source = supportedSelection.sourceText;
    const response = buildStarResponse({
      question,
      evidence,
      sections: { situation: source, task: source, action: source, result: source },
    });
    const score = scoreAnswerCompleteness(response, question, evidence);
    expect(response.overallClaimStatus).toBe("supported_rewrite");
    expect(response.action?.sourceEvidenceIds.length).toBeGreaterThan(0);
    expect(score.disclaimer).toContain("does not predict");
    expect(generateCoachingFeedback(response, score).length).toBeGreaterThan(0);
  });

  it("blocks invented metrics and inflated leadership", () => {
    const session = analysed();
    const question = session.questionPlan.find((item) => item.requirementIds.length)!;
    const evidence = [{
      evidenceId: "ref_1",
      questionId: question.questionId,
      evidenceStrength: "strong" as const,
      verificationStatus: "document_supported" as const,
      relevance: 1,
      sourceReferences: ["ref_1"],
      selectionReason: "fixture",
      sourceText: "Supported a programme team and helped reduce delay.",
    }];
    const response = buildStarResponse({
      question,
      evidence,
      sections: {
        situation: "Supported a programme team.",
        task: "Supported delivery.",
        action: "Led the programme.",
        result: "Reduced delay by 35%.",
      },
    });
    expect(response.overallClaimStatus).toBe("unsupported");
    const score = scoreAnswerCompleteness(response, question, evidence);
    expect(generateCoachingFeedback(response, score)).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: "risk_of_overclaim", severity: "critical" }),
    ]));
    expect(buildFollowUpQuestions(response, score)).toContain("Which source evidence supports that statement?");
  });
});

describe("practice and readiness", () => {
  it("creates and completes guided practice while preserving progress", () => {
    const session = analysed();
    const question = session.questionPlan[0]!;
    const evidence = session.evidenceSelections.filter((item) => item.questionId === question.questionId);
    const response = buildStarResponse({
      question,
      evidence,
      sections: { situation: evidence[0]?.sourceText, task: evidence[0]?.sourceText, action: evidence[0]?.sourceText, result: evidence[0]?.sourceText },
    });
    const practice = createPracticeSession({
      interviewSessionId: session.sessionId,
      questions: [question],
      mode: "guided",
    });
    const completed = completePracticeSession(practice, [response], { [question.questionId]: 70 }, []);
    expect(completed.status).toBe("completed");
    expect(completed.recordVersion).toBe(2);
  });

  it("rejects incomplete practice completion", () => {
    const session = analysed();
    const practice = createPracticeSession({
      interviewSessionId: session.sessionId,
      questions: session.questionPlan.slice(0, 2),
      mode: "guided",
    });
    expect(() => completePracticeSession(practice, [], {}, [])).toThrow("practice_session_invalid");
  });

  it("separates evidence, preparation and user-decision blockers", () => {
    const session = analysed();
    const readiness = calculateInterviewReadiness({
      session,
      completeness: [],
      motivationSupplied: false,
      candidateQuestionsPrepared: false,
      salaryRequired: true,
      salarySupplied: false,
    });
    expect(readiness.blockers.map((item) => item.category)).toEqual(expect.arrayContaining([
      "evidence", "preparation", "user_decision",
    ]));
    expect(readiness.disclaimer).toContain("does not predict");
  });

  it("meets deterministic performance targets on synthetic input", () => {
    const start = performance.now();
    const session = analysed();
    expect(performance.now() - start).toBeLessThan(300);
    const readinessStart = performance.now();
    calculateInterviewReadiness({
      session,
      completeness: [],
      motivationSupplied: false,
      candidateQuestionsPrepared: false,
    });
    expect(performance.now() - readinessStart).toBeLessThan(200);
  });
});
