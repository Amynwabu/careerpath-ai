import { describe, expect, it } from "vitest";
import { createTaxonomyFixture } from "../test-helpers";
import { defaultPipelineOptions, ingestSources, reconcile } from "../pipeline";
import {
  onetImportanceToWeight,
  onetLevelToCpxLevel,
} from "../sources/onet/mappings";

describe("taxonomy reconciliation", () => {
  it("keeps reconciliation deterministic across runs", async () => {
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

    await ingestSources(options);
    const first = await reconcile(options);
    const second = await reconcile(options);

    expect(first.decisions.map((decision) => decision.decisionId)).toEqual(
      second.decisions.map((decision) => decision.decisionId),
    );
  });

  it("places low-confidence source relationships into review", async () => {
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

    await ingestSources(options);
    const result = await reconcile(options);
    const relationshipDecision = result.decisions.find(
      (decision) => decision.entityType === "requirement",
    );

    expect(relationshipDecision?.decision).toBe("requires_review");
    expect(relationshipDecision?.reviewReason).toContain("validation");
  });

  it("transforms O*NET ratings into CPX weights and levels", () => {
    expect(onetImportanceToWeight("4")).toBe(0.8);
    expect(onetLevelToCpxLevel("4.75")).toBe(4);
  });
});
