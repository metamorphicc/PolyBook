"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import {
  mainnet,
  arbitrum,
  type AppKitNetwork,
  bsc,
  polygon,
} from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import "dotenv/config";
import { ReownAuthentication } from "@reown/appkit-siwx";
const queryClient = new QueryClient();

const networks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, polygon];

const projectId = "d86a9102e9f88948ac5d809a1a6e9cad";

const metadata = {
  name: "Polybook",
  description: "Polybook dApp",
  url: "http://localhost:3002",
};

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  features: {
    analytics: true,
  },
  siwx: new ReownAuthentication(),
});

export function AppKitProviderr({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
