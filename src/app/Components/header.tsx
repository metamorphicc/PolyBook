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

function pickTwoAssets() {
  const shuffled = [...ASSETS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2);
}

function MarketPrices() {
  const [assets] = useState<Asset[]>(() => pickTwoAssets());
  const [prices, setPrices] = useState<PriceView[]>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchPrices = async () => {
      try {
        const res = await fetch(`/api/crypto/prices?assets=${assets.join(",")}`, {
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
  }, [assets]);

  const displayPrices = useMemo(
    () =>
      assets.map((asset) => {
        const price = prices.find((item) => item.asset === asset);
        return price ?? { asset, price: null, changePercent: null };
      }),
    [assets, prices],
  );

  return (
    <div className="hidden min-w-[260px] items-center justify-center gap-2 lg:flex">
      {displayPrices.map((item) => {
        const positive = (item.changePercent ?? 0) >= 0;

        return (
          <div
            key={item.asset}
            className="flex min-w-[118px] items-center justify-between border theme-border bg-[var(--surface-muted)] px-3 py-2"
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold theme-muted">
                {item.asset}
              </span>
              <span className="font-mono text-[13px] text-[var(--foreground)]">
                {item.price === null
                  ? "--"
                  : `$${item.price.toLocaleString("en-US", {
                      maximumFractionDigits: item.asset === "XRP" ? 4 : 2,
                    })}`}
              </span>
            </div>
            <span
              className={`font-mono text-[11px] ${
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

export default function Header() {
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

    return () => {
      cancelled = true;
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
    <header className="w-full border-b theme-border theme-surface">
      <div className="mx-auto flex h-[70px] w-full max-w-[1600px] items-center gap-4 px-5">
        <button
          type="button"
          className="flex shrink-0 cursor-pointer items-center gap-3"
          onClick={() => router.push("/")}
        >
          <Image
            src="/logo_blue.jpg"
            alt="PolyBook"
            width={36}
            height={36}
            className="object-contain"
          />
          <div className="flex items-baseline gap-3">
            <span className="text-[21px] mr-10 font-semibold leading-none">
              PolyBook
            </span>
            
          </div>
        </button>

        <MarketPrices />

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-3 py-2 text-sm theme-muted transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          >
            Terminal
          </button>
          <button
            type="button"
            disabled={!tradingWallet}
            onClick={handleDeposit}
            className="px-3 py-2 text-sm theme-muted transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
          >
            Deposit
          </button>
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="px-3 py-2 text-sm theme-muted transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
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
