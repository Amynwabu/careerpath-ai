import { sourceConfigs } from "../../config";
import {
  normaliseCountry,
  normaliseLanguage,
} from "../../normalisation/language-normaliser";
import { normaliseSkill } from "../../normalisation/skill-normaliser";
import { normaliseTitle } from "../../normalisation/title-normaliser";
import type { NormalisedSourceRecord, RawSourceRecord } from "../../types";
import { CsvSourceAdapter } from "../base-adapter";
import {
  onetImportanceToWeight,
  onetLevelToCpxLevel,
  onetRequirementType,
} from "./mappings";

export class OnetAdapter extends CsvSourceAdapter {
  readonly sourceId = "onet" as const;
  readonly sourceType = "onet" as const;
  protected readonly files = [
    {
      path: "onet/occupations.csv",
      recordType: "occupation" as const,
      requiredColumns: ["onet_code", "title", "description"],
    },
    {
      path: "onet/alternate-titles.csv",
      recordType: "occupation_alias" as const,
      requiredColumns: ["onet_code", "alternate_title"],
    },
    {
      path: "onet/skills.csv",
      recordType: "skill" as const,
      requiredColumns: ["element_id", "skill_name", "description"],
    },
    {
      path: "onet/occupation-skills.csv",
      recordType: "occupation_skill" as const,
      requiredColumns: ["onet_code", "element_id", "importance", "level"],
    },
    {
      path: "onet/related-occupations.csv",
      recordType: "career_transition" as const,
      requiredColumns: ["from_onet_code", "to_onet_code"],
    },
    {
      path: "onet/skill-relationships.csv",
      recordType: "skill_relationship" as const,
      requiredColumns: ["source_skill_id", "target_skill_id", "relationship_type"],
    },
  ];

  protected override recordId(
    row: Record<string, string>,
    filePath: string,
    rowNumber: number,
  ): string {
    if (filePath.endsWith("alternate-titles.csv")) {
      return `${row["onet_code"] ?? ""}:${row["alternate_title"] ?? ""}`;
    }
    if (filePath.endsWith("occupation-skills.csv")) {
      return `${row["onet_code"] ?? ""}:${row["element_id"] ?? ""}`;
    }
    if (filePath.endsWith("related-occupations.csv")) {
      return `${row["from_onet_code"] ?? ""}:${row["to_onet_code"] ?? ""}`;
    }
    if (filePath.endsWith("skill-relationships.csv")) {
      return `${row["source_skill_id"] ?? ""}:${row["target_skill_id"] ?? ""}:${row["relationship_type"] ?? ""}`;
    }
    return super.recordId(row, filePath, rowNumber);
  }

  normalise(record: RawSourceRecord): NormalisedSourceRecord[] {
    if (record.recordType === "occupation")
      return [this.normaliseOccupation(record)];
    if (record.recordType === "occupation_alias")
      return [this.normaliseAlias(record)];
    if (record.recordType === "skill")
      return [this.normaliseSkillRecord(record)];
    if (record.recordType === "skill_relationship")
      return [this.normaliseSkillRelationship(record)];
    if (record.recordType === "career_transition")
      return [this.normaliseTransition(record)];
    return [this.normaliseOccupationSkill(record)];
  }

  private normaliseOccupation(record: RawSourceRecord): NormalisedSourceRecord {
    const row = record.original;
    const title = normaliseTitle(row["title"] ?? "");
    const config = sourceConfigs[this.sourceId];
    return this.baseRecord(record, {
      recordType: "occupation",
      preferredLabel: title.display,
      normalisedLabel: title.normalised,
      alternativeLabels: [],
      description: row["description"] ?? "",
      externalCodes: { onet_code: row["onet_code"] ?? "" },
      parentIdentifiers: [row["job_zone"] ?? ""].filter(Boolean),
      relatedIdentifiers: [],
      country: normaliseCountry(row["country"], config.country),
      language: normaliseLanguage(row["language"], config.language),
      attributes: {
        baseRole: title.baseRole,
        seniority: title.seniority,
        sector: title.sector,
        discipline: title.discipline,
        plannedCpxCode: row["planned_cpx_code"] ?? "",
        plannedMatchConfidence: Number(row["planned_match_confidence"] || 0),
        selectionReason: row["selection_reason"] ?? "",
      },
    });
  }

  private normaliseAlias(record: RawSourceRecord): NormalisedSourceRecord {
    const row = record.original;
    const title = normaliseTitle(row["alternate_title"] ?? "");
    const config = sourceConfigs[this.sourceId];
    return this.baseRecord(record, {
      recordType: "occupation_alias",
      preferredLabel: title.display,
      normalisedLabel: title.normalised,
      alternativeLabels: [],
      description: "",
      externalCodes: { onet_code: row["onet_code"] ?? "" },
      parentIdentifiers: [row["onet_code"] ?? ""].filter(Boolean),
      relatedIdentifiers: [],
      country: normaliseCountry(row["country"], config.country),
      language: normaliseLanguage(row["language"], config.language),
      attributes: {
        baseRole: title.baseRole,
        seniority: title.seniority,
        sector: title.sector,
      },
    });
  }

  private normaliseSkillRecord(
    record: RawSourceRecord,
  ): NormalisedSourceRecord {
    const row = record.original;
    const skill = normaliseSkill(row["skill_name"] ?? "");
    const config = sourceConfigs[this.sourceId];
    return this.baseRecord(record, {
      recordType: "skill",
      preferredLabel: skill.display,
      normalisedLabel: skill.normalised,
      alternativeLabels: [],
      description: row["description"] ?? "",
      externalCodes: { onet_element_id: row["element_id"] ?? "" },
      parentIdentifiers: [row["element_group"] ?? ""].filter(Boolean),
      relatedIdentifiers: [],
      country: normaliseCountry(row["country"], config.country),
      language: normaliseLanguage(row["language"], config.language),
      attributes: {
        skillCategory: row["skill_category"] || skill.skillCategory,
      },
    });
  }

  private normaliseOccupationSkill(
    record: RawSourceRecord,
  ): NormalisedSourceRecord {
    const row = record.original;
    return this.baseRecord(record, {
      recordType: "occupation_skill",
      preferredLabel: `${row["onet_code"] ?? ""} -> ${row["element_id"] ?? ""}`,
      normalisedLabel: `${row["onet_code"] ?? ""}:${row["element_id"] ?? ""}`,
      alternativeLabels: [],
      description: "",
      externalCodes: {
        onet_code: row["onet_code"] ?? "",
        onet_element_id: row["element_id"] ?? "",
      },
      parentIdentifiers: [row["onet_code"] ?? ""].filter(Boolean),
      relatedIdentifiers: [row["element_id"] ?? ""].filter(Boolean),
      country: "US",
      language: "en",
      attributes: {
        requirementType: onetRequirementType(row["importance"] ?? ""),
        requiredLevel: onetLevelToCpxLevel(row["level"] ?? ""),
        importanceWeight: onetImportanceToWeight(row["importance"] ?? ""),
      },
    });
  }

  private normaliseTransition(record: RawSourceRecord): NormalisedSourceRecord {
    const row = record.original;
    return this.baseRecord(record, {
      recordType: "career_transition",
      preferredLabel: `${row["from_onet_code"] ?? ""} -> ${row["to_onet_code"] ?? ""}`,
      normalisedLabel: `${row["from_onet_code"] ?? ""}:${row["to_onet_code"] ?? ""}`,
      alternativeLabels: [],
      description: row["description"] ?? "",
      externalCodes: {
        from_onet_code: row["from_onet_code"] ?? "",
        to_onet_code: row["to_onet_code"] ?? "",
      },
      parentIdentifiers: [row["from_onet_code"] ?? ""].filter(Boolean),
      relatedIdentifiers: [row["to_onet_code"] ?? ""].filter(Boolean),
      country: "US",
      language: "en",
      attributes: {
        transitionType: "lateral",
        difficultyScore: Number(row["difficulty_score"] || 3),
        transferabilityScore: Number(row["transferability_score"] || 0.5),
      },
    });
  }

  private normaliseSkillRelationship(
    record: RawSourceRecord,
  ): NormalisedSourceRecord {
    const row = record.original;
    return this.baseRecord(record, {
      recordType: "skill_relationship",
      preferredLabel: `${row["source_skill_id"] ?? ""} -> ${row["target_skill_id"] ?? ""}`,
      normalisedLabel: `${row["source_skill_id"] ?? ""}:${row["target_skill_id"] ?? ""}`,
      alternativeLabels: [],
      description: row["description"] ?? "",
      externalCodes: {
        onet_source_skill_id: row["source_skill_id"] ?? "",
        onet_target_skill_id: row["target_skill_id"] ?? "",
      },
      parentIdentifiers: [row["source_skill_id"] ?? ""].filter(Boolean),
      relatedIdentifiers: [row["target_skill_id"] ?? ""].filter(Boolean),
      country: "US",
      language: "en",
      attributes: {
        relationshipType: row["relationship_type"] || "broader_than",
        importanceWeight: Number(row["weight"] || 0.5),
      },
    });
  }
}
