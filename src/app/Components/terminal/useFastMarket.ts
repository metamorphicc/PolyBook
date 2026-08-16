"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TickSize } from "@polymarket/clob-client-v2";
import {
  sortAsks,
  sortBids,
  type Asset,
  type OrderbookLevel,
  type Outcome,
  type Timeframe,
} from "./types";

const BOOK_POLL_MS = 500;

export type FastMarketState = {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  bestBid: number | null;
  bestAsk: number | null;
  mid: number | null;
  spread: number | null;
  bidLiquidity: number;
  askLiquidity: number;
  tokenId: string;
  oppositeTokenId: string;
  tickSize: TickSize;
  minOrderSize: number | null;
  conditionId: string;
  slug: string;
  endTs: number | null;
  secondsLeft: number | null;
  /** True only while the first book for a market is loading. */
  loading: boolean;
  /** True when the most recent tick failed but stale data is still on screen. */
  stale: boolean;
  error: string | null;
  refresh: () => void;
};

type BookResponse = {
  slug?: string;
  conditionId?: string;
  tokenId?: string;
  tokenIds?: unknown[];
  bids?: Array<{ price: string | number; size: string | number }>;
  asks?: Array<{ price: string | number; size: string | number }>;
  tickSize?: string | number;
  minOrderSize?: string | number;
  endTs?: number;
  serverTs?: number;
};

function toLevels(
  raw: Array<{ price: string | number; size: string | number }> | undefined,
): OrderbookLevel[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((level) => ({ price: Number(level.price), size: Number(level.size) }))
    .filter((level) => Number.isFinite(level.price) && Number.isFinite(level.size));
}

const EMPTY_BOOK = {
  bids: [] as OrderbookLevel[],
  asks: [] as OrderbookLevel[],
  tokenId: "",
  oppositeTokenId: "",
  tickSize: "0.001" as TickSize,
  minOrderSize: null as number | null,
  conditionId: "",
  slug: "",
  endTs: null as number | null,
};

/**
 * Keeps one fast market's book live for the dock.
 *
 * Polls `/api/pol/orderbook` twice a second. Deliberately does not flip
 * `loading` on repeat ticks (that made the "updating..." label strobe) and keeps
 * the previous book when a single tick fails, so a hiccup does not blank the
 * ladder mid-trade. The countdown ticks off the local clock corrected by the
 * server offset, so it stays smooth between polls.
 */
export function useFastMarket(
  asset: Asset,
  timeframe: Timeframe,
  outcome: Outcome,
): FastMarketState {
  const [book, setBook] = useState(EMPTY_BOOK);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Offset between the Polymarket clock and this browser's clock, so the
  // countdown does not drift when the local clock is wrong.
  const clockOffsetRef = useRef(0);
  const endTsRef = useRef<number | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  // Clear the book during render, not in an effect. An effect-based reset leaves
  // one committed frame where the previous market's levels sit under the new
  // market's label — and in a ladder that frame is clickable.
  const marketKey = `${asset}:${timeframe}:${outcome}:${refreshToken}`;
  const [activeKey, setActiveKey] = useState(marketKey);

  if (activeKey !== marketKey) {
    setActiveKey(marketKey);
    setBook(EMPTY_BOOK);
    setLoading(true);
    setStale(false);
    setError(null);
    setSecondsLeft(null);
  }

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    let isFirstTick = true;

    endTsRef.current = null;

    const fetchBook = async () => {
      try {
        const res = await fetch(
          `/api/pol/orderbook?asset=${asset}&timeframe=${timeframe}&outcome=${outcome}`,
          { cache: "no-store", signal: controller.signal },
        );

        if (!res.ok) {
          const text = await res.text();
          if (cancelled) return;
          setError(`HTTP ${res.status}: ${text.slice(0, 200)}`);
          setStale(!isFirstTick);
          return;
        }

        const data = (await res.json()) as BookResponse;
        if (cancelled) return;

        const tokenIds = Array.isArray(data.tokenIds)
          ? data.tokenIds.map((id) => String(id))
          : [];
        const outcomeIndex = outcome === "Down" ? 1 : 0;
        const oppositeIndex = outcomeIndex === 0 ? 1 : 0;
        const endTs = Number.isFinite(data.endTs) ? Number(data.endTs) : null;

        if (Number.isFinite(data.serverTs)) {
          clockOffsetRef.current =
            Number(data.serverTs) - Math.floor(Date.now() / 1000);
        }
        endTsRef.current = endTs;

        setBook({
          bids: toLevels(data.bids),
          asks: toLevels(data.asks),
          tokenId: String(tokenIds[outcomeIndex] ?? data.tokenId ?? ""),
          oppositeTokenId: String(tokenIds[oppositeIndex] ?? ""),
          tickSize: String(data.tickSize ?? "0.001") as TickSize,
          minOrderSize: Number.isFinite(Number(data.minOrderSize))
            ? Number(data.minOrderSize)
            : null,
          conditionId: String(data.conditionId ?? ""),
          slug: String(data.slug ?? ""),
          endTs,
        });
        setError(null);
        setStale(false);
      } catch (e: unknown) {
        if (cancelled || (e instanceof Error && e.name === "AbortError")) return;
        setError(e instanceof Error ? e.message : "Unknown error");
        setStale(!isFirstTick);
      } finally {
        if (!cancelled && isFirstTick) {
          isFirstTick = false;
          setLoading(false);
        }
      }
    };

    fetchBook();
    const interval = window.setInterval(fetchBook, BOOK_POLL_MS);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [asset, timeframe, outcome, refreshToken]);

  // Countdown ticks locally so it counts down smoothly between book polls.
  useEffect(() => {
    const tick = () => {
      const endTs = endTsRef.current;
      if (endTs === null) {
        setSecondsLeft(null);
        return;
      }

      const nowSec = Math.floor(Date.now() / 1000) + clockOffsetRef.current;
      setSecondsLeft(Math.max(0, endTs - nowSec));
    };

    tick();
    const interval = window.setInterval(tick, 1000);

    return () => window.clearInterval(interval);
  }, [book.endTs]);

  const sortedBids = sortBids(book.bids);
  const sortedAsks = sortAsks(book.asks);
  const bestBid = sortedBids[0]?.price ?? null;
  const bestAsk = sortedAsks[0]?.price ?? null;

  return {
    bids: book.bids,
    asks: book.asks,
    bestBid,
    bestAsk,
    mid: bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : null,
    spread:
      bestBid !== null && bestAsk !== null ? Math.max(0, bestAsk - bestBid) : null,
    bidLiquidity: sortedBids.reduce((sum, level) => sum + level.size, 0),
    askLiquidity: sortedAsks.reduce((sum, level) => sum + level.size, 0),
    tokenId: book.tokenId,
    oppositeTokenId: book.oppositeTokenId,
    tickSize: book.tickSize,
    minOrderSize: book.minOrderSize,
    conditionId: book.conditionId,
    slug: book.slug,
    endTs: book.endTs,
    secondsLeft,
    loading,
    stale,
    error,
    refresh,
  };
}
