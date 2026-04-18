import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { gridBotsTable } from "./gridBots";

export const botLogsTable = pgTable("bot_logs", {
  id: serial("id").primaryKey(),
  botId: integer("bot_id").notNull().references(() => gridBotsTable.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  message: text("message").notNull(),
  priceAtEvent: numeric("price_at_event", { precision: 20, scale: 8 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type BotLog = typeof botLogsTable.$inferSelect;
