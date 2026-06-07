"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, type UTCTimestamp } from "lightweight-charts";
import { useTheme } from "./ThemeProvider";

type PriceChartProps = {
  symbol: string;
};

type PriceCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export default function PriceChart({ symbol }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useTheme();

  const binanceSymbol = symbol.replace("BINANCE:", "");

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const isLight = theme === "light";

    const chart = createChart(container, {
      layout: {
        background: {
          type: ColorType.Solid,
          color: isLight ? "#f7f8fb" : "#0d1017",
        },
        textColor: isLight ? "#495266" : "#b8bdcc",
      },
      grid: {
        vertLines: { color: isLight ? "#e7ebf2" : "#1b202c" },
        horzLines: { color: isLight ? "#e7ebf2" : "#1b202c" },
      },
      rightPriceScale: {
        borderColor: isLight ? "#d8dee9" : "#2b3040",
      },
      timeScale: {
        borderColor: isLight ? "#d8dee9" : "#2b3040",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: isLight ? "#8c96aa" : "#6b7280", style: 2 },
        horzLine: { color: isLight ? "#8c96aa" : "#6b7280", style: 2 },
      },
      width: container.clientWidth,
      height: container.clientHeight,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#00b59c",
      downColor: "#ff3f55",
      borderUpColor: "#00b59c",
      borderDownColor: "#ff3f55",
      wickUpColor: "#00b59c",
      wickDownColor: "#ff3f55",
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });

    chart.priceScale("").applyOptions({
      scaleMargins: {
        top: 0.82,
        bottom: 0,
      },
    });

    const fetchData = async () => {
      const res = await fetch(`/api/crypto/candles?symbol=${binanceSymbol}`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

      const data = (await res.json()) as { candles?: PriceCandle[] };
      const candlesRaw = data.candles ?? [];

      const candles = candlesRaw.map((candle) => ({
        time: candle.time as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }));

      const volumes = candlesRaw.map((candle) => {
        return {
          time: candle.time as UTCTimestamp,
          value: candle.volume,
          color:
            candle.close >= candle.open
              ? "rgba(0,181,156,0.42)"
              : "rgba(255,63,85,0.42)",
        };
      });

      candleSeries.setData(candles);
      volumeSeries.setData(volumes);
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
  }, [binanceSymbol, theme]);

  return <div ref={containerRef} className="h-full w-full theme-terminal-bg" />;
}
