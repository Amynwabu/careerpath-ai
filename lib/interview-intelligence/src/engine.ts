import { createHash } from "node:crypto";
import {
  classifyVacancyRequirements,
  validateClaim,
  type VacancyRequirement,
} from "@workspace/application-intelligence";
import type { CareerProfile } from "@workspace/career-profile";
import type {
  AnswerCompleteness,
  CoachingFeedback,
  CompetencyCategory,
  InterviewCompetency,
  InterviewEntitlements,
  InterviewQuestion,
  InterviewReadiness,
  InterviewSession,
  PracticeSession,
  SelectedInterviewEvidence,
  StarResponse,
  StarSection,
} from "./types";

export const standardInterviewEntitlements: InterviewEntitlements = {
  canViewInterviewCompetencies: true,
  canGenerateQuestionPlan: true,
  canBuildStarResponses: false,
  canRunPracticeSession: false,
  canRunFullMockInterview: false,
  canViewDetailedFeedback: false,
  canPrepareTechnicalInterview: false,
  canRequestAdvisorInterviewReview: false,
  canExportInterviewPack: false,
  canViewInterviewHistory: false,
};

export const premiumInterviewEntitlements: InterviewEntitlements = {
  canViewInterviewCompetencies: true,
  canGenerateQuestionPlan: true,
  canBuildStarResponses: true,
  canRunPracticeSession: true,
  canRunFullMockInterview: true,
  canViewDetailedFeedback: true,
  canPrepareTechnicalInterview: true,
  canRequestAdvisorInterviewReview: true,
  canExportInterviewPack: true,
  canViewInterviewHistory: true,
};

export function createInterviewSession(input: {
  ownerUserId: string;
  profile: InterviewSession["profile"];
  vacancy: InterviewSession["vacancy"];
  matchResult: InterviewSession["matchResult"];
  cvAnalysis?: InterviewSession["cvAnalysis"];
  tailoredDraft?: InterviewSession["tailoredDraft"];
  cvOptimisationSessionId?: string;
  interviewType?: InterviewSession["interviewType"];
  interviewDate?: string;
  formatConfirmed?: boolean;
  now?: Date;
}): InterviewSession {
  if (!input.profile?.profileId) throw interviewError("profile_invalid");
  if (!input.vacancy?.jobId || !input.vacancy.taxonomyVersion) {
    throw interviewError("vacancy_unresolved");
  }
  if (input.vacancy.expiryDate && Date.parse(input.vacancy.expiryDate) < (input.now ?? new Date()).getTime()) {
    throw interviewError("vacancy_expired");
  }
  const now = input.now ?? new Date();
  return {
    sessionId: id("cpx_interview", `${input.ownerUserId}:${input.profile.profileId}:${input.vacancy.jobId}:${now.toISOString()}`),
    ownerUserId: input.ownerUserId,
    profileId: input.profile.profileId,
    vacancyId: input.vacancy.jobId,
    matchResultId: `match_${input.matchResult.jobId}`,
    cvOptimisationSessionId: input.cvOptimisationSessionId ?? null,
    sessionVersion: "1.0",
    interviewType: input.interviewType ?? "mixed",
    interviewFormatStatus: input.formatConfirmed ? "confirmed" : "unconfirmed",
    interviewDate: input.interviewDate ?? null,
    status: "draft",
    profile: structuredClone(input.profile),
    vacancy: structuredClone(input.vacancy),
    requirements: classifyVacancyRequirements(input.vacancy),
    matchResult: structuredClone(input.matchResult),
    cvAnalysis: input.cvAnalysis ? structuredClone(input.cvAnalysis) : null,
    tailoredDraft: input.tailoredDraft ? structuredClone(input.tailoredDraft) : null,
    competencies: [],
    questionPlan: [],
    evidenceSelections: [],
    responses: [],
    practiceSessions: [],
    readiness: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    recordVersion: 1,
  };
}

export function mapInterviewCompetencies(
  requirements: VacancyRequirement[],
): InterviewCompetency[] {
  const grouped = new Map<CompetencyCategory, VacancyRequirement[]>();
  for (const requirement of requirements) {
    const category = competencyFor(requirement);
    grouped.set(category, [...(grouped.get(category) ?? []), requirement]);
  }
  return [...grouped.entries()]
    .map(([category, items]) => ({
      competencyId: id("comp", `${category}:${items.map((item) => item.requirementId).sort().join(":")}`),
      category,
      label: label(category),
      importance: items.some((item) => item.importance === "mandatory")
        ? "mandatory" as const
        : items.some((item) => item.importance === "preferred")
          ? "medium" as const
          : "contextual" as const,
      vacancyRequirementIds: items.map((item) => item.requirementId).sort(),
      canonicalSkillCodes: items.map((item) => item.canonicalSkillCode).filter((value): value is string => !!value).sort(),
      sourceEvidence: items.map((item) => item.rawText),
      confidence: items.every((item) => item.sourceOffset.start >= 0) ? 0.95 : 0.85,
    }))
    .sort((left, right) =>
      importanceValue(right.importance) - importanceValue(left.importance) ||
      left.category.localeCompare(right.category),
    );
}

export function buildQuestionPlan(
  competencies: InterviewCompetency[],
  requirements: VacancyRequirement[],
  options: {
    includeTechnical?: boolean;
    userDecisionCategories?: Array<"salary" | "availability" | "work_authorisation">;
  } = {},
): InterviewQuestion[] {
  const questions: InterviewQuestion[] = [
    question("career_summary", "Briefly summarise the experience most relevant to this role.", [], [], "high", "STAR-L", "Role-relevant opening preparation."),
    question("motivation", "What interests you about this role and career direction?", [], [], "medium", "CAR", "Motivation must be supplied by the candidate."),
  ];
  for (const competency of competencies) {
    const itemRequirements = requirements.filter((item) =>
      competency.vacancyRequirementIds.includes(item.requirementId),
    );
    if (competency.category === "technical_capability" && !options.includeTechnical) continue;
    questions.push(question(
      questionTypeFor(competency.category),
      questionText(competency),
      [competency.competencyId],
      itemRequirements.map((item) => item.requirementId),
      competency.importance,
      competency.category === "technical_capability" ? "conceptual" : "STAR",
      `Role-relevant practice question mapped to ${itemRequirements.map((item) => item.rawText).join("; ")}.`,
    ));
  }
  for (const category of options.userDecisionCategories ?? []) {
    questions.push(question(
      category,
      category === "salary" ? "What salary range would you like to discuss?"
        : category === "availability" ? "When would you be available to start?"
          : "What work-authorisation statement have you confirmed for this application?",
      [], [], "contextual", "CAR", "This answer must be supplied by the candidate.",
    ));
  }
  questions.push(question(
    "candidate_questions",
    "What would success look like in the first six months of this role?",
    [], [], "medium", "conceptual",
    "Neutral role-focused question; no employer-specific facts are assumed.",
  ));
  return questions;
}

export function selectEvidenceForQuestions(
  questions: InterviewQuestion[],
  requirements: VacancyRequirement[],
  profile: CareerProfile,
): SelectedInterviewEvidence[] {
  const selections: SelectedInterviewEvidence[] = [];
  const usage = new Map<string, number>();
  for (const question of questions) {
    const terms = requirements
      .filter((item) => question.requirementIds.includes(item.requirementId))
      .flatMap((item) => [item.rawText, item.canonicalSkillCode ?? ""])
      .filter(Boolean);
    const candidates = evidenceCandidates(profile)
      .map((candidate) => ({
        ...candidate,
        relevance: Math.max(...terms.map((term) => overlap(candidate.text, term)), 0),
        usage: usage.get(candidate.evidenceId) ?? 0,
      }))
      .filter((candidate) => candidate.relevance >= 0.2)
      .sort((a, b) =>
        b.relevance - a.relevance ||
        a.usage - b.usage ||
        a.evidenceId.localeCompare(b.evidenceId),
      );
    const strongest = candidates[0];
    if (!strongest) {
      selections.push({
        evidenceId: `missing_${question.questionId}`,
        questionId: question.questionId,
        evidenceStrength: "missing",
        verificationStatus: "unconfirmed",
        relevance: 0,
        sourceReferences: [],
        selectionReason: "No Career Profile example met the deterministic relevance threshold.",
        sourceText: "",
      });
      continue;
    }
    usage.set(strongest.evidenceId, strongest.usage + 1);
    selections.push({
      evidenceId: strongest.evidenceId,
      questionId: question.questionId,
      evidenceStrength: strongest.relevance >= 0.65 ? "strong" : strongest.relevance >= 0.4 ? "moderate" : "weak",
      verificationStatus: strongest.verificationStatus,
      relevance: Number(strongest.relevance.toFixed(2)),
      sourceReferences: strongest.sourceReferences,
      selectionReason: strongest.usage
        ? "Relevant evidence reused because no stronger diverse example was available."
        : "Most relevant supported example with evidence diversity considered.",
      sourceText: strongest.text,
    });
  }
  return selections;
}

export function analyseInterviewSession(session: InterviewSession, now = new Date()) {
  const competencies = mapInterviewCompetencies(session.requirements);
  const questionPlan = buildQuestionPlan(competencies, session.requirements, {
    includeTechnical: ["technical", "mixed", "panel"].includes(session.interviewType),
  });
  const evidenceSelections = selectEvidenceForQuestions(
    questionPlan,
    session.requirements,
    session.profile,
  );
  const missingPriority = evidenceSelections.some((selection) =>
    selection.evidenceStrength === "missing" &&
    ["mandatory", "high"].includes(questionPlan.find((item) => item.questionId === selection.questionId)?.importance ?? ""),
  );
  return {
    ...structuredClone(session),
    competencies,
    questionPlan,
    evidenceSelections,
    status: missingPriority ? "requires_evidence" as const : "ready_for_practice" as const,
    updatedAt: now.toISOString(),
    recordVersion: session.recordVersion + 1,
  };
}

export function buildStarResponse(input: {
  question: InterviewQuestion;
  evidence: SelectedInterviewEvidence[];
  framework?: StarResponse["framework"];
  sections: {
    situation?: string;
    task?: string;
    action?: string;
    result?: string;
    learning?: string;
  };
  now?: Date;
}): StarResponse {
  const sources = input.evidence
    .filter((item) => item.evidenceStrength !== "missing")
    .map((item) => ({ evidenceId: item.evidenceId, text: item.sourceText }));
  const section = (text?: string): StarSection | null => {
    if (!text?.trim()) return null;
    const validation = validateClaim({ text, sourceTexts: sources });
    return {
      text: text.trim(),
      claimStatus: validation.status,
      sourceEvidenceIds: validation.sourceEvidenceIds,
    };
  };
  const sections = {
    situation: section(input.sections.situation),
    task: section(input.sections.task),
    action: section(input.sections.action),
    result: section(input.sections.result),
    learning: section(input.sections.learning),
  };
  const statuses = Object.values(sections).filter(Boolean).map((item) => item!.claimStatus);
  const overall = statuses.includes("conflicting") ? "conflicting"
    : statuses.includes("unsupported") ? "unsupported"
      : statuses.includes("user_confirmation_required") ? "user_confirmation_required"
        : statuses.every((status) => status === "directly_supported") ? "directly_supported"
          : "supported_rewrite";
  return {
    responseId: id("response", `${input.question.questionId}:${JSON.stringify(input.sections)}:${input.now?.toISOString() ?? ""}`),
    questionId: input.question.questionId,
    responseVersion: 1,
    framework: input.framework ?? "STAR",
    ...sections,
    overallClaimStatus: overall,
    reviewStatus: ["unsupported", "conflicting"].includes(overall) ? "revision_required" : "draft",
    createdAt: (input.now ?? new Date()).toISOString(),
    recordVersion: 1,
  };
}

export function scoreAnswerCompleteness(
  response: StarResponse,
  question: InterviewQuestion,
  evidence: SelectedInterviewEvidence[],
): AnswerCompleteness {
  const relevance = question.requirementIds.length ? 100 : 70;
  const strength = Math.round(
    Math.max(...evidence.map((item) => ({
      strong: 100, moderate: 75, weak: 40, unconfirmed: 20,
      conflicting: 0, missing: 0,
    }[item.evidenceStrength])), 0),
  );
  const clarity = (section: StarSection | null) =>
    section?.text && tokens(section.text).length >= 5 ? 100 : section?.text ? 50 : 0;
  const situationClarity = clarity(response.situation);
  const taskClarity = clarity(response.task);
  const actionSpecificity = response.action?.text
    ? /\b(?:I|my)\b/i.test(response.action.text) && tokens(response.action.text).length >= 6 ? 100 : 60
    : 0;
  const resultEvidence = response.result?.sourceEvidenceIds.length ? 100 : response.result ? 30 : 0;
  const reflection = response.learning ? clarity(response.learning) : response.framework === "STAR-L" ? 0 : 100;
  const score = Math.round(
    relevance * 0.2 + strength * 0.25 + situationClarity * 0.1 +
    taskClarity * 0.1 + actionSpecificity * 0.2 + resultEvidence * 0.1 +
    reflection * 0.05,
  );
  return {
    score,
    band: score >= 90 ? "practice_ready" : score >= 75 ? "strong"
      : score >= 60 ? "developing" : score >= 40 ? "weak" : "insufficient_evidence",
    requirementRelevance: relevance,
    evidenceStrength: strength,
    situationClarity,
    taskClarity,
    actionSpecificity,
    resultEvidence,
    reflection,
    disclaimer: "Answer completeness measures preparation structure and evidence; it does not predict interview success.",
  };
}

export function generateCoachingFeedback(
  response: StarResponse,
  score: AnswerCompleteness,
): CoachingFeedback[] {
  const feedback: CoachingFeedback[] = [];
  const add = (
    category: CoachingFeedback["category"],
    severity: CoachingFeedback["severity"],
    message: string,
    recommendation: string,
    refs: string[] = [],
  ) => feedback.push({
    feedbackId: id("feedback", `${response.responseId}:${category}:${message}`),
    responseId: response.responseId,
    category,
    severity,
    message,
    recommendation,
    sourceReferences: refs,
  });
  if (["unsupported", "conflicting"].includes(response.overallClaimStatus)) {
    add("risk_of_overclaim", "critical", "The answer contains an unsupported or conflicting claim.", "Remove or correct the claim using confirmed source evidence.");
  }
  if (score.actionSpecificity < 100) {
    add("ownership", "high", "The action does not clearly identify the candidate's personal contribution.", "State what you personally decided, produced or completed.");
  }
  if (!response.result) add("result", "high", "The answer does not include a result.", "Add an evidenced outcome without inventing metrics.");
  else if (score.resultEvidence < 100) add("evidence", "high", "The result lacks linked evidence.", "Link the outcome to a Career Profile source or request confirmation.");
  if (!response.task) add("structure", "medium", "The task component is missing.", "Clarify the responsibility assigned to you.");
  if (response.framework === "STAR-L" && !response.learning) add("reflection", "medium", "The learning component is missing.", "Add only a confirmed or cautiously framed reflection.");
  if (!feedback.length) add("structure", "informational", "All required answer components contain supported evidence.", "Practise delivering the same evidence clearly within the indicative time.");
  return feedback;
}

export function buildFollowUpQuestions(
  response: StarResponse,
  score: AnswerCompleteness,
) {
  const questions: string[] = [];
  if (score.actionSpecificity < 100) questions.push("What specifically did you do?");
  if (score.resultEvidence < 100) questions.push("How did you assess the result?");
  if (!response.task) questions.push("What responsibility was assigned specifically to you?");
  if (!response.learning && response.framework === "STAR-L") questions.push("What would you do differently?");
  if (["unsupported", "conflicting"].includes(response.overallClaimStatus)) {
    questions.push("Which source evidence supports that statement?");
  }
  return questions;
}

export function createPracticeSession(input: {
  interviewSessionId: string;
  questions: InterviewQuestion[];
  mode: PracticeSession["mode"];
  now?: Date;
}): PracticeSession {
  if (!input.questions.length) throw interviewError("practice_session_invalid");
  const selected = input.mode === "technical_focus"
    ? input.questions.filter((item) => item.questionType === "technical")
    : input.mode === "leadership_focus"
      ? input.questions.filter((item) => item.questionType === "leadership")
      : input.mode === "competency_focus"
        ? input.questions.filter((item) => ["competency", "behavioural", "stakeholder"].includes(item.questionType))
        : input.questions;
  if (!selected.length) throw interviewError("practice_session_invalid");
  const now = input.now ?? new Date();
  return {
    practiceSessionId: id("practice", `${input.interviewSessionId}:${input.mode}:${now.toISOString()}`),
    interviewSessionId: input.interviewSessionId,
    mode: input.mode,
    questionIds: selected.map((item) => item.questionId),
    startedAt: now.toISOString(),
    completedAt: null,
    responseIds: [],
    scores: {},
    feedbackIds: [],
    status: "in_progress",
    recordVersion: 1,
  };
}

export function completePracticeSession(
  practice: PracticeSession,
  responses: StarResponse[],
  scores: Record<string, number>,
  feedbackIds: string[],
  now = new Date(),
) {
  const attempted = new Set(responses.map((item) => item.questionId));
  if (!practice.questionIds.every((questionId) => attempted.has(questionId))) {
    throw interviewError("practice_session_invalid");
  }
  return {
    ...practice,
    responseIds: responses.map((item) => item.responseId),
    scores: structuredClone(scores),
    feedbackIds: [...feedbackIds],
    status: "completed" as const,
    completedAt: now.toISOString(),
    recordVersion: practice.recordVersion + 1,
  };
}

export function calculateInterviewReadiness(input: {
  session: InterviewSession;
  completeness: AnswerCompleteness[];
  motivationSupplied: boolean;
  candidateQuestionsPrepared: boolean;
  salaryRequired?: boolean;
  salarySupplied?: boolean;
  availabilityRequired?: boolean;
  availabilitySupplied?: boolean;
  workAuthorisationRequired?: boolean;
  workAuthorisationSupplied?: boolean;
}): InterviewReadiness {
  const priority = input.session.competencies.filter((item) => ["mandatory", "high"].includes(item.importance));
  const coveredPriority = priority.filter((item) =>
    input.session.evidenceSelections.some((selection) =>
      selection.evidenceStrength !== "missing" &&
      input.session.questionPlan.find((question) =>
        question.questionId === selection.questionId &&
        question.competencyIds.includes(item.competencyId),
      ),
    ),
  ).length;
  const priorityCompetencyCoverage = pct(coveredPriority / Math.max(1, priority.length));
  const evidenceReadiness = pct(
    input.session.evidenceSelections.filter((item) => ["strong", "moderate"].includes(item.evidenceStrength)).length /
    Math.max(1, input.session.evidenceSelections.length),
  );
  const starCompleteness = average(input.completeness.map((item) => item.score));
  const technicalQuestions = input.session.questionPlan.filter((item) => item.questionType === "technical");
  const technicalPreparation = technicalQuestions.length
    ? pct(technicalQuestions.filter((question) =>
        input.session.responses.some((response) => response.questionId === question.questionId),
      ).length / technicalQuestions.length)
    : 100;
  const motivationAlignment = input.motivationSupplied ? 100 : 0;
  const candidateQuestionsPrepared = input.candidateQuestionsPrepared ? 100 : 0;
  const blockers: InterviewReadiness["blockers"] = [];
  if (priorityCompetencyCoverage < 100) blockers.push({ code: "missing_mandatory_evidence", category: "evidence", message: "At least one priority competency lacks suitable evidence." });
  if (input.session.responses.some((item) => ["unsupported", "conflicting"].includes(item.overallClaimStatus))) blockers.push({ code: "unsupported_star_claim", category: "claim", message: "A STAR response contains unsupported or conflicting content." });
  if (technicalPreparation < 100) blockers.push({ code: "technical_area_unprepared", category: "preparation", message: "A role-relevant technical preparation area has not been attempted." });
  if (!input.motivationSupplied) blockers.push({ code: "motivation_input_required", category: "user_decision", message: "Role motivation must be supplied by the candidate." });
  if (input.salaryRequired && !input.salarySupplied) blockers.push({ code: "salary_input_required", category: "user_decision", message: "Salary expectations require candidate input." });
  if (input.availabilityRequired && !input.availabilitySupplied) blockers.push({ code: "availability_input_required", category: "user_decision", message: "Availability requires candidate input." });
  if (input.workAuthorisationRequired && !input.workAuthorisationSupplied) blockers.push({ code: "work_authorisation_input_required", category: "user_decision", message: "Work authorization requires an explicit candidate-supplied statement." });
  const score = Math.round(
    priorityCompetencyCoverage * 0.25 + evidenceReadiness * 0.25 +
    starCompleteness * 0.2 + technicalPreparation * 0.15 +
    motivationAlignment * 0.1 + candidateQuestionsPrepared * 0.05,
  );
  return {
    score,
    priorityCompetencyCoverage,
    evidenceReadiness,
    starCompleteness,
    technicalPreparation,
    motivationAlignment,
    candidateQuestionsPrepared,
    blockers,
    disclaimer: "Interview readiness measures evidence-based preparation; it does not predict hiring outcomes.",
  };
}

export function interviewProgress(session: InterviewSession) {
  const attempted = new Set(session.responses.map((item) => item.questionId));
  const supported = session.responses.filter((item) =>
    ["directly_supported", "supported_rewrite", "supported_summary"].includes(item.overallClaimStatus),
  );
  return {
    completionProgress: pct(attempted.size / Math.max(1, session.questionPlan.length)),
    verifiedPreparationProgress: pct(supported.length / Math.max(1, session.questionPlan.length)),
    questionsAttempted: attempted.size,
    competenciesCovered: new Set(session.questionPlan
      .filter((item) => attempted.has(item.questionId))
      .flatMap((item) => item.competencyIds)).size,
    evidenceGaps: session.evidenceSelections.filter((item) => item.evidenceStrength === "missing").length,
    evidenceReuse: reuseCounts(session.evidenceSelections),
    revisions: session.responses.reduce((sum, item) => sum + Math.max(0, item.responseVersion - 1), 0),
  };
}

export function exportInterviewPack(session: InterviewSession) {
  return {
    sessionId: session.sessionId,
    role: session.vacancy.title,
    formatStatus: session.interviewFormatStatus,
    competencies: session.competencies,
    questions: session.questionPlan,
    responses: session.responses.map((response) => ({
      ...response,
      situation: visibleSection(response.situation),
      task: visibleSection(response.task),
      action: visibleSection(response.action),
      result: visibleSection(response.result),
      learning: visibleSection(response.learning),
    })),
    readiness: session.readiness,
    generatedAt: new Date().toISOString(),
    disclaimer: "Role-relevant preparation pack; questions are not claimed to be employer-provided.",
  };
}

function competencyFor(requirement: VacancyRequirement): CompetencyCategory {
  if (requirement.type === "mandatory_skill" || requirement.type === "preferred_skill" || requirement.type === "tool_or_technology") return "technical_capability";
  if (requirement.type === "certification_requirement") return "certification_validation";
  if (requirement.type === "qualification_requirement") return "qualification_validation";
  if (requirement.type === "leadership_requirement") return "leadership";
  if (requirement.type === "experience_requirement") return "role_experience";
  const text = normal(requirement.rawText);
  if (/stakeholder|client|partner/.test(text)) return "stakeholder_management";
  if (/risk|issue|hazard/.test(text)) return "risk_management";
  if (/deliver|project|programme/.test(text)) return "delivery";
  if (/safety|safe/.test(text)) return "safety";
  if (/quality|standard|assurance/.test(text)) return "quality";
  if (/communicat|present|write/.test(text)) return "communication";
  return "role_experience";
}

function questionText(competency: InterviewCompetency) {
  const texts: Partial<Record<CompetencyCategory, string>> = {
    technical_capability: `Explain how you would approach ${competency.sourceEvidence[0] ?? "this technical requirement"}, distinguishing your experience from general study knowledge.`,
    leadership: "Describe a time you personally led or coordinated work relevant to this role.",
    stakeholder_management: "Describe a time you managed differing stakeholder priorities.",
    risk_management: "Describe a time you identified and managed a significant risk.",
    delivery: "Describe a time you delivered an important piece of work under constraints.",
    qualification_validation: "How has your relevant qualification prepared you for this work?",
    certification_validation: "Explain the status and relevance of your required certification.",
    role_experience: "Describe a relevant example that demonstrates this role requirement.",
  };
  return texts[competency.category] ?? `Describe a relevant example of ${competency.label.toLowerCase()}.`;
}

function questionTypeFor(category: CompetencyCategory): InterviewQuestion["questionType"] {
  if (category === "technical_capability") return "technical";
  if (category === "leadership") return "leadership";
  if (category === "stakeholder_management") return "stakeholder";
  if (category === "risk_management") return "risk";
  if (category === "qualification_validation") return "qualification_validation";
  if (category === "certification_validation") return "certification_validation";
  return "competency";
}

function question(
  questionType: InterviewQuestion["questionType"],
  text: string,
  competencyIds: string[],
  requirementIds: string[],
  importance: InterviewQuestion["importance"],
  answerFramework: InterviewQuestion["answerFramework"],
  sourceReason: string,
): InterviewQuestion {
  return {
    questionId: id("question", `${questionType}:${text}:${requirementIds.join(":")}`),
    questionType,
    text,
    competencyIds,
    requirementIds,
    importance,
    expectedEvidenceTypes: questionType === "technical"
      ? ["candidate_experience_answer", "general_study_answer"]
      : ["employment", "project", "achievement"],
    answerFramework,
    sourceReason,
    confidence: requirementIds.length ? 0.92 : 0.75,
    preparationLabel: requirementIds.length ? "role_relevant_practice_question" : "likely_preparation_area",
  };
}

function evidenceCandidates(profile: CareerProfile) {
  return [
    ...profile.employment.flatMap((item) =>
      [...item.achievements, ...item.responsibilities].map((text) => ({
        evidenceId: item.employmentId,
        text,
        verificationStatus: item.sourceReferences.length ? "document_supported" as const : item.evidenceState === "user_confirmed" ? "user_confirmed" as const : "self_reported" as const,
        sourceReferences: item.sourceReferences,
      })),
    ),
    ...profile.projects.flatMap((item) =>
      [...item.outcomes, ...item.responsibilities].map((text) => ({
        evidenceId: item.projectId,
        text,
        verificationStatus: item.sourceReferences.length ? "document_supported" as const : "self_reported" as const,
        sourceReferences: item.sourceReferences,
      })),
    ),
    ...profile.achievements.map((item) => ({
      evidenceId: item.achievementId,
      text: item.statement,
      verificationStatus: item.sourceReferences.length ? "document_supported" as const : "self_reported" as const,
      sourceReferences: item.sourceReferences,
    })),
    ...profile.rawSkillEvidence.map((item) => ({
      evidenceId: item.evidenceId,
      text: item.sourceText,
      verificationStatus: item.state === "user_confirmed" ? "user_confirmed" as const : item.sourceReferences.length ? "document_supported" as const : "unconfirmed" as const,
      sourceReferences: item.sourceReferences,
    })),
  ].filter((item) => item.text.trim());
}

function visibleSection(section: StarSection | null) {
  return section ? { text: section.text, claimStatus: section.claimStatus } : null;
}

function reuseCounts(selections: SelectedInterviewEvidence[]) {
  const counts = new Map<string, number>();
  selections.filter((item) => item.evidenceStrength !== "missing")
    .forEach((item) => counts.set(item.evidenceId, (counts.get(item.evidenceId) ?? 0) + 1));
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([evidenceId, count]) => ({ evidenceId, count }));
}

function importanceValue(value: InterviewCompetency["importance"]) {
  return { mandatory: 5, high: 4, medium: 3, low: 2, contextual: 1 }[value];
}

function label(value: string) {
  return value.split("_").map((item) => item[0]?.toUpperCase() + item.slice(1)).join(" ");
}

function overlap(left: string, right: string) {
  const a = new Set(tokens(left));
  const b = new Set(tokens(right));
  if (!a.size || !b.size) return 0;
  return [...a].filter((item) => b.has(item)).length / Math.min(a.size, b.size);
}

function tokens(value: string) {
  return normal(value).split(" ").filter((item) => item.length > 2);
}

function normal(value: string) {
  return value.toLocaleLowerCase("en-GB").replace(/[^\p{L}\p{N}+#.]+/gu, " ").trim();
}

function pct(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, item) => sum + item, 0) / values.length) : 0;
}

function id(prefix: string, seed: string) {
  return `${prefix}_${createHash("sha256").update(seed).digest("hex").slice(0, 20)}`;
}

function interviewError(code: string) {
  return Object.assign(new Error(code), { code });
}
