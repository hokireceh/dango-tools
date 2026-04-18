import { pgTable, serial, text, numeric, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rerangeModeEnum = pgEnum("rerange_mode", ["off", "conservative", "moderate", "aggressive"]);
export const orderTypeEnum = pgEnum("order_type", ["long", "short", "neutral"]);
export const executionModeEnum = pgEnum("execution_mode", ["aggressive", "normal", "passive"]);

export const gridBotsTable = pgTable("grid_bots", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  pair: text("pair").notNull(),
  orderType: orderTypeEnum("order_type").notNull().default("neutral"),
  lowerPrice: numeric("lower_price", { precision: 20, scale: 8 }).notNull(),
  upperPrice: numeric("upper_price", { precision: 20, scale: 8 }).notNull(),
  gridCount: integer("grid_count").notNull().default(10),
  investmentAmount: numeric("investment_amount", { precision: 20, scale: 8 }).notNull(),
  executionMode: executionModeEnum("execution_mode").notNull().default("normal"),
  rerangeMode: rerangeModeEnum("rerange_mode").notNull().default("off"),
  budgetStop: numeric("budget_stop", { precision: 20, scale: 8 }),
  isActive: boolean("is_active").notNull().default(false),
  totalPnl: numeric("total_pnl", { precision: 20, scale: 8 }).notNull().default("0"),
  rerangeCount: integer("rerange_count").notNull().default(0),
  lastRerangeAt: timestamp("last_rerange_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertGridBotSchema = createInsertSchema(gridBotsTable).omit({ id: true, createdAt: true, updatedAt: true, rerangeCount: true, totalPnl: true, lastRerangeAt: true });
export type InsertGridBot = z.infer<typeof insertGridBotSchema>;
export type GridBot = typeof gridBotsTable.$inferSelect;
