# Rate limits and quotas

Rate limits use PostgreSQL atomic upserts keyed by owner, hashed IP namespace,
endpoint class, and time window. Hosted environments use a distinct
`RATE_LIMIT_NAMESPACE`.

Quota usage and idempotent consumption are durable for opportunity analyses, CV
sessions/drafts/exports, interview sessions/practice, and advisor requests.
Each row stores the entitlement snapshot and period. Atomic conditional updates
prevent negative or over-limit usage and retries reuse hashed idempotency keys.

Administrative corrections require a reason and actor and must emit an audit
event. Billing is deliberately not integrated.
