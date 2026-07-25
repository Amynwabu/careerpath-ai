-- Client mutation policies are intentionally narrow. Repository authorization
-- remains mandatory and validates transitions, immutable relationships, scope,
-- record version, and current case/grant state before these policies execute.

CREATE OR REPLACE FUNCTION career_data_client_owns_case(target_case_id text)
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
    WHERE c.case_id = target_case_id
      AND c.owner_user_id = career_data_actor_user_id()
      AND c.deleted_at IS NULL
      AND c.case_status NOT IN ('closed','cancelled','access_revoked')
  )
$$;

CREATE POLICY advisor_actions_client_update ON career_data_advisor_actions
  FOR UPDATE
  USING (owner_user_id = career_data_actor_user_id() AND assigned_to = 'client' AND career_data_client_owns_case(case_id))
  WITH CHECK (owner_user_id = career_data_actor_user_id() AND assigned_to = 'client' AND career_data_client_owns_case(case_id));

CREATE POLICY advisor_evidence_client_update ON career_data_advisor_evidence_requests
  FOR UPDATE
  USING (owner_user_id = career_data_actor_user_id() AND requested_from = career_data_actor_user_id() AND career_data_client_owns_case(case_id))
  WITH CHECK (owner_user_id = career_data_actor_user_id() AND requested_from = career_data_actor_user_id() AND career_data_client_owns_case(case_id));

CREATE POLICY advisor_reviews_client_update ON career_data_advisor_review_items
  FOR UPDATE
  USING (owner_user_id = career_data_actor_user_id() AND career_data_client_owns_case(case_id))
  WITH CHECK (owner_user_id = career_data_actor_user_id() AND career_data_client_owns_case(case_id));

CREATE POLICY advisor_comments_client_create ON career_data_advisor_comments
  FOR INSERT
  WITH CHECK (
    author_user_id = career_data_actor_user_id()
    AND author_role = 'client'
    AND visibility_scope = 'client_and_advisor'
    AND career_data_client_owns_case(case_id)
    AND EXISTS (
      SELECT 1 FROM career_data_advisor_review_items r
      WHERE r.review_item_id = review_item_id
        AND r.case_id = case_id
        AND r.owner_user_id = career_data_actor_user_id()
    )
  );
CREATE POLICY advisor_comments_client_update ON career_data_advisor_comments
  FOR UPDATE
  USING (
    author_user_id = career_data_actor_user_id()
    AND author_role = 'client'
    AND visibility_scope = 'client_and_advisor'
    AND deleted_at IS NULL
    AND career_data_client_owns_case(case_id)
  )
  WITH CHECK (
    author_user_id = career_data_actor_user_id()
    AND author_role = 'client'
    AND visibility_scope = 'client_and_advisor'
    AND career_data_client_owns_case(case_id)
  );

CREATE POLICY advisor_outcomes_client_create ON career_data_advisor_outcomes
  FOR INSERT
  WITH CHECK (
    owner_user_id = career_data_actor_user_id()
    AND created_by = career_data_actor_user_id()
    AND updated_by = career_data_actor_user_id()
    AND verification_status IN ('self_reported','unconfirmed')
    AND career_data_client_owns_case(case_id)
  );
CREATE POLICY advisor_outcomes_client_update ON career_data_advisor_outcomes
  FOR UPDATE
  USING (owner_user_id = career_data_actor_user_id() AND created_by = career_data_actor_user_id() AND career_data_client_owns_case(case_id))
  WITH CHECK (
    owner_user_id = career_data_actor_user_id()
    AND verification_status IN ('self_reported','unconfirmed')
    AND career_data_client_owns_case(case_id)
  );

CREATE POLICY advisor_placements_client_create ON career_data_advisor_placements
  FOR INSERT
  WITH CHECK (
    owner_user_id = career_data_actor_user_id()
    AND created_by = career_data_actor_user_id()
    AND updated_by = career_data_actor_user_id()
    AND verification_status IN ('self_reported','unconfirmed')
    AND career_data_client_owns_case(case_id)
  );
CREATE POLICY advisor_placements_client_update ON career_data_advisor_placements
  FOR UPDATE
  USING (owner_user_id = career_data_actor_user_id() AND created_by = career_data_actor_user_id() AND career_data_client_owns_case(case_id))
  WITH CHECK (
    owner_user_id = career_data_actor_user_id()
    AND verification_status IN ('self_reported','unconfirmed')
    AND career_data_client_owns_case(case_id)
  );

CREATE POLICY advisor_followups_client_update ON career_data_advisor_follow_ups
  FOR UPDATE
  USING (owner_user_id = career_data_actor_user_id() AND career_data_client_owns_case(case_id))
  WITH CHECK (owner_user_id = career_data_actor_user_id() AND career_data_client_owns_case(case_id));
