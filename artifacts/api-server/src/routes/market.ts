import { Router } from "express";
import { db, gridBotsTable, botLogsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { getPricesForSymbols, COINGECKO_IDS } from "../lib/priceService";

const router = Router();

const DEFAULT_PAIRS = ["BTC/USDC", "ETH/USDC", "ATOM/USDC", "SOL/USDC", "OSMO/USDC", "INJ/USDC", "TIA/USDC"];

router.get("/market/prices", async (req, res) => {
  try {
    const symbols = DEFAULT_PAIRS.map((p) => p.split("/")[0]);
    const prices = await getPricesForSymbols(symbols);
    res.json(prices);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch market prices");
    res.status(503).json({ error: "Harga tidak tersedia saat ini" });
  }
});

router.get("/market/price/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  if (!COINGECKO_IDS[symbol]) {
    res.status(404).json({ error: `Token ${symbol} tidak ditemukan` });
    return;
  }
  try {
    const prices = await getPricesForSymbols([symbol]);
    if (prices.length === 0) {
      res.status(404).json({ error: `Harga untuk ${symbol} tidak tersedia` });
      return;
    }
    res.json(prices[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch token price");
    res.status(503).json({ error: "Harga tidak tersedia saat ini" });
  }
});

router.get("/market/summary", async (req, res) => {
  const allBots = await db.select().from(gridBotsTable);
  const activeBots = allBots.filter((b) => b.isActive);
  const totalPnl = allBots.reduce((sum, b) => sum + Number(b.totalPnl), 0);
  const totalReranges = allBots.reduce((sum, b) => sum + b.rerangeCount, 0);

  const recentLogs = await db.select().from(botLogsTable).orderBy(desc(botLogsTable.createdAt)).limit(10);

  res.json({
    totalBots: allBots.length,
    activeBots: activeBots.length,
    totalPnl,
    totalReranges,
    recentActivity: recentLogs.map((log) => ({
      ...log,
      priceAtEvent: log.priceAtEvent ? Number(log.priceAtEvent) : null,
      createdAt: log.createdAt.toISOString(),
    })),
  });
});

router.get("/market/stats", async (req, res) => {
  const allBots = await db.select().from(gridBotsTable);

  const byMode: Record<string, number> = { off: 0, conservative: 0, moderate: 0, aggressive: 0 };
  let totalPnl = 0;
  let topPerformer: (typeof allBots)[0] | null = null;

  for (const bot of allBots) {
    byMode[bot.rerangeMode] = (byMode[bot.rerangeMode] ?? 0) + 1;
    totalPnl += Number(bot.totalPnl);
    if (!topPerformer || Number(bot.totalPnl) > Number(topPerformer.totalPnl)) {
      topPerformer = bot;
    }
  }

  const avgPnl = allBots.length > 0 ? totalPnl / allBots.length : 0;

  res.json({
    byMode,
    avgPnl,
    topPerformer: topPerformer
      ? {
          ...topPerformer,
          lowerPrice: Number(topPerformer.lowerPrice),
          upperPrice: Number(topPerformer.upperPrice),
          investmentAmount: Number(topPerformer.investmentAmount),
          totalPnl: Number(topPerformer.totalPnl),
          lastRerangeAt: topPerformer.lastRerangeAt?.toISOString() ?? null,
          createdAt: topPerformer.createdAt.toISOString(),
          updatedAt: topPerformer.updatedAt.toISOString(),
        }
      : null,
  });
});

export default router;
