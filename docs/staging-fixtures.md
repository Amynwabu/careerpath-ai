# Staging verification fixtures

Run:

```bash
APP_ENV=staging \
STAGING_FIXTURE_CONFIRMATION=SYNTHETIC_ONLY \
STAGING_DATABASE_HOST_ALLOWLIST=<exact-staging-host> \
pnpm --filter @workspace/scripts run staging:seed-verification
```

Enable login only for the two client fixtures by supplying their plaintext
passwords through encrypted staging environment variables and running:

```bash
APP_ENV=staging \
STAGING_FIXTURE_CONFIRMATION=SYNTHETIC_ONLY \
STAGING_DATABASE_HOST_ALLOWLIST=<exact-staging-host> \
STAGING_CLIENT_PASSWORD=<encrypted-environment-value> \
STAGING_SECOND_CLIENT_PASSWORD=<encrypted-environment-value> \
pnpm --filter @workspace/scripts run staging:update-login-fixtures
```

The updater hashes each value with bcrypt, refuses identity or `.invalid` email
mismatches, and emits only actor IDs with `updated` or `unchanged` status.

The command refuses non-staging/test environments, non-confirmed runs, hosts outside
the explicit allowlist, and a host matching `PRODUCTION_DATABASE_HOST`.

It idempotently creates seven non-real identities, three advisor profiles, five
governed grants, three cases, two profiles/evidence resources, and explicit sharing
links. All names and emails are marked synthetic and use `.invalid`.

Verification must use a fresh database in this order:

```text
migrate -> seed once -> advisor suite -> workflow suite -> RLS suite
```

Disposable verification databases should be removed by the provider after evidence
is captured. The seed command never deletes arbitrary records.
