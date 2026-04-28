"use client";

import { useAccount, useWalletClient } from "wagmi";
import { useMemo } from "react";
import { ethers } from "ethers";

export function useEthersSigner() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  return useMemo(() => {
    if (!isConnected || !walletClient || !address) return null;

    const provider = new ethers.providers.Web3Provider(walletClient as any);
    return provider.getSigner(address);
  }, [address, isConnected, walletClient]);
}