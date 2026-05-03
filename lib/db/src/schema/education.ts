import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const educationTable = pgTable("education", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  institution: text("institution").notNull(),
  degree: text("degree").notNull(),
  fieldOfStudy: text("field_of_study"),
  startYear: integer("start_year").notNull(),
  endYear: integer("end_year"),
  isCurrent: boolean("is_current").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEducationSchema = createInsertSchema(educationTable).omit({ id: true, createdAt: true });
export type InsertEducation = z.infer<typeof insertEducationSchema>;
export type Education = typeof educationTable.$inferSelect;
