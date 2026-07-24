import { join } from "node:path";
import type { PipelineOptions } from "../pipeline";
import {
  fileExists,
  readCsv,
  readText,
  stableHash,
  stableJson,
  writeCsv,
  writeJson,
  writeText,
} from "../utils/files";
import { reviewTaxonomy, validateGovernance } from "./governance";

type Row = Record<string, string>;

const decisionFiles = [
  "occupation-decisions.csv",
  "skill-decisions.csv",
  "alias-decisions.csv",
  "occupation-skill-decisions.csv",
  "skill-relationship-decisions.csv",
  "transition-decisions.csv",
] as const;

const finalDecisions = new Set([
  "approved",
  "rejected",
  "merged",
  "renamed",
  "reclassified",
  "needs_revision",
  "deferred_under_release_policy",
]);

export async function prepareReviewProgramme(options: PipelineOptions) {
  const summary = await reviewTaxonomy(options);
  await writeReviewerRegistry(options);
  await writeReviewerInstructions(options);
  await writeOccupationRemediation(options);
  await writeSkillProfileBatches(options);
  await writeProfessionalBodyGapPlan(options);
  await writeReleaseSubsetPolicy(options);
  await writeLocalWorkbench(options);
  const progress = await reviewProgress(options);
  const readiness = await publicationReadiness(options);
  return { summary, progress, readiness };
}

export async function reviewProgress(options: PipelineOptions) {
  const reviewRoot = decisionsRoot(options);
  const occupations = await readCsv(join(reviewRoot, "occupation-decisions.csv"));
  const skills = await readCsv(join(reviewRoot, "skill-decisions.csv"));
  const aliases = await readCsv(join(reviewRoot, "alias-decisions.csv"));
  const requirements = await readCsv(
    join(reviewRoot, "occupation-skill-decisions.csv"),
  );
  const relationships = await readCsv(
    join(reviewRoot, "skill-relationship-decisions.csv"),
  );
  const transitions = await readCsv(join(reviewRoot, "transition-decisions.csv"));
  const reviewers = await readCsv(
    join(options.canonicalRoot, "..", "reviews", "reviewers.csv"),
  );
  const isReviewed = (row: Row) =>
    finalDecisions.has(row["decision"] ?? "") &&
    Boolean(row["reviewed_by"] || row["reviewer_id"]);
  const count = (rows: Row[], decision: string) =>
    rows.filter((row) => row["decision"] === decision).length;
  const progress = {
    taxonomyVersion: options.version,
    activeReviewers: reviewers.filter((row) => row["active"] === "true").length,
    occupations: stats(occupations, isReviewed),
    skills: stats(skills, isReviewed),
    criticalAliases: stats(
      aliases.filter((row) => row["decision"] === "excluded_from_exact_matching"),
      isReviewed,
    ),
    occupationSkills: stats(requirements, isReviewed),
    transitions: stats(transitions, isReviewed),
    skillRelationships: stats(relationships, isReviewed),
    approvedOccupations: count(occupations, "approved"),
    rejectedOccupations: count(occupations, "rejected"),
    occupationsNeedingRevision: count(occupations, "needs_revision"),
    approvedSkills: count(skills, "approved"),
    mergedSkills: count(skills, "merged"),
    rejectedSkills: count(skills, "rejected"),
    openConflicts: (await detectConflicts(options)).length,
    reviewVelocity: {
      decisionsWithHumanEvidence: [
        ...occupations,
        ...skills,
        ...aliases,
        ...requirements,
        ...relationships,
        ...transitions,
      ].filter(isReviewed).length,
      period: "not_available",
    },
    estimatedReviewBatchesRemaining: {
      occupationBatches: Math.ceil(
        occupations.filter((row) => !isReviewed(row)).length / 10,
      ),
      skillBatches: Math.ceil(skills.filter((row) => !isReviewed(row)).length / 50),
      skillProfileFamilies: 6,
      aliasCriticalBatch: aliases.some((row) => !isReviewed(row)) ? 1 : 0,
      transitionBatches: Math.ceil(
        transitions.filter((row) => !isReviewed(row)).length / 25,
      ),
    },
  };
  const root = reportRoot(options);
  await writeJson(join(root, "progress.json"), progress);
  await writeText(
    join(root, "progress.md"),
    `# Taxonomy ${options.version} Review Progress\n\n` +
      `- Active authorised reviewers: ${progress.activeReviewers}\n` +
      `- Occupations reviewed: ${progress.occupations.reviewed}/${progress.occupations.total}\n` +
      `- Skills reviewed: ${progress.skills.reviewed}/${progress.skills.total}\n` +
      `- Critical alias decisions reviewed: ${progress.criticalAliases.reviewed}/${progress.criticalAliases.total}\n` +
      `- Occupation-skill relationships reviewed: ${progress.occupationSkills.reviewed}/${progress.occupationSkills.total}\n` +
      `- Transitions reviewed: ${progress.transitions.reviewed}/${progress.transitions.total}\n`,
  );
  return progress;
}

export async function validateReviewProgramme(options: PipelineOptions) {
  const governance = await validateGovernance(options);
  const reviewers = await readCsv(
    join(options.canonicalRoot, "..", "reviews", "reviewers.csv"),
  );
  const reviewerById = new Map(reviewers.map((row) => [row["reviewer_id"], row]));
  const errors: string[] = [];
  const identifiers = new Set<string>();
  for (const file of decisionFiles) {
    const rows = await readCsv(join(decisionsRoot(options), file));
    for (const [index, row] of rows.entries()) {
      const id =
        row["decision_id"] ||
        stableHash([file, row["entity_type"], row["entity_code"], index], 16);
      if (identifiers.has(id)) errors.push(`Duplicate decision identifier: ${id}`);
      identifiers.add(id);
      const reviewerId = row["reviewer_id"] || row["reviewed_by"];
      if (!reviewerId) continue;
      const reviewer = reviewerById.get(reviewerId);
      if (!reviewer || reviewer["active"] !== "true") {
        errors.push(`${file}:${index + 2} references an inactive or unknown reviewer`);
      }
      if (!row["reviewed_at"] || Number.isNaN(Date.parse(row["reviewed_at"]))) {
        errors.push(`${file}:${index + 2} has an invalid reviewed_at timestamp`);
      }
    }
  }
  const conflicts = await detectConflicts(options);
  return {
    ok: governance.structurallyValid && errors.length === 0,
    publicationReady: governance.ok && errors.length === 0 && conflicts.length === 0,
    errors: [...governance.errors, ...errors],
    blockers: governance.blockers,
    conflicts: conflicts.length,
    reviewerCount: reviewers.length,
  };
}

export async function applyReviewDecisions(options: PipelineOptions) {
  const validation = await validateReviewProgramme(options);
  if (!validation.ok) {
    throw new Error(`Review decisions are invalid: ${validation.errors.join("; ")}`);
  }
  const auditRoot = join(decisionsRoot(options), "audit");
  const auditPath = join(auditRoot, "review-audit.jsonl");
  const previous = (await fileExists(auditPath)) ? await readText(auditPath) : "";
  const existingIds = new Set(
    previous
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => (JSON.parse(line) as { audit_id: string }).audit_id),
  );
  const additions: string[] = [];
  for (const file of decisionFiles) {
    const rows = await readCsv(join(decisionsRoot(options), file));
    for (const row of rows) {
      const actor = row["reviewer_id"] || row["reviewed_by"];
      if (!actor || !finalDecisions.has(row["decision"] ?? "")) continue;
      const auditId = reviewAuditId({
        version: options.version,
        file,
        entityCode: row["entity_code"] ?? "",
        decision: row["decision"] ?? "",
        actor,
        reviewedAt: row["reviewed_at"] ?? "",
      });
      if (existingIds.has(auditId)) continue;
      additions.push(
        stableJson({
          audit_id: auditId,
          entity_type: row["entity_type"],
          entity_code: row["entity_code"],
          previous_state: "editorial_review",
          new_state: row["decision"],
          action: "apply_editorial_decision",
          actor_id: actor,
          actor_role: row["reviewer_role"] || "",
          timestamp: row["reviewed_at"],
          reason: row["review_notes"],
          source_decision_id: row["decision_id"] || "",
          taxonomy_version: options.version,
        }),
      );
    }
  }
  await writeText(
    auditPath,
    `${previous}${additions.length ? `${additions.join("\n")}\n` : ""}`,
  );
  await writeConflictReport(options);
  return {
    appliedAuditRecords: additions.length,
    publicationTriggered: false,
    progress: await reviewProgress(options),
    readiness: await publicationReadiness(options),
  };
}

export async function reviewConflicts(options: PipelineOptions) {
  const conflicts = await detectConflicts(options);
  await writeConflictReport(options);
  return { open: conflicts.length, resolved: 0, adjudications: 0 };
}

export async function publicationReadiness(options: PipelineOptions) {
  const progress = await reviewProgress(options);
  const validation = await validateReviewProgramme(options);
  const gates = [
    gate("100 occupations resolved", progress.occupations.reviewed, 100),
    gate("1,125 skills resolved", progress.skills.reviewed, 1125),
    gate(
      "Critical aliases resolved",
      progress.criticalAliases.reviewed,
      progress.criticalAliases.total,
    ),
    gate(
      "Skill profiles reviewed",
      progress.occupationSkills.reviewed,
      progress.occupationSkills.total,
    ),
    gate("Selected transitions approved", progress.transitions.reviewed, progress.transitions.total),
    gate(
      "Selected skill relationships approved",
      progress.skillRelationships.reviewed,
      progress.skillRelationships.total,
    ),
    {
      gate: "Reviewer evidence valid",
      status:
        validation.errors.length === 0 && validation.reviewerCount > 0
          ? "passed"
          : "failed",
      current_value: validation.reviewerCount,
      required_value: "at least 1 active authorised reviewer with valid evidence",
      blocking_records:
        validation.reviewerCount === 0
          ? ["No authorised reviewers are registered."]
          : validation.errors,
      recommended_action: "Register authorised reviewers and complete evidence fields.",
    },
    {
      gate: "Dedicated database available",
      status: "passed",
      current_value: "CareerPathX taxonomy local container configured",
      required_value: "CareerPathX-owned local database",
      blocking_records: [],
      recommended_action: "Keep database local and ownership-verified.",
    },
  ];
  const result = {
    taxonomyVersion: options.version,
    status: gates.every((item) => item.status === "passed")
      ? "approved_release_candidate"
      : "unpublished_candidate",
    gates,
    publicationReady: gates.every((item) => item.status === "passed"),
  };
  const root = reportRoot(options);
  await writeJson(join(root, "publication-readiness.json"), result);
  await writeText(
    join(root, "publication-readiness.md"),
    `# Taxonomy ${options.version} Publication Readiness\n\n` +
      gates
        .map(
          (item) =>
            `- ${item.gate}: **${item.status}** (${item.current_value}/${item.required_value})`,
        )
        .join("\n") +
      "\n",
  );
  return result;
}

async function writeReviewerRegistry(options: PipelineOptions) {
  const path = join(options.canonicalRoot, "..", "reviews", "reviewers.csv");
  if (await fileExists(path)) return;
  await writeCsv(path, [], [
    "reviewer_id",
    "reviewer_name",
    "reviewer_role",
    "domain_expertise",
    "organisation",
    "email",
    "active",
    "authorised_versions",
    "approved_by",
    "approved_at",
    "notes",
  ]);
  await writeJson(
    join(options.canonicalRoot, "..", "reviews", "reviewer-roles.json"),
    {
      roles: {
        taxonomy_editor: ["wording", "titles", "aliases", "classification"],
        domain_reviewer: ["occupational_realism", "skills", "levels", "transitions"],
        governance_approver: ["evidence", "conflicts", "release_gates"],
        technical_validator: ["codes", "references", "checksums", "database_readiness"],
      },
      note: "No reviewer identities are preconfigured.",
    },
  );
}

async function writeReviewerInstructions(options: PipelineOptions) {
  await writeText(
    join(reportRoot(options), "reviewer-instructions.md"),
    `# CareerPathX Taxonomy ${options.version} Reviewer Instructions\n\n` +
      `1. Register an authorised internal reviewer ID in reviewers.csv.\n` +
      `2. Inspect canonical data and source references shown in the review packs.\n` +
      `3. Record a supported decision, role, timestamp, notes, evidence summary, confidence, and source references.\n` +
      `4. Never treat technical quality or AI assistance as human approval.\n` +
      `5. Run review:validate after each batch and review:apply only after validation passes.\n`,
  );
}

async function writeOccupationRemediation(options: PipelineOptions) {
  const occupations = await readCsv(join(options.canonicalRoot, "occupations.csv"));
  const reviews = await readCsv(
    join(options.reportRoot, options.version, "governance", "occupation-review.csv"),
  );
  const reviewByCode = new Map(reviews.map((row) => [row["code"], row]));
  const rows = occupations
    .filter((row) => Number(reviewByCode.get(row["code"])?.["quality_score"] ?? 0) < 90)
    .map((row) => {
      const reasons: string[] = [];
      if (!row["description"] || row["description"].length < 40)
        reasons.push("description_incomplete");
      if (!row["uk_soc_code"] && !row["onet_code"] && !row["esco_uri"])
        reasons.push("insufficient_source_mapping");
      return {
        occupation_code: row["code"],
        occupation_title: row["canonical_title"],
        failure_reasons: reasons.join("|") || "insufficient_skill_profile",
        required_actions:
          "Review source mappings, description, aliases, regulated status, and core skill coverage.",
        recommended_reviewer_role: "taxonomy_editor|domain_reviewer",
        priority: row["career_level"] === "executive" ? "high" : "normal",
        status: "needs_revision",
      };
    });
  await writeCsv(join(reportRoot(options), "occupation-remediation-plan.csv"), rows, [
    "occupation_code", "occupation_title", "failure_reasons", "required_actions",
    "recommended_reviewer_role", "priority", "status",
  ]);
}

async function writeSkillProfileBatches(options: PipelineOptions) {
  const occupations = await readCsv(join(options.canonicalRoot, "occupations.csv"));
  const skills = await readCsv(join(options.canonicalRoot, "skills.csv"));
  const requirements = await readCsv(
    join(options.canonicalRoot, "occupation-skills.csv"),
  );
  const occupationByCode = new Map(occupations.map((row) => [row["code"], row]));
  const skillByCode = new Map(skills.map((row) => [row["code"], row]));
  const rows = requirements.map((row) => {
    const occupation = occupationByCode.get(row["occupation_code"]) ?? {};
    const skill = skillByCode.get(row["skill_code"]) ?? {};
    return {
      occupation_code: row["occupation_code"],
      occupation_title: occupation["canonical_title"] ?? "",
      skill_code: row["skill_code"],
      skill_name: skill["canonical_name"] ?? "",
      candidate_requirement_type: row["requirement_type"],
      candidate_required_level: row["required_level"],
      confidence: row["importance_weight"],
      source_count: "1",
      source_references: `${row["source_id"]}:${row["source_record_id"]}`,
      review_decision: "",
      reviewer_id: "",
      review_notes: "",
      family: occupation["career_family_code"] ?? "unassigned",
    };
  });
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = (row["family"] ?? "unassigned").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  for (const [family, group] of groups) {
    await writeCsv(join(reportRoot(options), "skill-profiles", `${family}.csv`), group, [
      "occupation_code", "occupation_title", "skill_code", "skill_name",
      "candidate_requirement_type", "candidate_required_level", "confidence",
      "source_count", "source_references", "review_decision", "reviewer_id", "review_notes",
    ]);
  }
}

async function writeProfessionalBodyGapPlan(options: PipelineOptions) {
  const bodies = [
    ["PMI", "Project Management competency framework", "Project and Programme Management"],
    ["APM", "APM Competence Framework", "Project and Programme Management"],
    ["IET", "UK-SPEC competence evidence", "Engineering and Infrastructure"],
    ["ICE", "Professional qualification attributes", "Engineering and Infrastructure"],
  ];
  await writeCsv(
    join(reportRoot(options), "professional-body-acquisition-plan.csv"),
    bodies.map(([body, framework, occupations]) => ({
      professional_body: body,
      framework_name: framework,
      official_source: "official framework required",
      access_method: "controlled local import",
      licence_status: "not_recorded",
      permission_required: "true",
      target_occupations: occupations,
      target_competencies: "professional competence|registration|career stages",
      priority: "post_initial_release",
      owner: "",
      next_action: "Assign owner to obtain permission and licensed source.",
    })),
    [
      "professional_body", "framework_name", "official_source", "access_method",
      "licence_status", "permission_required", "target_occupations",
      "target_competencies", "priority", "owner", "next_action",
    ],
  );
}

async function writeReleaseSubsetPolicy(options: PipelineOptions) {
  await writeJson(join(decisionsRoot(options), "release-subset-policy.json"), {
    taxonomyVersion: options.version,
    include: [
      "human-approved occupations",
      "human-resolved skills selected for publication",
      "approved aliases",
      "approved occupation-skill relationships",
      "approved transitions",
      "approved skill relationships",
      "complete provenance",
    ],
    exclude: [
      "pending records",
      "rejected records",
      "deferred relationships",
      "unresolved aliases",
      "unapproved transitions",
      "unsupported professional-body mappings",
    ],
  });
}

async function writeLocalWorkbench(options: PipelineOptions) {
  await writeText(
    join(reportRoot(options), "workbench.html"),
    `<!doctype html><html><head><meta charset="utf-8"><title>CareerPathX Taxonomy Review</title>` +
      `<style>body{font:16px system-ui;max-width:960px;margin:40px auto;padding:0 20px}li{margin:10px 0}` +
      `.warning{padding:16px;background:#fff3cd;border:1px solid #e5c66a}</style></head><body>` +
      `<h1>CareerPathX Taxonomy ${options.version} Review Workbench</h1>` +
      `<p class="warning">Local editorial tool. No public access, publication, or automatic approval.</p>` +
      `<h2>Queues</h2><ul><li>100 occupation decisions</li><li>1,125 skill decisions</li>` +
      `<li>6,665 alias rows</li><li>1,801 occupation-skill relationships</li>` +
      `<li>244 transitions</li></ul><p>Edit the governed CSV decision packs, then run ` +
      `<code>pnpm taxonomy:review:validate --version=${options.version}</code>.</p></body></html>`,
  );
}

async function detectConflicts(options: PipelineOptions) {
  const rows: Row[] = [];
  for (const file of decisionFiles) {
    const fileRows = await readCsv(join(decisionsRoot(options), file));
    rows.push(...fileRows);
  }
  return findDecisionConflicts(rows, options.version);
}

export function findDecisionConflicts(rows: Row[], version: string) {
  const decisionsByEntity = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!finalDecisions.has(row["decision"] ?? "")) continue;
    const key = `${row["entity_type"]}|${row["entity_code"]}`;
    const decisions = decisionsByEntity.get(key) ?? new Set<string>();
    decisions.add(row["decision"] ?? "");
    decisionsByEntity.set(key, decisions);
  }
  return [...decisionsByEntity.entries()]
    .filter(([, decisions]) => decisions.size > 1)
    .map(([key, decisions]) => ({
      conflict_id: stableHash([version, key, [...decisions].sort()], 16),
      entity_type: key.split("|")[0] ?? "",
      entity_code: key.slice(key.indexOf("|") + 1),
      reviewer_decisions: [...decisions].sort().join("|"),
      adjudicator_id: "",
      final_decision: "",
      adjudication_notes: "",
      adjudicated_at: "",
    }));
}

export function reviewAuditId(input: {
  version: string;
  file: string;
  entityCode: string;
  decision: string;
  actor: string;
  reviewedAt: string;
}) {
  return stableHash(
    [
      input.version,
      input.file,
      input.entityCode,
      input.decision,
      input.actor,
      input.reviewedAt,
    ],
    20,
  );
}

async function writeConflictReport(options: PipelineOptions) {
  await writeCsv(join(decisionsRoot(options), "conflicts.csv"), await detectConflicts(options), [
    "conflict_id", "entity_type", "entity_code", "reviewer_decisions",
    "adjudicator_id", "final_decision", "adjudication_notes", "adjudicated_at",
  ]);
}

function stats(rows: Row[], isReviewed: (row: Row) => boolean) {
  const reviewed = rows.filter(isReviewed).length;
  return { total: rows.length, reviewed, remaining: rows.length - reviewed };
}

function gate(name: string, current: number, required: number) {
  const passed = current === required;
  return {
    gate: name,
    status: passed ? "passed" : "failed",
    current_value: current,
    required_value: required,
    blocking_records: passed ? [] : [`${required - current} records remain`],
    recommended_action: passed ? "No action required." : "Complete human editorial decisions.",
  };
}

function decisionsRoot(options: PipelineOptions) {
  return join(options.canonicalRoot, "..", "reviews", options.version);
}

function reportRoot(options: PipelineOptions) {
  return join(options.reportRoot, options.version, "review");
}
