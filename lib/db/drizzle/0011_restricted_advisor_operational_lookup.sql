CREATE OR REPLACE FUNCTION career_data_operational_advisor_profile(target_advisor_user_id integer)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT advisor_profile_id
  FROM career_data_advisor_profiles
  WHERE advisor_user_id = target_advisor_user_id
    AND verification_status = 'verified'
    AND account_status = 'active'
    AND deleted_at IS NULL
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION career_data_operational_advisor_profile(integer) FROM PUBLIC;
