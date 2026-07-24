# Career Taxonomy Schema

The career taxonomy layer stores CareerPathX-controlled reference data for
career families, canonical occupations, canonical skills, aliases, skill
requirements, transitions, and provenance. It is the source-of-truth structure
for later occupation resolution and pathway traversal, not a replacement for
member-entered profile data.

## Canonical And Member Data

Member-facing tables remain independent. The existing `skills` table stores
skills declared by a user. The new `taxonomy_skills` table stores canonical
CareerPathX skill definitions with stable codes such as
`CPX-SKL-TECH-000001`.

The same separation applies to job titles. A member may enter an original title
such as `T&D Delivery Manager`; the taxonomy can resolve it to a canonical
occupation such as `Senior Project Manager - Power Infrastructure`. Both values
must remain representable so the product can explain mappings and preserve
historical user input.

## Table Summary

```text
career_taxonomy_versions
  -> career_families
      -> occupations
          -> occupation_aliases
          -> occupation_skill_requirements -> taxonomy_skills
          -> career_transitions -> occupations
  -> taxonomy_skills
      -> skill_aliases
      -> skill_relationships -> taxonomy_skills
  -> taxonomy_source_references
```

`taxonomy_source_references` is polymorphic. It stores `entity_type` and
`entity_id` instead of ordinary foreign keys because a source may describe a
career family, occupation, skill, alias, relationship, requirement, transition,
or a future taxonomy entity. Application code should validate the entity type
before attaching sources.

## Proficiency Scale

The occupation requirement scale is shared across taxonomy skills:

1. Awareness
2. Foundation
3. Working
4. Advanced
5. Expert/Strategic

`occupation_skill_requirements.required_level` is the expected level for the
occupation. `minimum_level` can set a lower acceptable threshold and cannot
exceed `required_level`.

## Lifecycle Rules

Taxonomy versions use this lifecycle:

`draft -> review -> published -> retired`

Record verification uses this lifecycle:

`draft -> ai_generated -> source_mapped -> expert_reviewed -> employer_validated -> published`

Records that should no longer be used move to `deprecated` or set `is_active`
to false. Taxonomy records should normally be deprecated rather than deleted so
historical analyses, aliases, requirements, and transitions remain
interpretable.

## Integrity And Search Readiness

Core taxonomy entities use UUID primary keys plus stable human-readable codes
where appropriate. The schema enforces non-empty canonical fields, valid score
ranges, valid experience and duration ordering, non-self transitions, and
non-self skill relationships.

Nullable contextual uniqueness is handled with expression indexes using
`coalesce(country_code, '')` and `coalesce(industry_context, '')`. This prevents
duplicate mappings within the same context while allowing aliases and
requirements to vary by geography or industry.

Indexes are included for canonical occupation titles, codes, slugs, aliases,
career family filters, career levels, geography, canonical skill names, skill
codes, skill slugs, and normalised skill aliases. Full-text search, trigram
indexes, generated search documents, embeddings, and vector columns are
intentionally deferred.

## Applying The Migration Locally

The reviewed migration is:

```text
supabase/migrations/20260724083857_add_career_taxonomy_foundation.sql
```

It is included in the existing release migration lists used by
`scripts/apply-release-migrations.mjs` and
`netlify/functions/release-migrations.mjs`.

To apply release migrations to a safe development database:

```sh
DATABASE_URL=postgres://... node scripts/apply-release-migrations.mjs
```

Do not run `drizzle push` against production as a substitute for reviewed
migrations.

## Verification

After applying the migration to a development database, run:

```sh
DATABASE_URL=postgres://... pnpm --filter @workspace/scripts run verify:career-taxonomy
```

The verifier inserts one draft taxonomy version, one career family, two
occupations, two taxonomy skills, aliases, a requirement, a skill relationship,
a career transition, and a source reference. It reads the records back through
Drizzle and then cleans them up in reverse dependency order.
