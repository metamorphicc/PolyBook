"use client";
import { SafeFactory } from "@safe-global/safe-core-sdk";
import EthersAdapter from "@safe-global/safe-ethers-lib";
import { useAppKit, useDisconnect } from "@reown/appkit/react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useConnectorClient } from "wagmi";
import { ethers } from "ethers";
import Safe from "@safe-global/protocol-kit";

type WithdrawParams = {
  provider: any;
  ownerAddress: string;
  safeAddress: string;
};

function useEthersSigner() {
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  useEffect(() => {
    const init = async () => {
      if (typeof window === "undefined") return;
      const anyWindow = window as any;

      if (!anyWindow.ethereum) {
        console.error("Нет window.ethereum");
        return;
      }

      const provider = new ethers.providers.Web3Provider(anyWindow.ethereum);
      const net = await provider.getNetwork();
      console.log(net.chainId);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      setSigner(signer);
    };

    init().catch(console.error);
  }, []);

  return signer;
}

export default function CustomConnect() {
  const [safeBalance, setSafeBalance] = useState<string>("0");
  const [usdcBalance, setUsdcBalance] = useState<string>("0.00");
  const [authDone, setAuthDone] = useState(false);
  const [safeAddress, setSafeAddress] = useState<any>();

  const signer = useEthersSigner();
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const withdrawAllUSDC = async ({
    provider,
    ownerAddress,
    safeAddress,
  }: WithdrawParams) => {
    if (!provider || !ownerAddress || !safeAddress) {
      alert("No provider / ownerAddress / safeAddress");
      return;
    }

    try {
      const web3Provider = new ethers.providers.Web3Provider(provider);
      const signer = web3Provider.getSigner(ownerAddress);

      const signerAddr = await signer.getAddress();
      console.log("Using signer:", signerAddr);

      const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
      const ERC20_ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function transfer(address to, uint256 amount) returns (bool)",
      ];

      const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
      const balanceRaw: ethers.BigNumber = await usdcContract.balanceOf(
        safeAddress
      );

      if (balanceRaw.isZero()) {
        alert("Safe does not have USDC");
        return;
      }

      const transferData = usdcContract.interface.encodeFunctionData(
        "transfer",
        [ownerAddress, balanceRaw]
      );

      const safeSdk = await Safe.init({
        provider,
        signer: ownerAddress,
        safeAddress,
      });

      const safeTransaction = await safeSdk.createTransaction({
        transactions: [
          {
            to: USDC_ADDRESS,
            value: "0",
            data: transferData,
          },
        ],
      });

      const execTxResponse = await safeSdk.executeTransaction(safeTransaction);

      console.log("TX hash:", execTxResponse.hash);

      alert("USDC from Safe was transfered!");
    } catch (e: any) {
      console.error("error Safe:", e);
    }
  };

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

      const USDC_E_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
      const ERC20_ABI = [
        "function balanceOf(address owner) view returns (uint256)",
      ];
      const usdcContract = new ethers.Contract(
        USDC_E_ADDRESS,
        ERC20_ABI,
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

  useEffect(() => {
    if (!isConnected || !address || !signer || authDone) return;

    const initAccount = async () => {
      try {
        const dbRes = await fetch("/api/getSafeWallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        });

        const dbData = await dbRes.json();
        const safeAddrFromDb = dbData.proxyAddress || dbData.safeAddress;

        if (safeAddrFromDb) {
          setSafeAddress(safeAddrFromDb);
          setAuthDone(true);
          await fetchSafeBalance(safeAddrFromDb);
        }
      } catch (e) {
        console.error("[INIT ERROR]:", e);
      }
    };

    initAccount();
  }, [isConnected, address, signer, authDone]);

  useEffect(() => {
    if (safeAddress && signer) {
      fetchSafeBalance(safeAddress);
    }
  }, [safeAddress, signer]);
  const conv = Math.floor(Number(safeBalance));
  return (
    <div className="w-full flex flex-col items-center gap-4 justify-center p-4 max-w-120">
      {address && isConnected ? (
        <>
          <div className="flex px-3 gap-4 border p-2 w-full flex-col rounded-xl bg-gray-50 shadow-sm font-mono w-max-100">
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
                      onClick={async () => {
                        if (
                          typeof window === "undefined" ||
                          !(window as any).ethereum
                        ) {
                          alert("Нет window.ethereum");
                          return;
                        }

                        const provider = (window as any).ethereum;

                        await provider.request({
                          method: "eth_requestAccounts",
                        });

                        await withdrawAllUSDC({
                          provider,
                          ownerAddress: address, 
                          safeAddress, 
                        });
                      }}
                      className="bg-sky-300/80 px-4 py-1.5 rounded-md text-sm hover:bg-sky-300 transition cursor-pointer"
                    >
                      WITHDRAW
                    </button>
                    <button className="px-4 py-1.5 rounded-md text-sm hover:bg-red-200 transition cursor-pointer border border-red-700">
                      Exit
                    </button>
                    <button
                      onClick={() => router.push("/profile")}
                      className="bg-sky-300/80 px-4 py-1.5 rounded-md text-sm hover:bg-sky-300 transition cursor-pointer"
                    >
                      profile
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
