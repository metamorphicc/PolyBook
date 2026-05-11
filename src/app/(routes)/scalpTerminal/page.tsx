"use client";

import Header from "@/app/Components/header";
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
  initialX: number;
  initialY: number;
  initialWidth: number;
  initialHeight: number;
  minWidth: number;
  minHeight: number;
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

function WindowFrame({
  title,
  accent = "chart",
  initialX,
  initialY,
  initialWidth,
  initialHeight,
  minWidth,
  minHeight,
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
      className="fixed z-40 overflow-hidden border border-zinc-300 bg-white shadow-2xl"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: size.height,
      }}
    >
      <div
        className={`flex h-8 cursor-move select-none items-center justify-between px-3 text-xs text-white ${
          accent === "book" ? "bg-zinc-950" : "bg-zinc-800"
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
  onClose,
}: {
  symbol: string;
  onClose: () => void;
}) {
  return (
    <WindowFrame
      title={symbol}
      initialX={52}
      initialY={150}
      initialWidth={520}
      initialHeight={340}
      minWidth={340}
      minHeight={260}
      onClose={onClose}
    >
      <div className="h-full w-full bg-zinc-900">
        <PriceChart symbol={symbol} />
      </div>
    </WindowFrame>
  );
}

function DraggableOrderbookWindow({
  asset,
  marketId,
  timeframe,
  onClose,
}: {
  asset: Asset;
  marketId: string;
  timeframe: Timeframe;
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
      initialX={130}
      initialY={170}
      initialWidth={460}
      initialHeight={320}
      minWidth={360}
      minHeight={260}
      onClose={onClose}
    >
      <div className="flex h-full flex-col bg-zinc-950 p-3 text-xs text-zinc-100">
        <div className="mb-2 flex justify-between gap-3">
          <div className="truncate text-zinc-500" title={slug || marketId}>
            {asset} / {timeframe} / {slug || marketId}
          </div>
          {loading && (
            <div className="text-[10px] text-zinc-500">updating...</div>
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
      <div className="relative z-10 w-full max-w-sm border border-zinc-700 bg-zinc-900 p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Select a chart</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-zinc-400 hover:text-white"
          >
            x
          </button>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search: bitcoin, ethereum, solana, xrp..."
          className="mb-3 w-full border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
        />

        <div className="max-h-60 space-y-1 overflow-y-auto">
          {filtered.map((coin) => (
            <button
              key={coin}
              className="w-full px-3 py-2 text-left text-sm text-zinc-100 hover:bg-zinc-800"
              onClick={() => onSelectCoin(COIN_SYMBOLS[coin])}
            >
              {coin.toUpperCase()}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-xs text-zinc-500">Nothing found</div>
          )}
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
      <div className="relative z-10 w-full max-w-sm border border-zinc-700 bg-zinc-900 p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            {step === "asset" ? "Select fast market" : "Select timeframe"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-zinc-400 hover:text-white"
          >
            x
          </button>
        </div>

        {step === "asset" && (
          <div className="space-y-1">
            {POLY_MARKETS_BY_ASSET.map((market) => (
              <button
                key={market.asset}
                className="w-full px-3 py-2 text-left text-sm text-zinc-100 hover:bg-zinc-800"
                onClick={() => handleSelectAsset(market)}
              >
                {market.asset}
              </button>
            ))}
          </div>
        )}

        {step === "timeframe" && selectedAsset && (
          <div className="space-y-2">
            <div className="mb-2 text-xs text-zinc-400">
              Asset: {selectedAsset.asset}
            </div>
            <div className="flex flex-wrap gap-2">
              {ORDERBOOK_TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  className="bg-zinc-800 px-3 py-1 text-xs text-zinc-100 hover:bg-zinc-700"
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
  const [chartWindows, setChartWindows] = useState<ChartWindow[]>([]);
  const [orderbookWindows, setOrderbookWindows] = useState<OrderbookWindow[]>(
    []
  );
  const [nextId, setNextId] = useState(1);

  const openChartForSymbol = (symbol: string) => {
    setChartWindows((prev) => [...prev, { id: nextId, symbol }]);
    setNextId((id) => id + 1);
  };

  const openOrderbookWindow = (params: {
    asset: Asset;
    marketId: string;
    timeframe: Timeframe;
  }) => {
    setOrderbookWindows((prev) => [...prev, { id: nextId, ...params }]);
    setNextId((id) => id + 1);
  };

  const isEmpty = chartWindows.length === 0 && orderbookWindows.length === 0;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-zinc-100">
      <div className="flex min-h-screen flex-col">
        <Header />

        <main className="relative flex flex-1 flex-col overflow-hidden bg-[#f4f4f2]">
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4">
            {isEmpty && (
              <div className="flex max-w-xl flex-col items-center justify-center text-center">
                <p className="text-[28px] font-semibold text-zinc-900">
                  PolyBook scalp terminal
                </p>
                <span className="mt-2 text-sm text-zinc-600">
                  Open an orderbook or a Binance reference chart for BTC, ETH,
                  SOL, or XRP. The workspace is focused only on fast Polymarket
                  crypto windows.
                </span>
              </div>
            )}

            <div className="flex gap-5">
              <div className="inline-flex border border-zinc-700 bg-white transition hover:scale-103">
                <button
                  type="button"
                  className="p-0"
                  onClick={() => setIsOrderbookSearchOpen(true)}
                  title="Open orderbook"
                >
                  <Image
                    src="/bookmark.svg"
                    alt="Orderbooks"
                    width={60}
                    height={60}
                    className="block cursor-pointer p-1 shadow-lg"
                  />
                </button>
              </div>

              <div className="inline-flex border border-zinc-700 bg-white transition hover:scale-103">
                <button
                  type="button"
                  className="p-0"
                  onClick={() => setIsSearchOpen(true)}
                  title="Open chart"
                >
                  <Image
                    src="/metrics.svg"
                    alt="Charts"
                    width={60}
                    height={60}
                    className="block cursor-pointer p-1 shadow-lg"
                  />
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

      {chartWindows.map((window) => (
        <DraggableChartWindow
          key={window.id}
          symbol={window.symbol}
          onClose={() =>
            setChartWindows((prev) =>
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
