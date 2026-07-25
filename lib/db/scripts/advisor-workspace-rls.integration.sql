\set ON_ERROR_STOP on

CREATE ROLE cpx_advisor_rls_test NOLOGIN;
GRANT USAGE ON SCHEMA public TO cpx_advisor_rls_test;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cpx_advisor_rls_test;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cpx_advisor_rls_test;

INSERT INTO users (id, name, email, password_hash, role) VALUES
  (91001, 'Fixture owner', 'owner-005d@example.test', 'fixture', 'user'),
  (91002, 'Fixture other owner', 'other-owner-005d@example.test', 'fixture', 'user'),
  (91003, 'Fixture advisor', 'advisor-005d@example.test', 'fixture', 'coach'),
  (91004, 'Fixture wrong advisor', 'wrong-advisor-005d@example.test', 'fixture', 'coach'),
  (91005, 'Fixture suspended advisor', 'suspended-advisor-005d@example.test', 'fixture', 'coach');

INSERT INTO career_data_advisor_profiles
  (advisor_profile_id, advisor_user_id, display_name, verification_status, account_status)
VALUES
  ('profile_active', 91003, 'Fixture advisor', 'verified', 'active'),
  ('profile_wrong', 91004, 'Fixture wrong advisor', 'verified', 'active'),
  ('profile_suspended', 91005, 'Fixture suspended advisor', 'verified', 'suspended');

INSERT INTO career_data_advisor_grants
  (id, owner_user_id, created_by, updated_by, retention_class, advisor_user_id, scopes, status, granted_at, expires_at, revoked_at)
VALUES
  ('grant_active', 91001, 91001, 91001, 'fixture', 91003, '["case_manage","evidence_review"]', 'active', now(), now() + interval '1 day', null),
  ('grant_other_owner', 91002, 91002, 91002, 'fixture', 91003, '["case_manage"]', 'active', now(), now() + interval '1 day', null),
  ('grant_expired', 91001, 91001, 91001, 'fixture', 91003, '["case_manage"]', 'active', now() - interval '2 days', now() - interval '1 day', null),
  ('grant_revoked', 91001, 91001, 91001, 'fixture', 91003, '["case_manage"]', 'active', now() - interval '1 day', now() + interval '1 day', now()),
  ('grant_suspended', 91001, 91001, 91001, 'fixture', 91005, '["case_manage"]', 'active', now(), now() + interval '1 day', null),
  ('grant_scope_missing', 91001, 91001, 91001, 'fixture', 91003, '["profile_read"]', 'active', now(), now() + interval '1 day', null);

INSERT INTO career_data_advisor_cases
  (case_id, owner_user_id, created_by, updated_by, retention_class, advisor_user_id, advisor_profile_id, advisor_grant_id, service_type, case_status, case_stage)
VALUES
  ('case_active', 91001, 91001, 91001, 'fixture', 91003, 'profile_active', 'grant_active', 'career_support', 'active', 'intake'),
  ('case_other_owner', 91002, 91002, 91002, 'fixture', 91003, 'profile_active', 'grant_other_owner', 'career_support', 'active', 'intake'),
  ('case_expired', 91001, 91001, 91001, 'fixture', 91003, 'profile_active', 'grant_expired', 'career_support', 'active', 'intake'),
  ('case_revoked', 91001, 91001, 91001, 'fixture', 91003, 'profile_active', 'grant_revoked', 'career_support', 'active', 'intake'),
  ('case_suspended', 91001, 91001, 91001, 'fixture', 91005, 'profile_suspended', 'grant_suspended', 'career_support', 'active', 'intake'),
  ('case_scope_missing', 91001, 91001, 91001, 'fixture', 91003, 'profile_active', 'grant_scope_missing', 'career_support', 'active', 'intake'),
  ('case_access_revoked', 91001, 91001, 91001, 'fixture', 91003, 'profile_active', 'grant_active', 'career_support', 'access_revoked', 'intake');

INSERT INTO career_data_advisor_sessions
  (session_id, owner_user_id, created_by, updated_by, case_id, advisor_user_id, session_type, session_status, delivery_mode)
VALUES ('session_active', 91001, 91003, 91003, 'case_active', 91003, 'review', 'completed', 'remote');

INSERT INTO career_data_advisor_session_notes
  (note_id, owner_user_id, created_by, updated_by, retention_class, session_id, case_id, advisor_user_id, note_type, visibility_scope, content)
VALUES
  ('note_shared', 91001, 91003, 91003, 'fixture', 'session_active', 'case_active', 91003, 'client_visible', 'client_and_advisor', 'fixture shared'),
  ('note_private', 91001, 91003, 91003, 'fixture', 'session_active', 'case_active', 91003, 'advisor_private', 'advisor_private', 'fixture private');

SET ROLE cpx_advisor_rls_test;

SELECT set_config('app.user_id', '91001', false);
DO $$ BEGIN
  IF (SELECT count(*) FROM career_data_advisor_cases) <> 6 THEN RAISE EXCEPTION 'owner isolation failed'; END IF;
  IF (SELECT count(*) FROM career_data_advisor_cases WHERE case_id = 'case_other_owner') <> 0 THEN RAISE EXCEPTION 'cross-owner isolation failed'; END IF;
  IF (SELECT count(*) FROM career_data_advisor_session_notes) <> 1 THEN RAISE EXCEPTION 'private-note isolation failed'; END IF;
END $$;

SELECT set_config('app.user_id', '91003', false);
DO $$ BEGIN
  IF (SELECT count(*) FROM career_data_advisor_cases WHERE case_id = 'case_active') <> 1 THEN RAISE EXCEPTION 'active advisor access failed'; END IF;
  IF (SELECT count(*) FROM career_data_advisor_cases WHERE case_id = 'case_other_owner') <> 1 THEN RAISE EXCEPTION 'assigned advisor second-owner access failed'; END IF;
  IF (SELECT count(*) FROM career_data_advisor_cases WHERE case_id IN ('case_expired','case_revoked','case_scope_missing','case_access_revoked')) <> 0 THEN RAISE EXCEPTION 'grant state or scope isolation failed'; END IF;
  IF (SELECT count(*) FROM career_data_advisor_session_notes) <> 2 THEN RAISE EXCEPTION 'assigned advisor note access failed'; END IF;
END $$;
DO $$ BEGIN
  BEGIN
    UPDATE career_data_advisor_profiles SET verification_status = 'pending_review' WHERE advisor_profile_id = 'profile_active';
    RAISE EXCEPTION 'self-verification guard failed';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;

SELECT set_config('app.user_id', '91004', false);
DO $$ BEGIN
  IF (SELECT count(*) FROM career_data_advisor_cases) <> 0 THEN RAISE EXCEPTION 'cross-advisor isolation failed'; END IF;
END $$;

SELECT set_config('app.user_id', '91005', false);
DO $$ BEGIN
  IF (SELECT count(*) FROM career_data_advisor_cases) <> 0 THEN RAISE EXCEPTION 'suspended-advisor isolation failed'; END IF;
END $$;

SELECT set_config('app.user_id', '', false);
DO $$ BEGIN
  IF (SELECT count(*) FROM career_data_advisor_cases) <> 0 THEN RAISE EXCEPTION 'anonymous isolation failed'; END IF;
END $$;

RESET ROLE;
DROP OWNED BY cpx_advisor_rls_test;
DROP ROLE cpx_advisor_rls_test;
