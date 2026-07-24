import { stat } from "node:fs/promises";
import { join } from "node:path";
import { sourceConfigs } from "../config";
import {
  findBestPlanMatch,
  readDomainSelectionPolicy,
  readOccupationPlan,
  type DomainSelectionPolicy,
  type OccupationPlanRow,
  type PlanMatch,
} from "../selection/domain-policy";
import type { TaxonomySourceId } from "../types";
import type { CsvRow } from "../utils/csv";
import {
  fileExists,
  readCsv,
  sha256File,
  stableHash,
  writeCsv,
  writeJson,
  writeText,
} from "../utils/files";

export interface SourcePreparationOptions {
  inputRoot: string;
  manifestPath: string;
  planPath: string;
  domainPolicyPath: string;
  version: string;
  retrievedAt: string;
  fetchEsco: boolean;
}

export interface SourcePreparationSummary {
  sourceId: AcquiredSourceId;
  rawFiles: number;
  rawRecords: number;
  acceptedRecords: number;
  rejectedRecords: number;
  preparedFiles: string[];
}

type AcquiredSourceId = "uk-soc" | "esco" | "onet";

interface PreparedSourceFile {
  file_name: string;
  local_path: string;
  file_format: string;
  file_size_bytes: number;
  checksum_sha256: string;
  record_count: number;
  encoding: string;
  source_role: "official_raw" | "adapter_ready";
  raw_file_committed: boolean;
}

const sourceUrls = {
  "uk-soc":
    "https://www.ons.gov.uk/methodology/classificationsandstandards/standardoccupationalclassificationsoc/soc2020/soc2020volume2codingrulesandconventions",
  esco: "https://esco.ec.europa.eu/en/use-esco/use-esco-services-api",
  onet: "https://www.onetcenter.org/database.html",
} as const;

const downloadUrls = {
  "uk-soc":
    "https://www.ons.gov.uk/file?uri=/methodology/classificationsandstandards/standardoccupationalclassificationsoc/soc2020/soc2020volume2codingrulesandconventions/soc2020volume2thecodingindexzip03122025.zip",
  esco: "https://ec.europa.eu/esco/api",
  onet: "https://www.onetcenter.org/dl_files/database/db_30_3_csv.zip",
} as const;

const licences = {
  "uk-soc": {
    name: "Open Government Licence v3.0",
    url: "http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    version: "SOC 2020 Volume 2 coding index 03/12/2025",
    releaseDate: "2025-12-03",
  },
  esco: {
    name: "European Commission ESCO reuse terms",
    url: "https://esco.ec.europa.eu/en/use-esco",
    version: "ESCO v1.2.1 API snapshot",
    releaseDate: "2025-12-10",
  },
  onet: {
    name: "Creative Commons Attribution 4.0 International License",
    url: "https://creativecommons.org/licenses/by/4.0/",
    version: "O*NET 30.3 Database",
    releaseDate: "2026-05",
  },
} as const;

export async function prepareSourceSnapshot(
  options: SourcePreparationOptions,
): Promise<SourcePreparationSummary[]> {
  const [policy, plan] = await Promise.all([
    readDomainSelectionPolicy(options.domainPolicyPath),
    readOccupationPlan(options.planPath),
  ]);

  await writeJson(join(options.inputRoot, "professional-bodies/sources.json"), {
    sources: [],
    note: "Controlled professional-body imports only. No automated acquisition or scraping is performed by CPX-COS-002B.",
  });

  const summaries = [
    await prepareUkSoc(options, policy, plan),
    await prepareEsco(options, policy, plan),
    await prepareOnet(options, policy, plan),
  ];
  await writeManifest(options, summaries);
  return summaries;
}

async function prepareUkSoc(
  options: SourcePreparationOptions,
  policy: DomainSelectionPolicy,
  plan: OccupationPlanRow[],
): Promise<SourcePreparationSummary> {
  const rawIndexPath = join(
    options.inputRoot,
    "uk-soc/raw/extracted/SOC2020_volume2_thecodingindex.csv",
  );
  const rawFrameworkPath = join(
    options.inputRoot,
    "uk-soc/raw/extracted/SOC2020_framework.csv",
  );
  await assertFile(rawIndexPath, "ONS SOC 2020 coding index CSV");
  await assertFile(rawFrameworkPath, "ONS SOC 2020 framework CSV");

  const rows = await readCsv(rawIndexPath);
  const outputRows: CsvRow[] = [];
  const groupCounts = new Map<string, number>();

  for (const row of rows) {
    const sourceTitle =
      row["INDEXOCC-natural_word_order"] || row["INDEXOCC"] || "";
    const unitTitle = row["SOC2020_unit_group_title"] || "";
    const extendedTitle = row["SOC2020_ext_SUG_title"] || "";
    const industry = row["IND"] || "";
    const socCode = row["SOC_2020"] || "";
    if (!sourceTitle || !socCode) continue;

    const match = sourcePlanMatch(plan, sourceTitle, [
      unitTitle,
      extendedTitle,
      industry,
    ]);
    const relevant = hasPlanMatch(policy, match);
    if (!relevant) continue;

    const key = `${socCode}:${match?.plan.cpxCode ?? "unplanned"}`;
    const count = groupCounts.get(key) ?? 0;
    if (count >= policy.source_limits.uk_soc_max_aliases_per_group) continue;
    groupCounts.set(key, count + 1);

    outputRows.push({
      source_record_id: `uk-soc:${row["UNIQUE ID"] || stableHash(row)}`,
      soc_code: socCode,
      title: sourceTitle,
      description: compact([
        `SOC 2020 unit group ${socCode}: ${unitTitle}`,
        extendedTitle ? `Extended group: ${extendedTitle}` : "",
        industry ? `Industry qualifier: ${industry}` : "",
      ]),
      alt_titles: uniqueList([unitTitle, extendedTitle, row["INDEXOCC"]]),
      group_title: unitTitle,
      major_group: socCode.slice(0, 1),
      minor_group: socCode.slice(0, 3),
      unit_group: socCode,
      isco08_code: row["ISCO-08 code based on SOC2020"] || "",
      country: "GB",
      language: "en",
      source_version: licences["uk-soc"].version,
      source_url: sourceUrls["uk-soc"],
      licence_name: licences["uk-soc"].name,
      licence_url: licences["uk-soc"].url,
      retrieved_at: options.retrievedAt,
      planned_cpx_code: match?.plan.cpxCode ?? "",
      planned_match_confidence: String(match?.confidence ?? ""),
      selection_reason: match?.reason ?? "domain_policy",
    });
  }

  const outputPath = join(options.inputRoot, "uk-soc/occupations.csv");
  await writeCsv(outputPath, outputRows, [
    "source_record_id",
    "soc_code",
    "title",
    "description",
    "alt_titles",
    "group_title",
    "major_group",
    "minor_group",
    "unit_group",
    "isco08_code",
    "country",
    "language",
    "source_version",
    "source_url",
    "licence_name",
    "licence_url",
    "retrieved_at",
    "planned_cpx_code",
    "planned_match_confidence",
    "selection_reason",
  ]);

  return {
    sourceId: "uk-soc",
    rawFiles: 2,
    rawRecords: rows.length,
    acceptedRecords: outputRows.length,
    rejectedRecords: rows.length - outputRows.length,
    preparedFiles: ["uk-soc/occupations.csv"],
  };
}

async function prepareEsco(
  options: SourcePreparationOptions,
  policy: DomainSelectionPolicy,
  plan: OccupationPlanRow[],
): Promise<SourcePreparationSummary> {
  const rawDir = join(options.inputRoot, "esco/raw");
  const detailsPath = join(rawDir, "occupation-details.jsonl");
  if (options.fetchEsco || !(await fileExists(detailsPath))) {
    await fetchEscoOccupationDetails(rawDir, policy, plan);
  }

  const details = (await readJsonl(detailsPath)) as EscoOccupationDetail[];
  const occupationRows: CsvRow[] = [];
  const skillRowsByUri = new Map<string, CsvRow>();
  const relationshipRows: CsvRow[] = [];

  for (const detail of details) {
    const preferred = detail.preferredLabel?.en || detail.title || "";
    const aliases = uniqueArray([
      ...(detail.alternativeLabel?.en ?? []),
      detail.preferredLabel?.["en-us"] ?? "",
    ]);
    const match = sourcePlanMatch(plan, preferred, aliases);
    const relevant = hasPlanMatch(policy, match);
    if (!relevant) continue;
    if (occupationRows.length >= policy.source_limits.esco_max_occupations)
      break;

    occupationRows.push({
      concept_uri: detail.uri,
      preferred_label: preferred,
      description: detail.description?.en?.literal ?? "",
      alt_labels: uniqueList(aliases),
      broader_uri: linkUris([
        ...(detail._links?.broaderIscoGroup ?? []),
        ...(detail._links?.broaderOccupation ?? []),
      ]),
      related_uri: "",
      esco_code: detail.code ?? "",
      country: "EU",
      language: "en",
      source_version: licences.esco.version,
      source_url: sourceUrls.esco,
      licence_name: licences.esco.name,
      licence_url: licences.esco.url,
      retrieved_at: options.retrievedAt,
      planned_cpx_code: match?.plan.cpxCode ?? "",
      planned_match_confidence: String(match?.confidence ?? ""),
      selection_reason: match?.reason ?? "domain_policy",
    });

    for (const relationshipType of ["essential", "optional"] as const) {
      const links =
        relationshipType === "essential"
          ? detail._links?.hasEssentialSkill ?? []
          : detail._links?.hasOptionalSkill ?? [];
      for (const link of links) {
        if (!link.uri || !link.title) continue;
        if (skillRowsByUri.size < policy.source_limits.esco_max_skills) {
          skillRowsByUri.set(link.uri, {
            skill_uri: link.uri,
            preferred_label: link.title,
            description: `ESCO ${skillTypeLabel(link.skillType)} linked to selected occupations.`,
            alt_labels: "",
            broader_uri: "",
            related_uri: "",
            skill_type: skillTypeLabel(link.skillType),
            country: "EU",
            language: "en",
            source_version: licences.esco.version,
            source_url: sourceUrls.esco,
            licence_name: licences.esco.name,
            licence_url: licences.esco.url,
            retrieved_at: options.retrievedAt,
          });
        }
        if (skillRowsByUri.has(link.uri)) {
          relationshipRows.push({
            occupation_uri: detail.uri,
            skill_uri: link.uri,
            relationship_type: relationshipType,
            description: `ESCO ${relationshipType} skill relationship.`,
            country: "EU",
            language: "en",
            source_version: licences.esco.version,
            source_url: sourceUrls.esco,
            licence_name: licences.esco.name,
            licence_url: licences.esco.url,
            retrieved_at: options.retrievedAt,
          });
        }
      }
    }
  }

  await writeCsv(join(options.inputRoot, "esco/occupations.csv"), occupationRows, [
    "concept_uri",
    "preferred_label",
    "description",
    "alt_labels",
    "broader_uri",
    "related_uri",
    "esco_code",
    "country",
    "language",
    "source_version",
    "source_url",
    "licence_name",
    "licence_url",
    "retrieved_at",
    "planned_cpx_code",
    "planned_match_confidence",
    "selection_reason",
  ]);
  await writeCsv(
    join(options.inputRoot, "esco/skills.csv"),
    [...skillRowsByUri.values()].sort((left, right) =>
      (left["skill_uri"] ?? "").localeCompare(right["skill_uri"] ?? ""),
    ),
    [
      "skill_uri",
      "preferred_label",
      "description",
      "alt_labels",
      "broader_uri",
      "related_uri",
      "skill_type",
      "country",
      "language",
      "source_version",
      "source_url",
      "licence_name",
      "licence_url",
      "retrieved_at",
    ],
  );
  await writeCsv(
    join(options.inputRoot, "esco/occupation-skills.csv"),
    relationshipRows,
    [
      "occupation_uri",
      "skill_uri",
      "relationship_type",
      "description",
      "country",
      "language",
      "source_version",
      "source_url",
      "licence_name",
      "licence_url",
      "retrieved_at",
    ],
  );

  return {
    sourceId: "esco",
    rawFiles: 2,
    rawRecords: details.length,
    acceptedRecords:
      occupationRows.length + skillRowsByUri.size + relationshipRows.length,
    rejectedRecords: Math.max(0, details.length - occupationRows.length),
    preparedFiles: [
      "esco/occupations.csv",
      "esco/skills.csv",
      "esco/occupation-skills.csv",
    ],
  };
}

async function prepareOnet(
  options: SourcePreparationOptions,
  policy: DomainSelectionPolicy,
  plan: OccupationPlanRow[],
): Promise<SourcePreparationSummary> {
  const rawRoot = join(options.inputRoot, "onet/raw/extracted/db_30_3_csv");
  const occupationRows = await readCsv(join(rawRoot, "occupation_data.csv"));
  const titleRows = await readCsv(join(rawRoot, "job_titles.csv"));
  const contentRows = await readCsv(join(rawRoot, "content_model_reference.csv"));
  const jobZoneRows = await readCsv(join(rawRoot, "job_zones.csv"));
  const relatedRows = await readCsv(join(rawRoot, "related_occupations.csv"));
  const softwareRows = await readCsv(join(rawRoot, "software_skills.csv"));

  const titlesByCode = groupRows(titleRows, "O*NET-SOC Code");
  const jobZoneByCode = new Map(
    jobZoneRows.map((row) => [row["O*NET-SOC Code"] ?? "", row["Job Zone"] ?? ""]),
  );
  const selectedOccupations = occupationRows
    .map((row) => {
      const aliases = (titlesByCode.get(row["O*NET-SOC Code"] ?? "") ?? [])
        .map((titleRow) => titleRow["Job Title"] ?? "")
        .filter(Boolean)
        .slice(0, 20);
      const match = sourcePlanMatch(plan, row["Title"] ?? "", aliases);
      const relevant = hasPlanMatch(policy, match);
      return { row, aliases, match, relevant };
    })
    .filter((item) => item.relevant)
    .sort(
      (left, right) =>
        (right.match?.confidence ?? 0) - (left.match?.confidence ?? 0) ||
        (left.row["O*NET-SOC Code"] ?? "").localeCompare(
          right.row["O*NET-SOC Code"] ?? "",
        ),
    )
    .slice(0, policy.source_limits.onet_max_occupations);
  const selectedCodes = new Set(
    selectedOccupations.map((item) => item.row["O*NET-SOC Code"] ?? ""),
  );

  const preparedOccupations = selectedOccupations.map(({ row, match }) => ({
    onet_code: row["O*NET-SOC Code"] ?? "",
    title: row["Title"] ?? "",
    description: row["Description"] ?? "",
    job_zone: jobZoneByCode.get(row["O*NET-SOC Code"] ?? "") ?? "",
    country: "US",
    language: "en",
    source_version: licences.onet.version,
    source_url: sourceUrls.onet,
    licence_name: licences.onet.name,
    licence_url: licences.onet.url,
    retrieved_at: options.retrievedAt,
    planned_cpx_code: match?.plan.cpxCode ?? "",
    planned_match_confidence: String(match?.confidence ?? ""),
    selection_reason: match?.reason ?? "domain_policy",
  }));

  const preparedTitles: CsvRow[] = [];
  for (const { row } of selectedOccupations) {
    const code = row["O*NET-SOC Code"] ?? "";
    const aliases = titlesByCode.get(code) ?? [];
    for (const aliasRow of aliases.slice(
      0,
      policy.source_limits.onet_max_job_titles_per_occupation,
    )) {
      preparedTitles.push({
        onet_code: code,
        alternate_title: aliasRow["Job Title"] ?? "",
        country: "US",
        language: "en",
        source_version: licences.onet.version,
        source_url: sourceUrls.onet,
        licence_name: licences.onet.name,
        licence_url: licences.onet.url,
        retrieved_at: options.retrievedAt,
      });
    }
  }

  const contentByElement = new Map(
    contentRows.map((row) => [row["Element ID"] ?? "", row]),
  );
  const ratings = [
    ...aggregateOnetRatings(
      await readCsv(join(rawRoot, "essential_skills.csv")),
      selectedCodes,
      "technical",
      policy,
    ),
    ...aggregateOnetRatings(
      await readCsv(join(rawRoot, "transferable_skills.csv")),
      selectedCodes,
      "transferable",
      policy,
    ),
    ...aggregateOnetRatings(
      await readCsv(join(rawRoot, "knowledge.csv")),
      selectedCodes,
      "domain_knowledge",
      policy,
    ),
    ...aggregateOnetRatings(
      await readCsv(join(rawRoot, "abilities.csv")),
      selectedCodes,
      "transferable",
      policy,
    ),
  ];
  const skillsByElement = new Map<string, CsvRow>();
  const requirementRows: CsvRow[] = [];
  for (const rating of ratings) {
    const content = contentByElement.get(rating.elementId);
    skillsByElement.set(rating.elementId, {
      element_id: rating.elementId,
      skill_name: rating.elementName,
      description: content?.["Description"] ?? rating.elementName,
      element_group: rating.category,
      skill_category: rating.category,
      country: "US",
      language: "en",
      source_version: licences.onet.version,
      source_url: sourceUrls.onet,
      licence_name: licences.onet.name,
      licence_url: licences.onet.url,
      retrieved_at: options.retrievedAt,
    });
    addOnetSkillParents(rating.elementId, contentByElement, skillsByElement, options);
    requirementRows.push({
      onet_code: rating.onetCode,
      element_id: rating.elementId,
      importance: String(rating.importance),
      level: String(rating.level),
      country: "US",
      language: "en",
      source_version: licences.onet.version,
      source_url: sourceUrls.onet,
      licence_name: licences.onet.name,
      licence_url: licences.onet.url,
      retrieved_at: options.retrievedAt,
    });
  }

  const skillRelationshipRows = onetSkillRelationshipRows(
    skillsByElement,
    contentByElement,
    options,
  );

  for (const [code, rows] of groupRows(softwareRows, "O*NET-SOC Code")) {
    if (!selectedCodes.has(code)) continue;
    for (const row of rows.slice(
      0,
      policy.source_limits.onet_max_software_skills_per_occupation,
    )) {
      const name = row["Workplace Example"] ?? "";
      if (!name) continue;
      const elementId = `software:${stableHash(name, 12)}`;
      skillsByElement.set(elementId, {
        element_id: elementId,
        skill_name: name,
        description: row["Element Name"] ?? "Software skill",
        element_group: row["Element ID"] ?? "",
        skill_category: "tool",
        country: "US",
        language: "en",
        source_version: licences.onet.version,
        source_url: sourceUrls.onet,
        licence_name: licences.onet.name,
        licence_url: licences.onet.url,
        retrieved_at: options.retrievedAt,
      });
      requirementRows.push({
        onet_code: code,
        element_id: elementId,
        importance: row["Hot Technology"] === "Y" ? "4.2" : "3.2",
        level: row["In Demand"] === "Y" ? "4" : "3",
        country: "US",
        language: "en",
        source_version: licences.onet.version,
        source_url: sourceUrls.onet,
        licence_name: licences.onet.name,
        licence_url: licences.onet.url,
        retrieved_at: options.retrievedAt,
      });
    }
  }

  const preparedTransitions = relatedRows
    .filter(
      (row) =>
        selectedCodes.has(row["O*NET-SOC Code"] ?? "") &&
        selectedCodes.has(row["Related O*NET-SOC Code"] ?? ""),
    )
    .slice(0, 350)
    .map((row) => ({
      from_onet_code: row["O*NET-SOC Code"] ?? "",
      to_onet_code: row["Related O*NET-SOC Code"] ?? "",
      description: row["Relatedness Tier"] ?? "",
      difficulty_score: "3",
      transferability_score: transferabilityForOnetTier(
        row["Relatedness Tier"] ?? "",
      ),
      country: "US",
      language: "en",
      source_version: licences.onet.version,
      source_url: sourceUrls.onet,
      licence_name: licences.onet.name,
      licence_url: licences.onet.url,
      retrieved_at: options.retrievedAt,
    }));

  await writeCsv(join(options.inputRoot, "onet/occupations.csv"), preparedOccupations, [
    "onet_code",
    "title",
    "description",
    "job_zone",
    "country",
    "language",
    "source_version",
    "source_url",
    "licence_name",
    "licence_url",
    "retrieved_at",
    "planned_cpx_code",
    "planned_match_confidence",
    "selection_reason",
  ]);
  await writeCsv(join(options.inputRoot, "onet/alternate-titles.csv"), preparedTitles, [
    "onet_code",
    "alternate_title",
    "country",
    "language",
    "source_version",
    "source_url",
    "licence_name",
    "licence_url",
    "retrieved_at",
  ]);
  await writeCsv(
    join(options.inputRoot, "onet/skills.csv"),
    [...skillsByElement.values()].sort((left, right) =>
      (left["element_id"] ?? "").localeCompare(right["element_id"] ?? ""),
    ),
    [
      "element_id",
      "skill_name",
      "description",
      "element_group",
      "skill_category",
      "country",
      "language",
      "source_version",
      "source_url",
      "licence_name",
      "licence_url",
      "retrieved_at",
    ],
  );
  await writeCsv(join(options.inputRoot, "onet/occupation-skills.csv"), requirementRows, [
    "onet_code",
    "element_id",
    "importance",
    "level",
    "country",
    "language",
    "source_version",
    "source_url",
    "licence_name",
    "licence_url",
    "retrieved_at",
  ]);
  await writeCsv(
    join(options.inputRoot, "onet/related-occupations.csv"),
    preparedTransitions,
    [
      "from_onet_code",
      "to_onet_code",
      "description",
      "difficulty_score",
      "transferability_score",
      "country",
      "language",
      "source_version",
      "source_url",
      "licence_name",
      "licence_url",
      "retrieved_at",
    ],
  );
  await writeCsv(
    join(options.inputRoot, "onet/skill-relationships.csv"),
    skillRelationshipRows,
    [
      "source_skill_id",
      "target_skill_id",
      "relationship_type",
      "weight",
      "description",
      "country",
      "language",
      "source_version",
      "source_url",
      "licence_name",
      "licence_url",
      "retrieved_at",
    ],
  );

  const accepted =
    preparedOccupations.length +
    preparedTitles.length +
    skillsByElement.size +
    requirementRows.length +
    preparedTransitions.length +
    skillRelationshipRows.length;
  return {
    sourceId: "onet",
    rawFiles: 8,
    rawRecords:
      occupationRows.length +
      titleRows.length +
      softwareRows.length +
      relatedRows.length +
      ratings.length,
    acceptedRecords: accepted,
    rejectedRecords: Math.max(0, occupationRows.length - preparedOccupations.length),
    preparedFiles: [
      "onet/occupations.csv",
      "onet/alternate-titles.csv",
      "onet/skills.csv",
      "onet/occupation-skills.csv",
      "onet/related-occupations.csv",
      "onet/skill-relationships.csv",
    ],
  };
}

function addOnetSkillParents(
  elementId: string,
  contentByElement: Map<string, CsvRow>,
  skillsByElement: Map<string, CsvRow>,
  options: SourcePreparationOptions,
): void {
  const parts = elementId.split(".");
  while (parts.length > 1) {
    parts.pop();
    const parentId = parts.join(".");
    const parent = contentByElement.get(parentId);
    if (!parent || skillsByElement.has(parentId)) continue;
    skillsByElement.set(parentId, {
      element_id: parentId,
      skill_name: parent["Element Name"] ?? parentId,
      description: parent["Description"] ?? parent["Element Name"] ?? parentId,
      element_group: "content_model",
      skill_category: inferOnetParentSkillCategory(parentId),
      country: "US",
      language: "en",
      source_version: licences.onet.version,
      source_url: sourceUrls.onet,
      licence_name: licences.onet.name,
      licence_url: licences.onet.url,
      retrieved_at: options.retrievedAt,
    });
  }
}

function onetSkillRelationshipRows(
  skillsByElement: Map<string, CsvRow>,
  contentByElement: Map<string, CsvRow>,
  options: SourcePreparationOptions,
): CsvRow[] {
  const rows: CsvRow[] = [];
  for (const elementId of skillsByElement.keys()) {
    const parentId = elementId.split(".").slice(0, -1).join(".");
    if (!parentId || !skillsByElement.has(parentId)) continue;
    rows.push({
      source_skill_id: parentId,
      target_skill_id: elementId,
      relationship_type: "broader_than",
      weight: "0.7",
      description:
        contentByElement.get(parentId)?.["Element Name"] ??
        "O*NET content-model parent relationship",
      country: "US",
      language: "en",
      source_version: licences.onet.version,
      source_url: sourceUrls.onet,
      licence_name: licences.onet.name,
      licence_url: licences.onet.url,
      retrieved_at: options.retrievedAt,
    });
  }
  return rows.sort(
    (left, right) =>
      (left["source_skill_id"] ?? "").localeCompare(
        right["source_skill_id"] ?? "",
      ) ||
      (left["target_skill_id"] ?? "").localeCompare(
        right["target_skill_id"] ?? "",
      ),
  );
}

function inferOnetParentSkillCategory(elementId: string): string {
  if (elementId.startsWith("2.C")) return "domain_knowledge";
  if (elementId.startsWith("2.A")) return "technical";
  if (elementId.startsWith("2.B")) return "transferable";
  return "transferable";
}

async function fetchEscoOccupationDetails(
  rawDir: string,
  policy: DomainSelectionPolicy,
  plan: OccupationPlanRow[],
): Promise<void> {
  const queries = uniqueArray([
    ...plan.map((row) => row.canonicalTitle),
    ...policy.global_keywords,
  ]).slice(0, 130);
  const searchResults: unknown[] = [];
  const occupationUris = new Set<string>();

  for (const query of queries) {
    const url = new URL("https://ec.europa.eu/esco/api/search");
    url.searchParams.set("language", "en");
    url.searchParams.set("type", "occupation");
    url.searchParams.set("text", query);
    url.searchParams.set(
      "limit",
      String(policy.source_limits.esco_search_limit_per_query),
    );
    const payload = await fetchJson<EscoSearchResponse>(url);
    searchResults.push(payload);
    for (const result of payload._embedded?.results ?? []) {
      if (result.uri) occupationUris.add(result.uri);
    }
    if (occupationUris.size >= policy.source_limits.esco_max_occupations) break;
  }

  const details: EscoOccupationDetail[] = [];
  const detailErrors: Array<{ uri: string; error: string }> = [];
  for (const uri of [...occupationUris].slice(
    0,
    policy.source_limits.esco_max_occupations,
  )) {
    const url = new URL("https://ec.europa.eu/esco/api/resource/occupation");
    url.searchParams.set("language", "en");
    url.searchParams.set("uri", uri);
    try {
      details.push(await fetchJson<EscoOccupationDetail>(url));
    } catch (error) {
      detailErrors.push({
        uri,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await writeText(
    join(rawDir, "search-results.jsonl"),
    `${searchResults.map((item) => JSON.stringify(item)).join("\n")}\n`,
  );
  await writeText(
    join(rawDir, "occupation-details.jsonl"),
    `${details.map((item) => JSON.stringify(item)).join("\n")}\n`,
  );
  await writeText(
    join(rawDir, "occupation-detail-errors.jsonl"),
    `${detailErrors.map((item) => JSON.stringify(item)).join("\n")}\n`,
  );
}

async function fetchJson<T>(url: URL): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        throw new Error(`${url.toString()} returned HTTP ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      await sleep(300 * attempt);
    }
  }
  throw new Error(
    `${url.toString()} failed after retries: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sourcePlanMatch(
  plan: OccupationPlanRow[],
  label: string,
  aliases: string[],
): PlanMatch | undefined {
  return findBestPlanMatch(plan, label, aliases);
}

function hasPlanMatch(
  policy: DomainSelectionPolicy,
  match: PlanMatch | undefined,
): boolean {
  return (
    (match?.confidence ?? 0) >=
    policy.matching.minimum_source_match_confidence
  );
}

interface OnetRating {
  onetCode: string;
  elementId: string;
  elementName: string;
  importance: number;
  level: number;
  category: string;
}

function aggregateOnetRatings(
  rows: CsvRow[],
  selectedCodes: Set<string>,
  category: string,
  policy: DomainSelectionPolicy,
): OnetRating[] {
  const values = new Map<string, Partial<OnetRating>>();
  for (const row of rows) {
    const onetCode = row["O*NET-SOC Code"] ?? "";
    if (!selectedCodes.has(onetCode)) continue;
    const elementId = row["Element ID"] ?? "";
    const key = `${onetCode}:${elementId}`;
    const current = values.get(key) ?? {
      onetCode,
      elementId,
      elementName: row["Element Name"] ?? "",
      category,
    };
    if (row["Scale ID"] === "IM") {
      current.importance = Number(row["Data Value"] || 0);
    } else if (row["Scale ID"] === "LV") {
      current.level = Number(row["Data Value"] || 0);
    }
    values.set(key, current);
  }

  return [...values.values()]
    .filter(
      (row): row is OnetRating =>
        Boolean(row.onetCode && row.elementId && row.elementName) &&
        (row.importance ?? 0) >= policy.source_limits.onet_min_rating_importance,
    )
    .map((row) => ({
      ...row,
      importance: Number((row.importance ?? 0).toFixed(2)),
      level: Number((row.level ?? 0).toFixed(2)),
    }))
    .sort(
      (left, right) =>
        right.importance - left.importance ||
        left.onetCode.localeCompare(right.onetCode) ||
        left.elementId.localeCompare(right.elementId),
    );
}

function transferabilityForOnetTier(tier: string): string {
  if (tier.toLowerCase().includes("short")) return "0.8";
  if (tier.toLowerCase().includes("long")) return "0.65";
  return "0.5";
}

function groupRows(rows: CsvRow[], key: string): Map<string, CsvRow[]> {
  const grouped = new Map<string, CsvRow[]>();
  for (const row of rows) {
    const value = row[key] ?? "";
    if (!value) continue;
    grouped.set(value, [...(grouped.get(value) ?? []), row]);
  }
  return grouped;
}

async function writeManifest(
  options: SourcePreparationOptions,
  summaries: SourcePreparationSummary[],
): Promise<void> {
  await writeJson(options.manifestPath, {
    schema_version: "1.0.0",
    taxonomy_version: options.version,
    default_local_input_directory: options.inputRoot,
    raw_files_committed: false,
    retrieval_date: options.retrievedAt,
    sources: [
      ...(await Promise.all(
        summaries.map(async (summary) => {
        const sourceId = summary.sourceId;
        const config = sourceConfigs[sourceId];
        const licence = licences[sourceId];
        const rawFiles = await sourceRawFiles(options.inputRoot, sourceId);
        const preparedFiles = await Promise.all(
          summary.preparedFiles.map((file) =>
            fileMetadata(options.inputRoot, file, "adapter_ready", 0),
          ),
        );
        return {
          source_id: sourceId,
          source_name: config.sourceName,
          source_type: config.sourceType,
          publisher: config.publisher,
          source_version: licence.version,
          release_date: licence.releaseDate,
          source_url: sourceUrls[sourceId],
          download_url: downloadUrls[sourceId],
          licence_name: licence.name,
          licence_url: licence.url,
          retrieved_at: options.retrievedAt,
          redistribution_allowed: sourceId === "onet",
          raw_file_commit_allowed: false,
          raw_files_committed: false,
          derived_dataset_commit_allowed:
            "candidate CSVs only; raw publisher files remain local and ignored",
          attribution_required:
            sourceId === "onet"
              ? "Credit O*NET 30.3 Database and USDOL/ETA; indicate CareerPathX transformations."
              : "Credit the official publisher and preserve source URLs in provenance.",
          raw_record_count: summary.rawRecords,
          accepted_record_count: summary.acceptedRecords,
          rejected_record_count: summary.rejectedRecords,
          files: [...rawFiles, ...preparedFiles],
        };
        }),
      )),
      await professionalBodiesManifestEntry(options),
    ],
  });
}

async function professionalBodiesManifestEntry(options: SourcePreparationOptions) {
  const config = sourceConfigs["professional-bodies"];
  return {
    source_id: "professional-bodies",
    source_name: config.sourceName,
    source_type: config.sourceType,
    publisher: config.publisher,
    source_version: options.version,
    release_date: "",
    source_url: "local-only",
    download_url: "",
    licence_name:
      "Per-framework terms must be recorded before controlled local import",
    licence_url: "",
    retrieved_at: options.retrievedAt,
    redistribution_allowed: false,
    raw_file_commit_allowed: false,
    raw_files_committed: false,
    derived_dataset_commit_allowed:
      "only after source-specific permission review",
    attribution_required:
      "Per-framework attribution must be recorded before ingestion",
    raw_record_count: 0,
    accepted_record_count: 0,
    rejected_record_count: 0,
    files: (await fileExists(
      join(options.inputRoot, "professional-bodies/sources.json"),
    ))
      ? [
          await fileMetadata(
            options.inputRoot,
            "professional-bodies/sources.json",
            "adapter_ready",
            0,
          ),
        ]
      : [],
  };
}

async function sourceRawFiles(
  inputRoot: string,
  sourceId: TaxonomySourceId,
): Promise<PreparedSourceFile[]> {
  const candidates: Record<TaxonomySourceId, string[]> = {
    "uk-soc": [
      "uk-soc/raw/soc2020volume2thecodingindexzip03122025.zip",
      "uk-soc/raw/extracted/SOC2020_volume2_thecodingindex.csv",
      "uk-soc/raw/extracted/SOC2020_framework.csv",
    ],
    esco: [
      "esco/raw/search-results.jsonl",
      "esco/raw/occupation-details.jsonl",
    ],
    onet: [
      "onet/raw/db_30_3_csv.zip",
      "onet/raw/extracted/db_30_3_csv/occupation_data.csv",
      "onet/raw/extracted/db_30_3_csv/job_titles.csv",
      "onet/raw/extracted/db_30_3_csv/essential_skills.csv",
      "onet/raw/extracted/db_30_3_csv/transferable_skills.csv",
      "onet/raw/extracted/db_30_3_csv/knowledge.csv",
      "onet/raw/extracted/db_30_3_csv/abilities.csv",
      "onet/raw/extracted/db_30_3_csv/software_skills.csv",
      "onet/raw/extracted/db_30_3_csv/related_occupations.csv",
      "onet/raw/extracted/db_30_3_csv/job_zones.csv",
      "onet/raw/extracted/db_30_3_csv/content_model_reference.csv",
    ],
    "professional-bodies": [],
  };
  const files: PreparedSourceFile[] = [];
  for (const file of candidates[sourceId]) {
    if (!(await fileExists(join(inputRoot, file)))) continue;
    files.push(await fileMetadata(inputRoot, file, "official_raw", 0));
  }
  return files;
}

async function fileMetadata(
  inputRoot: string,
  localPath: string,
  role: PreparedSourceFile["source_role"],
  recordCount: number,
): Promise<PreparedSourceFile> {
  const absolute = join(inputRoot, localPath);
  const info = await stat(absolute);
  const format = localPath.endsWith(".zip")
    ? "zip"
    : localPath.endsWith(".jsonl")
      ? "jsonl"
      : localPath.endsWith(".json")
        ? "json"
      : "csv";
  return {
    file_name: localPath.split("/").at(-1) ?? localPath,
    local_path: localPath,
    file_format: format,
    file_size_bytes: info.size,
    checksum_sha256: await sha256File(absolute),
    record_count: recordCount,
    encoding: "utf-8",
    source_role: role,
    raw_file_committed: false,
  };
}

async function readJsonl(path: string): Promise<unknown[]> {
  const text = await import("node:fs/promises").then((fs) =>
    fs.readFile(path, "utf8"),
  );
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown);
}

async function assertFile(path: string, label: string): Promise<void> {
  if (!(await fileExists(path))) {
    throw new Error(`${label} not found at ${path}`);
  }
}

function compact(values: string[]): string {
  return values.filter(Boolean).join(" ");
}

function uniqueList(values: string[]): string {
  return uniqueArray(values).join("|");
}

function uniqueArray(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function linkUris(links: Array<{ uri?: string }>): string {
  return uniqueList(links.map((link) => link.uri ?? ""));
}

function skillTypeLabel(skillType: string | undefined): string {
  const value = skillType?.split("/").at(-1) ?? "";
  if (value === "knowledge") return "knowledge";
  if (value === "skill") return "skill";
  return value || "skill";
}

interface EscoSearchResponse {
  _embedded?: {
    results?: Array<{ uri?: string }>;
  };
}

interface EscoOccupationDetail {
  uri: string;
  title?: string;
  code?: string;
  preferredLabel?: Record<string, string>;
  alternativeLabel?: Record<string, string[]>;
  description?: Record<string, { literal?: string }>;
  _links?: {
    broaderIscoGroup?: Array<{ uri?: string }>;
    broaderOccupation?: Array<{ uri?: string }>;
    hasEssentialSkill?: EscoSkillLink[];
    hasOptionalSkill?: EscoSkillLink[];
  };
}

interface EscoSkillLink {
  uri?: string;
  title?: string;
  skillType?: string;
}
