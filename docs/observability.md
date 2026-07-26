# Observability

API logs are structured with environment, service, version, request method,
route, status, and request correlation. Authorization headers, cookies,
passwords, tokens, secrets, signed URLs, CV/interview content, evidence, and
notes are redacted or excluded.

Privacy-safe metrics cover latency, errors, database health, job state, uploads,
exports, authorization, RLS, conflicts, idempotency, rate limits, quotas,
revocations, retention, and health failures. User identifiers and free text are
not metric dimensions.

Staging still requires a selected monitoring/tracing provider, private
dashboards, PII scrubbing, release-tagged source maps, ownership routing, and
alert thresholds. No provider integration is claimed yet.
