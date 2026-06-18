import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const authRefreshTokensTable = pgTable(
  "auth_refresh_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    familyId: text("family_id").notNull(),
    replacedByTokenHash: text("replaced_by_token_hash"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("auth_refresh_tokens_token_hash_idx").on(table.tokenHash),
    index("auth_refresh_tokens_user_id_idx").on(table.userId),
    index("auth_refresh_tokens_family_id_idx").on(table.familyId),
  ],
);

export type AuthRefreshToken = typeof authRefreshTokensTable.$inferSelect;
