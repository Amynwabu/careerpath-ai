CREATE POLICY advisor_cases_client_create ON career_data_advisor_cases
  FOR INSERT
  WITH CHECK (
    owner_user_id = career_data_actor_user_id()
    AND created_by = career_data_actor_user_id()
    AND updated_by = career_data_actor_user_id()
    AND advisor_profile_id = career_data_operational_advisor_profile(advisor_user_id)
    AND EXISTS (
      SELECT 1
      FROM career_data_advisor_grants grant_record
      WHERE grant_record.id = advisor_grant_id
        AND grant_record.owner_user_id = career_data_actor_user_id()
        AND grant_record.advisor_user_id = advisor_user_id
        AND grant_record.status = 'active'
        AND grant_record.revoked_at IS NULL
        AND (grant_record.expires_at IS NULL OR grant_record.expires_at > now())
        AND grant_record.scopes ? 'case_manage'
    )
  );

CREATE POLICY advisor_activity_client_create ON career_data_advisor_activity_events
  FOR INSERT
  WITH CHECK (
    case_id IS NOT NULL
    AND owner_user_id = career_data_actor_user_id()
    AND actor_user_id = career_data_actor_user_id()
    AND career_data_client_owns_case(case_id)
  );
