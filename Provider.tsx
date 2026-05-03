"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react"; 
import {
  mainnet,
  polygon,
  type AppKitNetwork,
} from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { DefaultSIWX } from "@reown/appkit-siwx";

const queryClient = new QueryClient();

const networks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, polygon];

const projectId = "d86a9102e9f88948ac5d809a1a6e9cad";

const metadata = {
  name: "Polybook",
  description: "Polybook dApp",
  url: "http://localhost:3002",
  icons: ["http://localhost:3002/icon.png"],
};

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
});

const siwx = new DefaultSIWX();

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: true,
  },
  siwx,
});

export function AppKitProviderr({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}