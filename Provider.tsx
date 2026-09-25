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

const projectId =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ??
  "d86a9102e9f88948ac5d809a1a6e9cad";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";

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
