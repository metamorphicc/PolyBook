"use client";

import { useCallback, useMemo, useState } from "react";
import type { TradingSettings } from "../tradingSettings";
import type { FastMarketState } from "./useFastMarket";
import type { TradingAccount } from "./useTradingAccount";
import { formatBookSize, type LivePosition, type OrderDraft } from "./types";

export type OrderTicket = {
  draft: OrderDraft | null;
  select: (draft: OrderDraft | null) => void;
  /** Raw text, so a half-typed size like "1." does not get clobbered. */
  sizeInput: string;
  setSizeInput: (value: string) => void;
  /** Parsed size: dollars for BUY, shares for SELL. */
  size: number;
  /** Dollar value of the staged order, for guards and display. */
  notional: number;
  submitting: boolean;
  status: string | null;
  error: string | null;
  /** One-click sends on cell click, skipping the confirm step. */
  oneClick: boolean;
  submit: (override?: OrderDraft, overrideSize?: number) => Promise<void>;
  flatten: () => Promise<void>;
  clear: () => void;
};

/**
 * Validates a staged order against the user's risk presets and the live book.
 * Returns a message when the order must be blocked, or null when it may go.
 *
 * Shared by the ladder and the keyboard shortcuts so both paths enforce the same
 * limits — a `B` keypress must not bypass a guard the click path applies.
 */
export function validateOrder({
  draft,
  size,
  notional,
  market,
  settings,
  position,
}: {
  draft: OrderDraft;
  size: number;
  notional: number;
  market: FastMarketState;
  settings: TradingSettings;
  position: LivePosition | null;
}): string | null {
  if (!Number.isFinite(size) || size <= 0) {
    return "Enter a valid size.";
  }

  if (!draft.tokenId) {
    return "Market is still loading.";
  }

  if (market.minOrderSize !== null && draft.side === "SELL") {
    if (size < market.minOrderSize) {
      return `Below market minimum: ${size.toFixed(2)} < ${market.minOrderSize} shares.`;
    }
  }

  const maxOrderSize = Number(settings.maxOrderSize);
  if (
    Number.isFinite(maxOrderSize) &&
    maxOrderSize > 0 &&
    notional > maxOrderSize
  ) {
    return `Order of $${notional.toFixed(2)} exceeds max order size $${settings.maxOrderSize}.`;
  }

  const maxSpreadPercent = Number(settings.maxSpreadPercent);
  const spreadPercent = market.spread !== null ? market.spread * 100 : null;
  if (
    spreadPercent !== null &&
    Number.isFinite(maxSpreadPercent) &&
    maxSpreadPercent >= 0 &&
    spreadPercent > maxSpreadPercent
  ) {
    return `Spread guard: ${spreadPercent.toFixed(2)}% > ${settings.maxSpreadPercent}%.`;
  }

  // A buy needs asks to lift, a sell needs bids to hit.
  const minLiquidity = Number(settings.minBookLiquidity);
  const sideLiquidity =
    draft.side === "BUY" ? market.askLiquidity : market.bidLiquidity;
  if (
    Number.isFinite(minLiquidity) &&
    minLiquidity > 0 &&
    sideLiquidity < minLiquidity
  ) {
    return `Liquidity guard: ${formatBookSize(sideLiquidity, true) || "0"} < ${settings.minBookLiquidity}.`;
  }

  if (draft.side === "BUY") {
    const maxPositionSize = Number(settings.maxPositionSize);
    const held = position?.currentValue ?? 0;
    if (
      Number.isFinite(maxPositionSize) &&
      maxPositionSize > 0 &&
      held + notional > maxPositionSize
    ) {
      return `Position cap: $${(held + notional).toFixed(2)} > $${settings.maxPositionSize}.`;
    }
  } else {
    // Selling more shares than are held is the most common way to get an opaque
    // "not enough balance" back from the exchange.
    const heldShares = position?.size ?? 0;
    if (heldShares <= 0) {
      return "No position to sell in this market.";
    }

    if (size > heldShares + 1e-6) {
      return `You hold ${heldShares.toFixed(2)} shares, order is ${size.toFixed(2)}.`;
    }
  }

  return null;
}

/**
 * Owns the staged order: which price was clicked, the size, and the send.
 *
 * Lives above both the ladder and the keyboard handler so a click and a `B`
 * keypress go through identical validation and share one "sending" state.
 */
export function useOrderTicket({
  market,
  settings,
  position,
  account,
}: {
  market: FastMarketState;
  settings: TradingSettings;
  position: LivePosition | null;
  account: TradingAccount;
}): OrderTicket {
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [sizeInput, setSizeInput] = useState(settings.defaultOrderSize);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Both resets happen during render for the same reason: a staged order must
  // never outlive the token id it points at. When a 5m window rolls over, that
  // id is dead, and one committed frame with a live-looking Send button on it is
  // one frame too many.
  const [activeTokenId, setActiveTokenId] = useState(market.tokenId);
  if (activeTokenId !== market.tokenId) {
    setActiveTokenId(market.tokenId);
    setDraft(null);
  }

  // Follow the preset until the user overrides it in the ticket.
  const [activePreset, setActivePreset] = useState(settings.defaultOrderSize);
  if (activePreset !== settings.defaultOrderSize) {
    setActivePreset(settings.defaultOrderSize);
    setSizeInput(settings.defaultOrderSize);
  }

  const size = Number(sizeInput);
  const notional = useMemo(() => {
    if (!Number.isFinite(size) || size <= 0) return 0;
    if (!draft) return size;

    // BUY sizes are already dollars; SELL sizes are shares worth price each.
    return draft.side === "BUY" ? size : size * draft.price;
  }, [draft, size]);

  const oneClick = settings.oneClickTrading && !settings.requireConfirm;

  const clear = useCallback(() => {
    setDraft(null);
    setStatus(null);
    setError(null);
  }, []);

  const submit = useCallback(
    async (override?: OrderDraft, overrideSize?: number) => {
      const target = override ?? draft;
      if (!target || submitting) return;

      const effectiveSize = overrideSize ?? size;
      const effectiveNotional =
        target.side === "BUY" ? effectiveSize : effectiveSize * target.price;

      if (!account.ready) {
        setError("Enable trading first.");
        return;
      }

      const guard = validateOrder({
        draft: target,
        size: effectiveSize,
        notional: effectiveNotional,
        market,
        settings,
        position,
      });

      if (guard) {
        setError(guard);
        setStatus(null);
        return;
      }

      setSubmitting(true);
      setError(null);
      setStatus(
        `Sending ${target.side} ${target.outcome} @ ${(target.price * 100).toFixed(1)}%`,
      );

      try {
        await account.placeOrder(target, effectiveSize);
        setStatus(
          `${target.side} ${target.outcome} sent @ ${(target.price * 100).toFixed(1)}%`,
        );
        setDraft(null);
      } catch (e) {
        setStatus(null);
        setError(e instanceof Error ? e.message : "Order failed.");
      } finally {
        setSubmitting(false);
      }
    },
    [account, draft, market, position, settings, size, submitting],
  );

  const select = useCallback(
    (next: OrderDraft | null) => {
      setDraft(next);
      setError(null);

      if (next && oneClick) {
        void submit(next);
      }
    },
    [oneClick, submit],
  );

  const flatten = useCallback(async () => {
    if (!position || position.size <= 0 || submitting) {
      setError("No position to close.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setStatus(`Closing ${position.size.toFixed(2)} shares at market`);

    try {
      await account.closePosition(position.asset, position.size, market.tickSize);
      setStatus("Close order sent.");
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : "Close failed.");
    } finally {
      setSubmitting(false);
    }
  }, [account, market.tickSize, position, submitting]);

  return {
    draft,
    select,
    sizeInput,
    setSizeInput,
    size,
    notional,
    submitting,
    status,
    error,
    oneClick,
    submit,
    flatten,
    clear,
  };
}
