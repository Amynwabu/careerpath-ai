CREATE TABLE career_data_opportunity_snapshots (
  opportunity_snapshot_id text PRIMARY KEY,
  owner_user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_reference text NOT NULL,
  source_url text,
  source_retrieved_at timestamptz,
  content_hash text NOT NULL,
  normalization_version text NOT NULL,
  payload jsonb NOT NULL,
  retention_class text NOT NULL DEFAULT 'career_workflow',
  created_by integer NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(owner_user_id, provider, provider_reference, content_hash)
);
CREATE TABLE career_data_saved_opportunities (
  saved_opportunity_id text PRIMARY KEY,
  owner_user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opportunity_snapshot_id text NOT NULL REFERENCES career_data_opportunity_snapshots(opportunity_snapshot_id),
  status text NOT NULL DEFAULT 'saved',
  record_version integer NOT NULL DEFAULT 1 CHECK (record_version > 0),
  retention_class text NOT NULL DEFAULT 'career_workflow',
  created_by integer NOT NULL REFERENCES users(id),
  updated_by integer NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE career_data_opportunity_sessions (
  opportunity_session_id text PRIMARY KEY,
  owner_user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_status text NOT NULL,
  payload jsonb NOT NULL,
  source_version text NOT NULL,
  engine_version text NOT NULL,
  taxonomy_version text NOT NULL,
  record_version integer NOT NULL DEFAULT 1 CHECK (record_version > 0),
  retention_class text NOT NULL DEFAULT 'career_workflow',
  created_by integer NOT NULL REFERENCES users(id),
  updated_by integer NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE career_data_cv_optimisation_sessions (
  cv_optimisation_session_id text PRIMARY KEY,
  owner_user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_status text NOT NULL,
  payload jsonb NOT NULL,
  source_version text NOT NULL,
  engine_version text NOT NULL,
  taxonomy_version text NOT NULL,
  record_version integer NOT NULL DEFAULT 1 CHECK (record_version > 0),
  retention_class text NOT NULL DEFAULT 'career_workflow',
  created_by integer NOT NULL REFERENCES users(id),
  updated_by integer NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE career_data_interview_sessions (
  interview_session_id text PRIMARY KEY,
  owner_user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_status text NOT NULL,
  payload jsonb NOT NULL,
  source_version text NOT NULL,
  engine_version text NOT NULL,
  taxonomy_version text NOT NULL,
  record_version integer NOT NULL DEFAULT 1 CHECK (record_version > 0),
  retention_class text NOT NULL DEFAULT 'career_workflow',
  created_by integer NOT NULL REFERENCES users(id),
  updated_by integer NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE career_data_workflow_resources (
  workflow_resource_id text PRIMARY KEY,
  owner_user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain text NOT NULL CHECK (domain IN ('opportunity','application','interview')),
  resource_type text NOT NULL,
  parent_session_id text NOT NULL,
  source_record_id text,
  source_version text NOT NULL,
  engine_version text NOT NULL,
  taxonomy_version text NOT NULL,
  record_version integer NOT NULL DEFAULT 1 CHECK (record_version > 0),
  content_hash text NOT NULL,
  payload jsonb NOT NULL,
  approval_state text NOT NULL DEFAULT 'not_reviewed',
  supersedes_resource_id text REFERENCES career_data_workflow_resources(workflow_resource_id),
  retention_class text NOT NULL DEFAULT 'career_workflow',
  created_by integer NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(owner_user_id, domain, resource_type, workflow_resource_id)
);
CREATE TABLE career_data_workflow_exports (
  workflow_export_id text PRIMARY KEY,
  owner_user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain text NOT NULL CHECK (domain IN ('opportunity','application','interview')),
  parent_session_id text NOT NULL,
  source_resource_id text REFERENCES career_data_workflow_resources(workflow_resource_id),
  export_format text NOT NULL,
  payload jsonb NOT NULL,
  content_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  retention_class text NOT NULL DEFAULT 'short_lived_export',
  created_by integer NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE career_data_workflow_idempotency (
  owner_user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain text NOT NULL,
  operation text NOT NULL,
  key_hash text NOT NULL,
  resource_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY(owner_user_id, domain, operation, key_hash)
);

CREATE INDEX opportunity_snapshots_owner_created_idx ON career_data_opportunity_snapshots(owner_user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX saved_opportunities_owner_status_idx ON career_data_saved_opportunities(owner_user_id, status, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX opportunity_sessions_owner_status_idx ON career_data_opportunity_sessions(owner_user_id, session_status, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX cv_sessions_owner_status_idx ON career_data_cv_optimisation_sessions(owner_user_id, session_status, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX interview_sessions_owner_status_idx ON career_data_interview_sessions(owner_user_id, session_status, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX workflow_resources_owner_type_idx ON career_data_workflow_resources(owner_user_id, resource_type, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX workflow_resources_parent_idx ON career_data_workflow_resources(parent_session_id, resource_type, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX workflow_exports_owner_domain_idx ON career_data_workflow_exports(owner_user_id, domain, created_at DESC) WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION career_data_reject_immutable_workflow_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'immutable_workflow_record' USING ERRCODE = '55000';
END $$;
CREATE TRIGGER opportunity_snapshot_immutable BEFORE UPDATE ON career_data_opportunity_snapshots FOR EACH ROW EXECUTE FUNCTION career_data_reject_immutable_workflow_update();
CREATE TRIGGER workflow_resource_immutable BEFORE UPDATE ON career_data_workflow_resources FOR EACH ROW EXECUTE FUNCTION career_data_reject_immutable_workflow_update();

ALTER TABLE career_data_opportunity_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_saved_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_opportunity_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_cv_optimisation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_workflow_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_workflow_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_workflow_idempotency ENABLE ROW LEVEL SECURITY;

CREATE POLICY opportunity_snapshots_owner ON career_data_opportunity_snapshots USING (owner_user_id = career_data_actor_user_id()) WITH CHECK (owner_user_id = career_data_actor_user_id());
CREATE POLICY saved_opportunities_owner ON career_data_saved_opportunities USING (owner_user_id = career_data_actor_user_id()) WITH CHECK (owner_user_id = career_data_actor_user_id());
CREATE POLICY opportunity_sessions_owner ON career_data_opportunity_sessions USING (owner_user_id = career_data_actor_user_id()) WITH CHECK (owner_user_id = career_data_actor_user_id());
CREATE POLICY cv_sessions_owner ON career_data_cv_optimisation_sessions USING (owner_user_id = career_data_actor_user_id()) WITH CHECK (owner_user_id = career_data_actor_user_id());
CREATE POLICY interview_sessions_owner ON career_data_interview_sessions USING (owner_user_id = career_data_actor_user_id()) WITH CHECK (owner_user_id = career_data_actor_user_id());
CREATE POLICY workflow_resources_owner ON career_data_workflow_resources USING (owner_user_id = career_data_actor_user_id()) WITH CHECK (owner_user_id = career_data_actor_user_id());
CREATE POLICY workflow_exports_owner ON career_data_workflow_exports USING (owner_user_id = career_data_actor_user_id()) WITH CHECK (owner_user_id = career_data_actor_user_id());
CREATE POLICY workflow_idempotency_owner ON career_data_workflow_idempotency USING (owner_user_id = career_data_actor_user_id()) WITH CHECK (owner_user_id = career_data_actor_user_id());

CREATE OR REPLACE FUNCTION career_data_advisor_can_read_workflow_resource(
  checked_owner integer, checked_type text, checked_id text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM career_data_advisor_case_resources link
    JOIN career_data_advisor_cases c ON c.case_id = link.case_id
    JOIN career_data_advisor_profiles p ON p.advisor_profile_id = c.advisor_profile_id
    JOIN career_data_advisor_grants g ON g.id = c.advisor_grant_id
    WHERE link.resource_id = checked_id
      AND link.resource_type = checked_type
      AND c.owner_user_id = checked_owner
      AND p.advisor_user_id = career_data_actor_user_id()
      AND p.verification_status = 'verified' AND p.account_status = 'active'
      AND c.case_status NOT IN ('closed','cancelled','access_revoked')
      AND g.status = 'active' AND g.revoked_at IS NULL
      AND (g.expires_at IS NULL OR g.expires_at > now())
      AND g.scopes ? link.required_scope
  )
$$;
REVOKE ALL ON FUNCTION career_data_advisor_can_read_workflow_resource(integer,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION career_data_advisor_can_read_workflow_resource(integer,text,text) TO PUBLIC;

CREATE POLICY workflow_resources_advisor_read ON career_data_workflow_resources FOR SELECT USING (
  career_data_advisor_can_read_workflow_resource(owner_user_id,resource_type,workflow_resource_id)
);
