# CV Optimisation and Application Intelligence

## Architecture

`@workspace/application-intelligence` is a UI-independent deterministic package layered on the
structured Career Profile and canonical vacancy produced by the existing engines. It does not resolve
occupations or skills, alter employability scores, or publish taxonomy data.

The Career Profile is the evidence source of truth. The original parsed CV is an expression and
structure reference. The selected canonical vacancy supplies relevance. The engine classifies vacancy
requirements, maps evidence, performs generic structural ATS analysis, creates recommendations,
assembles supported content, validates every claim, produces a structured redline and calculates
application readiness.

## Evidence alignment

Each vacancy requirement retains its raw wording, deterministic type, source offset, importance and
canonical skill code where one already exists. Alignments use:

1. verified or document-supported credentials;
2. document-supported employment and project evidence;
3. user-confirmed evidence;
4. other self-reported evidence;
5. keyword-only or inferred evidence.

The implementation never describes self-reported evidence as independently verified. A vacancy keyword
is not capability evidence by itself.

Alignment states are `strong_evidence`, `moderate_evidence`, `weak_evidence`,
`unconfirmed_evidence`, `missing_evidence` and `not_applicable`.

## CV alignment scoring

CV alignment is independent from job match, employability and career readiness:

| Dimension | Weight |
| --- | ---: |
| Mandatory requirement coverage | 35% |
| Preferred requirement coverage | 15% |
| Employment evidence | 20% |
| Achievement evidence | 10% |
| Skills presentation | 10% |
| Generic ATS structure | 10% |

Bands are `highly_aligned` (90–100), `well_aligned` (75–89), `partially_aligned` (60–74),
`weakly_aligned` (40–59) and `substantially_misaligned` (0–39). They do not predict hiring decisions.

## Generic ATS analysis

`atsCompatibilityScope` is `generic_structural_analysis`. Checks cover supported file types, embedded
scripts, image-only career content, excessive tables and columns, text boxes, critical header/footer
content, hidden text, small text, uncommon fonts, missing standard section headings, inconsistent dates
and excessive repetition.

These findings do not claim that a named commercial ATS will accept or reject a document.

## Keyword states

- `present_with_evidence`
- `present_without_evidence`
- `missing_but_supported`
- `missing_and_unsupported`
- `overused`

Only `missing_but_supported` terminology can be recommended for automatic supported inclusion.
Unsupported terminology is retained as a gap and never inserted as a claim.

## Claim safety and provenance

Every draft content item carries a claim state, evidence identifiers, transformation type, generator
type and review status. Automatic content is restricted to `directly_supported`,
`supported_rewrite` and `supported_summary`.

`user_confirmation_required` and `advisor_review_required` cannot be inserted automatically.
`unsupported` and `conflicting` are hard blocks. Deterministic validation blocks new metrics,
leadership inflation, conflicting dates and rewrites with inadequate source overlap.

Visible exports exclude internal provenance by default.

## Tailored drafts and redlines

Implemented templates are `professional`, `technical`, `executive`, `graduate`, `academic` and
`career_change`. They currently share the same accessible logical data model; production document
renderers can apply distinct typography later.

The draft builder preserves employer, job title and dates; selects relevant supported responsibilities
and achievements; includes resolved relevant skills; labels expired or unknown-expiry credentials; and
keeps immutable versions. Structured redlines classify added supported, removed irrelevant and rewritten
content with reasons and evidence identifiers.

The deterministic engine does not call a generative model. A future wording provider may receive only
approved source text, one selected requirement, tone, length and claim boundaries. It must never receive
contact details, unrelated employment history, protected characteristics, private advisor notes, tokens
or storage identifiers.

## Application support and readiness

Cover-letter and application-question builders emit minimized evidence contexts, not prose. Personal
decisions such as motivation, salary, availability, sponsorship and work authorization return
`user_input_required` unless supplied.

Readiness combines CV alignment (40%), mandatory evidence coverage (25%), ATS structure (15%), claim
validation (10%) and application completeness (10%). Blockers are separated into eligibility, evidence,
document-quality and user-confirmation categories. Missing CV evidence alone is not treated as proof of
ineligibility.

## Entitlements

The package exports Standard and Premium capability objects. Domain functions do not contain billing
logic. Standard access supports analysis with a limited ATS view. Premium enables full ATS results,
tailored draft generation, multiple versions, context builders and version history. DOCX/PDF capability
flags remain false because those formats are not implemented.

## API, ownership and versioning

Authenticated endpoints cover session creation/listing, analysis, recommendations, drafts, validation,
comparison, approval, minimized application context, readiness and implemented exports. Creation
operations use idempotency keys. Mutable operations require `If-Match` and reject stale versions.
Cross-owner lookups return the same not-found response as absent records.

Storage is currently `process_local`, not production persistence. The next storage phase must add the
normalized RLS-backed entities described in CPX-BUSINESS-005B and connect retention/audit workers.
Advisor review deliberately fails closed until an active persistent scoped grant can be evaluated.

Implemented exports are plain text, Markdown and structured JSON returned only through an authenticated
owner check. DOCX, PDF, signed object URLs and durable export retention are not implemented or claimed.

## Privacy and observability

Session list/detail responses remove the raw Career Profile and raw source CV. API errors use stable
categories and do not echo CV content or stack traces. Metrics should record counts, safe status values
and duration only; this package does not log document content.

## Governance

The selected vacancy must already contain a published taxonomy version and canonical occupation. No
taxonomy publication or professional-body eligibility inference occurs. The package cannot change
canonical occupation or skill codes.

## Known limitations

- commercial ATS-specific validation;
- durable RLS-backed sessions, analyses, drafts, reviews and exports;
- live employer application integrations and provider-specific keyword models;
- real advisor comments and grant evaluation for CV review;
- DOCX and PDF rendering/fidelity;
- signed download URLs and retention-worker integration;
- generative wording-provider configuration;
- multilingual CV analysis beyond `en-GB`;
- legal review of work-authorization wording;
- Premium billing activation;
- application-submission automation.
