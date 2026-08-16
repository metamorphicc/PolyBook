"use client";

import {
  formatCountdown,
  formatSignedUsd,
  formatUsd,
  type Asset,
  type Outcome,
  type Timeframe,
} from "./types";

/**
 * The top strip: what you are trading, how long is left, and the three numbers
 * you glance at mid-trade — working orders, open PnL, spendable balance.
 */
export function TerminalStatusBar({
  asset,
  timeframe,
  outcome,
  secondsLeft,
  mid,
  openOrderCount,
  openPnl,
  balanceUsd,
  connected,
  stale,
  ready,
  onOpenSettings,
  onToggleHelp,
}: {
  asset: Asset;
  timeframe: Timeframe;
  outcome: Outcome;
  secondsLeft: number | null;
  mid: number | null;
  openOrderCount: number;
  openPnl: number;
  balanceUsd: number | null;
  connected: boolean;
  stale: boolean;
  ready: boolean;
  onOpenSettings: () => void;
  onToggleHelp: () => void;
}) {
  const expiring = secondsLeft !== null && secondsLeft <= 30;

  return (
    <div className="flex h-full items-center gap-3 border-b theme-border bg-[var(--surface)] px-3 text-[11px]">
      <div className="flex items-center gap-1.5 font-mono font-semibold text-[var(--foreground)]">
        <span>{asset}</span>
        <span className={outcome === "Up" ? "text-green-300" : "text-red-300"}>
          {outcome === "Up" ? "▲" : "▼"}
        </span>
        <span className="theme-muted">{timeframe}</span>
      </div>

      <div
        className={`font-mono tabular-nums ${
          expiring ? "font-semibold text-red-400" : "theme-muted"
        }`}
        title="Time until this market resolves"
      >
        {formatCountdown(secondsLeft)}
      </div>

      <div className="font-mono theme-muted">
        mid{" "}
        <span className="text-sky-300">
          {mid === null ? "--" : `${(mid * 100).toFixed(1)}%`}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <Field label="Orders" value={String(openOrderCount)} />
        <Field
          label="PnL"
          value={formatSignedUsd(openPnl)}
          tone={
            openPnl > 0
              ? "text-green-300"
              : openPnl < 0
                ? "text-red-300"
                : undefined
          }
        />
        <Field
          label="pUSD"
          value={balanceUsd === null ? "--" : formatUsd(balanceUsd)}
          tone={
            balanceUsd !== null && balanceUsd <= 0 ? "text-amber-300" : undefined
          }
        />

        <span
          title={
            !connected
              ? "Wallet not connected"
              : !ready
                ? "Trading not enabled"
                : stale
                  ? "Book feed stale"
                  : "Live"
          }
          className={`h-2 w-2 rounded-full ${
            !connected
              ? "bg-zinc-500"
              : !ready
                ? "bg-amber-400"
                : stale
                  ? "bg-amber-400"
                  : "bg-green-400"
          }`}
        />

        <button
          type="button"
          onClick={onToggleHelp}
          title="Keyboard shortcuts"
          className="border theme-border px-1.5 py-0.5 text-[10px] theme-muted transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
        >
          ?
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          title="Trading settings"
          className="border theme-border px-1.5 py-0.5 text-[10px] theme-muted transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
        >
          ⚙
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-[9px] uppercase tracking-wide theme-muted">
        {label}
      </span>
      <span className={`font-mono tabular-nums ${tone ?? "text-[var(--foreground)]"}`}>
        {value}
      </span>
    </div>
  );
}
