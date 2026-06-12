import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { careerAnalysesTable } from "./career-analyses";
import { usersTable } from "./users";

export const milestonesTable = pgTable("milestones", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  analysisId: integer("analysis_id").references(() => careerAnalysesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  phase: text("phase").notNull(),
  completed: boolean("completed").notNull().default(false),
  dueDate: text("due_date"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMilestoneSchema = createInsertSchema(milestonesTable).omit({ id: true, createdAt: true, completedAt: true });
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Milestone = typeof milestonesTable.$inferSelect;
