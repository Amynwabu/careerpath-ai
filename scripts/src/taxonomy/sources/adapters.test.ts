import { describe, expect, it } from "vitest";
import { createTaxonomyFixture } from "../test-helpers";
import {
  defaultPipelineOptions,
  ingestSources,
  inspectSources,
  validateSources,
} from "../pipeline";

describe("taxonomy source adapters", () => {
  it("recognises supported source files and preserves metadata", async () => {
    const fixture = await createTaxonomyFixture();
    const options = defaultPipelineOptions({
      source: "all",
      inputRoot: fixture.inputRoot,
      outputRoot: fixture.outputRoot,
      canonicalRoot: fixture.canonicalRoot,
      reportRoot: fixture.reportRoot,
      mappingDir: fixture.mappingDir,
      manifestPath: fixture.manifestPath,
      version: "fixture-1",
    });

    const inspections = await inspectSources(options);
    expect(inspections).toHaveLength(4);
    expect(
      inspections.flatMap((inspection) => inspection.missingFiles),
    ).toEqual([]);
    expect(
      inspections.flatMap((inspection) => inspection.metadata).length,
    ).toBeGreaterThan(0);

    const validations = await validateSources(options);
    expect(validations.every((validation) => validation.ok)).toBe(true);
  });

  it("reports missing required files clearly", async () => {
    const fixture = await createTaxonomyFixture();
    const options = defaultPipelineOptions({
      source: "uk-soc",
      inputRoot: `${fixture.inputRoot}/missing`,
      outputRoot: fixture.outputRoot,
      canonicalRoot: fixture.canonicalRoot,
      reportRoot: fixture.reportRoot,
      mappingDir: fixture.mappingDir,
      manifestPath: fixture.manifestPath,
      version: "fixture-1",
    });

    const validation = await validateSources(options);
    expect(validation[0]?.ok).toBe(false);
    expect(validation[0]?.errors[0]).toContain("Missing required file");
  });

  it("stages normalised records without writing canonical tables", async () => {
    const fixture = await createTaxonomyFixture();
    const counts = await ingestSources(
      defaultPipelineOptions({
        source: "uk-soc",
        inputRoot: fixture.inputRoot,
        outputRoot: fixture.outputRoot,
        canonicalRoot: fixture.canonicalRoot,
        reportRoot: fixture.reportRoot,
        mappingDir: fixture.mappingDir,
        manifestPath: fixture.manifestPath,
        version: "fixture-1",
      }),
    );

    expect(counts["occupation"]).toBe(1);
    expect(counts["occupation_alias"]).toBe(2);
  });
});
