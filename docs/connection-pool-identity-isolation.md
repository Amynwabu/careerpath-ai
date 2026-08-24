# Connection-pool identity isolation

`pool-identity.integration.test.ts` uses real PostgreSQL pools, transaction-local
`set_config('app.user_id', ..., true)`, and a non-owner role.

It verifies:

- role is not superuser, cannot bypass RLS, and owns no protected table;
- client A followed by client B on one pooled connection;
- client B followed by client A on one pooled connection;
- client followed by advisor and advisor followed by client;
- missing identity after commit;
- identity clearing after rollback;
- failed cross-owner authorization;
- concurrent identities on two pooled connections;
- twenty alternating reuse cycles.

Local disposable result: 7/7 passed with no identity leakage.

Run against managed staging with an explicit restricted pooled
`STAGING_DATABASE_URL`. The test configuration maps it to `DATABASE_URL` only
after the staging project, TLS and non-privileged identity checks pass:

```bash
APP_ENV=staging \
STAGING_SUPABASE_PROJECT_REF=sfpbhwzvspuouondwpdy \
STAGING_DATABASE_URL=... \
POOL_IDENTITY_INTEGRATION=1 \
pnpm --filter @workspace/api-server exec vitest run \
  --config vitest.config.ts src/lib/pool-identity.integration.test.ts
```

Stateful hosted integration files are serialized automatically whenever a
hosted integration flag is enabled. A missing explicit staging URL, privileged
role, migration fallback, wrong project, TLS downgrade, inherited privilege,
governed-table ownership or `BYPASSRLS` fails with
`restricted_runtime_required` before fixture mutation. Managed execution
remains a release gate.
