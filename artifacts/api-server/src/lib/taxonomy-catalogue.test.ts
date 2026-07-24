import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TaxonomyCatalogue } from "./taxonomy-catalogue";

describe("TaxonomyCatalogue", () => {
  it("excludes ambiguous aliases from unconditional exact matching", async () => {
    const root = await mkdtemp(join(tmpdir(), "cpx-taxonomy-catalogue-"));
    const versionRoot = join(root, "2026.1");
    await mkdir(versionRoot, { recursive: true });
    await writeFile(
      join(versionRoot, "occupations.csv"),
      "code,canonical_title,summary,description\nCPX-1,Data Analyst,One,One\nCPX-2,Business Analyst,Two,Two\n",
    );
    await writeFile(
      join(versionRoot, "occupation-aliases.csv"),
      "occupation_code,alias,normalised_alias\nCPX-1,Analyst,analyst\nCPX-2,Analyst,analyst\n",
    );
    await writeFile(
      join(versionRoot, "occupation-skills.csv"),
      "occupation_code,skill_code,requirement_type\n",
    );
    await writeFile(
      join(versionRoot, "taxonomy-sources.csv"),
      "entity_code,source_id\nCPX-1,onet\nCPX-2,uk-soc\n",
    );

    const result = await new TaxonomyCatalogue(root).search("Analyst");

    expect(result).toEqual([
      {
        stage: 4,
        ambiguousAlias: true,
        exactMatchExcluded: true,
        candidateOccupationCodes: ["CPX-1", "CPX-2"],
      },
    ]);
  });
});
