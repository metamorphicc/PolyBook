"use client";

import { useState } from "react";
import {
  formatBookPrice,
  formatSignedUsd,
  formatUsd,
  type LiveFill,
  type LiveOrder,
  type LivePosition,
} from "./types";

type Tab = "positions" | "orders" | "fills";

/**
 * The bottom blotter: positions with a working exit, orders with a working
 * cancel, and the recent fill tape.
 *
 * Every row that represents money has an action on it — this is the panel that
 * makes a position closable before the market resolves.
 */
export function BlotterPanel({
  positions,
  orders,
  fills,
  busyId,
  onClosePosition,
  onCancelOrder,
  onCancelAll,
  onSelectPosition,
  ready,
}: {
  positions: LivePosition[];
  orders: LiveOrder[];
  fills: LiveFill[];
  /** Token id or order id currently being acted on, for per-row spinners. */
  busyId: string | null;
  onClosePosition: (position: LivePosition) => void;
  onCancelOrder: (orderId: string) => void;
  onCancelAll: () => void;
  onSelectPosition: (position: LivePosition) => void;
  ready: boolean;
}) {
  const [tab, setTab] = useState<Tab>("positions");

  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    { key: "positions", label: "Positions", count: positions.length },
    { key: "orders", label: "Orders", count: orders.length },
    { key: "fills", label: "Fills", count: fills.length },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border-t theme-border bg-[var(--surface)]">
      <div className="flex shrink-0 items-center border-b theme-border">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition ${
              tab === item.key
                ? "border-b-2 border-[var(--accent)] text-[var(--foreground)]"
                : "theme-muted hover:text-[var(--foreground)]"
            }`}
          >
            {item.label}
            {item.count > 0 && (
              <span className="ml-1 font-mono normal-case theme-muted">
                {item.count}
              </span>
            )}
          </button>
        ))}

        {tab === "orders" && orders.length > 0 && (
          <button
            type="button"
            disabled={!ready}
            onClick={onCancelAll}
            className="ml-auto mr-2 border border-red-500/40 px-2 py-0.5 text-[10px] text-red-300 transition hover:bg-red-500/10 disabled:opacity-40"
          >
            Cancel all
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "positions" && (
          <PositionsTable
            positions={positions}
            busyId={busyId}
            ready={ready}
            onClose={onClosePosition}
            onSelect={onSelectPosition}
          />
        )}
        {tab === "orders" && (
          <OrdersTable
            orders={orders}
            busyId={busyId}
            ready={ready}
            onCancel={onCancelOrder}
          />
        )}
        {tab === "fills" && <FillsTable fills={fills} />}
      </div>
    </div>
  );
}

function PositionsTable({
  positions,
  busyId,
  ready,
  onClose,
  onSelect,
}: {
  positions: LivePosition[];
  busyId: string | null;
  ready: boolean;
  onClose: (position: LivePosition) => void;
  onSelect: (position: LivePosition) => void;
}) {
  if (positions.length === 0) {
    return <Empty>No open positions</Empty>;
  }

  return (
    <table className="w-full border-collapse text-[10px]">
      <thead>
        <Head columns={["Market", "Side", "Shares", "Avg", "Now", "Value", "PnL", ""]} />
      </thead>
      <tbody>
        {positions.map((position) => {
          const busy = busyId === position.asset;
          const up = /up|yes/i.test(position.outcome);

          return (
            <tr
              key={`${position.asset}-${position.conditionId}`}
              className="border-b border-[var(--terminal-grid)] hover:bg-[var(--surface-muted)]"
            >
              <td className="max-w-[220px] truncate px-2 py-1">
                <button
                  type="button"
                  onClick={() => onSelect(position)}
                  title="Show this market in the ladder"
                  className="truncate text-left text-[var(--foreground)] underline-offset-2 hover:underline"
                >
                  {position.title || "--"}
                </button>
              </td>
              <td
                className={`px-2 py-1 font-mono ${up ? "text-green-300" : "text-red-300"}`}
              >
                {position.outcome}
              </td>
              <td className="px-2 py-1 font-mono tabular-nums">
                {position.size.toFixed(2)}
              </td>
              <td className="px-2 py-1 font-mono tabular-nums theme-muted">
                {formatBookPrice(position.avgPrice)}
              </td>
              <td className="px-2 py-1 font-mono tabular-nums">
                {formatBookPrice(position.curPrice)}
              </td>
              <td className="px-2 py-1 font-mono tabular-nums">
                {formatUsd(position.currentValue)}
              </td>
              <td
                className={`px-2 py-1 font-mono tabular-nums ${
                  position.cashPnl > 0
                    ? "text-green-300"
                    : position.cashPnl < 0
                      ? "text-red-300"
                      : "theme-muted"
                }`}
              >
                {formatSignedUsd(position.cashPnl)}
                <span className="ml-1 text-[9px] theme-muted">
                  {position.percentPnl >= 0 ? "+" : ""}
                  {position.percentPnl.toFixed(1)}%
                </span>
              </td>
              <td className="px-2 py-1 text-right">
                <button
                  type="button"
                  disabled={busy || !ready}
                  onClick={() => onClose(position)}
                  className="border border-amber-500/50 px-2 py-0.5 text-[10px] font-semibold text-amber-200 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? "..." : "Close"}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function OrdersTable({
  orders,
  busyId,
  ready,
  onCancel,
}: {
  orders: LiveOrder[];
  busyId: string | null;
  ready: boolean;
  onCancel: (orderId: string) => void;
}) {
  if (orders.length === 0) {
    return <Empty>No working orders</Empty>;
  }

  return (
    <table className="w-full border-collapse text-[10px]">
      <thead>
        <Head columns={["Side", "Outcome", "Price", "Filled", "Size", ""]} />
      </thead>
      <tbody>
        {orders.map((order) => {
          const busy = busyId === order.id;
          const isBuy = order.side.toUpperCase() === "BUY";

          return (
            <tr
              key={order.id}
              className="border-b border-[var(--terminal-grid)] hover:bg-[var(--surface-muted)]"
            >
              <td
                className={`px-2 py-1 font-mono font-semibold ${
                  isBuy ? "text-green-300" : "text-red-300"
                }`}
              >
                {order.side.toUpperCase()}
              </td>
              <td className="px-2 py-1 font-mono">{order.outcome || "--"}</td>
              <td className="px-2 py-1 font-mono tabular-nums">
                {formatBookPrice(order.price)}
              </td>
              <td className="px-2 py-1 font-mono tabular-nums theme-muted">
                {order.sizeMatched.toFixed(2)} / {order.originalSize.toFixed(2)}
              </td>
              <td className="px-2 py-1 font-mono tabular-nums">
                {formatUsd(order.originalSize * order.price)}
              </td>
              <td className="px-2 py-1 text-right">
                <button
                  type="button"
                  disabled={busy || !ready}
                  onClick={() => onCancel(order.id)}
                  title="Cancel this order"
                  className="border border-red-500/50 px-2 py-0.5 text-[10px] text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? "..." : "✕"}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function FillsTable({ fills }: { fills: LiveFill[] }) {
  if (fills.length === 0) {
    return <Empty>No fills yet</Empty>;
  }

  return (
    <table className="w-full border-collapse text-[10px]">
      <thead>
        <Head columns={["Time", "Side", "Outcome", "Price", "Shares", "Status"]} />
      </thead>
      <tbody>
        {fills.map((fill) => {
          const isBuy = fill.side.toUpperCase() === "BUY";

          return (
            <tr key={fill.id} className="border-b border-[var(--terminal-grid)]">
              <td className="px-2 py-1 font-mono theme-muted">
                {formatMatchTime(fill.matchTime)}
              </td>
              <td
                className={`px-2 py-1 font-mono font-semibold ${
                  isBuy ? "text-green-300" : "text-red-300"
                }`}
              >
                {fill.side.toUpperCase()}
              </td>
              <td className="px-2 py-1 font-mono">{fill.outcome || "--"}</td>
              <td className="px-2 py-1 font-mono tabular-nums">
                {formatBookPrice(fill.price)}
              </td>
              <td className="px-2 py-1 font-mono tabular-nums">
                {fill.size.toFixed(2)}
              </td>
              <td className="px-2 py-1 font-mono theme-muted">{fill.status}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Match times arrive as unix seconds in a string. */
function formatMatchTime(matchTime: string) {
  const seconds = Number(matchTime);
  if (!Number.isFinite(seconds) || seconds <= 0) return "--";

  return new Date(seconds * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function Head({ columns }: { columns: string[] }) {
  return (
    <tr className="border-b theme-border bg-[var(--surface-muted)] text-[9px] uppercase tracking-wide theme-muted">
      {columns.map((column, index) => (
        <th
          key={`${column}-${index}`}
          className={`px-2 py-1 font-medium ${
            index === columns.length - 1 ? "text-right" : "text-left"
          }`}
        >
          {column}
        </th>
      ))}
    </tr>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center text-[11px] theme-muted">
      {children}
    </div>
  );
}
