"use client";

import Image from "next/image";
import ScalpOrderbook from "./Components/ScalpBook";
import { AppKitButton } from "@reown/appkit/react";
import { useAppKitAccount } from "@reown/appkit/react";
import CustomConnect from "./Components/CustomConnect";
import CustomDisconnect from "./Components/Disconnect";
import SignMessage from "./Components/SignMessage";
import Header from "./Components/header";

export default function Home() {
  const { address, isConnected, status } = useAppKitAccount();
  return (
    <div className="flex h-screen flex-col px-3 py-3 box-border">
      <Header />

      <div className="flex-1 bg-zinc-900">
        {/* <div className="flex border border-zinc-700 p-4 rounded-md items-center justify-center">

          <p className="text-[24px]">
            Market: Will the price of Bitcoin be above $70,000 on February 8?
          </p>
        </div>
        <ScalpOrderbook /> */}
      </div>
    </div>
  );
}
