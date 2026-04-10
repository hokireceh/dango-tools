import { db, gridBotsTable, botLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getPriceForPair } from "./priceService";
import { logger } from "./logger";

const SCHEDULER_INTERVAL_MS = 60 * 1000; // jalankan setiap 60 detik

// Seberapa jauh harga harus keluar dari range sebelum rerange dipicu
const RERANGE_THRESHOLDS: Record<string, number> = {
  conservative: 0.05, // 5% di luar range
  moderate: 0.02,     // 2% di luar range
  aggressive: 0,      // langsung begitu keluar range
};

function shouldRerange(
  currentPrice: number,
  lowerPrice: number,
  upperPrice: number,
  mode: string
): boolean {
  const threshold = RERANGE_THRESHOLDS[mode] ?? 0;
  const effectiveLower = lowerPrice * (1 - threshold);
  const effectiveUpper = upperPrice * (1 + threshold);
  return currentPrice < effectiveLower || currentPrice > effectiveUpper;
}

async function runRerangeCheck() {
  try {
    const bots = await db.select().from(gridBotsTable);
    const activeBots = bots.filter((b) => b.isActive && b.rerangeMode !== "off");

    if (activeBots.length === 0) return;

    logger.info({ count: activeBots.length }, "Auto-rerange check started");

    for (const bot of activeBots) {
      const currentPrice = await getPriceForPair(bot.pair);
      if (currentPrice === null) {
        logger.warn({ botId: bot.id, pair: bot.pair }, "Harga tidak tersedia, skip auto-rerange");
        continue;
      }

      const lower = Number(bot.lowerPrice);
      const upper = Number(bot.upperPrice);

      if (!shouldRerange(currentPrice, lower, upper, bot.rerangeMode)) continue;

      await db
        .update(gridBotsTable)
        .set({
          rerangeCount: bot.rerangeCount + 1,
          lastRerangeAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(gridBotsTable.id, bot.id));

      await db.insert(botLogsTable).values({
        botId: bot.id,
        eventType: "RERANGE",
        message: `Auto-rerange dipicu (mode: ${bot.rerangeMode}) — harga $${currentPrice.toFixed(4)} di luar range [$${lower}–$${upper}]`,
        priceAtEvent: String(currentPrice),
      });

      logger.info(
        { botId: bot.id, botName: bot.name, currentPrice, lower, upper, mode: bot.rerangeMode },
        "Auto-rerange triggered"
      );
    }
  } catch (err) {
    logger.error({ err }, "Auto-rerange scheduler error");
  }
}

export function startRerangeScheduler(): void {
  logger.info({ intervalMs: SCHEDULER_INTERVAL_MS }, "Auto-rerange scheduler started");
  setInterval(runRerangeCheck, SCHEDULER_INTERVAL_MS);
}
