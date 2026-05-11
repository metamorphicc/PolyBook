"use client";

import DropdownMenu from "@/app/Components/DropDown";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useRef } from "react";
import PriceChart from "@/app/Components/priceChart";



type DraggableChartWindowProps = {
  symbol: string;
  onClose: () => void;
};

type Timeframe = "5m" | "15m" | "1h";

type Asset = "BTC" | "ETH" | "SOL" | "XRP";

type DraggableOrderbookWindowProps = {
  asset: Asset;
  marketId: string;
  timeframe: Timeframe;
  onClose: () => void;
};

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

type CoinSearchModalProps = {
  onClose: () => void;
  onSelectCoin: (symbol: string) => void;
};

type OrderbookSelection = {
  asset: Asset;
  marketId: string;
};

type OrderbookSearchModalProps = {
  onClose: () => void;
  onSelectOrderbook: (params: {
    asset: Asset;
    marketId: string;
    timeframe: Timeframe;
  }) => void;
};

type OrderbookLevel = {
  price: number;
  size: number;
};



const COINS = ["bitcoin", "eth", "sol", "xrp"];

const COIN_SYMBOLS: Record<string, string> = {
  bitcoin: "BINANCE:BTCUSDT",
  eth: "BINANCE:ETHUSDT",
  sol: "BINANCE:SOLUSDT",
  xrp: "BINANCE:XRPUSDT",
};



const POLY_MARKETS_BY_ASSET: OrderbookSelection[] = [
  {
    asset: "BTC",
    marketId: "poly-btc-updown-id", 
  },
  {
    asset: "ETH",
    marketId: "poly-eth-updown-id",
  },
  {
    asset: "SOL",
    marketId: "poly-sol-updown-id",
  },
  {
    asset: "XRP",
    marketId: "poly-xrp-updown-id",
  },
];

const ORDERBOOK_TIMEFRAMES: Timeframe[] = ["5m", "15m", "1h"];


function DraggableChartWindow({ symbol, onClose }: DraggableChartWindowProps) {
  const [pos, setPos] = useState({ x: 40, y: 80 });
  const [size, setSize] = useState({ width: 480, height: 320 });

  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const [resizing, setResizing] = useState(false);
  const resizeStart = useRef({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

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

  const handleMouseMove = (e: MouseEvent) => {
    if (dragging) {
      setPos({
        x: e.clientX - offset.x,
        y: e.clientY - offset.y,
      });
    } else if (resizing) {
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;

      setSize({
        width: Math.max(320, resizeStart.current.width + dx),
        height: Math.max(240, resizeStart.current.height + dy),
      });
    }
  };

  const handleMouseUp = () => {
    setDragging(false);
    setResizing(false);
  };

  useEffect(() => {
    if (!dragging && !resizing) return;

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, resizing, offset]);

  return (
    <div
      className="fixed z-40 bg-white border border-zinc-300 rounded-lg shadow-xl overflow-hidden"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: size.height,
      }}
    >
      <div
        className="h-8 bg-zinc-800 text-white text-xs flex items-center justify-between px-3 cursor-move select-none"
        onMouseDown={handleMouseDownHeader}
      >
        <span>{symbol}</span>
        <button onClick={onClose} className="text-zinc-300 hover:text-white">
          ✕
        </button>
      </div>

      <div className="w-full h-[calc(100%-2rem)] bg-zinc-900">
        <PriceChart symbol={symbol} />
      </div>

      <div
        className="absolute bottom-1 right-1 w-3 h-3 cursor-se-resize bg-zinc-500/70 rounded-sm"
        onMouseDown={handleResizeMouseDown}
      />
    </div>
  );
}



function DraggableOrderbookWindow({
  asset,
  marketId,
  timeframe,
  onClose,
}: DraggableOrderbookWindowProps) {
  const [pos, setPos] = useState({ x: 120, y: 120 });
  const [size, setSize] = useState({ width: 420, height: 280 });

  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const [resizing, setResizing] = useState(false);
  const resizeStart = useRef({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const [bids, setBids] = useState<OrderbookLevel[]>([]);
  const [asks, setAsks] = useState<OrderbookLevel[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleMouseMove = (e: MouseEvent) => {
    if (dragging) {
      setPos({
        x: e.clientX - offset.x,
        y: e.clientY - offset.y,
      });
    } else if (resizing) {
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;

      setSize({
        width: Math.max(320, resizeStart.current.width + dx),
        height: Math.max(240, resizeStart.current.height + dy),
      });
    }
  };

  const handleMouseUp = () => {
    setDragging(false);
    setResizing(false);
  };

  useEffect(() => {
    if (!dragging && !resizing) return;

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, resizing, offset]);

  useEffect(() => {
    let interval: number | undefined;

    const fetchOrderbook = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/pol/orderbook?asset=${asset}&timeframe=${timeframe}`,
        );

        if (!res.ok) {
          const text = await res.text();
          console.error("[orderbook] bad response:", res.status, text);
          setError(`HTTP ${res.status}`);
          return;
        }

        const data = await res.json();
        console.log("[OrderbookWindow] raw orderbook:", data);

        const mappedBids: OrderbookLevel[] = (data.bids ?? []).map(
          (lvl: any) => ({
            price: Number(lvl.price),
            size: Number(lvl.size),
          }),
        );

        const mappedAsks: OrderbookLevel[] = (data.asks ?? []).map(
          (lvl: any) => ({
            price: Number(lvl.price),
            size: Number(lvl.size),
          }),
        );

        setBids(mappedBids);
        setAsks(mappedAsks);
      } catch (e: any) {
        console.error("[orderbook] fetch error:", e);
        setError(e?.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    console.log(
      "[OrderbookWindow] init for",
      asset,
      "marketId:",
      marketId,
      "timeframe:",
      timeframe,
    );

    fetchOrderbook();
    interval = window.setInterval(fetchOrderbook, 2000);

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [asset, marketId, timeframe]);

  const handlePriceClick = (side: "bid" | "ask", level: OrderbookLevel) => {
    console.log(
      `[OrderbookWindow] click on ${side} price`,
      level.price,
      "size",
      level.size,
      "asset",
      asset,
      "marketId",
      marketId,
      "timeframe",
      timeframe,
    );
 
  };

  return (
    <div
      className="fixed z-40 bg-white border border-zinc-300 rounded-lg shadow-xl overflow-hidden"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: size.height,
      }}
    >
      <div
        className="h-8 bg-indigo-900 text-white text-xs flex items-center justify-between px-3 cursor-move select-none"
        onMouseDown={handleMouseDownHeader}
      >
        <span>
          Orderbook • {asset} • {timeframe}
        </span>
        <button onClick={onClose} className="text-zinc-300 hover:text-white">
          ✕
        </button>
      </div>

      <div className="w-full h-[calc(100%-2rem)] bg-zinc-950 text-xs text-zinc-100 p-3">
        <div className="flex justify-between mb-2">
          <div className="text-zinc-500">
            asset: {asset} • marketId: {marketId}
          </div>
          {loading && (
            <div className="text-[10px] text-zinc-500">updating...</div>
          )}
        </div>

        {error && (
          <div className="text-[11px] text-red-400 mb-2">
            Error loading orderbook: {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 h-full">
          {/* Bids */}
          <div className="flex flex-col border border-zinc-800 rounded-md overflow-hidden">
            <div className="px-2 py-1 bg-zinc-900 text-[11px] text-green-400 flex justify-between">
              <span>Bids</span>
              <span>Price / Size</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {bids.length === 0 && !loading && (
                <div className="text-[11px] text-zinc-600 px-2 py-1">
                  No bids
                </div>
              )}
              {bids.map((lvl, idx) => (
                <button
                  key={idx}
                  className="w-full text-left px-2 py-[3px] text-[11px] hover:bg-green-950/60 flex justify-between"
                  onClick={() => handlePriceClick("bid", lvl)}
                >
                  <span className="text-green-400">
                    {lvl.price.toFixed(3)}
                  </span>
                  <span className="text-zinc-400">
                    {lvl.size.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Asks */}
          <div className="flex flex-col border border-zinc-800 rounded-md overflow-hidden">
            <div className="px-2 py-1 bg-zinc-900 text-[11px] text-red-400 flex justify-between">
              <span>Asks</span>
              <span>Price / Size</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {asks.length === 0 && !loading && (
                <div className="text-[11px] text-zinc-600 px-2 py-1">
                  No asks
                </div>
              )}
              {asks.map((lvl, idx) => (
                <button
                  key={idx}
                  className="w-full text-left px-2 py-[3px] text-[11px] hover:bg-red-950/60 flex justify-between"
                  onClick={() => handlePriceClick("ask", lvl)}
                >
                  <span className="text-red-400">
                    {lvl.price.toFixed(3)}
                  </span>
                  <span className="text-zinc-400">
                    {lvl.size.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-1 right-1 w-3 h-3 cursor-se-resize bg-indigo-500/70 rounded-sm"
        onMouseDown={handleResizeMouseDown}
      />
    </div>
  );
}



function CoinSearchModal({ onClose, onSelectCoin }: CoinSearchModalProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => COINS.filter((c) => c.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm rounded-xl bg-zinc-900 p-4 shadow-xl border border-zinc-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Select a coin</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search: bitcoin, eth, sol, xrp..."
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500 mb-3"
        />

        <div className="space-y-1 max-h-60 overflow-y-auto">
          {filtered.map((coin) => (
            <button
              key={coin}
              className="w-full text-left px-3 py-2 rounded-md text-sm text-zinc-100 hover:bg-zinc-800"
              onClick={() => {
                const symbol = COIN_SYMBOLS[coin];
                onSelectCoin(symbol);
              }}
            >
              {coin.toUpperCase()}
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="text-xs text-zinc-500 px-3 py-2">Nothing found</div>
          )}
        </div>
      </div>
    </div>
  );
}



function OrderbookSearchModal({
  onClose,
  onSelectOrderbook,
}: OrderbookSearchModalProps) {
  const [step, setStep] = useState<"asset" | "timeframe">("asset");
  const [selectedAsset, setSelectedAsset] = useState<OrderbookSelection | null>(
    null,
  );

  const handleSelectAsset = (asset: OrderbookSelection) => {
    setSelectedAsset(asset);
    setStep("timeframe");
  };

  const handleSelectTimeframe = (tf: Timeframe) => {
    if (!selectedAsset) return;
    onSelectOrderbook({
      asset: selectedAsset.asset,
      marketId: selectedAsset.marketId,
      timeframe: tf,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm rounded-xl bg-zinc-900 p-4 shadow-xl border border-zinc-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">
            {step === "asset" ? "Select asset" : "Select timeframe"}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>

        {step === "asset" && (
          <div className="space-y-1">
            {POLY_MARKETS_BY_ASSET.map((mkt) => (
              <button
                key={mkt.asset}
                className="w-full text-left px-3 py-2 rounded-md text-sm text-zinc-100 hover:bg-zinc-800"
                onClick={() => handleSelectAsset(mkt)}
              >
                {mkt.asset}
              </button>
            ))}
          </div>
        )}

        {step === "timeframe" && selectedAsset && (
          <div className="space-y-2">
            <div className="text-xs text-zinc-400 mb-2">
              Asset: {selectedAsset.asset}
            </div>
            <div className="flex flex-wrap gap-2">
              {ORDERBOOK_TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  className="px-3 py-1 rounded-md text-xs bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                  onClick={() => handleSelectTimeframe(tf)}
                >
                  {tf}
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
  const router = useRouter();

  const [isSearchOpen, setIsSearchOpen] = useState(false); // графики
  const [isOrderbookSearchOpen, setIsOrderbookSearchOpen] = useState(false); // стаканы

  const [chartWindows, setChartWindows] = useState<ChartWindow[]>([]);
  const [orderbookWindows, setOrderbookWindows] = useState<OrderbookWindow[]>(
    [],
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
    setOrderbookWindows((prev) => [
      ...prev,
      { id: nextId, ...params },
    ]);
    setNextId((id) => id + 1);
  };

  const isEmpty =
    chartWindows.length === 0 && orderbookWindows.length === 0;

  return (
    <div className="relative w-full">
      <div className="h-screen flex flex-col bg-[#F3EFEF]">
        <div className="absolute">
          <DropdownMenu />
        </div>

        <div className="flex items-center justify-center h-full flex-col gap-5">
          {isEmpty && (
            <div className="flex items-center flex-col justify-center">
              <p className="font-semibold text-zinc-700">The panel is empty</p>
              <span className="text-zinc-700">
                Select a chart or orderbook to start trading
              </span>
            </div>
          )}
          <div className="flex gap-5">
            <div className="border border-zinc-700 hover:scale-103 transition inline-flex">
              <button
                className="p-0"
                onClick={() => setIsOrderbookSearchOpen(true)}
              >
                <Image
                  src="/bookmark.svg"
                  alt="Orderbooks"
                  width={60}
                  height={60}
                  className="shadow-lg p-1 cursor-pointer block"
                />
              </button>
            </div>

            <div className="border border-zinc-700 hover:scale-103 transition inline-flex">
              <button className="p-0" onClick={() => setIsSearchOpen(true)}>
                <Image
                  src="/metrics.svg"
                  alt="Charts"
                  width={60}
                  height={60}
                  className="shadow-lg p-1 bg-none cursor-pointer block"
                />
              </button>
            </div>
          </div>
        </div>
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

      {chartWindows.map((w) => (
        <DraggableChartWindow
          key={w.id}
          symbol={w.symbol}
          onClose={() =>
            setChartWindows((prev) => prev.filter((cw) => cw.id !== w.id))
          }
        />
      ))}

      {orderbookWindows.map((w) => (
        <DraggableOrderbookWindow
          key={w.id}
          asset={w.asset}
          marketId={w.marketId}
          timeframe={w.timeframe}
          onClose={() =>
            setOrderbookWindows((prev) =>
              prev.filter((ow) => ow.id !== w.id),
            )
          }
        />
      ))}
    </div>
  );
}