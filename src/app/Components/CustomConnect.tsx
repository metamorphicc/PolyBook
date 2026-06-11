"use client";

import Safe, { type Eip1193Provider } from "@safe-global/protocol-kit";
import { useAppKit, useDisconnect } from "@reown/appkit/react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { ethers } from "ethers";
import { USDC_E_ADDRESS, ERC20_ABI } from "../share/main";
import {
  deriveSafe,
  RelayClient,
  RelayerTransactionState,
  RelayerTxType,
} from "@polymarket/builder-relayer-client";
import {
  BuilderConfig,
} from "@polymarket/builder-signing-sdk";
import { useModal } from "./Modal";
import { WithdrawContent } from "./WithdrawContent";

const RELAYER_URL = "https://relayer-v2.polymarket.com";
const POLYGON_CHAIN_ID = 137;
const PUSD_ADDRESS = "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB";
const SAFE_FACTORY_ADDRESS = "0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b";
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

export async function withdrawAllUSDCFromSafe(
  signer: ethers.Signer,
  safeAddress: string,
  destinationAddress: string
) {
  const ownerAddress = await signer.getAddress();
  const provider = signer.provider as ethers.providers.Web3Provider;
  if (!provider) throw new Error("No provider on signer");
  if (!ethers.utils.isAddress(destinationAddress)) {
    throw new Error("Invalid destination address");
  }

  const ext = provider.provider as unknown;
  if (
    typeof ext !== "object" ||
    ext === null ||
    !("request" in ext) ||
    typeof ext.request !== "function"
  ) {
    throw new Error("Underlying provider is not EIP-1193 compatible");
  }
  const eip1193 = ext as Eip1193Provider;

  console.log("[WITHDRAW] safe:", safeAddress, "destination:", destinationAddress);
  const code = await provider.getCode(safeAddress);
  if (code === "0x") {
    throw new Error(
      "This Safe address is predicted but not deployed on Polygon yet. Withdraw is available only after the Safe exists on-chain."
    );
  }

  const transactions = [];

  for (const token of WITHDRAW_TOKENS) {
    const contract = new ethers.Contract(token.address, ERC20_ABI, signer);
    const balanceRaw: ethers.BigNumber = await contract.balanceOf(safeAddress);

    if (balanceRaw.isZero()) continue;

    transactions.push({
      to: token.address,
      value: "0",
      data: contract.interface.encodeFunctionData("transfer", [
        destinationAddress,
        balanceRaw,
      ]),
    });
  }

  if (transactions.length === 0) {
    throw new Error("Safe does not have pUSD or USDC.e");
  }

  const safeSdk = await Safe.init({
    provider: eip1193,
    signer: ownerAddress,
    safeAddress,
  });

  const safeTx = await safeSdk.createTransaction({
    transactions,
  });

  const execTxResponse = await safeSdk.executeTransaction(safeTx);
  console.log("[WITHDRAW] tx:", execTxResponse.hash);

  return execTxResponse.hash;
}

export async function deploySafeWithRelayer(
  signer: ethers.providers.JsonRpcSigner
) {
  const ownerAddress = await signer.getAddress();
  const expectedSafeAddress = deriveSafe(ownerAddress, SAFE_FACTORY_ADDRESS);
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL;
  const builderConfig = new BuilderConfig({
    remoteBuilderConfig: {
      url: `${origin}/api/polymarket-builder-sign`,
    },
  });

  const relayClient = new RelayClient(
    RELAYER_URL,
    POLYGON_CHAIN_ID,
    signer,
    builderConfig,
    RelayerTxType.SAFE
  );

  const deployed = await relayClient.getDeployed(expectedSafeAddress);
  if (deployed) {
    return expectedSafeAddress;
  }

  let resp;
  try {
    resp = await relayClient.deploy();
  } catch (error) {
    if (error instanceof Error && error.message.includes("safe already deployed")) {
      return expectedSafeAddress;
    }

    throw error;
  }

  const result = await relayClient.pollUntilState(
    resp.transactionID,
    [
      RelayerTransactionState.STATE_MINED,
      RelayerTransactionState.STATE_CONFIRMED,
      RelayerTransactionState.STATE_FAILED,
    ],
    RelayerTransactionState.STATE_FAILED,
    60,
    3000
  );

  if (!result || result.state === RelayerTransactionState.STATE_FAILED) {
    throw new Error("Safe deployment failed");
  }

  return (result.proxyAddress as string | undefined) ?? expectedSafeAddress;
}

export async function ensureDepositWalletWithRelayer(
  signer: ethers.providers.JsonRpcSigner
) {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL;
  const builderConfig = new BuilderConfig({
    remoteBuilderConfig: {
      url: `${origin}/api/polymarket-builder-sign`,
    },
  });

  const relayClient = new RelayClient(
    RELAYER_URL,
    POLYGON_CHAIN_ID,
    signer,
    builderConfig
  );

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

export function deriveSafeAddress(ownerAddress: string) {
  return deriveSafe(ownerAddress, SAFE_FACTORY_ADDRESS);
}

async function saveSafeAddress(ownerAddress: string, safeAddress: string) {
  const res = await fetch("/api/user/safe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ownerAddress,
      safeAddress,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to save safe");
  }
}

type CustomConnectProps = {
  onSafeAddress?: (safeAddress: string | null) => void;
};

export default function CustomConnect({ onSafeAddress }: CustomConnectProps) {
  const [safeBalance, setSafeBalance] = useState<string>("0");
  const [usdcBalance, setUsdcBalance] = useState<string>("0.00");
  const [safeAddress, setSafeAddress] = useState<string | null>(null);

  const signer = useEthersSigner();
  const { open } = useAppKit();
  const { openModal, closeModal } = useModal();

  const { address, isConnected } = useAppKitAccount();
  const { disconnect } = useDisconnect();

  const fetchSafeBalance = useCallback(
    async (safeAddr: string) => {
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

        const polBalanceRaw = await provider.getBalance(safeAddr);
        const polBalance = ethers.utils.formatEther(polBalanceRaw);
        console.log(`[RESULT] POL for ${safeAddr}:`, polBalance);

        const pusdContract = new ethers.Contract(
          PUSD_ADDRESS,
          ["function balanceOf(address owner) view returns (uint256)"],
          signer.provider
        );

        const pusdBalanceRaw = await pusdContract.balanceOf(safeAddr);
        const pusdBalanceValue = ethers.utils.formatUnits(pusdBalanceRaw, 6);

        console.log(`[RESULT] USDC.e for ${safeAddr}:`, pusdBalanceValue);

        setSafeBalance(parseFloat(polBalance).toFixed(4));
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
      setSafeAddress(null);
      onSafeAddress?.(null);
      return;
    }

    const initSafe = async () => {
      try {
        const res = await fetch(`/api/user/safe?address=${address}`);

        if (!res.ok) {
          console.error("GET /api/user/safe failed:", res.status);
        }

        let safeAddrFromDb: string | null = null;

        try {
          const text = await res.text();
          if (text) {
            const data = JSON.parse(text);
            safeAddrFromDb = (data.safeAddress as string) ?? null;
          }
        } catch (e) {
          console.error("Failed to parse /api/user/safe JSON:", e);
        }

        if (!safeAddrFromDb) {
          const expectedSafeAddress = deriveSafeAddress(address);
          await saveSafeAddress(address, expectedSafeAddress);
          safeAddrFromDb = expectedSafeAddress;
        }

        console.log("[INIT] safeAddrFromDb:", safeAddrFromDb);
        setSafeAddress(safeAddrFromDb);
        onSafeAddress?.(safeAddrFromDb);
      } catch (e) {
        console.error("[initSafe error]:", e);
      }
    };

    initSafe().catch(console.error);
  }, [isConnected, address, onSafeAddress]);

  useEffect(() => {
    console.log("[EFFECT] safeAddress:", safeAddress, "signer:", !!signer);
    if (!safeAddress || !signer) return;

    console.log("[EFFECT] calling fetchSafeBalance for", safeAddress);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSafeBalance(safeAddress).catch((e) =>
      console.error("[fetchSafeBalance error]:", e)
    );
  }, [safeAddress, signer, fetchSafeBalance]);

  const conv = Number(safeBalance);

  const openWithdrawModal = () => {
    if (!signer || !safeAddress) {
      alert("No signer / safeAddress");
      return;
    }

    openModal(
      <WithdrawContent
        safeAddress={safeAddress}
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

          const txHash = await withdrawAllUSDCFromSafe(
            signer,
            safeAddress,
            destinationAddress
          );
          await fetchSafeBalance(safeAddress);
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
            disabled={!signer || !safeAddress}
            onClick={openWithdrawModal}
            className="hidden border theme-border px-3 py-2 text-sm theme-muted transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent md:block"
          >
            Withdraw
          </button>

          <button
            onClick={() => disconnect()}
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
