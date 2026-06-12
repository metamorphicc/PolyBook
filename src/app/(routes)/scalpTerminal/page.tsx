"use client";

import Header from "@/app/Components/header";
import PolymarketPriceChart from "@/app/Components/PolymarketPriceChart";
import PriceChart from "@/app/Components/priceChart";
import {
  readTradingSettings,
  type TradingSettings,
} from "@/app/Components/tradingSettings";
import { initPolymarketClient } from "@/app/Components/verifyUser";
import {
  ensureDepositWalletWithRelayer,
  useEthersSigner,
} from "@/app/Components/CustomConnect";
import {
  OrderType,
  Side,
  SignatureTypeV2,
  type TickSize,
} from "@polymarket/clob-client-v2";
import { useAppKitAccount } from "@reown/appkit/react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";

type Timeframe = "5m" | "15m" | "1h";
type Asset = "BTC" | "ETH" | "SOL" | "XRP";

type ChartWindow = {
  id: number;
  tabId: number;
  symbol: string;
  frame?: WindowFrameState;
};

type OrderbookWindow = {
  id: number;
  tabId: number;
  asset: Asset;
  marketId: string;
  timeframe: Timeframe;
  frame?: WindowFrameState;
};

type BinanceOrderbookWindow = {
  id: number;
  tabId: number;
  asset: Asset;
  frame?: WindowFrameState;
};

type PolyChartWindow = {
  id: number;
  tabId: number;
  asset: Asset;
  marketId: string;
  timeframe: Timeframe;
  frame?: WindowFrameState;
};

type WorkspaceTab = {
  id: number;
  name: string;
};

type WorkspaceBounds = {
  width: number;
  height: number;
};

type WindowFrameState = {
  x: number;
  y: number;
  width: number;
  height: number;
  pinned: boolean;
};

type SnapSlot = "tl" | "tr" | "bl" | "br" | "left" | "right" | "full";

type OrderbookLevel = {
  price: number;
  size: number;
};

type OrderSide = "BUY" | "SELL";
type OrderIntent = "YES" | "NO";

type OrderDraft = {
  source: "Polymarket" | "Binance";
  side: OrderSide;
  intent?: OrderIntent;
  asset: Asset;
  label: string;
  price: number;
  ladderPrice?: number;
  size: number;
  tokenId?: string;
  tickSize?: TickSize;
};

type PlaceOrderRequest = {
  draft: OrderDraft;
  size: number;
  postOnly?: boolean;
};

async function rememberDepositWalletAddress(
  ownerAddress: string,
  depositWalletAddress: string,
) {
  const res = await fetch("/api/user/trading-wallet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerAddress, depositWalletAddress }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : "Failed to save deposit wallet address",
    );
  }
}

function toClobShareSize(notionalSize: number, price: number) {
  if (!Number.isFinite(notionalSize) || notionalSize <= 0) return 0;
  if (!Number.isFinite(price) || price <= 0) return 0;

  return notionalSize / price;
}

type OrderbookOutcome = "Up" | "Down";

type OrderbookSelection = {
  asset: Asset;
  marketId: string;
};

type WindowFrameProps = {
  title: string;
  accent?: "chart" | "book";
  zIndex: number;
  initialX: number;
  initialY: number;
  initialWidth: number;
  initialHeight: number;
  minWidth: number;
  minHeight: number;
  bounds: WorkspaceBounds;
  frame?: WindowFrameState;
  onFrameChange: (frame: WindowFrameState) => void;
  onFocus: () => void;
  onClose: () => void;
  children: React.ReactNode;
};

const COINS = ["bitcoin", "ethereum", "solana", "xrp"];

const COIN_SYMBOLS: Record<string, string> = {
  bitcoin: "BINANCE:BTCUSDT",
  ethereum: "BINANCE:ETHUSDT",
  solana: "BINANCE:SOLUSDT",
  xrp: "BINANCE:XRPUSDT",
};

const POLY_MARKETS_BY_ASSET: OrderbookSelection[] = [
  { asset: "BTC", marketId: "btc-updown-fast" },
  { asset: "ETH", marketId: "eth-updown-fast" },
  { asset: "SOL", marketId: "sol-updown-fast" },
  { asset: "XRP", marketId: "xrp-updown-fast" },
];

const ORDERBOOK_TIMEFRAMES: Timeframe[] = ["5m", "15m", "1h"];
const ASSETS: Asset[] = ["BTC", "ETH", "SOL", "XRP"];

function getDefaultTabName(id: number) {
  return `Setup ${id}`;
}

function getPriceDecimals(asset: Asset, mode: "poly" | "binance") {
  if (mode === "poly") return 3;
  if (asset === "XRP") return 4;
  return 2;
}

function formatBookPrice(asset: Asset, price: number, mode: "poly" | "binance") {
  if (mode === "poly") return `${(price * 100).toFixed(1)}%`;
  return price.toFixed(getPriceDecimals(asset, mode));
}

function formatBookSize(size: number, compact = false) {
  if (!Number.isFinite(size) || size <= 0) return "";
  if (compact && size >= 1000) return `${(size / 1000).toFixed(1)}K`;
  return size.toFixed(size >= 100 ? 0 : 2);
}

function sortBids(levels: OrderbookLevel[]) {
  return [...levels]
    .filter((level) => Number.isFinite(level.price) && Number.isFinite(level.size))
    .sort((a, b) => b.price - a.price);
}

function sortAsks(levels: OrderbookLevel[]) {
  return [...levels]
    .filter((level) => Number.isFinite(level.price) && Number.isFinite(level.size))
    .sort((a, b) => a.price - b.price);
}

function WindowFrame({
  title,
  accent = "chart",
  zIndex,
  initialX,
  initialY,
  initialWidth,
  initialHeight,
  minWidth,
  minHeight,
  bounds,
  frame,
  onFrameChange,
  onFocus,
  onClose,
  children,
}: WindowFrameProps) {
  const initialFrame = frame ?? {
    x: initialX,
    y: initialY,
    width: initialWidth,
    height: initialHeight,
    pinned: false,
  };
  const [pos, setPos] = useState({ x: initialFrame.x, y: initialFrame.y });
  const [size, setSize] = useState({
    width: initialFrame.width,
    height: initialFrame.height,
  });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [restoreFrame, setRestoreFrame] = useState<{
    pos: { x: number; y: number };
    size: { width: number; height: number };
  } | null>(null);
  const [pinned, setPinned] = useState(initialFrame.pinned);
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const saveFrame = useCallback(
    (nextPos = pos, nextSize = size, nextPinned = pinned) => {
      onFrameChange({
        x: nextPos.x,
        y: nextPos.y,
        width: nextSize.width,
        height: nextSize.height,
        pinned: nextPinned,
      });
    },
    [onFrameChange, pinned, pos, size],
  );

  const clampFrame = (
    nextPos: { x: number; y: number },
    nextSize = size,
  ) => {
    const maxX = Math.max(0, bounds.width - nextSize.width);
    const maxY = Math.max(0, bounds.height - nextSize.height);

    return {
      x: Math.min(Math.max(0, nextPos.x), maxX),
      y: Math.min(Math.max(0, nextPos.y), maxY),
    };
  };

  const getSnapFrame = (slot: SnapSlot) => {
    const gap = 8;
    const availableWidth = Math.max(minWidth, bounds.width - gap * 2);
    const availableHeight = Math.max(minHeight, bounds.height - gap * 2);
    const halfWidth = Math.max(minWidth, Math.floor((bounds.width - gap * 3) / 2));
    const halfHeight = Math.max(
      minHeight,
      Math.floor((bounds.height - gap * 3) / 2),
    );

    if (slot === "full") {
      return {
        pos: { x: gap, y: gap },
        size: { width: availableWidth, height: availableHeight },
      };
    }

    if (slot === "left" || slot === "right") {
      return {
        pos: {
          x: slot === "left" ? gap : Math.max(gap, bounds.width - halfWidth - gap),
          y: gap,
        },
        size: { width: halfWidth, height: availableHeight },
      };
    }

    const isRight = slot === "tr" || slot === "br";
    const isBottom = slot === "bl" || slot === "br";

    return {
      pos: {
        x: isRight ? Math.max(gap, bounds.width - halfWidth - gap) : gap,
        y: isBottom ? Math.max(gap, bounds.height - halfHeight - gap) : gap,
      },
      size: { width: halfWidth, height: halfHeight },
    };
  };

  const applySnap = (slot: SnapSlot) => {
    if (pinned) return;
    onFocus();
    setRestoreFrame({ pos, size });
    const frame = getSnapFrame(slot);
    setSize(frame.size);
    setPos(clampFrame(frame.pos, frame.size));
    saveFrame(clampFrame(frame.pos, frame.size), frame.size);
  };

  const toggleFull = () => {
    if (pinned) return;
    onFocus();

    if (restoreFrame) {
      setSize(restoreFrame.size);
      setPos(clampFrame(restoreFrame.pos, restoreFrame.size));
      saveFrame(clampFrame(restoreFrame.pos, restoreFrame.size), restoreFrame.size);
      setRestoreFrame(null);
      return;
    }

    setRestoreFrame({ pos, size });
    const frame = getSnapFrame("full");
    setSize(frame.size);
    setPos(clampFrame(frame.pos, frame.size));
    saveFrame(clampFrame(frame.pos, frame.size), frame.size);
  };

  const handleMouseDownHeader = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if (pinned) return;
    onFocus();
    if (restoreFrame) {
      setRestoreFrame(null);
    }
    setDragging(true);
    setOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pinned) return;
    setResizing(true);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    };
  };

  useEffect(() => {
    if (!dragging && !resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (dragging) {
        const nextX = e.clientX - offset.x;
        const nextY = e.clientY - offset.y;
        setPos({
          x: Math.min(
            Math.max(0, nextX),
            Math.max(0, bounds.width - size.width),
          ),
          y: Math.min(
            Math.max(0, nextY),
            Math.max(0, bounds.height - size.height),
          ),
        });
        saveFrame(
          {
            x: Math.min(
              Math.max(0, nextX),
              Math.max(0, bounds.width - size.width),
            ),
            y: Math.min(
              Math.max(0, nextY),
              Math.max(0, bounds.height - size.height),
            ),
          },
          size,
        );
        return;
      }

      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;
      const nextSize = {
        width: Math.min(
          Math.max(minWidth, resizeStart.current.width + dx),
          Math.max(minWidth, bounds.width - pos.x),
        ),
        height: Math.min(
          Math.max(minHeight, resizeStart.current.height + dy),
          Math.max(minHeight, bounds.height - pos.y),
        ),
      };
      setSize({
        width: nextSize.width,
        height: nextSize.height,
      });
      saveFrame(pos, nextSize);
    };

    const handleMouseUp = () => {
      setDragging(false);
      setResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    bounds,
    dragging,
    resizing,
    offset,
    minWidth,
    minHeight,
    pos,
    saveFrame,
    size,
  ]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSize((current) => ({
        width: Math.min(current.width, Math.max(minWidth, bounds.width)),
        height: Math.min(current.height, Math.max(minHeight, bounds.height)),
      }));
      setPos((current) => ({
        x: Math.min(
          Math.max(0, current.x),
          Math.max(0, bounds.width - minWidth),
        ),
        y: Math.min(
          Math.max(0, current.y),
          Math.max(0, bounds.height - minHeight),
        ),
      }));
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [bounds.height, bounds.width, minHeight, minWidth]);

  return (
    <div
      className="absolute overflow-hidden border theme-border theme-surface shadow-2xl"
      onMouseDownCapture={onFocus}
      style={{
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: size.height,
        zIndex: pinned ? 90 : zIndex,
      }}
    >
      <div
        className={`flex h-8 select-none items-center justify-between px-3 text-xs text-white ${
          pinned ? "cursor-default" : "cursor-move"
        } ${
          accent === "book"
            ? "bg-[var(--surface)]"
            : "bg-[var(--surface-muted)]"
        }`}
        onMouseDown={handleMouseDownHeader}
      >
        <span className="truncate">{title}</span>
        <div className="flex items-center gap-1">
          {([
            ["tl", "TL"],
            ["tr", "TR"],
            ["bl", "BL"],
            ["br", "BR"],
            ["left", "L"],
            ["right", "R"],
          ] as [SnapSlot, string][]).map(([slot, label]) => (
            <button
              key={slot}
              type="button"
              onClick={() => applySnap(slot)}
              disabled={pinned}
              className="h-5 min-w-5 border border-white/10 px-1 font-mono text-[9px] text-zinc-300 hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              title={`Snap ${label}`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={toggleFull}
            disabled={pinned}
            className="h-5 min-w-7 border border-white/10 px-1 font-mono text-[9px] text-zinc-300 hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            title="Fullscreen inside workspace"
          >
            MAX
          </button>
          <button
            type="button"
            onClick={() => {
              const nextPinned = !pinned;
              setPinned(nextPinned);
              saveFrame(pos, size, nextPinned);
              onFocus();
            }}
            className={`h-5 min-w-7 border px-1 font-mono text-[9px] ${
              pinned
                ? "border-sky-400/60 text-sky-200"
                : "border-white/10 text-zinc-300 hover:border-white/30 hover:text-white"
            }`}
            title={pinned ? "Unpin window" : "Pin window"}
          >
            PIN
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-5 min-w-5 border border-white/10 px-1 text-zinc-300 hover:border-white/30 hover:text-white"
            aria-label="Close window"
          >
            x
          </button>
        </div>
      </div>

      <div className="h-[calc(100%-2rem)] w-full">{children}</div>

      <div
        className={`absolute bottom-1 right-1 h-3 w-3 ${
          pinned ? "cursor-default bg-zinc-700/50" : "cursor-se-resize bg-zinc-500/70"
        }`}
        onMouseDown={handleResizeMouseDown}
      />
    </div>
  );
}

function DraggableChartWindow({
  symbol,
  zIndex,
  bounds,
  frame,
  onFrameChange,
  onFocus,
  onClose,
}: {
  symbol: string;
  zIndex: number;
  bounds: WorkspaceBounds;
  frame?: WindowFrameState;
  onFrameChange: (frame: WindowFrameState) => void;
  onFocus: () => void;
  onClose: () => void;
}) {
  return (
    <WindowFrame
      title={symbol}
      zIndex={zIndex}
      initialX={52}
      initialY={150}
      initialWidth={520}
      initialHeight={340}
      minWidth={340}
      minHeight={260}
      bounds={bounds}
      frame={frame}
      onFrameChange={onFrameChange}
      onFocus={onFocus}
      onClose={onClose}
    >
      <div className="h-full w-full theme-terminal-bg">
        <PriceChart symbol={symbol} />
      </div>
    </WindowFrame>
  );
}

function DraggablePolyChartWindow({
  asset,
  timeframe,
  zIndex,
  bounds,
  frame,
  onFrameChange,
  onFocus,
  onClose,
}: {
  asset: Asset;
  timeframe: Timeframe;
  zIndex: number;
  bounds: WorkspaceBounds;
  frame?: WindowFrameState;
  onFrameChange: (frame: WindowFrameState) => void;
  onFocus: () => void;
  onClose: () => void;
}) {
  return (
    <WindowFrame
      title={`Polymarket Chart / ${asset} / ${timeframe === "1h" ? "60m" : timeframe}`}
      zIndex={zIndex}
      initialX={86}
      initialY={150}
      initialWidth={620}
      initialHeight={380}
      minWidth={420}
      minHeight={280}
      bounds={bounds}
      frame={frame}
      onFrameChange={onFrameChange}
      onFocus={onFocus}
      onClose={onClose}
    >
      <PolymarketPriceChart asset={asset} timeframe={timeframe} />
    </WindowFrame>
  );
}

function ScalpOrderbookLadder({
  asset,
  mode,
  bids,
  asks,
  loading,
  error,
  emptyText,
  draft,
  onSelect,
  tokenId,
  noTokenId,
  tickSize,
  onPlaceOrder,
  settings,
}: {
  asset: Asset;
  mode: "poly" | "binance";
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  loading: boolean;
  error: string | null;
  emptyText: string;
  draft: OrderDraft | null;
  onSelect: (draft: OrderDraft) => void;
  tokenId?: string;
  noTokenId?: string;
  tickSize?: TickSize;
  onPlaceOrder?: (request: PlaceOrderRequest) => Promise<unknown>;
  settings: TradingSettings;
}) {
  const priceDecimals = getPriceDecimals(asset, mode);
  const [orderSize, setOrderSize] = useState(settings.defaultOrderSize);
  const [submitting, setSubmitting] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setOrderSize(settings.defaultOrderSize);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [settings.defaultOrderSize]);

  const rows = useMemo(() => {
    const levels = new Map<string, { price: number; bidSize: number; askSize: number }>();

    for (const level of bids) {
      if (!Number.isFinite(level.price) || !Number.isFinite(level.size)) continue;
      const key = level.price.toFixed(priceDecimals);
      const row = levels.get(key) ?? {
        price: Number(key),
        bidSize: 0,
        askSize: 0,
      };
      row.bidSize += level.size;
      levels.set(key, row);
    }

    for (const level of asks) {
      if (!Number.isFinite(level.price) || !Number.isFinite(level.size)) continue;
      const key = level.price.toFixed(priceDecimals);
      const row = levels.get(key) ?? {
        price: Number(key),
        bidSize: 0,
        askSize: 0,
      };
      row.askSize += level.size;
      levels.set(key, row);
    }

    return [...levels.values()].sort((a, b) => b.price - a.price).slice(0, 84);
  }, [asks, bids, priceDecimals]);

  const sortedBids = useMemo(() => sortBids(bids), [bids]);
  const sortedAsks = useMemo(() => sortAsks(asks), [asks]);
  const bestBid = sortedBids[0]?.price ?? null;
  const bestAsk = sortedAsks[0]?.price ?? null;
  const bidLiquidity = sortedBids.reduce((sum, level) => sum + level.size, 0);
  const askLiquidity = sortedAsks.reduce((sum, level) => sum + level.size, 0);
  const isOneClickMode =
    mode === "poly" && settings.oneClickTrading && !settings.requireConfirm;
  const maxSize = Math.max(
    1,
    ...rows.map((row) => Math.max(row.bidSize, row.askSize))
  );
  const spread =
    bestBid !== null && bestAsk !== null ? Math.max(0, bestAsk - bestBid) : null;
  const mid =
    bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : null;

  const buildDraft = (
    intent: OrderIntent,
    ladderPrice: number,
    size: number
  ): OrderDraft => {
    const isNo = mode === "poly" && intent === "NO";
    const price = isNo ? Number((1 - ladderPrice).toFixed(priceDecimals)) : ladderPrice;

    return {
      source: mode === "poly" ? "Polymarket" : "Binance",
      side: mode === "poly" ? "BUY" : intent === "YES" ? "BUY" : "SELL",
      intent,
      asset,
      label:
        mode === "poly"
          ? `${asset} ${intent} @ ${formatBookPrice(asset, price, mode)}`
          : `${asset}/USDT ${intent === "YES" ? "BUY" : "SELL"} @ ${formatBookPrice(asset, price, mode)}`,
      price,
      ladderPrice,
      size,
      tokenId: isNo ? noTokenId : tokenId,
      tickSize,
    };
  };

  const submitOrder = async (
    targetDraft = draft,
    sizeValue = isOneClickMode ? settings.defaultOrderSize : orderSize,
  ) => {
    if (!targetDraft || !onPlaceOrder) return;

    const parsedSize = Number(sizeValue);
    if (!Number.isFinite(parsedSize) || parsedSize <= 0) {
      setOrderStatus("Enter a valid size.");
      return;
    }

    const maxOrderSize = Number(settings.maxOrderSize);
    if (
      Number.isFinite(maxOrderSize) &&
      maxOrderSize > 0 &&
      parsedSize > maxOrderSize
    ) {
      setOrderStatus(`Order size exceeds preset max: ${settings.maxOrderSize}.`);
      return;
    }

    const maxSpreadPercent = Number(settings.maxSpreadPercent);
    const spreadPercent = mode === "poly" && spread !== null ? spread * 100 : null;
    if (
      spreadPercent !== null &&
      Number.isFinite(maxSpreadPercent) &&
      maxSpreadPercent >= 0 &&
      spreadPercent > maxSpreadPercent
    ) {
      setOrderStatus(
        `Spread guard: ${spreadPercent.toFixed(2)}% > ${settings.maxSpreadPercent}%.`,
      );
      return;
    }

    const minLiquidity = Number(settings.minBookLiquidity);
    const sideLiquidity =
      targetDraft.intent === "NO" ? askLiquidity : bidLiquidity;
    if (
      mode === "poly" &&
      Number.isFinite(minLiquidity) &&
      minLiquidity > 0 &&
      sideLiquidity < minLiquidity
    ) {
      setOrderStatus(
        `Liquidity guard: ${formatBookSize(sideLiquidity, true) || "0"} < ${settings.minBookLiquidity}.`,
      );
      return;
    }

    setSubmitting(true);
    setOrderStatus(
      isOneClickMode ? `Sending ${targetDraft.label} / ${parsedSize}` : null,
    );
    try {
      const response = await onPlaceOrder({
        draft: targetDraft,
        size: parsedSize,
        postOnly: settings.postOnly,
      });
      const responseText =
        typeof response === "string" ? response : JSON.stringify(response);
      setOrderStatus(`Order sent: ${responseText.slice(0, 140)}`);
    } catch (e) {
      setOrderStatus(e instanceof Error ? e.message : "Order failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectDraft = async (nextDraft: OrderDraft) => {
    onSelect(nextDraft);

    if (!isOneClickMode || !onPlaceOrder || submitting) return;
    await submitOrder(nextDraft, settings.defaultOrderSize);
  };

  const renderCell = (
    row: { price: number; bidSize: number; askSize: number },
    side: "bid" | "ask"
  ) => {
    const size = side === "bid" ? row.bidSize : row.askSize;
    const intent: OrderIntent = side === "bid" ? "YES" : "NO";
    const active =
      (draft?.ladderPrice ?? draft?.price)?.toFixed(priceDecimals) ===
        row.price.toFixed(priceDecimals) && draft?.intent === intent;
    const width = `${Math.min(100, (size / maxSize) * 100)}%`;
    const disabled =
      size <= 0 || (intent === "NO" && !noTokenId) || (isOneClickMode && submitting);

    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          void handleSelectDraft(buildDraft(intent, row.price, size));
        }}
        className={`relative h-[22px] overflow-hidden px-2 text-left font-mono text-[11px] transition disabled:cursor-default ${
          side === "bid"
            ? "text-green-300 hover:bg-green-500/10"
            : "text-red-300 hover:bg-red-500/10"
        } ${active ? "ring-1 ring-sky-400" : ""}`}
      >
        {size > 0 && (
          <span
            className={`absolute inset-y-0 ${
              side === "bid"
                ? "right-0 bg-green-500/20"
                : "left-0 bg-red-500/20"
            }`}
            style={{ width }}
          />
        )}
        <span className="relative z-10 block truncate">
          {formatBookSize(size, mode === "binance")}
        </span>
      </button>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border theme-border bg-[var(--terminal-bg)]">
      <div className="grid grid-cols-4 border-b theme-border bg-[var(--surface-muted)] text-[10px] uppercase tracking-wide theme-muted">
        <div className="px-2 py-2">
          Bid Liq
          <div className="font-mono text-green-300 normal-case tracking-normal">
            {formatBookSize(bidLiquidity, true) || "--"}
          </div>
        </div>
        <div className="px-2 py-2">
          Ask Liq
          <div className="font-mono text-red-300 normal-case tracking-normal">
            {formatBookSize(askLiquidity, true) || "--"}
          </div>
        </div>
        <div className="px-2 py-2">
          Spread
          <div className="font-mono text-[var(--foreground)] normal-case tracking-normal">
            {spread === null ? "--" : formatBookPrice(asset, spread, mode)}
          </div>
        </div>
        <div className="px-2 py-2">
          Mid
          <div className="font-mono text-sky-300 normal-case tracking-normal">
            {mid === null ? "--" : formatBookPrice(asset, mid, mode)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_84px_1fr] border-b theme-border bg-[var(--surface)] px-1 py-1 font-mono text-[10px] uppercase tracking-wide theme-muted">
        <span className="px-1 text-green-300">Bid Size</span>
        <span className="px-1 text-center">Chance</span>
        <span className="px-1 text-right text-red-300">Ask Size</span>
      </div>

      {error && (
        <div className="border-b border-red-500/40 bg-red-500/10 px-2 py-2 text-[11px] text-red-300">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 && !loading ? (
          <div className="flex h-full items-center justify-center text-xs theme-muted">
            {emptyText}
          </div>
        ) : (
          rows.map((row) => {
            const isBestBid = bestBid !== null && row.price === bestBid;
            const isBestAsk = bestAsk !== null && row.price === bestAsk;
            const selected =
              (draft?.ladderPrice ?? draft?.price)?.toFixed(priceDecimals) ===
              row.price.toFixed(priceDecimals);

            return (
              <div
                key={row.price.toFixed(priceDecimals)}
                className={`grid grid-cols-[1fr_84px_1fr] border-b theme-border ${
                  selected ? "bg-sky-500/10" : ""
                }`}
              >
                {renderCell(row, "bid")}
                <button
                  type="button"
                  onClick={() => {
                    if (row.bidSize > 0) {
                      void handleSelectDraft(
                        buildDraft("YES", row.price, row.bidSize)
                      );
                      return;
                    }
                    if (row.askSize > 0) {
                      void handleSelectDraft(
                        buildDraft("NO", row.price, row.askSize)
                      );
                    }
                  }}
                  className={`h-[22px] border-x theme-border px-1 text-center font-mono text-[11px] transition hover:bg-[var(--surface-muted)] ${
                    isBestAsk
                      ? "bg-red-500/15 text-red-200"
                      : isBestBid
                        ? "bg-green-500/15 text-green-200"
                        : "text-[var(--foreground)]"
                  }`}
                >
                  {formatBookPrice(asset, row.price, mode)}
                </button>
                {renderCell(row, "ask")}
              </div>
            );
          })
        )}
      </div>

      <div className="border-t theme-border bg-[var(--surface-muted)] p-2">
        {isOneClickMode ? (
          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
            <div className="min-w-0">
              <div className="font-mono text-xs text-[var(--foreground)]">
                One-click armed / {settings.defaultOrderSize} pUSD
              </div>
              <div className="mt-1 truncate text-[10px] theme-muted">
                {draft
                  ? `Last: ${draft.label}`
                  : "Click green YES or red NO liquidity to send immediately"}
              </div>
              {orderStatus && (
                <div className="mt-2 max-h-10 overflow-hidden text-[10px] theme-muted">
                  {orderStatus}
                </div>
              )}
            </div>
            <div
              className={`border px-2 py-1 text-[10px] ${
                submitting
                  ? "border-sky-500/50 text-sky-300"
                  : "theme-border theme-muted"
              }`}
            >
              {submitting ? "sending" : settings.postOnly ? "post-only" : "live"}
            </div>
          </div>
        ) : draft ? (
          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
            <div className="min-w-0">
              <div
                className={`font-mono text-xs ${
                  draft.intent === "NO" ? "text-red-300" : "text-green-300"
                }`}
              >
                {draft.label}
              </div>
              <div className="mt-1 text-[10px] theme-muted">
                Size from book: {formatBookSize(draft.size, true) || "--"}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] theme-muted">Order size</span>
                <input
                  value={orderSize}
                  onChange={(event) => setOrderSize(event.target.value)}
                  className="w-20 border theme-border bg-[var(--terminal-bg)] px-2 py-1 font-mono text-[11px] text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  inputMode="decimal"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {settings.quickSizes.map((size, index) => (
                  <button
                    key={`${size}-${index}`}
                    type="button"
                    onClick={() => setOrderSize(size)}
                    className="border theme-border px-2 py-1 font-mono text-[10px] text-[var(--foreground)] transition hover:border-[var(--accent)] hover:bg-[var(--surface-soft)]"
                  >
                    {size}
                  </button>
                ))}
                {settings.postOnly && (
                  <span className="border border-sky-500/40 px-2 py-1 text-[10px] text-sky-300">
                    post-only
                  </span>
                )}
              </div>
              {orderStatus && (
                <div className="mt-2 max-h-10 overflow-hidden text-[10px] theme-muted">
                  {orderStatus}
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={!onPlaceOrder || submitting || mode !== "poly"}
              onClick={() => {
                void submitOrder();
              }}
              className="border theme-border px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {mode === "poly"
                ? submitting
                  ? "Sending..."
                  : "Open Order"
                : "Reference"}
            </button>
          </div>
        ) : (
          <div className="py-2 text-center text-[11px] theme-muted">
            {mode === "poly"
              ? "Click a bid or ask cell to stage an order"
              : "Binance book is reference-only"}
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableOrderbookWindow({
  asset,
  marketId,
  timeframe,
  zIndex,
  bounds,
  frame,
  onFrameChange,
  onFocus,
  onPlaceOrder,
  onClose,
  settings,
}: {
  asset: Asset;
  marketId: string;
  timeframe: Timeframe;
  zIndex: number;
  bounds: WorkspaceBounds;
  frame?: WindowFrameState;
  onFrameChange: (frame: WindowFrameState) => void;
  onFocus: () => void;
  onPlaceOrder: (request: PlaceOrderRequest) => Promise<unknown>;
  onClose: () => void;
  settings: TradingSettings;
}) {
  const [bids, setBids] = useState<OrderbookLevel[]>([]);
  const [asks, setAsks] = useState<OrderbookLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<OrderbookOutcome>("Up");
  const [slug, setSlug] = useState<string>("");
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [tokenId, setTokenId] = useState<string>("");
  const [noTokenId, setNoTokenId] = useState<string>("");
  const [tickSize, setTickSize] = useState<TickSize>("0.001");

  useEffect(() => {
    const fetchOrderbook = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/pol/orderbook?asset=${asset}&timeframe=${timeframe}&outcome=${outcome}`
        );

        if (!res.ok) {
          const text = await res.text();
          setError(`HTTP ${res.status}: ${text}`);
          return;
        }

        const data = await res.json();
        const tokenIds = Array.isArray(data.tokenIds)
          ? data.tokenIds.map((id: unknown) => String(id))
          : [];
        const outcomeIndex = outcome === "Down" ? 1 : 0;
        const oppositeOutcomeIndex = outcomeIndex === 0 ? 1 : 0;

        setSlug(String(data.slug ?? ""));
        setTokenId(String(tokenIds[outcomeIndex] ?? data.tokenId ?? ""));
        setNoTokenId(String(tokenIds[oppositeOutcomeIndex] ?? ""));
        setTickSize(String(data.tickSize ?? "0.001") as TickSize);
        const mappedBids: OrderbookLevel[] = (data.bids ?? []).map(
          (lvl: { price: string | number; size: string | number }) => ({
            price: Number(lvl.price),
            size: Number(lvl.size),
          })
        );
        const mappedAsks: OrderbookLevel[] = (data.asks ?? []).map(
          (lvl: { price: string | number; size: string | number }) => ({
            price: Number(lvl.price),
            size: Number(lvl.size),
          })
        );

        setBids(mappedBids);
        setAsks(mappedAsks);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderbook();
    const interval = window.setInterval(fetchOrderbook, 2000);

    return () => {
      window.clearInterval(interval);
    };
  }, [asset, timeframe, outcome]);

  return (
    <WindowFrame
      title={`Orderbook / ${asset} / ${timeframe}`}
      accent="book"
      zIndex={zIndex}
      initialX={130}
      initialY={170}
      initialWidth={520}
      initialHeight={620}
      minWidth={420}
      minHeight={420}
      bounds={bounds}
      frame={frame}
      onFrameChange={onFrameChange}
      onFocus={onFocus}
      onClose={onClose}
    >
      <div className="flex h-full flex-col gap-2 theme-surface p-2 text-xs">
        <div className="flex justify-between gap-3">
          <div className="truncate theme-muted" title={slug || marketId}>
            {asset} / {timeframe} / {slug || marketId}
          </div>
          {loading && (
            <div className="text-[10px] theme-muted">updating...</div>
          )}
        </div>

        <div className="grid grid-cols-2 border theme-border">
          {(["Up", "Down"] as OrderbookOutcome[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setOutcome(option);
                setDraft(null);
              }}
              className={`px-2 py-1 text-[11px] transition ${
                outcome === option
                  ? "bg-[var(--surface-soft)] text-[var(--foreground)]"
                  : "theme-muted hover:bg-[var(--surface-muted)]"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <ScalpOrderbookLadder
          asset={asset}
          mode="poly"
          bids={bids}
          asks={asks}
          loading={loading}
          error={error ? `Error loading orderbook: ${error}` : null}
          emptyText="No Polymarket liquidity"
          draft={draft}
          onSelect={setDraft}
          tokenId={tokenId}
          noTokenId={noTokenId}
          tickSize={tickSize}
          onPlaceOrder={onPlaceOrder}
          settings={settings}
        />
      </div>
    </WindowFrame>
  );
}

function DraggableBinanceOrderbookWindow({
  asset,
  zIndex,
  bounds,
  frame,
  onFrameChange,
  onFocus,
  onClose,
  settings,
}: {
  asset: Asset;
  zIndex: number;
  bounds: WorkspaceBounds;
  frame?: WindowFrameState;
  onFrameChange: (frame: WindowFrameState) => void;
  onFocus: () => void;
  onClose: () => void;
  settings: TradingSettings;
}) {
  const [bids, setBids] = useState<OrderbookLevel[]>([]);
  const [asks, setAsks] = useState<OrderbookLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const symbol = `${asset}USDT`;

  useEffect(() => {
    const fetchDepth = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = new URL("https://api.binance.com/api/v3/depth");
        url.searchParams.set("symbol", symbol);
        url.searchParams.set("limit", "100");

        const res = await fetch(url);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }

        const data = (await res.json()) as {
          bids?: [string, string][];
          asks?: [string, string][];
        };

        setBids(
          (data.bids ?? []).map(([price, size]) => ({
            price: Number(price),
            size: Number(size),
          }))
        );
        setAsks(
          (data.asks ?? []).map(([price, size]) => ({
            price: Number(price),
            size: Number(size),
          }))
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load depth");
      } finally {
        setLoading(false);
      }
    };

    fetchDepth();
    const interval = window.setInterval(fetchDepth, 1500);

    return () => {
      window.clearInterval(interval);
    };
  }, [symbol]);

  return (
    <WindowFrame
      title={`Binance Book / ${symbol}`}
      accent="book"
      zIndex={zIndex}
      initialX={160}
      initialY={190}
      initialWidth={520}
      initialHeight={620}
      minWidth={420}
      minHeight={420}
      bounds={bounds}
      frame={frame}
      onFrameChange={onFrameChange}
      onFocus={onFocus}
      onClose={onClose}
    >
      <div className="flex h-full flex-col gap-2 theme-surface p-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="font-mono theme-muted">{symbol}</div>
          {loading && <div className="text-[10px] theme-muted">updating...</div>}
        </div>

        <ScalpOrderbookLadder
          asset={asset}
          mode="binance"
          bids={bids}
          asks={asks}
          loading={loading}
          error={error ? `Error loading Binance book: ${error}` : null}
          emptyText="No Binance depth"
          draft={draft}
          onSelect={setDraft}
          settings={settings}
        />
      </div>
    </WindowFrame>
  );
}

function CoinSearchModal({
  onClose,
  onSelectCoin,
}: {
  onClose: () => void;
  onSelectCoin: (symbol: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => COINS.filter((coin) => coin.includes(query.toLowerCase())),
    [query]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm border theme-border theme-surface p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Select a chart</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm theme-muted hover:text-[var(--foreground)]"
          >
            x
          </button>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search: bitcoin, ethereum, solana, xrp..."
          className="mb-3 w-full border theme-border bg-[var(--surface-muted)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
        />

        <div className="max-h-60 space-y-1 overflow-y-auto">
          {filtered.map((coin) => (
            <button
              key={coin}
              className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]"
              onClick={() => onSelectCoin(COIN_SYMBOLS[coin])}
            >
              {coin.toUpperCase()}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-xs theme-muted">Nothing found</div>
          )}
        </div>
      </div>
    </div>
  );
}

function AssetSearchModal({
  title,
  onClose,
  onSelectAsset,
}: {
  title: string;
  onClose: () => void;
  onSelectAsset: (asset: Asset) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm border theme-border theme-surface p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm theme-muted hover:text-[var(--foreground)]"
          >
            x
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {ASSETS.map((asset) => (
            <button
              key={asset}
              className="border theme-border bg-[var(--surface-muted)] px-3 py-3 text-left text-sm hover:bg-[var(--surface-soft)]"
              onClick={() => onSelectAsset(asset)}
            >
              {asset}/USDT
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrderbookSearchModal({
  onClose,
  onSelectOrderbook,
}: {
  onClose: () => void;
  onSelectOrderbook: (params: {
    asset: Asset;
    marketId: string;
    timeframe: Timeframe;
  }) => void;
}) {
  const [step, setStep] = useState<"asset" | "timeframe">("asset");
  const [selectedAsset, setSelectedAsset] = useState<OrderbookSelection | null>(
    null
  );

  const handleSelectAsset = (asset: OrderbookSelection) => {
    setSelectedAsset(asset);
    setStep("timeframe");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm border theme-border theme-surface p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {step === "asset" ? "Select fast market" : "Select timeframe"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm theme-muted hover:text-[var(--foreground)]"
          >
            x
          </button>
        </div>

        {step === "asset" && (
          <div className="space-y-1">
            {POLY_MARKETS_BY_ASSET.map((market) => (
              <button
                key={market.asset}
                className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]"
                onClick={() => handleSelectAsset(market)}
              >
                {market.asset}
              </button>
            ))}
          </div>
        )}

        {step === "timeframe" && selectedAsset && (
          <div className="space-y-2">
            <div className="mb-2 text-xs theme-muted">
              Asset: {selectedAsset.asset}
            </div>
            <div className="flex flex-wrap gap-2">
              {ORDERBOOK_TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  className="bg-[var(--surface-muted)] px-3 py-1 text-xs hover:bg-[var(--surface-soft)]"
                  onClick={() =>
                    onSelectOrderbook({
                      asset: selectedAsset.asset,
                      marketId: selectedAsset.marketId,
                      timeframe: tf,
                    })
                  }
                >
                  {tf === "1h" ? "60m" : tf}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScalpTerminal() {
  const signer = useEthersSigner();
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const workspaceRef = useRef<HTMLElement | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOrderbookSearchOpen, setIsOrderbookSearchOpen] = useState(false);
  const [isBinanceBookSearchOpen, setIsBinanceBookSearchOpen] =
    useState(false);
  const [isPolyChartSearchOpen, setIsPolyChartSearchOpen] = useState(false);
  const [workspaceTabs, setWorkspaceTabs] = useState<WorkspaceTab[]>([
    { id: 1, name: "Setup 1" },
  ]);
  const [activeWorkspaceTabId, setActiveWorkspaceTabId] = useState(1);
  const [editingTabId, setEditingTabId] = useState<number | null>(null);
  const [editingTabName, setEditingTabName] = useState("");
  const [draggedTabId, setDraggedTabId] = useState<number | null>(null);
  const [nextTabId, setNextTabId] = useState(2);
  const [chartWindows, setChartWindows] = useState<ChartWindow[]>([]);
  const [orderbookWindows, setOrderbookWindows] = useState<OrderbookWindow[]>(
    []
  );
  const [binanceOrderbookWindows, setBinanceOrderbookWindows] = useState<
    BinanceOrderbookWindow[]
  >([]);
  const [polyChartWindows, setPolyChartWindows] = useState<PolyChartWindow[]>(
    []
  );
  const [nextId, setNextId] = useState(1);
  const [activeWindowId, setActiveWindowId] = useState<number | null>(null);
  const [safeAddress, setSafeAddress] = useState<string | null>(null);
  const [workspaceBounds, setWorkspaceBounds] = useState<WorkspaceBounds>({
    width: 1200,
    height: 720,
  });
  const [tradingSettings, setTradingSettings] = useState<TradingSettings>(() =>
    readTradingSettings(),
  );

  useEffect(() => {
    if (!isConnected || !address) {
      window.setTimeout(() => setSafeAddress(null), 0);
      return;
    }

    let cancelled = false;

    const loadSafe = async () => {
      try {
        const res = await fetch(`/api/user/safe?address=${address}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setSafeAddress((data.safeAddress as string | null) ?? null);
        }
      } catch (e) {
        console.error("[ScalpTerminal] failed to load safe:", e);
      }
    };

    loadSafe();

    return () => {
      cancelled = true;
    };
  }, [address, isConnected]);

  useEffect(() => {
    const syncSettings = () => setTradingSettings(readTradingSettings());

    syncSettings();
    window.addEventListener("storage", syncSettings);
    window.addEventListener("polybook:trading-settings-updated", syncSettings);

    return () => {
      window.removeEventListener("storage", syncSettings);
      window.removeEventListener(
        "polybook:trading-settings-updated",
        syncSettings,
      );
    };
  }, []);

  useEffect(() => {
    const node = workspaceRef.current;
    if (!node) return;

    const updateBounds = () => {
      setWorkspaceBounds({
        width: Math.max(640, node.clientWidth),
        height: Math.max(420, node.clientHeight),
      });
    };
    const observer = new ResizeObserver(updateBounds);

    updateBounds();
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const activeChartWindows = useMemo(
    () => chartWindows.filter((window) => window.tabId === activeWorkspaceTabId),
    [activeWorkspaceTabId, chartWindows],
  );
  const activeOrderbookWindows = useMemo(
    () =>
      orderbookWindows.filter(
        (window) => window.tabId === activeWorkspaceTabId,
      ),
    [activeWorkspaceTabId, orderbookWindows],
  );
  const activeBinanceOrderbookWindows = useMemo(
    () =>
      binanceOrderbookWindows.filter(
        (window) => window.tabId === activeWorkspaceTabId,
      ),
    [activeWorkspaceTabId, binanceOrderbookWindows],
  );
  const activePolyChartWindows = useMemo(
    () =>
      polyChartWindows.filter(
        (window) => window.tabId === activeWorkspaceTabId,
      ),
    [activeWorkspaceTabId, polyChartWindows],
  );

  const createWorkspaceTab = () => {
    const id = nextTabId;
    setWorkspaceTabs((prev) => [...prev, { id, name: getDefaultTabName(id) }]);
    setActiveWorkspaceTabId(id);
    setActiveWindowId(null);
    setNextTabId((value) => value + 1);
  };

  const startRenamingTab = (tab: WorkspaceTab) => {
    setEditingTabId(tab.id);
    setEditingTabName(tab.name);
  };

  const commitRenamingTab = () => {
    if (editingTabId === null) return;

    const nextName = editingTabName.trim();
    setWorkspaceTabs((prev) =>
      prev.map((tab) =>
        tab.id === editingTabId
          ? { ...tab, name: nextName || getDefaultTabName(tab.id) }
          : tab,
      ),
    );

    setEditingTabId(null);
    setEditingTabName("");
  };

  const cancelRenamingTab = () => {
    setEditingTabId(null);
    setEditingTabName("");
  };

  const moveWorkspaceTab = (targetTabId: number) => {
    if (draggedTabId === null || draggedTabId === targetTabId) {
      setDraggedTabId(null);
      return;
    }

    setWorkspaceTabs((prev) => {
      const draggedTab = prev.find((tab) => tab.id === draggedTabId);
      if (!draggedTab) return prev;

      const withoutDragged = prev.filter((tab) => tab.id !== draggedTabId);
      const targetIndex = withoutDragged.findIndex(
        (tab) => tab.id === targetTabId,
      );

      if (targetIndex < 0) return prev;

      return [
        ...withoutDragged.slice(0, targetIndex),
        draggedTab,
        ...withoutDragged.slice(targetIndex),
      ];
    });
    setDraggedTabId(null);
  };

  const updateChartWindowFrame = (id: number, frame: WindowFrameState) => {
    setChartWindows((prev) =>
      prev.map((window) => (window.id === id ? { ...window, frame } : window)),
    );
  };

  const updateOrderbookWindowFrame = (id: number, frame: WindowFrameState) => {
    setOrderbookWindows((prev) =>
      prev.map((window) => (window.id === id ? { ...window, frame } : window)),
    );
  };

  const updateBinanceOrderbookWindowFrame = (
    id: number,
    frame: WindowFrameState,
  ) => {
    setBinanceOrderbookWindows((prev) =>
      prev.map((window) => (window.id === id ? { ...window, frame } : window)),
    );
  };

  const updatePolyChartWindowFrame = (id: number, frame: WindowFrameState) => {
    setPolyChartWindows((prev) =>
      prev.map((window) => (window.id === id ? { ...window, frame } : window)),
    );
  };

  const closeWorkspaceTab = (tabId: number) => {
    if (workspaceTabs.length <= 1) return;

    const nextTabs = workspaceTabs.filter((tab) => tab.id !== tabId);
    const tabIndex = workspaceTabs.findIndex((tab) => tab.id === tabId);
    const fallbackTab =
      nextTabs[Math.max(0, tabIndex - 1)] ?? nextTabs[0] ?? workspaceTabs[0];
    const nextActiveId =
      activeWorkspaceTabId === tabId ? fallbackTab.id : activeWorkspaceTabId;

    setWorkspaceTabs(nextTabs);
    setActiveWorkspaceTabId(nextActiveId);
    setActiveWindowId(null);
    if (editingTabId === tabId) {
      cancelRenamingTab();
    }
    setChartWindows((prev) => prev.filter((window) => window.tabId !== tabId));
    setOrderbookWindows((prev) =>
      prev.filter((window) => window.tabId !== tabId),
    );
    setBinanceOrderbookWindows((prev) =>
      prev.filter((window) => window.tabId !== tabId),
    );
    setPolyChartWindows((prev) =>
      prev.filter((window) => window.tabId !== tabId),
    );
  };

  const openChartForSymbol = (symbol: string) => {
    const id = nextId;
    setChartWindows((prev) => [
      ...prev,
      { id, tabId: activeWorkspaceTabId, symbol },
    ]);
    setActiveWindowId(id);
    setNextId((id) => id + 1);
  };

  const openOrderbookWindow = (params: {
    asset: Asset;
    marketId: string;
    timeframe: Timeframe;
  }) => {
    if (
      !tradingSettings.allowedAssets[params.asset] ||
      !tradingSettings.allowedTimeframes[params.timeframe]
    ) {
      window.alert("This market is disabled in Profile > Position settings.");
      return;
    }

    const id = nextId;
    setOrderbookWindows((prev) => [
      ...prev,
      { id, tabId: activeWorkspaceTabId, ...params },
    ]);
    setActiveWindowId(id);
    setNextId((id) => id + 1);
  };

  const openBinanceOrderbookWindow = (asset: Asset) => {
    if (!tradingSettings.allowedAssets[asset]) {
      window.alert("This asset is disabled in Profile > Position settings.");
      return;
    }

    const id = nextId;
    setBinanceOrderbookWindows((prev) => [
      ...prev,
      { id, tabId: activeWorkspaceTabId, asset },
    ]);
    setActiveWindowId(id);
    setNextId((id) => id + 1);
  };

  const openPolyChartWindow = (params: {
    asset: Asset;
    marketId: string;
    timeframe: Timeframe;
  }) => {
    if (
      !tradingSettings.allowedAssets[params.asset] ||
      !tradingSettings.allowedTimeframes[params.timeframe]
    ) {
      window.alert("This market is disabled in Profile > Position settings.");
      return;
    }

    const id = nextId;
    setPolyChartWindows((prev) => [
      ...prev,
      { id, tabId: activeWorkspaceTabId, ...params },
    ]);
    setActiveWindowId(id);
    setNextId((id) => id + 1);
  };

  const getWindowZIndex = (id: number) => (id === activeWindowId ? 45 : 35);

  const placePolymarketOrder = async ({
    draft,
    size,
    postOnly,
  }: PlaceOrderRequest) => {
    if (!signer || !address || !isConnected) {
      throw new Error("Connect wallet before trading.");
    }

    if (!draft.tokenId) {
      throw new Error("Missing Polymarket token id for this order.");
    }

    if (chainId !== 137) {
      await switchChainAsync({ chainId: 137 });
    }

    const connectedSigner = await signer.getAddress();
    if (connectedSigner.toLowerCase() !== address.toLowerCase()) {
      throw new Error("Connected wallet changed. Reconnect wallet.");
    }

    const tradingWalletAddress = await ensureDepositWalletWithRelayer(signer);
    const normalizedTradingWallet = tradingWalletAddress.toLowerCase();
    const normalizedSafeAddress = safeAddress?.toLowerCase();

    rememberDepositWalletAddress(address, tradingWalletAddress).catch((error) =>
      console.warn("Failed to persist deposit wallet address", error),
    );

    if (
      typeof window !== "undefined" &&
      safeAddress &&
      normalizedSafeAddress !== normalizedTradingWallet
    ) {
      window.localStorage.removeItem(`poly_creds_${safeAddress}`);
      window.localStorage.removeItem(
        `poly_creds_v2_proxy_${normalizedSafeAddress}`,
      );
      window.localStorage.removeItem(
        `poly_creds_v2_gnosis-safe_${normalizedSafeAddress}`,
      );
    }

    if (normalizedSafeAddress !== normalizedTradingWallet) {
      setSafeAddress(tradingWalletAddress);
    }

    const client = await initPolymarketClient(
      signer,
      tradingWalletAddress,
      "deposit-wallet",
    );
    const side = draft.side === "BUY" ? Side.BUY : Side.SELL;
    const price = Number(draft.price.toFixed(3));
    const clobShareSize = toClobShareSize(size, price);

    if (!Number.isFinite(clobShareSize) || clobShareSize <= 0) {
      throw new Error("Invalid order notional or price.");
    }

    const order = await client.createOrder(
      {
        tokenID: draft.tokenId,
        price,
        side,
        size: clobShareSize,
      },
      { tickSize: draft.tickSize ?? "0.001" },
    );

    const signedOrder = order as {
      maker?: string;
      signer?: string;
      signatureType?: number;
    };

    if (signedOrder.maker?.toLowerCase() !== normalizedTradingWallet) {
      throw new Error(
        `Order maker mismatch. Expected deposit wallet ${tradingWalletAddress}, got ${
          signedOrder.maker ?? "unknown"
        }.`,
      );
    }

    if (signedOrder.signatureType !== SignatureTypeV2.POLY_1271) {
      throw new Error(
        `Order signature flow mismatch. Expected deposit wallet signature type ${SignatureTypeV2.POLY_1271}, got ${
          signedOrder.signatureType ?? "unknown"
        }.`,
      );
    }

    return client.postOrder(
      order,
      OrderType.GTC,
      postOnly ?? tradingSettings.postOnly,
      false,
    );
  };

  const isEmpty =
    activeChartWindows.length === 0 &&
    activeOrderbookWindows.length === 0 &&
    activeBinanceOrderbookWindows.length === 0 &&
    activePolyChartWindows.length === 0;

  return (
    <div className="relative min-h-screen w-full overflow-hidden theme-bg">
      <div className="flex min-h-screen flex-col">
        <Header />

        <main className="relative flex flex-1 flex-col overflow-hidden theme-bg">
          <div className="flex h-10 shrink-0 items-end gap-1 border-b theme-border bg-[var(--surface)] px-2">
            {workspaceTabs.map((tab) => (
              <div
                key={tab.id}
                draggable={editingTabId !== tab.id}
                onDragStart={() => setDraggedTabId(tab.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => moveWorkspaceTab(tab.id)}
                onDragEnd={() => setDraggedTabId(null)}
                className={`flex h-7 w-[138px] items-center border text-xs transition ${
                  tab.id === activeWorkspaceTabId
                    ? "border-[var(--accent)] bg-[var(--surface-soft)] text-[var(--foreground)]"
                    : "theme-border bg-[var(--surface-muted)] theme-muted"
                } ${
                  draggedTabId === tab.id ? "opacity-45" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveWorkspaceTabId(tab.id);
                    setActiveWindowId(null);
                  }}
                  onDoubleClick={() => startRenamingTab(tab)}
                  className={`h-full min-w-0 flex-1 truncate px-3 text-left font-semibold ${
                    editingTabId === tab.id ? "hidden" : ""
                  }`}
                  title="Double click to rename. Drag to reorder."
                >
                  {tab.name}
                </button>
                {editingTabId === tab.id && (
                  <input
                    autoFocus
                    value={editingTabName}
                    onChange={(event) => setEditingTabName(event.target.value)}
                    onBlur={commitRenamingTab}
                    onFocus={(event) => event.currentTarget.select()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") commitRenamingTab();
                      if (event.key === "Escape") cancelRenamingTab();
                    }}
                    className="h-full min-w-0 flex-1 bg-transparent px-2 font-mono text-xs text-[var(--foreground)] outline-none"
                  />
                )}
                {workspaceTabs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => closeWorkspaceTab(tab.id)}
                    className="h-full w-7 shrink-0 border-l theme-border text-center hover:text-[var(--foreground)]"
                    aria-label={`Close ${tab.name}`}
                  >
                    x
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={createWorkspaceTab}
              className="h-7 w-9 border theme-border bg-[var(--surface-muted)] text-sm text-[var(--foreground)] transition hover:border-[var(--accent)]"
              title="New setup tab"
            >
              +
            </button>
          </div>

          <section
            ref={workspaceRef}
            className="relative min-h-0 flex-1 overflow-hidden theme-bg"
          >
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-5 px-4">
              {isEmpty && (
                <div className="flex max-w-xl flex-col items-center justify-center text-center">
                  <p className="text-[28px] font-semibold">
                    PolyBook scalp terminal
                  </p>
                  <span className="mt-2 text-sm theme-muted">
                    Open an orderbook or a Binance reference chart for BTC, ETH,
                    SOL, or XRP. The workspace is focused only on fast Polymarket
                    crypto windows.
                  </span>
                </div>
              )}

              <div className="pointer-events-auto grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="inline-flex border theme-border theme-surface transition hover:scale-103">
                  <button
                    type="button"
                    className="flex w-[112px] flex-col items-center gap-2 p-3"
                    onClick={() => setIsOrderbookSearchOpen(true)}
                    title="Open Polymarket orderbook"
                  >
                    <Image
                      src="/bookmark.svg"
                      alt="Polymarket book"
                      width={60}
                      height={60}
                      className="theme-center-icon block cursor-pointer p-1 shadow-lg"
                    />
                    <span className="text-xs theme-muted">Poly Book</span>
                  </button>
                </div>

                <div className="inline-flex border theme-border theme-surface transition hover:scale-103">
                  <button
                    type="button"
                    className="flex w-[112px] flex-col items-center gap-2 p-3"
                    onClick={() => setIsBinanceBookSearchOpen(true)}
                    title="Open Binance orderbook"
                  >
                    <Image
                      src="/bookmark.svg"
                      alt="Binance book"
                      width={60}
                      height={60}
                      className="theme-center-icon block cursor-pointer p-1 shadow-lg"
                    />
                    <span className="text-xs theme-muted">Binance Book</span>
                  </button>
                </div>

                <div className="inline-flex border theme-border theme-surface transition hover:scale-103">
                  <button
                    type="button"
                    className="flex w-[112px] flex-col items-center gap-2 p-3"
                    onClick={() => setIsSearchOpen(true)}
                    title="Open Binance chart"
                  >
                    <Image
                      src="/metrics.svg"
                      alt="Binance chart"
                      width={60}
                      height={60}
                      className="theme-center-icon block cursor-pointer p-1 shadow-lg"
                    />
                    <span className="text-xs theme-muted">Binance Chart</span>
                  </button>
                </div>

                <div className="inline-flex border theme-border theme-surface transition hover:scale-103">
                  <button
                    type="button"
                    className="flex w-[112px] flex-col items-center gap-2 p-3"
                    onClick={() => setIsPolyChartSearchOpen(true)}
                    title="Open Polymarket chart"
                  >
                    <Image
                      src="/metrics.svg"
                      alt="Polymarket chart"
                      width={60}
                      height={60}
                      className="theme-center-icon block cursor-pointer p-1 shadow-lg"
                    />
                    <span className="text-xs theme-muted">Poly Chart</span>
                  </button>
                </div>
              </div>
            </div>

            {activeChartWindows.map((window) => (
              <DraggableChartWindow
                key={window.id}
                symbol={window.symbol}
                zIndex={getWindowZIndex(window.id)}
                bounds={workspaceBounds}
                frame={window.frame}
                onFrameChange={(frame) =>
                  updateChartWindowFrame(window.id, frame)
                }
                onFocus={() => setActiveWindowId(window.id)}
                onClose={() =>
                  setChartWindows((prev) =>
                    prev.filter((chart) => chart.id !== window.id)
                  )
                }
              />
            ))}

            {activeBinanceOrderbookWindows.map((window) => (
              <DraggableBinanceOrderbookWindow
                key={window.id}
                asset={window.asset}
                zIndex={getWindowZIndex(window.id)}
                bounds={workspaceBounds}
                frame={window.frame}
                onFrameChange={(frame) =>
                  updateBinanceOrderbookWindowFrame(window.id, frame)
                }
                onFocus={() => setActiveWindowId(window.id)}
                settings={tradingSettings}
                onClose={() =>
                  setBinanceOrderbookWindows((prev) =>
                    prev.filter((orderbook) => orderbook.id !== window.id)
                  )
                }
              />
            ))}

            {activePolyChartWindows.map((window) => (
              <DraggablePolyChartWindow
                key={window.id}
                asset={window.asset}
                timeframe={window.timeframe}
                zIndex={getWindowZIndex(window.id)}
                bounds={workspaceBounds}
                frame={window.frame}
                onFrameChange={(frame) =>
                  updatePolyChartWindowFrame(window.id, frame)
                }
                onFocus={() => setActiveWindowId(window.id)}
                onClose={() =>
                  setPolyChartWindows((prev) =>
                    prev.filter((chart) => chart.id !== window.id)
                  )
                }
              />
            ))}

            {activeOrderbookWindows.map((window) => (
              <DraggableOrderbookWindow
                key={window.id}
                asset={window.asset}
                marketId={window.marketId}
                timeframe={window.timeframe}
                zIndex={getWindowZIndex(window.id)}
                bounds={workspaceBounds}
                frame={window.frame}
                onFrameChange={(frame) =>
                  updateOrderbookWindowFrame(window.id, frame)
                }
                onFocus={() => setActiveWindowId(window.id)}
                onPlaceOrder={placePolymarketOrder}
                settings={tradingSettings}
                onClose={() =>
                  setOrderbookWindows((prev) =>
                    prev.filter((orderbook) => orderbook.id !== window.id)
                  )
                }
              />
            ))}
          </section>
        </main>
      </div>

      {isSearchOpen && (
        <CoinSearchModal
          onClose={() => setIsSearchOpen(false)}
          onSelectCoin={(symbol) => {
            openChartForSymbol(symbol);
            setIsSearchOpen(false);
          }}
        />
      )}

      {isOrderbookSearchOpen && (
        <OrderbookSearchModal
          onClose={() => setIsOrderbookSearchOpen(false)}
          onSelectOrderbook={(params) => {
            openOrderbookWindow(params);
            setIsOrderbookSearchOpen(false);
          }}
        />
      )}

      {isBinanceBookSearchOpen && (
        <AssetSearchModal
          title="Select Binance book"
          onClose={() => setIsBinanceBookSearchOpen(false)}
          onSelectAsset={(asset) => {
            openBinanceOrderbookWindow(asset);
            setIsBinanceBookSearchOpen(false);
          }}
        />
      )}

      {isPolyChartSearchOpen && (
        <OrderbookSearchModal
          onClose={() => setIsPolyChartSearchOpen(false)}
          onSelectOrderbook={(params) => {
            openPolyChartWindow(params);
            setIsPolyChartSearchOpen(false);
          }}
        />
      )}
    </div>
  );
}
