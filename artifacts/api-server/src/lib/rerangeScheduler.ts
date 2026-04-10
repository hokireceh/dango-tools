import { db, gridBotsTable, botLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getPriceForPair } from "./priceService";
import { logger } from "./logger";

const SCHEDULER_INTERVAL_MS = 60 * 1000; // jalankan setiap 60 detik

// Seberapa dekat ke tepi (dari dalam range) sebelum rerange dipicu.
// Nilai = fraksi dari lebar range (upper - lower) diukur dari tepi ke dalam.
// Contoh: 0.30 → trigger jika harga berada dalam 30% lebar range dari tepi atas/bawah.
// conservative = zona 5% dari tepi (paling jarang trigger — harus hampir keluar dulu)
// moderate     = zona 50% dari tepi (trigger saat masuk paruh luar range)
// aggressive   = zona 30% dari tepi (antara moderate dan conservative)
const RERANGE_EDGE_ZONES: Record<string, number> = {
  conservative: 0.05, // dalam 5% lebar range dari tepi → jarang trigger
  moderate:     0.50, // dalam 50% lebar range dari tepi → trigger lebih awal
  aggressive:   0.30, // dalam 30% lebar range dari tepi
};

function shouldRerange(
  currentPrice: number,
  lowerPrice: number,
  upperPrice: number,
  mode: string
): boolean {
  const edgeZone = RERANGE_EDGE_ZONES[mode] ?? 0;
  const rangeWidth = upperPrice - lowerPrice;
  // Trigger jika harga masuk zona edge dari atas atau bawah
  const upperTrigger = upperPrice - edgeZone * rangeWidth;
  const lowerTrigger = lowerPrice + edgeZone * rangeWidth;
  return currentPrice >= upperTrigger || currentPrice <= lowerTrigger;
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
        message: `Auto-rerange dipicu (mode: ${bot.rerangeMode}) — harga $${currentPrice.toFixed(4)} mendekati tepi range [$${lower}–$${upper}]`,
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
