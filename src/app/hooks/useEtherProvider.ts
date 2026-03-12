import { useMemo } from "react";
import { useWalletClient } from "wagmi";
import type { JsonRpcSigner } from "ethers";
import { walletClientToSigner } from "../Components/WagmiAdapter";

export function useEthersSigner(): JsonRpcSigner | undefined {
  const { data: walletClient } = useWalletClient(); 

  return useMemo(
    () => (walletClient ? walletClientToSigner(walletClient) : undefined),
    [walletClient]
  );
}