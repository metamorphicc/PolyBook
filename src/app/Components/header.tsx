"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { DepositContent } from "./DepositContent";
import { useModal } from "./Modal";
import CustomConnect from "./CustomConnect";
import { ThemeToggle } from "./ThemeToggle";

type Asset = "BTC" | "ETH" | "SOL" | "XRP";

type PriceView = {
  asset: Asset;
  price: number | null;
  changePercent: number | null;
};

const ASSETS: Asset[] = ["BTC", "ETH", "SOL", "XRP"];

/**
 * The four fast-market assets, always in the same order.
 *
 * This used to shuffle and show two of them, which meant the header changed on
 * every reload — noise in a place a trader reads for reference prices.
 */
function MarketPrices({ compact = false }: { compact?: boolean }) {
  const [prices, setPrices] = useState<PriceView[]>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchPrices = async () => {
      try {
        const res = await fetch(`/api/crypto/prices?assets=${ASSETS.join(",")}`, {
          cache: "no-store",
        });
        if (!res.ok) return;

        const data = (await res.json()) as { prices?: PriceView[] };
        if (!cancelled) setPrices(data.prices ?? []);
      } catch {}
    };

    fetchPrices();
    const interval = window.setInterval(fetchPrices, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const displayPrices = useMemo(
    () =>
      ASSETS.map((asset) => {
        const price = prices.find((item) => item.asset === asset);
        return price ?? { asset, price: null, changePercent: null };
      }),
    [prices],
  );

  return (
    <div
      className={`hidden items-center justify-center lg:flex ${
        compact ? "gap-1.5" : "min-w-[260px] gap-2"
      }`}
    >
      {displayPrices.map((item) => {
        const positive = (item.changePercent ?? 0) >= 0;

        return (
          <div
            key={item.asset}
            className={`flex items-center justify-between border theme-border bg-[var(--surface-muted)] ${
              compact
                ? "min-w-[92px] gap-2 px-2 py-1"
                : "min-w-[118px] px-3 py-2"
            }`}
          >
            <div className="flex flex-col">
              <span
                className={`font-semibold theme-muted ${
                  compact ? "text-[9px]" : "text-[10px]"
                }`}
              >
                {item.asset}
              </span>
              <span
                className={`font-mono text-[var(--foreground)] ${
                  compact ? "text-[11px]" : "text-[13px]"
                }`}
              >
                {item.price === null
                  ? "--"
                  : `$${item.price.toLocaleString("en-US", {
                      maximumFractionDigits: item.asset === "XRP" ? 4 : 2,
                    })}`}
              </span>
            </div>
            <span
              className={`font-mono ${compact ? "text-[10px]" : "text-[11px]"} ${
                positive ? "text-green-400" : "text-red-400"
              }`}
            >
              {item.changePercent === null
                ? "--"
                : `${positive ? "+" : ""}${item.changePercent.toFixed(2)}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** `compact` trims the chrome for the terminal dock, which budgets its height. */
export default function Header({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { openModal, closeModal } = useModal();
  const { address, isConnected } = useAppKitAccount();
  const [tradingWallet, setTradingWallet] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTradingWallet(null);
      return;
    }

    let cancelled = false;

    const initAccount = async () => {
      try {
        const tradingRes = await fetch(
          `/api/user/trading-wallet?address=${address}`,
        );
        if (!tradingRes.ok) return;
        const tradingData = await tradingRes.json();
        if (!cancelled) {
          setTradingWallet(
            (tradingData.depositWalletAddress as string | null) ?? null,
          );
        }
      } catch {
        if (!cancelled) setTradingWallet(null);
      }
    };

    initAccount();
    // The session cookie is established asynchronously after connect (SessionSync),
    // and the deposit address is persisted after wallet derivation. Refetch when
    // either lands so the deposit modal shows the right address without a reload.
    window.addEventListener("polybook:trading-wallet-updated", initAccount);

    return () => {
      cancelled = true;
      window.removeEventListener("polybook:trading-wallet-updated", initAccount);
    };
  }, [address, isConnected]);

  const handleDeposit = () => {
    openModal(
      <DepositContent
        address={tradingWallet ?? ""}
        closeModal={closeModal}
      />,
    );
  };

  return (
    <header className="w-full shrink-0 border-b theme-border theme-surface">
      <div
        className={`mx-auto flex w-full items-center gap-4 px-5 ${
          compact ? "h-[46px] max-w-none" : "h-[70px] max-w-[1600px]"
        }`}
      >
        <button
          type="button"
          className="flex shrink-0 cursor-pointer items-center gap-3"
          onClick={() => router.push("/")}
        >
          <Image
            src="/logo_blue.jpg"
            alt="PolyBook"
            width={compact ? 24 : 36}
            height={compact ? 24 : 36}
            className="object-contain"
          />
          <div className="flex items-baseline gap-3">
            <span
              className={`font-semibold leading-none ${
                compact ? "text-[15px]" : "mr-10 text-[21px]"
              }`}
            >
              PolyBook
            </span>
          </div>
        </button>

        <MarketPrices compact={compact} />

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          <button
            type="button"
            onClick={() => router.push("/")}
            className={`theme-muted transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] ${
              compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"
            }`}
          >
            Terminal
          </button>
          <button
            type="button"
            disabled={!tradingWallet}
            onClick={handleDeposit}
            className={`theme-muted transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent ${
              compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"
            }`}
          >
            Deposit
          </button>
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className={`theme-muted transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] ${
              compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"
            }`}
          >
            Profile
          </button>
        </nav>

        <ThemeToggle />

        <div className="min-w-0 shrink-0">
          <CustomConnect onTradingWalletAddress={setTradingWallet} />
        </div>
      </div>
    </header>
  );
}
