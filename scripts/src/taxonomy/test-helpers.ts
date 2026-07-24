import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

export async function createTaxonomyFixture() {
  const root = await mkdtemp(join(tmpdir(), "cpx-taxonomy-"));
  const inputRoot = join(root, "sources");
  const outputRoot = join(root, "generated");
  const canonicalRoot = join(root, "canonical");
  const reportRoot = join(root, "reports");
  const mappingDir = join(root, "mappings");
  const manifestPath = join(root, "source-manifest.json");

  await mkdir(join(inputRoot, "uk-soc"), { recursive: true });
  await mkdir(join(inputRoot, "esco"), { recursive: true });
  await mkdir(join(inputRoot, "onet"), { recursive: true });
  await mkdir(join(inputRoot, "professional-bodies", "apm"), {
    recursive: true,
  });
  await mkdir(mappingDir, { recursive: true });

  await writeFile(
    join(inputRoot, "uk-soc", "occupations.csv"),
    [
      "soc_code,title,description,alt_titles,group_title,source_version",
      "2433,Senior Project Mgr - Power Transmission,Leads complex power transmission delivery,Senior PM|T&D Delivery Manager,Energy and Utilities,fixture-1",
    ].join("\n"),
  );
  await writeFile(
    join(inputRoot, "esco", "occupations.csv"),
    [
      "concept_uri,preferred_label,description,alt_labels,broader_uri,source_version",
      "esco:occ:1,Senior Project Manager,Manages complex projects,Project Lead,esco:broader:1,fixture-1",
    ].join("\n"),
  );
  await writeFile(
    join(inputRoot, "esco", "skills.csv"),
    [
      "skill_uri,preferred_label,description,alt_labels,broader_uri,source_version",
      "esco:skill:1,Project planning,Plans project delivery,Delivery planning,esco:skill:parent,fixture-1",
    ].join("\n"),
  );
  await writeFile(
    join(inputRoot, "esco", "occupation-skills.csv"),
    [
      "occupation_uri,skill_uri,relationship_type,source_version",
      "esco:occ:1,esco:skill:1,essential,fixture-1",
    ].join("\n"),
  );
  await writeFile(
    join(inputRoot, "onet", "occupations.csv"),
    [
      "onet_code,title,description,job_zone,source_version",
      "11-9021.00,Construction Manager,Plans construction activity,4,fixture-1",
    ].join("\n"),
  );
  await writeFile(
    join(inputRoot, "onet", "alternate-titles.csv"),
    [
      "onet_code,alternate_title,source_version",
      "11-9021.00,Construction Project Manager,fixture-1",
    ].join("\n"),
  );
  await writeFile(
    join(inputRoot, "onet", "skills.csv"),
    [
      "element_id,skill_name,description,element_group,source_version",
      "2.B.1,Primavera P6,Scheduling tool,Tools,fixture-1",
    ].join("\n"),
  );
  await writeFile(
    join(inputRoot, "onet", "occupation-skills.csv"),
    [
      "onet_code,element_id,importance,level,source_version",
      "11-9021.00,2.B.1,4,4.75,fixture-1",
    ].join("\n"),
  );
  await writeFile(
    join(inputRoot, "onet", "related-occupations.csv"),
    [
      "from_onet_code,to_onet_code,difficulty_score,transferability_score,source_version",
      "11-9021.00,11-1021.00,3,0.7,fixture-1",
    ].join("\n"),
  );
  await writeFile(
    join(inputRoot, "onet", "skill-relationships.csv"),
    [
      "source_skill_id,target_skill_id,relationship_type,weight,source_version",
      "2.B,2.B.1,broader_than,0.7,fixture-1",
    ].join("\n"),
  );
  await writeFile(
    join(inputRoot, "professional-bodies", "sources.json"),
    JSON.stringify({
      sources: [{ source_id: "apm", permitted_use: "fixture" }],
    }),
  );
  await writeFile(
    join(inputRoot, "professional-bodies", "apm", "competencies.csv"),
    [
      "source_id,competency_id,competency_label,concise_statement,cpx_level,source_version",
      "apm,apm-1,Stakeholder governance,Manage stakeholder engagement; resolve governance issues,4,fixture-1",
    ].join("\n"),
  );

  for (const file of [
    "uk-soc-to-cpx.csv",
    "esco-occupation-to-cpx.csv",
    "esco-skill-to-cpx.csv",
    "onet-to-cpx.csv",
    "professional-competency-to-cpx.csv",
  ]) {
    await writeFile(
      join(mappingDir, file),
      "source_id,source_record_id,careerpathx_code,mapping_type,confidence,mapping_status,reviewed_by,reviewed_at,notes\n",
    );
  }
  await writeFile(manifestPath, JSON.stringify({ sources: [] }));

  return {
    root,
    inputRoot,
    outputRoot,
    canonicalRoot,
    reportRoot,
    mappingDir,
    manifestPath,
  };
}
