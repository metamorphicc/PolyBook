"use client";
import { PrivyProvider } from "@privy-io/react-auth";

export default function PrivyProviderr({ children }: { children: any }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ["wallet", "google", 'github'],
        appearance: {
          theme: "dark",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
