"use client";

import Header from "@/app/Components/header";
import {
  deriveDepositWalletAddressWithRelayer,
  saveDepositWalletAddress,
  useEthersSigner,
} from "@/app/Components/CustomConnect";
import {
  readTradingSettings,
  type TradingSettings,
  writeTradingSettings,
} from "@/app/Components/tradingSettings";
import { PositionSettingsPanel } from "@/app/Components/PositionSettingsPanel";
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

const EMPTY_PORTFOLIO: PortfolioResponse = {
  tradingWalletAddress: "",
  value: 0,
  active: [],
  history: [],
  stats: {
    activeCount: 0,
    historyCount: 0,
    wins: 0,
    losses: 0,
    winRate: null,
    totalPnl: 0,
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
          saveDepositWalletAddress(signer, address, tradingWalletAddress).catch(
            (e) => console.warn("[profile trading wallet save skipped]:", e),
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

  // No mock fallback: showing an invented PnL on a page next to a live trading
  // terminal is worse than showing nothing.
  const displayPortfolio = portfolio ?? EMPTY_PORTFOLIO;
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
