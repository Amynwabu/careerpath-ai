import { sql } from "drizzle-orm";
import { check, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export type ReadinessSubScores = {
  profile: number;
  skills: number;
  experience: number;
  education: number;
  certifications: number;
};

export type StructuredInsight = {
  title: string;
  detail: string;
  priority?: "High" | "Medium" | "Low";
  category?: string;
  skillCode?: string;
  skillLabel?: string;
};

export type RoadmapPhase = {
  label: string;
  timeframe: string;
  focus: string;
  actions: string[];
};

export type LearningCourseSnapshot = {
  id: string;
  provider: string;
  title: string;
  url: string;
  skills: string[];
  level: "beginner" | "intermediate" | "advanced";
  cost: "free" | "freemium" | "paid";
  durationHours: number;
  format: "course" | "specialization" | "certificate" | "tutorial" | "playlist";
  description: string;
  matchedSkills: string[];
  matchReason: string;
  score: number;
};

export type LearningRecommendationGroup = {
  sourceType: "skill-gap" | "roadmap-phase";
  sourceId: string;
  sourceLabel: string;
  priority?: "High" | "Medium" | "Low";
  timeframe?: string;
  skillCode?: string;
  skillLabel?: string;
  courses: LearningCourseSnapshot[];
};

export type AnalysisProfileSnapshot = {
  currentRole: string | null;
  totalExperienceMonths: number | null;
  industry: string | null;
  careerLevel: string | null;
  weeklyLearningMinutes: number | null;
  skills: string[];
  workExperienceCount: number;
  educationCount: number;
  certificationCount: number;
};

const emptyJsonArray = sql`'[]'::jsonb`;
const emptyJsonObject = sql`'{}'::jsonb`;

export const careerAnalysesTable = pgTable(
  "career_analyses",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    targetRole: text("target_role").notNull(),
    readinessScore: integer("readiness_score").notNull(),
    readinessSubScores: jsonb("readiness_sub_scores").$type<ReadinessSubScores>().notNull().default(emptyJsonObject),
    profileSummary: text("profile_summary").notNull(),
    currentStrengths: text("current_strengths").notNull(),
    currentStrengthsStructured: jsonb("current_strengths_structured").$type<StructuredInsight[]>().notNull().default(emptyJsonArray),
    skillGaps: text("skill_gaps").notNull(),
    skillGapsStructured: jsonb("skill_gaps_structured").$type<StructuredInsight[]>().notNull().default(emptyJsonArray),
    experienceGaps: text("experience_gaps").notNull(),
    qualificationGaps: text("qualification_gaps").notNull(),
    certificationRecommendations: text("certification_recommendations").notNull(),
    suggestedProjects: text("suggested_projects").notNull(),
    jobProgressionLadder: text("job_progression_ladder").notNull(),
    immediateActions: text("immediate_actions").notNull(),
    immediateActionsStructured: jsonb("immediate_actions_structured").$type<StructuredInsight[]>().notNull().default(emptyJsonArray),
    year1Priorities: text("year_1_priorities").notNull(),
    year2To3Plan: text("year_2_to_3_plan").notNull(),
    year4To5Plan: text("year_4_to_5_plan").notNull(),
    roadmapPhases: jsonb("roadmap_phases").$type<RoadmapPhase[]>().notNull().default(emptyJsonArray),
    learningRecommendations: jsonb("learning_recommendations").$type<LearningRecommendationGroup[]>().notNull().default(emptyJsonArray),
    modelName: text("model_name").notNull().default("careerpath-rules-v2"),
    promptVersion: text("prompt_version").notNull().default("v2.0.0"),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    latencyMs: integer("latency_ms").notNull().default(0),
    profileSnapshot: jsonb("profile_snapshot").$type<AnalysisProfileSnapshot>().notNull().default(emptyJsonObject),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("career_analyses_readiness_score_check", sql`${table.readinessScore} between 0 and 100`),
  ],
);

export const insertCareerAnalysisSchema = createInsertSchema(careerAnalysesTable).omit({ id: true, createdAt: true });
export type InsertCareerAnalysis = z.infer<typeof insertCareerAnalysisSchema>;
export type CareerAnalysis = typeof careerAnalysesTable.$inferSelect;
