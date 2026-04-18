import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const accessTokensTable = pgTable("access_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  donationId: text("donation_id").notNull(),
  amount: integer("amount").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AccessToken = typeof accessTokensTable.$inferSelect;
