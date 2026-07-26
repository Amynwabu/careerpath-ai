# Connection-pool identity isolation

`pool-identity.integration.test.ts` uses real PostgreSQL pools, transaction-local
`set_config('app.user_id', ..., true)`, and a non-owner role.

It verifies:

- role is not superuser, cannot bypass RLS, and owns no protected table;
- client A followed by client B on one pooled connection;
- missing identity after commit;
- identity clearing after rollback;
- failed cross-owner authorization;
- concurrent identities on two pooled connections;
- twenty alternating reuse cycles.

Local disposable result: 7/7 passed with no identity leakage.

Run against managed staging with the restricted pooled `DATABASE_URL`:

```bash
POOL_IDENTITY_INTEGRATION=1 \
pnpm --filter @workspace/api-server exec vitest run \
  --config vitest.config.ts src/lib/pool-identity.integration.test.ts
```

Managed execution remains a release gate.
