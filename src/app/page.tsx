"use client";

import { useAppKitAccount } from "@reown/appkit/react";
import Header from "./Components/header";
import ScalpTerminal2 from "./Components/ScalpBook";
import Markets from "./Components/Markets";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Home() {
  const { address, isConnected, status } = useAppKitAccount();
  const [ress, setRess] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    const parse = async () => {
      const row = await fetch("/api/markets")
        .then((res) => res.json())
        .catch((e) => console.log(`pizda bochok potic: ` + e));
        setRess(row)
      console.log(row)
    };
    parse()
    setLoading(false);
  }, []);
  
  return (
    <div className="flex h-screen flex-col px-3 py-3 box-border relative">
      <Header />

      <div className="flex-1 w-full flex justify-center">
        <div className="w-[90vw] border border-zinc-700 p-4 rounded-md shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            {ress.map((market:any) => (
              <div
                key={market.id}
                className="flex flex-col shadow-xl p-4 border border-gray-700 bg-gray-800/30 rounded-lg min-h-[150px]"
              >
                <div className="flex items-center gap-3 text-[15px]">
                  <Image
                    alt="img"
                    width={30}
                    height={30}
                    src={`${market?.image}`}
                  ></Image>
                  <div className="flex items-center justify-between w-full">
                    <a
                      href="/profile"
                      className="font-bold hover:scale-[1.05] transition-all 
  duration-100
  "
                    >
                      {market.title}
                    </a>
                    <button className="border flex items-center rounded-xl bg-zinc-500 h-min-5 text-[12px] px-1">
                      {market.tags[0]?.label}
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x justify-center">
                  <div className="flex flex-col gap-2 overflow-y-auto pr-1 h-[160px] items-center custom-scrollbar">
                    {[
                      { name: "Alexandria O...", yes: "9¢", no: "92¢" },
                      { name: "Kamala Harris", yes: "6¢", no: "94¢" },
                      { name: "Jon Ossoff", yes: "5¢", no: "95¢" },
                      { name: "Gavin Newsom", yes: "4¢", no: "96¢" },
                      { name: "Pete Buttigieg", yes: "3¢", no: "97¢" },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1 group"
                      >
                        <span className="text-sm text-gray-300 truncate w-24 group-hover:text-white transition-colors">
                          {item.name}
                        </span>

                        <div className="flex gap-2">
                          <button className="bg-green-500/10 hover:bg-green-500/20 text-green-500 text-xs font-bold py-1.5 px-3 rounded-full border border-green-500/20 transition-all">
                            Yes {item.yes}
                          </button>
                          <button className="bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold py-1.5 px-3 rounded-full border border-red-500/20 transition-all">
                            No {item.no}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* <ScalpTerminal2 /> */}
        {/* <Markets/> */}
      </div>
    </div>
  );
}
