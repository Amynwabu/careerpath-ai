import { join } from "node:path";
import type { PipelineOptions } from "../pipeline";
import { readCsv, readText, writeCsv, writeJson, writeText } from "../utils/files";
import { validateReviewerRegistry } from "./reviewer-onboarding";

type Row = Record<string, string>;

export async function preparePilotReview(options: PipelineOptions) {
  const occupations = await readCsv(join(options.canonicalRoot, "occupations.csv"));
  const skills = await readCsv(join(options.canonicalRoot, "skills.csv"));
  const aliases = await readCsv(
    join(options.reportRoot, "alias-review", options.version, "aliases.csv"),
  );
  const requirements = await readCsv(
    join(options.canonicalRoot, "occupation-skills.csv"),
  );
  const transitions = await readCsv(
    join(options.canonicalRoot, "career-transitions.csv"),
  );
  const familyCounts = new Map<string, number>();
  for (const occupation of occupations) {
    const family = occupation["career_family_code"] ?? "";
    familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
  }
  const family =
    [...familyCounts.entries()].sort(
      ([leftName, leftCount], [rightName, rightCount]) =>
        rightCount - leftCount || leftName.localeCompare(rightName),
    )[0]?.[0] ?? "";
  const familyOccupations = occupations
    .filter((row) => row["career_family_code"] === family)
    .sort((left, right) => (left["code"] ?? "").localeCompare(right["code"] ?? ""));
  const occupationBatch = familyOccupations.slice(0, 10);
  const occupationCodes = new Set(occupationBatch.map((row) => row["code"]));
  const profileRows = requirements.filter((row) =>
    occupationCodes.has(row["occupation_code"]),
  );
  const skillCodes = new Set(profileRows.map((row) => row["skill_code"]));
  const skillBatch = skills
    .filter((row) => skillCodes.has(row["code"]))
    .sort((left, right) => (left["code"] ?? "").localeCompare(right["code"] ?? ""))
    .slice(0, 25);
  const aliasBatch = aliases
    .filter(
      (row) =>
        row["ambiguous"] === "true" &&
        occupationCodes.has(row["occupation_code"]),
    )
    .sort((left, right) =>
      (left["normalised_alias"] ?? "").localeCompare(
        right["normalised_alias"] ?? "",
      ),
    )
    .slice(0, 25);
  const transitionBatch = transitions
    .filter(
      (row) =>
        occupationCodes.has(row["from_occupation_code"]) ||
        occupationCodes.has(row["to_occupation_code"]),
    )
    .sort((left, right) =>
      `${left["from_occupation_code"]}|${left["to_occupation_code"]}`.localeCompare(
        `${right["from_occupation_code"]}|${right["to_occupation_code"]}`,
      ),
    )
    .slice(0, 10);

  const root = join(
    options.canonicalRoot,
    "..",
    "reviews",
    options.version,
    "pilot",
  );
  await writeCsv(join(root, "occupations.csv"), occupationBatch, Object.keys(occupationBatch[0] ?? {}));
  await writeCsv(join(root, "skills.csv"), skillBatch, Object.keys(skillBatch[0] ?? {}));
  await writeCsv(join(root, "critical-aliases.csv"), aliasBatch, Object.keys(aliasBatch[0] ?? {}));
  await writeCsv(join(root, "transitions.csv"), transitionBatch, Object.keys(transitionBatch[0] ?? {}));
  await writeCsv(
    join(root, "skill-profiles.csv"),
    profileRows,
    Object.keys(profileRows[0] ?? {}),
  );
  await writeJson(join(root, "pilot-manifest.json"), {
    taxonomyVersion: options.version,
    careerFamily: family,
    occupationCount: occupationBatch.length,
    skillCount: skillBatch.length,
    criticalAliasCount: aliasBatch.length,
    transitionCount: transitionBatch.length,
    skillProfileRelationshipCount: profileRows.length,
    status: "prepared_unexecuted",
    reviewerIdentitiesIncluded: false,
    decisionsIncluded: false,
    publicationSideEffects: false,
  });
  await writeText(
    join(root, "README.md"),
    `# CareerPathX Taxonomy ${options.version} Controlled Pilot\n\n` +
      `Status: prepared but unexecuted.\n\n` +
      `This package contains no reviewer identities, decisions, approvals, timestamps, or professional-body claims. ` +
      `Register authorised reviewers before operating the pilot.\n`,
  );
  return pilotStatus(options);
}

export async function pilotStatus(options: PipelineOptions) {
  const registry = await validateReviewerRegistry(options);
  const root = join(
    options.canonicalRoot,
    "..",
    "reviews",
    options.version,
    "pilot",
  );
  const manifest = JSON.parse(
    await readText(join(root, "pilot-manifest.json")),
  ) as Record<string, unknown>;
  const status = {
    ...manifest,
    activeReviewers: registry.activeReviewers,
    onboardingValid: registry.ok,
    executionAllowed: registry.ok && registry.activeReviewers > 0,
    genuineHumanDecisions: 0,
    completedItems: 0,
    publicationTriggered: false,
    taxonomyStatus: "unpublished_candidate",
  };
  await writeJson(
    join(options.reportRoot, options.version, "review", "pilot-status.json"),
    status,
  );
  await writeText(
    join(options.reportRoot, options.version, "review", "pilot-status.md"),
    `# Controlled Pilot Status\n\n` +
      `- Status: prepared_unexecuted\n` +
      `- Active reviewers: ${registry.activeReviewers}\n` +
      `- Genuine decisions: 0\n` +
      `- Publication triggered: no\n` +
      `- Taxonomy status: unpublished_candidate\n`,
  );
  return status;
}
