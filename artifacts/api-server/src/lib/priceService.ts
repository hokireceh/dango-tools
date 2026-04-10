import { logger } from "./logger";

export const COINGECKO_IDS: Record<string, string> = {
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

export type MarketPriceData = {
  symbol: string;
  pair: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  source: string;
};

type PriceCache = {
  prices: MarketPriceData[];
  fetchedAt: number;
};

let priceCache: PriceCache | null = null;
const CACHE_TTL_MS = 60 * 1000;

async function fetchFromCoinGecko(symbols: string[]): Promise<MarketPriceData[]> {
  const ids = symbols
    .map((s) => COINGECKO_IDS[s.toUpperCase()])
    .filter(Boolean)
    .join(",");
  if (!ids) return [];

  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h&per_page=50&page=1`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);

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

export async function getPricesForSymbols(symbols: string[]): Promise<MarketPriceData[]> {
  const now = Date.now();
  if (priceCache && now - priceCache.fetchedAt < CACHE_TTL_MS) {
    const cached = priceCache.prices.filter((p) => symbols.includes(p.symbol));
    if (cached.length > 0) return cached;
  }
  const prices = await fetchFromCoinGecko(symbols);
  priceCache = { prices, fetchedAt: now };
  return prices.filter((p) => symbols.includes(p.symbol));
}

export async function getPriceForPair(pair: string): Promise<number | null> {
  try {
    const symbol = pair.split("/")[0].toUpperCase();
    const prices = await getPricesForSymbols([symbol]);
    return prices[0]?.price ?? null;
  } catch (err) {
    logger.warn({ err, pair }, "Failed to fetch price for pair");
    return null;
  }
}
