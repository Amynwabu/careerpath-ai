\set ON_ERROR_STOP on
CREATE ROLE cpx_workflow_rls_test NOLOGIN;
GRANT USAGE ON SCHEMA public TO cpx_workflow_rls_test;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  career_data_opportunity_snapshots, career_data_saved_opportunities,
  career_data_opportunity_sessions, career_data_cv_optimisation_sessions,
  career_data_interview_sessions, career_data_workflow_resources,
  career_data_workflow_exports, career_data_workflow_idempotency
TO cpx_workflow_rls_test;
GRANT SELECT ON career_data_advisor_case_resources, career_data_advisor_cases,
  career_data_advisor_profiles, career_data_advisor_grants TO cpx_workflow_rls_test;

INSERT INTO career_data_workflow_resources
  (workflow_resource_id,owner_user_id,domain,resource_type,parent_session_id,
   source_version,engine_version,taxonomy_version,content_hash,payload,created_by)
VALUES ('workflow_rls_resource',91001,'application','cv_draft','workflow_cv_fixture',
        '1','fixture','2026.1','fixture_hash','{"claimStatus":"blocked"}',91001)
ON CONFLICT DO NOTHING;
INSERT INTO career_data_advisor_case_resources
  (case_resource_id,case_id,owner_user_id,resource_type,resource_id,required_scope,created_by)
VALUES ('workflow_rls_link','case_active',91001,'cv_draft','workflow_rls_resource','cv_review',91001)
ON CONFLICT DO NOTHING;

SET ROLE cpx_workflow_rls_test;
SELECT set_config('app.user_id','91001',false);
DO $$ BEGIN
  IF (SELECT count(*) FROM career_data_workflow_resources WHERE workflow_resource_id='workflow_rls_resource') <> 1
  THEN RAISE EXCEPTION 'owner read denied'; END IF;
END $$;

SELECT set_config('app.user_id','91002',false);
DO $$ BEGIN
  IF (SELECT count(*) FROM career_data_workflow_resources WHERE workflow_resource_id='workflow_rls_resource') <> 0
  THEN RAISE EXCEPTION 'cross-owner resource disclosed'; END IF;
  IF (SELECT count(*) FROM career_data_cv_optimisation_sessions WHERE owner_user_id=91001) <> 0
  THEN RAISE EXCEPTION 'cross-owner session disclosed'; END IF;
END $$;

SELECT set_config('app.user_id','91003',false);
DO $$ BEGIN
  IF (SELECT count(*) FROM career_data_workflow_resources WHERE workflow_resource_id='workflow_rls_resource') <> 1
  THEN RAISE EXCEPTION 'assigned advisor scoped read denied'; END IF;
END $$;

SELECT set_config('app.user_id','91004',false);
DO $$ BEGIN
  IF (SELECT count(*) FROM career_data_workflow_resources WHERE workflow_resource_id='workflow_rls_resource') <> 0
  THEN RAISE EXCEPTION 'wrong advisor resource disclosed'; END IF;
END $$;

SELECT set_config('app.user_id','',false);
DO $$ BEGIN
  IF (SELECT count(*) FROM career_data_workflow_resources) <> 0
  THEN RAISE EXCEPTION 'anonymous resource disclosed'; END IF;
END $$;
RESET ROLE;
DROP OWNED BY cpx_workflow_rls_test;
DROP ROLE cpx_workflow_rls_test;
