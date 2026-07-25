ALTER TABLE "career_data_advisor_actions" ADD COLUMN "completion_information" text;--> statement-breakpoint
ALTER TABLE "career_data_advisor_actions" ADD COLUMN "status_reason" text;--> statement-breakpoint
ALTER TABLE "career_data_advisor_comments" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "career_data_advisor_evidence_requests" ADD COLUMN "review_verification_status" text;--> statement-breakpoint
ALTER TABLE "career_data_advisor_follow_ups" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "career_data_advisor_outcomes" ADD COLUMN "updated_by" integer;--> statement-breakpoint
UPDATE "career_data_advisor_outcomes" SET "updated_by" = "created_by" WHERE "updated_by" IS NULL;--> statement-breakpoint
ALTER TABLE "career_data_advisor_outcomes" ALTER COLUMN "updated_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "career_data_advisor_outcomes" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "career_data_advisor_outcomes" ADD COLUMN "supersedes_outcome_id" text;--> statement-breakpoint
ALTER TABLE "career_data_advisor_placements" ADD COLUMN "updated_by" integer;--> statement-breakpoint
UPDATE "career_data_advisor_placements" SET "updated_by" = "created_by" WHERE "updated_by" IS NULL;--> statement-breakpoint
ALTER TABLE "career_data_advisor_placements" ALTER COLUMN "updated_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "career_data_advisor_placements" ADD COLUMN "supersedes_placement_id" text;--> statement-breakpoint
ALTER TABLE "career_data_advisor_sessions" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "career_data_advisor_sessions" ADD COLUMN "rescheduled_from_session_id" text;--> statement-breakpoint
ALTER TABLE "career_data_advisor_outcomes" ADD CONSTRAINT "career_data_advisor_outcomes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_placements" ADD CONSTRAINT "career_data_advisor_placements_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_outcomes" ADD CONSTRAINT "career_data_advisor_outcomes_supersedes_fk" FOREIGN KEY ("supersedes_outcome_id") REFERENCES "public"."career_data_advisor_outcomes"("outcome_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_placements" ADD CONSTRAINT "career_data_advisor_placements_supersedes_fk" FOREIGN KEY ("supersedes_placement_id") REFERENCES "public"."career_data_advisor_placements"("placement_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_sessions" ADD CONSTRAINT "career_data_advisor_sessions_rescheduled_from_fk" FOREIGN KEY ("rescheduled_from_session_id") REFERENCES "public"."career_data_advisor_sessions"("session_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_actions" ADD CONSTRAINT "advisor_action_assignee_check" CHECK ("assigned_to" IN ('client','advisor'));--> statement-breakpoint
ALTER TABLE "career_data_advisor_review_items" ADD CONSTRAINT "advisor_review_status_check" CHECK ("status" IN ('requested','awaiting_advisor','awaiting_client','resolved','withdrawn'));--> statement-breakpoint
ALTER TABLE "career_data_advisor_comments" ADD CONSTRAINT "advisor_comment_status_check" CHECK ("status" IN ('open','resolved','deleted'));--> statement-breakpoint
ALTER TABLE "career_data_advisor_sessions" ADD CONSTRAINT "advisor_session_status_check" CHECK ("session_status" IN ('scheduled','confirmed','in_progress','completed','cancelled','rescheduled'));--> statement-breakpoint
ALTER TABLE "career_data_advisor_outcomes" ADD CONSTRAINT "advisor_outcome_type_check" CHECK ("outcome_type" IN ('profile_completed','career_goal_confirmed','career_plan_approved','training_started','training_completed','cv_completed','application_submitted','interview_secured','interview_completed','job_offer_received','job_offer_accepted','job_started','promotion_received','career_transition_completed','professional_registration_application_submitted','professional_registration_achieved','case_closed_without_outcome'));--> statement-breakpoint
CREATE INDEX "career_data_advisor_evidence_advisor_idx" ON "career_data_advisor_evidence_requests" USING btree ("advisor_user_id","status","due_at");--> statement-breakpoint
CREATE INDEX "career_data_advisor_followups_case_idx" ON "career_data_advisor_follow_ups" USING btree ("case_id","status","due_at");--> statement-breakpoint
CREATE INDEX "career_data_advisor_reviews_advisor_idx" ON "career_data_advisor_review_items" USING btree ("advisor_user_id","status","priority");--> statement-breakpoint
CREATE INDEX "career_data_advisor_sessions_advisor_idx" ON "career_data_advisor_sessions" USING btree ("advisor_user_id","session_status","scheduled_start");
