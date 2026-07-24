import { sourceConfigs } from "../../config";
import {
  normaliseCountry,
  normaliseLanguage,
} from "../../normalisation/language-normaliser";
import { normaliseTitle } from "../../normalisation/title-normaliser";
import type { NormalisedSourceRecord, RawSourceRecord } from "../../types";
import { splitList } from "../../utils/csv";
import { CsvSourceAdapter } from "../base-adapter";

export class UkSocAdapter extends CsvSourceAdapter {
  readonly sourceId = "uk-soc" as const;
  readonly sourceType = "uk_soc" as const;
  protected readonly files = [
    {
      path: "uk-soc/occupations.csv",
      recordType: "occupation" as const,
      requiredColumns: ["soc_code", "title", "description"],
    },
  ];

  normalise(record: RawSourceRecord): NormalisedSourceRecord[] {
    const row = record.original;
    const title = normaliseTitle(row["title"] ?? "");
    const aliases = splitList(row["alt_titles"] ?? "");
    const config = sourceConfigs[this.sourceId];
    const occupation = this.baseRecord(record, {
      recordType: "occupation",
      preferredLabel: title.display,
      normalisedLabel: title.normalised,
      alternativeLabels: aliases,
      description: row["description"] ?? "",
      externalCodes: {
        uk_soc_code: row["soc_code"] ?? "",
        uk_soc_source_record_id: row["source_record_id"] ?? "",
        isco08_code: row["isco08_code"] ?? "",
      },
      parentIdentifiers: [
        row["major_group"] ?? "",
        row["sub_major_group"] ?? "",
        row["minor_group"] ?? "",
        row["unit_group"] ?? "",
      ].filter(Boolean),
      relatedIdentifiers: [],
      country: normaliseCountry(row["country"], config.country),
      language: normaliseLanguage(row["language"], config.language),
      attributes: {
        baseRole: title.baseRole,
        seniority: title.seniority,
        sector: title.sector || row["group_title"] || "",
        discipline: title.discipline,
        specialism: title.specialism,
        plannedCpxCode: row["planned_cpx_code"] ?? "",
        plannedMatchConfidence: Number(row["planned_match_confidence"] || 0),
        selectionReason: row["selection_reason"] ?? "",
      },
    });

    const aliasRecords = aliases.map((alias) => {
      const aliasTitle = normaliseTitle(alias);
      return this.baseRecord(record, {
        recordType: "occupation_alias",
        preferredLabel: alias,
        normalisedLabel: aliasTitle.normalised,
        alternativeLabels: [],
        description: "",
          externalCodes: {
            uk_soc_code: row["soc_code"] ?? "",
            uk_soc_source_record_id: row["source_record_id"] ?? "",
          },
        parentIdentifiers: [record.sourceRecordId],
        relatedIdentifiers: [],
        country: normaliseCountry(row["country"], config.country),
        language: normaliseLanguage(row["language"], config.language),
        attributes: {
          baseRole: aliasTitle.baseRole,
          seniority: aliasTitle.seniority,
          sector: aliasTitle.sector || row["group_title"] || "",
        },
      });
    });

    return [occupation, ...aliasRecords];
  }
}
