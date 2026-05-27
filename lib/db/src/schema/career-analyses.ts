import { sql } from "drizzle-orm";
import { pgTable, text, serial, timestamp, integer, jsonb, check } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export type ReadinessSubScores = {
  skillsCoverage: number;
  experienceDepth: number;
  qualificationFit: number;
  leadershipReadiness: number;
};

export type StructuredStrength = {
  title: string;
  evidence: string;
  category: string;
};

export type StructuredSkillGap = {
  skill: string;
  priority: "High" | "Medium" | "Low";
  category: string;
  currentLevel: string | null;
  requiredLevel: string;
  rationale: string;
};

export type StructuredAction = {
  title: string;
  timeframe: string;
  outcome: string;
};

export type StructuredRoadmapPhase = {
  sequence: number;
  label: string;
  timeframeMonths: number;
  focus: string;
  actions: string[];
};

export type ProfileSnapshot = {
  profile: unknown;
  careerGoal: unknown;
  skills: unknown[];
  workExperience: unknown[];
  education: unknown[];
  certifications: unknown[];
};

export const careerAnalysesTable = pgTable("career_analyses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  targetRole: text("target_role").notNull(),
  readinessScore: integer("readiness_score").notNull(),
  readinessSubScores: jsonb("readiness_sub_scores").$type<ReadinessSubScores>().notNull(),
  profileSummary: text("profile_summary").notNull(),
  currentStrengths: text("current_strengths").notNull(),
  currentStrengthsStructured: jsonb("current_strengths_structured").$type<StructuredStrength[]>().notNull(),
  skillGaps: text("skill_gaps").notNull(),
  skillGapsStructured: jsonb("skill_gaps_structured").$type<StructuredSkillGap[]>().notNull(),
  experienceGaps: text("experience_gaps").notNull(),
  qualificationGaps: text("qualification_gaps").notNull(),
  certificationRecommendations: text("certification_recommendations").notNull(),
  suggestedProjects: text("suggested_projects").notNull(),
  jobProgressionLadder: text("job_progression_ladder").notNull(),
  immediateActions: text("immediate_actions").notNull(),
  immediateActionsStructured: jsonb("immediate_actions_structured").$type<StructuredAction[]>().notNull(),
  year1Priorities: text("year_1_priorities").notNull(),
  year2To3Plan: text("year_2_to_3_plan").notNull(),
  year4To5Plan: text("year_4_to_5_plan").notNull(),
  roadmapPhases: jsonb("roadmap_phases").$type<StructuredRoadmapPhase[]>().notNull(),
  modelName: text("model_name").notNull().default("deterministic-rubric-v1"),
  promptVersion: text("prompt_version").notNull().default("local-rubric-2026-05"),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  latencyMs: integer("latency_ms").notNull().default(0),
  profileSnapshot: jsonb("profile_snapshot").$type<ProfileSnapshot>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("career_analyses_readiness_score_range", sql`${table.readinessScore} between 0 and 100`),
]);

export const insertCareerAnalysisSchema = createInsertSchema(careerAnalysesTable).omit({ id: true, createdAt: true });
export type InsertCareerAnalysis = z.infer<typeof insertCareerAnalysisSchema>;
export type CareerAnalysis = typeof careerAnalysesTable.$inferSelect;
