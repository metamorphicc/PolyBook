"use client";

import Header from "@/app/Components/header";
import PolymarketPriceChart from "@/app/Components/PolymarketPriceChart";
import PriceChart from "@/app/Components/priceChart";
import { PositionSettingsPanel } from "@/app/Components/PositionSettingsPanel";
import {
  readTradingSettings,
  writeTradingSettings,
  type TradingSettings,
} from "@/app/Components/tradingSettings";
import { BlotterPanel } from "@/app/Components/terminal/BlotterPanel";
import { DomLadder } from "@/app/Components/terminal/DomLadder";
import { MarketRail } from "@/app/Components/terminal/MarketRail";
import { TerminalOnboarding } from "@/app/Components/terminal/TerminalOnboarding";
import { TerminalStatusBar } from "@/app/Components/terminal/TerminalStatusBar";
import {
  ASSETS,
  TIMEFRAMES,
  TRADINGVIEW_SYMBOLS,
  formatCountdown,
  type Asset,
  type LivePosition,
  type Outcome,
  type Timeframe,
} from "@/app/Components/terminal/types";
import { useFastMarket } from "@/app/Components/terminal/useFastMarket";
import { useOrderTicket } from "@/app/Components/terminal/useOrderTicket";
import { useTradingAccount } from "@/app/Components/terminal/useTradingAccount";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ChartMode = "poly" | "price";

/** Seconds before expiry at which the countdown starts warning. */
const EXPIRY_WARNING_SECONDS = 30;

const SHORTCUTS: Array<[string, string]> = [
  ["1 – 4", "Switch asset (BTC / ETH / SOL / XRP)"],
  ["Q / W / E", "Switch timeframe (5m / 15m / 1h)"],
  ["Z", "Flip Up / Down side of the market"],
  ["B", "Buy at the best ask"],
  ["S", "Sell at the best bid (exit)"],
  ["F", "Flatten the position at market"],
  ["C", "Cancel every working order in this market"],
  ["Esc", "Clear the staged order"],
  ["?", "Toggle this list"],
];

/**
 * The trading dock.
 *
 * A rigid grid, not a canvas: rail left, chart and blotter center, ladder pinned
 * full-height right, status bar across the top. Nothing drags, nothing resizes,
 * and the page never scrolls — a scalp terminal's layout is muscle memory, so
 * every panel stays exactly where it was last time.
 */
export default function ScalpTerminal() {
  const [asset, setAsset] = useState<Asset>("BTC");
  const [timeframe, setTimeframe] = useState<Timeframe>("5m");
  const [outcome, setOutcome] = useState<Outcome>("Up");
  const [chartMode, setChartMode] = useState<ChartMode>("poly");
  const [settings, setSettings] = useState<TradingSettings>(() =>
    readTradingSettings(),
  );
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const market = useFastMarket(asset, timeframe, outcome);
  const account = useTradingAccount(settings);

  // Scope the account's order and fill polling to whatever the ladder shows.
  useEffect(() => {
    if (market.conditionId) account.setActiveMarket(market.conditionId);
  }, [account, market.conditionId]);

  const position = useMemo(
    () =>
      market.tokenId
        ? account.positions.find((item) => item.asset === market.tokenId) ?? null
        : null,
    [account.positions, market.tokenId],
  );

  const marketOrders = useMemo(
    () =>
      market.conditionId
        ? account.orders.filter(
            (order) => !order.market || order.market === market.conditionId,
          )
        : account.orders,
    [account.orders, market.conditionId],
  );

  const ticket = useOrderTicket({ market, settings, position, account });

  const openPnl = useMemo(
    () => account.positions.reduce((sum, item) => sum + item.cashPnl, 0),
    [account.positions],
  );

  // Settings live in localStorage and are edited from two places (this drawer and
  // /profile), so mirror the change event instead of trusting local state alone.
  useEffect(() => {
    const sync = () => setSettings(readTradingSettings());

    window.addEventListener("polybook:trading-settings-updated", sync);
    return () =>
      window.removeEventListener("polybook:trading-settings-updated", sync);
  }, []);

  const updateSettings = useCallback((next: TradingSettings) => {
    setSettings(next);
    writeTradingSettings(next);
  }, []);

  const selectMarket = useCallback(
    (nextAsset: Asset, nextTimeframe: Timeframe) => {
      setAsset(nextAsset);
      setTimeframe(nextTimeframe);
    },
    [],
  );

  const activate = useCallback(() => {
    setShowOnboarding(true);
    void account.activate();
  }, [account]);

  /** Runs a blotter action, keeping the row's spinner and error next to it. */
  const runAction = useCallback(
    async (id: string, action: () => Promise<void>) => {
      setBusyId(id);
      setActionError(null);

      try {
        await action();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Action failed.");
      } finally {
        setBusyId(null);
      }
    },
    [],
  );

  const closePosition = useCallback(
    (target: LivePosition) =>
      void runAction(target.asset, () =>
        // No tick size passed: a blotter row can belong to a market that is not
        // on screen, so let the account look it up.
        account.closePosition(target.asset, target.size),
      ),
    [account, runAction],
  );

  const selectPosition = useCallback((target: LivePosition) => {
    // Fast-market titles carry the asset and window, so the ladder can be
    // pointed at a blotter row without another upstream lookup.
    const title = target.title.toUpperCase();
    const matchedAsset = ASSETS.find(
      (candidate) =>
        title.includes(candidate) || title.includes(assetLongName(candidate)),
    );
    const matchedTimeframe = TIMEFRAMES.find((candidate) =>
      title.includes(candidate === "1h" ? "60M" : candidate.toUpperCase()),
    );

    if (matchedAsset) setAsset(matchedAsset);
    if (matchedTimeframe) setTimeframe(matchedTimeframe);
    if (/down|no/i.test(target.outcome)) setOutcome("Down");
    else setOutcome("Up");
  }, []);

  const cancelAll = useCallback(() => {
    if (!market.conditionId) return;
    void runAction("cancel-all", () =>
      account.cancelAllInMarket(market.conditionId),
    );
  }, [account, market.conditionId, runAction]);

  // Keyboard control. Kept in one place so a key and the equivalent click go
  // through the same handlers, and ignored while typing in the size box.
  //
  // Live state is mirrored into a ref so the listener subscribes once instead of
  // re-binding twice a second as the book ticks. Key events can only arrive
  // after a commit, so the ref is always current by the time it is read.
  const stateRef = useRef({ market, ticket, position, cancelAll });

  useEffect(() => {
    stateRef.current = { market, ticket, position, cancelAll };
  }, [cancelAll, market, position, ticket]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const current = stateRef.current;
      const key = event.key;

      if (key === "?") {
        setShowHelp((value) => !value);
        return;
      }
      if (key === "Escape") {
        current.ticket.clear();
        setShowHelp(false);
        setShowSettings(false);
        return;
      }

      const assetIndex = ["1", "2", "3", "4"].indexOf(key);
      if (assetIndex !== -1) {
        setAsset(ASSETS[assetIndex]);
        return;
      }

      const timeframeIndex = ["q", "w", "e"].indexOf(key.toLowerCase());
      if (timeframeIndex !== -1) {
        setTimeframe(TIMEFRAMES[timeframeIndex]);
        return;
      }

      switch (key.toLowerCase()) {
        case "z":
          setOutcome((value) => (value === "Up" ? "Down" : "Up"));
          return;
        case "b": {
          // Aim at the best ask, since that is the price a buy actually gets.
          const price = current.market.bestAsk;
          if (price === null || !current.market.tokenId) return;

          event.preventDefault();
          current.ticket.select({
            side: "BUY",
            outcome,
            asset,
            price,
            tokenId: current.market.tokenId,
            tickSize: current.market.tickSize,
          });
          return;
        }
        case "s": {
          const price = current.market.bestBid;
          if (price === null || !current.market.tokenId) return;

          event.preventDefault();
          current.ticket.select({
            side: "SELL",
            outcome,
            asset,
            price,
            tokenId: current.market.tokenId,
            tickSize: current.market.tickSize,
          });
          return;
        }
        case "f":
          event.preventDefault();
          void current.ticket.flatten();
          return;
        case "c":
          event.preventDefault();
          current.cancelAll();
          return;
        default:
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [asset, outcome]);

  const expiringSoon =
    settings.autoCloseOnMarketEnd &&
    market.secondsLeft !== null &&
    market.secondsLeft <= EXPIRY_WARNING_SECONDS;

  return (
    <div className="flex h-screen flex-col overflow-hidden theme-bg">
      <Header compact />

      <main className="relative grid min-h-0 flex-1 grid-cols-[176px_1fr_336px] grid-rows-[36px_1fr_190px]">
        <div className="col-span-3">
          <TerminalStatusBar
            asset={asset}
            timeframe={timeframe}
            outcome={outcome}
            secondsLeft={market.secondsLeft}
            mid={market.mid}
            openOrderCount={marketOrders.length}
            openPnl={openPnl}
            balanceUsd={account.balanceUsd}
            connected={Boolean(account.depositWallet)}
            stale={market.stale}
            ready={account.ready}
            onOpenSettings={() => setShowSettings((value) => !value)}
            onToggleHelp={() => setShowHelp((value) => !value)}
          />
        </div>

        <div className="row-span-2 min-h-0 overflow-hidden border-r theme-border">
          <MarketRail
            asset={asset}
            timeframe={timeframe}
            settings={settings}
            onSelect={selectMarket}
          />
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-2 border-b theme-border bg-[var(--surface)] px-2 py-1">
            <div className="flex">
              {(
                [
                  ["poly", "Probability"],
                  ["price", `${asset} price`],
                ] as Array<[ChartMode, string]>
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setChartMode(mode)}
                  className={`border px-2 py-0.5 text-[10px] transition ${
                    chartMode === mode
                      ? "border-[var(--accent)] bg-[var(--surface-soft)] text-[var(--foreground)]"
                      : "theme-border theme-muted hover:text-[var(--foreground)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="font-mono text-[10px] theme-muted">
              {market.slug || "resolving market..."}
            </div>

            {expiringSoon && (
              <div className="ml-auto border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-200">
                Window ends in {formatCountdown(market.secondsLeft)}
                {position ? " — position still open" : ""}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {chartMode === "poly" ? (
              <PolymarketPriceChart asset={asset} timeframe={timeframe} />
            ) : (
              <PriceChart symbol={TRADINGVIEW_SYMBOLS[asset]} />
            )}
          </div>
        </div>

        <div className="row-span-2 min-h-0 overflow-hidden border-l theme-border">
          <DomLadder
            market={market}
            asset={asset}
            outcome={outcome}
            onOutcomeChange={setOutcome}
            settings={settings}
            position={position}
            ticket={ticket}
            ready={account.ready}
            onActivate={activate}
          />
        </div>

        <div className="col-start-2 min-h-0">
          {actionError && (
            <div className="border-b border-red-500/40 bg-red-500/10 px-3 py-1 text-[10px] text-red-300">
              {actionError}
            </div>
          )}
          <BlotterPanel
            positions={account.positions}
            orders={marketOrders}
            fills={account.fills}
            busyId={busyId}
            ready={account.ready}
            onClosePosition={closePosition}
            onCancelOrder={(orderId) =>
              void runAction(orderId, () => account.cancelOrder(orderId))
            }
            onCancelAll={cancelAll}
            onSelectPosition={selectPosition}
          />
        </div>

        {showHelp && (
          <div className="absolute left-1/2 top-14 z-30 w-[340px] -translate-x-1/2 border theme-border bg-[var(--surface)] p-3 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--foreground)]">
                Keyboard
              </span>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="border theme-border px-1.5 text-[10px] theme-muted transition hover:text-[var(--foreground)]"
              >
                ✕
              </button>
            </div>
            <dl className="grid gap-1">
              {SHORTCUTS.map(([keys, description]) => (
                <div
                  key={keys}
                  className="grid grid-cols-[68px_1fr] items-baseline gap-2"
                >
                  <dt className="border theme-border bg-[var(--surface-muted)] px-1 py-0.5 text-center font-mono text-[10px] text-[var(--foreground)]">
                    {keys}
                  </dt>
                  <dd className="text-[10px] theme-muted">{description}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {showSettings && (
          <div className="absolute inset-y-0 right-0 z-30 flex w-[560px] max-w-full flex-col border-l theme-border bg-[var(--surface)] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b theme-border px-4 py-2">
              <span className="text-xs font-semibold text-[var(--foreground)]">
                Trading settings
              </span>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="border theme-border px-2 py-0.5 text-[10px] theme-muted transition hover:text-[var(--foreground)]"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <PositionSettingsPanel
                settings={settings}
                onChange={updateSettings}
                compact
              />
            </div>
          </div>
        )}

        {showOnboarding && !account.ready && (
          <TerminalOnboarding
            account={account}
            onDismiss={() => setShowOnboarding(false)}
          />
        )}
      </main>
    </div>
  );
}

/** Polymarket titles spell the asset out, e.g. "Bitcoin Up or Down". */
function assetLongName(asset: Asset) {
  switch (asset) {
    case "BTC":
      return "BITCOIN";
    case "ETH":
      return "ETHEREUM";
    case "SOL":
      return "SOLANA";
    case "XRP":
      return "XRP";
  }
}
