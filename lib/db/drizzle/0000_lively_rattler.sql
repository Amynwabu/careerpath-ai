CREATE TYPE "public"."user_role" AS ENUM('user', 'premium', 'coach', 'admin');--> statement-breakpoint
CREATE TYPE "public"."career_level" AS ENUM('entry', 'practitioner', 'senior_practitioner', 'manager', 'senior_manager', 'executive', 'specialist', 'senior_specialist');--> statement-breakpoint
CREATE TYPE "public"."career_transition_type" AS ENUM('promotion', 'lateral', 'specialisation', 'career_change', 'return_to_work', 'leadership', 'consulting', 'entrepreneurship', 'bridge');--> statement-breakpoint
CREATE TYPE "public"."occupation_skill_requirement_type" AS ENUM('essential', 'desirable', 'emerging', 'regulatory', 'leadership_stage');--> statement-breakpoint
CREATE TYPE "public"."provenance_source_type" AS ENUM('internal', 'esco', 'onet', 'uk_soc', 'professional_body', 'employer', 'industry_expert', 'government', 'academic', 'other');--> statement-breakpoint
CREATE TYPE "public"."skill_relationship_type" AS ENUM('prerequisite_of', 'specialisation_of', 'related_to', 'alternative_to', 'builds_on', 'commonly_used_with');--> statement-breakpoint
CREATE TYPE "public"."taxonomy_alias_type" AS ENUM('alternative_title', 'abbreviation', 'regional_title', 'industry_title', 'legacy_title', 'informal_title');--> statement-breakpoint
CREATE TYPE "public"."taxonomy_record_verification_status" AS ENUM('draft', 'ai_generated', 'source_mapped', 'expert_reviewed', 'employer_validated', 'published', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."taxonomy_skill_category" AS ENUM('technical', 'domain_knowledge', 'digital', 'tool', 'project_delivery', 'commercial', 'leadership', 'behavioural', 'transferable', 'regulatory', 'language');--> statement-breakpoint
CREATE TYPE "public"."taxonomy_version_status" AS ENUM('draft', 'review', 'published', 'retired');--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_refresh_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"family_id" text NOT NULL,
	"replaced_by_token_hash" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"current_role" text,
	"years_experience" integer,
	"industry" text,
	"location" text,
	"phone" text,
	"linkedin_url" text,
	"professional_summary" text,
	"preferred_learning_style" text,
	"weekly_learning_hours" integer,
	"salary_aspiration" text,
	"career_level" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "work_experiences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"company" text NOT NULL,
	"title" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"is_current" boolean DEFAULT false NOT NULL,
	"description" text,
	"skills" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "education" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"institution" text NOT NULL,
	"degree" text NOT NULL,
	"field_of_study" text,
	"start_year" integer NOT NULL,
	"end_year" integer,
	"is_current" boolean DEFAULT false NOT NULL,
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
CREATE TABLE "certifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"issuing_organization" text NOT NULL,
	"issue_date" text,
	"expiry_date" text,
	"credential_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"target_years" integer DEFAULT 5,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "career_goals_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "career_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"target_role" text NOT NULL,
	"readiness_score" integer NOT NULL,
	"profile_summary" text NOT NULL,
	"current_strengths" text NOT NULL,
	"skill_gaps" text NOT NULL,
	"experience_gaps" text NOT NULL,
	"qualification_gaps" text NOT NULL,
	"certification_recommendations" text NOT NULL,
	"suggested_projects" text NOT NULL,
	"job_progression_ladder" text NOT NULL,
	"immediate_actions" text NOT NULL,
	"year_1_priorities" text NOT NULL,
	"year_2_to_3_plan" text NOT NULL,
	"year_4_to_5_plan" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journey_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"journey_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"stage_order" integer NOT NULL,
	"title" text NOT NULL,
	"duration" text NOT NULL,
	"description" text NOT NULL,
	"resources" jsonb NOT NULL,
	"checklist" jsonb NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journeys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"analysis_id" integer,
	"selected_direction" text NOT NULL,
	"current_role" text,
	"target_role" text NOT NULL,
	"duration_months" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"generated_from" text,
	"progress" integer DEFAULT 0 NOT NULL,
	"selected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"journey_stage_id" integer,
	"checklist_item_key" text,
	"title" text NOT NULL,
	"description" text,
	"phase" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"due_date" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advisor_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"advisor_id" integer NOT NULL,
	"journey_id" integer,
	"requested_slot" text NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advisors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"rating" text NOT NULL,
	"sessions_completed" integer DEFAULT 0 NOT NULL,
	"specialisms" jsonb NOT NULL,
	"availability" text NOT NULL,
	"quote" text NOT NULL,
	"best_for" text NOT NULL,
	"session_price_pence" integer DEFAULT 3000 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"journey_id" integer,
	"frequency" text DEFAULT 'weekly' NOT NULL,
	"day_of_week" integer DEFAULT 1 NOT NULL,
	"last_sent_at" timestamp with time zone,
	"content_log" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_reminders_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"journey_id" integer NOT NULL,
	"title" text NOT NULL,
	"recipient_name" text NOT NULL,
	"completion_duration" text NOT NULL,
	"verification_token" text NOT NULL,
	"pdf_url" text,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "certificates_verification_token_unique" UNIQUE("verification_token")
);
--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"parent_family_id" uuid,
	"taxonomy_version_id" uuid NOT NULL,
	"verification_status" "taxonomy_record_verification_status" DEFAULT 'draft' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "career_families_code_not_blank" CHECK (btrim("career_families"."code") <> ''),
	CONSTRAINT "career_families_name_not_blank" CHECK (btrim("career_families"."name") <> ''),
	CONSTRAINT "career_families_slug_not_blank" CHECK (btrim("career_families"."slug") <> ''),
	CONSTRAINT "career_families_not_own_parent_chk" CHECK ("career_families"."parent_family_id" is null or "career_families"."parent_family_id" <> "career_families"."id"),
	CONSTRAINT "career_families_display_order_non_negative_chk" CHECK ("career_families"."display_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "career_taxonomy_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "taxonomy_version_status" DEFAULT 'draft' NOT NULL,
	"effective_from" timestamp with time zone,
	"effective_to" timestamp with time zone,
	"published_at" timestamp with time zone,
	"published_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "career_taxonomy_versions_version_not_blank" CHECK (btrim("career_taxonomy_versions"."version") <> ''),
	CONSTRAINT "career_taxonomy_versions_name_not_blank" CHECK (btrim("career_taxonomy_versions"."name") <> ''),
	CONSTRAINT "career_taxonomy_versions_effective_range_chk" CHECK ("career_taxonomy_versions"."effective_to" is null or "career_taxonomy_versions"."effective_from" is null or "career_taxonomy_versions"."effective_to" > "career_taxonomy_versions"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "career_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_occupation_id" uuid NOT NULL,
	"to_occupation_id" uuid NOT NULL,
	"transition_type" "career_transition_type" NOT NULL,
	"difficulty_score" integer NOT NULL,
	"transferability_score" numeric(5, 4),
	"minimum_readiness_score" numeric(5, 2),
	"typical_duration_months" integer,
	"minimum_duration_months" integer,
	"maximum_duration_months" integer,
	"description" text,
	"rationale" text,
	"country_code" text,
	"industry_context" text,
	"taxonomy_version_id" uuid NOT NULL,
	"verification_status" "taxonomy_record_verification_status" DEFAULT 'draft' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "career_transitions_distinct_occupations_chk" CHECK ("career_transitions"."from_occupation_id" <> "career_transitions"."to_occupation_id"),
	CONSTRAINT "career_transitions_difficulty_score_range_chk" CHECK ("career_transitions"."difficulty_score" between 1 and 5),
	CONSTRAINT "career_transitions_transferability_score_range_chk" CHECK ("career_transitions"."transferability_score" is null or ("career_transitions"."transferability_score" >= 0 and "career_transitions"."transferability_score" <= 1)),
	CONSTRAINT "career_transitions_minimum_readiness_score_range_chk" CHECK ("career_transitions"."minimum_readiness_score" is null or ("career_transitions"."minimum_readiness_score" >= 0 and "career_transitions"."minimum_readiness_score" <= 100)),
	CONSTRAINT "career_transitions_typical_duration_non_negative_chk" CHECK ("career_transitions"."typical_duration_months" is null or "career_transitions"."typical_duration_months" >= 0),
	CONSTRAINT "career_transitions_minimum_duration_non_negative_chk" CHECK ("career_transitions"."minimum_duration_months" is null or "career_transitions"."minimum_duration_months" >= 0),
	CONSTRAINT "career_transitions_maximum_duration_non_negative_chk" CHECK ("career_transitions"."maximum_duration_months" is null or "career_transitions"."maximum_duration_months" >= 0),
	CONSTRAINT "career_transitions_minimum_typical_duration_order_chk" CHECK ("career_transitions"."minimum_duration_months" is null or "career_transitions"."typical_duration_months" is null or "career_transitions"."minimum_duration_months" <= "career_transitions"."typical_duration_months"),
	CONSTRAINT "career_transitions_typical_maximum_duration_order_chk" CHECK ("career_transitions"."typical_duration_months" is null or "career_transitions"."maximum_duration_months" is null or "career_transitions"."typical_duration_months" <= "career_transitions"."maximum_duration_months"),
	CONSTRAINT "career_transitions_minimum_maximum_duration_order_chk" CHECK ("career_transitions"."minimum_duration_months" is null or "career_transitions"."maximum_duration_months" is null or "career_transitions"."minimum_duration_months" <= "career_transitions"."maximum_duration_months"),
	CONSTRAINT "career_transitions_country_code_length_chk" CHECK ("career_transitions"."country_code" is null or char_length("career_transitions"."country_code") = 2)
);
--> statement-breakpoint
CREATE TABLE "occupation_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occupation_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"normalised_alias" text NOT NULL,
	"alias_type" "taxonomy_alias_type" DEFAULT 'alternative_title' NOT NULL,
	"country_code" text,
	"industry_context" text,
	"language_code" text DEFAULT 'en' NOT NULL,
	"source_name" text,
	"confidence" numeric(5, 4),
	"taxonomy_version_id" uuid NOT NULL,
	"verification_status" "taxonomy_record_verification_status" DEFAULT 'draft' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "occupation_aliases_alias_not_blank" CHECK (btrim("occupation_aliases"."alias") <> ''),
	CONSTRAINT "occupation_aliases_normalised_alias_not_blank" CHECK (btrim("occupation_aliases"."normalised_alias") <> ''),
	CONSTRAINT "occupation_aliases_language_code_not_blank" CHECK (btrim("occupation_aliases"."language_code") <> ''),
	CONSTRAINT "occupation_aliases_country_code_length_chk" CHECK ("occupation_aliases"."country_code" is null or char_length("occupation_aliases"."country_code") = 2),
	CONSTRAINT "occupation_aliases_confidence_range_chk" CHECK ("occupation_aliases"."confidence" is null or ("occupation_aliases"."confidence" >= 0 and "occupation_aliases"."confidence" <= 1))
);
--> statement-breakpoint
CREATE TABLE "occupation_skill_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occupation_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"requirement_type" "occupation_skill_requirement_type" NOT NULL,
	"required_level" integer NOT NULL,
	"minimum_level" integer,
	"importance_weight" numeric(5, 4) NOT NULL,
	"years_expected" numeric(5, 2),
	"evidence_required" boolean DEFAULT true NOT NULL,
	"description" text,
	"country_code" text,
	"industry_context" text,
	"taxonomy_version_id" uuid NOT NULL,
	"verification_status" "taxonomy_record_verification_status" DEFAULT 'draft' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "occupation_skill_requirements_required_level_range_chk" CHECK ("occupation_skill_requirements"."required_level" between 1 and 5),
	CONSTRAINT "occupation_skill_requirements_minimum_level_range_chk" CHECK ("occupation_skill_requirements"."minimum_level" is null or "occupation_skill_requirements"."minimum_level" between 1 and 5),
	CONSTRAINT "occupation_skill_requirements_minimum_required_order_chk" CHECK ("occupation_skill_requirements"."minimum_level" is null or "occupation_skill_requirements"."minimum_level" <= "occupation_skill_requirements"."required_level"),
	CONSTRAINT "occupation_skill_requirements_importance_weight_range_chk" CHECK ("occupation_skill_requirements"."importance_weight" > 0 and "occupation_skill_requirements"."importance_weight" <= 1),
	CONSTRAINT "occupation_skill_requirements_years_expected_non_negative_chk" CHECK ("occupation_skill_requirements"."years_expected" is null or "occupation_skill_requirements"."years_expected" >= 0),
	CONSTRAINT "occupation_skill_requirements_country_code_length_chk" CHECK ("occupation_skill_requirements"."country_code" is null or char_length("occupation_skill_requirements"."country_code") = 2)
);
--> statement-breakpoint
CREATE TABLE "occupations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"canonical_title" text NOT NULL,
	"slug" text NOT NULL,
	"summary" text NOT NULL,
	"description" text,
	"career_family_id" uuid NOT NULL,
	"career_level" "career_level" NOT NULL,
	"country_code" text,
	"industry_context" text,
	"uk_soc_code" text,
	"onet_code" text,
	"esco_uri" text,
	"minimum_experience_years" numeric(5, 2),
	"typical_experience_years" numeric(5, 2),
	"maximum_experience_years" numeric(5, 2),
	"regulated" boolean DEFAULT false NOT NULL,
	"regulation_notes" text,
	"taxonomy_version_id" uuid NOT NULL,
	"verification_status" "taxonomy_record_verification_status" DEFAULT 'draft' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"effective_from" timestamp with time zone,
	"effective_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "occupations_code_not_blank" CHECK (btrim("occupations"."code") <> ''),
	CONSTRAINT "occupations_canonical_title_not_blank" CHECK (btrim("occupations"."canonical_title") <> ''),
	CONSTRAINT "occupations_slug_not_blank" CHECK (btrim("occupations"."slug") <> ''),
	CONSTRAINT "occupations_summary_not_blank" CHECK (btrim("occupations"."summary") <> ''),
	CONSTRAINT "occupations_country_code_length_chk" CHECK ("occupations"."country_code" is null or char_length("occupations"."country_code") = 2),
	CONSTRAINT "occupations_minimum_experience_non_negative_chk" CHECK ("occupations"."minimum_experience_years" is null or "occupations"."minimum_experience_years" >= 0),
	CONSTRAINT "occupations_typical_experience_non_negative_chk" CHECK ("occupations"."typical_experience_years" is null or "occupations"."typical_experience_years" >= 0),
	CONSTRAINT "occupations_maximum_experience_non_negative_chk" CHECK ("occupations"."maximum_experience_years" is null or "occupations"."maximum_experience_years" >= 0),
	CONSTRAINT "occupations_minimum_typical_order_chk" CHECK ("occupations"."minimum_experience_years" is null or "occupations"."typical_experience_years" is null or "occupations"."minimum_experience_years" <= "occupations"."typical_experience_years"),
	CONSTRAINT "occupations_typical_maximum_order_chk" CHECK ("occupations"."typical_experience_years" is null or "occupations"."maximum_experience_years" is null or "occupations"."typical_experience_years" <= "occupations"."maximum_experience_years"),
	CONSTRAINT "occupations_minimum_maximum_order_chk" CHECK ("occupations"."minimum_experience_years" is null or "occupations"."maximum_experience_years" is null or "occupations"."minimum_experience_years" <= "occupations"."maximum_experience_years"),
	CONSTRAINT "occupations_effective_range_chk" CHECK ("occupations"."effective_to" is null or "occupations"."effective_from" is null or "occupations"."effective_to" > "occupations"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "skill_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skill_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"normalised_alias" text NOT NULL,
	"language_code" text DEFAULT 'en' NOT NULL,
	"country_code" text,
	"industry_context" text,
	"source_name" text,
	"confidence" numeric(5, 4),
	"taxonomy_version_id" uuid NOT NULL,
	"verification_status" "taxonomy_record_verification_status" DEFAULT 'draft' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skill_aliases_alias_not_blank" CHECK (btrim("skill_aliases"."alias") <> ''),
	CONSTRAINT "skill_aliases_normalised_alias_not_blank" CHECK (btrim("skill_aliases"."normalised_alias") <> ''),
	CONSTRAINT "skill_aliases_language_code_not_blank" CHECK (btrim("skill_aliases"."language_code") <> ''),
	CONSTRAINT "skill_aliases_country_code_length_chk" CHECK ("skill_aliases"."country_code" is null or char_length("skill_aliases"."country_code") = 2),
	CONSTRAINT "skill_aliases_confidence_range_chk" CHECK ("skill_aliases"."confidence" is null or ("skill_aliases"."confidence" >= 0 and "skill_aliases"."confidence" <= 1))
);
--> statement-breakpoint
CREATE TABLE "skill_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_skill_id" uuid NOT NULL,
	"target_skill_id" uuid NOT NULL,
	"relationship_type" "skill_relationship_type" NOT NULL,
	"weight" numeric(5, 4),
	"description" text,
	"taxonomy_version_id" uuid NOT NULL,
	"verification_status" "taxonomy_record_verification_status" DEFAULT 'draft' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skill_relationships_distinct_skills_chk" CHECK ("skill_relationships"."source_skill_id" <> "skill_relationships"."target_skill_id"),
	CONSTRAINT "skill_relationships_weight_range_chk" CHECK ("skill_relationships"."weight" is null or ("skill_relationships"."weight" >= 0 and "skill_relationships"."weight" <= 1))
);
--> statement-breakpoint
CREATE TABLE "taxonomy_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"canonical_name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"skill_category" "taxonomy_skill_category" NOT NULL,
	"parent_skill_id" uuid,
	"proficiency_framework" text DEFAULT 'cpx_1_5' NOT NULL,
	"taxonomy_version_id" uuid NOT NULL,
	"verification_status" "taxonomy_record_verification_status" DEFAULT 'draft' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "taxonomy_skills_code_not_blank" CHECK (btrim("taxonomy_skills"."code") <> ''),
	CONSTRAINT "taxonomy_skills_canonical_name_not_blank" CHECK (btrim("taxonomy_skills"."canonical_name") <> ''),
	CONSTRAINT "taxonomy_skills_slug_not_blank" CHECK (btrim("taxonomy_skills"."slug") <> ''),
	CONSTRAINT "taxonomy_skills_description_not_blank" CHECK (btrim("taxonomy_skills"."description") <> ''),
	CONSTRAINT "taxonomy_skills_proficiency_framework_not_blank" CHECK (btrim("taxonomy_skills"."proficiency_framework") <> ''),
	CONSTRAINT "taxonomy_skills_not_own_parent_chk" CHECK ("taxonomy_skills"."parent_skill_id" is null or "taxonomy_skills"."parent_skill_id" <> "taxonomy_skills"."id")
);
--> statement-breakpoint
CREATE TABLE "taxonomy_source_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"source_type" "provenance_source_type" NOT NULL,
	"source_name" text NOT NULL,
	"source_record_id" text,
	"source_url" text,
	"source_version" text,
	"licence_name" text,
	"licence_url" text,
	"retrieved_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "taxonomy_source_references_entity_type_not_blank" CHECK (btrim("taxonomy_source_references"."entity_type") <> ''),
	CONSTRAINT "taxonomy_source_references_source_name_not_blank" CHECK (btrim("taxonomy_source_references"."source_name") <> '')
);
--> statement-breakpoint
CREATE TABLE "career_data_advisor_grants" (
	"id" text PRIMARY KEY NOT NULL,
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
	"scopes" jsonb NOT NULL,
	"status" text NOT NULL,
	"granted_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "career_data_assessment_items" (
	"id" text PRIMARY KEY NOT NULL,
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
	"assessment_id" text NOT NULL,
	"item_type" text NOT NULL,
	"skill_code" text,
	"category" text NOT NULL,
	"priority" text,
	"data" jsonb NOT NULL,
	"source_references" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_data_assessments" (
	"id" text PRIMARY KEY NOT NULL,
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
	"profile_id" text NOT NULL,
	"goal_id" text NOT NULL,
	"previous_assessment_id" text,
	"taxonomy_version" text NOT NULL,
	"engine_version" text NOT NULL,
	"assessment_version" text NOT NULL,
	"overall_score" integer NOT NULL,
	"skill_score" integer NOT NULL,
	"experience_score" integer NOT NULL,
	"qualification_score" integer NOT NULL,
	"readiness_band" text NOT NULL,
	"confidence_basis_points" integer NOT NULL,
	"blockers" jsonb NOT NULL,
	"quick_wins" jsonb NOT NULL,
	"evidence" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_data_audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" integer NOT NULL,
	"actor_user_id" integer NOT NULL,
	"subject_user_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"request_id" text NOT NULL,
	"outcome" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"retention_class" text DEFAULT 'audit_event' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_data_corrections" (
	"id" text PRIMARY KEY NOT NULL,
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
	"profile_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"field_path" text NOT NULL,
	"original_value" jsonb,
	"corrected_value" jsonb,
	"corrected_at" timestamp with time zone NOT NULL,
	"correction_reason" text NOT NULL,
	"review_status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_data_deletion_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL,
	"state" text NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"scheduled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failure_category" text,
	"retry_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_data_documents" (
	"id" text PRIMARY KEY NOT NULL,
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
	"original_filename" text NOT NULL,
	"safe_filename" text NOT NULL,
	"detected_mime_type" text,
	"declared_mime_type" text NOT NULL,
	"file_size_bytes" bigint NOT NULL,
	"checksum" text NOT NULL,
	"storage_provider" text,
	"storage_object_key" text,
	"upload_status" text NOT NULL,
	"scan_status" text NOT NULL,
	"parse_status" text NOT NULL,
	"retention_mode" text NOT NULL,
	"expires_at" timestamp with time zone,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"parsed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "career_data_evidence" (
	"id" text PRIMARY KEY NOT NULL,
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
	"profile_id" text NOT NULL,
	"plan_id" text,
	"action_id" text,
	"evidence_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"verification_status" text NOT NULL,
	"source_document_id" text,
	"external_reference" text,
	"linked_skill_codes" jsonb NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by" integer
);
--> statement-breakpoint
CREATE TABLE "career_data_exports" (
	"id" text PRIMARY KEY NOT NULL,
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
	"format" text NOT NULL,
	"status" text NOT NULL,
	"storage_provider" text,
	"storage_object_key" text,
	"checksum" text,
	"expires_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "career_data_goals" (
	"id" text PRIMARY KEY NOT NULL,
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
	"profile_id" text NOT NULL,
	"goal_version" text NOT NULL,
	"goal_type" text NOT NULL,
	"current_occupation_code" text,
	"target_occupation_code" text,
	"target_occupation_text" text,
	"target_career_family" text,
	"target_level" text,
	"target_date" timestamp with time zone,
	"time_horizon_months" integer NOT NULL,
	"constraints" jsonb NOT NULL,
	"preferences" jsonb NOT NULL,
	"motivation" text,
	"resolution_state" text NOT NULL,
	"confirmation" jsonb,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_data_idempotency" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" integer NOT NULL,
	"operation" text NOT NULL,
	"idempotency_key_hash" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_data_personal_data" (
	"id" text PRIMARY KEY NOT NULL,
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
	"profile_id" text NOT NULL,
	"full_name" text,
	"email" text,
	"telephone" text,
	"postal_address" text,
	"personal_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"credential_identifiers" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_data_plan_dependencies" (
	"id" text PRIMARY KEY NOT NULL,
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
	"plan_id" text NOT NULL,
	"from_item_id" text NOT NULL,
	"to_item_id" text NOT NULL,
	"dependency_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_data_plan_items" (
	"id" text PRIMARY KEY NOT NULL,
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
	"plan_id" text NOT NULL,
	"item_type" text NOT NULL,
	"status" text NOT NULL,
	"verification_status" text,
	"ordinal" integer NOT NULL,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_data_plans" (
	"id" text PRIMARY KEY NOT NULL,
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
	"plan_series_id" text NOT NULL,
	"revision_number" integer NOT NULL,
	"profile_id" text NOT NULL,
	"goal_id" text NOT NULL,
	"assessment_id" text NOT NULL,
	"supersedes_plan_id" text,
	"status" text NOT NULL,
	"summary" text NOT NULL,
	"taxonomy_version" text NOT NULL,
	"engine_version" text NOT NULL,
	"change_reason" text,
	"assumptions" jsonb NOT NULL,
	"constraints" jsonb NOT NULL,
	"framework_status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_data_profile_entities" (
	"id" text PRIMARY KEY NOT NULL,
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
	"profile_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"ordinal" integer DEFAULT 0 NOT NULL,
	"canonical_code" text,
	"taxonomy_version" text,
	"data" jsonb NOT NULL,
	"source_references" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_data_profiles" (
	"id" text PRIMARY KEY NOT NULL,
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
	"profile_version" text NOT NULL,
	"status" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"completeness" jsonb NOT NULL,
	"confidence" jsonb NOT NULL,
	"validation_status" text NOT NULL,
	"source_document_ids" jsonb NOT NULL,
	"active" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_refresh_tokens" ADD CONSTRAINT "auth_refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_experiences" ADD CONSTRAINT "work_experiences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "education" ADD CONSTRAINT "education_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_goals" ADD CONSTRAINT "career_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_analyses" ADD CONSTRAINT "career_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_stages" ADD CONSTRAINT "journey_stages_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_stages" ADD CONSTRAINT "journey_stages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_analysis_id_career_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."career_analyses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_journey_stage_id_journey_stages_id_fk" FOREIGN KEY ("journey_stage_id") REFERENCES "public"."journey_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_bookings" ADD CONSTRAINT "advisor_bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_bookings" ADD CONSTRAINT "advisor_bookings_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_bookings" ADD CONSTRAINT "advisor_bookings_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_reminders" ADD CONSTRAINT "weekly_reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_reminders" ADD CONSTRAINT "weekly_reminders_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_families" ADD CONSTRAINT "career_families_parent_family_id_career_families_id_fk" FOREIGN KEY ("parent_family_id") REFERENCES "public"."career_families"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_families" ADD CONSTRAINT "career_families_taxonomy_version_id_career_taxonomy_versions_id_fk" FOREIGN KEY ("taxonomy_version_id") REFERENCES "public"."career_taxonomy_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_transitions" ADD CONSTRAINT "career_transitions_from_occupation_id_occupations_id_fk" FOREIGN KEY ("from_occupation_id") REFERENCES "public"."occupations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_transitions" ADD CONSTRAINT "career_transitions_to_occupation_id_occupations_id_fk" FOREIGN KEY ("to_occupation_id") REFERENCES "public"."occupations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_transitions" ADD CONSTRAINT "career_transitions_taxonomy_version_id_career_taxonomy_versions_id_fk" FOREIGN KEY ("taxonomy_version_id") REFERENCES "public"."career_taxonomy_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occupation_aliases" ADD CONSTRAINT "occupation_aliases_occupation_id_occupations_id_fk" FOREIGN KEY ("occupation_id") REFERENCES "public"."occupations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occupation_aliases" ADD CONSTRAINT "occupation_aliases_taxonomy_version_id_career_taxonomy_versions_id_fk" FOREIGN KEY ("taxonomy_version_id") REFERENCES "public"."career_taxonomy_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occupation_skill_requirements" ADD CONSTRAINT "occupation_skill_requirements_occupation_id_occupations_id_fk" FOREIGN KEY ("occupation_id") REFERENCES "public"."occupations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occupation_skill_requirements" ADD CONSTRAINT "occupation_skill_requirements_skill_id_taxonomy_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."taxonomy_skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occupation_skill_requirements" ADD CONSTRAINT "occupation_skill_requirements_taxonomy_version_id_career_taxonomy_versions_id_fk" FOREIGN KEY ("taxonomy_version_id") REFERENCES "public"."career_taxonomy_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occupations" ADD CONSTRAINT "occupations_career_family_id_career_families_id_fk" FOREIGN KEY ("career_family_id") REFERENCES "public"."career_families"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occupations" ADD CONSTRAINT "occupations_taxonomy_version_id_career_taxonomy_versions_id_fk" FOREIGN KEY ("taxonomy_version_id") REFERENCES "public"."career_taxonomy_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_aliases" ADD CONSTRAINT "skill_aliases_skill_id_taxonomy_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."taxonomy_skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_aliases" ADD CONSTRAINT "skill_aliases_taxonomy_version_id_career_taxonomy_versions_id_fk" FOREIGN KEY ("taxonomy_version_id") REFERENCES "public"."career_taxonomy_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_relationships" ADD CONSTRAINT "skill_relationships_source_skill_id_taxonomy_skills_id_fk" FOREIGN KEY ("source_skill_id") REFERENCES "public"."taxonomy_skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_relationships" ADD CONSTRAINT "skill_relationships_target_skill_id_taxonomy_skills_id_fk" FOREIGN KEY ("target_skill_id") REFERENCES "public"."taxonomy_skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_relationships" ADD CONSTRAINT "skill_relationships_taxonomy_version_id_career_taxonomy_versions_id_fk" FOREIGN KEY ("taxonomy_version_id") REFERENCES "public"."career_taxonomy_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_skills" ADD CONSTRAINT "taxonomy_skills_parent_skill_id_taxonomy_skills_id_fk" FOREIGN KEY ("parent_skill_id") REFERENCES "public"."taxonomy_skills"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_skills" ADD CONSTRAINT "taxonomy_skills_taxonomy_version_id_career_taxonomy_versions_id_fk" FOREIGN KEY ("taxonomy_version_id") REFERENCES "public"."career_taxonomy_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_grants" ADD CONSTRAINT "career_data_advisor_grants_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_grants" ADD CONSTRAINT "career_data_advisor_grants_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_grants" ADD CONSTRAINT "career_data_advisor_grants_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_grants" ADD CONSTRAINT "career_data_advisor_grants_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_advisor_grants" ADD CONSTRAINT "career_data_advisor_grants_advisor_user_id_users_id_fk" FOREIGN KEY ("advisor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_assessment_items" ADD CONSTRAINT "career_data_assessment_items_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_assessment_items" ADD CONSTRAINT "career_data_assessment_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_assessment_items" ADD CONSTRAINT "career_data_assessment_items_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_assessment_items" ADD CONSTRAINT "career_data_assessment_items_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_assessment_items" ADD CONSTRAINT "career_data_assessment_items_assessment_id_career_data_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."career_data_assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_assessments" ADD CONSTRAINT "career_data_assessments_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_assessments" ADD CONSTRAINT "career_data_assessments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_assessments" ADD CONSTRAINT "career_data_assessments_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_assessments" ADD CONSTRAINT "career_data_assessments_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_assessments" ADD CONSTRAINT "career_data_assessments_profile_id_career_data_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."career_data_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_assessments" ADD CONSTRAINT "career_data_assessments_goal_id_career_data_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."career_data_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_audit_events" ADD CONSTRAINT "career_data_audit_events_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_audit_events" ADD CONSTRAINT "career_data_audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_audit_events" ADD CONSTRAINT "career_data_audit_events_subject_user_id_users_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_corrections" ADD CONSTRAINT "career_data_corrections_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_corrections" ADD CONSTRAINT "career_data_corrections_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_corrections" ADD CONSTRAINT "career_data_corrections_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_corrections" ADD CONSTRAINT "career_data_corrections_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_corrections" ADD CONSTRAINT "career_data_corrections_profile_id_career_data_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."career_data_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_deletion_requests" ADD CONSTRAINT "career_data_deletion_requests_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_deletion_requests" ADD CONSTRAINT "career_data_deletion_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_deletion_requests" ADD CONSTRAINT "career_data_deletion_requests_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_documents" ADD CONSTRAINT "career_data_documents_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_documents" ADD CONSTRAINT "career_data_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_documents" ADD CONSTRAINT "career_data_documents_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_documents" ADD CONSTRAINT "career_data_documents_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_evidence" ADD CONSTRAINT "career_data_evidence_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_evidence" ADD CONSTRAINT "career_data_evidence_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_evidence" ADD CONSTRAINT "career_data_evidence_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_evidence" ADD CONSTRAINT "career_data_evidence_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_evidence" ADD CONSTRAINT "career_data_evidence_profile_id_career_data_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."career_data_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_evidence" ADD CONSTRAINT "career_data_evidence_plan_id_career_data_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."career_data_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_evidence" ADD CONSTRAINT "career_data_evidence_source_document_id_career_data_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."career_data_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_evidence" ADD CONSTRAINT "career_data_evidence_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_exports" ADD CONSTRAINT "career_data_exports_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_exports" ADD CONSTRAINT "career_data_exports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_exports" ADD CONSTRAINT "career_data_exports_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_exports" ADD CONSTRAINT "career_data_exports_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_goals" ADD CONSTRAINT "career_data_goals_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_goals" ADD CONSTRAINT "career_data_goals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_goals" ADD CONSTRAINT "career_data_goals_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_goals" ADD CONSTRAINT "career_data_goals_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_goals" ADD CONSTRAINT "career_data_goals_profile_id_career_data_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."career_data_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_idempotency" ADD CONSTRAINT "career_data_idempotency_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_personal_data" ADD CONSTRAINT "career_data_personal_data_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_personal_data" ADD CONSTRAINT "career_data_personal_data_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_personal_data" ADD CONSTRAINT "career_data_personal_data_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_personal_data" ADD CONSTRAINT "career_data_personal_data_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_personal_data" ADD CONSTRAINT "career_data_personal_data_profile_id_career_data_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."career_data_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_plan_dependencies" ADD CONSTRAINT "career_data_plan_dependencies_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_plan_dependencies" ADD CONSTRAINT "career_data_plan_dependencies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_plan_dependencies" ADD CONSTRAINT "career_data_plan_dependencies_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_plan_dependencies" ADD CONSTRAINT "career_data_plan_dependencies_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_plan_dependencies" ADD CONSTRAINT "career_data_plan_dependencies_plan_id_career_data_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."career_data_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_plan_items" ADD CONSTRAINT "career_data_plan_items_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_plan_items" ADD CONSTRAINT "career_data_plan_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_plan_items" ADD CONSTRAINT "career_data_plan_items_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_plan_items" ADD CONSTRAINT "career_data_plan_items_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_plan_items" ADD CONSTRAINT "career_data_plan_items_plan_id_career_data_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."career_data_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_plans" ADD CONSTRAINT "career_data_plans_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_plans" ADD CONSTRAINT "career_data_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_plans" ADD CONSTRAINT "career_data_plans_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_plans" ADD CONSTRAINT "career_data_plans_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_plans" ADD CONSTRAINT "career_data_plans_profile_id_career_data_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."career_data_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_plans" ADD CONSTRAINT "career_data_plans_goal_id_career_data_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."career_data_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_plans" ADD CONSTRAINT "career_data_plans_assessment_id_career_data_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."career_data_assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_profile_entities" ADD CONSTRAINT "career_data_profile_entities_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_profile_entities" ADD CONSTRAINT "career_data_profile_entities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_profile_entities" ADD CONSTRAINT "career_data_profile_entities_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_profile_entities" ADD CONSTRAINT "career_data_profile_entities_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_profile_entities" ADD CONSTRAINT "career_data_profile_entities_profile_id_career_data_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."career_data_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_profiles" ADD CONSTRAINT "career_data_profiles_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_profiles" ADD CONSTRAINT "career_data_profiles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_profiles" ADD CONSTRAINT "career_data_profiles_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_data_profiles" ADD CONSTRAINT "career_data_profiles_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_refresh_tokens_token_hash_idx" ON "auth_refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_refresh_tokens_user_id_idx" ON "auth_refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_refresh_tokens_family_id_idx" ON "auth_refresh_tokens" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "career_families_code_uidx" ON "career_families" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "career_families_slug_uidx" ON "career_families" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "career_families_parent_family_id_idx" ON "career_families" USING btree ("parent_family_id");--> statement-breakpoint
CREATE INDEX "career_families_taxonomy_version_id_idx" ON "career_families" USING btree ("taxonomy_version_id");--> statement-breakpoint
CREATE INDEX "career_families_verification_status_idx" ON "career_families" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "career_families_is_active_idx" ON "career_families" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "career_taxonomy_versions_version_uidx" ON "career_taxonomy_versions" USING btree ("version");--> statement-breakpoint
CREATE INDEX "career_taxonomy_versions_status_idx" ON "career_taxonomy_versions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "career_taxonomy_versions_effective_from_idx" ON "career_taxonomy_versions" USING btree ("effective_from");--> statement-breakpoint
CREATE INDEX "career_taxonomy_versions_effective_to_idx" ON "career_taxonomy_versions" USING btree ("effective_to");--> statement-breakpoint
CREATE INDEX "career_transitions_from_occupation_id_idx" ON "career_transitions" USING btree ("from_occupation_id");--> statement-breakpoint
CREATE INDEX "career_transitions_to_occupation_id_idx" ON "career_transitions" USING btree ("to_occupation_id");--> statement-breakpoint
CREATE INDEX "career_transitions_transition_type_idx" ON "career_transitions" USING btree ("transition_type");--> statement-breakpoint
CREATE INDEX "career_transitions_taxonomy_version_id_idx" ON "career_transitions" USING btree ("taxonomy_version_id");--> statement-breakpoint
CREATE INDEX "career_transitions_from_active_idx" ON "career_transitions" USING btree ("from_occupation_id","is_active");--> statement-breakpoint
CREATE INDEX "career_transitions_to_active_idx" ON "career_transitions" USING btree ("to_occupation_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "career_transitions_context_uidx" ON "career_transitions" USING btree ("from_occupation_id","to_occupation_id","transition_type",coalesce("country_code", ''),coalesce("industry_context", ''),"taxonomy_version_id");--> statement-breakpoint
CREATE INDEX "occupation_aliases_occupation_id_idx" ON "occupation_aliases" USING btree ("occupation_id");--> statement-breakpoint
CREATE INDEX "occupation_aliases_normalised_alias_idx" ON "occupation_aliases" USING btree ("normalised_alias");--> statement-breakpoint
CREATE INDEX "occupation_aliases_country_code_idx" ON "occupation_aliases" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "occupation_aliases_industry_context_idx" ON "occupation_aliases" USING btree ("industry_context");--> statement-breakpoint
CREATE INDEX "occupation_aliases_taxonomy_version_id_idx" ON "occupation_aliases" USING btree ("taxonomy_version_id");--> statement-breakpoint
CREATE INDEX "occupation_aliases_is_active_idx" ON "occupation_aliases" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "occupation_aliases_context_uidx" ON "occupation_aliases" USING btree ("occupation_id","normalised_alias","language_code",coalesce("country_code", ''),coalesce("industry_context", ''));--> statement-breakpoint
CREATE INDEX "occupation_skill_requirements_occupation_id_idx" ON "occupation_skill_requirements" USING btree ("occupation_id");--> statement-breakpoint
CREATE INDEX "occupation_skill_requirements_skill_id_idx" ON "occupation_skill_requirements" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "occupation_skill_requirements_requirement_type_idx" ON "occupation_skill_requirements" USING btree ("requirement_type");--> statement-breakpoint
CREATE INDEX "occupation_skill_requirements_taxonomy_version_id_idx" ON "occupation_skill_requirements" USING btree ("taxonomy_version_id");--> statement-breakpoint
CREATE INDEX "occupation_skill_requirements_occupation_requirement_idx" ON "occupation_skill_requirements" USING btree ("occupation_id","requirement_type");--> statement-breakpoint
CREATE INDEX "occupation_skill_requirements_occupation_active_idx" ON "occupation_skill_requirements" USING btree ("occupation_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "occupation_skill_requirements_context_uidx" ON "occupation_skill_requirements" USING btree ("occupation_id","skill_id","requirement_type",coalesce("country_code", ''),coalesce("industry_context", ''),"taxonomy_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "occupations_code_uidx" ON "occupations" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "occupations_slug_uidx" ON "occupations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "occupations_canonical_title_idx" ON "occupations" USING btree ("canonical_title");--> statement-breakpoint
CREATE INDEX "occupations_career_family_id_idx" ON "occupations" USING btree ("career_family_id");--> statement-breakpoint
CREATE INDEX "occupations_career_level_idx" ON "occupations" USING btree ("career_level");--> statement-breakpoint
CREATE INDEX "occupations_country_code_idx" ON "occupations" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "occupations_uk_soc_code_idx" ON "occupations" USING btree ("uk_soc_code");--> statement-breakpoint
CREATE INDEX "occupations_onet_code_idx" ON "occupations" USING btree ("onet_code");--> statement-breakpoint
CREATE INDEX "occupations_taxonomy_version_id_idx" ON "occupations" USING btree ("taxonomy_version_id");--> statement-breakpoint
CREATE INDEX "occupations_verification_status_idx" ON "occupations" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "occupations_is_active_idx" ON "occupations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "occupations_active_family_level_idx" ON "occupations" USING btree ("is_active","career_family_id","career_level");--> statement-breakpoint
CREATE INDEX "skill_aliases_skill_id_idx" ON "skill_aliases" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "skill_aliases_normalised_alias_idx" ON "skill_aliases" USING btree ("normalised_alias");--> statement-breakpoint
CREATE INDEX "skill_aliases_taxonomy_version_id_idx" ON "skill_aliases" USING btree ("taxonomy_version_id");--> statement-breakpoint
CREATE INDEX "skill_aliases_is_active_idx" ON "skill_aliases" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "skill_aliases_context_uidx" ON "skill_aliases" USING btree ("skill_id","normalised_alias","language_code",coalesce("country_code", ''),coalesce("industry_context", ''));--> statement-breakpoint
CREATE INDEX "skill_relationships_source_skill_id_idx" ON "skill_relationships" USING btree ("source_skill_id");--> statement-breakpoint
CREATE INDEX "skill_relationships_target_skill_id_idx" ON "skill_relationships" USING btree ("target_skill_id");--> statement-breakpoint
CREATE INDEX "skill_relationships_relationship_type_idx" ON "skill_relationships" USING btree ("relationship_type");--> statement-breakpoint
CREATE INDEX "skill_relationships_taxonomy_version_id_idx" ON "skill_relationships" USING btree ("taxonomy_version_id");--> statement-breakpoint
CREATE INDEX "skill_relationships_source_relationship_idx" ON "skill_relationships" USING btree ("source_skill_id","relationship_type");--> statement-breakpoint
CREATE UNIQUE INDEX "skill_relationships_context_uidx" ON "skill_relationships" USING btree ("source_skill_id","target_skill_id","relationship_type","taxonomy_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "taxonomy_skills_code_uidx" ON "taxonomy_skills" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "taxonomy_skills_slug_uidx" ON "taxonomy_skills" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "taxonomy_skills_canonical_name_idx" ON "taxonomy_skills" USING btree ("canonical_name");--> statement-breakpoint
CREATE INDEX "taxonomy_skills_skill_category_idx" ON "taxonomy_skills" USING btree ("skill_category");--> statement-breakpoint
CREATE INDEX "taxonomy_skills_parent_skill_id_idx" ON "taxonomy_skills" USING btree ("parent_skill_id");--> statement-breakpoint
CREATE INDEX "taxonomy_skills_taxonomy_version_id_idx" ON "taxonomy_skills" USING btree ("taxonomy_version_id");--> statement-breakpoint
CREATE INDEX "taxonomy_skills_verification_status_idx" ON "taxonomy_skills" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "taxonomy_skills_is_active_idx" ON "taxonomy_skills" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "taxonomy_source_references_entity_idx" ON "taxonomy_source_references" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "taxonomy_source_references_source_type_idx" ON "taxonomy_source_references" USING btree ("source_type");--> statement-breakpoint
CREATE UNIQUE INDEX "taxonomy_source_references_source_record_uidx" ON "taxonomy_source_references" USING btree ("entity_type","entity_id","source_type","source_name",coalesce("source_record_id", ''),coalesce("source_url", ''));--> statement-breakpoint
CREATE INDEX "career_data_grants_owner_idx" ON "career_data_advisor_grants" USING btree ("owner_user_id","status");--> statement-breakpoint
CREATE INDEX "career_data_grants_advisor_idx" ON "career_data_advisor_grants" USING btree ("advisor_user_id","status","expires_at");--> statement-breakpoint
CREATE INDEX "career_data_assessment_items_owner_idx" ON "career_data_assessment_items" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "career_data_assessment_items_assessment_idx" ON "career_data_assessment_items" USING btree ("assessment_id","item_type");--> statement-breakpoint
CREATE INDEX "career_data_assessments_owner_idx" ON "career_data_assessments" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "career_data_assessments_goal_idx" ON "career_data_assessments" USING btree ("goal_id","created_at");--> statement-breakpoint
CREATE INDEX "career_data_audit_owner_idx" ON "career_data_audit_events" USING btree ("owner_user_id","timestamp");--> statement-breakpoint
CREATE INDEX "career_data_audit_resource_idx" ON "career_data_audit_events" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "career_data_corrections_owner_idx" ON "career_data_corrections" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "career_data_corrections_entity_idx" ON "career_data_corrections" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "career_data_deletion_owner_idx" ON "career_data_deletion_requests" USING btree ("owner_user_id","state");--> statement-breakpoint
CREATE INDEX "career_data_deletion_schedule_idx" ON "career_data_deletion_requests" USING btree ("state","scheduled_at");--> statement-breakpoint
CREATE INDEX "career_data_documents_owner_idx" ON "career_data_documents" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "career_data_documents_expiry_idx" ON "career_data_documents" USING btree ("expires_at","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "career_data_documents_owner_checksum_idx" ON "career_data_documents" USING btree ("owner_user_id","checksum");--> statement-breakpoint
CREATE INDEX "career_data_evidence_owner_idx" ON "career_data_evidence" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "career_data_evidence_plan_idx" ON "career_data_evidence" USING btree ("plan_id","action_id");--> statement-breakpoint
CREATE INDEX "career_data_exports_owner_idx" ON "career_data_exports" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "career_data_exports_expiry_idx" ON "career_data_exports" USING btree ("expires_at","deleted_at");--> statement-breakpoint
CREATE INDEX "career_data_goals_owner_idx" ON "career_data_goals" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "career_data_goals_status_idx" ON "career_data_goals" USING btree ("owner_user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "career_data_idempotency_key_idx" ON "career_data_idempotency" USING btree ("owner_user_id","operation","idempotency_key_hash");--> statement-breakpoint
CREATE INDEX "career_data_idempotency_expiry_idx" ON "career_data_idempotency" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "career_data_personal_profile_idx" ON "career_data_personal_data" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "career_data_personal_owner_idx" ON "career_data_personal_data" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "career_data_dependencies_owner_idx" ON "career_data_plan_dependencies" USING btree ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "career_data_dependencies_edge_idx" ON "career_data_plan_dependencies" USING btree ("plan_id","from_item_id","to_item_id");--> statement-breakpoint
CREATE INDEX "career_data_plan_items_owner_idx" ON "career_data_plan_items" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "career_data_plan_items_plan_idx" ON "career_data_plan_items" USING btree ("plan_id","item_type","ordinal");--> statement-breakpoint
CREATE INDEX "career_data_plans_owner_idx" ON "career_data_plans" USING btree ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "career_data_plans_series_revision_idx" ON "career_data_plans" USING btree ("plan_series_id","revision_number");--> statement-breakpoint
CREATE INDEX "career_data_plans_profile_idx" ON "career_data_plans" USING btree ("profile_id","created_at");--> statement-breakpoint
CREATE INDEX "career_data_profile_entities_owner_idx" ON "career_data_profile_entities" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "career_data_profile_entities_profile_idx" ON "career_data_profile_entities" USING btree ("profile_id","entity_type");--> statement-breakpoint
CREATE INDEX "career_data_profiles_owner_idx" ON "career_data_profiles" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "career_data_profiles_status_idx" ON "career_data_profiles" USING btree ("owner_user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "career_data_profiles_one_active_idx" ON "career_data_profiles" USING btree ("owner_user_id") WHERE "career_data_profiles"."active" = true;--> statement-breakpoint
CREATE INDEX "career_data_profiles_retention_idx" ON "career_data_profiles" USING btree ("retention_class","deleted_at");