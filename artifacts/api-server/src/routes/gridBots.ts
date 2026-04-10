import { Router } from "express";
import { db, gridBotsTable, botLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  CreateGridBotBody,
  UpdateGridBotBody,
  GetGridBotParams,
  UpdateGridBotParams,
  DeleteGridBotParams,
  ToggleGridBotParams,
  TriggerRerangeParams,
} from "@workspace/api-zod";

const router = Router();

const formatBot = (bot: typeof gridBotsTable.$inferSelect) => ({
  ...bot,
  lowerPrice: Number(bot.lowerPrice),
  upperPrice: Number(bot.upperPrice),
  investmentAmount: Number(bot.investmentAmount),
  totalPnl: Number(bot.totalPnl),
  lastRerangeAt: bot.lastRerangeAt?.toISOString() ?? null,
  createdAt: bot.createdAt.toISOString(),
  updatedAt: bot.updatedAt.toISOString(),
});

router.get("/grid-bots", async (req, res) => {
  const bots = await db.select().from(gridBotsTable).orderBy(desc(gridBotsTable.createdAt));
  res.json(bots.map(formatBot));
});

router.post("/grid-bots", async (req, res) => {
  const parsed = CreateGridBotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error });
    return;
  }
  const { name, pair, orderType, lowerPrice, upperPrice, gridCount, investmentAmount, rerangeMode } = parsed.data;
  const [bot] = await db
    .insert(gridBotsTable)
    .values({
      name,
      pair,
      orderType,
      lowerPrice: String(lowerPrice),
      upperPrice: String(upperPrice),
      gridCount,
      investmentAmount: String(investmentAmount),
      rerangeMode,
    })
    .returning();

  await db.insert(botLogsTable).values({
    botId: bot.id,
    eventType: "created",
    message: `Bot "${bot.name}" dibuat — ${orderType.toUpperCase()} ${pair}, mode ${rerangeMode}`,
    priceAtEvent: null,
  });

  res.status(201).json(formatBot(bot));
});

router.get("/grid-bots/:id", async (req, res) => {
  const parsed = GetGridBotParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [bot] = await db.select().from(gridBotsTable).where(eq(gridBotsTable.id, parsed.data.id));
  if (!bot) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(formatBot(bot));
});

router.put("/grid-bots/:id", async (req, res) => {
  const paramsParsed = UpdateGridBotParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = UpdateGridBotBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  const body = bodyParsed.data;
  if (body.name !== undefined) updateData.name = body.name;
  if (body.pair !== undefined) updateData.pair = body.pair;
  if (body.orderType !== undefined) updateData.orderType = body.orderType;
  if (body.lowerPrice !== undefined) updateData.lowerPrice = String(body.lowerPrice);
  if (body.upperPrice !== undefined) updateData.upperPrice = String(body.upperPrice);
  if (body.gridCount !== undefined) updateData.gridCount = body.gridCount;
  if (body.investmentAmount !== undefined) updateData.investmentAmount = String(body.investmentAmount);
  if (body.rerangeMode !== undefined) updateData.rerangeMode = body.rerangeMode;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;

  const [updated] = await db
    .update(gridBotsTable)
    .set(updateData)
    .where(eq(gridBotsTable.id, paramsParsed.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(formatBot(updated));
});

router.delete("/grid-bots/:id", async (req, res) => {
  const parsed = DeleteGridBotParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(gridBotsTable).where(eq(gridBotsTable.id, parsed.data.id));
  res.status(204).send();
});

router.post("/grid-bots/:id/toggle", async (req, res) => {
  const parsed = ToggleGridBotParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [bot] = await db.select().from(gridBotsTable).where(eq(gridBotsTable.id, parsed.data.id));
  if (!bot) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [updated] = await db
    .update(gridBotsTable)
    .set({ isActive: !bot.isActive, updatedAt: new Date() })
    .where(eq(gridBotsTable.id, parsed.data.id))
    .returning();

  await db.insert(botLogsTable).values({
    botId: bot.id,
    eventType: "toggle",
    message: `Bot "${bot.name}" ${updated.isActive ? "diaktifkan" : "dinonaktifkan"}`,
    priceAtEvent: null,
  });

  res.json(formatBot(updated));
});

router.post("/grid-bots/:id/trigger-rerange", async (req, res) => {
  const parsed = TriggerRerangeParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [bot] = await db.select().from(gridBotsTable).where(eq(gridBotsTable.id, parsed.data.id));
  if (!bot) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const simulatedPrice = (Number(bot.lowerPrice) + Number(bot.upperPrice)) / 2;

  await db
    .update(gridBotsTable)
    .set({ rerangeCount: bot.rerangeCount + 1, lastRerangeAt: new Date(), updatedAt: new Date() })
    .where(eq(gridBotsTable.id, bot.id));

  const [log] = await db
    .insert(botLogsTable)
    .values({
      botId: bot.id,
      eventType: "rerange",
      message: `Rerange manual dipicu — ${bot.orderType.toUpperCase()} ${bot.pair} (mode: ${bot.rerangeMode})`,
      priceAtEvent: String(simulatedPrice),
    })
    .returning();

  res.json({
    ...log,
    priceAtEvent: log.priceAtEvent ? Number(log.priceAtEvent) : null,
    createdAt: log.createdAt.toISOString(),
  });
});

export default router;
