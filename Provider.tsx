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
import { getTradingPublicConfig } from "./src/app/lib/appMode";

const queryClient = new QueryClient();

const networks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, polygon];

const { appUrl, reownProjectId: projectId } = getTradingPublicConfig();

const metadata = {
  name: "Polybook",
  description: "Fast-market research and execution workspace",
  url: appUrl,
  icons: [`${appUrl}/logo_blue.jpg`],
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
  metadata,
  features: {
    analytics: true,
  },
});

export function TradingProviders({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
