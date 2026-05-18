"use client";

import Header from "@/app/Components/header";
import PolymarketPriceChart from "@/app/Components/PolymarketPriceChart";
import PriceChart from "@/app/Components/priceChart";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type Timeframe = "5m" | "15m" | "1h";
type Asset = "BTC" | "ETH" | "SOL" | "XRP";

type ChartWindow = {
  id: number;
  symbol: string;
};

type OrderbookWindow = {
  id: number;
  asset: Asset;
  marketId: string;
  timeframe: Timeframe;
};

type BinanceOrderbookWindow = {
  id: number;
  asset: Asset;
};

type PolyChartWindow = {
  id: number;
  asset: Asset;
  marketId: string;
  timeframe: Timeframe;
};

type OrderbookLevel = {
  price: number;
  size: number;
};

type OrderbookOutcome = "Up" | "Down";

type OrderbookSelection = {
  asset: Asset;
  marketId: string;
};

type WindowFrameProps = {
  title: string;
  accent?: "chart" | "book";
  zIndex: number;
  initialX: number;
  initialY: number;
  initialWidth: number;
  initialHeight: number;
  minWidth: number;
  minHeight: number;
  onFocus: () => void;
  onClose: () => void;
  children: React.ReactNode;
};

const COINS = ["bitcoin", "ethereum", "solana", "xrp"];

const COIN_SYMBOLS: Record<string, string> = {
  bitcoin: "BINANCE:BTCUSDT",
  ethereum: "BINANCE:ETHUSDT",
  solana: "BINANCE:SOLUSDT",
  xrp: "BINANCE:XRPUSDT",
};

const POLY_MARKETS_BY_ASSET: OrderbookSelection[] = [
  { asset: "BTC", marketId: "btc-updown-fast" },
  { asset: "ETH", marketId: "eth-updown-fast" },
  { asset: "SOL", marketId: "sol-updown-fast" },
  { asset: "XRP", marketId: "xrp-updown-fast" },
];

const ORDERBOOK_TIMEFRAMES: Timeframe[] = ["5m", "15m", "1h"];
const ASSETS: Asset[] = ["BTC", "ETH", "SOL", "XRP"];

function WindowFrame({
  title,
  accent = "chart",
  zIndex,
  initialX,
  initialY,
  initialWidth,
  initialHeight,
  minWidth,
  minHeight,
  onFocus,
  onClose,
  children,
}: WindowFrameProps) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({
    width: initialWidth,
    height: initialHeight,
  });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const handleMouseDownHeader = (e: React.MouseEvent) => {
    setDragging(true);
    setOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setResizing(true);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    };
  };

  useEffect(() => {
    if (!dragging && !resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (dragging) {
        setPos({
          x: e.clientX - offset.x,
          y: Math.max(88, e.clientY - offset.y),
        });
        return;
      }

      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;
      setSize({
        width: Math.max(minWidth, resizeStart.current.width + dx),
        height: Math.max(minHeight, resizeStart.current.height + dy),
      });
    };

    const handleMouseUp = () => {
      setDragging(false);
      setResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, resizing, offset, minWidth, minHeight]);

  return (
    <div
      className="fixed overflow-hidden border theme-border theme-surface shadow-2xl"
      onMouseDownCapture={onFocus}
      style={{
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: size.height,
        zIndex,
      }}
    >
      <div
        className={`flex h-8 cursor-move select-none items-center justify-between px-3 text-xs text-white ${
          accent === "book"
            ? "bg-[var(--surface)]"
            : "bg-[var(--surface-muted)]"
        }`}
        onMouseDown={handleMouseDownHeader}
      >
        <span className="truncate">{title}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-300 hover:text-white"
          aria-label="Close window"
        >
          x
        </button>
      </div>

      <div className="h-[calc(100%-2rem)] w-full">{children}</div>

      <div
        className="absolute bottom-1 right-1 h-3 w-3 cursor-se-resize bg-zinc-500/70"
        onMouseDown={handleResizeMouseDown}
      />
    </div>
  );
}

function DraggableChartWindow({
  symbol,
  zIndex,
  onFocus,
  onClose,
}: {
  symbol: string;
  zIndex: number;
  onFocus: () => void;
  onClose: () => void;
}) {
  return (
    <WindowFrame
      title={symbol}
      zIndex={zIndex}
      initialX={52}
      initialY={150}
      initialWidth={520}
      initialHeight={340}
      minWidth={340}
      minHeight={260}
      onFocus={onFocus}
      onClose={onClose}
    >
      <div className="h-full w-full theme-terminal-bg">
        <PriceChart symbol={symbol} />
      </div>
    </WindowFrame>
  );
}

function DraggablePolyChartWindow({
  asset,
  timeframe,
  zIndex,
  onFocus,
  onClose,
}: {
  asset: Asset;
  timeframe: Timeframe;
  zIndex: number;
  onFocus: () => void;
  onClose: () => void;
}) {
  return (
    <WindowFrame
      title={`Polymarket Chart / ${asset} / ${timeframe === "1h" ? "60m" : timeframe}`}
      zIndex={zIndex}
      initialX={86}
      initialY={150}
      initialWidth={620}
      initialHeight={380}
      minWidth={420}
      minHeight={280}
      onFocus={onFocus}
      onClose={onClose}
    >
      <PolymarketPriceChart asset={asset} timeframe={timeframe} />
    </WindowFrame>
  );
}

function DraggableOrderbookWindow({
  asset,
  marketId,
  timeframe,
  zIndex,
  onFocus,
  onClose,
}: {
  asset: Asset;
  marketId: string;
  timeframe: Timeframe;
  zIndex: number;
  onFocus: () => void;
  onClose: () => void;
}) {
  const [bids, setBids] = useState<OrderbookLevel[]>([]);
  const [asks, setAsks] = useState<OrderbookLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<OrderbookOutcome>("Up");
  const [slug, setSlug] = useState<string>("");

  useEffect(() => {
    const fetchOrderbook = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/pol/orderbook?asset=${asset}&timeframe=${timeframe}&outcome=${outcome}`
        );

        if (!res.ok) {
          const text = await res.text();
          setError(`HTTP ${res.status}: ${text}`);
          return;
        }

        const data = await res.json();
        setSlug(String(data.slug ?? ""));
        const mappedBids: OrderbookLevel[] = (data.bids ?? []).map(
          (lvl: { price: string | number; size: string | number }) => ({
            price: Number(lvl.price),
            size: Number(lvl.size),
          })
        );
        const mappedAsks: OrderbookLevel[] = (data.asks ?? []).map(
          (lvl: { price: string | number; size: string | number }) => ({
            price: Number(lvl.price),
            size: Number(lvl.size),
          })
        );

        setBids(mappedBids);
        setAsks(mappedAsks);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderbook();
    const interval = window.setInterval(fetchOrderbook, 2000);

    return () => {
      window.clearInterval(interval);
    };
  }, [asset, timeframe, outcome]);

  const renderLevels = (
    side: "bid" | "ask",
    levels: OrderbookLevel[],
    emptyText: string
  ) => (
    <div className="flex flex-col overflow-hidden border border-zinc-800">
      <div
        className={`flex justify-between bg-zinc-900 px-2 py-1 text-[11px] ${
          side === "bid" ? "text-green-400" : "text-red-400"
        }`}
      >
        <span>{side === "bid" ? "Bids" : "Asks"}</span>
        <span>Price / Size</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {levels.length === 0 && !loading && (
          <div className="px-2 py-1 text-[11px] text-zinc-600">{emptyText}</div>
        )}
        {levels.map((lvl, idx) => (
          <button
            key={`${side}-${idx}`}
            className={`flex w-full justify-between px-2 py-[3px] text-left text-[11px] ${
              side === "bid" ? "hover:bg-green-950/60" : "hover:bg-red-950/60"
            }`}
            onClick={() => {
              console.log("[OrderbookWindow] price click", {
                side,
                price: lvl.price,
                size: lvl.size,
                asset,
                marketId,
                timeframe,
              });
            }}
          >
            <span
              className={side === "bid" ? "text-green-400" : "text-red-400"}
            >
              {lvl.price.toFixed(3)}
            </span>
            <span className="text-zinc-400">{lvl.size.toFixed(2)}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <WindowFrame
      title={`Orderbook / ${asset} / ${timeframe}`}
      accent="book"
      zIndex={zIndex}
      initialX={130}
      initialY={170}
      initialWidth={460}
      initialHeight={320}
      minWidth={360}
      minHeight={260}
      onFocus={onFocus}
      onClose={onClose}
    >
      <div className="flex h-full flex-col theme-surface p-3 text-xs">
        <div className="mb-2 flex justify-between gap-3">
          <div className="truncate theme-muted" title={slug || marketId}>
            {asset} / {timeframe} / {slug || marketId}
          </div>
          {loading && (
            <div className="text-[10px] theme-muted">updating...</div>
          )}
        </div>

        <div className="mb-2 grid grid-cols-2 border border-zinc-800">
          {(["Up", "Down"] as OrderbookOutcome[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setOutcome(option)}
              className={`px-2 py-1 text-[11px] transition ${
                outcome === option
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-2 max-h-12 overflow-hidden text-[11px] text-red-400">
            Error loading orderbook: {error}
          </div>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2">
          {renderLevels("bid", bids, "No bids")}
          {renderLevels("ask", asks, "No asks")}
        </div>
      </div>
    </WindowFrame>
  );
}

function DraggableBinanceOrderbookWindow({
  asset,
  zIndex,
  onFocus,
  onClose,
}: {
  asset: Asset;
  zIndex: number;
  onFocus: () => void;
  onClose: () => void;
}) {
  const [bids, setBids] = useState<OrderbookLevel[]>([]);
  const [asks, setAsks] = useState<OrderbookLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const symbol = `${asset}USDT`;

  useEffect(() => {
    const fetchDepth = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = new URL("https://api.binance.com/api/v3/depth");
        url.searchParams.set("symbol", symbol);
        url.searchParams.set("limit", "100");

        const res = await fetch(url);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }

        const data = (await res.json()) as {
          bids?: [string, string][];
          asks?: [string, string][];
        };

        setBids(
          (data.bids ?? []).map(([price, size]) => ({
            price: Number(price),
            size: Number(size),
          }))
        );
        setAsks(
          (data.asks ?? []).map(([price, size]) => ({
            price: Number(price),
            size: Number(size),
          }))
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load depth");
      } finally {
        setLoading(false);
      }
    };

    fetchDepth();
    const interval = window.setInterval(fetchDepth, 1500);

    return () => {
      window.clearInterval(interval);
    };
  }, [symbol]);

  const maxSize = Math.max(
    1,
    ...bids.slice(0, 30).map((lvl) => lvl.size),
    ...asks.slice(0, 30).map((lvl) => lvl.size)
  );

  const renderLevels = (side: "bid" | "ask", levels: OrderbookLevel[]) => (
    <div className="flex min-h-0 flex-col overflow-hidden border theme-border">
      <div
        className={`flex justify-between bg-[var(--surface-muted)] px-2 py-1 text-[11px] ${
          side === "bid" ? "text-green-400" : "text-red-400"
        }`}
      >
        <span>{side === "bid" ? "Bids" : "Asks"}</span>
        <span>Price / Size</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto font-mono">
        {levels.slice(0, 60).map((lvl, idx) => {
          const width = `${Math.min(100, (lvl.size / maxSize) * 100)}%`;

          return (
            <div
              key={`${side}-${idx}`}
              className="relative flex justify-between px-2 py-[3px] text-[11px]"
            >
              <span
                className={`absolute inset-y-0 ${
                  side === "bid" ? "right-0 bg-green-500/10" : "right-0 bg-red-500/10"
                }`}
                style={{ width }}
              />
              <span
                className={`relative z-10 ${
                  side === "bid" ? "text-green-400" : "text-red-400"
                }`}
              >
                {lvl.price.toFixed(asset === "XRP" ? 4 : 2)}
              </span>
              <span className="relative z-10 theme-muted">
                {lvl.size.toFixed(asset === "BTC" ? 4 : 2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <WindowFrame
      title={`Binance Book / ${symbol}`}
      accent="book"
      zIndex={zIndex}
      initialX={160}
      initialY={190}
      initialWidth={500}
      initialHeight={360}
      minWidth={380}
      minHeight={280}
      onFocus={onFocus}
      onClose={onClose}
    >
      <div className="flex h-full flex-col theme-surface p-3 text-xs">
        <div className="mb-2 flex items-center justify-between">
          <div className="font-mono theme-muted">{symbol}</div>
          {loading && <div className="text-[10px] theme-muted">updating...</div>}
        </div>
        {error && (
          <div className="mb-2 max-h-12 overflow-hidden text-[11px] text-red-400">
            Error loading Binance book: {error}
          </div>
        )}
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2">
          {renderLevels("bid", bids)}
          {renderLevels("ask", asks)}
        </div>
      </div>
    </WindowFrame>
  );
}

function CoinSearchModal({
  onClose,
  onSelectCoin,
}: {
  onClose: () => void;
  onSelectCoin: (symbol: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => COINS.filter((coin) => coin.includes(query.toLowerCase())),
    [query]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm border theme-border theme-surface p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Select a chart</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm theme-muted hover:text-[var(--foreground)]"
          >
            x
          </button>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search: bitcoin, ethereum, solana, xrp..."
          className="mb-3 w-full border theme-border bg-[var(--surface-muted)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
        />

        <div className="max-h-60 space-y-1 overflow-y-auto">
          {filtered.map((coin) => (
            <button
              key={coin}
              className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]"
              onClick={() => onSelectCoin(COIN_SYMBOLS[coin])}
            >
              {coin.toUpperCase()}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-xs theme-muted">Nothing found</div>
          )}
        </div>
      </div>
    </div>
  );
}

function AssetSearchModal({
  title,
  onClose,
  onSelectAsset,
}: {
  title: string;
  onClose: () => void;
  onSelectAsset: (asset: Asset) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm border theme-border theme-surface p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm theme-muted hover:text-[var(--foreground)]"
          >
            x
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {ASSETS.map((asset) => (
            <button
              key={asset}
              className="border theme-border bg-[var(--surface-muted)] px-3 py-3 text-left text-sm hover:bg-[var(--surface-soft)]"
              onClick={() => onSelectAsset(asset)}
            >
              {asset}/USDT
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrderbookSearchModal({
  onClose,
  onSelectOrderbook,
}: {
  onClose: () => void;
  onSelectOrderbook: (params: {
    asset: Asset;
    marketId: string;
    timeframe: Timeframe;
  }) => void;
}) {
  const [step, setStep] = useState<"asset" | "timeframe">("asset");
  const [selectedAsset, setSelectedAsset] = useState<OrderbookSelection | null>(
    null
  );

  const handleSelectAsset = (asset: OrderbookSelection) => {
    setSelectedAsset(asset);
    setStep("timeframe");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm border theme-border theme-surface p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {step === "asset" ? "Select fast market" : "Select timeframe"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm theme-muted hover:text-[var(--foreground)]"
          >
            x
          </button>
        </div>

        {step === "asset" && (
          <div className="space-y-1">
            {POLY_MARKETS_BY_ASSET.map((market) => (
              <button
                key={market.asset}
                className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]"
                onClick={() => handleSelectAsset(market)}
              >
                {market.asset}
              </button>
            ))}
          </div>
        )}

        {step === "timeframe" && selectedAsset && (
          <div className="space-y-2">
            <div className="mb-2 text-xs theme-muted">
              Asset: {selectedAsset.asset}
            </div>
            <div className="flex flex-wrap gap-2">
              {ORDERBOOK_TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  className="bg-[var(--surface-muted)] px-3 py-1 text-xs hover:bg-[var(--surface-soft)]"
                  onClick={() =>
                    onSelectOrderbook({
                      asset: selectedAsset.asset,
                      marketId: selectedAsset.marketId,
                      timeframe: tf,
                    })
                  }
                >
                  {tf === "1h" ? "60m" : tf}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScalpTerminal() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOrderbookSearchOpen, setIsOrderbookSearchOpen] = useState(false);
  const [isBinanceBookSearchOpen, setIsBinanceBookSearchOpen] =
    useState(false);
  const [isPolyChartSearchOpen, setIsPolyChartSearchOpen] = useState(false);
  const [chartWindows, setChartWindows] = useState<ChartWindow[]>([]);
  const [orderbookWindows, setOrderbookWindows] = useState<OrderbookWindow[]>(
    []
  );
  const [binanceOrderbookWindows, setBinanceOrderbookWindows] = useState<
    BinanceOrderbookWindow[]
  >([]);
  const [polyChartWindows, setPolyChartWindows] = useState<PolyChartWindow[]>(
    []
  );
  const [nextId, setNextId] = useState(1);
  const [activeWindowId, setActiveWindowId] = useState<number | null>(null);

  const openChartForSymbol = (symbol: string) => {
    const id = nextId;
    setChartWindows((prev) => [...prev, { id, symbol }]);
    setActiveWindowId(id);
    setNextId((id) => id + 1);
  };

  const openOrderbookWindow = (params: {
    asset: Asset;
    marketId: string;
    timeframe: Timeframe;
  }) => {
    const id = nextId;
    setOrderbookWindows((prev) => [...prev, { id, ...params }]);
    setActiveWindowId(id);
    setNextId((id) => id + 1);
  };

  const openBinanceOrderbookWindow = (asset: Asset) => {
    const id = nextId;
    setBinanceOrderbookWindows((prev) => [...prev, { id, asset }]);
    setActiveWindowId(id);
    setNextId((id) => id + 1);
  };

  const openPolyChartWindow = (params: {
    asset: Asset;
    marketId: string;
    timeframe: Timeframe;
  }) => {
    const id = nextId;
    setPolyChartWindows((prev) => [...prev, { id, ...params }]);
    setActiveWindowId(id);
    setNextId((id) => id + 1);
  };

  const getWindowZIndex = (id: number) => (id === activeWindowId ? 45 : 35);

  const isEmpty =
    chartWindows.length === 0 &&
    orderbookWindows.length === 0 &&
    binanceOrderbookWindows.length === 0 &&
    polyChartWindows.length === 0;

  return (
    <div className="relative min-h-screen w-full overflow-hidden theme-bg">
      <div className="flex min-h-screen flex-col">
        <Header />

        <main className="relative flex flex-1 flex-col overflow-hidden theme-bg">
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4">
            {isEmpty && (
              <div className="flex max-w-xl flex-col items-center justify-center text-center">
                <p className="text-[28px] font-semibold">
                  PolyBook scalp terminal
                </p>
                <span className="mt-2 text-sm theme-muted">
                  Open an orderbook or a Binance reference chart for BTC, ETH,
                  SOL, or XRP. The workspace is focused only on fast Polymarket
                  crypto windows.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="inline-flex border theme-border theme-surface transition hover:scale-103">
                <button
                  type="button"
                  className="flex w-[112px] flex-col items-center gap-2 p-3"
                  onClick={() => setIsOrderbookSearchOpen(true)}
                  title="Open Polymarket orderbook"
                >
                  <Image
                    src="/bookmark.svg"
                    alt="Polymarket book"
                    width={60}
                    height={60}
                    className="theme-center-icon block cursor-pointer p-1 shadow-lg"
                  />
                  <span className="text-xs theme-muted">Poly Book</span>
                </button>
              </div>

              <div className="inline-flex border theme-border theme-surface transition hover:scale-103">
                <button
                  type="button"
                  className="flex w-[112px] flex-col items-center gap-2 p-3"
                  onClick={() => setIsBinanceBookSearchOpen(true)}
                  title="Open Binance orderbook"
                >
                  <Image
                    src="/bookmark.svg"
                    alt="Binance book"
                    width={60}
                    height={60}
                    className="theme-center-icon block cursor-pointer p-1 shadow-lg"
                  />
                  <span className="text-xs theme-muted">Binance Book</span>
                </button>
              </div>

              <div className="inline-flex border theme-border theme-surface transition hover:scale-103">
                <button
                  type="button"
                  className="flex w-[112px] flex-col items-center gap-2 p-3"
                  onClick={() => setIsSearchOpen(true)}
                  title="Open Binance chart"
                >
                  <Image
                    src="/metrics.svg"
                    alt="Binance chart"
                    width={60}
                    height={60}
                    className="theme-center-icon block cursor-pointer p-1 shadow-lg"
                  />
                  <span className="text-xs theme-muted">Binance Chart</span>
                </button>
              </div>

              <div className="inline-flex border theme-border theme-surface transition hover:scale-103">
                <button
                  type="button"
                  className="flex w-[112px] flex-col items-center gap-2 p-3"
                  onClick={() => setIsPolyChartSearchOpen(true)}
                  title="Open Polymarket chart"
                >
                  <Image
                    src="/metrics.svg"
                    alt="Polymarket chart"
                    width={60}
                    height={60}
                    className="theme-center-icon block cursor-pointer p-1 shadow-lg"
                  />
                  <span className="text-xs theme-muted">Poly Chart</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {isSearchOpen && (
        <CoinSearchModal
          onClose={() => setIsSearchOpen(false)}
          onSelectCoin={(symbol) => {
            openChartForSymbol(symbol);
            setIsSearchOpen(false);
          }}
        />
      )}

      {isOrderbookSearchOpen && (
        <OrderbookSearchModal
          onClose={() => setIsOrderbookSearchOpen(false)}
          onSelectOrderbook={(params) => {
            openOrderbookWindow(params);
            setIsOrderbookSearchOpen(false);
          }}
        />
      )}

      {isBinanceBookSearchOpen && (
        <AssetSearchModal
          title="Select Binance book"
          onClose={() => setIsBinanceBookSearchOpen(false)}
          onSelectAsset={(asset) => {
            openBinanceOrderbookWindow(asset);
            setIsBinanceBookSearchOpen(false);
          }}
        />
      )}

      {isPolyChartSearchOpen && (
        <OrderbookSearchModal
          onClose={() => setIsPolyChartSearchOpen(false)}
          onSelectOrderbook={(params) => {
            openPolyChartWindow(params);
            setIsPolyChartSearchOpen(false);
          }}
        />
      )}

      {chartWindows.map((window) => (
        <DraggableChartWindow
          key={window.id}
          symbol={window.symbol}
          zIndex={getWindowZIndex(window.id)}
          onFocus={() => setActiveWindowId(window.id)}
          onClose={() =>
            setChartWindows((prev) =>
              prev.filter((chart) => chart.id !== window.id)
            )
          }
        />
      ))}

      {binanceOrderbookWindows.map((window) => (
        <DraggableBinanceOrderbookWindow
          key={window.id}
          asset={window.asset}
          zIndex={getWindowZIndex(window.id)}
          onFocus={() => setActiveWindowId(window.id)}
          onClose={() =>
            setBinanceOrderbookWindows((prev) =>
              prev.filter((orderbook) => orderbook.id !== window.id)
            )
          }
        />
      ))}

      {polyChartWindows.map((window) => (
        <DraggablePolyChartWindow
          key={window.id}
          asset={window.asset}
          timeframe={window.timeframe}
          zIndex={getWindowZIndex(window.id)}
          onFocus={() => setActiveWindowId(window.id)}
          onClose={() =>
            setPolyChartWindows((prev) =>
              prev.filter((chart) => chart.id !== window.id)
            )
          }
        />
      ))}

      {orderbookWindows.map((window) => (
        <DraggableOrderbookWindow
          key={window.id}
          asset={window.asset}
          marketId={window.marketId}
          timeframe={window.timeframe}
          zIndex={getWindowZIndex(window.id)}
          onFocus={() => setActiveWindowId(window.id)}
          onClose={() =>
            setOrderbookWindows((prev) =>
              prev.filter((orderbook) => orderbook.id !== window.id)
            )
          }
        />
      ))}
    </div>
  );
}
