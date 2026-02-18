"use client";

import { useAppKitAccount } from "@reown/appkit/react";
import Header from "./Components/header";

export default function Home() {

  const { address, isConnected, status } = useAppKitAccount();
  return (
    <div className="flex h-screen flex-col px-3 py-3 box-border">
      <Header />

      <div className="flex-1 bg-zinc-900">
        {/* <div className="flex border border-zinc-700 p-4 rounded-md items-center justify-center">

   
        </div> */}
        {/* <ScalpOrderbook /> */}
      </div>
    </div>
  );
}
