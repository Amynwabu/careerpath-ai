# Managed database verification

Managed staging is not yet provisioned or verified.

Required evidence must be collected from the isolated staging database without
printing connection strings:

```sql
select count(*) from pg_class where relkind='r';
select count(*) from pg_class where relkind='r' and relname like 'career_data_%';
select count(*) from pg_class where relkind='r' and relname like 'career_data_%'
  and relrowsecurity;
```

Also record migration count, indexes, foreign keys, policies, check/unique
constraints, triggers, PostgreSQL version, TLS mode, pool mode, connection limits,
and the five operational-role attributes. Runtime traffic must use a non-owner,
non-superuser role through the managed pool. Migration and worker credentials must
remain distinct.

Local disposable evidence currently confirms 10 migrations and 46/46
`career_data_*` tables with RLS. It is not managed-environment evidence.
