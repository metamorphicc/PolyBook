"use client";

import DropdownMenu from "@/app/Components/DropDown";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import CoinChart from "./CoinSearchModal";
import PriceChart from "@/app/Components/priceChart";

type DraggableChartWindowProps = {
  symbol: string;
  onClose: () => void;
};

function DraggableChartWindow({ symbol, onClose }: DraggableChartWindowProps) {
  const [pos, setPos] = useState({ x: 40, y: 80 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging) return;
    setPos({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    });
  };

  const handleMouseUp = () => setDragging(false);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, offset]);

  return (
    <div
      className="fixed z-40 w-80 h-72 bg-white border border-zinc-300 rounded-lg shadow-xl overflow-hidden"
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        className="h-8 bg-zinc-800 text-white text-xs flex items-center justify-between px-3 cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <span>{symbol}</span>
        <button onClick={onClose} className="text-zinc-300 hover:text-white">
          ✕
        </button>
      </div>

      <div className="w-full h-[calc(100%-2rem)]">
        <CoinChart symbol={symbol} />
      </div>
    </div>
  );
}

type CoinSearchModalProps = {
  onClose: () => void;
  onSelectCoin: (symbol: string) => void;
};

const COINS = ["bitcoin", "eth", "sol", "xrp"];

const COIN_SYMBOLS: Record<string, string> = {
  bitcoin: "BINANCE:BTCUSDT",
  eth: "BINANCE:ETHUSDT",
  sol: "BINANCE:SOLUSDT",
  xrp: "BINANCE:XRPUSDT",
};

function CoinSearchModal({ onClose, onSelectCoin }: CoinSearchModalProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => COINS.filter((c) => c.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* фон */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* окно */}
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


export default function ScalpTerminal() {
  const router = useRouter();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  return (
    <div className="relative w-full">
      <div className="h-screen flex flex-col bg-[#F3EFEF]">
        <div className="absolute">
          <DropdownMenu />
        </div>

        <div className="flex items-center justify-center h-full flex-col gap-5">
          <div className="flex items-center flex-col justify-center">
            <p className="font-semibold text-zinc-700">The panel is empty</p>
            <span className="text-zinc-700">
              Select a chart or orderbook to start trading
            </span>
          </div>

          <div className="flex gap-5">
            <div className="border border-zinc-700 hover:scale-103 transition inline-flex">
              <button className="p-0" onClick={() => setIsSearchOpen(true)}>
                <Image
                  src="/bookmark.svg"
                  alt="img"
                  width={60}
                  height={60}
                  className="shadow-lg p-1 cursor-pointer block"
                />
              </button>
            </div>

            <div className="border border-zinc-700 hover:scale-103 transition inline-flex">
              <button className="p-0">
                <Image
                  src="/metrics.svg"
                  alt="img"
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
            setSelectedSymbol(symbol);
            setIsSearchOpen(false);
          }}
        />
      )}

      {selectedSymbol && (
        <div className="w-full max-w-3xl h-[500px] mt-4 border border-zinc-700 rounded-lg overflow-hidden bg-zinc-900">
          <PriceChart symbol={selectedSymbol} />
        </div>
      )}
    </div>
  );
}
