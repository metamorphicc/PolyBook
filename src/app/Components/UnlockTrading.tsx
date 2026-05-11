"use client";

import { useState, useEffect } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { ClobClient, type ApiKeyCreds } from "@polymarket/clob-client-v2";
import { ethers } from "ethers";

export default function UnlockTrading({ children }: { children: React.ReactNode }) {
  const { isConnected, address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const [hasKeys, setHasKeys] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const keys = localStorage.getItem("poly_creds");
    if (keys) setHasKeys(true);
  }, []);

  const handleUnlock = async () => {
    if (!address) {
      alert("Please connect your wallet");
      return;
    }
    if (!(window as any).ethereum) {
      alert("Wallet provider not found in browser");
      return;
    }

    setIsLoading(true);
    try {
      const POLYGON_CHAIN_ID = 137;

      if (chainId !== POLYGON_CHAIN_ID) {
        await switchChainAsync({ chainId: POLYGON_CHAIN_ID });
      }

      const provider = new ethers.providers.Web3Provider(
        (window as any).ethereum,
      );
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();

      const signerAddress = await signer.getAddress();
      if (!signerAddress) throw new Error("Failed to get address from signer");

      console.log("Signer address:", signerAddress);

      // v2: объектный конструктор
      const tempClient = new ClobClient({
        host: "https://clob.polymarket.com",
        chain: POLYGON_CHAIN_ID,
        signer,
      });

      let apiCreds: ApiKeyCreds;
      if (typeof (tempClient as any).createOrDeriveApiKey === "function") {
        apiCreds = await (tempClient as any).createOrDeriveApiKey();
      } else {
        apiCreds = await (tempClient as any).createApiKey();
      }

      console.log("Keys generated:", apiCreds);

      localStorage.setItem("poly_creds", JSON.stringify(apiCreds));
      setHasKeys(true);
    } catch (error) {
      console.error("Error generating keys:", error);
      alert("Signature cancelled or an error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) return null;

  if (!hasKeys) {
    return (
      <div className="flex flex-col items-center justify-center p-6 border rounded-xl bg-gray-50/10">
        <h3 className="text-lg font-bold mb-2">Unlock Trading</h3>
        <p className="text-sm text-gray-500 mb-4 text-center">
          Sign a session key to trade gasless with one click.
        </p>
        <button
          onClick={handleUnlock}
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? "Processing..." : "Sign (Gasless)"}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}