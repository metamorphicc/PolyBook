"use client";

import { useState, useEffect } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { ClobClient } from "@polymarket/clob-client";
import { BrowserProvider } from "ethers";

export default function UnlockTrading({ children }: { children: React.ReactNode }) {
  const { isConnected, address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  
  const [hasKeys, setHasKeys] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const keys = localStorage.getItem("poly_creds");
      if (keys) setHasKeys(true);
    }
  }, []);

  const handleUnlock = async () => {
    if (!address) return alert("Please connect your wallet");

    if (typeof window === "undefined" || !window.ethereum) {
      return alert("Wallet provider not found in browser");
    }

    setIsLoading(true);
    try {
      const POLYGON_CHAIN_ID = 137;

      if (chainId !== POLYGON_CHAIN_ID) {
        console.log("Switching network to Polygon...");
        await switchChainAsync({ chainId: POLYGON_CHAIN_ID });
      }

      console.log("Initializing Ethers provider from window.ethereum...");
      
      const provider = new BrowserProvider(window.ethereum as any);
      
      const signer = await provider.getSigner();

      const signerAddress = await signer.getAddress();
      console.log("Signer address from ethers:", signerAddress);
      
      if (!signerAddress) {
         throw new Error("Failed to get address from ethers signer");
      }

      const HOST = "https://clob.polymarket.com";
      const tempClient = new ClobClient(HOST, POLYGON_CHAIN_ID, signer as any);

      console.log("Waiting for MetaMask signature...");


      const apiCreds = await tempClient.createOrDeriveApiKey();

      console.log("Keys generated successfully!", apiCreds);

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
