import { createHash } from "node:crypto";
import type {
  CanonicalVacancy,
  EmployabilityResult,
  EmploymentType,
  Entitlements,
  MatchInput,
  MatchWeights,
  OpportunityContext,
  OpportunityFilters,
  RankedOpportunity,
  RawVacancy,
  RemoteType,
  Seniority,
  ValidationIssue,
} from "./types";

export const defaultMatchWeights: MatchWeights = {
  skills: 0.4,
  experience: 0.25,
  qualifications: 0.1,
  certifications: 0.05,
  location: 0.1,
  salary: 0.05,
  careerGoal: 0.05,
};

export const standardEntitlements: Entitlements = {
  canViewMatches: true,
  canViewTop10Jobs: true,
  canViewUnlimitedJobs: false,
  canCompareJobs: false,
  canExportMatches: false,
  canAdvisorReview: false,
};

export const premiumEntitlements: Entitlements = {
  canViewMatches: true,
  canViewTop10Jobs: true,
  canViewUnlimitedJobs: true,
  canCompareJobs: true,
  canExportMatches: true,
  canAdvisorReview: true,
};

export function validateRawVacancy(
  raw: RawVacancy,
  existingSourceReferences: ReadonlySet<string> = new Set(),
) {
  const issues: ValidationIssue[] = [];
  for (const field of ["source", "sourceReference", "title", "description", "postedDate"] as const) {
    if (!String(raw[field] ?? "").trim()) {
      issues.push(issue("required", field, `${field} is required.`));
    }
  }
  if (existingSourceReferences.has(`${raw.source}:${raw.sourceReference}`)) {
    issues.push(issue("duplicate", "sourceReference", "This source vacancy has already been imported."));
  }
  if (
    raw.salaryMin !== undefined &&
    raw.salaryMax !== undefined &&
    raw.salaryMin > raw.salaryMax
  ) {
    issues.push(issue("salary_range", "salaryMax", "salaryMax must not be below salaryMin."));
  }
  if (raw.salaryMin !== undefined && raw.salaryMin < 0) {
    issues.push(issue("salary_value", "salaryMin", "Salary cannot be negative."));
  }
  const posted = Date.parse(raw.postedDate);
  if (!Number.isFinite(posted)) issues.push(issue("date", "postedDate", "postedDate must be ISO-compatible."));
  if (raw.expiryDate) {
    const expiry = Date.parse(raw.expiryDate);
    if (!Number.isFinite(expiry)) issues.push(issue("date", "expiryDate", "expiryDate must be ISO-compatible."));
    else if (Number.isFinite(posted) && expiry < posted) {
      issues.push(issue("date_order", "expiryDate", "expiryDate must not precede postedDate."));
    }
  }
  if (raw.applicationUrl) {
    try {
      const url = new URL(raw.applicationUrl);
      if (!["https:", "http:"].includes(url.protocol)) throw new Error("protocol");
    } catch {
      issues.push(issue("url", "applicationUrl", "applicationUrl must be an HTTP(S) URL."));
    }
  }
  return { valid: issues.every((item) => item.severity !== "error"), issues };
}

export async function normalizeVacancy(
  raw: RawVacancy,
  context: OpportunityContext,
): Promise<CanonicalVacancy> {
  assertPublished(context);
  const validation = validateRawVacancy(raw);
  if (!validation.valid) throw opportunityError("vacancy_invalid", validation.issues);
  if (raw.taxonomyVersion && raw.taxonomyVersion !== context.taxonomy.version) {
    throw opportunityError("taxonomy_version_unsupported", [
      issue("taxonomy_version", "taxonomyVersion", "Vacancy taxonomy version is not the published version."),
    ]);
  }
  const skillsText = [
    raw.description,
    ...(raw.requiredSkills ?? []),
    ...(raw.preferredSkills ?? []),
  ].join("\n");
  const skillResolution = await context.resolver.resolveSkills({
    text: skillsText,
    version: context.taxonomy.version,
  });
  const resolvedByTerm = new Map(
    skillResolution.skills.flatMap((skill) => [
      [normal(skill.sourceText), skill.skillCode] as const,
      [normal(skill.canonicalName), skill.skillCode] as const,
    ]),
  );
  const occupationResolution = await context.resolver.resolveOccupation({
    existingOccupationCode: raw.occupationCode,
    jobTitle: raw.title,
    text: raw.description,
    skillCodes: skillResolution.skills.map((skill) => skill.skillCode),
    version: context.taxonomy.version,
  });
  if (!occupationResolution.occupationCode) {
    throw opportunityError("occupation_unresolved", [
      issue("occupation", "title", "Vacancy title did not resolve to a published occupation."),
    ]);
  }
  const occupation = context.taxonomy.occupations.find(
    (item) => item.code === occupationResolution.occupationCode,
  );
  if (!occupation) throw opportunityError("occupation_unresolved", []);
  const required = mapSkillTerms(raw.requiredSkills ?? [], resolvedByTerm);
  const preferred = mapSkillTerms(raw.preferredSkills ?? [], resolvedByTerm);
  const salary = normalizeSalary(raw.salaryMin, raw.salaryMax, raw.salaryPeriod);
  const now = context.now ?? new Date();
  return {
    jobId: raw.jobId?.trim() || stableId(raw.source, raw.sourceReference),
    source: raw.source,
    sourceReference: raw.sourceReference.trim(),
    title: clean(raw.title),
    description: raw.description.trim(),
    original: structuredClone(raw),
    location: cleanNullable(raw.location),
    remoteType: normalizeRemoteType(raw.remoteType),
    employmentType: normalizeEmploymentType(raw.employmentType),
    workingPattern: cleanNullable(raw.workingPattern),
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryPeriod: salary.period,
    currency: raw.currency?.trim().toUpperCase() || null,
    postedDate: new Date(raw.postedDate).toISOString(),
    expiryDate: raw.expiryDate ? new Date(raw.expiryDate).toISOString() : null,
    applicationUrl: raw.applicationUrl?.trim() || null,
    occupationCode: occupation.code,
    occupationTitle: occupation.title,
    careerFamily: occupation.family,
    seniority: normalizeSeniority(raw.title),
    requiredSkills: required.resolved,
    preferredSkills: preferred.resolved,
    unresolvedRequiredSkills: required.unresolved,
    unresolvedPreferredSkills: preferred.unresolved,
    qualifications: unique(raw.qualifications ?? []),
    certifications: unique(raw.certifications ?? []),
    responsibilities: unique(raw.responsibilities ?? []),
    benefits: unique(raw.benefits ?? []),
    visaSponsorship: raw.visaSponsorship ?? null,
    securityClearance: raw.securityClearance ?? null,
    industry: cleanNullable(raw.industry),
    taxonomyVersion: context.taxonomy.version,
    normalizedAt: now.toISOString(),
  };
}

export function calculateEmployability(input: MatchInput): EmployabilityResult {
  const weights = validateWeights({ ...defaultMatchWeights, ...input.weights });
  const vacancy = input.vacancy;
  const profileSkills = new Map(
    input.profile.resolvedSkills.map((skill) => [skill.skillCode, skill.evidence]),
  );
  const requiredMatches = vacancy.requiredSkills.filter((code) => profileSkills.has(code));
  const preferredMatches = vacancy.preferredSkills.filter((code) => profileSkills.has(code));
  const skillDenominator = vacancy.requiredSkills.length + vacancy.preferredSkills.length * 0.35;
  const skillScore = skillDenominator === 0
    ? 0
    : pct((requiredMatches.length + preferredMatches.length * 0.35) / skillDenominator);
  const experienceRequired = inferExperienceYears(vacancy.description, vacancy.seniority);
  const experienceYears = input.experienceYears ?? profileExperienceYears(input.profile);
  const experienceScore = experienceRequired === 0 ? 100 : pct(experienceYears / experienceRequired);
  const qualifications = matchTerms(vacancy.qualifications, input.qualifications ?? profileQualifications(input.profile));
  const certifications = matchTerms(vacancy.certifications, input.certifications ?? profileCertifications(input.profile));
  const locationScore = scoreLocation(vacancy, input.preferences);
  const salaryScore = scoreSalary(vacancy, input.preferences?.salaryMin);
  const careerGoalScore = input.preferences?.desiredOccupationCode
    ? (input.preferences.desiredOccupationCode === vacancy.occupationCode ? 100 : 0)
    : 50;
  const overallScore = Math.round(
    skillScore * weights.skills +
      experienceScore * weights.experience +
      qualifications.score * weights.qualifications +
      certifications.score * weights.certifications +
      locationScore * weights.location +
      salaryScore * weights.salary +
      careerGoalScore * weights.careerGoal,
  );
  const gaps = [
    ...vacancy.requiredSkills.filter((code) => !profileSkills.has(code)).map((code) => ({
      kind: "critical_skill" as const,
      requirement: code,
      evidence: [`Vacancy requiredSkills contains published skill ${code}.`, "Career Profile has no evidence for this skill code."],
      action: `Add verified evidence for ${code} or develop this skill before applying.`,
    })),
    ...vacancy.preferredSkills.filter((code) => !profileSkills.has(code)).map((code) => ({
      kind: "preferred_skill" as const,
      requirement: code,
      evidence: [`Vacancy preferredSkills contains published skill ${code}.`],
      action: `Consider developing or evidencing ${code}.`,
    })),
    ...(experienceScore < 100 ? [{
      kind: "experience" as const,
      requirement: `${experienceRequired} years relevant experience`,
      evidence: [`Vacancy wording implies ${experienceRequired} years; profile evidence totals ${experienceYears}.`],
      action: "Document comparable responsibilities, scope and outcomes from verified experience.",
    }] : []),
    ...qualifications.missing.map((term) => gap("qualification", term)),
    ...certifications.missing.map((term) => gap("certification", term)),
    ...vacancy.unresolvedRequiredSkills.map((term) => ({
      kind: "evidence" as const,
      requirement: term,
      evidence: ["Vacancy requirement could not be resolved to a published skill."],
      action: "Request human review; unresolved terms do not count as matches.",
    })),
    ...vacancy.unresolvedPreferredSkills.map((term) => ({
      kind: "evidence" as const,
      requirement: term,
      evidence: ["Vacancy preferred requirement could not be resolved to a published skill."],
      action: "Request human review; unresolved terms do not count as matches.",
    })),
  ];
  const confidenceSignals = [
    vacancy.requiredSkills.length > 0,
    input.profile.resolvedSkills.length > 0,
    vacancy.unresolvedRequiredSkills.length === 0,
    experienceYears > 0,
    vacancy.qualifications.length + vacancy.certifications.length > 0,
  ];
  const confidence = Number((confidenceSignals.filter(Boolean).length / confidenceSignals.length).toFixed(2));
  return {
    jobId: vacancy.jobId,
    overallScore,
    matchBand: matchBand(overallScore),
    confidence,
    skillMatch: skillScore,
    experienceMatch: experienceScore,
    qualificationMatch: qualifications.score,
    certificationMatch: certifications.score,
    locationMatch: locationScore,
    salaryMatch: salaryScore,
    careerGoalMatch: careerGoalScore,
    strengths: [
      ...requiredMatches.map((code) => ({ requirement: code, evidence: profileSkills.get(code) ?? [] })),
      ...(experienceScore >= 100 ? [{ requirement: "experience", evidence: [`Profile evidence meets ${experienceRequired}-year threshold.`] }] : []),
    ],
    gaps,
    explanations: [
      `Skills contribute ${Math.round(weights.skills * 100)}% and scored ${skillScore}.`,
      `Experience contributes ${Math.round(weights.experience * 100)}% and scored ${experienceScore}.`,
      `Qualifications and certifications scored ${qualifications.score} and ${certifications.score}.`,
      `Location, salary and confirmed career-goal alignment scored ${locationScore}, ${salaryScore} and ${careerGoalScore}.`,
      "Only published taxonomy codes and supplied evidence affect the score.",
    ],
    taxonomyVersion: vacancy.taxonomyVersion,
    disclaimer: "This match band explains evidence alignment; it is not a hiring prediction.",
  };
}

export function filterVacancies(vacancies: CanonicalVacancy[], filters: OpportunityFilters) {
  const postedSince = filters.postedSince ? Date.parse(filters.postedSince) : null;
  return vacancies.filter((vacancy) =>
    (filters.minimumSalary === undefined || (vacancy.salaryMax ?? vacancy.salaryMin ?? -1) >= filters.minimumSalary) &&
    (!filters.remoteTypes?.length || filters.remoteTypes.includes(vacancy.remoteType)) &&
    (!filters.industries?.length || (!!vacancy.industry && filters.industries.some((item) => normal(item) === normal(vacancy.industry!)))) &&
    (!filters.employmentTypes?.length || filters.employmentTypes.includes(vacancy.employmentType)) &&
    (filters.visaSponsorship === undefined || vacancy.visaSponsorship === filters.visaSponsorship) &&
    (filters.securityClearance === undefined || vacancy.securityClearance === filters.securityClearance) &&
    (!filters.location || vacancy.remoteType === "Remote" || normal(vacancy.location ?? "").includes(normal(filters.location))) &&
    (postedSince === null || Date.parse(vacancy.postedDate) >= postedSince),
  );
}

export function rankOpportunities(
  matches: Array<{ vacancy: CanonicalVacancy; match: EmployabilityResult }>,
  now = new Date(),
): RankedOpportunity[] {
  return matches
    .map(({ vacancy, match }) => {
      const ageDays = Math.max(0, (now.getTime() - Date.parse(vacancy.postedDate)) / 86_400_000);
      const freshness = Math.max(0, 100 - ageDays * 2);
      const rankScore = Number((match.overallScore * 0.9 + freshness * 0.1).toFixed(2));
      return {
        vacancy,
        match,
        rankScore,
        rankReasons: [
          `Deterministic employability score: ${match.overallScore}.`,
          `Posting freshness score: ${Math.round(freshness)}.`,
        ],
      };
    })
    .sort((a, b) => b.rankScore - a.rankScore || a.vacancy.jobId.localeCompare(b.vacancy.jobId));
}

export function compareOpportunities(items: RankedOpportunity[], entitlements: Entitlements) {
  if (!entitlements.canCompareJobs) throw opportunityError("entitlement_required", []);
  return items.map(({ vacancy, match, rankScore }) => ({
    jobId: vacancy.jobId,
    title: vacancy.title,
    rankScore,
    overallScore: match.overallScore,
    band: match.matchBand,
    salary: { min: vacancy.salaryMin, max: vacancy.salaryMax, currency: vacancy.currency },
    missingRequirements: match.gaps.length,
  }));
}

function assertPublished(context: OpportunityContext) {
  if (!["published", "published_local"].includes(context.taxonomy.status)) {
    throw opportunityError("taxonomy_unavailable", []);
  }
}

function normalizeSalary(min?: number, max?: number, period = "annual") {
  const factor = period === "hourly" ? 37.5 * 52 : period === "daily" ? 5 * 52 : period === "weekly" ? 52 : period === "monthly" ? 12 : 1;
  return {
    min: min === undefined ? null : Math.round(min * factor),
    max: max === undefined ? null : Math.round(max * factor),
    period: min === undefined && max === undefined ? "unknown" as const : "annual" as const,
  };
}

function normalizeRemoteType(value?: string): RemoteType {
  const text = normal(value ?? "");
  if (text.includes("remote")) return "Remote";
  if (text.includes("hybrid")) return "Hybrid";
  return "On-site";
}

function normalizeEmploymentType(value?: string): EmploymentType {
  const text = normal(value ?? "");
  if (text.includes("fixed")) return "Fixed-term";
  if (text.includes("contract")) return "Contract";
  if (text.includes("temp")) return "Temporary";
  if (text.includes("intern")) return "Internship";
  if (text.includes("apprent")) return "Apprenticeship";
  return "Permanent";
}

function normalizeSeniority(title: string): Seniority {
  const text = normal(title);
  const entries: Array<[RegExp, Seniority]> = [
    [/\b(executive|chief|cxo)\b/, "Executive"], [/\bdirector\b/, "Director"],
    [/\bhead\b/, "Head"], [/\blead\b/, "Lead"], [/\bprincipal\b/, "Principal"],
    [/\bsenior|sr\b/, "Senior"], [/\bjunior|jr\b/, "Junior"], [/\bgraduate|trainee\b/, "Graduate"],
  ];
  return entries.find(([pattern]) => pattern.test(text))?.[1] ?? "Unspecified";
}

function inferExperienceYears(text: string, seniority: Seniority) {
  const matches = [...text.matchAll(/\b(\d{1,2})\+?\s+years?\b/gi)].map((match) => Number(match[1]));
  if (matches.length) return Math.max(...matches);
  return { Graduate: 0, Junior: 1, Mid: 3, Senior: 5, Principal: 7, Lead: 5, Head: 7, Director: 8, Executive: 10, Unspecified: 0 }[seniority];
}

function profileExperienceYears(profile: MatchInput["profile"]) {
  const months = profile.employment.reduce((sum, item) => sum + (item.durationMonths ?? 0), 0);
  return Number((months / 12).toFixed(1));
}

function profileQualifications(profile: MatchInput["profile"]) {
  return profile.education.map((item) => item.qualification ?? "").filter(Boolean);
}

function profileCertifications(profile: MatchInput["profile"]) {
  return profile.certifications.map((item) => item.name);
}

function matchTerms(required: string[], present: string[]) {
  if (!required.length) return { score: 100, missing: [] };
  const normalized = present.map(normal);
  const missing = required.filter((term) => !normalized.some((value) => value.includes(normal(term)) || normal(term).includes(value)));
  return { score: pct((required.length - missing.length) / required.length), missing };
}

function scoreLocation(vacancy: CanonicalVacancy, preferences?: MatchInput["preferences"]) {
  if (!preferences?.location && !preferences?.remoteTypes?.length) return 50;
  if (preferences.remoteTypes?.includes(vacancy.remoteType)) return 100;
  if (vacancy.remoteType === "Remote") return 100;
  return preferences.location && normal(vacancy.location ?? "").includes(normal(preferences.location)) ? 100 : 0;
}

function scoreSalary(vacancy: CanonicalVacancy, minimum?: number) {
  if (minimum === undefined) return 50;
  if (vacancy.salaryMax === null && vacancy.salaryMin === null) return 0;
  return (vacancy.salaryMax ?? vacancy.salaryMin ?? 0) >= minimum ? 100 : 0;
}

function validateWeights(weights: MatchWeights) {
  const sum = Object.values(weights).reduce((total, value) => total + value, 0);
  if (Object.values(weights).some((value) => value < 0) || Math.abs(sum - 1) > 0.0001) {
    throw opportunityError("weights_invalid", []);
  }
  return weights;
}

function matchBand(score: number): EmployabilityResult["matchBand"] {
  if (score >= 95) return "Perfect Match";
  if (score >= 85) return "Excellent Match";
  if (score >= 70) return "Strong Match";
  if (score >= 55) return "Moderate Match";
  if (score >= 40) return "Weak Match";
  return "Poor Match";
}

function mapSkillTerms(terms: string[], resolvedByTerm: Map<string, string>) {
  const resolved: string[] = [];
  const unresolved: string[] = [];
  for (const term of unique(terms)) {
    const code = resolvedByTerm.get(normal(term));
    (code ? resolved : unresolved).push(code ?? term);
  }
  return { resolved: unique(resolved), unresolved };
}

function gap(kind: "qualification" | "certification", requirement: string) {
  return {
    kind,
    requirement,
    evidence: [`Vacancy lists ${requirement}; Career Profile contains no matching evidence.`],
    action: `Obtain or verify the required ${kind}: ${requirement}.`,
  };
}

function issue(code: string, path: string, message: string): ValidationIssue {
  return { code, path, message, severity: "error" };
}

function opportunityError(code: string, issues: ValidationIssue[]) {
  return Object.assign(new Error(code), { code, issues });
}

function stableId(source: string, reference: string) {
  return `job_${createHash("sha256").update(`${source}:${reference}`).digest("hex").slice(0, 20)}`;
}

function pct(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function clean(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function cleanNullable(value?: string) {
  const cleaned = value ? clean(value) : "";
  return cleaned || null;
}

function normal(value: string) {
  return clean(value).toLocaleLowerCase("en-GB").replace(/[^\p{L}\p{N}+#.]+/gu, " ").trim();
}

function unique(values: string[]) {
  return [...new Set(values.map(clean).filter(Boolean))];
}
