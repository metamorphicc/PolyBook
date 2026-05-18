"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, type UTCTimestamp } from "lightweight-charts";
import { useTheme } from "./ThemeProvider";

type PriceChartProps = {
  symbol: string;
};

type BinanceCandle = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

const BINANCE_HISTORY_START_MS = Date.UTC(2025, 0, 1);
const BINANCE_INTERVAL_MS = 60 * 60 * 1000;
const MAX_BINANCE_PAGES = 30;

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
      const candlesRaw: BinanceCandle[] = [];
      let startTime = BINANCE_HISTORY_START_MS;
      const endTime = Date.now();

      for (let page = 0; page < MAX_BINANCE_PAGES && startTime < endTime; page += 1) {
        const url = new URL("https://api.binance.com/api/v3/klines");
        url.searchParams.set("symbol", binanceSymbol);
        url.searchParams.set("interval", "1h");
        url.searchParams.set("limit", "1000");
        url.searchParams.set("startTime", String(startTime));
        url.searchParams.set("endTime", String(endTime));

        const res = await fetch(url);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const pageCandles = (await res.json()) as BinanceCandle[];
        if (pageCandles.length === 0) break;

        candlesRaw.push(...pageCandles);
        const lastOpenTime = Number(pageCandles[pageCandles.length - 1][0]);
        startTime = lastOpenTime + BINANCE_INTERVAL_MS;

        if (pageCandles.length < 1000) break;
      }

      const candles = candlesRaw.map((candle) => ({
        time: Math.floor(Number(candle[0]) / 1000) as UTCTimestamp,
        open: Number(candle[1]),
        high: Number(candle[2]),
        low: Number(candle[3]),
        close: Number(candle[4]),
      }));

      const volumes = candlesRaw.map((candle) => {
        const open = Number(candle[1]);
        const close = Number(candle[4]);

        return {
          time: Math.floor(Number(candle[0]) / 1000) as UTCTimestamp,
          value: Number(candle[5]),
          color:
            close >= open
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
