"use client";

import { useAppKit, useDisconnect } from "@reown/appkit/react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { ethers } from "ethers";
import { USDC_E_ADDRESS, ERC20_ABI } from "../share/main";
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

  // Executing the withdraw batch hits the builder-signer endpoint, which now
  // requires a session — establish it before the relayer call.
  await ensureSiweSession(signer, await signer.getAddress());

  const relayClient = createDepositWalletRelayClient(signer);
  const response = await relayClient.executeDepositWalletBatch(
    calls,
    tradingWalletAddress,
    Math.floor(Date.now() / 1000 + 240).toString()
  );
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
    throw new Error("Trading wallet withdraw failed");
  }

  return result.transactionHash ?? response.transactionHash ?? response.hash;
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
