import { pgTable, text, serial, timestamp, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const certificationsTable = pgTable("certifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  issuingOrganization: text("issuing_organization").notNull(),
  issueDate: date("issue_date", { mode: "string" }),
  expiryDate: date("expiry_date", { mode: "string" }),
  credentialId: text("credential_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCertificationSchema = createInsertSchema(certificationsTable).omit({ id: true, createdAt: true });
export type InsertCertification = z.infer<typeof insertCertificationSchema>;
export type Certification = typeof certificationsTable.$inferSelect;
