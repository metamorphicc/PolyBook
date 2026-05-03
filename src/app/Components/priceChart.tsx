"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, type UTCTimestamp } from "lightweight-charts";

type PriceChartProps = {
  symbol: string; 
};

export default function PriceChart({ symbol }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const binanceSymbol = symbol.replace("BINANCE:", ""); 

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "#020617" },
        textColor: "#e5e7eb",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      rightPriceScale: {
        borderColor: "#1f2937",
      },
      timeScale: {
        borderColor: "#1f2937",
      },
      width: container.clientWidth,
      height: container.clientHeight,
    });

    const lineSeries = chart.addLineSeries({
      color: "#22c55e",
      lineWidth: 2,
    });

    const fetchData = async () => {
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=1m&limit=2000`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json: any[] = await res.json();

      const data = json.map((candle) => ({
        time: Math.floor(candle[0] / 1000) as UTCTimestamp,
        value: parseFloat(candle[4]),
      }));

      lineSeries.setData(data);
      chart.timeScale().fitContent();
    };

    fetchData().catch(console.error);

 
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [binanceSymbol]);

  return <div ref={containerRef} className="w-full h-full" />;
}
