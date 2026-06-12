import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  currentRole: text("current_role"),
  totalExperienceMonths: integer("total_experience_months"),
  industry: text("industry"),
  location: text("location"),
  phone: text("phone"),
  linkedinUrl: text("linkedin_url"),
  professionalSummary: text("professional_summary"),
  preferredLearningStyle: text("preferred_learning_style"),
  weeklyLearningMinutes: integer("weekly_learning_minutes"),
  salaryAspiration: text("salary_aspiration"),
  careerLevel: text("career_level"),
  cvImportCompletedAt: timestamp("cv_import_completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({ id: true, updatedAt: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
