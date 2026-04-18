import { logger } from "./logger";

const DANGO_GRAPHQL = "https://api-mainnet.dango.zone/graphql";
const ORACLE_CONTRACT = "0xcedc5f73cbb963a48471b849c3650e6e34cd3b6d";

export const DANGO_DENOM_MAP: Record<string, string> = {
  BTC: "perp/btcusd",
  ETH: "perp/ethusd",
  SOL: "perp/solusd",
  HYPE: "perp/hypeusd",
};

export const COINGECKO_IDS: Record<string, string> = {
  ATOM: "cosmos",
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

type DangoOraclePrices = Record<string, { humanized_price: string; precision: number; timestamp: string }>;

async function fetchFromDangoOracle(): Promise<DangoOraclePrices> {
  const body = {
    query: `query { queryApp(request: { wasm_smart: { contract: "${ORACLE_CONTRACT}", msg: { prices: { limit: 30 } } } }) }`,
  };

  const res = await fetch(DANGO_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Dango GraphQL error: ${res.status}`);

  const json = (await res.json()) as { data?: { queryApp?: { wasm_smart?: DangoOraclePrices } }; errors?: unknown[] };
  if (json.errors?.length) throw new Error(`Dango GraphQL errors: ${JSON.stringify(json.errors)}`);

  return json.data?.queryApp?.wasm_smart ?? {};
}

async function fetchAllPrices(symbols: string[]): Promise<MarketPriceData[]> {
  const results: MarketPriceData[] = [];
  const needCoinGecko: string[] = [];

  try {
    const oraclePrices = await fetchFromDangoOracle();
    const denomToSymbol: Record<string, string> = {};
    for (const [sym, denom] of Object.entries(DANGO_DENOM_MAP)) {
      denomToSymbol[denom] = sym;
    }

    for (const symbol of symbols) {
      const denom = DANGO_DENOM_MAP[symbol.toUpperCase()];
      if (denom && oraclePrices[denom]) {
        const p = oraclePrices[denom];
        results.push({
          symbol: symbol.toUpperCase(),
          pair: `${symbol.toUpperCase()}/USDC`,
          price: parseFloat(p.humanized_price),
          change24h: 0,
          high24h: 0,
          low24h: 0,
          volume24h: 0,
          source: "Dango Oracle",
        });
      } else {
        needCoinGecko.push(symbol);
      }
    }
  } catch (err) {
    logger.warn({ err }, "Dango oracle fetch failed, falling back to CoinGecko for all symbols");
    needCoinGecko.push(...symbols);
  }

  if (needCoinGecko.length > 0) {
    try {
      const cgResults = await fetchFromCoinGecko(needCoinGecko);
      results.push(...cgResults);
    } catch (err) {
      logger.warn({ err }, "CoinGecko fallback also failed");
    }
  }

  return results;
}

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
    if (cached.length === symbols.length) return cached;
  }
  const prices = await fetchAllPrices(symbols);
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
