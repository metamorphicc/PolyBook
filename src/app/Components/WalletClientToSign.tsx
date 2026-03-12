"use client";
import { useMemo } from "react";
import { useWalletClient } from "wagmi";
import { BrowserProvider, JsonRpcSigner } from "ethers";
import type { WalletClient } from "viem";

function walletClientToSigner(walletClient: WalletClient): JsonRpcSigner {
  const { account, chain, transport } = walletClient;
  const network = {
    chainId: chain?.id,
    name: chain?.name,
  };
  const provider = new BrowserProvider(transport as any, network);
  const signer = new JsonRpcSigner(provider, account?.address || "0x0");
  return signer;
}

export function useEthersSigner() {
  const { data: walletClient } = useWalletClient();
  return useMemo(
    () => (walletClient ? walletClientToSigner(walletClient) : undefined),
    [walletClient]
  );
}