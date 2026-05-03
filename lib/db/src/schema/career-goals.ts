import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const careerGoalsTable = pgTable("career_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  targetRole: text("target_role").notNull(),
  targetIndustry: text("target_industry"),
  targetLevel: text("target_level"),
  leadershipPreference: text("leadership_preference"),
  geographicPreference: text("geographic_preference"),
  workModePreference: text("work_mode_preference"),
  strengthsToBuild: text("strengths_to_build"),
  areasToImprove: text("areas_to_improve"),
  targetYears: integer("target_years").default(5),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCareerGoalSchema = createInsertSchema(careerGoalsTable).omit({ id: true, updatedAt: true });
export type InsertCareerGoal = z.infer<typeof insertCareerGoalSchema>;
export type CareerGoal = typeof careerGoalsTable.$inferSelect;
