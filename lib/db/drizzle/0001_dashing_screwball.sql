CREATE TABLE "career_data_rate_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" integer NOT NULL,
	"endpoint_class" text NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "career_data_rate_limits" ADD CONSTRAINT "career_data_rate_limits_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "career_data_rate_limit_window_idx" ON "career_data_rate_limits" USING btree ("owner_user_id","endpoint_class","window_started_at");--> statement-breakpoint
CREATE INDEX "career_data_rate_limit_cleanup_idx" ON "career_data_rate_limits" USING btree ("window_started_at");