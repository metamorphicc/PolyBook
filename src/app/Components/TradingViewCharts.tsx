"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    TradingView: any;
  }
}

type TradingViewChartProps = {
  symbol: string;
};

let tvScriptLoadingPromise: Promise<void> | null = null;

export default function TradingViewChart({ symbol }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!tvScriptLoadingPromise) {
      tvScriptLoadingPromise = new Promise<void>((resolve) => {
        const script = document.createElement("script");
        script.id = "tradingview-widget-loading-script";
        script.src = "https://s3.tradingview.com/tv.js";
        script.type = "text/javascript";
        script.onload = () => {
          console.log("[TV] script loaded");
          resolve();
        };
        document.head.appendChild(script);
      });
    }

    tvScriptLoadingPromise.then(() => {
      if (!window.TradingView || !containerRef.current) {
        console.warn("[TV] TradingView or container missing");
        return;
      }

      const containerId = containerRef.current.id;
      console.log("[TV] creating widget for", symbol, "in", containerId);

      containerRef.current.innerHTML = "";

      new window.TradingView.widget({
        width: "100%",
        height: "100%",
        symbol,
        interval: "60",
        timezone: "Etc/UTC",
        theme: "light",
        style: "1",
        locale: "en",
        toolbar_bg: "#f1f3f6",
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: false,
        container_id: containerId,
      });
    });
  }, [symbol]);

  return (
    <div className="w-full h-full">
      <div
        id="tradingview_chart_container"
        ref={containerRef}
        className="w-full h-full"
      />
    </div>
  );
}