import { Router } from "express";
import { db, gridBotsTable, botLogsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  ATOM: "cosmos",
  SOL: "solana",
  OSMO: "osmosis",
  INJ: "injective-protocol",
  TIA: "celestia",
  DYDX: "dydx-chain",
  USDT: "tether",
  BNB: "binancecoin",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  LINK: "chainlink",
  MATIC: "matic-network",
  OP: "optimism",
  ARB: "arbitrum",
  JUP: "jupiter-exchange-solana",
};

const DEFAULT_PAIRS = ["BTC/USDC", "ETH/USDC", "ATOM/USDC", "SOL/USDC", "OSMO/USDC", "INJ/USDC", "TIA/USDC"];

type PriceCache = {
  prices: MarketPriceData[];
  fetchedAt: number;
};

type MarketPriceData = {
  symbol: string;
  pair: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  source: string;
};

let priceCache: PriceCache | null = null;
const CACHE_TTL_MS = 60 * 1000;

async function fetchPricesFromCoinGecko(symbols: string[]): Promise<MarketPriceData[]> {
  const ids = symbols.map((s) => COINGECKO_IDS[s.toUpperCase()]).filter(Boolean).join(",");
  if (!ids) return [];

  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h&per_page=50&page=1`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`CoinGecko API error: ${res.status}`);
  }

  const data = (await res.json()) as Array<{
    symbol: string;
    current_price: number;
    price_change_percentage_24h: number;
    high_24h: number;
    low_24h: number;
    total_volume: number;
  }>;

  return data.map((coin) => ({
    symbol: coin.symbol.toUpperCase(),
    pair: `${coin.symbol.toUpperCase()}/USDC`,
    price: coin.current_price ?? 0,
    change24h: coin.price_change_percentage_24h ?? 0,
    high24h: coin.high_24h ?? 0,
    low24h: coin.low_24h ?? 0,
    volume24h: coin.total_volume ?? 0,
    source: "CoinGecko",
  }));
}

async function getPrices(symbols: string[]): Promise<MarketPriceData[]> {
  const now = Date.now();
  if (priceCache && now - priceCache.fetchedAt < CACHE_TTL_MS) {
    const cached = priceCache.prices.filter((p) => symbols.includes(p.symbol));
    if (cached.length > 0) return cached;
  }
  const prices = await fetchPricesFromCoinGecko(symbols);
  priceCache = { prices, fetchedAt: now };
  return prices.filter((p) => symbols.includes(p.symbol));
}

router.get("/market/prices", async (req, res) => {
  try {
    const symbols = DEFAULT_PAIRS.map((p) => p.split("/")[0]);
    const prices = await getPrices(symbols);
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
    const prices = await getPrices([symbol]);
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
