"use client";

import { useAppKitAccount } from "@reown/appkit/react";
import Header from "../../Components/header";
import ScalpTerminal2 from "../../Components/ScalpBook";
import Markets from "../markets/page";
import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { ethers } from "ethers";
import TrendingSearch from "./trendingSearch";
import ScalpSection from "@/app/Components/scalpSection";

export function useEthersSigner() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  return useMemo(() => {
    if (!isConnected || !walletClient) return null;

    const provider = new ethers.BrowserProvider(walletClient as any);
    return provider.getSigner(address);
  }, [address, isConnected, walletClient]);
}

type CategoryKey = "crypto" | "politics" | "sport";

export default function Home() {
  const signerPromise = useEthersSigner();
  useEffect(() => {
    const run = async () => {
      if (!signerPromise) return;
      const signer = await signerPromise;
      if (!signer) return;
    };
    run();
  }, [signerPromise]);

  const { address, isConnected, status } = useAppKitAccount();
  const [search, setSearch] = useState("");
  const [activeCategories, setActiveCategories] = useState<CategoryKey[]>([]);

  const toggleCategory = (cat: CategoryKey) => {
    setActiveCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const isActive = (cat: CategoryKey) => activeCategories.includes(cat);

  return (
    <div className="flex h-screen flex-col px-3 py-3 box-border gap-3 relative items-center">
      <Header />

      <div className="w-[90vw] min-h-88 flex items-center flex-shrink-0 gap-5">
        <div className="h-full w-full shadow-lg">
          <TrendingSearch />
        </div>
        <div className="h-full w-full flex flex-col justify-between">
          <ScalpSection />
          <div className="w-full h-[30%] flex flex-col items-center justify-center">
            <div className="shadow-lg w-full hover:scale-101 transition h-[90%] rounded-[30px] p-5 flex gap-5">
              <div className="flex flex-1 gap-3 items-center">
                <Image
                  src={"/logo_blue.jpg"}
                  height={40}
                  width={40}
                  alt="132"
                  className="flex-shrink-0 object-contain"
                />
                <p>0x0000000000x000000000 </p>
              </div>
              <div className="flex gap-4 text-[14px] flex-1">
                <p className="text-green-700">Profit today: {2 + 2}</p>
                <p>Portfolio: {2 * 8}</p>
              </div>
              <div className="w-full flex flex-1 flex-col items-center justify-center">
                *here's should be your graphic pnl *
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col w-[80vw] min-h-20 justify-center items-center border rounded-2xl">
        <div className="relative group w-[80vw] flex min-h-20 items-center px-4">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-[20vw] border border-sky-300/50 rounded-2xl py-4 pl-4 pr-10 h-[5vh] placeholder:text-gray-600"
            />

            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          <div className="w-[50%] flex justify-center items-center gap-3">
            <span>choose category: </span>
            <ul className="gap-3 flex">
              <li>
                <button
                  type="button"
                  onClick={() => toggleCategory("crypto")}
                  className={`border px-2 cursor-pointer rounded ${
                    isActive("crypto")
                      ? "bg-sky-500 text-black border-sky-500"
                      : "border-sky-300/50"
                  }`}
                >
                  Crypto
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => toggleCategory("politics")}
                  className={`border px-2 cursor-pointer rounded ${
                    isActive("politics")
                      ? "bg-sky-500 text-black border-sky-500"
                      : "border-sky-300/50"
                  }`}
                >
                  Politics
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => toggleCategory("sport")}
                  className={`border px-2 cursor-pointer rounded ${
                    isActive("sport")
                      ? "bg-sky-500 text-black border-sky-500"
                      : "border-sky-300/50"
                  }`}
                >
                  Sport
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full flex justify-center">
        <Markets
          searchQuery={search}
          activeCategories={activeCategories}
        />
      </div>
    </div>
  );
}