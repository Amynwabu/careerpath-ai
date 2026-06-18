import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { careerAnalysesTable } from "./career-analyses";
import { usersTable } from "./users";

export type JourneyResource = {
  name: string;
  type: "free" | "paid";
  price?: string;
  url?: string;
};

export type JourneyChecklistItem = {
  key: string;
  title: string;
  completed: boolean;
};

export const journeysTable = pgTable("journeys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  analysisId: integer("analysis_id").references(() => careerAnalysesTable.id, {
    onDelete: "set null",
  }),
  selectedDirection: text("selected_direction").notNull(),
  currentRole: text("current_role"),
  targetRole: text("target_role").notNull(),
  durationMonths: integer("duration_months").notNull(),
  status: text("status").notNull().default("active"),
  generatedFrom: text("generated_from"),
  progress: integer("progress").notNull().default(0),
  selectedAt: timestamp("selected_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const journeyStagesTable = pgTable("journey_stages", {
  id: serial("id").primaryKey(),
  journeyId: integer("journey_id")
    .notNull()
    .references(() => journeysTable.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  stageOrder: integer("stage_order").notNull(),
  title: text("title").notNull(),
  duration: text("duration").notNull(),
  description: text("description").notNull(),
  resources: jsonb("resources").$type<JourneyResource[]>().notNull(),
  checklist: jsonb("checklist").$type<JourneyChecklistItem[]>().notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertJourneySchema = createInsertSchema(journeysTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertJourneyStageSchema = createInsertSchema(
  journeyStagesTable,
).omit({ id: true, createdAt: true, completedAt: true });

export type InsertJourney = z.infer<typeof insertJourneySchema>;
export type Journey = typeof journeysTable.$inferSelect;
export type InsertJourneyStage = z.infer<typeof insertJourneyStageSchema>;
export type JourneyStage = typeof journeyStagesTable.$inferSelect;
