"use client"

import Image from "next/image";
import ScalpOrderbook from "./Components/ScalpBook";
import { AppKitButton } from "@reown/appkit/react";
import { useAppKitAccount } from "@reown/appkit/react";

export default function Home() {
  const {address, isConnected, status} = useAppKitAccount()

  return (
    <div className="flex h-screen flex-col px-5 py-3 box-border">
      <div className="px-4 py-2 border rounded-full mb-3 justify-between flex items-center">
        <p className="flex gap-4 text-[25px]">
          <Image
            src="/logo.png"
            alt="logo"
            width={20}
            height={20}
            className="object-contain"
          />
          PolyBooks
        </p>
        <ul className="flex">
          <li className="w-30">
            
            {!address && !isConnected ? <AppKitButton/> : <><p className="break-words">Profile: {address}</p> </>}
          </li>
        </ul>
      </div>
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
