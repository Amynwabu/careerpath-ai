# Database deployment

Reviewed Drizzle SQL files are the sole schema authority. Hosted releases use
`scripts/apply-reviewed-migrations.sh`, never `drizzle-kit push`. The script
requires a dedicated TLS migration URL, a backup reference, a PostgreSQL
advisory lock, statement timeouts, ordered SQL application, and post-migration
RLS inspection.

Provider roles are bootstrapped from `scripts/database/bootstrap-roles.sql`:
migrator, application, readonly, retention worker, and privacy-safe reporting.
The application role is non-owning and must not have `BYPASSRLS`.

Release sequence: review SQL, fresh test, upgrade test, RLS fixtures, backup,
staging migration, staging verification, approval, production migration, and
post-deploy verification. Recovery is roll-forward; destructive reverse
migrations are not assumed safe.
