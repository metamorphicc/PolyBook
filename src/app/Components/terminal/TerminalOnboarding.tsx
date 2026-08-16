"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { useAccount, useSwitchChain } from "wagmi";
import { DepositContent } from "../DepositContent";
import {
  deriveDepositWalletAddressWithRelayer,
  ensureDepositWalletWithRelayer,
  readPusdBalance,
  saveDepositWalletAddress,
  useEthersSigner,
} from "../CustomConnect";
import { ensureSiweSession } from "../../lib/auth/client";
import type { TradingAccount } from "./useTradingAccount";
import { formatUsd } from "./types";

const POLYGON_CHAIN_ID = 137;
const BALANCE_POLL_MS = 6000;

type StepState = "done" | "current" | "todo";

/**
 * The gate that turns a connected browser into a funded, trading-ready account.
 *
 * Each step owns its own error text. Previously these calls were spread across
 * the app and failures went to `console.warn`, so a user who could not trade had
 * no way to find out why.
 */
export function TerminalOnboarding({
  account,
  onDismiss,
}: {
  account: TradingAccount;
  onDismiss: () => void;
}) {
  const signer = useEthersSigner();
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const [sessionAddress, setSessionAddress] = useState<string | null>(null);
  const [derivedWallet, setDerivedWallet] = useState<string | null>(null);
  const [pusdBalance, setPusdBalance] = useState<number | null>(null);
  const [busyStep, setBusyStep] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [showDeposit, setShowDeposit] = useState(false);

  const depositWallet = account.depositWallet ?? derivedWallet;

  const setStepError = (step: number, message: string | null) =>
    setErrors((current) => {
      const next = { ...current };
      if (message) next[step] = message;
      else delete next[step];
      return next;
    });

  // Step 2 status: does the session cookie match the connected wallet? The fetch
  // only returns the address; callers decide what to do with it, so a late reply
  // after a wallet switch can be dropped instead of overwriting fresh state.
  const fetchSessionAddress = useCallback(async () => {
    try {
      const res = await fetch("/api/session", { cache: "no-store" });
      if (!res.ok) return null;

      const data = (await res.json()) as { address?: string | null };
      return data.address ? data.address.toLowerCase() : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const value = await fetchSessionAddress();
      if (!cancelled) setSessionAddress(value);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [fetchSessionAddress, address, isConnected]);

  // Step 4 status: the deposit wallet address is deterministic, so it can be
  // shown (and funded) before it is deployed.
  useEffect(() => {
    if (!signer || account.depositWallet) return;

    let cancelled = false;

    deriveDepositWalletAddressWithRelayer(signer)
      .then((value) => {
        if (!cancelled) setDerivedWallet(value);
      })
      .catch(() => {
        // Not fatal: the create step will surface the real error on click.
      });

    return () => {
      cancelled = true;
    };
  }, [account.depositWallet, signer]);

  // Step 5 status: poll the token contract, since the CLOB balance endpoint is
  // only available after the final step.
  useEffect(() => {
    if (!signer?.provider || !depositWallet) return;

    let cancelled = false;

    const load = async () => {
      try {
        const balance = await readPusdBalance(signer.provider!, depositWallet);
        if (!cancelled) setPusdBalance(balance);
      } catch {
        // Leave the previous reading on screen.
      }
    };

    load();
    const interval = window.setInterval(load, BALANCE_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [depositWallet, signer]);

  const walletConnected = isConnected && Boolean(address);
  const signedIn =
    walletConnected && sessionAddress === address?.toLowerCase();
  const onPolygon = chainId === POLYGON_CHAIN_ID;
  const hasWallet = Boolean(account.depositWallet);
  const funded = (pusdBalance ?? 0) > 0 || (account.balanceUsd ?? 0) > 0;
  const canTrade = account.ready;

  const run = async (step: number, action: () => Promise<void>) => {
    setBusyStep(step);
    setStepError(step, null);

    try {
      await action();
    } catch (e) {
      setStepError(step, e instanceof Error ? e.message : "Step failed");
    } finally {
      setBusyStep(null);
    }
  };

  const steps: Array<{
    title: string;
    done: boolean;
    hint: string;
    action: () => Promise<void>;
    label: string;
  }> = [
    {
      title: "Connect a wallet",
      done: walletConnected,
      hint: address ? shorten(address) : "Polygon-compatible wallet",
      action: async () => {
        await open();
      },
      label: "Connect",
    },
    {
      title: "Sign in",
      done: signedIn,
      hint: "One signature, no gas — proves you own the wallet",
      action: async () => {
        if (!signer || !address) throw new Error("Connect a wallet first.");
        await ensureSiweSession(signer, address);
        setSessionAddress(await fetchSessionAddress());
      },
      label: "Sign",
    },
    {
      title: "Switch to Polygon",
      done: onPolygon,
      hint: onPolygon ? "Connected to Polygon" : `Currently on chain ${chainId ?? "?"}`,
      action: async () => {
        await switchChainAsync({ chainId: POLYGON_CHAIN_ID });
      },
      label: "Switch",
    },
    {
      title: "Create trading wallet",
      done: hasWallet,
      hint: depositWallet
        ? shorten(depositWallet)
        : "Deployed by the relayer — you pay no gas",
      action: async () => {
        if (!signer || !address) throw new Error("Connect a wallet first.");

        const walletAddress = await ensureDepositWalletWithRelayer(signer);
        await saveDepositWalletAddress(signer, address, walletAddress);
        setDerivedWallet(walletAddress);
        window.dispatchEvent(new Event("polybook:trading-wallet-updated"));
      },
      label: "Create",
    },
    {
      title: "Fund it",
      done: funded,
      hint: depositWallet
        ? pusdBalance === null
          ? "Send pUSD or USDC.e on Polygon"
          : `Balance ${formatUsd(pusdBalance)}`
        : "Create the trading wallet first",
      action: async () => {
        if (!depositWallet) throw new Error("Create the trading wallet first.");
        setShowDeposit(true);
      },
      label: "Deposit",
    },
    {
      title: "Enable trading",
      done: canTrade,
      hint: "Creates your API key and token approvals",
      action: () => account.activate(),
      label: "Enable",
    },
  ];

  const firstIncomplete = steps.findIndex((step) => !step.done);
  const allDone = firstIncomplete === -1;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[var(--theme-bg)]/85 backdrop-blur-sm">
      <div className="max-h-full w-full max-w-md overflow-y-auto border theme-border bg-[var(--surface)] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              {allDone ? "You are ready to trade" : "Set up trading"}
            </h2>
            <p className="mt-1 text-[11px] theme-muted">
              {allDone
                ? "All set. The dock is live behind this panel."
                : `Step ${firstIncomplete + 1} of ${steps.length}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="border theme-border px-2 py-1 text-[10px] theme-muted transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
          >
            {allDone ? "Start trading" : "Skip"}
          </button>
        </div>

        <ol className="mt-4 space-y-1.5">
          {steps.map((step, index) => {
            const state: StepState = step.done
              ? "done"
              : index === firstIncomplete
                ? "current"
                : "todo";
            const busy = busyStep === index;
            const error = errors[index];

            return (
              <li
                key={step.title}
                className={`border px-3 py-2 ${
                  state === "current"
                    ? "border-[var(--accent)] bg-[var(--surface-soft)]"
                    : "theme-border"
                } ${state === "todo" ? "opacity-60" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center border text-[10px] font-semibold ${
                      state === "done"
                        ? "border-green-500/60 bg-green-500/20 text-green-300"
                        : "theme-border theme-muted"
                    }`}
                  >
                    {state === "done" ? "✓" : index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-[var(--foreground)]">
                      {step.title}
                    </div>
                    <div className="truncate font-mono text-[10px] theme-muted">
                      {step.hint}
                    </div>
                  </div>

                  {!step.done && (
                    <button
                      type="button"
                      disabled={busy || state === "todo"}
                      onClick={() => void run(index, async () => step.action())}
                      className="shrink-0 border border-[var(--accent)] px-2.5 py-1 text-[10px] font-semibold text-[var(--foreground)] transition hover:bg-[var(--accent)]/20 disabled:cursor-not-allowed disabled:border-[var(--theme-border)] disabled:opacity-50"
                    >
                      {busy ? "..." : step.label}
                    </button>
                  )}
                </div>

                {error && (
                  <div className="mt-2 border border-red-500/40 bg-red-500/10 px-2 py-1 text-[10px] leading-tight text-red-300">
                    {error}
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {account.activationError && !errors[5] && (
          <div className="mt-3 border border-red-500/40 bg-red-500/10 px-2 py-1 text-[10px] text-red-300">
            {account.activationError}
          </div>
        )}

        {showDeposit && depositWallet && (
          <div className="mt-4 border theme-border bg-[var(--surface-muted)] p-3">
            <DepositContent
              address={depositWallet}
              closeModal={() => setShowDeposit(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function shorten(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
