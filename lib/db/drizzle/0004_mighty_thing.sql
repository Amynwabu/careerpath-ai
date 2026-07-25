CREATE TABLE "career_data_advisor_actions" (
	"action_id" text PRIMARY KEY NOT NULL,
	"owner_user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL,
	"case_id" text NOT NULL,
	"advisor_user_id" integer NOT NULL,
	"assigned_to" text NOT NULL,
	"action_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"priority" text NOT NULL,
	"status" text NOT NULL,
	"due_at" timestamp with time zone,
	"source_session_id" text,
	"related_resource_type" text,
	"related_resource_id" text,
	"completion_evidence_required" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "career_data_advisor_activity_events" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text,
	"owner_user_id" integer NOT NULL,
	"advisor_user_id" integer,
	"actor_user_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"outcome" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"retention_class" text DEFAULT 'advisor_activity' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_data_advisor_capacity" (
	"id" text PRIMARY KEY NOT NULL,
	"advisor_profile_id" text NOT NULL,
	"capacity_status" text NOT NULL,
	"maximum_active_cases" integer,
	"available_session_slots" integer,
	"service_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_data_advisor_case_resources" (
	"case_resource_id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"owner_user_id" integer NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"required_scope" text NOT NULL,
	"shared_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_data_advisor_cases" (
	"case_id" text PRIMARY KEY NOT NULL,
	"owner_user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" integer,
	"deletion_reason" text,
	"retention_class" text NOT NULL,
	"advisor_user_id" integer NOT NULL,
	"advisor_profile_id" text NOT NULL,
	"advisor_grant_id" text NOT NULL,
	"service_type" text NOT NULL,
	"case_status" text NOT NULL,
	"case_stage" text NOT NULL,
	"priority" text DEFAULT 'standard' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"next_review_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "career_data_advisor_comments" (
	"comment_id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"review_item_id" text NOT NULL,
	"parent_comment_id" text,
	"author_user_id" integer NOT NULL,
	"author_role" text NOT NULL,
	"visibility_scope" text NOT NULL,
	"content" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "career_data_advisor_evidence_requests" (
	"evidence_request_id" text PRIMARY KEY NOT NULL,
	"owner_user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL,
	"case_id" text NOT NULL,
	"advisor_user_id" integer NOT NULL,
	"requested_by" integer NOT NULL,
	"requested_from" integer NOT NULL,
	"evidence_type" text NOT NULL,
	"description" text NOT NULL,
	"related_requirement" text,
	"related_resource_type" text,
	"related_resource_id" text,
	"due_at" timestamp with time zone,
	"status" text NOT NULL,
	"submitted_evidence_id" text,
	"review_decision" text,
	"review_notes" text,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "career_data_advisor_follow_ups" (
	"follow_up_id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"owner_user_id" integer NOT NULL,
	"advisor_user_id" integer NOT NULL,
	"follow_up_type" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"related_action_id" text,
	"related_session_id" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"record_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_data_advisor_outcomes" (
	"outcome_id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"owner_user_id" integer NOT NULL,
	"advisor_user_id" integer NOT NULL,
	"outcome_type" text NOT NULL,
	"outcome_date" timestamp with time zone NOT NULL,
	"verification_status" text NOT NULL,
	"source_reference" text,
	"notes" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_data_advisor_placements" (
	"placement_id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"owner_user_id" integer NOT NULL,
	"advisor_user_id" integer NOT NULL,
	"employer_name" text NOT NULL,
	"role_title" text NOT NULL,
	"start_date" timestamp with time zone,
	"employment_type" text,
	"location" text,
	"salary_amount" bigint,
	"salary_currency" text,
	"salary_period" text,
	"source_opportunity_id" text,
	"offer_status" text NOT NULL,
	"verification_status" text NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_data_advisor_profiles" (
	"advisor_profile_id" text PRIMARY KEY NOT NULL,
	"advisor_user_id" integer NOT NULL,
	"display_name" text NOT NULL,
	"professional_title" text,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"account_status" text DEFAULT 'inactive' NOT NULL,
	"capacity_status" text DEFAULT 'not_accepting_new_clients' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "career_data_advisor_review_items" (
	"review_item_id" text PRIMARY KEY NOT NULL,
	"owner_user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL,
	"case_id" text NOT NULL,
	"advisor_user_id" integer NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"review_type" text NOT NULL,
	"status" text NOT NULL,
	"priority" text NOT NULL,
	"advisor_decision" text,
	"client_decision" text,
	"decision_reason" text,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "career_data_advisor_session_notes" (
	"note_id" text PRIMARY KEY NOT NULL,
	"owner_user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" integer,
	"deletion_reason" text,
	"retention_class" text NOT NULL,
	"session_id" text NOT NULL,
	"case_id" text NOT NULL,
	"advisor_user_id" integer NOT NULL,
	"note_type" text NOT NULL,
	"visibility_scope" text NOT NULL,
	"content" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_data_advisor_session_summaries" (
	"summary_id" text PRIMARY KEY NOT NULL,
	"owner_user_id" integer NOT NULL,
	"advisor_user_id" integer NOT NULL,
	"session_id" text NOT NULL,
	"case_id" text NOT NULL,
	"summary_version" integer NOT NULL,
	"session_objective" text NOT NULL,
	"topics_discussed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"key_observations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"agreed_decisions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risks_or_blockers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"next_review_at" timestamp with time zone,
	"client_visible_summary" text NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"supersedes_summary_id" text
);
--> statement-breakpoint
CREATE TABLE "career_data_advisor_sessions" (
	"session_id" text PRIMARY KEY NOT NULL,
	"owner_user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL,
	"case_id" text NOT NULL,
	"advisor_user_id" integer NOT NULL,
	"session_type" text NOT NULL,
	"session_status" text NOT NULL,
	"scheduled_start" timestamp with time zone,
	"scheduled_end" timestamp with time zone,
	"actual_start" timestamp with time zone,
	"actual_end" timestamp with time zone,
	"delivery_mode" text NOT NULL,
	"location_or_provider_reference" text
);
--> statement-breakpoint
CREATE TABLE "career_data_advisor_specialisms" (
	"id" text PRIMARY KEY NOT NULL,
	"advisor_profile_id" text NOT NULL,
	"specialism_code" text NOT NULL,
	"declaration_status" text NOT NULL,
	"review_status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "career_data_advisor_actions" ADD CONSTRAINT "career_data_advisor_actions_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_actions" ADD CONSTRAINT "career_data_advisor_actions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_actions" ADD CONSTRAINT "career_data_advisor_actions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_actions" ADD CONSTRAINT "career_data_advisor_actions_case_id_career_data_advisor_cases_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."career_data_advisor_cases"("case_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_actions" ADD CONSTRAINT "career_data_advisor_actions_advisor_user_id_users_id_fk" FOREIGN KEY ("advisor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_actions" ADD CONSTRAINT "career_data_advisor_actions_source_session_id_career_data_advisor_sessions_session_id_fk" FOREIGN KEY ("source_session_id") REFERENCES "public"."career_data_advisor_sessions"("session_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_activity_events" ADD CONSTRAINT "career_data_advisor_activity_events_case_id_career_data_advisor_cases_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."career_data_advisor_cases"("case_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_activity_events" ADD CONSTRAINT "career_data_advisor_activity_events_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_activity_events" ADD CONSTRAINT "career_data_advisor_activity_events_advisor_user_id_users_id_fk" FOREIGN KEY ("advisor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_activity_events" ADD CONSTRAINT "career_data_advisor_activity_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_capacity" ADD CONSTRAINT "career_data_advisor_capacity_advisor_profile_id_career_data_advisor_profiles_advisor_profile_id_fk" FOREIGN KEY ("advisor_profile_id") REFERENCES "public"."career_data_advisor_profiles"("advisor_profile_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_case_resources" ADD CONSTRAINT "career_data_advisor_case_resources_case_id_career_data_advisor_cases_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."career_data_advisor_cases"("case_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_case_resources" ADD CONSTRAINT "career_data_advisor_case_resources_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_case_resources" ADD CONSTRAINT "career_data_advisor_case_resources_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_cases" ADD CONSTRAINT "career_data_advisor_cases_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_cases" ADD CONSTRAINT "career_data_advisor_cases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_cases" ADD CONSTRAINT "career_data_advisor_cases_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_cases" ADD CONSTRAINT "career_data_advisor_cases_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_cases" ADD CONSTRAINT "career_data_advisor_cases_advisor_user_id_users_id_fk" FOREIGN KEY ("advisor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_cases" ADD CONSTRAINT "career_data_advisor_cases_advisor_profile_id_career_data_advisor_profiles_advisor_profile_id_fk" FOREIGN KEY ("advisor_profile_id") REFERENCES "public"."career_data_advisor_profiles"("advisor_profile_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_cases" ADD CONSTRAINT "career_data_advisor_cases_advisor_grant_id_career_data_advisor_grants_id_fk" FOREIGN KEY ("advisor_grant_id") REFERENCES "public"."career_data_advisor_grants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_comments" ADD CONSTRAINT "career_data_advisor_comments_case_id_career_data_advisor_cases_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."career_data_advisor_cases"("case_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_comments" ADD CONSTRAINT "career_data_advisor_comments_review_item_id_career_data_advisor_review_items_review_item_id_fk" FOREIGN KEY ("review_item_id") REFERENCES "public"."career_data_advisor_review_items"("review_item_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_comments" ADD CONSTRAINT "career_data_advisor_comments_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_evidence_requests" ADD CONSTRAINT "career_data_advisor_evidence_requests_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_evidence_requests" ADD CONSTRAINT "career_data_advisor_evidence_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_evidence_requests" ADD CONSTRAINT "career_data_advisor_evidence_requests_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_evidence_requests" ADD CONSTRAINT "career_data_advisor_evidence_requests_case_id_career_data_advisor_cases_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."career_data_advisor_cases"("case_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_evidence_requests" ADD CONSTRAINT "career_data_advisor_evidence_requests_advisor_user_id_users_id_fk" FOREIGN KEY ("advisor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_evidence_requests" ADD CONSTRAINT "career_data_advisor_evidence_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_evidence_requests" ADD CONSTRAINT "career_data_advisor_evidence_requests_requested_from_users_id_fk" FOREIGN KEY ("requested_from") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_follow_ups" ADD CONSTRAINT "career_data_advisor_follow_ups_case_id_career_data_advisor_cases_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."career_data_advisor_cases"("case_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_follow_ups" ADD CONSTRAINT "career_data_advisor_follow_ups_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_follow_ups" ADD CONSTRAINT "career_data_advisor_follow_ups_advisor_user_id_users_id_fk" FOREIGN KEY ("advisor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_follow_ups" ADD CONSTRAINT "career_data_advisor_follow_ups_related_action_id_career_data_advisor_actions_action_id_fk" FOREIGN KEY ("related_action_id") REFERENCES "public"."career_data_advisor_actions"("action_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_follow_ups" ADD CONSTRAINT "career_data_advisor_follow_ups_related_session_id_career_data_advisor_sessions_session_id_fk" FOREIGN KEY ("related_session_id") REFERENCES "public"."career_data_advisor_sessions"("session_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_follow_ups" ADD CONSTRAINT "career_data_advisor_follow_ups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_outcomes" ADD CONSTRAINT "career_data_advisor_outcomes_case_id_career_data_advisor_cases_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."career_data_advisor_cases"("case_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_outcomes" ADD CONSTRAINT "career_data_advisor_outcomes_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_outcomes" ADD CONSTRAINT "career_data_advisor_outcomes_advisor_user_id_users_id_fk" FOREIGN KEY ("advisor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_outcomes" ADD CONSTRAINT "career_data_advisor_outcomes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_placements" ADD CONSTRAINT "career_data_advisor_placements_case_id_career_data_advisor_cases_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."career_data_advisor_cases"("case_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_placements" ADD CONSTRAINT "career_data_advisor_placements_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_placements" ADD CONSTRAINT "career_data_advisor_placements_advisor_user_id_users_id_fk" FOREIGN KEY ("advisor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_placements" ADD CONSTRAINT "career_data_advisor_placements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_profiles" ADD CONSTRAINT "career_data_advisor_profiles_advisor_user_id_users_id_fk" FOREIGN KEY ("advisor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_review_items" ADD CONSTRAINT "career_data_advisor_review_items_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_review_items" ADD CONSTRAINT "career_data_advisor_review_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_review_items" ADD CONSTRAINT "career_data_advisor_review_items_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_review_items" ADD CONSTRAINT "career_data_advisor_review_items_case_id_career_data_advisor_cases_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."career_data_advisor_cases"("case_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_review_items" ADD CONSTRAINT "career_data_advisor_review_items_advisor_user_id_users_id_fk" FOREIGN KEY ("advisor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_session_notes" ADD CONSTRAINT "career_data_advisor_session_notes_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_session_notes" ADD CONSTRAINT "career_data_advisor_session_notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_session_notes" ADD CONSTRAINT "career_data_advisor_session_notes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_session_notes" ADD CONSTRAINT "career_data_advisor_session_notes_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_session_notes" ADD CONSTRAINT "career_data_advisor_session_notes_session_id_career_data_advisor_sessions_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."career_data_advisor_sessions"("session_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_session_notes" ADD CONSTRAINT "career_data_advisor_session_notes_case_id_career_data_advisor_cases_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."career_data_advisor_cases"("case_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_session_notes" ADD CONSTRAINT "career_data_advisor_session_notes_advisor_user_id_users_id_fk" FOREIGN KEY ("advisor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_session_summaries" ADD CONSTRAINT "career_data_advisor_session_summaries_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_session_summaries" ADD CONSTRAINT "career_data_advisor_session_summaries_advisor_user_id_users_id_fk" FOREIGN KEY ("advisor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_session_summaries" ADD CONSTRAINT "career_data_advisor_session_summaries_session_id_career_data_advisor_sessions_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."career_data_advisor_sessions"("session_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_session_summaries" ADD CONSTRAINT "career_data_advisor_session_summaries_case_id_career_data_advisor_cases_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."career_data_advisor_cases"("case_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_session_summaries" ADD CONSTRAINT "career_data_advisor_session_summaries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_sessions" ADD CONSTRAINT "career_data_advisor_sessions_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_sessions" ADD CONSTRAINT "career_data_advisor_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_sessions" ADD CONSTRAINT "career_data_advisor_sessions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_sessions" ADD CONSTRAINT "career_data_advisor_sessions_case_id_career_data_advisor_cases_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."career_data_advisor_cases"("case_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_sessions" ADD CONSTRAINT "career_data_advisor_sessions_advisor_user_id_users_id_fk" FOREIGN KEY ("advisor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_specialisms" ADD CONSTRAINT "career_data_advisor_specialisms_advisor_profile_id_career_data_advisor_profiles_advisor_profile_id_fk" FOREIGN KEY ("advisor_profile_id") REFERENCES "public"."career_data_advisor_profiles"("advisor_profile_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "career_data_advisor_actions_case_idx" ON "career_data_advisor_actions" USING btree ("case_id","status");--> statement-breakpoint
CREATE INDEX "career_data_advisor_actions_due_idx" ON "career_data_advisor_actions" USING btree ("assigned_to","due_at");--> statement-breakpoint
CREATE INDEX "career_data_advisor_activity_case_idx" ON "career_data_advisor_activity_events" USING btree ("case_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "career_data_advisor_capacity_profile_idx" ON "career_data_advisor_capacity" USING btree ("advisor_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "career_data_advisor_case_resource_unique_idx" ON "career_data_advisor_case_resources" USING btree ("case_id","resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "career_data_advisor_case_resource_owner_idx" ON "career_data_advisor_case_resources" USING btree ("owner_user_id","resource_type");--> statement-breakpoint
CREATE INDEX "career_data_advisor_cases_advisor_idx" ON "career_data_advisor_cases" USING btree ("advisor_user_id","case_status");--> statement-breakpoint
CREATE INDEX "career_data_advisor_cases_owner_idx" ON "career_data_advisor_cases" USING btree ("owner_user_id","case_status");--> statement-breakpoint
CREATE INDEX "career_data_advisor_cases_grant_idx" ON "career_data_advisor_cases" USING btree ("advisor_grant_id");--> statement-breakpoint
CREATE INDEX "career_data_advisor_cases_review_idx" ON "career_data_advisor_cases" USING btree ("next_review_at");--> statement-breakpoint
CREATE INDEX "career_data_advisor_comments_review_idx" ON "career_data_advisor_comments" USING btree ("review_item_id","visibility_scope");--> statement-breakpoint
CREATE INDEX "career_data_advisor_evidence_case_idx" ON "career_data_advisor_evidence_requests" USING btree ("case_id","status");--> statement-breakpoint
CREATE INDEX "career_data_advisor_followups_due_idx" ON "career_data_advisor_follow_ups" USING btree ("advisor_user_id","due_at");--> statement-breakpoint
CREATE INDEX "career_data_advisor_outcomes_case_idx" ON "career_data_advisor_outcomes" USING btree ("case_id","outcome_type");--> statement-breakpoint
CREATE INDEX "career_data_advisor_placements_case_idx" ON "career_data_advisor_placements" USING btree ("case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "career_data_advisor_profiles_user_idx" ON "career_data_advisor_profiles" USING btree ("advisor_user_id");--> statement-breakpoint
CREATE INDEX "career_data_advisor_profiles_status_idx" ON "career_data_advisor_profiles" USING btree ("verification_status","account_status");--> statement-breakpoint
CREATE INDEX "career_data_advisor_reviews_case_idx" ON "career_data_advisor_review_items" USING btree ("case_id","status");--> statement-breakpoint
CREATE INDEX "career_data_advisor_notes_session_idx" ON "career_data_advisor_session_notes" USING btree ("session_id","visibility_scope");--> statement-breakpoint
CREATE UNIQUE INDEX "career_data_advisor_summary_version_idx" ON "career_data_advisor_session_summaries" USING btree ("session_id","summary_version");--> statement-breakpoint
CREATE INDEX "career_data_advisor_sessions_case_idx" ON "career_data_advisor_sessions" USING btree ("case_id","scheduled_start");--> statement-breakpoint
CREATE UNIQUE INDEX "career_data_advisor_specialism_unique_idx" ON "career_data_advisor_specialisms" USING btree ("advisor_profile_id","specialism_code");