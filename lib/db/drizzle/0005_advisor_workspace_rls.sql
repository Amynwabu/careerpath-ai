-- Advisor workspace RLS evaluates current advisor verification and grant state
-- at query time. API transactions must SET LOCAL app.user_id.
ALTER TABLE career_data_advisor_profiles
  ADD CONSTRAINT advisor_profile_verification_status_check CHECK (verification_status IN ('unverified','pending_review','verified','rejected','suspended','expired')),
  ADD CONSTRAINT advisor_profile_account_status_check CHECK (account_status IN ('active','inactive','suspended','closed')),
  ADD CONSTRAINT advisor_profile_record_version_check CHECK (record_version > 0);
ALTER TABLE career_data_advisor_cases
  ADD CONSTRAINT advisor_case_status_check CHECK (case_status IN ('requested','pending_acceptance','active','on_hold','awaiting_client','awaiting_advisor','completed','closed','cancelled','access_revoked')),
  ADD CONSTRAINT advisor_case_stage_check CHECK (case_stage IN ('intake','profile_review','goal_definition','assessment_review','plan_review','opportunity_review','cv_review','interview_review','application_support','follow_up','outcome_tracking')),
  ADD CONSTRAINT advisor_case_record_version_check CHECK (record_version > 0);
ALTER TABLE career_data_advisor_session_notes
  ADD CONSTRAINT advisor_note_type_check CHECK (note_type IN ('advisor_private','client_visible','administrative')),
  ADD CONSTRAINT advisor_note_visibility_check CHECK (visibility_scope IN ('client_and_advisor','advisor_private','admin_only')),
  ADD CONSTRAINT advisor_note_consistent_visibility_check CHECK (note_type <> 'advisor_private' OR visibility_scope = 'advisor_private');
ALTER TABLE career_data_advisor_actions
  ADD CONSTRAINT advisor_action_status_check CHECK (status IN ('not_started','in_progress','blocked','completed','verified','deferred','cancelled'));
ALTER TABLE career_data_advisor_evidence_requests
  ADD CONSTRAINT advisor_evidence_status_check CHECK (status IN ('requested','submitted','under_review','accepted','rejected','withdrawn','expired')),
  ADD CONSTRAINT advisor_evidence_review_decision_check CHECK (review_decision IS NULL OR review_decision IN ('accepted_as_supporting_evidence','accepted_with_limitations','needs_clarification','insufficient','conflicting','out_of_scope'));
ALTER TABLE career_data_advisor_comments
  ADD CONSTRAINT advisor_comment_visibility_check CHECK (visibility_scope IN ('client_and_advisor','advisor_private','admin_only')),
  ADD CONSTRAINT advisor_comment_parent_fk FOREIGN KEY (parent_comment_id) REFERENCES career_data_advisor_comments(comment_id) ON DELETE RESTRICT;
ALTER TABLE career_data_advisor_session_summaries
  ADD CONSTRAINT advisor_summary_supersedes_fk FOREIGN KEY (supersedes_summary_id) REFERENCES career_data_advisor_session_summaries(summary_id) ON DELETE RESTRICT;
ALTER TABLE career_data_advisor_follow_ups
  ADD CONSTRAINT advisor_follow_up_status_check CHECK (status IN ('scheduled','due','completed','cancelled','overdue'));

CREATE OR REPLACE FUNCTION career_data_guard_advisor_governance_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (
    NEW.verification_status IS DISTINCT FROM OLD.verification_status
    OR NEW.account_status IS DISTINCT FROM OLD.account_status
  ) AND current_setting('app.advisor_governance_authorized', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'advisor_governance_authorization_required' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER career_data_advisor_profile_governance_guard
BEFORE UPDATE ON career_data_advisor_profiles
FOR EACH ROW EXECUTE FUNCTION career_data_guard_advisor_governance_fields();

CREATE OR REPLACE FUNCTION career_data_advisor_case_access(target_case_id text, required_scope text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM career_data_advisor_cases c
    JOIN career_data_advisor_profiles p
      ON p.advisor_profile_id = c.advisor_profile_id
    JOIN career_data_advisor_grants g
      ON g.id = c.advisor_grant_id
    WHERE c.case_id = target_case_id
      AND c.advisor_user_id = career_data_actor_user_id()
      AND c.case_status <> 'access_revoked'
      AND c.deleted_at IS NULL
      AND p.advisor_user_id = career_data_actor_user_id()
      AND p.verification_status = 'verified'
      AND p.account_status = 'active'
      AND p.deleted_at IS NULL
      AND g.owner_user_id = c.owner_user_id
      AND g.advisor_user_id = c.advisor_user_id
      AND g.status = 'active'
      AND g.revoked_at IS NULL
      AND (g.expires_at IS NULL OR g.expires_at > now())
      AND (required_scope = '' OR g.scopes ? required_scope)
  )
$$;

ALTER TABLE career_data_advisor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_advisor_specialisms ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_advisor_capacity ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_advisor_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_advisor_case_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_advisor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_advisor_session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_advisor_session_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_advisor_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_advisor_evidence_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_advisor_review_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_advisor_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_advisor_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_advisor_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_advisor_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data_advisor_activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY advisor_profiles_self_read ON career_data_advisor_profiles
  FOR SELECT USING (advisor_user_id = career_data_actor_user_id());
CREATE POLICY advisor_profiles_self_create ON career_data_advisor_profiles
  FOR INSERT WITH CHECK (
    advisor_user_id = career_data_actor_user_id()
    AND verification_status = 'unverified'
    AND account_status = 'inactive'
  );
CREATE POLICY advisor_profiles_self_update ON career_data_advisor_profiles
  FOR UPDATE
  USING (advisor_user_id = career_data_actor_user_id())
  WITH CHECK (advisor_user_id = career_data_actor_user_id());
CREATE POLICY advisor_specialisms_self ON career_data_advisor_specialisms
  USING (EXISTS (SELECT 1 FROM career_data_advisor_profiles p WHERE p.advisor_profile_id = career_data_advisor_specialisms.advisor_profile_id AND p.advisor_user_id = career_data_actor_user_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM career_data_advisor_profiles p WHERE p.advisor_profile_id = career_data_advisor_specialisms.advisor_profile_id AND p.advisor_user_id = career_data_actor_user_id()));
CREATE POLICY advisor_capacity_self ON career_data_advisor_capacity
  USING (EXISTS (SELECT 1 FROM career_data_advisor_profiles p WHERE p.advisor_profile_id = career_data_advisor_capacity.advisor_profile_id AND p.advisor_user_id = career_data_actor_user_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM career_data_advisor_profiles p WHERE p.advisor_profile_id = career_data_advisor_capacity.advisor_profile_id AND p.advisor_user_id = career_data_actor_user_id()));

CREATE POLICY advisor_cases_client ON career_data_advisor_cases
  FOR SELECT USING (owner_user_id = career_data_actor_user_id());
CREATE POLICY advisor_cases_assigned ON career_data_advisor_cases
  USING (career_data_advisor_case_access(case_id, 'case_manage'))
  WITH CHECK (career_data_advisor_case_access(case_id, 'case_manage'));

CREATE POLICY advisor_resources_client ON career_data_advisor_case_resources
  FOR SELECT USING (owner_user_id = career_data_actor_user_id());
CREATE POLICY advisor_resources_assigned ON career_data_advisor_case_resources
  USING (career_data_advisor_case_access(case_id, required_scope))
  WITH CHECK (career_data_advisor_case_access(case_id, required_scope));

CREATE POLICY advisor_sessions_client ON career_data_advisor_sessions
  FOR SELECT USING (owner_user_id = career_data_actor_user_id());
CREATE POLICY advisor_sessions_assigned ON career_data_advisor_sessions
  USING (career_data_advisor_case_access(case_id, 'case_manage'))
  WITH CHECK (career_data_advisor_case_access(case_id, 'case_manage'));

CREATE POLICY advisor_notes_client_read ON career_data_advisor_session_notes
  FOR SELECT USING (owner_user_id = career_data_actor_user_id() AND visibility_scope = 'client_and_advisor' AND deleted_at IS NULL);
CREATE POLICY advisor_notes_assigned ON career_data_advisor_session_notes
  USING (career_data_advisor_case_access(case_id, 'case_manage'))
  WITH CHECK (career_data_advisor_case_access(case_id, 'case_manage'));

CREATE POLICY advisor_summaries_client_read ON career_data_advisor_session_summaries
  FOR SELECT USING (owner_user_id = career_data_actor_user_id());
CREATE POLICY advisor_summaries_assigned ON career_data_advisor_session_summaries
  USING (career_data_advisor_case_access(case_id, 'case_manage'))
  WITH CHECK (career_data_advisor_case_access(case_id, 'case_manage'));

CREATE POLICY advisor_actions_client ON career_data_advisor_actions
  FOR SELECT USING (owner_user_id = career_data_actor_user_id());
CREATE POLICY advisor_actions_assigned ON career_data_advisor_actions
  USING (career_data_advisor_case_access(case_id, 'case_manage'))
  WITH CHECK (career_data_advisor_case_access(case_id, 'case_manage'));

CREATE POLICY advisor_evidence_client ON career_data_advisor_evidence_requests
  FOR SELECT USING (owner_user_id = career_data_actor_user_id());
CREATE POLICY advisor_evidence_assigned ON career_data_advisor_evidence_requests
  USING (career_data_advisor_case_access(case_id, 'evidence_review'))
  WITH CHECK (career_data_advisor_case_access(case_id, 'evidence_review'));

CREATE POLICY advisor_reviews_client ON career_data_advisor_review_items
  FOR SELECT USING (owner_user_id = career_data_actor_user_id());
CREATE POLICY advisor_reviews_assigned ON career_data_advisor_review_items
  USING (career_data_advisor_case_access(case_id,
    CASE resource_type
      WHEN 'cv_draft' THEN 'cv_review'
      WHEN 'cv_recommendation' THEN 'cv_review'
      WHEN 'interview_response' THEN 'interview_review'
      WHEN 'interview_question' THEN 'interview_review'
      WHEN 'opportunity' THEN 'opportunity_read'
      WHEN 'career_plan' THEN 'plan_comment'
      ELSE 'evidence_review'
    END))
  WITH CHECK (career_data_advisor_case_access(case_id,
    CASE resource_type
      WHEN 'cv_draft' THEN 'cv_review'
      WHEN 'cv_recommendation' THEN 'cv_review'
      WHEN 'interview_response' THEN 'interview_review'
      WHEN 'interview_question' THEN 'interview_review'
      WHEN 'opportunity' THEN 'opportunity_read'
      WHEN 'career_plan' THEN 'plan_comment'
      ELSE 'evidence_review'
    END));

CREATE POLICY advisor_comments_client_read ON career_data_advisor_comments
  FOR SELECT USING (
    visibility_scope = 'client_and_advisor'
    AND EXISTS (SELECT 1 FROM career_data_advisor_cases c WHERE c.case_id = case_id AND c.owner_user_id = career_data_actor_user_id())
  );
CREATE POLICY advisor_comments_assigned ON career_data_advisor_comments
  USING (career_data_advisor_case_access(case_id, 'case_manage'))
  WITH CHECK (career_data_advisor_case_access(case_id, 'case_manage'));

CREATE POLICY advisor_outcomes_client ON career_data_advisor_outcomes
  FOR SELECT USING (owner_user_id = career_data_actor_user_id());
CREATE POLICY advisor_outcomes_assigned ON career_data_advisor_outcomes
  USING (career_data_advisor_case_access(case_id, 'outcome_record'))
  WITH CHECK (career_data_advisor_case_access(case_id, 'outcome_record'));
CREATE POLICY advisor_placements_client ON career_data_advisor_placements
  FOR SELECT USING (owner_user_id = career_data_actor_user_id());
CREATE POLICY advisor_placements_assigned ON career_data_advisor_placements
  USING (career_data_advisor_case_access(case_id, 'outcome_record'))
  WITH CHECK (career_data_advisor_case_access(case_id, 'outcome_record'));
CREATE POLICY advisor_followups_client ON career_data_advisor_follow_ups
  FOR SELECT USING (owner_user_id = career_data_actor_user_id());
CREATE POLICY advisor_followups_assigned ON career_data_advisor_follow_ups
  USING (career_data_advisor_case_access(case_id, 'case_manage'))
  WITH CHECK (career_data_advisor_case_access(case_id, 'case_manage'));
CREATE POLICY advisor_activity_client_read ON career_data_advisor_activity_events
  FOR SELECT USING (owner_user_id = career_data_actor_user_id());
CREATE POLICY advisor_activity_assigned ON career_data_advisor_activity_events
  USING (case_id IS NOT NULL AND career_data_advisor_case_access(case_id, 'case_manage'))
  WITH CHECK (case_id IS NOT NULL AND career_data_advisor_case_access(case_id, 'case_manage'));
