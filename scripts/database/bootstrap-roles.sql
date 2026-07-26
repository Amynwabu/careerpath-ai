\set ON_ERROR_STOP on
-- Run with the managed provider's database administrator. Passwords are
-- provisioned through the provider secret store, never in this file.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='careerpath_migrator') THEN CREATE ROLE careerpath_migrator NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='careerpath_app') THEN CREATE ROLE careerpath_app NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='careerpath_readonly') THEN CREATE ROLE careerpath_readonly NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='careerpath_retention_worker') THEN CREATE ROLE careerpath_retention_worker NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='careerpath_reporting') THEN CREATE ROLE careerpath_reporting NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
END $$;
GRANT USAGE ON SCHEMA public TO careerpath_app,careerpath_readonly,careerpath_retention_worker,careerpath_reporting;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO careerpath_app;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO careerpath_app;
GRANT SELECT ON career_data_reporting_job_health TO careerpath_reporting;
GRANT SELECT,UPDATE,DELETE ON career_data_jobs,career_data_job_checkpoints TO careerpath_retention_worker;
DROP POLICY IF EXISTS jobs_worker_operations ON career_data_jobs;
CREATE POLICY jobs_worker_operations ON career_data_jobs TO careerpath_retention_worker
  USING (job_type IN ('retention','grant_expiry','storage_cleanup','file_deletion'))
  WITH CHECK (job_type IN ('retention','grant_expiry','storage_cleanup','file_deletion'));
DROP POLICY IF EXISTS job_checkpoints_worker_operations ON career_data_job_checkpoints;
CREATE POLICY job_checkpoints_worker_operations ON career_data_job_checkpoints TO careerpath_retention_worker
  USING (EXISTS (SELECT 1 FROM career_data_jobs j WHERE j.job_id=career_data_job_checkpoints.job_id
    AND j.job_type IN ('retention','grant_expiry','storage_cleanup','file_deletion')))
  WITH CHECK (EXISTS (SELECT 1 FROM career_data_jobs j WHERE j.job_id=career_data_job_checkpoints.job_id
    AND j.job_type IN ('retention','grant_expiry','storage_cleanup','file_deletion')));
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM careerpath_readonly;
