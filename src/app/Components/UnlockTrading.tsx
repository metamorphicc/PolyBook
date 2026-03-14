"use client";

import { useState, useEffect } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { ClobClient } from "@polymarket/clob-client";
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
    if (!address) return alert("Please connect your wallet");
    if (!window.ethereum) return alert("Wallet provider not found in browser");

    setIsLoading(true);
    try {
      const POLYGON_CHAIN_ID = 137;

      if (chainId !== POLYGON_CHAIN_ID) {
        await switchChainAsync({ chainId: POLYGON_CHAIN_ID });
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();

      const signerAddress = await signer.getAddress();
      if (!signerAddress) throw new Error("Failed to get address from signer");

      console.log("Signer address:", signerAddress);

      const client = new ClobClient("https://clob.polymarket.com", POLYGON_CHAIN_ID, signer as any);
      const apiCreds = await client.createOrDeriveApiKey();

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
