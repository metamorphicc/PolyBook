"use client";

import { useState } from "react";
import CustomConnect from "./CustomConnect";
import { DepositContent } from "./DepositContent";
import { useModal } from "./Modal";

export function TradingHeaderActions({ compact = false }: { compact?: boolean }) {
  const { openModal, closeModal } = useModal();
  const [tradingWallet, setTradingWallet] = useState<string | null>(null);

  const handleDeposit = () => {
    openModal(
      <DepositContent address={tradingWallet ?? ""} closeModal={closeModal} />,
    );
  };

  return (
    <>
      <button
        type="button"
        disabled={!tradingWallet}
        onClick={handleDeposit}
        className={`shrink-0 theme-muted transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent ${
          compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"
        }`}
      >
        Deposit
      </button>
      <div className="min-w-0 shrink-0">
        <CustomConnect onTradingWalletAddress={setTradingWallet} />
      </div>
    </>
  );
}
