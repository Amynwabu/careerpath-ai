# Application intelligence persistence

CV optimisation sessions persist the governed Career Profile/CV references,
vacancy snapshot, deterministic ATS output, recommendations, draft versions,
claim validations, readiness results, and export metadata. Structured engine
objects are retained with source, engine, and taxonomy versions; the repository
does not calculate ATS or readiness scores.

Draft edits create a new immutable resource linked to the prior draft. Claim
validations are immutable. Unsupported, conflicting, and confirmation-required
claims keep the application-intelligence safety decision and cannot be
overridden by an advisor. Recommendation user decisions update only the mutable
session aggregate under optimistic concurrency.

Owner RLS applies to sessions, immutable resources, exports, and hashed
idempotency records. Exports expire after fifteen minutes and never include
private advisor notes. Advisor review is a separate case record and requires an
explicitly shared persistent resource.

Known limitations: no ATS-vendor certification, application submission, or
high-fidelity DOCX/PDF layout renderer is included.
