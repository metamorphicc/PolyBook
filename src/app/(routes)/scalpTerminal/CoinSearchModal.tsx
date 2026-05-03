"use client";

import { useEffect, useState } from "react";

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type CoinChartProps = {
  symbol: string; 
};

export default function CoinChart({ symbol }: CoinChartProps) {
  const [data, setData] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const binanceSymbol = symbol.replace("BINANCE:", ""); 

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=1m&limit=200`
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();

        const candles: Candle[] = json.map((c: any[]) => ({
          time: c[0],
          open: parseFloat(c[1]),
          high: parseFloat(c[2]),
          low: parseFloat(c[3]),
          close: parseFloat(c[4]),
        }));

        setData(candles);
      } catch (e: any) {
        setError(e.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [binanceSymbol]);

  if (loading)
    return <div className="text-xs text-zinc-500 p-2">Loading...</div>;
  if (error)
    return <div className="text-xs text-red-500 p-2">Error: {error}</div>;
  if (!data.length)
    return <div className="text-xs text-zinc-500 p-2">No data</div>;

  const minPrice = Math.min(...data.map((c) => c.close));
  const maxPrice = Math.max(...data.map((c) => c.close));
  const range = maxPrice - minPrice || 1;

  return (
    <svg className="w-full h-full bg-zinc-950" viewBox="0 0 100 100">
      {data.map((candle, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((candle.close - minPrice) / range) * 100;

        const next = data[i + 1];
        if (!next) return null;

        const nextX = ((i + 1) / (data.length - 1)) * 100;
        const nextY = 100 - ((next.close - minPrice) / range) * 100;

        return (
          <line
            key={candle.time}
            x1={x}
            y1={y}
            x2={nextX}
            y2={nextY}
            stroke="#22c55e"
            strokeWidth={0.4}
          />
        );
      })}
    </svg>
  );
}
