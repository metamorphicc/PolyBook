"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

type PriceChartProps = {
  symbol: string; 
};

type Kline = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
};

export default function PriceChart({ symbol }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const binanceSymbol = symbol.replace("BINANCE:", ""); 

  useEffect(() => {
    if (!containerRef.current) return;

    const chart: any = createChart(containerRef.current, {
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
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const series: ISeriesApi<"Candlestick"> = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      wickUpColor: "#22c55e",
    });

    const handleResize = () => {
      if (!containerRef.current) return;
      chart.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    };

    window.addEventListener("resize", handleResize);

    const fetchData = async () => {
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=1m&limit=200`
      );
      const json: any[] = await res.json();

      const data: Kline[] = json.map((candle) => ({
        time: Math.floor(candle[0] / 1000) as UTCTimestamp,
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
      }));

      series.setData(data);
      chart.timeScale().fitContent();
    };

    fetchData();

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [binanceSymbol]);

  return <div ref={containerRef} className="w-full h-full" />;
}