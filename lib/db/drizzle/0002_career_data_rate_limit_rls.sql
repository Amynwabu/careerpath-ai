ALTER TABLE career_data_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY career_data_rate_limits_owner_all ON career_data_rate_limits
  USING (owner_user_id = career_data_actor_user_id())
  WITH CHECK (owner_user_id = career_data_actor_user_id());
