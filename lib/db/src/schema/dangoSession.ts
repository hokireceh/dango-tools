import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const dangoSessionTable = pgTable("dango_session", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull(),
  userIndex: integer("user_index").notNull(),
  privkeyEnc: text("privkey_enc").notNull(),
  pubkey: text("pubkey").notNull(),
  keyHash: text("key_hash").notNull(),
  expireAt: text("expire_at").notNull(),
  authorization: text("authorization").notNull(),
  nonce: integer("nonce").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type DangoSession = typeof dangoSessionTable.$inferSelect;
