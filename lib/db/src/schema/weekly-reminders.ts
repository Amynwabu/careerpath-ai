import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { journeysTable } from "./journeys";
import { usersTable } from "./users";

export type ReminderContent = {
  focus: string;
  smarterTrainingTip: string;
  skipThisWeek: string;
  sentAt?: string;
};

export const weeklyRemindersTable = pgTable("weekly_reminders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" })
    .unique(),
  journeyId: integer("journey_id").references(() => journeysTable.id, {
    onDelete: "set null",
  }),
  frequency: text("frequency").notNull().default("weekly"),
  dayOfWeek: integer("day_of_week").notNull().default(1),
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
  contentLog: jsonb("content_log").$type<ReminderContent[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertWeeklyReminderSchema = createInsertSchema(
  weeklyRemindersTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertWeeklyReminder = z.infer<
  typeof insertWeeklyReminderSchema
>;
export type WeeklyReminder = typeof weeklyRemindersTable.$inferSelect;
