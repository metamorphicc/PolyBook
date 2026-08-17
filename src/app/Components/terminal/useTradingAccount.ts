"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { useAppKitAccount } from "@reown/appkit/react";
import { useAccount, useSwitchChain } from "wagmi";
import {
  AssetType,
  OrderType,
  Side,
  SignatureTypeV2,
  type ClobClient,
  type TickSize,
} from "@polymarket/clob-client-v2";
import {
  ensureDepositWalletWithRelayer,
  ensureExchangeApprovals,
  saveDepositWalletAddress,
  useEthersSigner,
} from "../CustomConnect";
import {
  hasPolymarketCreds,
  initPolymarketClient,
  restorePolymarketClient,
} from "../verifyUser";
import type { TradingSettings } from "../tradingSettings";
import type { LiveFill, LiveOrder, LivePosition, OrderDraft } from "./types";

const POLYGON_CHAIN_ID = 137;
const ACCOUNT_POLL_MS = 3000;
const COLLATERAL_DECIMALS = 6;

export type TradingAccount = {
  depositWallet: string | null;
  /** True once a signed CLOB client exists and orders can be sent. */
  ready: boolean;
  /**
   * True while the trading wallet is still being looked up. Callers should hold
   * back any "you are not set up" UI until this clears, or it flashes at users
   * who are in fact set up.
   */
  hydrating: boolean;
  activating: boolean;
  activationError: string | null;
  balanceUsd: number | null;
  allowanceUsd: number | null;
  positions: LivePosition[];
  orders: LiveOrder[];
  fills: LiveFill[];
  activate: () => Promise<void>;
  placeOrder: (draft: OrderDraft, size: number) => Promise<void>;
  closePosition: (
    tokenId: string,
    shares: number,
    tickSize?: TickSize,
  ) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  cancelAllInMarket: (conditionId: string) => Promise<void>;
  refresh: () => void;
  setActiveMarket: (conditionId: string) => void;
};

/**
 * BUY sizes are dollar notionals but the CLOB takes share counts, so a BUY has to
 * be divided by price. SELL sizes are already share counts and must be passed
 * straight through — dividing them would sell the wrong amount.
 */
function toShareSize(side: "BUY" | "SELL", size: number, price: number) {
  if (!Number.isFinite(size) || size <= 0) return 0;
  if (side === "SELL") return size;
  if (!Number.isFinite(price) || price <= 0) return 0;

  return size / price;
}

/**
 * Guards against a client that was built for the wrong wallet or flow — a signed
 * order whose maker is not the deposit wallet would spend from somewhere else.
 */
function assertSignedByDepositWallet(
  order: unknown,
  depositWalletAddress: string,
) {
  const signed = order as {
    maker?: string;
    signatureType?: number;
  };
  const expected = depositWalletAddress.toLowerCase();

  if (signed.maker?.toLowerCase() !== expected) {
    throw new Error(
      `Order maker mismatch. Expected deposit wallet ${depositWalletAddress}, got ${
        signed.maker ?? "unknown"
      }.`,
    );
  }

  if (signed.signatureType !== SignatureTypeV2.POLY_1271) {
    throw new Error(
      `Order signature flow mismatch. Expected deposit wallet signature type ${SignatureTypeV2.POLY_1271}, got ${
        signed.signatureType ?? "unknown"
      }.`,
    );
  }
}

function parseCollateral(value: string | undefined) {
  if (!value) return null;

  try {
    return Number(ethers.utils.formatUnits(value, COLLATERAL_DECIMALS));
  } catch {
    return null;
  }
}

/**
 * The exchange's rejection when the trading wallet has not approved it.
 *
 * Matched on text because the CLOB returns it as a message, not a code. Kept
 * narrow on purpose: the same response also mentions balance, and treating a
 * genuinely underfunded wallet as un-approved would send it through a pointless
 * on-chain approval instead of telling the user to add funds.
 */
function isMissingAllowanceError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);

  return /the allowance is not enough/i.test(message);
}

/**
 * Everything the dock needs to actually trade: the signed CLOB client, live open
 * orders / positions / fills, collateral balance, and the order actions.
 *
 * Activation (deposit wallet deploy + API key + allowance) is explicit rather
 * than automatic because each step can prompt for a signature.
 */
export function useTradingAccount(settings: TradingSettings): TradingAccount {
  const signer = useEthersSigner();
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const [depositWallet, setDepositWallet] = useState<string | null>(null);
  const [walletHydrated, setWalletHydrated] = useState(false);
  const [activatedClient, setActivatedClient] = useState<ClobClient | null>(null);
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [balanceUsd, setBalanceUsd] = useState<number | null>(null);
  const [allowanceUsd, setAllowanceUsd] = useState<number | null>(null);
  const [positions, setPositions] = useState<LivePosition[]>([]);
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [fills, setFills] = useState<LiveFill[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [activeMarket, setActiveMarket] = useState("");

  const activationRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  const owner = isConnected && address ? address.toLowerCase() : null;

  // Reset on disconnect and on account switch. A client built for the previous
  // account would keep signing against that account's trading wallet, so this is
  // a correctness guard, not just cleanup — and it runs during render so no
  // committed frame ever shows one account's balances as another's.
  const [activeOwner, setActiveOwner] = useState(owner);
  if (activeOwner !== owner) {
    setActiveOwner(owner);
    setActivatedClient(null);
    setDepositWallet(null);
    setWalletHydrated(false);
    setBalanceUsd(null);
    setAllowanceUsd(null);
    setPositions([]);
    setOrders([]);
    setFills([]);
    setActivationError(null);
  }

  // Rebuild the signed client from cached API credentials. This is the whole
  // reason navigating away and back does not send the user through "Enable
  // trading" again: the credentials outlive the component, so readiness should
  // too. Derived during render rather than in an effect because it only reads
  // localStorage — no prompt, no network call, nothing to wait for.
  const restoredClient = useMemo(() => {
    if (!signer || !owner || !depositWallet) return null;

    return restorePolymarketClient(signer, depositWallet, "deposit-wallet");
  }, [depositWallet, owner, signer]);

  const client = activatedClient ?? restoredClient;
  const ready = client !== null && depositWallet !== null;

  // Two different waits, and conflating them breaks one case or the other:
  // the wallet lookup is in flight, or the wallet is known and was set up before
  // but the signer wagmi needs for the restore is a tick behind. A known wallet
  // with no cached credentials is *not* a wait — that user has to activate, so
  // the onboarding should appear immediately.
  const credentialed =
    depositWallet !== null && hasPolymarketCreds(depositWallet, "deposit-wallet");
  const hydrating =
    owner !== null && (!walletHydrated || (credentialed && client === null));

  // Pick up the persisted trading wallet so positions and balances show before
  // the user activates trading. Refetched when SessionSync lands the cookie,
  // since the first attempt on a cold connect happens before the session exists.
  useEffect(() => {
    if (!owner) return;

    let cancelled = false;

    const loadWallet = async () => {
      try {
        const res = await fetch(`/api/user/trading-wallet?address=${owner}`, {
          cache: "no-store",
        });

        if (res.ok) {
          const data = (await res.json()) as {
            depositWalletAddress?: string | null;
          };
          if (!cancelled && data.depositWalletAddress) {
            setDepositWallet(data.depositWalletAddress.toLowerCase());
          }
        }
      } catch (e) {
        console.warn("[useTradingAccount] failed to load deposit wallet:", e);
      } finally {
        // Marked hydrated even on failure, otherwise a user who never signed in
        // would never be offered the onboarding that fixes it.
        if (!cancelled) setWalletHydrated(true);
      }
    };

    loadWallet();
    window.addEventListener("polybook:trading-wallet-updated", loadWallet);

    return () => {
      cancelled = true;
      window.removeEventListener("polybook:trading-wallet-updated", loadWallet);
    };
  }, [owner]);

  const activate = useCallback(async () => {
    if (!signer || !address) {
      throw new Error("Connect your wallet first.");
    }

    // Activation prompts for signatures; dedupe so a double click or a keyboard
    // shortcut racing the button does not open two wallet prompts.
    if (activationRef.current) return activationRef.current;

    const run = (async () => {
      setActivating(true);
      setActivationError(null);

      try {
        if (chainId !== POLYGON_CHAIN_ID) {
          await switchChainAsync({ chainId: POLYGON_CHAIN_ID });
        }

        const walletAddress = await ensureDepositWalletWithRelayer(signer);
        setDepositWallet(walletAddress.toLowerCase());

        await saveDepositWalletAddress(signer, address, walletAddress).catch((e) =>
          console.warn("[useTradingAccount] deposit wallet not persisted:", e),
        );

        const nextClient = await initPolymarketClient(
          signer,
          walletAddress,
          "deposit-wallet",
        );

        // The on-chain approval, and the reason this step is not optional: the
        // exchange rejects every order with `allowance: 0` until the trading
        // wallet has approved it. Failing here must fail activation — swallowing
        // it is what made the error surface later as an unexplained rejection.
        await ensureExchangeApprovals(signer, walletAddress);

        // Now that the chain state has changed, have the CLOB re-read it.
        await nextClient
          .updateBalanceAllowance({ asset_type: AssetType.COLLATERAL })
          .catch((e) =>
            console.warn("[useTradingAccount] balance refresh failed:", e),
          );

        setActivatedClient(nextClient);
        window.dispatchEvent(new Event("polybook:trading-wallet-updated"));
      } catch (e: unknown) {
        setActivatedClient(null);
        setActivationError(
          e instanceof Error ? e.message : "Failed to enable trading",
        );
        throw e;
      } finally {
        setActivating(false);
        activationRef.current = null;
      }
    })();

    activationRef.current = run;
    return run;
  }, [address, chainId, signer, switchChainAsync]);

  const requireClient = useCallback(() => {
    if (!client || !depositWallet) {
      throw new Error("Enable trading first.");
    }

    return { client, walletAddress: depositWallet };
  }, [client, depositWallet]);

  // Positions come from the public data API and only need the wallet address, so
  // they poll as soon as it is known — before trading is activated.
  useEffect(() => {
    if (!depositWallet) return;

    let cancelled = false;

    const loadPositions = async () => {
      try {
        const res = await fetch(
          `/api/profile/portfolio?user=${depositWallet}&scope=open`,
          { cache: "no-store" },
        );
        if (!res.ok) return;

        const data = (await res.json()) as { active?: LivePosition[] };
        if (!cancelled) setPositions(data.active ?? []);
      } catch (e) {
        console.warn("[useTradingAccount] positions poll failed:", e);
      }
    };

    loadPositions();
    const interval = window.setInterval(loadPositions, ACCOUNT_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [depositWallet, refreshToken]);

  // Open orders, fills and collateral need the authed client.
  useEffect(() => {
    if (!client) return;

    let cancelled = false;

    const loadAccount = async () => {
      const marketParams = activeMarket ? { market: activeMarket } : undefined;

      try {
        const openOrders = await client.getOpenOrders(marketParams);
        if (cancelled) return;

        // Every numeric field comes back as a string from the CLOB.
        setOrders(
          (openOrders ?? []).map((order) => ({
            id: order.id,
            side: order.side,
            price: Number(order.price),
            originalSize: Number(order.original_size),
            sizeMatched: Number(order.size_matched),
            outcome: order.outcome,
            assetId: order.asset_id,
            market: order.market,
          })),
        );
      } catch (e) {
        console.warn("[useTradingAccount] open orders poll failed:", e);
      }

      try {
        const trades = await client.getTrades(marketParams);
        if (cancelled) return;

        setFills(
          (trades ?? []).slice(0, 50).map((trade) => ({
            id: trade.id,
            side: String(trade.side),
            price: Number(trade.price),
            size: Number(trade.size),
            outcome: trade.outcome,
            matchTime: trade.match_time,
            status: trade.status,
          })),
        );
      } catch (e) {
        console.warn("[useTradingAccount] trades poll failed:", e);
      }

      try {
        const collateral = await client.getBalanceAllowance({
          asset_type: AssetType.COLLATERAL,
        });
        if (cancelled) return;

        setBalanceUsd(parseCollateral(collateral?.balance));
        setAllowanceUsd(parseCollateral(collateral?.allowance));
      } catch (e) {
        console.warn("[useTradingAccount] balance poll failed:", e);
      }
    };

    loadAccount();
    const interval = window.setInterval(loadAccount, ACCOUNT_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [client, activeMarket, refreshToken]);

  /**
   * Grants the missing on-chain approvals, then has the CLOB re-read them.
   *
   * Checked before an order and not only at activation: an approval can be
   * missing on a wallet set up before this code existed, or revoked afterwards.
   * The failure mode is the exchange rejecting an already-signed order with
   * `allowance: 0`, which reads to the user as an unexplained balance error.
   */
  const repairApprovals = useCallback(
    async (
      client: ClobClient,
      walletAddress: string,
      params: Parameters<ClobClient["updateBalanceAllowance"]>[0],
    ) => {
      if (!signer) throw new Error("Connect your wallet first.");

      await ensureExchangeApprovals(signer, walletAddress);
      await client.updateBalanceAllowance(params);
    },
    [signer],
  );

  const placeOrder = useCallback(
    async (draft: OrderDraft, size: number) => {
      const { client, walletAddress } = requireClient();

      if (!draft.tokenId) {
        throw new Error("Missing Polymarket token id for this order.");
      }

      const price = Number(draft.price.toFixed(3));
      const shares = toShareSize(draft.side, size, price);

      if (!Number.isFinite(shares) || shares <= 0) {
        throw new Error("Invalid order size or price.");
      }

      if (draft.side === "BUY") {
        // Surface a readable shortfall instead of the exchange's opaque
        // "not enough balance" once the order is already signed.
        if (balanceUsd !== null && size > balanceUsd) {
          throw new Error(
            `Not enough pUSD: balance $${balanceUsd.toFixed(2)}, order needs $${size.toFixed(2)}.`,
          );
        }

        if (allowanceUsd !== null && allowanceUsd < size) {
          await repairApprovals(client, walletAddress, {
            asset_type: AssetType.COLLATERAL,
          });
        }
      } else {
        // Selling moves conditional tokens, which needs its own approval.
        try {
          const conditional = await client.getBalanceAllowance({
            asset_type: AssetType.CONDITIONAL,
            token_id: draft.tokenId,
          });
          const heldShares = parseCollateral(conditional?.balance);
          const approvedShares = parseCollateral(conditional?.allowance);

          if (heldShares !== null && shares > heldShares + 1e-6) {
            throw new Error(
              `Not enough shares to sell: you hold ${heldShares.toFixed(2)}, order is ${shares.toFixed(2)}.`,
            );
          }

          if (approvedShares !== null && approvedShares < shares) {
            await repairApprovals(client, walletAddress, {
              asset_type: AssetType.CONDITIONAL,
              token_id: draft.tokenId,
            });
          }
        } catch (e) {
          // A failed allowance lookup should not block the order, but a real
          // shortfall and a failed approval must still propagate — without the
          // approval the order cannot fill at all.
          if (
            e instanceof Error &&
            (e.message.startsWith("Not enough shares") ||
              e.message.startsWith("Exchange approval failed"))
          ) {
            throw e;
          }
          console.warn("[useTradingAccount] conditional allowance check failed:", e);
        }
      }

      const submit = async () => {
        const order = await client.createOrder(
          {
            tokenID: draft.tokenId,
            price,
            side: draft.side === "BUY" ? Side.BUY : Side.SELL,
            size: shares,
          },
          { tickSize: draft.tickSize },
        );

        assertSignedByDepositWallet(order, walletAddress);

        await client.postOrder(order, OrderType.GTC, settings.postOnly, false);
      };

      try {
        await submit();
      } catch (e) {
        // The checks above run off polled state, so they miss an approval that
        // went missing since the last poll — or that was never granted, on a
        // wallet created before approvals were part of activation. Repair once
        // and resubmit rather than handing the user the raw rejection.
        if (!isMissingAllowanceError(e)) throw e;

        await repairApprovals(
          client,
          walletAddress,
          draft.side === "BUY"
            ? { asset_type: AssetType.COLLATERAL }
            : { asset_type: AssetType.CONDITIONAL, token_id: draft.tokenId },
        );
        await submit();
      }

      refresh();
    },
    [
      allowanceUsd,
      balanceUsd,
      refresh,
      repairApprovals,
      requireClient,
      settings.postOnly,
    ],
  );

  const closePosition = useCallback(
    async (tokenId: string, shares: number, tickSize?: TickSize) => {
      const { client, walletAddress } = requireClient();

      if (!Number.isFinite(shares) || shares <= 0) {
        throw new Error("Nothing to close.");
      }

      // The blotter lists positions from every market, not just the open ladder,
      // so the tick size usually has to be looked up rather than passed in.
      const resolvedTickSize = tickSize ?? (await client.getTickSize(tokenId));

      // Exiting must not be blocked by a missing approval, so this is not
      // wrapped in a catch the way the pre-order check is.
      await repairApprovals(client, walletAddress, {
        asset_type: AssetType.CONDITIONAL,
        token_id: tokenId,
      });

      // FAK, not FOK: a fast market's book is thin, and FOK would reject the whole
      // exit if it cannot fill at once. FAK takes what liquidity exists and drops
      // the rest, which is what you want when getting out.
      const order = await client.createMarketOrder(
        {
          tokenID: tokenId,
          amount: shares, // SELL market orders are denominated in shares
          side: Side.SELL,
          orderType: OrderType.FAK,
        },
        { tickSize: resolvedTickSize },
      );

      assertSignedByDepositWallet(order, walletAddress);

      await client.postOrder(order, OrderType.FAK, false, false);
      refresh();
    },
    [refresh, repairApprovals, requireClient],
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      const { client } = requireClient();
      await client.cancelOrder({ orderID: orderId });
      refresh();
    },
    [refresh, requireClient],
  );

  const cancelAllInMarket = useCallback(
    async (conditionId: string) => {
      const { client } = requireClient();

      if (conditionId) {
        await client.cancelMarketOrders({ market: conditionId });
      } else {
        await client.cancelAll();
      }

      refresh();
    },
    [refresh, requireClient],
  );

  return useMemo(
    () => ({
      depositWallet,
      ready,
      hydrating,
      activating,
      activationError,
      balanceUsd,
      allowanceUsd,
      positions,
      orders,
      fills,
      activate,
      placeOrder,
      closePosition,
      cancelOrder,
      cancelAllInMarket,
      refresh,
      setActiveMarket,
    }),
    [
      activate,
      activating,
      activationError,
      allowanceUsd,
      balanceUsd,
      cancelAllInMarket,
      cancelOrder,
      closePosition,
      depositWallet,
      fills,
      hydrating,
      orders,
      placeOrder,
      positions,
      ready,
      refresh,
    ],
  );
}
