"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Loading from "../../Components/Loading";
import Header from "@/app/Components/header";
import { usePathname } from "next/navigation";

type CategoryKey = "crypto" | "politics" | "sport";

type MarketsProps = {
  searchQuery: string;
  activeCategories: CategoryKey[];
};

export default function Markets({
  searchQuery,
  activeCategories,
}: MarketsProps) {
  const [loading, setLoading] = useState(false);
  const [ress, setRess] = useState<any[]>([]);
  const [limit, setLimit] = useState(20);
  const pathname = usePathname();

  useEffect(() => {
    const parse = async () => {
      try {
        setLoading(true);
        const row = await fetch("/api/markets").then((res) => res.json());
        console.log(`row: ` + row);
        setRess(row);
      } catch (e) {
        console.log("Error: " + e);
      } finally {
        setLoading(false);
      }
    };
    parse();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const bottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 200;

      if (bottom) {
        setLimit((prev) => prev + 20);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredMarkets = useMemo(() => {
    if (!searchQuery && (!activeCategories || activeCategories.length === 0)) {
      return ress;
    }

    const q = searchQuery?.toLowerCase() || "";

    return ress.filter((market: any) => {
      if (q) {
        const title = market.title?.toLowerCase() ?? "";
        const tag = market.tags?.[0]?.label?.toLowerCase() ?? "";
        if (!title.includes(q) && !tag.includes(q)) {
          return false;
        }
      }

      if (activeCategories && activeCategories.length > 0) {
        const category =
          (market.category as string | undefined)?.toLowerCase() ??
          market.tags?.[0]?.label?.toLowerCase() ??
          "";

        const matchesCategory = activeCategories.some((cat) => {
          if (cat === "crypto") {
            return (
              category.includes("crypto") ||
              category.includes("bitcoin") ||
              category.includes("eth") ||
              category.includes("sol")
            );
          }
          if (cat === "politics") {
            return (
              category.includes("politic") || category.includes("election")
            );
          }
          if (cat === "sport") {
            return category.includes("sport");
          }
          return false;
        });

        if (!matchesCategory) return false;
      }

      return true;
    });
  }, [searchQuery, activeCategories, ress]);

  const visibleMarkets = useMemo(
    () => filteredMarkets.slice(0, limit),
    [filteredMarkets, limit]
  );

  if (loading) return <Loading />;

  return (
    <div className="relative w-full flex flex-col items-center">
      {pathname !== "/home" && <Header />}

      <div className="w-[90vw] p-4 rounded-md shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {visibleMarkets.map((market: any) => {
            const liquidity = Math.trunc(market.liquidity);
            const data = new Date(market.endDate);

            return (
              <div
                key={market.id}
                className="flex flex-col shadow-xl p-4 border border-sky-300/50 rounded-lg min-h-[150px]"
              >
                <div className="flex items-center gap-3 text-[15px] ">
                  <Image
                    alt="img"
                    width={53}
                    height={53}
                    src={`${market?.image}`}
                    className="rounded-[13px]"
                  />
                  <div className="flex items-center justify-between w-full">
                    <a
                      href={`markets/${market?.id}`}
                      className="font-bold hover:scale-[1.05] h-[68px] transition-all duration-100 items-center flex"
                    >
                      {market.title}
                    </a>
                    <button className="border border-sky-300/50 flex items-center rounded-xl h-5 px-2 w-fit whitespace-nowrap text-[12px]">
                      {market.tags[0]?.label}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x justify-center">
                  <div className="flex flex-col gap-2 overflow-y-auto pr-1 items-center custom-scrollbar"></div>
                </div>

                <div className="flex justify-between items-end h-full">
                  <div>
                    End: <span>{data.toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span>Value: ${liquidity}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
