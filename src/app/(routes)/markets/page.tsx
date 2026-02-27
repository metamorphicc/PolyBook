"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Loading from "../../Components/Loading";
import { useRouter } from "next/navigation";

export default function Markets({ searchQuery }: { searchQuery: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState<any>();

  const [ress, setRess] = useState<any>([]);
  useEffect(() => {
    const parse = async () => {
      try {
        setLoading(true);
        const row = await fetch("/api/markets").then((res) => res.json());
        setRess(row);
      } catch (e) {
        console.log("Error: " + e);
      } finally {
        setLoading(false);
      }
    };
    parse();
  }, []);

  const filteredMarkets = useMemo(() => {
    if (!searchQuery) return ress;

    const query = searchQuery.toLowerCase();

    return ress.filter((market: any) => {
      const titleMatch = market.title?.toLowerCase().includes(query);
      const tagMatch = market.tags?.[0]?.label?.toLowerCase().includes(query);
      return titleMatch || tagMatch;
    });
  }, [searchQuery, ress]);

  if (loading) return <Loading />;

  return (
    <div className="w-[90vw] p-4   rounded-md shadow-lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {filteredMarkets.map((market: any) => {
          const data = new Date(market.endDate);
          return (
            <div
              key={market.id}
              className="flex flex-col shadow-xl p-4 border border-sky-300/50  rounded-lg min-h-[150px]"
            >
              <div className="flex items-center gap-3 text-[15px] ">
                <Image
                  alt="img"
                  width={53}
                  height={53}
                  src={`${market?.image}`}
                  className="rounded-[13px]"
                ></Image>
                <div className="flex items-center justify-between w-full">
                  <a
                    href={`markets/${market?.id}`}
                    className="font-bold hover:scale-[1.05] h-[68px] transition-all duration-100 items-center flex"
                  >
                    {market.title}
                  </a>
                  <button
                    className="border border-sky-300/50 flex items-center rounded-xl h-5 px-2
   w-fit whitespace-nowrap text-[12px]"
                  >
                    {market.tags[0]?.label}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x justify-center">
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
              <div className="flex gap-1">
                End: <div>{data.toLocaleDateString()}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
