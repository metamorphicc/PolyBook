"use client";

import { useAppKit, useDisconnect } from "@reown/appkit/react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { ethers } from "ethers";
import { getContractConfig } from "@polymarket/clob-client-v2";
import {
  CONDITIONAL_TOKENS_ABI,
  USDC_E_ADDRESS,
  ERC20_ABI,
} from "../share/main";
import {
  type DepositWalletCall,
  RelayClient,
  RelayerTransactionState,
} from "@polymarket/builder-relayer-client";
import {
  BuilderConfig,
} from "@polymarket/builder-signing-sdk";
import { useModal } from "./Modal";
import { WithdrawContent } from "./WithdrawContent";
import { clearSiweSession, ensureSiweSession } from "../lib/auth/client";

const RELAYER_URL = "https://relayer-v2.polymarket.com";
const POLYGON_CHAIN_ID = 137;
const PUSD_ADDRESS = "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB";
const WITHDRAW_TOKENS = [
  { symbol: "pUSD", address: PUSD_ADDRESS },
  { symbol: "USDC.e", address: USDC_E_ADDRESS },
];

/**
 * Re-approve when the collateral allowance is below this.
 *
 * Approvals are set to the maximum, so a reading this low means one was never
 * granted (or was revoked) rather than that it has been spent down.
 */
const MIN_COLLATERAL_ALLOWANCE = ethers.utils.parseUnits("1000000", 6);

/**
 * How long a relayer batch signature stays valid.
 *
 * The relayer rejects short windows with `deadline too soon` — four minutes was
 * not enough. Replay protection comes from the wallet nonce inside the signed
 * payload, not from this window, so a generous value costs nothing: the batch
 * executes exactly once either way.
 */
const BATCH_DEADLINE_SECONDS = 3600;

/**
 * A batch deadline anchored to chain time instead of the browser clock.
 *
 * The deadline is checked against `block.timestamp`, so a machine running a few
 * minutes behind would sign one the relayer reads as already expired — the same
 * `deadline too soon` rejection, but for a reason no larger window would fix.
 */
async function batchDeadline(provider: ethers.providers.Provider) {
  let now = Math.floor(Date.now() / 1000);

  try {
    const block = await provider.getBlock("latest");
    if (block?.timestamp) now = block.timestamp;
  } catch (e) {
    console.warn("[relayer] chain time unavailable, using local clock:", e);
  }

  return (now + BATCH_DEADLINE_SECONDS).toString();
}

export async function checkContractDeployed(
  signer: ethers.Signer,
  addr: string
) {
  const provider = signer.provider!;
  const network = await provider.getNetwork();
  const code = await provider.getCode(addr);

  const isDeployed = code !== "0x";

  console.log("[CHECK] chainId:", network.chainId);
  console.log("[CHECK] code length:", code.length);
  console.log("[CHECK] isDeployed:", isDeployed);

  return { chainId: network.chainId, isDeployed };
}

export function useEthersSigner() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  return useMemo<ethers.providers.JsonRpcSigner | null>(() => {
    if (!isConnected || !walletClient || !address) return null;

    const provider = new ethers.providers.Web3Provider(
      walletClient as unknown as ethers.providers.ExternalProvider
    );
    return provider.getSigner(address) as ethers.providers.JsonRpcSigner;
  }, [address, isConnected, walletClient]);
}

function createDepositWalletRelayClient(signer: ethers.providers.JsonRpcSigner) {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL;
  const builderConfig = new BuilderConfig({
    remoteBuilderConfig: {
      url: `${origin}/api/polymarket-builder-sign`,
    },
  });

  return new RelayClient(
    RELAYER_URL,
    POLYGON_CHAIN_ID,
    signer,
    builderConfig
  );
}

/**
 * Pulls the relayer's own message out of the JSON blob its client throws.
 *
 * `HttpClient` stringifies the entire axios response into `Error.message`, so the
 * one useful phrase — `deadline too soon` — arrives buried in headers and request
 * config. Falls back to the raw text when the shape is unfamiliar.
 */
function relayerErrorMessage(e: unknown) {
  const raw = e instanceof Error ? e.message : String(e);

  try {
    const parsed = JSON.parse(raw) as {
      data?: { error?: unknown };
      error?: unknown;
    };
    const detail = parsed.data?.error ?? parsed.error;

    if (typeof detail === "string" && detail.length > 0) return detail;
  } catch {
    // Not the relayer's JSON envelope; the raw text is the best available.
  }

  return raw;
}

/**
 * Runs a batch of calls *as* the trading wallet, via the relayer.
 *
 * The trading wallet is a contract wallet with no gas of its own, so anything it
 * needs to do on-chain — moving tokens out, approving the exchange — is submitted
 * here and paid for by the relayer. Hitting the builder-signer endpoint requires
 * a session, so one is established first.
 */
async function runDepositWalletBatch(
  signer: ethers.providers.JsonRpcSigner,
  tradingWalletAddress: string,
  calls: DepositWalletCall[],
  failureMessage: string,
) {
  const provider = signer.provider;
  if (!provider) throw new Error("No provider on signer");

  await ensureSiweSession(signer, await signer.getAddress());

  const relayClient = createDepositWalletRelayClient(signer);
  let response;

  try {
    response = await relayClient.executeDepositWalletBatch(
      calls,
      tradingWalletAddress,
      await batchDeadline(provider)
    );
  } catch (e) {
    throw new Error(`${failureMessage} Relayer: ${relayerErrorMessage(e)}`);
  }

  const result = await relayClient.pollUntilState(
    response.transactionID,
    [
      RelayerTransactionState.STATE_MINED,
      RelayerTransactionState.STATE_CONFIRMED,
      RelayerTransactionState.STATE_EXECUTED,
      RelayerTransactionState.STATE_FAILED,
    ],
    RelayerTransactionState.STATE_FAILED,
    60,
    3000
  );

  if (!result || result.state === RelayerTransactionState.STATE_FAILED) {
    throw new Error(failureMessage);
  }

  return result.transactionHash ?? response.transactionHash ?? response.hash;
}

/**
 * Approves the Polymarket exchange to move the trading wallet's funds.
 *
 * This is *not* what `ClobClient.updateBalanceAllowance` does — that only asks the
 * CLOB to re-read the chain. The approval itself has to be sent by the trading
 * wallet, so it goes through the relayer. Without it every order is rejected with
 * `the allowance is not enough -> allowance: 0`, which is the error the exchange
 * returns after the order has already been signed.
 *
 * Reads the current state first and returns false when nothing was missing, so
 * this is cheap enough to call before an order as well as during setup.
 */
export async function ensureExchangeApprovals(
  signer: ethers.providers.JsonRpcSigner,
  tradingWalletAddress: string
) {
  const provider = signer.provider;
  if (!provider) throw new Error("No provider on signer");

  const code = await provider.getCode(tradingWalletAddress);
  if (code === "0x") {
    throw new Error(
      "Trading wallet is not deployed on Polygon yet. Create it before approving."
    );
  }

  const contracts = getContractConfig(POLYGON_CHAIN_ID);
  // The deposit-wallet flow settles on the V2 exchanges; `exchangeV2` is the
  // spender the CLOB names when it rejects an order for a missing allowance.
  const spenders = [contracts.exchangeV2, contracts.negRiskExchangeV2];

  const collateral = new ethers.Contract(
    contracts.collateral,
    ERC20_ABI,
    provider
  );
  const conditional = new ethers.Contract(
    contracts.conditionalTokens,
    CONDITIONAL_TOKENS_ABI,
    provider
  );

  const calls: DepositWalletCall[] = [];

  for (const spender of spenders) {
    // Collateral for buying, outcome shares for selling. Both are needed: a
    // wallet that can only buy cannot get out of a position.
    const allowance: ethers.BigNumber = await collateral.allowance(
      tradingWalletAddress,
      spender
    );

    if (allowance.lt(MIN_COLLATERAL_ALLOWANCE)) {
      calls.push({
        target: contracts.collateral,
        value: "0",
        data: collateral.interface.encodeFunctionData("approve", [
          spender,
          ethers.constants.MaxUint256,
        ]),
      });
    }

    const approvedForAll: boolean = await conditional.isApprovedForAll(
      tradingWalletAddress,
      spender
    );

    if (!approvedForAll) {
      calls.push({
        target: contracts.conditionalTokens,
        value: "0",
        data: conditional.interface.encodeFunctionData("setApprovalForAll", [
          spender,
          true,
        ]),
      });
    }
  }

  if (calls.length === 0) return false;

  await runDepositWalletBatch(
    signer,
    tradingWalletAddress,
    calls,
    "Exchange approval failed. Trading stays disabled until it succeeds."
  );

  return true;
}

export async function withdrawAllStablecoinsFromTradingWallet(
  signer: ethers.providers.JsonRpcSigner,
  tradingWalletAddress: string,
  destinationAddress: string
) {
  const provider = signer.provider;
  if (!provider) throw new Error("No provider on signer");
  if (!ethers.utils.isAddress(destinationAddress)) {
    throw new Error("Invalid destination address");
  }

  console.log(
    "[WITHDRAW] trading wallet:",
    tradingWalletAddress,
    "destination:",
    destinationAddress
  );
  const code = await provider.getCode(tradingWalletAddress);
  if (code === "0x") {
    throw new Error(
      "Trading wallet is not deployed on Polygon yet. Withdraw is available after the wallet exists on-chain."
    );
  }

  const calls: DepositWalletCall[] = [];

  for (const token of WITHDRAW_TOKENS) {
    const contract = new ethers.Contract(token.address, ERC20_ABI, signer);
    const balanceRaw: ethers.BigNumber =
      await contract.balanceOf(tradingWalletAddress);

    if (balanceRaw.isZero()) continue;

    calls.push({
      target: token.address,
      value: "0",
      data: contract.interface.encodeFunctionData("transfer", [
        destinationAddress,
        balanceRaw,
      ]),
    });
  }

  if (calls.length === 0) {
    throw new Error("Trading wallet does not have pUSD or USDC.e");
  }

  return runDepositWalletBatch(
    signer,
    tradingWalletAddress,
    calls,
    "Trading wallet withdraw failed"
  );
}

export async function ensureDepositWalletWithRelayer(
  signer: ethers.providers.JsonRpcSigner
) {
  // Deploying the deposit wallet hits the builder-signer endpoint, which now
  // requires a session — establish it up front so the relayer call is authed.
  await ensureSiweSession(signer, await signer.getAddress());

  const relayClient = createDepositWalletRelayClient(signer);

  const walletAddress = await relayClient.deriveDepositWalletAddress();
  const deployed = await relayClient.getDeployed(walletAddress, "WALLET");

  if (deployed) {
    return walletAddress;
  }

  const response = await relayClient.deployDepositWallet();
  const result = await relayClient.pollUntilState(
    response.transactionID,
    [
      RelayerTransactionState.STATE_MINED,
      RelayerTransactionState.STATE_CONFIRMED,
      RelayerTransactionState.STATE_EXECUTED,
      RelayerTransactionState.STATE_FAILED,
    ],
    RelayerTransactionState.STATE_FAILED,
    60,
    3000
  );

  if (!result || result.state === RelayerTransactionState.STATE_FAILED) {
    throw new Error("Deposit wallet deployment failed");
  }

  return walletAddress;
}

export async function deriveDepositWalletAddressWithRelayer(
  signer: ethers.providers.JsonRpcSigner
) {
  const relayClient = createDepositWalletRelayClient(signer);

  return relayClient.deriveDepositWalletAddress();
}

/**
 * Reads a wallet's pUSD balance straight from the token contract.
 *
 * The onboarding flow needs this before the CLOB client exists — the client's
 * own balance endpoint only works once trading has been enabled, which is the
 * step *after* funding.
 */
export async function readPusdBalance(
  provider: ethers.providers.Provider,
  walletAddress: string
) {
  const contract = new ethers.Contract(PUSD_ADDRESS, ERC20_ABI, provider);
  const raw = await contract.balanceOf(walletAddress);

  return Number(ethers.utils.formatUnits(raw, 6));
}

export async function saveDepositWalletAddress(
  signer: ethers.Signer,
  ownerAddress: string,
  depositWalletAddress: string
) {
  await ensureSiweSession(signer, ownerAddress);

  const res = await fetch("/api/user/trading-wallet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      depositWalletAddress,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to save deposit wallet");
  }
}

type CustomConnectProps = {
  onTradingWalletAddress?: (depositWalletAddress: string | null) => void;
};

export default function CustomConnect({
  onTradingWalletAddress,
}: CustomConnectProps) {
  const [polBalance, setPolBalance] = useState<string>("0");
  const [usdcBalance, setUsdcBalance] = useState<string>("0.00");
  const [tradingWalletAddress, setTradingWalletAddress] = useState<string | null>(
    null
  );

  const signer = useEthersSigner();
  const { open } = useAppKit();
  const { openModal, closeModal } = useModal();

  const { address, isConnected } = useAppKitAccount();
  const { disconnect } = useDisconnect();

  const fetchTradingWalletBalance = useCallback(
    async (walletAddress: string) => {
      if (!signer || !signer.provider) {
        console.warn("[BALANCE] No signer or provider");
        return;
      }

      try {
        const provider = signer.provider;
        const { chainId } = await provider.getNetwork();
        console.log("[NETWORK CHECK] Chain ID:", chainId);

        if (chainId !== POLYGON_CHAIN_ID) {
          console.warn("[BALANCE] Wrong network, expected Polygon (137)");
          return;
        }

        const polBalanceRaw = await provider.getBalance(walletAddress);
        const formattedPolBalance = ethers.utils.formatEther(polBalanceRaw);
        console.log(`[RESULT] POL for ${walletAddress}:`, formattedPolBalance);

        const pusdContract = new ethers.Contract(
          PUSD_ADDRESS,
          ["function balanceOf(address owner) view returns (uint256)"],
          signer.provider
        );

        const pusdBalanceRaw = await pusdContract.balanceOf(walletAddress);
        const pusdBalanceValue = ethers.utils.formatUnits(pusdBalanceRaw, 6);

        console.log(`[RESULT] pUSD for ${walletAddress}:`, pusdBalanceValue);

        setPolBalance(parseFloat(formattedPolBalance).toFixed(4));
        setUsdcBalance(parseFloat(pusdBalanceValue).toFixed(2));
      } catch (e) {
        console.error("[FETCH ERROR]:", e);
      }
    },
    [signer]
  );

  useEffect(() => {
    if (!isConnected || !address) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTradingWalletAddress(null);
      onTradingWalletAddress?.(null);
      return;
    }

    const initTradingWallet = async () => {
      try {
        if (signer) {
          const depositWalletAddress =
            await deriveDepositWalletAddressWithRelayer(signer);
          setTradingWalletAddress(depositWalletAddress);
          onTradingWalletAddress?.(depositWalletAddress);
          window.dispatchEvent(
            new CustomEvent("polybook:trading-wallet-updated", {
              detail: { tradingWalletAddress: depositWalletAddress },
            }),
          );
          saveDepositWalletAddress(signer, address, depositWalletAddress).catch((e) =>
            console.warn("[trading wallet save skipped]:", e),
          );
        }
      } catch (e) {
        console.error("[initTradingWallet error]:", e);
      }
    };

    initTradingWallet().catch(console.error);
  }, [isConnected, address, onTradingWalletAddress, signer]);

  useEffect(() => {
    console.log("[EFFECT] tradingWalletAddress:", tradingWalletAddress, "signer:", !!signer);
    if (!tradingWalletAddress || !signer) return;

    console.log("[EFFECT] calling fetchTradingWalletBalance for", tradingWalletAddress);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTradingWalletBalance(tradingWalletAddress).catch((e) =>
      console.error("[fetchTradingWalletBalance error]:", e)
    );
  }, [tradingWalletAddress, signer, fetchTradingWalletBalance]);

  const conv = Number(polBalance);

  const openWithdrawModal = () => {
    if (!signer || !tradingWalletAddress) {
      alert("No signer / trading wallet");
      return;
    }

    openModal(
      <WithdrawContent
        walletAddress={tradingWalletAddress}
        closeModal={closeModal}
        onSend={async (destinationAddress) => {
          const network = await signer.provider.getNetwork();
          if (network.chainId !== POLYGON_CHAIN_ID) {
            throw new Error("Switch your wallet to Polygon before withdrawing.");
          }

          const connectedOwner = await signer.getAddress();
          if (
            address &&
            connectedOwner.toLowerCase() !== address.toLowerCase()
          ) {
            throw new Error("Connected wallet changed. Reconnect your wallet.");
          }

          const txHash = await withdrawAllStablecoinsFromTradingWallet(
            signer,
            tradingWalletAddress,
            destinationAddress
          );
          await fetchTradingWalletBalance(tradingWalletAddress);
          return txHash;
        }}
      />
    );
  };

  return (
    <div className="flex items-center justify-end">
      {address && isConnected ? (
        <div className="flex items-center gap-3 font-mono">
          <div className="hidden items-center gap-3 border theme-border bg-[var(--surface-muted)] px-3 py-2 sm:flex">
            <div className="flex flex-col">
              <span className="text-[10px] theme-muted">POL</span>
              <span className={conv > 0 ? "text-sky-500" : "theme-muted"}>
                {conv}
              </span>
            </div>
            <div className="h-7 w-px bg-[var(--border)]" />
            <div className="flex flex-col">
              <span className="text-[10px] theme-muted">pUsd</span>
              <span
                className={
                  parseFloat(usdcBalance) > 0
                    ? "text-green-400"
                    : "text-zinc-500"
                }
              >
                ${usdcBalance}
              </span>
            </div>
          </div>

          <button
            disabled={!signer || !tradingWalletAddress}
            onClick={openWithdrawModal}
            className="hidden border theme-border px-3 py-2 text-sm theme-muted transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent md:block"
          >
            Withdraw
          </button>

          <button
            onClick={() => {
              clearSiweSession().catch(() => {});
              disconnect();
            }}
            className="border border-red-500/60 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
          >
            Logout
          </button>
        </div>
      ) : (
        <button
          onClick={() => open()}
          className="border border-sky-500/70 px-4 py-2 text-sm text-sky-500 transition hover:bg-sky-500/10"
        >
          Connect
        </button>
      )}
    </div>
  );
}
