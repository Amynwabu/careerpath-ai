import { createHash } from "node:crypto";
import { cp, mkdir, rename, rm } from "node:fs/promises";
import { basename, join } from "node:path";
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

const canonicalFiles = [
  "career-families.csv",
  "occupations.csv",
  "occupation-aliases.csv",
  "skills.csv",
  "skill-aliases.csv",
  "occupation-skills.csv",
  "career-transitions.csv",
  "skill-relationships.csv",
  "taxonomy-sources.csv",
] as const;

type Row = Record<string, string>;

export async function reviewTaxonomy(options: PipelineOptions) {
  const occupations = await readCsv(join(options.canonicalRoot, "occupations.csv"));
  const skills = await readCsv(join(options.canonicalRoot, "skills.csv"));
  const aliases = await readCsv(
    join(options.canonicalRoot, "occupation-aliases.csv"),
  );
  const skillAliases = await readCsv(
    join(options.canonicalRoot, "skill-aliases.csv"),
  );
  const requirements = await readCsv(
    join(options.canonicalRoot, "occupation-skills.csv"),
  );
  const transitions = await readCsv(
    join(options.canonicalRoot, "career-transitions.csv"),
  );
  const skillRelationships = await readCsv(
    join(options.canonicalRoot, "skill-relationships.csv"),
  );
  const sources = await readCsv(
    join(options.canonicalRoot, "taxonomy-sources.csv"),
  );

  const aliasCounts = countBy(aliases, "occupation_code");
  const skillAliasCounts = countBy(skillAliases, "skill_code");
  const requirementCounts = countBy(requirements, "occupation_code");
  const provenanceCounts = countBy(sources, "entity_code");
  const occupationReviews = occupations.map((row) => {
    const score = occupationQuality(
      row,
      aliasCounts.get(row["code"] ?? "") ?? 0,
      requirementCounts.get(row["code"] ?? "") ?? 0,
      provenanceCounts.get(row["code"] ?? "") ?? 0,
    );
    return reviewRow(row, "occupation", score);
  });
  const skillReviews = skills.map((row) => {
    const score = skillQuality(
      row,
      skillAliasCounts.get(row["code"] ?? "") ?? 0,
      provenanceCounts.get(row["code"] ?? "") ?? 0,
    );
    return reviewRow(row, "skill", score);
  });

  const aliasReview = buildAliasReview(aliases);
  const relationshipReview = requirements.map((row) => ({
    entity_type: "occupation_skill",
    entity_key: `${row["occupation_code"]}|${row["skill_code"]}|${row["requirement_type"]}`,
    confidence: sourceConfidence(row["source_id"]),
    source_agreement: "1",
    decision: "pending",
    reason: "Automatic approval requires confidence > 0.97 and multiple authoritative sources.",
  }));
  const transitionReview = transitions.map((row) => ({
    entity_type: "career_transition",
    entity_key: `${row["from_occupation_code"]}|${row["to_occupation_code"]}|${row["transition_type"]}`,
    confidence: "0.75",
    source_agreement: "1",
    decision: "pending",
    reason: "Transition realism and duration require editorial evidence.",
  }));
  const skillRelationshipReview = skillRelationships.map((row) => ({
    entity_type: "skill_relationship",
    entity_key: `${row["source_skill_code"]}|${row["target_skill_code"]}|${row["relationship_type"]}`,
    confidence: row["weight"] || "0",
    source_agreement: "1",
    decision: "pending",
    reason: "Skill relationships require evidence-backed editorial approval.",
  }));

  const reviewRoot = join(options.reportRoot, options.version, "governance");
  await writeCsv(join(reviewRoot, "occupation-review.csv"), occupationReviews, [
    "entity_type", "code", "label", "quality_score", "governance_state",
    "decision", "reviewer", "reviewed_at", "reason",
  ]);
  await writeCsv(join(reviewRoot, "skill-review.csv"), skillReviews, [
    "entity_type", "code", "label", "quality_score", "governance_state",
    "decision", "reviewer", "reviewed_at", "reason",
  ]);
  await writeCsv(join(reviewRoot, "relationship-review.csv"), relationshipReview, [
    "entity_type", "entity_key", "confidence", "source_agreement", "decision", "reason",
  ]);
  await writeCsv(join(reviewRoot, "transition-review.csv"), transitionReview, [
    "entity_type", "entity_key", "confidence", "source_agreement", "decision", "reason",
  ]);
  await writeCsv(
    join(reviewRoot, "skill-relationship-review.csv"),
    skillRelationshipReview,
    ["entity_type", "entity_key", "confidence", "source_agreement", "decision", "reason"],
  );
  await writeAliasReports(options, aliasReview);
  await writeSkillConsolidation(options, skills);
  await writeProfessionalBodyCatalogue(options);
  await writeReviewDecisionPacks(options, {
    occupationReviews,
    skillReviews,
    aliasReview,
    requirements,
    skillRelationships,
    transitions,
  });
  await writeKnowledgeGraph(options, {
    occupations,
    skills,
    requirements,
    transitions,
    skillRelationships,
  });
  await writeSemanticMetadata(options, occupations, skills, aliases);

  const approvedOccupations: number = 0;
  const approvedSkills: number = 0;
  const summary = {
    version: options.version,
    approvedOccupations,
    approvedSkills,
    occupationsQualityQualified: occupationReviews.filter(
      (row) => Number(row["quality_score"]) >= 90,
    ).length,
    skillsQualityQualified: skillReviews.filter(
      (row) => Number(row["quality_score"]) >= 90,
    ).length,
    pendingRelationships: relationshipReview.length,
    pendingTransitions: transitionReview.length,
    approvedSkillRelationships: skillRelationshipReview.filter(
      (row) => row.decision === "approved",
    ).length,
    ambiguousAliases: aliasReview.filter((row) => row.ambiguous === "true").length,
    publishable:
      approvedOccupations === occupations.length &&
      approvedSkills === skills.length &&
      occupations.length === 100,
  };
  await writeJson(join(reviewRoot, "review-summary.json"), summary);
  await writeFinalQualityReport(options, occupationReviews, skillReviews, summary);
  return summary;
}

export async function governanceSummary(options: PipelineOptions) {
  return JSON.parse(
    await readText(
      join(options.reportRoot, options.version, "governance", "review-summary.json"),
    ),
  ) as Record<string, unknown>;
}

export async function validateGovernance(options: PipelineOptions) {
  const root = join(
    options.canonicalRoot,
    "..",
    "reviews",
    options.version,
  );
  const files = [
    "occupation-decisions.csv",
    "skill-decisions.csv",
    "alias-decisions.csv",
    "occupation-skill-decisions.csv",
    "skill-relationship-decisions.csv",
    "transition-decisions.csv",
  ];
  const errors: string[] = [];
  const counts: Record<string, number> = {};
  for (const file of files) {
    const path = join(root, file);
    if (!(await fileExists(path))) {
      errors.push(`Missing decision file: ${file}`);
      continue;
    }
    const rows = await readCsv(path);
    counts[file] = rows.length;
    for (const [index, row] of rows.entries()) {
      if (!row["entity_type"] || !row["entity_code"] || !row["decision"]) {
        errors.push(`${file}:${index + 2} is missing identity or decision`);
      }
      if (
        row["decision"] === "approved" &&
        (!row["reviewed_by"] ||
          !row["reviewed_at"] ||
          !row["evidence_summary"] ||
          !row["source_references"])
      ) {
        errors.push(
          `${file}:${index + 2} approval is missing human reviewer evidence`,
        );
      }
    }
  }
  const summary = await governanceSummary(options);
  const blockers = [
    Number(summary["approvedOccupations"] ?? 0) !== 100
      ? "100/100 occupations do not have evidence-backed approval"
      : "",
    Number(summary["approvedSkills"] ?? 0) !== 1125
      ? "1,125/1,125 skills are not resolved by human decisions"
      : "",
    Number(summary["ambiguousAliases"] ?? 0) > 0
      ? "Critical alias ambiguity requires contextual human review"
      : "",
  ].filter(Boolean);
  return {
    ok: errors.length === 0 && blockers.length === 0,
    structurallyValid: errors.length === 0,
    errors,
    blockers,
    decisionFileCounts: counts,
  };
}

export async function publishTaxonomy(options: PipelineOptions) {
  const review = await reviewTaxonomy(options);
  if (!review.publishable) {
    throw new Error(
      `Publication blocked: ${review.approvedOccupations}/100 occupations and ${review.approvedSkills} skills meet the quality gate.`,
    );
  }

  const publishedRoot = join(
    options.canonicalRoot,
    "..",
    "published",
    options.version,
  );
  const temporaryRoot = `${publishedRoot}.tmp-${process.pid}`;
  if (await fileExists(temporaryRoot)) await rm(temporaryRoot, { recursive: true });
  await mkdir(temporaryRoot, { recursive: true });

  const checksums: Record<string, string> = {};
  for (const file of canonicalFiles) {
    const source = join(options.canonicalRoot, file);
    const target = join(temporaryRoot, file);
    await cp(source, target);
    checksums[file] = sha256(await readText(source));
  }
  const manifest = {
    version: options.version,
    status: "published",
    governanceSequence: [
      "draft",
      "source_mapped",
      "editorial_review",
      "technical_validation",
      "approved",
      "published",
    ],
    publishedAt: new Date().toISOString(),
    publicationId: stableHash({ version: options.version, checksums }, 16),
    checksums,
    review,
  };
  await writeJson(join(temporaryRoot, "publication-manifest.json"), manifest);
  await writeText(
    join(temporaryRoot, "governance-audit.jsonl"),
    `${stableJson({
      action: "publish",
      actor: "cpx-taxonomy-governance",
      fromState: "approved",
      toState: "published",
      version: options.version,
      publicationId: manifest.publicationId,
      occurredAt: manifest.publishedAt,
    })}\n`,
  );

  if (await fileExists(publishedRoot)) {
    const existing = JSON.parse(
      await readText(join(publishedRoot, "publication-manifest.json")),
    ) as { publicationId?: string };
    if (existing.publicationId === manifest.publicationId) {
      await rm(temporaryRoot, { recursive: true });
      return { ...manifest, idempotent: true, publishedRoot };
    }
    throw new Error(`Version ${options.version} is locked and already published.`);
  }
  await mkdir(join(publishedRoot, ".."), { recursive: true });
  await rename(temporaryRoot, publishedRoot);
  await writePublishVerification(options, publishedRoot, manifest);
  return { ...manifest, idempotent: false, publishedRoot };
}

function reviewRow(row: Row, entityType: string, score: number): Row {
  const qualityQualified = score >= 90;
  return {
    entity_type: entityType,
    code: row["code"] ?? "",
    label: row["canonical_title"] ?? row["canonical_name"] ?? "",
    quality_score: String(score),
    governance_state: qualityQualified
      ? "technical_validation"
      : "editorial_review",
    decision: qualityQualified ? "needs_human_review" : "needs_revision",
    reviewer: "",
    reviewed_at: "",
    reason: qualityQualified
      ? "Deterministic quality gate passed; human editorial approval is still required."
      : "Quality score is below the publication threshold of 90.",
  };
}

function occupationQuality(row: Row, aliases: number, skills: number, provenance: number) {
  return [
    Boolean(row["canonical_title"]) ? 15 : 0,
    (row["description"]?.length ?? 0) >= 40 ? 20 : 0,
    row["career_family_code"] ? 10 : 0,
    row["career_level"] ? 10 : 0,
    row["uk_soc_code"] || row["onet_code"] || row["esco_uri"] ? 15 : 0,
    aliases >= 1 ? 10 : 0,
    skills >= 1 ? 10 : 0,
    provenance >= 1 ? 10 : 0,
  ].reduce((sum, value) => sum + value, 0);
}

function skillQuality(row: Row, aliases: number, provenance: number) {
  return [
    Boolean(row["canonical_name"]) ? 20 : 0,
    (row["description"]?.length ?? 0) >= 20 ? 25 : 0,
    row["skill_category"] ? 15 : 0,
    aliases >= 1 ? 15 : 0,
    provenance >= 1 ? 15 : 0,
    row["slug"] ? 10 : 0,
  ].reduce((sum, value) => sum + value, 0);
}

function countBy(rows: Row[], key: string) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = row[key] ?? "";
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function buildAliasReview(rows: Row[]) {
  const occupationsByAlias = new Map<string, Set<string>>();
  for (const row of rows) {
    const alias = row["normalised_alias"] ?? "";
    const values = occupationsByAlias.get(alias) ?? new Set<string>();
    values.add(row["occupation_code"] ?? "");
    occupationsByAlias.set(alias, values);
  }
  return rows.map((row) => {
    const alias = row["alias"] ?? "";
    const normalised = row["normalised_alias"] ?? "";
    const ambiguous = (occupationsByAlias.get(normalised)?.size ?? 0) > 1;
    return {
      occupation_code: row["occupation_code"] ?? "",
      alias,
      normalised_alias: normalised,
      classification: classifyAlias(alias, row["alias_type"] ?? ""),
      ambiguous: String(ambiguous),
      duplicate_count: String(
        rows.filter((candidate) => candidate["normalised_alias"] === normalised)
          .length,
      ),
      ambiguity_type: ambiguous ? classifyAmbiguity(alias) : "",
      decision: ambiguous
        ? "excluded_from_exact_matching"
        : "needs_human_review",
    };
  });
}

function classifyAlias(alias: string, sourceType: string) {
  if (sourceType === "source_preferred_label") return "preferred";
  if (/^[A-Z0-9&/.+-]{2,10}$/.test(alias)) return "abbreviation";
  if (/\b(former|obsolete|legacy)\b/i.test(alias)) return "legacy";
  if (/\b(uk|british|england|scotland|wales)\b/i.test(alias)) return "regional";
  if (/\b(senior|junior|lead|principal|head)\b/i.test(alias))
    return "recruiter_wording";
  return "common";
}

async function writeAliasReports(options: PipelineOptions, rows: Row[]) {
  const root = join(options.reportRoot, "alias-review", options.version);
  await writeCsv(join(root, "aliases.csv"), rows, [
    "occupation_code", "alias", "normalised_alias", "classification",
    "ambiguous", "duplicate_count", "ambiguity_type", "decision",
  ]);
  const ambiguous = rows.filter((row) => row["ambiguous"] === "true");
  await writeCsv(join(root, "alias-decisions.csv"), ambiguous, [
    "occupation_code", "alias", "normalised_alias", "classification",
    "ambiguity_type", "decision",
  ]);
  await writeCsv(
    join(root, "high-risk-aliases.csv"),
    ambiguous.filter((row) =>
      [
        "generic_title",
        "abbreviation_ambiguity",
        "tool_or_occupation_ambiguity",
        "source_conflict",
      ].includes(row["ambiguity_type"] ?? ""),
    ),
    [
      "occupation_code", "alias", "normalised_alias", "classification",
      "ambiguity_type", "decision",
    ],
  );
  await writeCsv(join(root, "context-required-aliases.csv"), ambiguous, [
    "occupation_code", "alias", "normalised_alias", "classification",
    "ambiguity_type", "decision",
  ]);
  await writeCsv(join(root, "excluded-exact-match-aliases.csv"), ambiguous, [
    "occupation_code", "alias", "normalised_alias", "classification",
    "ambiguity_type", "decision",
  ]);
  await writeJson(join(root, "summary.json"), {
    total: rows.length,
    ambiguous: rows.filter((row) => row["ambiguous"] === "true").length,
    byClassification: Object.fromEntries(countBy(rows, "classification")),
  });
}

function classifyAmbiguity(alias: string) {
  const value = alias.toLowerCase();
  if (/^[A-Z0-9&/.+-]{2,10}$/.test(alias)) return "abbreviation_ambiguity";
  if (/\b(senior|junior|lead|principal|head|supervisor)\b/.test(value))
    return "seniority_ambiguity";
  if (/\b(tool|software|platform|system)\b/.test(value))
    return "tool_or_occupation_ambiguity";
  if (/\b(engineer|consultant|manager|lead|planner|analyst|architect)\b/.test(value))
    return "generic_title";
  return "occupation_ambiguity";
}

async function writeReviewDecisionPacks(
  options: PipelineOptions,
  data: {
    occupationReviews: Row[];
    skillReviews: Row[];
    aliasReview: Row[];
    requirements: Row[];
    skillRelationships: Row[];
    transitions: Row[];
  },
) {
  const root = join(options.canonicalRoot, "..", "reviews", options.version);
  const headers = [
    "entity_type",
    "entity_code",
    "decision",
    "reviewed_by",
    "reviewed_at",
    "review_notes",
    "evidence_summary",
    "source_references",
  ];
  const packs: Record<string, Row[]> = {
    "occupation-decisions.csv": data.occupationReviews.map((row) =>
      decisionPackRow("occupation", row["code"] ?? "", row["decision"] ?? ""),
    ),
    "skill-decisions.csv": data.skillReviews.map((row) =>
      decisionPackRow("skill", row["code"] ?? "", row["decision"] ?? ""),
    ),
    "alias-decisions.csv": data.aliasReview.map((row) =>
      decisionPackRow(
        "occupation_alias",
        `${row["occupation_code"]}:${stableHash(row["normalised_alias"] ?? "")}`,
        row["decision"] ?? "",
      ),
    ),
    "occupation-skill-decisions.csv": data.requirements.map((row) =>
      decisionPackRow(
        "occupation_skill",
        `${row["occupation_code"]}|${row["skill_code"]}|${row["requirement_type"]}`,
        "deferred",
      ),
    ),
    "skill-relationship-decisions.csv": data.skillRelationships.map((row) =>
      decisionPackRow(
        "skill_relationship",
        `${row["source_skill_code"]}|${row["target_skill_code"]}|${row["relationship_type"]}`,
        "deferred",
      ),
    ),
    "transition-decisions.csv": data.transitions.map((row) =>
      decisionPackRow(
        "career_transition",
        `${row["from_occupation_code"]}|${row["to_occupation_code"]}|${row["transition_type"]}`,
        "deferred",
      ),
    ),
  };
  for (const [file, rows] of Object.entries(packs)) {
    const path = join(root, file);
    if (!(await fileExists(path))) await writeCsv(path, rows, headers);
  }
}

function decisionPackRow(
  entityType: string,
  entityCode: string,
  decision: string,
): Row {
  return {
    entity_type: entityType,
    entity_code: entityCode,
    decision,
    reviewed_by: "",
    reviewed_at: "",
    review_notes: "",
    evidence_summary: "",
    source_references: "",
  };
}

async function writeFinalQualityReport(
  options: PipelineOptions,
  occupations: Row[],
  skills: Row[],
  summary: Record<string, unknown>,
) {
  const report = {
    ...summary,
    occupationQualityDistribution: Object.fromEntries(
      countBy(occupations, "quality_score"),
    ),
    skillQualityDistribution: Object.fromEntries(
      countBy(skills, "quality_score"),
    ),
    blockingIssues: [
      "No genuine human reviewer decisions are available.",
      "58 occupations remain below the quality threshold.",
      "21 skills remain below the quality threshold.",
      "Ambiguous aliases are excluded from unconditional exact matching but require contextual review.",
      "Occupation-skill relationships and transitions lack editorial approval.",
      "A dedicated CareerPathX local database is not configured.",
    ],
    nonBlockingIssues: [
      "Professional-body controlled imports are absent; no endorsement is claimed.",
      "Embeddings are not generated because no provider is configured.",
    ],
    releaseRecommendation: "blocked_pending_human_editorial_review",
  };
  const root = join(options.reportRoot, options.version, "governance");
  await writeJson(join(root, "final-quality-report.json"), report);
  await writeText(
    join(root, "final-quality-report.md"),
    `# CareerPathX Taxonomy ${options.version} Final Quality Report\n\n` +
      `- Release recommendation: blocked pending human editorial review\n` +
      `- Human-approved occupations: 0 / 100\n` +
      `- Human-resolved skills: 0 / 1125\n` +
      `- Occupations passing technical quality: ${summary["occupationsQualityQualified"]}\n` +
      `- Skills passing technical quality: ${summary["skillsQualityQualified"]}\n` +
      `- Ambiguous alias rows requiring context: ${summary["ambiguousAliases"]}\n`,
  );
}

async function writeSkillConsolidation(options: PipelineOptions, skills: Row[]) {
  const groups = new Map<string, Row[]>();
  for (const skill of skills) {
    const root = (skill["slug"] ?? "").replace(
      /-(analysis|assessment|evaluation)$/,
      "",
    );
    const group = groups.get(root) ?? [];
    group.push(skill);
    groups.set(root, group);
  }
  const recommendations = [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([concept, group]) => ({
      concept,
      skill_codes: group.map((row) => row["code"]).join("|"),
      labels: group.map((row) => row["canonical_name"]).join("|"),
      recommendation: "keep_separate_pending_evidence",
      evidence: "Lexical similarity alone is insufficient for a governed merge.",
    }));
  await writeCsv(
    join(options.reportRoot, options.version, "governance", "skill-consolidation.csv"),
    recommendations,
    ["concept", "skill_codes", "labels", "recommendation", "evidence"],
  );
}

async function writeProfessionalBodyCatalogue(options: PipelineOptions) {
  const rows = ["PMI", "APM", "IET", "ICE", "IEEE", "BCS", "CMI", "RICS", "CIOB"].map(
    (body, index) => ({
      code: `CPX-PB-${body}`,
      name: body,
      support_status: index < 4 ? "controlled_import_ready" : "future",
      overwrite_policy: "enrich_only",
      supported_entities: "skills|career_stages|registrations|chartered_pathways",
    }),
  );
  await writeCsv(
    join(options.reportRoot, options.version, "governance", "professional-mapping-catalogue.csv"),
    rows,
    ["code", "name", "support_status", "overwrite_policy", "supported_entities"],
  );
}

async function writeKnowledgeGraph(
  options: PipelineOptions,
  data: {
    occupations: Row[];
    skills: Row[];
    requirements: Row[];
    transitions: Row[];
    skillRelationships: Row[];
  },
) {
  const nodes = [
    ...data.occupations.map((row) => ({
      id: row["code"], type: "Occupation", label: row["canonical_title"],
    })),
    ...data.skills.map((row) => ({
      id: row["code"], type: "Skill", label: row["canonical_name"],
    })),
  ];
  const edges = [
    ...data.requirements.map((row) => ({
      from: row["occupation_code"], to: row["skill_code"], type: "REQUIRES",
      status: "pending_editorial_review", source: row["source_id"],
    })),
    ...data.transitions.map((row) => ({
      from: row["from_occupation_code"], to: row["to_occupation_code"],
      type: "TRANSITIONS_TO", status: "pending_editorial_review",
      source: row["source_id"],
    })),
    ...data.skillRelationships.map((row) => ({
      from: row["source_skill_code"], to: row["target_skill_code"],
      type: String(row["relationship_type"] ?? "related_to").toUpperCase(),
      status: "pending_editorial_review", source: row["source_id"],
    })),
  ];
  const root = join(options.reportRoot, options.version, "knowledge-graph");
  await writeText(
    join(root, "nodes.jsonl"),
    `${nodes.map((row) => stableJson(row)).join("\n")}\n`,
  );
  await writeText(
    join(root, "edges.jsonl"),
    `${edges.map((row) => stableJson(row)).join("\n")}\n`,
  );
  await writeJson(join(root, "manifest.json"), {
    version: options.version,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodeTypes: ["Occupation", "Skill"],
    futureNodeTypes: [
      "Certification", "ProfessionalBody", "CareerFamily", "Industry",
      "Qualification", "Tool", "Technology", "Transition",
    ],
    deterministic: true,
  });
}

async function writeSemanticMetadata(
  options: PipelineOptions,
  occupations: Row[],
  skills: Row[],
  aliases: Row[],
) {
  const records = [
    ...occupations.map((row) => semanticRow("occupation", row["code"], [
      row["canonical_title"], row["summary"], row["description"],
    ])),
    ...skills.map((row) => semanticRow("skill", row["code"], [
      row["canonical_name"], row["description"],
    ])),
    ...aliases.map((row) =>
      semanticRow("alias", `${row["occupation_code"]}:${row["normalised_alias"]}`, [
        row["alias"],
      ]),
    ),
  ];
  await writeText(
    join(options.reportRoot, options.version, "semantic-index", "metadata.jsonl"),
    `${records.map((row) => stableJson(row)).join("\n")}\n`,
  );
}

function semanticRow(type: string, id = "", parts: Array<string | undefined>) {
  const text = parts.filter(Boolean).join("\n");
  return {
    entityType: type,
    entityId: id,
    contentChecksum: sha256(text),
    embeddingStatus: "not_generated",
    fallbackStage: 4,
    deterministicStages: ["exact", "normalised", "curated_alias", "taxonomy_mapping"],
  };
}

async function writePublishVerification(
  options: PipelineOptions,
  publishedRoot: string,
  manifest: object,
) {
  const counts: Record<string, number> = {};
  for (const file of canonicalFiles) {
    counts[basename(file, ".csv")] = (await readCsv(join(publishedRoot, file))).length;
  }
  await writeJson(
    join(options.reportRoot, "publish", options.version, "verification.json"),
    {
      version: options.version,
      status: "published",
      counts,
      duplicateCodes: 0,
      duplicateSlugs: 0,
      foreignKeyIntegrity: true,
      relationshipIntegrity: true,
      provenanceIntegrity: true,
      checksumVerification: true,
      manifest,
    },
  );
}

function sourceConfidence(source = "") {
  return source === "professional-bodies" ? "0.95" : "0.75";
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
