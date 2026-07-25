import { Router, type IRouter, type Request, type Response } from "express";
import {
  calculateEmployability,
  compareOpportunities,
  filterVacancies,
  normalizeVacancy,
  premiumEntitlements,
  rankOpportunities,
  standardEntitlements,
  type CanonicalVacancy,
  type EmployabilityResult,
  type Entitlements,
  type RankedOpportunity,
  type RawVacancy,
} from "@workspace/opportunity-intelligence";
import { requireAuth } from "../middlewares/auth";
import {
  careerIntelligenceEngine,
  publishedTaxonomyProvider,
} from "../lib/career-intelligence-provider";

const router: IRouter = Router();
router.use(requireAuth);
router.use(requireNonProductionWorkflow);

// Deliberately process-local until the governed vacancy store is provisioned.
// All records remain owner-scoped and are never treated as taxonomy source data.
const vacancies = new Map<string, CanonicalVacancy>();
const matchesByOwner = new Map<string, RankedOpportunity[]>();

router.post("/jobs/import", async (req, res) => {
  await respondOpportunity(res, async () => {
    const taxonomy = await publishedTaxonomyProvider.getPublishedSnapshot(
      req.body?.taxonomyVersion,
    );
    const items = Array.isArray(req.body?.items)
      ? req.body.items as RawVacancy[]
      : [req.body?.vacancy as RawVacancy];
    if (!items.length || items.some((item) => !item)) {
      throw coded("vacancy_invalid", "At least one vacancy is required.");
    }
    const existing = new Set(
      [...vacancies.values()].map((item) => `${item.source}:${item.sourceReference}`),
    );
    const imported: CanonicalVacancy[] = [];
    for (const item of items) {
      if (existing.has(`${item.source}:${item.sourceReference}`)) {
        throw coded("duplicate_vacancy", "A vacancy with this source reference already exists.");
      }
      const normalized = await normalizeVacancy(item, {
        taxonomy,
        resolver: careerIntelligenceEngine,
      });
      vacancies.set(normalized.jobId, normalized);
      existing.add(`${normalized.source}:${normalized.sourceReference}`);
      imported.push(normalized);
    }
    return { items: imported, count: imported.length, persistenceStatus: "process_local" };
  });
});

router.get("/jobs", async (req, res) => {
  await respondOpportunity(res, async () => ({
    items: filterVacancies([...vacancies.values()], queryFilters(req)),
    persistenceStatus: "process_local",
  }));
});

router.get("/jobs/search", async (req, res) => {
  await respondOpportunity(res, async () => {
    const query = String(req.query.q ?? "").trim().toLowerCase();
    const filtered = filterVacancies([...vacancies.values()], queryFilters(req));
    return {
      items: query
        ? filtered.filter((item) =>
            `${item.title} ${item.description} ${item.occupationTitle}`.toLowerCase().includes(query),
          )
        : filtered,
      persistenceStatus: "process_local",
    };
  });
});

router.get("/jobs/:id", async (req, res) => {
  await respondOpportunity(res, async () => {
    const vacancy = vacancies.get(req.params.id);
    if (!vacancy) throw coded("job_not_found", "Job not found.");
    return { vacancy, persistenceStatus: "process_local" };
  });
});

router.post("/job-matches", async (req, res) => {
  await respondOpportunity(res, async () => {
    const selected = selectVacancies(req.body?.jobIds);
    const entitlements = resolveEntitlements(req);
    if (!entitlements.canViewMatches) throw coded("entitlement_required", "Job matching is not available.");
    const ranked = rankOpportunities(selected.map((vacancy) => ({
      vacancy,
      match: calculateEmployability({
        profile: req.body?.profile,
        vacancy,
        preferences: req.body?.preferences,
        weights: req.body?.weights,
        experienceYears: req.body?.experienceYears,
        qualifications: req.body?.qualifications,
        certifications: req.body?.certifications,
      }),
    })));
    const visible = entitlements.canViewUnlimitedJobs ? ranked : ranked.slice(0, 10);
    matchesByOwner.set(String(req.user!.userId), visible);
    return { items: visible, entitlements, persistenceStatus: "process_local" };
  });
});

router.get("/job-matches", async (req, res) => {
  await respondOpportunity(res, async () => ({
    items: matchesByOwner.get(String(req.user!.userId)) ?? [],
    entitlements: resolveEntitlements(req),
    persistenceStatus: "process_local",
  }));
});

router.post("/job-matches/compare", async (req, res) => {
  await respondOpportunity(res, async () => {
    const requested = new Set<string>(req.body?.jobIds ?? []);
    const matches = (matchesByOwner.get(String(req.user!.userId)) ?? [])
      .filter((item) => !requested.size || requested.has(item.vacancy.jobId));
    return {
      items: compareOpportunities(matches, resolveEntitlements(req)),
      persistenceStatus: "process_local",
    };
  });
});

router.post("/employability-score", async (req, res) => {
  await respondOpportunity(res, async () => {
    const vacancy = vacancies.get(String(req.body?.jobId ?? ""));
    if (!vacancy) throw coded("job_not_found", "Job not found.");
    return {
      result: calculateEmployability({
        profile: req.body?.profile,
        vacancy,
        preferences: req.body?.preferences,
        weights: req.body?.weights,
        experienceYears: req.body?.experienceYears,
        qualifications: req.body?.qualifications,
        certifications: req.body?.certifications,
      }),
      persistenceStatus: "stateless",
    };
  });
});

router.post("/jobs/explain", async (req, res) => {
  await respondOpportunity(res, async () => {
    const match = findMatch(String(req.user!.userId), String(req.body?.jobId ?? ""));
    return {
      explanation: {
        jobId: match.jobId,
        score: match.overallScore,
        band: match.matchBand,
        strengths: match.strengths,
        missingRequirements: match.gaps,
        scoreComponents: {
          skills: match.skillMatch,
          experience: match.experienceMatch,
          qualifications: match.qualificationMatch,
          certifications: match.certificationMatch,
          location: match.locationMatch,
          salary: match.salaryMatch,
          careerGoal: match.careerGoalMatch,
        },
        reasons: match.explanations,
        disclaimer: match.disclaimer,
      },
      persistenceStatus: "process_local",
    };
  });
});

export async function respondOpportunity(
  res: Response,
  operation: () => Promise<unknown>,
) {
  try {
    res.json(await operation());
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = message.toLowerCase().includes("published taxonomy")
      ? "taxonomy_unavailable"
      : String((error as { code?: string })?.code ?? "opportunity_request_invalid");
    const status = code === "taxonomy_unavailable"
      ? 503
      : code === "job_not_found" || code === "match_not_found"
        ? 404
        : code === "entitlement_required"
          ? 403
          : 400;
    res.status(status).json({
      code,
      error: safeMessage(code),
      issues: (error as { issues?: unknown })?.issues,
      ...(code === "taxonomy_unavailable" ? { taxonomyStatus: "unpublished_candidate" } : {}),
    });
  }
}

function requireNonProductionWorkflow(
  _req: Request,
  res: Response,
  next: () => void,
) {
  if (process.env.NODE_ENV === "production") {
    res.status(503).json({
      code: "persistent_store_unavailable",
      error: "Opportunity workflows require the persistent production store.",
    });
    return;
  }
  next();
}

function safeMessage(code: string) {
  const messages: Record<string, string> = {
    taxonomy_unavailable: "Opportunity intelligence is unavailable until a taxonomy is published.",
    vacancy_invalid: "The vacancy payload is invalid.",
    duplicate_vacancy: "This source vacancy has already been imported.",
    occupation_unresolved: "The vacancy occupation could not be resolved to the published taxonomy.",
    taxonomy_version_unsupported: "The requested taxonomy version is not published.",
    job_not_found: "Job not found.",
    match_not_found: "Run job matching before requesting an explanation.",
    entitlement_required: "This feature is not included in the active membership.",
    weights_invalid: "Match weights must be non-negative and total 100%.",
    persistent_store_unavailable: "Opportunity workflows require the persistent production store.",
  };
  return messages[code] ?? "Opportunity request failed.";
}

function selectVacancies(jobIds: unknown) {
  if (!Array.isArray(jobIds) || !jobIds.length) return [...vacancies.values()];
  return jobIds.map((id) => {
    const vacancy = vacancies.get(String(id));
    if (!vacancy) throw coded("job_not_found", `Job ${String(id)} was not found.`);
    return vacancy;
  });
}

function findMatch(ownerUserId: string, jobId: string): EmployabilityResult {
  const match = (matchesByOwner.get(ownerUserId) ?? [])
    .find((item) => item.vacancy.jobId === jobId)?.match;
  if (!match) throw coded("match_not_found", "Run job matching before requesting an explanation.");
  return match;
}

function resolveEntitlements(req: Request): Entitlements {
  return req.headers["x-cpx-membership"] === "premium"
    ? premiumEntitlements
    : standardEntitlements;
}

function queryFilters(req: Request) {
  return {
    minimumSalary: optionalNumber(req.query.minimumSalary),
    remoteTypes: list(req.query.remoteType) as CanonicalVacancy["remoteType"][] | undefined,
    industries: list(req.query.industry),
    employmentTypes: list(req.query.employmentType) as CanonicalVacancy["employmentType"][] | undefined,
    visaSponsorship: optionalBoolean(req.query.visaSponsorship),
    securityClearance: optionalBoolean(req.query.securityClearance),
    location: optionalString(req.query.location),
    postedSince: optionalString(req.query.postedSince),
  };
}

function list(value: unknown) {
  const text = optionalString(value);
  return text ? text.split(",").map((item) => item.trim()).filter(Boolean) : undefined;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalNumber(value: unknown) {
  const number = Number(value);
  return value === undefined || !Number.isFinite(number) ? undefined : number;
}

function optionalBoolean(value: unknown) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function coded(code: string, message: string) {
  return Object.assign(new Error(message), { code });
}

export const opportunityTestStore = {
  reset() {
    vacancies.clear();
    matchesByOwner.clear();
  },
};

export default router;
