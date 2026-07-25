# Career planning experience

`@workspace/career-planning` provides the deterministic, UI-independent
workflow between a validated Career Profile and an evidence-backed action plan:

```text
Career Profile
→ occupation confirmation
→ structured career goal
→ readiness assessment
→ prioritised gaps
→ versioned action plan
→ evidence and progress
```

Goal drafting and profile review work without taxonomy access. Occupation
resolution, readiness, gap analysis and scenario comparison call the existing
Career Intelligence Engine and therefore fail closed while taxonomy v2026.1 is
an `unpublished_candidate`.

## Goal and occupation rules

Career goals are version `1.0` and support career transitions, promotions,
specialisation, career changes, return to work, registration, skill
development, leadership progression, consulting and entrepreneurship.
Structured inputs include target occupation or family, seniority, horizon,
industries, location, work mode, salary aspiration, training capacity, weekly
hours, budget, caring and travel constraints, qualifications and registration
intent.

Constraints shape sequencing and risks. They never reduce readiness scores or
professional worth. Free-text targets do not become canonical occupations. The
existing resolver must return a published canonical match; otherwise the target
remains `target_unresolved`.

Occupation confirmation preserves the original resolution, all supplied
candidates, selected occupation, selecting actor, timestamp and reason. A user
or advisor selection changes the displayed selection without deleting the
original evidence.

## Assessment and gap rules

The orchestrator uses the existing readiness weighting: skills 60%, experience
25%, and qualifications 15%. No new scoring weights are introduced. Readiness
bands are:

- 85–100 `ready_now`
- 70–84 `near_ready`
- 50–69 `developing`
- 30–49 `early_stage`
- 0–29 `substantial_gap`

Bands describe overlap with published requirements; they are not employability
guarantees.

Gaps are ordered deterministically by published requirement type and weight,
level depth, evidence strength, horizon and weekly capacity. Frequency in CV
text is not a priority factor. Gap state distinguishes missing capability,
missing evidence, unconfirmed capability, outdated evidence, insufficient
depth and insufficient recency. Missing CV evidence is never represented as
definitive absence.

Strengths come only from requirements met by resolved canonical skills. Every
strength and gap contains evidence references and a reason.

## Actions, milestones and risks

Plans are immutable by version. Actions cover immediate, three-month,
six-month, twelve-month and long-term horizons. Each action links to a gap,
states its purpose, expected outcome, evidence requirement, dependencies and
verification state. Unknown duration and cost remain `not_available` and
`null`; commercial providers, prices, accreditation and outcomes are not
invented.

Milestones group measurable action criteria and preserve ordering. Dependency
validation rejects missing references and cycles. Risks can identify limited
time, missing evidence, qualification or experience dependencies, unavailable
taxonomy data, unsupported transitions, unknown costs, unverified providers and
unrealistic horizons.

Professional-registration goals can collect general evidence, but eligibility
and professional-body endorsement are unavailable until governed framework
mappings exist.

## Evidence, progress and reassessment

Evidence is metadata-only and supports self-reported, document-supported,
advisor-reviewed, employer-confirmed, credential-verified, unverified and
rejected states. No file storage is provided. Action completion and verified
progress are calculated separately; checking an action complete does not prove
skill acquisition.

Reassessment creates a new assessment with the prior assessment ID, score
change, gap change, taxonomy version and change summary. It never overwrites the
prior assessment. Plan edits likewise create a minor version with actor,
timestamp and reason.

Up to three target occupations can be compared. Comparisons expose readiness,
skill overlap, critical gaps, action count, confidence and data availability.
They do not rank by salary or assert a transition without approved evidence.

## AI boundary

The planning context builder runs after deterministic planning. An LLM may
explain or rephrase the goal, assessment and plan. It must not alter scores,
canonical codes, transitions, constraints, action status or evidence
verification.

## API and persistence

Authenticated planning endpoints preserve deterministic request and response
models while committing goals, assessments, plans and evidence after successful
generation:

- `POST /api/career-goals`
- `POST /api/career-goals/validate`
- `POST /api/career-goals/resolve`
- `POST /api/career-assessments`
- `POST /api/career-plans`
- `POST /api/career-plans/compare`
- `POST /api/career-plans/reassess`
- `POST /api/career-plans/validate`
- `POST /api/career-plans/export`
- `POST /api/career-plans/actions/update`
- `POST /api/career-plans/evidence`

Goals, assessments, plan versions, actions, milestones and evidence metadata
are owner-scoped PostgreSQL records. Successful creates return
`persistenceStatus: "persistent"`. `GET /api/career-plans` returns a bounded
owned history. Optimistic concurrency, idempotency, RLS and lifecycle controls
are documented in `career-data-persistence-and-lifecycle.md`.

## Browser journey

The protected `/career-plan` route presents six accessible steps: profile
review, current-career confirmation, goal choice, readiness, action planning
and progress. It supports labelled keyboard-operable goal and constraint
fields. While taxonomy v2026.1 is unpublished, the page shows an explicit
unavailable state and no fabricated score, transition, action or completion.

## Privacy and export

Safe processing metadata is limited to request ID, versions, counts, validation
result, duration and error category. Profiles, CV text, names, contact details,
personal constraints and evidence descriptions are not logged.

Exports support JSON, Markdown and printable HTML. Advisor sharing is redacted
by default: contact details, address, sensitive personal constraints,
credential identifiers, raw CV text and unrelated employment evidence are not
part of the export model. PDF export is an extension point only.

## Known limitations

- Taxonomy v2026.1 must be genuinely published before live analysis.
- Persistence requires the career-data migrations and an approved PostgreSQL
  deployment.
- No governed commercial provider, price, duration or salary catalogue.
- No professional-body eligibility or endorsement mappings.
- Evidence verification is represented but not performed by an external
  credential service.
- No PDF export.
- No secure evidence-file storage.
