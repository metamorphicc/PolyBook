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

  return useMemo(() => {
    if (!isConnected || !walletClient || !address) return null;

    const provider = new ethers.providers.Web3Provider(walletClient as any);
    return provider.getSigner(address);
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

export default function CustomConnect() {
  const [safeBalance, setSafeBalance] = useState<string>("0");
  const [usdcBalance, setUsdcBalance] = useState<string>("0.00");
  const [safeAddress, setSafeAddress] = useState<string | null>(null);

  const signer = useEthersSigner();

  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const router = useRouter();

  useEffect(() => {
    if (!signer || !address) return;

    const initSafe = async () => {
      const res = await fetch("/api/getSafeWallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      let safeAddrFromDb = data.proxyAddress || data.safeAddress;

      if (!safeAddrFromDb) {
        const createRes = await fetch("/api/user/safe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerAddress: address }),
        });
        const createData = await createRes.json();
        console.log(`${JSON.stringify(createData)} createadsa`);
        safeAddrFromDb = createData.predictedSafeAddress;
      }

      console.log("[INIT] safeAddrFromDb:", safeAddrFromDb);
      console.log("type", typeof safeAddrFromDb);

      if (safeAddrFromDb) setSafeAddress(safeAddrFromDb);
    };

    initSafe().catch(console.error);
  }, [signer, address]);

  useEffect(() => {
    if (safeAddress && signer) {
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
      }

      const polBalanceRaw = await signer.provider.getBalance(safeAddr);
      const polBalance = ethers.utils.formatEther(polBalanceRaw);
      console.log(`📡 [RESULT] POL для ${safeAddr}:`, polBalance);

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

  const conv = Math.floor(Number(safeBalance));

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
                      onClick={() => router.push("/scalp")}
                      className="bg-sky-300/80 px-4 py-1.5 rounded-md text-sm hover:bg-sky-300 transition cursor-pointer"
                    >
                      Scalp
                    </button>
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
