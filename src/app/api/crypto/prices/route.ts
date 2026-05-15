import { NextRequest, NextResponse } from "next/server";

const BINANCE_TICKER_URL = "https://api.binance.com/api/v3/ticker/24hr";
const COINBASE_PRODUCT_URL = "https://api.exchange.coinbase.com/products";

const SYMBOLS: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  XRP: "XRPUSDT",
};

const COINBASE_PRODUCTS: Record<string, string> = {
  BTC: "BTC-USD",
  ETH: "ETH-USD",
  SOL: "SOL-USD",
  XRP: "XRP-USD",
};

type BinanceTicker = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
};

export async function GET(req: NextRequest) {
  const requestedAssets = req.nextUrl.searchParams
    .get("assets")
    ?.split(",")
    .map((asset) => asset.trim().toUpperCase())
    .filter((asset) => asset in SYMBOLS);

  const assets = requestedAssets?.length ? requestedAssets.slice(0, 4) : ["BTC", "ETH"];
  const symbols = assets.map((asset) => SYMBOLS[asset]);
  const url = `${BINANCE_TICKER_URL}?symbols=${encodeURIComponent(
    JSON.stringify(symbols),
  )}`;

  try {
    const res = await fetch(url, { next: { revalidate: 5 } });

    if (res.ok) {
      const tickers = (await res.json()) as BinanceTicker[];
      const bySymbol = new Map(tickers.map((ticker) => [ticker.symbol, ticker]));

      return NextResponse.json({
        source: "binance",
        prices: assets.map((asset) => {
          const ticker = bySymbol.get(SYMBOLS[asset]);

          return {
            asset,
            price: ticker ? Number(ticker.lastPrice) : null,
            changePercent: ticker ? Number(ticker.priceChangePercent) : null,
          };
        }),
      });
    }

    return NextResponse.json({
      source: "coinbase",
      prices: await fetchCoinbasePrices(assets),
    });
  } catch (e: unknown) {
    try {
      return NextResponse.json({
        source: "coinbase",
        prices: await fetchCoinbasePrices(assets),
      });
    } catch {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Unknown error" },
        { status: 500 },
      );
    }
  }
}

async function fetchCoinbasePrices(assets: string[]) {
  return Promise.all(
    assets.map(async (asset) => {
      const product = COINBASE_PRODUCTS[asset];
      if (!product) {
        return { asset, price: null, changePercent: null };
      }

      const res = await fetch(`${COINBASE_PRODUCT_URL}/${product}/stats`, {
        headers: { "User-Agent": "PolyBook" },
        next: { revalidate: 5 },
      });

      if (!res.ok) {
        return { asset, price: null, changePercent: null };
      }

      const stats = (await res.json()) as { open?: string; last?: string };
      const open = Number(stats.open);
      const last = Number(stats.last);
      const changePercent =
        Number.isFinite(open) && open > 0 && Number.isFinite(last)
          ? ((last - open) / open) * 100
          : null;

      return {
        asset,
        price: Number.isFinite(last) ? last : null,
        changePercent,
      };
    }),
  );
}
