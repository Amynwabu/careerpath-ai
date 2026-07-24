import {
  CareerIntelligenceEngine,
  type IntelligenceOccupation,
  type IntelligenceSkill,
  type IntelligenceTransition,
  type PublishedTaxonomySnapshot,
  type TaxonomyProvider,
} from "@workspace/career-intelligence";
import { taxonomyCatalogue } from "./taxonomy-catalogue";

class PublishedCatalogueProvider implements TaxonomyProvider {
  async getPublishedSnapshot(
    version = "2026.1",
  ): Promise<PublishedTaxonomySnapshot> {
    const [manifest] = await taxonomyCatalogue.versions();
    const status = manifest["status"];
    if (status !== "published" && status !== "published_local") {
      throw new Error("Career intelligence requires a published taxonomy.");
    }
    const [occupationRows, skillRows, transitionRows] = await Promise.all([
      taxonomyCatalogue.occupations(version),
      taxonomyCatalogue.skills(version),
      taxonomyCatalogue.transitions(version),
    ]);
    const aliasCounts = new Map<string, Set<string>>();
    for (const occupation of occupationRows) {
      for (const alias of occupation.aliases) {
        const key = normalise(alias["alias"] ?? "");
        const codes = aliasCounts.get(key) ?? new Set<string>();
        codes.add(String(occupation["code"] ?? ""));
        aliasCounts.set(key, codes);
      }
    }
    const occupations: IntelligenceOccupation[] = occupationRows.map(
      (row) => ({
        code: String(row["code"] ?? ""),
        title: String(row["canonical_title"] ?? ""),
        family: String(row["career_family_code"] ?? ""),
        level: String(row["career_level"] ?? ""),
        description: String(row["description"] ?? ""),
        aliases: row.aliases.map((alias) => ({
          value: alias["alias"] ?? "",
          exactMatchAllowed:
            (aliasCounts.get(normalise(alias["alias"] ?? ""))?.size ?? 0) <= 1,
          context: alias["industry_context"] || undefined,
        })),
        requirements: row.relationships.map((requirement) => ({
          skillCode: requirement["skill_code"] ?? "",
          requirementType: requirementType(
            requirement["requirement_type"] ?? "",
          ),
          requiredLevel: number(requirement["required_level"], 1),
          weight: number(requirement["importance_weight"], 0.5),
          evidence: [
            `${requirement["source_id"]}:${requirement["source_record_id"]}`,
          ],
        })),
        minimumExperienceYears: optionalNumber(
          String(row["minimum_experience_years"] ?? ""),
        ),
        qualificationCodes: [],
      }),
    );
    const skills: IntelligenceSkill[] = skillRows.map((row) => ({
      code: String(row["code"] ?? ""),
      name: String(row["canonical_name"] ?? ""),
      aliases: row.aliases.map((alias) => alias["alias"] ?? "").filter(Boolean),
      category: String(row["skill_category"] ?? "transferable"),
      description: String(row["description"] ?? ""),
    }));
    const transitions: IntelligenceTransition[] = transitionRows.map((row) => ({
      fromOccupationCode: row["from_occupation_code"] ?? "",
      toOccupationCode: row["to_occupation_code"] ?? "",
      type: row["transition_type"] ?? "lateral",
      difficulty: number(row["difficulty_score"], 3),
      transferability: number(row["transferability_score"], 0.5),
      estimatedExperience: "not_published",
      evidence: [`${row["source_id"]}:${row["source_record_id"]}`],
      reviewStatus: "approved",
    }));
    return {
      version,
      status,
      occupations,
      skills,
      transitions,
      learningResources: [],
      checksum: String(manifest["publicationId"] ?? ""),
    };
  }
}

export const careerIntelligenceEngine = new CareerIntelligenceEngine(
  new PublishedCatalogueProvider(),
);

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function number(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalNumber(value: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function requirementType(value: string) {
  if (value === "essential") return "essential" as const;
  if (value === "important") return "important" as const;
  if (value === "optional") return "optional" as const;
  return "supporting" as const;
}
