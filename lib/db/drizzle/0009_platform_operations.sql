CREATE TABLE career_data_quota_usage (
  owner_user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quota_dimension text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  entitlement_snapshot jsonb NOT NULL,
  consumed integer NOT NULL DEFAULT 0 CHECK (consumed >= 0),
  corrected_by integer REFERENCES users(id),
  correction_reason text,
  record_version integer NOT NULL DEFAULT 1 CHECK (record_version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_user_id, quota_dimension, period_start),
  CHECK (period_end > period_start),
  CHECK ((corrected_by IS NULL) = (correction_reason IS NULL))
);

CREATE TABLE career_data_quota_consumptions (
  consumption_id text PRIMARY KEY,
  owner_user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quota_dimension text NOT NULL,
  period_start timestamptz NOT NULL,
  idempotency_key_hash text NOT NULL,
  units integer NOT NULL CHECK (units > 0),
  status text NOT NULL CHECK (status IN ('consumed','refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  refunded_at timestamptz,
  UNIQUE(owner_user_id,quota_dimension,period_start,idempotency_key_hash)
);

CREATE TABLE career_data_jobs (
  job_id text PRIMARY KEY,
  job_type text NOT NULL,
  owner_user_id integer REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('queued','running','retry_scheduled','completed','failed','dead_letter','cancelled')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key_hash text NOT NULL,
  trace_id text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  timeout_seconds integer NOT NULL DEFAULT 300 CHECK (timeout_seconds BETWEEN 1 AND 3600),
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(job_type,idempotency_key_hash)
);

CREATE TABLE career_data_job_checkpoints (
  job_id text NOT NULL REFERENCES career_data_jobs(job_id) ON DELETE CASCADE,
  checkpoint_key text NOT NULL,
  checkpoint_value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(job_id,checkpoint_key)
);

CREATE INDEX quota_usage_dimension_period_idx ON career_data_quota_usage(quota_dimension,period_end);
CREATE INDEX quota_consumptions_owner_period_idx ON career_data_quota_consumptions(owner_user_id,quota_dimension,period_start);
CREATE INDEX jobs_dispatch_idx ON career_data_jobs(status,available_at,created_at) WHERE status IN ('queued','retry_scheduled');
CREATE INDEX jobs_owner_status_idx ON career_data_jobs(owner_user_id,status,created_at DESC);
CREATE INDEX jobs_dead_letter_idx ON career_data_jobs(updated_at DESC) WHERE status='dead_letter';

ALTER TABLE career_data_quota_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_quota_usage FORCE ROW LEVEL SECURITY;
ALTER TABLE career_data_quota_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_quota_consumptions FORCE ROW LEVEL SECURITY;
ALTER TABLE career_data_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE career_data_job_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_job_checkpoints FORCE ROW LEVEL SECURITY;

CREATE POLICY quota_usage_owner_all ON career_data_quota_usage
  USING (owner_user_id=career_data_actor_user_id())
  WITH CHECK (owner_user_id=career_data_actor_user_id());
CREATE POLICY quota_consumptions_owner_all ON career_data_quota_consumptions
  USING (owner_user_id=career_data_actor_user_id())
  WITH CHECK (owner_user_id=career_data_actor_user_id());
CREATE POLICY jobs_owner_all ON career_data_jobs
  USING (owner_user_id=career_data_actor_user_id())
  WITH CHECK (owner_user_id=career_data_actor_user_id());
CREATE POLICY job_checkpoints_owner_all ON career_data_job_checkpoints
  USING (EXISTS (SELECT 1 FROM career_data_jobs j WHERE j.job_id=career_data_job_checkpoints.job_id
    AND j.owner_user_id=career_data_actor_user_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM career_data_jobs j WHERE j.job_id=career_data_job_checkpoints.job_id
    AND j.owner_user_id=career_data_actor_user_id()));

CREATE VIEW career_data_reporting_job_health
WITH (security_barrier=true) AS
SELECT job_type,status,count(*) AS job_count,
       min(created_at) AS oldest_created_at,max(updated_at) AS newest_updated_at
FROM career_data_jobs GROUP BY job_type,status;
