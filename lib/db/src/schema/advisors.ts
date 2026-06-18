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
import { journeysTable } from "./journeys";
import { usersTable } from "./users";

export const advisorsTable = pgTable("advisors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  rating: text("rating").notNull(),
  sessionsCompleted: integer("sessions_completed").notNull().default(0),
  specialisms: jsonb("specialisms").$type<string[]>().notNull(),
  availability: text("availability").notNull(),
  quote: text("quote").notNull(),
  bestFor: text("best_for").notNull(),
  sessionPricePence: integer("session_price_pence").notNull().default(3000),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const advisorBookingsTable = pgTable("advisor_bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  advisorId: integer("advisor_id")
    .notNull()
    .references(() => advisorsTable.id, { onDelete: "cascade" }),
  journeyId: integer("journey_id").references(() => journeysTable.id, {
    onDelete: "set null",
  }),
  requestedSlot: text("requested_slot").notNull(),
  status: text("status").notNull().default("requested"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertAdvisorSchema = createInsertSchema(advisorsTable).omit({
  id: true,
  createdAt: true,
});
export const insertAdvisorBookingSchema = createInsertSchema(
  advisorBookingsTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertAdvisor = z.infer<typeof insertAdvisorSchema>;
export type Advisor = typeof advisorsTable.$inferSelect;
export type InsertAdvisorBooking = z.infer<typeof insertAdvisorBookingSchema>;
export type AdvisorBooking = typeof advisorBookingsTable.$inferSelect;
