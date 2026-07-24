import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

type Row = Record<string, string>;
type OccupationRecord = Record<string, unknown> & {
  aliases: Row[];
  relationships: Row[];
  provenance: Row[];
  version: string;
  reviewStatus: string;
};
type SkillRecord = Record<string, unknown> & {
  aliases: Row[];
  provenance: Row[];
  version: string;
  reviewStatus: string;
};

export class TaxonomyCatalogue {
  constructor(
    private readonly root = resolve(
      process.cwd().endsWith("api-server") ? process.cwd() : resolve(process.cwd()),
      process.cwd().endsWith("api-server")
        ? "../../datasets/career-taxonomy/published"
        : "datasets/career-taxonomy/published",
    ),
  ) {}

  async versions() {
    const manifest = await this.manifest("2026.1");
    return [manifest];
  }

  async occupations(version = "2026.1") {
    const [occupations, aliases, requirements, sources] = await Promise.all([
      this.csv(version, "occupations.csv"),
      this.csv(version, "occupation-aliases.csv"),
      this.csv(version, "occupation-skills.csv"),
      this.csv(version, "taxonomy-sources.csv"),
    ]);
    return occupations.map((occupation): OccupationRecord => ({
      ...occupation,
      aliases: aliases.filter(
        (alias) => alias["occupation_code"] === occupation["code"],
      ),
      relationships: requirements.filter(
        (item) => item["occupation_code"] === occupation["code"],
      ),
      provenance: sources.filter(
        (source) => source["entity_code"] === occupation["code"],
      ),
      version,
      reviewStatus: "approved",
    }));
  }

  async skills(version = "2026.1") {
    const [skills, aliases, sources] = await Promise.all([
      this.csv(version, "skills.csv"),
      this.csv(version, "skill-aliases.csv"),
      this.csv(version, "taxonomy-sources.csv"),
    ]);
    return skills.map((skill): SkillRecord => ({
      ...skill,
      aliases: aliases.filter((alias) => alias["skill_code"] === skill["code"]),
      provenance: sources.filter(
        (source) => source["entity_code"] === skill["code"],
      ),
      version,
      reviewStatus: "approved",
    }));
  }

  async transitions(version = "2026.1") {
    return this.csv(version, "career-transitions.csv");
  }

  async search(query: string, version = "2026.1") {
    const normalised = normalise(query);
    if (!normalised) return [];
    const occupations = await this.occupations(version);
    const exact = occupations.filter(
      (item) => normalise(String(item["canonical_title"] ?? "")) === normalised,
    );
    if (exact.length) return exact.map((item) => ({ stage: 1, item }));
    const aliasOccupationCodes = new Set(
      occupations
        .filter((item) =>
          item.aliases.some(
            (alias) => normalise(alias["alias"] ?? "") === normalised,
          ),
        )
        .map((item) => String(item["code"] ?? "")),
    );
    if (aliasOccupationCodes.size > 1) {
      return [{
        stage: 4,
        ambiguousAlias: true,
        exactMatchExcluded: true,
        candidateOccupationCodes: [...aliasOccupationCodes].sort(),
      }];
    }
    const aliases = occupations.filter((item) =>
      item.aliases.some(
        (alias) => normalise(alias["alias"] ?? "") === normalised,
      ),
    );
    if (aliases.length) return aliases.map((item) => ({ stage: 3, item }));
    return occupations
      .filter((item) =>
        [
          String(item["canonical_title"] ?? ""),
          String(item["summary"] ?? ""),
          String(item["description"] ?? ""),
          ...item.aliases.map((alias) => alias["alias"]),
        ]
          .filter(Boolean)
          .some((value) => normalise(String(value ?? "")).includes(normalised)),
      )
      .slice(0, 20)
      .map((item) => ({ stage: 4, item, semanticFallbackUsed: false }));
  }

  async readiness(code: string, version = "2026.1") {
    const occupation = (await this.occupations(version)).find(
      (item) => String(item["code"] ?? "") === code,
    );
    if (!occupation) return undefined;
    const essential = occupation.relationships.filter(
      (item) => item["requirement_type"] === "essential",
    ).length;
    return {
      occupationCode: code,
      version,
      deterministic: true,
      requiredSkillCount: occupation.relationships.length,
      essentialSkillCount: essential,
      scoringModel: "cpx-taxonomy-requirement-coverage-v1",
    };
  }

  private async manifest(version: string) {
    return JSON.parse(
      await readFile(
        resolve(this.root, version, "publication-manifest.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
  }

  private async csv(version: string, file: string) {
    return parseCsv(
      await readFile(resolve(this.root, version, file), "utf8"),
    );
  }
}

export const taxonomyCatalogue = new TaxonomyCatalogue();

function normalise(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseCsv(text: string): Row[] {
  const values: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some(Boolean)) values.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (row.length || field) {
    row.push(field);
    values.push(row);
  }
  const headers = values.shift() ?? [];
  return values.map((fields) =>
    Object.fromEntries(
      headers.map((header, index) => [header.trim(), fields[index]?.trim() ?? ""]),
    ),
  );
}
