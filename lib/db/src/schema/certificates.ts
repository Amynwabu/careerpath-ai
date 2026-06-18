import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { journeysTable } from "./journeys";
import { usersTable } from "./users";

export const certificatesTable = pgTable("certificates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  journeyId: integer("journey_id")
    .notNull()
    .references(() => journeysTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  recipientName: text("recipient_name").notNull(),
  completionDuration: text("completion_duration").notNull(),
  verificationToken: text("verification_token").notNull().unique(),
  pdfUrl: text("pdf_url"),
  issuedAt: timestamp("issued_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertCertificateSchema = createInsertSchema(
  certificatesTable,
).omit({ id: true, issuedAt: true, createdAt: true });

export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type Certificate = typeof certificatesTable.$inferSelect;
