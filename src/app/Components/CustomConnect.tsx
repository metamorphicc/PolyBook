"use client";

import Safe, { type Eip1193Provider } from "@safe-global/protocol-kit";
import { useAppKit, useDisconnect } from "@reown/appkit/react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { ethers } from "ethers";
import { USDC_E_ADDRESS, ERC20_ABI } from "../share/main";
import { deploySafeIfNeeded } from "../share/main";
import {
  RelayClient,
  RelayerTransactionState,
  RelayerTxType,
} from "@polymarket/builder-relayer-client";

const RELAYER_URL = "https://relayer-v2.polymarket.com";
const POLYGON_CHAIN_ID = 137;

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

const POLYGON_CHAIN_ID_HEX = "0x89";

async function ensurePolygonNetwork(ethereum: any) {
  const currentChainId = await ethereum.request({ method: "eth_chainId" });
  if (currentChainId === POLYGON_CHAIN_ID_HEX) return;

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: POLYGON_CHAIN_ID_HEX }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: POLYGON_CHAIN_ID_HEX,
            chainName: "Polygon Mainnet",
            rpcUrls: ["https://polygon-rpc.com/"],
            nativeCurrency: {
              name: "POL",
              symbol: "POL",
              decimals: 18,
            },
            blockExplorerUrls: ["https://polygonscan.com/"],
          },
        ],
      });
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: POLYGON_CHAIN_ID_HEX }],
      });
    } else {
      throw switchError;
    }
  }
}

export function useEthersSigner() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  return useMemo<ethers.providers.JsonRpcSigner | null>(() => {
    if (!isConnected || !walletClient || !address) return null;

    const provider = new ethers.providers.Web3Provider(walletClient as any);
    return provider.getSigner(address) as ethers.providers.JsonRpcSigner;
  }, [address, isConnected, walletClient]);
}

export async function withdrawAllUSDCFromSafe(
  signer: ethers.Signer,
  safeAddress: string
) {
  const ownerAddress = await signer.getAddress();
  const provider = signer.provider as ethers.providers.Web3Provider;
  if (!provider) throw new Error("No provider on signer");

  const ext = provider.provider as any;
  if (typeof ext.request !== "function") {
    throw new Error("Underlying provider is not EIP-1193 compatible");
  }
  const eip1193 = ext as Eip1193Provider;
  console.log(`сейф: `, safeAddress);
  const code = await provider.getCode(safeAddress);
  if (code === "0x") {
    throw new Error("Safe is not deployed on this network");
  }

  const usdcContract = new ethers.Contract(USDC_E_ADDRESS, ERC20_ABI, signer);
  const balanceRaw: ethers.BigNumber = await usdcContract.balanceOf(
    safeAddress
  );

  if (balanceRaw.isZero()) {
    throw new Error("Safe does not have USDC");
  }

  const transferData = usdcContract.interface.encodeFunctionData("transfer", [
    ownerAddress,
    balanceRaw,
  ]);

  const safeSdk = await Safe.init({
    provider: eip1193,
    signer: ownerAddress,
    safeAddress,
  });

  const safeTx = await safeSdk.createTransaction({
    transactions: [
      {
        to: USDC_E_ADDRESS,
        value: "0",
        data: transferData,
      },
    ],
  });

  const execTxResponse = await safeSdk.executeTransaction(safeTx);
  console.log("[WITHDRAW] tx:", execTxResponse.hash);

  return execTxResponse.hash;
}

export async function deploySafeWithRelayer(
  signer: ethers.providers.JsonRpcSigner
) {
  const relayClient = new RelayClient(
    RELAYER_URL,
    POLYGON_CHAIN_ID,
    signer,
    undefined,
    RelayerTxType.SAFE
  );

  const resp = await relayClient.deploy();

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

  return result.proxyAddress as string;
}

export default function CustomConnect() {
  const [safeBalance, setSafeBalance] = useState<string>("0");
  const [usdcBalance, setUsdcBalance] = useState<string>("0.00");
  const [safeAddress, setSafeAddress] = useState<string | null>(null);

  const signer = useEthersSigner();
  const { open } = useAppKit();

  const { address, isConnected } = useAppKitAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();

  async function handleRegisterSafe() {
    try {
      if (!signer || !address) {
        console.error("No signer or address");
        return;
      }

      const deployedSafeAddress = await deploySafeWithRelayer(signer);
      console.log("Deployed safe:", deployedSafeAddress);

      const res = await fetch("/api/user/safe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerAddress: address,
          safeAddress: deployedSafeAddress,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error("Failed to save safe:", data);
        throw new Error(data.error ?? "Failed to save safe");
      }

      setSafeAddress(deployedSafeAddress);
    } catch (e) {
      console.error("[handleRegisterSafe error]:", e);
    }
  }

  useEffect(() => {
    if (!signer || !address) return;

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
          await handleRegisterSafe();
          return;
        }
  
        console.log("[INIT] safeAddrFromDb:", safeAddrFromDb);
        setSafeAddress(safeAddrFromDb);
      } catch (e) {
        console.error("[initSafe error]:", e);
      }
    };

    initSafe().catch(console.error);
  }, [signer, address]);

  useEffect(() => {
    console.log("[EFFECT] safeAddress:", safeAddress, "signer:", !!signer);
    if (safeAddress && signer) {
      console.log("[EFFECT] calling fetchSafeBalance");
      fetchSafeBalance(safeAddress);
    }
  }, [safeAddress, signer]);

  const fetchSafeBalance = async (safeAddr: string) => {
    if (!signer || !signer.provider) return;

    try {
      const { chainId } = await signer.provider.getNetwork();
      console.log("🌐 [NETWORK CHECK] Chain ID:", chainId);

      if (chainId !== 137) {
        console.warn("Change your network: POL");
        return;
      }

      const polBalanceRaw = await signer.provider.getBalance(safeAddr);
      const polBalance = ethers.utils.formatEther(polBalanceRaw);
      console.log(`📡 [RESULT] POL для ${safeAddr}:`, polBalance);
      console.log("[RAW POL BALANCE]:", polBalanceRaw.toString());

      const usdcContract = new ethers.Contract(
        USDC_E_ADDRESS,
        ["function balanceOf(address owner) view returns (uint256)"],
        signer.provider
      );

      const usdcBalanceRaw = await usdcContract.balanceOf(safeAddr);
      const usdcBalanceValue = ethers.utils.formatUnits(usdcBalanceRaw, 6);

      setSafeBalance(parseFloat(polBalance).toFixed(4));
      setUsdcBalance(parseFloat(usdcBalanceValue).toFixed(2));
    } catch (e) {
      console.error("[FETCH ERROR]:", e);
    }
  };

  const conv = Number(safeBalance);

  return (
    <div className="w-full flex flex-col items-center gap-4 justify-center p-4 max-w-120">
      {address && isConnected ? (
        <>
          <div className="flex px-3 gap-4 border border-gray-200 p-2 w-full flex-col rounded-xl bg-gray-50 shadow-sm font-mono w-max-100">
            <ul className="flex items-center gap-8 justify-around w-full">
              <div className="flex w-full">
                <li className="flex flex-col items-center justify-center w-1/2 ">
                  <div className="flex flex-col  w-full items-center">
                    <span className="text-[10px] text-gray-400">POL</span>
                    <span
                      className={conv > 0 ? "text-blue-600" : "text-gray-400"}
                    >
                      {conv}
                    </span>
                  </div>
                </li>
                <li className="w-1/2 flex flex-col items-center ">
                  <div className="flex flex-col items-center border-l pl-4 border-gray-200 w-full justify-center">
                    <span className="text-[10px] text-gray-400">USDC.e</span>
                    <span
                      className={
                        parseFloat(usdcBalance) > 0
                          ? "text-green-600"
                          : "text-gray-400"
                      }
                    >
                      ${usdcBalance}
                    </span>
                  </div>
                </li>
              </div>
              <div>
                <li>
                  <div className="gap-3 flex">
                    
                    <button
                      disabled={!signer || !safeAddress}
                      onClick={async () => {
                        try {
                          if (!signer || !safeAddress) {
                            alert("No signer / safeAddress");
                            return;
                          }

                          if (
                            typeof window !== "undefined" &&
                            (window as any).ethereum
                          ) {
                            await ensurePolygonNetwork(
                              (window as any).ethereum
                            );
                          }

                          await deploySafeIfNeeded(signer, safeAddress);

                          const txHash = await withdrawAllUSDCFromSafe(
                            signer,
                            safeAddress
                          );
                          alert("Withdraw tx sent: " + txHash);
                        } catch (e: any) {
                          console.error("[WITHDRAW ERROR]:", e);
                          alert(e.message || "Withdraw error");
                        }
                      }}
                      className="bg-sky-300/80 px-4 py-1.5 rounded-md text-sm hover:bg-sky-300 transition cursor-pointer"
                    >
                      Withdraw
                    </button>
                   
                    <button
                      onClick={() => router.push("/profile")}
                      className="bg-sky-300/80 px-4 py-1.5 rounded-md text-sm hover:bg-sky-300 transition cursor-pointer"
                    >
                      Profile
                    </button>
                    <button
                      onClick={() => disconnect()}
                      className="px-4 py-1.5 rounded-md text-sm hover:bg-red-300 transition cursor-pointer border border-red-400"
                    >
                      Logout
                    </button>
                  </div>
                </li>
              </div>
            </ul>
          </div>
        </>
      ) : (
        <button
          onClick={() => open()}
          className="bg-sky-400 text-white px-6 py-2 rounded-full hover:bg-sky-500 transition"
        >
          Connect
        </button>
      )}
    </div>
  );
}
