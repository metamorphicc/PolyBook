import { NextRequest, NextResponse } from "next/server";

const BINANCE_TICKER_URL = "https://api.binance.com/api/v3/ticker/24hr";

const SYMBOLS: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  XRP: "XRPUSDT",
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

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Failed to fetch prices", status: res.status, body: text },
        { status: 502 },
      );
    }

    const tickers = (await res.json()) as BinanceTicker[];
    const bySymbol = new Map(tickers.map((ticker) => [ticker.symbol, ticker]));

    return NextResponse.json({
      prices: assets.map((asset) => {
        const ticker = bySymbol.get(SYMBOLS[asset]);

        return {
          asset,
          price: ticker ? Number(ticker.lastPrice) : null,
          changePercent: ticker ? Number(ticker.priceChangePercent) : null,
        };
      }),
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
