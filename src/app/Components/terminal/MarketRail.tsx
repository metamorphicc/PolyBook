"use client";

import { useEffect, useState } from "react";
import {
  ASSETS,
  TIMEFRAMES,
  formatCountdown,
  type Asset,
  type Timeframe,
} from "./types";
import type { TradingSettings } from "../tradingSettings";

const RAIL_POLL_MS = 4000;

type RailRow = {
  asset: Asset;
  timeframe: Timeframe;
  slug: string;
  conditionId: string;
  upTokenId: string;
  downTokenId: string;
  upMid: number | null;
  endTs: number;
};

/**
 * The left rail: every fast market on one screen, 4 assets x 3 timeframes.
 *
 * One `/api/pol/rail` call covers all 12 rows (the route batches the midpoints),
 * so this polls slower than the ladder without costing 12 requests a tick.
 */
export function MarketRail({
  asset,
  timeframe,
  settings,
  onSelect,
}: {
  asset: Asset;
  timeframe: Timeframe;
  settings: TradingSettings;
  onSelect: (asset: Asset, timeframe: Timeframe) => void;
}) {
  const [rows, setRows] = useState<RailRow[]>([]);
  const [clockOffset, setClockOffset] = useState(0);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/pol/rail", { cache: "no-store" });
        if (!res.ok) return;

        const data = (await res.json()) as {
          markets?: RailRow[];
          serverTs?: number;
        };
        if (cancelled) return;

        if (data.markets) setRows(data.markets);
        if (Number.isFinite(data.serverTs)) {
          setClockOffset(Number(data.serverTs) - Math.floor(Date.now() / 1000));
        }
      } catch {
        // A missed rail tick just leaves the previous mids on screen.
      }
    };

    load();
    const interval = window.setInterval(load, RAIL_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  // Countdowns tick locally between polls.
  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const serverNow = now + clockOffset;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border-r theme-border bg-[var(--surface)]">
      <div className="shrink-0 border-b theme-border px-2 py-1.5 text-[9px] uppercase tracking-wide theme-muted">
        Markets
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {ASSETS.map((rowAsset) => {
          const assetAllowed = settings.allowedAssets[rowAsset];

          return (
            <div key={rowAsset} className="border-b theme-border">
              <div className="px-2 pt-1.5 text-[10px] font-semibold tracking-wide text-[var(--foreground)]">
                {rowAsset}
              </div>
              {TIMEFRAMES.map((rowTimeframe) => {
                const row = rows.find(
                  (item) =>
                    item.asset === rowAsset && item.timeframe === rowTimeframe,
                );
                const active =
                  rowAsset === asset && rowTimeframe === timeframe;
                // Disabled rather than hidden, so the grid stays predictable.
                const disabled =
                  !assetAllowed || !settings.allowedTimeframes[rowTimeframe];
                const secondsLeft = row ? row.endTs - serverNow : null;

                return (
                  <button
                    key={rowTimeframe}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelect(rowAsset, rowTimeframe)}
                    className={`grid w-full grid-cols-[24px_1fr_auto] items-center gap-1 px-2 py-1 text-left font-mono text-[10px] transition disabled:cursor-not-allowed disabled:opacity-30 ${
                      active
                        ? "bg-[var(--accent)]/20 text-[var(--foreground)]"
                        : "theme-muted hover:bg-[var(--surface-muted)]"
                    }`}
                  >
                    <span>{rowTimeframe}</span>
                    <span
                      className={
                        row?.upMid == null
                          ? "theme-muted"
                          : row.upMid >= 0.5
                            ? "text-green-300"
                            : "text-red-300"
                      }
                    >
                      {row?.upMid == null
                        ? "--"
                        : `${(row.upMid * 100).toFixed(1)}%`}
                    </span>
                    <span
                      className={
                        secondsLeft !== null && secondsLeft <= 30
                          ? "text-red-400"
                          : "theme-muted"
                      }
                    >
                      {formatCountdown(secondsLeft)}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="shrink-0 border-t theme-border px-2 py-1 text-[9px] leading-tight theme-muted">
        Up chance · time left
      </div>
    </div>
  );
}
