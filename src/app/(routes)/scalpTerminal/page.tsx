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

type OrderSide = "BUY" | "SELL";

type OrderDraft = {
  source: "Polymarket" | "Binance";
  side: OrderSide;
  asset: Asset;
  label: string;
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

function getPriceDecimals(asset: Asset, mode: "poly" | "binance") {
  if (mode === "poly") return 3;
  if (asset === "XRP") return 4;
  return 2;
}

function formatBookPrice(asset: Asset, price: number, mode: "poly" | "binance") {
  if (mode === "poly") return `${(price * 100).toFixed(1)}%`;
  return price.toFixed(getPriceDecimals(asset, mode));
}

function formatBookSize(size: number, compact = false) {
  if (!Number.isFinite(size) || size <= 0) return "";
  if (compact && size >= 1000) return `${(size / 1000).toFixed(1)}K`;
  return size.toFixed(size >= 100 ? 0 : 2);
}

function sortBids(levels: OrderbookLevel[]) {
  return [...levels]
    .filter((level) => Number.isFinite(level.price) && Number.isFinite(level.size))
    .sort((a, b) => b.price - a.price);
}

function sortAsks(levels: OrderbookLevel[]) {
  return [...levels]
    .filter((level) => Number.isFinite(level.price) && Number.isFinite(level.size))
    .sort((a, b) => a.price - b.price);
}

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

function ScalpOrderbookLadder({
  asset,
  mode,
  bids,
  asks,
  loading,
  error,
  emptyText,
  draft,
  onSelect,
}: {
  asset: Asset;
  mode: "poly" | "binance";
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  loading: boolean;
  error: string | null;
  emptyText: string;
  draft: OrderDraft | null;
  onSelect: (draft: OrderDraft) => void;
}) {
  const priceDecimals = getPriceDecimals(asset, mode);

  const rows = useMemo(() => {
    const levels = new Map<string, { price: number; bidSize: number; askSize: number }>();

    for (const level of bids) {
      if (!Number.isFinite(level.price) || !Number.isFinite(level.size)) continue;
      const key = level.price.toFixed(priceDecimals);
      const row = levels.get(key) ?? {
        price: Number(key),
        bidSize: 0,
        askSize: 0,
      };
      row.bidSize += level.size;
      levels.set(key, row);
    }

    for (const level of asks) {
      if (!Number.isFinite(level.price) || !Number.isFinite(level.size)) continue;
      const key = level.price.toFixed(priceDecimals);
      const row = levels.get(key) ?? {
        price: Number(key),
        bidSize: 0,
        askSize: 0,
      };
      row.askSize += level.size;
      levels.set(key, row);
    }

    return [...levels.values()].sort((a, b) => b.price - a.price).slice(0, 84);
  }, [asks, bids, priceDecimals]);

  const sortedBids = useMemo(() => sortBids(bids), [bids]);
  const sortedAsks = useMemo(() => sortAsks(asks), [asks]);
  const bestBid = sortedBids[0]?.price ?? null;
  const bestAsk = sortedAsks[0]?.price ?? null;
  const bidLiquidity = sortedBids.reduce((sum, level) => sum + level.size, 0);
  const askLiquidity = sortedAsks.reduce((sum, level) => sum + level.size, 0);
  const maxSize = Math.max(
    1,
    ...rows.map((row) => Math.max(row.bidSize, row.askSize))
  );
  const spread =
    bestBid !== null && bestAsk !== null ? Math.max(0, bestAsk - bestBid) : null;
  const mid =
    bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : null;

  const buildDraft = (
    side: OrderSide,
    price: number,
    size: number
  ): OrderDraft => ({
    source: mode === "poly" ? "Polymarket" : "Binance",
    side,
    asset,
    label:
      mode === "poly"
        ? `${asset} ${side} @ ${formatBookPrice(asset, price, mode)}`
        : `${asset}/USDT ${side} @ ${formatBookPrice(asset, price, mode)}`,
    price,
    size,
  });

  const renderCell = (
    row: { price: number; bidSize: number; askSize: number },
    side: "bid" | "ask"
  ) => {
    const size = side === "bid" ? row.bidSize : row.askSize;
    const active =
      draft?.price.toFixed(priceDecimals) === row.price.toFixed(priceDecimals) &&
      ((side === "ask" && draft.side === "BUY") ||
        (side === "bid" && draft.side === "SELL"));
    const width = `${Math.min(100, (size / maxSize) * 100)}%`;

    return (
      <button
        type="button"
        disabled={size <= 0}
        onClick={() =>
          onSelect(
            buildDraft(side === "ask" ? "BUY" : "SELL", row.price, size)
          )
        }
        className={`relative h-[22px] overflow-hidden px-2 text-left font-mono text-[11px] transition disabled:cursor-default ${
          side === "bid"
            ? "text-green-300 hover:bg-green-500/10"
            : "text-red-300 hover:bg-red-500/10"
        } ${active ? "ring-1 ring-sky-400" : ""}`}
      >
        {size > 0 && (
          <span
            className={`absolute inset-y-0 ${
              side === "bid"
                ? "right-0 bg-green-500/20"
                : "left-0 bg-red-500/20"
            }`}
            style={{ width }}
          />
        )}
        <span className="relative z-10 block truncate">
          {formatBookSize(size, mode === "binance")}
        </span>
      </button>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border theme-border bg-[var(--terminal-bg)]">
      <div className="grid grid-cols-4 border-b theme-border bg-[var(--surface-muted)] text-[10px] uppercase tracking-wide theme-muted">
        <div className="px-2 py-2">
          Bid Liq
          <div className="font-mono text-green-300 normal-case tracking-normal">
            {formatBookSize(bidLiquidity, true) || "--"}
          </div>
        </div>
        <div className="px-2 py-2">
          Ask Liq
          <div className="font-mono text-red-300 normal-case tracking-normal">
            {formatBookSize(askLiquidity, true) || "--"}
          </div>
        </div>
        <div className="px-2 py-2">
          Spread
          <div className="font-mono text-[var(--foreground)] normal-case tracking-normal">
            {spread === null ? "--" : formatBookPrice(asset, spread, mode)}
          </div>
        </div>
        <div className="px-2 py-2">
          Mid
          <div className="font-mono text-sky-300 normal-case tracking-normal">
            {mid === null ? "--" : formatBookPrice(asset, mid, mode)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_84px_1fr] border-b theme-border bg-[var(--surface)] px-1 py-1 font-mono text-[10px] uppercase tracking-wide theme-muted">
        <span className="px-1 text-green-300">Bid Size</span>
        <span className="px-1 text-center">Chance</span>
        <span className="px-1 text-right text-red-300">Ask Size</span>
      </div>

      {error && (
        <div className="border-b border-red-500/40 bg-red-500/10 px-2 py-2 text-[11px] text-red-300">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 && !loading ? (
          <div className="flex h-full items-center justify-center text-xs theme-muted">
            {emptyText}
          </div>
        ) : (
          rows.map((row) => {
            const isBestBid = bestBid !== null && row.price === bestBid;
            const isBestAsk = bestAsk !== null && row.price === bestAsk;
            const selected =
              draft?.price.toFixed(priceDecimals) ===
              row.price.toFixed(priceDecimals);

            return (
              <div
                key={row.price.toFixed(priceDecimals)}
                className={`grid grid-cols-[1fr_84px_1fr] border-b theme-border ${
                  selected ? "bg-sky-500/10" : ""
                }`}
              >
                {renderCell(row, "bid")}
                <button
                  type="button"
                  onClick={() => {
                    if (row.askSize > 0) {
                      onSelect(buildDraft("BUY", row.price, row.askSize));
                      return;
                    }
                    if (row.bidSize > 0) {
                      onSelect(buildDraft("SELL", row.price, row.bidSize));
                    }
                  }}
                  className={`h-[22px] border-x theme-border px-1 text-center font-mono text-[11px] transition hover:bg-[var(--surface-muted)] ${
                    isBestAsk
                      ? "bg-red-500/15 text-red-200"
                      : isBestBid
                        ? "bg-green-500/15 text-green-200"
                        : "text-[var(--foreground)]"
                  }`}
                >
                  {formatBookPrice(asset, row.price, mode)}
                </button>
                {renderCell(row, "ask")}
              </div>
            );
          })
        )}
      </div>

      <div className="border-t theme-border bg-[var(--surface-muted)] p-2">
        {draft ? (
          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
            <div className="min-w-0">
              <div
                className={`font-mono text-xs ${
                  draft.side === "BUY" ? "text-green-300" : "text-red-300"
                }`}
              >
                {draft.label}
              </div>
              <div className="mt-1 text-[10px] theme-muted">
                Size from book: {formatBookSize(draft.size, true) || "--"}
              </div>
            </div>
            <button
              type="button"
              className="border theme-border px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:bg-[var(--surface-soft)]"
            >
              Open Order
            </button>
          </div>
        ) : (
          <div className="py-2 text-center text-[11px] theme-muted">
            Click a bid or ask cell to stage an order
          </div>
        )}
      </div>
    </div>
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
  const [draft, setDraft] = useState<OrderDraft | null>(null);

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

  return (
    <WindowFrame
      title={`Orderbook / ${asset} / ${timeframe}`}
      accent="book"
      zIndex={zIndex}
      initialX={130}
      initialY={170}
      initialWidth={520}
      initialHeight={620}
      minWidth={420}
      minHeight={420}
      onFocus={onFocus}
      onClose={onClose}
    >
      <div className="flex h-full flex-col gap-2 theme-surface p-2 text-xs">
        <div className="flex justify-between gap-3">
          <div className="truncate theme-muted" title={slug || marketId}>
            {asset} / {timeframe} / {slug || marketId}
          </div>
          {loading && (
            <div className="text-[10px] theme-muted">updating...</div>
          )}
        </div>

        <div className="grid grid-cols-2 border theme-border">
          {(["Up", "Down"] as OrderbookOutcome[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setOutcome(option);
                setDraft(null);
              }}
              className={`px-2 py-1 text-[11px] transition ${
                outcome === option
                  ? "bg-[var(--surface-soft)] text-[var(--foreground)]"
                  : "theme-muted hover:bg-[var(--surface-muted)]"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <ScalpOrderbookLadder
          asset={asset}
          mode="poly"
          bids={bids}
          asks={asks}
          loading={loading}
          error={error ? `Error loading orderbook: ${error}` : null}
          emptyText="No Polymarket liquidity"
          draft={draft}
          onSelect={setDraft}
        />
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
  const [draft, setDraft] = useState<OrderDraft | null>(null);
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

  return (
    <WindowFrame
      title={`Binance Book / ${symbol}`}
      accent="book"
      zIndex={zIndex}
      initialX={160}
      initialY={190}
      initialWidth={520}
      initialHeight={620}
      minWidth={420}
      minHeight={420}
      onFocus={onFocus}
      onClose={onClose}
    >
      <div className="flex h-full flex-col gap-2 theme-surface p-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="font-mono theme-muted">{symbol}</div>
          {loading && <div className="text-[10px] theme-muted">updating...</div>}
        </div>

        <ScalpOrderbookLadder
          asset={asset}
          mode="binance"
          bids={bids}
          asks={asks}
          loading={loading}
          error={error ? `Error loading Binance book: ${error}` : null}
          emptyText="No Binance depth"
          draft={draft}
          onSelect={setDraft}
        />
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
