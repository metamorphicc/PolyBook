"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TradingSettings } from "../tradingSettings";
import type { FastMarketState } from "./useFastMarket";
import type { OrderTicket } from "./useOrderTicket";
import {
  formatBookPrice,
  formatBookSize,
  type Asset,
  type LivePosition,
  type Outcome,
} from "./types";

const ROW_HEIGHT = 20;
const MIN_ROWS = 15;
const DEFAULT_ROWS = 41;

type LadderRow = {
  tick: number;
  price: number;
  bidSize: number;
  askSize: number;
};

/**
 * Where the grid should be centered, given where it is centered now.
 *
 * Returns the current anchor unchanged while the mid stays inside the dead zone,
 * so the rows hold still. Once the mid escapes, it moves the anchor by the
 * smallest step that brings the mid back to the edge of the zone rather than
 * snapping to the mid, which keeps the shift as small as possible.
 */
function reanchor(current: number | null, midTick: number, half: number) {
  if (current === null) return midTick;

  const deadZone = Math.max(2, Math.floor(half / 2));
  const drift = midTick - current;

  if (drift > deadZone) return midTick - deadZone;
  if (drift < -deadZone) return midTick + deadZone;

  return current;
}

/**
 * The pinned DOM ladder.
 *
 * Unlike a plain orderbook table, the price column is a **fixed tick grid**: rows
 * are generated from an anchor tick, not from whichever levels happen to be in
 * the book. Sizes update in place and rows keep their screen position, which is
 * the whole point of a ladder — you aim at a price and click it without the row
 * moving out from under the cursor.
 *
 * Click a row to BUY at that price, Shift+click to SELL.
 */
export function DomLadder({
  market,
  asset,
  outcome,
  onOutcomeChange,
  settings,
  position,
  ticket,
  ready,
  onActivate,
}: {
  market: FastMarketState;
  asset: Asset;
  outcome: Outcome;
  onOutcomeChange: (outcome: Outcome) => void;
  settings: TradingSettings;
  position: LivePosition | null;
  ticket: OrderTicket;
  ready: boolean;
  onActivate: () => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [rowCount, setRowCount] = useState(DEFAULT_ROWS);
  const [anchorTick, setAnchorTick] = useState<number | null>(null);

  const tickSizeNum = Number(market.tickSize) || 0.001;
  const maxTick = Math.round(1 / tickSizeNum) - 1;
  const half = Math.floor(rowCount / 2);

  // Fill the pinned column exactly rather than guessing a row count. Odd counts
  // keep a true center row for the anchor.
  useEffect(() => {
    const node = gridRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      const rows = Math.floor(entry.contentRect.height / ROW_HEIGHT);
      const odd = rows % 2 === 0 ? rows - 1 : rows;
      setRowCount(Math.max(MIN_ROWS, odd));
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const midTick =
    market.mid !== null ? Math.round(market.mid / tickSizeNum) : null;

  // The anchor is derived from the mid, so it is computed during render: an
  // effect would commit one frame of rows at the old anchor with the new book's
  // sizes in them, which is exactly the row-shifting this grid exists to avoid.
  //
  // A new market resets the scale; otherwise re-center only when the mid leaves
  // the dead zone, and then by the smallest step that brings it back. Following
  // the mid every tick would shift every row twice a second.
  const [activeTokenId, setActiveTokenId] = useState(market.tokenId);

  let effectiveAnchor = anchorTick;
  if (activeTokenId !== market.tokenId) {
    setActiveTokenId(market.tokenId);
    setAnchorTick(midTick);
    effectiveAnchor = midTick;
  } else if (midTick !== null) {
    const next = reanchor(anchorTick, midTick, half);
    if (next !== anchorTick) {
      setAnchorTick(next);
      effectiveAnchor = next;
    }
  }

  const rows = useMemo<LadderRow[]>(() => {
    if (effectiveAnchor === null) return [];

    const bidByTick = new Map<number, number>();
    const askByTick = new Map<number, number>();

    for (const level of market.bids) {
      if (level.size <= 0) continue;
      const tick = Math.round(level.price / tickSizeNum);
      bidByTick.set(tick, (bidByTick.get(tick) ?? 0) + level.size);
    }

    for (const level of market.asks) {
      if (level.size <= 0) continue;
      const tick = Math.round(level.price / tickSizeNum);
      askByTick.set(tick, (askByTick.get(tick) ?? 0) + level.size);
    }

    const result: LadderRow[] = [];
    for (
      let tick = effectiveAnchor + half;
      tick >= effectiveAnchor - half;
      tick -= 1
    ) {
      if (tick < 1 || tick > maxTick) continue;

      result.push({
        tick,
        price: tick * tickSizeNum,
        bidSize: bidByTick.get(tick) ?? 0,
        askSize: askByTick.get(tick) ?? 0,
      });
    }

    return result;
  }, [effectiveAnchor, half, market.asks, market.bids, maxTick, tickSizeNum]);

  const maxSize = Math.max(
    1,
    ...rows.map((row) => Math.max(row.bidSize, row.askSize)),
  );

  const bestBidTick =
    market.bestBid !== null ? Math.round(market.bestBid / tickSizeNum) : null;
  const bestAskTick =
    market.bestAsk !== null ? Math.round(market.bestAsk / tickSizeNum) : null;
  const avgTick =
    position && position.avgPrice > 0
      ? Math.round(position.avgPrice / tickSizeNum)
      : null;
  const draftTick =
    ticket.draft !== null
      ? Math.round(ticket.draft.price / tickSizeNum)
      : null;

  const stageOrder = (price: number, shiftKey: boolean) => {
    if (!market.tokenId) return;

    if (!ready) {
      onActivate();
      return;
    }

    ticket.select({
      side: shiftKey ? "SELL" : "BUY",
      outcome,
      asset,
      price: Number(price.toFixed(3)),
      tokenId: market.tokenId,
      tickSize: market.tickSize,
    });
  };

  const spreadPercent = market.spread !== null ? market.spread * 100 : null;
  const isSell = ticket.draft?.side === "SELL";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border-l theme-border bg-[var(--terminal-bg)]">
      <div className="grid shrink-0 grid-cols-2 border-b theme-border">
        {(["Up", "Down"] as Outcome[]).map((value) => {
          const active = value === outcome;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onOutcomeChange(value)}
              className={`py-1.5 text-[11px] font-semibold uppercase tracking-wide transition ${
                active
                  ? value === "Up"
                    ? "bg-green-500/20 text-green-200"
                    : "bg-red-500/20 text-red-200"
                  : "theme-muted hover:bg-[var(--surface-muted)]"
              }`}
            >
              {value}
            </button>
          );
        })}
      </div>

      <div className="grid shrink-0 grid-cols-4 border-b theme-border bg-[var(--surface-muted)] text-[9px] uppercase tracking-wide theme-muted">
        <Stat label="Bid" value={formatBookSize(market.bidLiquidity, true) || "--"} tone="text-green-300" />
        <Stat label="Ask" value={formatBookSize(market.askLiquidity, true) || "--"} tone="text-red-300" />
        <Stat
          label="Spr"
          value={spreadPercent === null ? "--" : `${spreadPercent.toFixed(1)}%`}
          tone={
            spreadPercent !== null &&
            spreadPercent > Number(settings.maxSpreadPercent)
              ? "text-amber-300"
              : "text-[var(--foreground)]"
          }
        />
        <Stat
          label="Mid"
          value={market.mid === null ? "--" : formatBookPrice(market.mid)}
          tone="text-sky-300"
        />
      </div>

      <div className="grid shrink-0 grid-cols-[1fr_72px_1fr] border-b theme-border bg-[var(--surface)] px-1 py-1 font-mono text-[9px] uppercase tracking-wide theme-muted">
        <span className="px-1 text-green-300">Bid</span>
        <span className="px-1 text-center">Price</span>
        <span className="px-1 text-right text-red-300">Ask</span>
      </div>

      {market.error && (
        <div className="shrink-0 border-b border-red-500/40 bg-red-500/10 px-2 py-1 text-[10px] text-red-300">
          {market.error}
        </div>
      )}

      <div ref={gridRef} className="min-h-0 flex-1 overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex h-full items-center justify-center px-3 text-center text-[11px] theme-muted">
            {market.loading ? "Loading book..." : "No book for this window yet"}
          </div>
        ) : (
          rows.map((row) => {
            const isBestBid = row.tick === bestBidTick;
            const isBestAsk = row.tick === bestAskTick;
            const isDraft = row.tick === draftTick;
            const isAvg = row.tick === avgTick;

            return (
              <div
                key={row.tick}
                style={{ height: ROW_HEIGHT }}
                className={`grid grid-cols-[1fr_72px_1fr] items-stretch border-b border-[var(--terminal-grid)] ${
                  isDraft ? (isSell ? "bg-red-500/10" : "bg-sky-500/10") : ""
                }`}
              >
                <SizeCell
                  size={row.bidSize}
                  maxSize={maxSize}
                  side="bid"
                  onClick={(shiftKey) => stageOrder(row.price, shiftKey)}
                />
                <button
                  type="button"
                  onClick={(event) => stageOrder(row.price, event.shiftKey)}
                  className={`relative border-x theme-border px-1 text-center font-mono text-[10px] transition hover:bg-[var(--surface-soft)] ${
                    isBestAsk
                      ? "bg-red-500/15 text-red-200"
                      : isBestBid
                        ? "bg-green-500/15 text-green-200"
                        : "text-[var(--foreground)]"
                  }`}
                >
                  {formatBookPrice(row.price)}
                  {isAvg && (
                    <span
                      title={`Your average ${formatBookPrice(position?.avgPrice ?? 0)}`}
                      className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[8px] text-amber-300"
                    >
                      ◄
                    </span>
                  )}
                </button>
                <SizeCell
                  size={row.askSize}
                  maxSize={maxSize}
                  side="ask"
                  onClick={(shiftKey) => stageOrder(row.price, shiftKey)}
                />
              </div>
            );
          })
        )}
      </div>

      <OrderTicketPanel
        market={market}
        settings={settings}
        position={position}
        ticket={ticket}
        ready={ready}
        onActivate={onActivate}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="px-1.5 py-1">
      {label}
      <div className={`font-mono normal-case tracking-normal ${tone}`}>{value}</div>
    </div>
  );
}

function SizeCell({
  size,
  maxSize,
  side,
  onClick,
}: {
  size: number;
  maxSize: number;
  side: "bid" | "ask";
  onClick: (shiftKey: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => onClick(event.shiftKey)}
      className={`relative overflow-hidden px-1.5 font-mono text-[10px] transition ${
        side === "bid"
          ? "text-left text-green-300 hover:bg-green-500/10"
          : "text-right text-red-300 hover:bg-red-500/10"
      }`}
    >
      {size > 0 && (
        <span
          className={`absolute inset-y-0 ${
            side === "bid" ? "right-0 bg-green-500/20" : "left-0 bg-red-500/20"
          }`}
          style={{ width: `${Math.min(100, (size / maxSize) * 100)}%` }}
        />
      )}
      <span className="relative z-10 block truncate leading-[20px]">
        {formatBookSize(size)}
      </span>
    </button>
  );
}

/** Size entry, the confirm button, and the flatten button. */
function OrderTicketPanel({
  market,
  settings,
  position,
  ticket,
  ready,
  onActivate,
}: {
  market: FastMarketState;
  settings: TradingSettings;
  position: LivePosition | null;
  ticket: OrderTicket;
  ready: boolean;
  onActivate: () => void;
}) {
  const { draft } = ticket;
  const isSell = draft?.side === "SELL";
  // The unit flips with the side, because the CLOB itself changes meaning.
  const unit = isSell ? "shares" : "pUSD";

  if (!ready) {
    return (
      <div className="shrink-0 border-t theme-border bg-[var(--surface-muted)] p-2">
        <button
          type="button"
          onClick={onActivate}
          className="w-full border border-[var(--accent)] bg-[var(--accent)]/10 px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition hover:bg-[var(--accent)]/20"
        >
          Enable trading
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 space-y-2 border-t theme-border bg-[var(--surface-muted)] p-2">
      <div className="flex items-center gap-1.5">
        <input
          value={ticket.sizeInput}
          onChange={(event) => ticket.setSizeInput(event.target.value)}
          inputMode="decimal"
          aria-label={`Order size in ${unit}`}
          className="min-w-0 flex-1 border theme-border bg-[var(--terminal-bg)] px-2 py-1 font-mono text-[11px] text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
        />
        <span className="shrink-0 text-[9px] uppercase tracking-wide theme-muted">
          {unit}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {settings.quickSizes.map((size, index) => (
          <button
            key={`${size}-${index}`}
            type="button"
            onClick={() => ticket.setSizeInput(size)}
            className="border theme-border px-1.5 py-0.5 font-mono text-[10px] text-[var(--foreground)] transition hover:border-[var(--accent)] hover:bg-[var(--surface-soft)]"
          >
            {size}
          </button>
        ))}
        {settings.postOnly && (
          <span className="border border-sky-500/40 px-1.5 py-0.5 text-[9px] text-sky-300">
            post-only
          </span>
        )}
      </div>

      {draft ? (
        <button
          type="button"
          disabled={ticket.submitting}
          onClick={() => void ticket.submit()}
          className={`w-full border px-3 py-2 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            isSell
              ? "border-red-500/60 bg-red-500/15 text-red-200 hover:bg-red-500/25"
              : "border-green-500/60 bg-green-500/15 text-green-200 hover:bg-green-500/25"
          }`}
        >
          {ticket.submitting
            ? "Sending..."
            : `${isSell ? "SELL (exit)" : "BUY"} ${draft.outcome} @ ${formatBookPrice(draft.price)}`}
        </button>
      ) : (
        <div className="py-1 text-center text-[10px] leading-tight theme-muted">
          Click to buy · Shift+click to sell
        </div>
      )}

      {position && position.size > 0 && (
        <button
          type="button"
          disabled={ticket.submitting}
          onClick={() => void ticket.flatten()}
          className="w-full border border-amber-500/60 bg-amber-500/10 px-3 py-1.5 text-[10px] font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Flatten {position.size.toFixed(2)} @ market
        </button>
      )}

      {ticket.error && (
        <div className="border border-red-500/40 bg-red-500/10 px-2 py-1 text-[10px] leading-tight text-red-300">
          {ticket.error}
        </div>
      )}
      {!ticket.error && ticket.status && (
        <div className="truncate text-[10px] theme-muted">{ticket.status}</div>
      )}
      {market.stale && (
        <div className="text-[10px] text-amber-300">Book stale — reconnecting</div>
      )}
    </div>
  );
}
