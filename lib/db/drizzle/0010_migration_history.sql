CREATE TABLE IF NOT EXISTS platform_schema_migrations (
  migration_name text PRIMARY KEY,
  checksum_sha256 text NOT NULL CHECK (checksum_sha256 ~ '^[a-f0-9]{64}$'),
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by text NOT NULL DEFAULT current_user
);

REVOKE ALL ON platform_schema_migrations FROM PUBLIC;
