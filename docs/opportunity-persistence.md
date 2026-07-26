# Opportunity persistence

Vacancies are stored as immutable, owner-bound snapshots. A provider change or
different content hash creates a distinct snapshot; missing salary,
sponsorship, availability, and work-authorisation fields remain missing.

`@workspace/opportunity-intelligence` remains the calculation authority.
PostgreSQL stores its normalized vacancy and match output, engine/taxonomy
versions, hashes, provenance references, record versions, and session state.
Reanalysis creates another immutable workflow resource. Saved opportunities are
mutable aggregates protected by optimistic versions and owner RLS.

Production routes do not fall back to memory. Advisor access requires an active
grant, matching scope, active case, and an explicit case-resource link. Advisors
can comment through the advisor workspace but cannot update snapshots, mappings,
scores, or deterministic explanations.

Known limitation: no live vacancy-provider ingestion or employer application
submission is included.
