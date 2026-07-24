# Career Intelligence Engine

The Career Intelligence Engine is a deterministic, UI-independent workspace
package at `lib/career-intelligence`. It consumes an injected **published
taxonomy snapshot** and never reads candidate or raw source datasets.

## Decision boundary

The engine decides occupation matches, canonical skill matches, readiness
scores, gaps, supported transitions, and skill-linked recommendations. LLMs may
explain the structured context produced by `buildAiContext`; they must not alter
engine decisions.

Occupation resolution precedence:

1. Existing published occupation code
2. Exact canonical title
3. Exact curated alias
4. Contextual alias using published family and skill evidence
5. Deterministic token-overlap fallback

An ambiguous or weak match returns `unresolved`. A fallback never overrides an
exact canonical or curated-alias match.

## Readiness scoring

The foundation score is:

```text
overall = skill coverage × 0.60
        + experience coverage × 0.25
        + qualification coverage × 0.15
```

Skill coverage uses published requirement types:

- essential: weight multiplier 2.0
- important: 1.5
- supporting: 1.0
- optional: 0.5

Each multiplier is combined with the published relationship importance.
Experience is capped at 100% against the target occupation's published minimum
or its documented career-level default. When no qualification requirement is
published, qualification coverage is neutral at 100 rather than inventing a
requirement.

## APIs

All endpoints are under `/api`:

- `POST /career/resolve`
- `POST /career/skills`
- `POST /career/readiness`
- `POST /career/gap-analysis`
- `POST /career/transitions`
- `POST /career/recommendations`
- `POST /career/context`

Every successful response includes taxonomy `version`, confidence,
explanations, and evidence. Until a taxonomy version is genuinely published,
the endpoints return HTTP 503 with `taxonomyStatus: unpublished_candidate`.

## Safety and caching

- Only `published` or `published_local` snapshots are accepted.
- Approved transitions are the sole transition source.
- Recommendations must directly reference missing canonical skill codes.
- Immutable snapshots are cached by version.
- Raw taxonomy tables, licensed archives, and unpublished records are excluded
  from AI context.
