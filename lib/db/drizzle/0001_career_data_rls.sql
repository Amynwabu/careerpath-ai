-- Career-data RLS is defense in depth. The API must SET LOCAL app.user_id and
-- app.user_role inside each transaction before accessing these tables.
ALTER TABLE career_data_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_personal_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_profile_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_assessment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_plan_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_advisor_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_idempotency ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION career_data_actor_user_id()
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::integer
$$;

CREATE POLICY career_data_profiles_owner_all ON career_data_profiles
  USING (owner_user_id = career_data_actor_user_id())
  WITH CHECK (owner_user_id = career_data_actor_user_id());
CREATE POLICY career_data_personal_owner_all ON career_data_personal_data
  USING (owner_user_id = career_data_actor_user_id())
  WITH CHECK (owner_user_id = career_data_actor_user_id());
CREATE POLICY career_data_documents_owner_all ON career_data_documents
  USING (owner_user_id = career_data_actor_user_id())
  WITH CHECK (owner_user_id = career_data_actor_user_id());
CREATE POLICY career_data_profile_entities_owner_all ON career_data_profile_entities
  USING (owner_user_id = career_data_actor_user_id())
  WITH CHECK (owner_user_id = career_data_actor_user_id());
CREATE POLICY career_data_corrections_owner_all ON career_data_corrections
  USING (owner_user_id = career_data_actor_user_id())
  WITH CHECK (owner_user_id = career_data_actor_user_id());
CREATE POLICY career_data_goals_owner_all ON career_data_goals
  USING (owner_user_id = career_data_actor_user_id())
  WITH CHECK (owner_user_id = career_data_actor_user_id());
CREATE POLICY career_data_assessments_owner_all ON career_data_assessments
  USING (owner_user_id = career_data_actor_user_id())
  WITH CHECK (owner_user_id = career_data_actor_user_id());
CREATE POLICY career_data_assessment_items_owner_all ON career_data_assessment_items
  USING (owner_user_id = career_data_actor_user_id())
  WITH CHECK (owner_user_id = career_data_actor_user_id());
CREATE POLICY career_data_plans_owner_all ON career_data_plans
  USING (owner_user_id = career_data_actor_user_id())
  WITH CHECK (owner_user_id = career_data_actor_user_id());
CREATE POLICY career_data_plan_items_owner_all ON career_data_plan_items
  USING (owner_user_id = career_data_actor_user_id())
  WITH CHECK (owner_user_id = career_data_actor_user_id());
CREATE POLICY career_data_plan_dependencies_owner_all ON career_data_plan_dependencies
  USING (owner_user_id = career_data_actor_user_id())
  WITH CHECK (owner_user_id = career_data_actor_user_id());
CREATE POLICY career_data_evidence_owner_all ON career_data_evidence
  USING (owner_user_id = career_data_actor_user_id())
  WITH CHECK (owner_user_id = career_data_actor_user_id());
CREATE POLICY career_data_grants_owner_all ON career_data_advisor_grants
  USING (owner_user_id = career_data_actor_user_id())
  WITH CHECK (owner_user_id = career_data_actor_user_id());
CREATE POLICY career_data_grants_advisor_read ON career_data_advisor_grants
  FOR SELECT USING (
    advisor_user_id = career_data_actor_user_id()
    AND status = 'active'
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  );
CREATE POLICY career_data_exports_owner_all ON career_data_exports
  USING (owner_user_id = career_data_actor_user_id())
  WITH CHECK (owner_user_id = career_data_actor_user_id());
CREATE POLICY career_data_deletion_owner_all ON career_data_deletion_requests
  USING (owner_user_id = career_data_actor_user_id())
  WITH CHECK (owner_user_id = career_data_actor_user_id());
CREATE POLICY career_data_audit_owner_read ON career_data_audit_events
  FOR SELECT USING (owner_user_id = career_data_actor_user_id());
CREATE POLICY career_data_audit_actor_insert ON career_data_audit_events
  FOR INSERT WITH CHECK (actor_user_id = career_data_actor_user_id());
CREATE POLICY career_data_idempotency_owner_all ON career_data_idempotency
  USING (owner_user_id = career_data_actor_user_id())
  WITH CHECK (owner_user_id = career_data_actor_user_id());

CREATE POLICY career_data_profiles_advisor_read ON career_data_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM career_data_advisor_grants grant_record
      WHERE grant_record.owner_user_id = career_data_profiles.owner_user_id
        AND grant_record.advisor_user_id = career_data_actor_user_id()
        AND grant_record.status = 'active'
        AND grant_record.revoked_at IS NULL
        AND (grant_record.expires_at IS NULL OR grant_record.expires_at > now())
        AND (
          grant_record.scopes ? 'profile_read'
          OR grant_record.scopes ? 'redacted_profile_read'
        )
    )
  );
CREATE POLICY career_data_assessments_advisor_read ON career_data_assessments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM career_data_advisor_grants grant_record
      WHERE grant_record.owner_user_id = career_data_assessments.owner_user_id
        AND grant_record.advisor_user_id = career_data_actor_user_id()
        AND grant_record.status = 'active'
        AND grant_record.revoked_at IS NULL
        AND (grant_record.expires_at IS NULL OR grant_record.expires_at > now())
        AND grant_record.scopes ? 'assessment_read'
    )
  );
CREATE POLICY career_data_plans_advisor_read ON career_data_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM career_data_advisor_grants grant_record
      WHERE grant_record.owner_user_id = career_data_plans.owner_user_id
        AND grant_record.advisor_user_id = career_data_actor_user_id()
        AND grant_record.status = 'active'
        AND grant_record.revoked_at IS NULL
        AND (grant_record.expires_at IS NULL OR grant_record.expires_at > now())
        AND grant_record.scopes ? 'plan_read'
    )
  );
