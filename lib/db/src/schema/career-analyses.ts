import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const careerAnalysesTable = pgTable("career_analyses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  targetRole: text("target_role").notNull(),
  readinessScore: integer("readiness_score").notNull(),
  profileSummary: text("profile_summary").notNull(),
  currentStrengths: text("current_strengths").notNull(),
  skillGaps: text("skill_gaps").notNull(),
  experienceGaps: text("experience_gaps").notNull(),
  qualificationGaps: text("qualification_gaps").notNull(),
  certificationRecommendations: text("certification_recommendations").notNull(),
  suggestedProjects: text("suggested_projects").notNull(),
  jobProgressionLadder: text("job_progression_ladder").notNull(),
  immediateActions: text("immediate_actions").notNull(),
  year1Priorities: text("year_1_priorities").notNull(),
  year2To3Plan: text("year_2_to_3_plan").notNull(),
  year4To5Plan: text("year_4_to_5_plan").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCareerAnalysisSchema = createInsertSchema(careerAnalysesTable).omit({ id: true, createdAt: true });
export type InsertCareerAnalysis = z.infer<typeof insertCareerAnalysisSchema>;
export type CareerAnalysis = typeof careerAnalysesTable.$inferSelect;
