import { describe, expect, it } from "vitest";
import { createTaxonomyFixture } from "./test-helpers";
import {
  defaultPipelineOptions,
  generateCanonical,
  ingestSources,
  inspectSources,
  reconcile,
  validateCanonical,
  validateSources,
  writeImportPlan,
} from "./pipeline";

describe("taxonomy pipeline end to end", () => {
  it("runs synthetic source fixtures through canonical validation", async () => {
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
      dryRun: false,
    });

    expect((await inspectSources(options)).length).toBe(4);
    expect((await validateSources(options)).every((result) => result.ok)).toBe(
      true,
    );
    expect(await ingestSources(options)).toMatchObject({
      occupation: expect.any(Number),
      skill: expect.any(Number),
    });
    expect((await reconcile(options)).decisions.length).toBeGreaterThan(0);
    expect((await generateCanonical(options)).occupations).toBeGreaterThan(0);
    expect(await validateCanonical(options)).toMatchObject({ ok: true });
    expect(await writeImportPlan({ ...options, dryRun: true })).toMatchObject({
      dryRun: true,
      validation: { ok: true },
    });
  });
});
