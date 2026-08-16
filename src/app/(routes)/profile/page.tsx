"use client";

import Header from "@/app/Components/header";
import {
  deriveDepositWalletAddressWithRelayer,
  saveDepositWalletAddress,
  useEthersSigner,
} from "@/app/Components/CustomConnect";
import {
  DEFAULT_TRADING_SETTINGS,
  readTradingSettings,
  type FastAsset,
  type FastTimeframe,
  type TradingSettings,
  writeTradingSettings,
} from "@/app/Components/tradingSettings";
import { useAppKitAccount } from "@reown/appkit/react";
import Image from "next/image";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type PortfolioPosition = {
  title: string;
  slug: string;
  eventSlug: string;
  outcome: string;
  size: number;
  avgPrice: number;
  curPrice: number;
  currentValue: number;
  cashPnl: number;
  realizedPnl: number;
  percentPnl: number;
  status: "Open" | "Closed";
  endDate: string;
};

type PortfolioStats = {
  activeCount: number;
  historyCount: number;
  wins: number;
  losses: number;
  winRate: number | null;
  totalPnl: number;
};

type PortfolioResponse = {
  tradingWalletAddress: string;
  value: number;
  active: PortfolioPosition[];
  history: PortfolioPosition[];
  stats: PortfolioStats;
};

const AVATAR_KEY = "polybook_profile_avatar";
const BIO_KEY = "polybook_profile_bio";
const SETTINGS_ASSETS: FastAsset[] = ["BTC", "ETH", "SOL", "XRP"];
const SETTINGS_TIMEFRAMES: FastTimeframe[] = ["5m", "15m", "1h"];

const MOCK_PORTFOLIO: PortfolioResponse = {
  tradingWalletAddress: "0x0000000000000000000000000000000000000000",
  value: 428.74,
  active: [
    {
      title: "Bitcoin Up or Down - 15m fast market",
      slug: "btc-updown-15m-demo",
      eventSlug: "btc-fast-demo",
      outcome: "Up",
      size: 162.5,
      avgPrice: 0.49,
      curPrice: 0.56,
      currentValue: 91.0,
      cashPnl: 11.38,
      realizedPnl: 0,
      percentPnl: 14.29,
      status: "Open",
      endDate: "2026-06-04T15:15:00.000Z",
    },
    {
      title: "Solana Up or Down - 5m fast market",
      slug: "sol-updown-5m-demo",
      eventSlug: "sol-fast-demo",
      outcome: "Down",
      size: 240,
      avgPrice: 0.52,
      curPrice: 0.47,
      currentValue: 112.8,
      cashPnl: -12.0,
      realizedPnl: 0,
      percentPnl: -9.62,
      status: "Open",
      endDate: "2026-06-04T15:05:00.000Z",
    },
  ],
  history: [
    {
      title: "Ethereum Up or Down - 60m fast market",
      slug: "eth-updown-1h-demo",
      eventSlug: "eth-fast-demo",
      outcome: "Up",
      size: 310,
      avgPrice: 0.44,
      curPrice: 0.71,
      currentValue: 220.1,
      cashPnl: 0,
      realizedPnl: 83.7,
      percentPnl: 61.36,
      status: "Closed",
      endDate: "2026-06-04T13:00:00.000Z",
    },
    {
      title: "XRP Up or Down - 15m fast market",
      slug: "xrp-updown-15m-demo",
      eventSlug: "xrp-fast-demo",
      outcome: "Down",
      size: 185,
      avgPrice: 0.57,
      curPrice: 0.28,
      currentValue: 51.8,
      cashPnl: 0,
      realizedPnl: -53.65,
      percentPnl: -50.88,
      status: "Closed",
      endDate: "2026-06-04T12:15:00.000Z",
    },
    {
      title: "Bitcoin Up or Down - 5m fast market",
      slug: "btc-updown-5m-demo",
      eventSlug: "btc-fast-demo",
      outcome: "Up",
      size: 95,
      avgPrice: 0.51,
      curPrice: 0.63,
      currentValue: 59.85,
      cashPnl: 0,
      realizedPnl: 11.4,
      percentPnl: 23.53,
      status: "Closed",
      endDate: "2026-06-04T11:45:00.000Z",
    },
  ],
  stats: {
    activeCount: 2,
    historyCount: 3,
    wins: 2,
    losses: 1,
    winRate: 66.7,
    totalPnl: 40.83,
  },
};

export default function Profile() {
  const { address, isConnected } = useAppKitAccount();
  const signer = useEthersSigner();
  const [loading, setLoading] = useState(false);
  const [tradingWallet, setTradingWallet] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"portfolio" | "settings">(
    "portfolio",
  );
  const [tradingSettings, setTradingSettings] = useState<TradingSettings>(() =>
    readTradingSettings(),
  );
  const [bio, setBio] = useState(() =>
    typeof window === "undefined" ? "" : localStorage.getItem(BIO_KEY) ?? "",
  );
  const [editing, setEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(() =>
    typeof window === "undefined"
      ? "/logo.png"
      : localStorage.getItem(AVATAR_KEY) ?? "/logo.png",
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      window.setTimeout(() => {
        setTradingWallet(null);
        setPortfolio(null);
      }, 0);
      return;
    }

    const getProfileData = async () => {
      setLoading(true);
      try {
        const tradingWalletRes = await fetch(
          `/api/user/trading-wallet?address=${address}`,
        );
        if (!tradingWalletRes.ok) {
          setTradingWallet(null);
          setPortfolio(null);
          return;
        }

        const tradingWalletData = await tradingWalletRes.json();
        let tradingWalletAddress =
          (tradingWalletData.depositWalletAddress as string | null) ?? null;

        if (!tradingWalletAddress && signer) {
          tradingWalletAddress = await deriveDepositWalletAddressWithRelayer(
            signer,
          );
          setTradingWallet(tradingWalletAddress);
          saveDepositWalletAddress(address, tradingWalletAddress).catch((e) =>
            console.warn("[profile trading wallet save skipped]:", e),
          );
        }

        setTradingWallet(tradingWalletAddress);

        if (!tradingWalletAddress) {
          setPortfolio(null);
          return;
        }

        const portfolioRes = await fetch(
          `/api/profile/portfolio?user=${tradingWalletAddress}`,
        );

        if (!portfolioRes.ok) {
          setPortfolio(null);
          return;
        }

        setPortfolio((await portfolioRes.json()) as PortfolioResponse);
      } catch (e) {
        console.error("Profile data error:", e);
        setPortfolio(null);
      } finally {
        setLoading(false);
      }
    };

    getProfileData();
    window.addEventListener(
      "polybook:trading-wallet-updated",
      getProfileData,
    );

    return () => {
      window.removeEventListener(
        "polybook:trading-wallet-updated",
        getProfileData,
      );
    };
  }, [isConnected, address, signer]);

  const hasRealPortfolio =
    Boolean(portfolio?.active.length) || Boolean(portfolio?.history.length);
  const displayPortfolio =
    hasRealPortfolio && portfolio ? portfolio : MOCK_PORTFOLIO;
  const stats = displayPortfolio.stats;
  const totalPnl = stats?.totalPnl ?? 0;
  const shortTradingWallet = tradingWallet
    ? `${tradingWallet.slice(0, 6)}...${tradingWallet.slice(-4)}`
    : "--";

  const profileName = useMemo(() => {
    if (!address) return "Guest";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result);
      localStorage.setItem(AVATAR_KEY, value);
      setAvatarUrl(value);
    };
    reader.readAsDataURL(file);
  };

  const saveBio = () => {
    localStorage.setItem(BIO_KEY, bio);
    setEditing(false);
  };

  const updateTradingSettings = (next: TradingSettings) => {
    setTradingSettings(next);
    writeTradingSettings(next);
  };

  return (
    <div className="min-h-screen theme-bg">
      <Header />

      <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-5 py-5">
        <section className="grid gap-4 border theme-border theme-surface p-5 shadow-sm lg:grid-cols-[minmax(340px,1fr)_2fr]">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleAvatarClick}
              className="group relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden border theme-border bg-[var(--surface-muted)] transition hover:border-[var(--accent)]"
              title="Change avatar"
            >
              <Image
                src={avatarUrl}
                alt="avatar"
                fill
                sizes="80px"
                className="object-cover transition duration-200 group-hover:scale-105 group-hover:brightness-75"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                Change
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="min-w-0">
              <div className="text-lg font-semibold text-[var(--foreground)]">
                {profileName}
              </div>
              <div className="mt-1 font-mono text-xs theme-muted">
                Trading wallet: {shortTradingWallet}
              </div>

              <div className="mt-3 flex items-center gap-2">
                {editing ? (
                  <input
                    autoFocus
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    onBlur={saveBio}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveBio();
                    }}
                    className="w-full max-w-[280px] border-b theme-border bg-transparent text-sm outline-none"
                    placeholder="Short trader note"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="max-w-[320px] truncate text-left text-sm theme-muted"
                  >
                    {bio.trim() || "Short trader note"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Portfolio" value={formatUsd(displayPortfolio.value)} />
            <Stat
              label="Winrate"
              value={stats?.winRate === null || !stats ? "--" : `${stats.winRate}%`}
            />
            <Stat label="Active" value={String(stats?.activeCount ?? 0)} />
            <Stat
              label="Total PnL"
              value={formatUsd(totalPnl)}
              tone={totalPnl >= 0 ? "good" : "bad"}
            />
          </div>
        </section>

        <div className="flex w-fit border theme-border theme-surface p-1 text-sm">
          {[
            ["portfolio", "Portfolio"],
            ["settings", "Position settings"],
          ].map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab as "portfolio" | "settings")}
              className={`px-4 py-2 transition ${
                activeTab === tab
                  ? "bg-[var(--foreground)] text-[var(--background)]"
                  : "theme-muted hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "portfolio" ? (
          <section className="grid min-h-[560px] gap-5 lg:grid-cols-[1.7fr_1fr]">
            <Panel title="Trading history">
              {loading ? (
                <EmptyState text="Loading portfolio..." />
              ) : displayPortfolio.history.length ? (
                <PositionList positions={displayPortfolio.history} />
              ) : (
                <EmptyState text="No trading history for this wallet yet." />
              )}
            </Panel>

            <Panel title="Active markets">
              {loading ? (
                <EmptyState text="Loading active markets..." />
              ) : displayPortfolio.active.length ? (
                <PositionList positions={displayPortfolio.active} compact />
              ) : (
                <EmptyState text="No active positions." />
              )}
            </Panel>
          </section>
        ) : (
          <PositionSettingsPanel
            settings={tradingSettings}
            onChange={updateTradingSettings}
          />
        )}
      </main>
    </div>
  );
}

function PositionSettingsPanel({
  settings,
  onChange,
}: {
  settings: TradingSettings;
  onChange: (settings: TradingSettings) => void;
}) {
  const update = (patch: Partial<TradingSettings>) => {
    onChange({ ...settings, ...patch });
  };
  const updateQuickSize = (index: number, value: string) => {
    const next = [...settings.quickSizes];
    next[index] = value;
    update({ quickSizes: next });
  };
  const updateAsset = (asset: FastAsset, enabled: boolean) => {
    update({
      allowedAssets: { ...settings.allowedAssets, [asset]: enabled },
    });
  };
  const updateTimeframe = (timeframe: FastTimeframe, enabled: boolean) => {
    update({
      allowedTimeframes: {
        ...settings.allowedTimeframes,
        [timeframe]: enabled,
      },
    });
  };

  return (
    <section className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <Panel title="Risk and execution">
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <SettingsInput
              label="Default order size"
              value={settings.defaultOrderSize}
              suffix="pUSD"
              onChange={(value) => update({ defaultOrderSize: value })}
            />
            <SettingsInput
              label="Max order size"
              value={settings.maxOrderSize}
              suffix="pUSD"
              onChange={(value) => update({ maxOrderSize: value })}
            />
            <SettingsInput
              label="Max position per market"
              value={settings.maxPositionSize}
              suffix="pUSD"
              onChange={(value) => update({ maxPositionSize: value })}
            />
            <SettingsInput
              label="Max spread"
              value={settings.maxSpreadPercent}
              suffix="%"
              onChange={(value) => update({ maxSpreadPercent: value })}
            />
            <SettingsInput
              label="Minimum side liquidity"
              value={settings.minBookLiquidity}
              suffix="shares"
              onChange={(value) => update({ minBookLiquidity: value })}
            />
          </div>

          <div className="border theme-border bg-[var(--surface-muted)] p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide theme-muted">
              Quick sizes
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {settings.quickSizes.map((value, index) => (
                <input
                  key={index}
                  value={value}
                  onChange={(event) =>
                    updateQuickSize(index, event.target.value)
                  }
                  inputMode="decimal"
                  className="border theme-border bg-[var(--terminal-bg)] px-3 py-2 font-mono text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                />
              ))}
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <SettingsToggle
              label="Post-only by default"
              text="Avoid crossing the spread when possible."
              checked={settings.postOnly}
              onChange={(value) => update({ postOnly: value })}
            />
            <SettingsToggle
              label="Require explicit send"
              text="Stage first, send only by button."
              checked={settings.requireConfirm}
              onChange={(value) => update({ requireConfirm: value })}
            />
            <SettingsToggle
              label="One-click mode"
              text="Click a live book cell to send immediately."
              checked={settings.oneClickTrading}
              onChange={(value) => update({ oneClickTrading: value })}
            />
            <SettingsToggle
              label="Auto-close expiring markets"
              text="Preference for risk tooling."
              checked={settings.autoCloseOnMarketEnd}
              onChange={(value) => update({ autoCloseOnMarketEnd: value })}
            />
          </div>
        </div>
      </Panel>

      <Panel title="Fast market filters">
        <div className="flex h-full flex-col gap-5">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide theme-muted">
              Assets
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SETTINGS_ASSETS.map((asset) => (
                <SettingsCheckbox
                  key={asset}
                  label={asset}
                  checked={settings.allowedAssets[asset]}
                  onChange={(value) => updateAsset(asset, value)}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide theme-muted">
              Timeframes
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SETTINGS_TIMEFRAMES.map((timeframe) => (
                <SettingsCheckbox
                  key={timeframe}
                  label={timeframe}
                  checked={settings.allowedTimeframes[timeframe]}
                  onChange={(value) => updateTimeframe(timeframe, value)}
                />
              ))}
            </div>
          </div>

          <div className="mt-auto border theme-border bg-[var(--surface-muted)] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide theme-muted">
              Current preset
            </div>
            <div className="mt-3 grid gap-2 font-mono text-xs text-[var(--foreground)]">
              <div>Size: {settings.defaultOrderSize} pUSD</div>
              <div>Max order: {settings.maxOrderSize} pUSD</div>
              <div>Spread guard: {settings.maxSpreadPercent}%</div>
              <div>
                Execution: {settings.postOnly ? "post-only" : "standard"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange(DEFAULT_TRADING_SETTINGS)}
              className="mt-4 border theme-border px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:bg-[var(--surface-soft)]"
            >
              Reset preset
            </button>
          </div>
        </div>
      </Panel>
    </section>
  );
}

function SettingsInput({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: string;
  suffix: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block border theme-border bg-[var(--surface-muted)] p-3">
      <span className="text-[11px] uppercase tracking-wide theme-muted">
        {label}
      </span>
      <span className="mt-2 grid grid-cols-[1fr_auto] items-center gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
          className="min-w-0 bg-transparent font-mono text-lg text-[var(--foreground)] outline-none"
        />
        <span className="text-xs theme-muted">{suffix}</span>
      </span>
    </label>
  );
}

function SettingsToggle({
  label,
  text,
  checked,
  onChange,
}: {
  label: string;
  text: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 border theme-border bg-[var(--surface-muted)] p-3">
      <span>
        <span className="block text-sm font-medium text-[var(--foreground)]">
          {label}
        </span>
        <span className="mt-1 block text-xs theme-muted">{text}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[var(--accent)]"
      />
    </label>
  );
}

function SettingsCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between border px-3 py-2 font-mono text-sm transition ${
        checked
          ? "border-[var(--accent)] bg-[var(--surface-soft)] text-[var(--foreground)]"
          : "theme-border bg-[var(--surface-muted)] theme-muted"
      }`}
    >
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[var(--accent)]"
      />
    </label>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad";
}) {
  return (
    <div className="border theme-border bg-[var(--surface-muted)] px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide theme-muted">
        {label}
      </div>
      <div
        className={`mt-1 font-mono text-lg ${
          tone === "good"
            ? "text-green-600"
            : tone === "bad"
              ? "text-red-600"
              : "text-[var(--foreground)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col border theme-border theme-surface shadow-sm">
      <div className="border-b theme-border px-5 py-4 text-sm font-semibold text-[var(--foreground)]">
        {title}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
    </div>
  );
}

function PositionList({
  positions,
  compact = false,
}: {
  positions: PortfolioPosition[];
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col">
      {positions.map((position, index) => {
        const pnl = position.cashPnl + position.realizedPnl;

        return (
          <div
            key={`${position.slug}-${position.outcome}-${index}`}
            className="grid gap-3 border-b theme-border px-2 py-3 last:border-b-0 md:grid-cols-[1fr_auto]"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-[var(--foreground)]">
                {position.title}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs theme-muted">
                <span>{position.outcome || "Outcome"}</span>
                <span>{position.status}</span>
                {!compact && position.endDate && (
                  <span>{new Date(position.endDate).toLocaleDateString()}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-right font-mono text-xs">
              <Metric label="Size" value={position.size.toFixed(2)} />
              <Metric label="Value" value={formatUsd(position.currentValue)} />
              <Metric
                label="PnL"
                value={formatUsd(pnl)}
                tone={pnl >= 0 ? "good" : "bad"}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad";
}) {
  return (
    <div>
      <div className="text-[10px] theme-muted">{label}</div>
      <div
        className={
          tone === "good"
            ? "text-green-600"
            : tone === "bad"
              ? "text-red-600"
              : "text-[var(--foreground)]"
        }
      >
        {value}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center text-sm theme-muted">
      {text}
    </div>
  );
}

function formatUsd(value: number) {
  return `$${value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}
