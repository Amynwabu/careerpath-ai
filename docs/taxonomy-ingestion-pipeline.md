# Taxonomy Ingestion Pipeline

The CareerPathX taxonomy pipeline turns authorised local source files into
staged, normalised, reconciled, human-editable canonical CSV candidates. It does
not write UK SOC, ESCO, O\*NET, or professional-body records directly to
production taxonomy tables.

```text
Authorised local source files
  -> source-specific adapters
  -> immutable JSONL staging records
  -> deterministic normalisation
  -> candidate matching and reconciliation logs
  -> human-review reports
  -> canonical CSV candidates
  -> validation
  -> controlled database import in a later reviewed step
```

## Local Source Directory

Raw source files belong under `.local-data/taxonomy-sources`, which is ignored
by Git:

```text
.local-data/taxonomy-sources/
  uk-soc/occupations.csv
  esco/occupations.csv
  esco/skills.csv
  esco/occupation-skills.csv
  onet/occupations.csv
  onet/alternate-titles.csv
  onet/skills.csv
  onet/occupation-skills.csv
  onet/related-occupations.csv
  professional-bodies/sources.json
  professional-bodies/apm/competencies.csv
  professional-bodies/iet/competencies.csv
  professional-bodies/ice/competencies.csv
  professional-bodies/pmi/competencies.csv
```

Before using real source files, record licensing, retrieval, checksums, and
attribution in
`datasets/career-taxonomy/sources/source-manifest.json`.

## Commands

```sh
pnpm taxonomy:source:inspect --source=uk-soc
pnpm taxonomy:source:inspect --source=esco
pnpm taxonomy:source:inspect --source=onet
pnpm taxonomy:source:inspect --source=professional-bodies
pnpm taxonomy:source:validate --source=all
pnpm taxonomy:ingest --source=uk-soc --dry-run
pnpm taxonomy:ingest --source=all
pnpm taxonomy:reconcile --version=2026.1
pnpm taxonomy:review-report --version=2026.1
pnpm taxonomy:generate-canonical --version=2026.1
pnpm taxonomy:validate --version=2026.1
pnpm taxonomy:import --version=2026.1 --dry-run
```

Generated staging and reports are ignored by Git by default:

```text
datasets/career-taxonomy/generated/
reports/taxonomy/
```

## Reconciliation Rules

Occupation candidate scoring uses:

- Existing curated external mapping: 35%
- Normalised title similarity: 20%
- Description or task similarity: 15%
- Skill-profile similarity: 15%
- Career-family and sector alignment: 7%
- Seniority alignment: 5%
- Country and language context: 3%

Skill candidate scoring uses:

- Existing curated mapping: 35%
- Preferred-label similarity: 20%
- Alias similarity: 15%
- Description similarity: 10%
- Parent-skill alignment: 10%
- Occupation co-occurrence: 5%
- Category compatibility: 5%

Confidence thresholds:

- 0.90-1.00: high-confidence reconciliation
- 0.75-0.89: review required unless a curated mapping exists
- 0.50-0.74: possible match, review required
- Below 0.50: create separate candidate or reject

All decisions are logged with matching factors, rules version, adapter version,
source record ID, confidence, conflicts, and review reason.

## O\*NET Conversion

O\*NET values are transformed into the CareerPathX model rather than copied
directly:

- `importance_weight = importance / 100`, clamped to `0.05..1`
- O\*NET level `85..100 -> CPX level 5`
- O\*NET level `65..84 -> CPX level 4`
- O\*NET level `45..64 -> CPX level 3`
- O\*NET level `25..44 -> CPX level 2`
- O\*NET level below `25 -> CPX level 1`
- Importance `>= 70 -> essential`
- Importance `50..69 -> desirable`
- Importance below `50 -> emerging`

## Professional Bodies

Professional-body frameworks are controlled local imports only. The pipeline
does not scrape PMI, APM, IET, ICE, or any other professional-body website. Each
framework must have source terms and permitted use recorded before ingestion.
Generated competency mappings are `source_mapped` candidates and must not be
presented as expert-reviewed or endorsed without human review.
