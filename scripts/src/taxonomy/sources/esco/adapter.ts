import { sourceConfigs } from "../../config";
import {
  normaliseCountry,
  normaliseLanguage,
} from "../../normalisation/language-normaliser";
import { normaliseSkill } from "../../normalisation/skill-normaliser";
import { normaliseTitle } from "../../normalisation/title-normaliser";
import type { NormalisedSourceRecord, RawSourceRecord } from "../../types";
import { splitList } from "../../utils/csv";
import { CsvSourceAdapter } from "../base-adapter";

export class EscoAdapter extends CsvSourceAdapter {
  readonly sourceId = "esco" as const;
  readonly sourceType = "esco" as const;
  protected readonly files = [
    {
      path: "esco/occupations.csv",
      recordType: "occupation" as const,
      requiredColumns: ["concept_uri", "preferred_label", "description"],
    },
    {
      path: "esco/skills.csv",
      recordType: "skill" as const,
      requiredColumns: ["skill_uri", "preferred_label", "description"],
    },
    {
      path: "esco/occupation-skills.csv",
      recordType: "occupation_skill" as const,
      requiredColumns: ["occupation_uri", "skill_uri", "relationship_type"],
    },
  ];

  protected override recordId(
    row: Record<string, string>,
    filePath: string,
    rowNumber: number,
  ): string {
    if (filePath.endsWith("occupation-skills.csv")) {
      return `${row["occupation_uri"] ?? ""}:${row["skill_uri"] ?? ""}:${row["relationship_type"] ?? ""}`;
    }
    return super.recordId(row, filePath, rowNumber);
  }

  normalise(record: RawSourceRecord): NormalisedSourceRecord[] {
    if (record.recordType === "occupation")
      return this.normaliseOccupation(record);
    if (record.recordType === "skill") return this.normaliseSkillRecord(record);
    return [this.normaliseOccupationSkill(record)];
  }

  private normaliseOccupation(
    record: RawSourceRecord,
  ): NormalisedSourceRecord[] {
    const row = record.original;
    const title = normaliseTitle(row["preferred_label"] ?? "");
    const aliases = splitList(row["alt_labels"] ?? "");
    const config = sourceConfigs[this.sourceId];
    return [
      this.baseRecord(record, {
        recordType: "occupation",
        preferredLabel: title.display,
        normalisedLabel: title.normalised,
        alternativeLabels: aliases,
        description: row["description"] ?? "",
        externalCodes: {
          esco_uri: row["concept_uri"] ?? "",
          esco_code: row["esco_code"] ?? "",
        },
        parentIdentifiers: splitList(row["broader_uri"] ?? ""),
        relatedIdentifiers: splitList(row["related_uri"] ?? ""),
        country: normaliseCountry(row["country"], config.country),
        language: normaliseLanguage(row["language"], config.language),
        attributes: {
          baseRole: title.baseRole,
          seniority: title.seniority,
          sector: title.sector,
          discipline: title.discipline,
          specialism: title.specialism,
          plannedCpxCode: row["planned_cpx_code"] ?? "",
          plannedMatchConfidence: Number(row["planned_match_confidence"] || 0),
          selectionReason: row["selection_reason"] ?? "",
        },
      }),
      ...aliases.map((alias) => {
        const aliasTitle = normaliseTitle(alias);
        return this.baseRecord(record, {
          recordType: "occupation_alias",
          preferredLabel: alias,
          normalisedLabel: aliasTitle.normalised,
          alternativeLabels: [],
          description: "",
          externalCodes: { esco_uri: row["concept_uri"] ?? "" },
          parentIdentifiers: [record.sourceRecordId],
          relatedIdentifiers: [],
          country: normaliseCountry(row["country"], config.country),
          language: normaliseLanguage(row["language"], config.language),
          attributes: {
            baseRole: aliasTitle.baseRole,
            seniority: aliasTitle.seniority,
            sector: aliasTitle.sector,
          },
        });
      }),
    ];
  }

  private normaliseSkillRecord(
    record: RawSourceRecord,
  ): NormalisedSourceRecord[] {
    const row = record.original;
    const skill = normaliseSkill(row["preferred_label"] ?? "");
    const aliases = splitList(row["alt_labels"] ?? "");
    const config = sourceConfigs[this.sourceId];
    return [
      this.baseRecord(record, {
        recordType: "skill",
        preferredLabel: skill.display,
        normalisedLabel: skill.normalised,
        alternativeLabels: aliases,
        description: row["description"] ?? "",
        externalCodes: { esco_uri: row["skill_uri"] ?? "" },
        parentIdentifiers: splitList(row["broader_uri"] ?? ""),
        relatedIdentifiers: splitList(row["related_uri"] ?? ""),
        country: normaliseCountry(row["country"], config.country),
        language: normaliseLanguage(row["language"], config.language),
        attributes: {
          skillCategory: escoSkillCategory(row["skill_type"], skill.skillCategory),
        },
      }),
      ...aliases.map((alias) => {
        const aliasSkill = normaliseSkill(alias);
        return this.baseRecord(record, {
          recordType: "skill_alias",
          preferredLabel: alias,
          normalisedLabel: aliasSkill.normalised,
          alternativeLabels: [],
          description: "",
          externalCodes: { esco_uri: row["skill_uri"] ?? "" },
          parentIdentifiers: [record.sourceRecordId],
          relatedIdentifiers: [],
          country: normaliseCountry(row["country"], config.country),
          language: normaliseLanguage(row["language"], config.language),
          attributes: {
            skillCategory: escoSkillCategory(
              row["skill_type"],
              aliasSkill.skillCategory,
            ),
          },
        });
      }),
    ];
  }

  private normaliseOccupationSkill(
    record: RawSourceRecord,
  ): NormalisedSourceRecord {
    const row = record.original;
    const relationship = (row["relationship_type"] ?? "").toLowerCase();
    return this.baseRecord(record, {
      recordType: "occupation_skill",
      preferredLabel: `${row["occupation_uri"] ?? ""} -> ${row["skill_uri"] ?? ""}`,
      normalisedLabel: `${row["occupation_uri"] ?? ""}:${row["skill_uri"] ?? ""}`,
      alternativeLabels: [],
      description: row["description"] ?? "",
      externalCodes: {
        occupation_esco_uri: row["occupation_uri"] ?? "",
        skill_esco_uri: row["skill_uri"] ?? "",
      },
      parentIdentifiers: [row["occupation_uri"] ?? ""].filter(Boolean),
      relatedIdentifiers: [row["skill_uri"] ?? ""].filter(Boolean),
      country: "EU",
      language: "en",
      attributes: {
        requirementType:
          relationship === "essential" ? "essential" : "desirable",
      },
    });
  }
}

function escoSkillCategory(
  skillType: string | undefined,
  fallback: string,
): string {
  if (skillType === "knowledge") return "domain_knowledge";
  if (skillType === "skill") return fallback;
  return fallback;
}
