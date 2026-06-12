CREATE TYPE "public"."user_role" AS ENUM('user', 'premium', 'coach', 'admin');--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"target_role" text NOT NULL,
	"readiness_score" integer NOT NULL,
	"readiness_sub_scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"profile_summary" text NOT NULL,
	"current_strengths" text NOT NULL,
	"current_strengths_structured" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skill_gaps" text NOT NULL,
	"skill_gaps_structured" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"experience_gaps" text NOT NULL,
	"qualification_gaps" text NOT NULL,
	"certification_recommendations" text NOT NULL,
	"suggested_projects" text NOT NULL,
	"job_progression_ladder" text NOT NULL,
	"immediate_actions" text NOT NULL,
	"immediate_actions_structured" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"year_1_priorities" text NOT NULL,
	"year_2_to_3_plan" text NOT NULL,
	"year_4_to_5_plan" text NOT NULL,
	"roadmap_phases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model_name" text DEFAULT 'careerpath-rules-v2' NOT NULL,
	"prompt_version" text DEFAULT 'v2.0.0' NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"profile_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "career_analyses_readiness_score_check" CHECK ("career_analyses"."readiness_score" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "career_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"target_role" text NOT NULL,
	"target_industry" text,
	"target_level" text,
	"leadership_preference" text,
	"geographic_preference" text,
	"work_mode_preference" text,
	"strengths_to_build" text,
	"areas_to_improve" text,
	"target_months" integer DEFAULT 60,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "career_goals_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "certifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"issuing_organization" text NOT NULL,
	"issue_date" date,
	"expiry_date" date,
	"credential_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "education" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"institution" text NOT NULL,
	"degree" text NOT NULL,
	"field_of_study" text,
	"start_date" date NOT NULL,
	"end_date" date,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"current_role" text,
	"total_experience_months" integer,
	"industry" text,
	"location" text,
	"phone" text,
	"linkedin_url" text,
	"professional_summary" text,
	"preferred_learning_style" text,
	"weekly_learning_minutes" integer,
	"salary_aspiration" text,
	"career_level" text,
	"cv_import_completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "work_experiences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"company" text NOT NULL,
	"title" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"is_current" boolean DEFAULT false NOT NULL,
	"description" text,
	"skills" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"proficiency_level" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"analysis_id" integer,
	"title" text NOT NULL,
	"description" text,
	"phase" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"due_date" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_analyses" ADD CONSTRAINT "career_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_goals" ADD CONSTRAINT "career_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "education" ADD CONSTRAINT "education_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_experiences" ADD CONSTRAINT "work_experiences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_analysis_id_career_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."career_analyses"("id") ON DELETE cascade ON UPDATE no action;