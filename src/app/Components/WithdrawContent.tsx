"use client";

import { useMemo, useState } from "react";
import { ethers } from "ethers";

type WithdrawContentProps = {
  safeAddress: string;
  closeModal: () => void;
  onSend: (destinationAddress: string) => Promise<string>;
};

export function WithdrawContent({
  safeAddress,
  closeModal,
  onSend,
}: WithdrawContentProps) {
  const [destination, setDestination] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const isValidDestination = useMemo(
    () => ethers.utils.isAddress(destination.trim()),
    [destination]
  );

  const handleSend = async () => {
    const target = destination.trim();
    setError(null);
    setTxHash(null);

    if (!ethers.utils.isAddress(target)) {
      setError("Enter a valid Polygon address.");
      return;
    }

    setSending(true);
    try {
      const hash = await onSend(target);
      setTxHash(hash);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Withdraw failed.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-[var(--foreground)]">
          Withdraw
        </h2>
        <p className="mt-1 text-sm theme-muted">
          Send available stablecoin balance from your Safe.
        </p>
      </div>

      <div className="border theme-border bg-[var(--surface-muted)] p-3">
        <div className="text-[11px] uppercase tracking-wide theme-muted">
          Safe
        </div>
        <div className="mt-1 break-all font-mono text-xs text-[var(--foreground)]">
          {safeAddress}
        </div>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm theme-muted">Destination address</span>
        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="0x..."
          autoFocus
          className="border theme-border bg-transparent px-3 py-2 font-mono text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
        />
      </label>

      {error && (
        <div className="border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {txHash && (
        <div className="border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-400">
          Sent:{" "}
          <a
            href={`https://polygonscan.com/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </a>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={closeModal}
          className="border theme-border px-3 py-2 text-sm theme-muted transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={sending || !isValidDestination}
          onClick={handleSend}
          className="bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-[var(--background)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
