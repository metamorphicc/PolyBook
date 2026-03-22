"use client";

import { useAppKit, useDisconnect } from "@reown/appkit/react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useConnectorClient } from "wagmi";
import { ethers } from "ethers";
import { useBalance } from "wagmi";
import { formatUnits } from "viem";
import { USDC_E_ADDRESS, ERC20_ABI } from "../share/main";
function useEthersSigner() {
  const { data: client } = useConnectorClient();
  return useMemo(() => {
    if (!client) return undefined;
    const { account, transport } = client;
    const provider = new ethers.providers.Web3Provider(transport as any);
    return provider.getSigner(account?.address);
  }, [client]);
}

export default function CustomConnect() {
  const [safeBalance, setSafeBalance] = useState<any>();
  const fetchSafeBalance = async (safeAddr: string) => {
    if (!signer) return;
    try {
      const contract = new ethers.Contract(
        USDC_E_ADDRESS,
        ERC20_ABI,
        signer.provider
      );
      const balance = await contract.balanceOf(safeAddr);
      const formatted = ethers.utils.formatUnits(balance, 6);
      setSafeBalance(formatted);
      console.log(
        `safe balance (${safeAddr.slice(0, 6)}): ${formatted} USDC.e`
      );
    } catch (e) {
      console.error("error with get balance", e);
    }
  };
  const signer = useEthersSigner();
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const router = useRouter();

  const [authDone, setAuthDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [safe, setSafe] = useState<any>();
  const [client, setClient] = useState<any>();
  const [safeAddress, setSafeAddress] = useState<any>();

  const { data: balance } = useBalance({
    address: safeAddress,
    query: { enabled: !!safeAddress },
  });

  const formattedBalance = balance?.value
    ? formatUnits(balance.value, balance.decimals)
    : "0.00";

  useEffect(() => {
    if (!isConnected || !address || !signer || authDone) return;

    const savedCreds = localStorage.getItem(`poly_creds_${address}`);
    if (savedCreds) {
      setAuthDone(true);
      return;
    }
    // const getSafe = async () => {
    //     const row = await fetch("/api/getSafeWallet", {
    //       method: "POST",
    //       headers: { "Content-Type": "application/json" },
    //       body: JSON.stringify({ address }),
    //     });
    //     const jsonRow = await row.json();
    //     setSafeAddress(jsonRow.safeAddress)
    //   }
    const initAccount = async () => {
      setLoading(true);
      try {
        const safeRes = await fetch("/api/user/safe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerAddress: address }),
        });

        const { proxyAddress } = await safeRes.json();
        const safeAddr = proxyAddress[0].safe_address;

        setSafe(safeAddr);
        setSafeAddress(safeAddr);

        const { initPolymarketClient } = await import("./verifyUser");
        const tradingClient = await initPolymarketClient(signer, safeAddr);
        setClient(tradingClient);

        localStorage.setItem(
          `poly_creds_${address}`,
          JSON.stringify({ safeAddr })
        );
        setAuthDone(true);
      } catch (e) {
        console.error("initAccount error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchSafeBalance(safeAddress)

    initAccount();
  }, [isConnected, address, authDone]);

  useEffect(() => {
    if (!address) {
      setAuthDone(false);
      setSafeAddress(undefined);
      setSafe(undefined);
      setClient(undefined);
    }
  }, [address]);

  return (
    <>
      {!address || !isConnected ? (
        <div className="w-full flex items-center justify-end">
          <button
            onClick={() => open({ view: "Connect" })}
            className="cursor-pointer px-4 bg-sky-300/70 rounded-full h-10 hover:bg-sky-300 transition"
          >
            Connect wallet
          </button>
        </div>
      ) : (
        <div className="w-full flex items-center gap-4 justify-end">
          <div className="flex px-3">
            <div className="flex items-center">
              <span className="flex items-center flex-col">
                Cash: <p className="ml-1 text-[14px]">{safeBalance || "0"}</p>
              </span>
            </div>
            <div>
              <span>In-trade: $0.00</span>
            </div>
          </div>

          <button
            onClick={() => router.push("/scalp")}
            className="border rounded-md px-4 w-[110px] py-1.5 bg-sky-300/70 transition border-sky-300/50 hover:bg-sky-300 cursor-pointer md:text-[13px] md:w-[90px] mr-9"
          >
            Scalping
          </button>

          <button
            className="border rounded-md px-4 w-[110px] py-1.5 bg-sky-300/70 transition border-sky-300/50 hover:bg-sky-300 cursor-pointer md:text-[13px] md:w-[90px]"
            onClick={() => router.push("/profile")}
          >
            Profile
          </button>

          <button
            onClick={() => disconnect()}
            className="border rounded-md px-4 w-[110px] py-1.5 bg-sky-300/70 transition border-sky-300/50 hover:bg-sky-300 cursor-pointer md:text-[13px] md:w-[90px] flex items-center justify-center"
          >
            Disconnect
          </button>
        </div>
      )}
    </>
  );
}
