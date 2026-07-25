# Advisor workspace and case management

The advisor workspace is a persistent, authorization-scoped workflow. It does not
trust actor identifiers supplied by a browser. Every operation resolves the
authenticated user, their verified advisor profile or client ownership, the
assigned case, the active access grant, and the scope required for the resource.

## Operational records

- Actions distinguish client completion from advisor verification and use
  optimistic record versions.
- Evidence requests retain submission, review, clarification, withdrawal, and
  expiry states. Advisor review is recorded as advisor-reviewed, never as
  independent verification.
- Reviews accept only durable, case-linked resources. CV optimisation and
  interview-coaching process-local state is rejected with
  `durable_source_required`.
- Shared review comments are visible to the client; private advisor comments and
  session notes are advisor-only.
- Outcomes and placements retain their source and verification status. Client
  records are limited to self-reported, unconfirmed claims. Salary is optional
  and is never inferred.
- Follow-up status is calculated from persisted dates using an injected clock.
- Session notes are mutable private working notes. A session summary can only be
  created for a completed session and is immutable; corrections supersede an
  earlier version.

## Authorization and concurrency

Advisor access requires an active, non-expired grant with the relevant scope and
the current case assignment. Suspension, expiry, revocation, reassignment, and
case access revocation fail closed. Client access is limited to their own active
case and the explicitly shared workflow fields. Missing resources use a
not-found response to avoid cross-tenant disclosure.

Mutation requests use `If-Match` record versions and idempotency keys where a
retry could otherwise create duplicate records. Successful changes create
sanitized activity entries. Observability metrics contain only fixed event names
and numeric values, never identifiers, free text, CV data, evidence, or notes.

## Exports

Case exports are built from the persistent repository after authorization.
Supported sections contain shared operational records only. Exports omit private
notes and comments, authentication material, audit metadata, and process-local
cross-domain state.

## Operational boundary

This implementation adds application code, migrations, tests, and documentation.
It does not connect to or mutate the production CareerPathX database. Migrations
and RLS fixtures must be exercised against a disposable database before release.
