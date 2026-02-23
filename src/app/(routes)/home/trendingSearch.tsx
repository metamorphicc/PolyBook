import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Loading from "../../Components/Loading";
import Image from "next/image";
export default function TrendingSearch() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState<any>();

  const [ress, setRess] = useState<any>([]);
  useEffect(() => {
    const parse = async () => {
      try {
        setLoading(true);

        const row = await fetch("/api/markets").then((res) => res.json());

        setRess(row.slice(0, 5));
        console.log(row);
      } catch (e) {
        console.log("pizda bochok potic: " + e);
      } finally {
        setLoading(false);
      }
    };

    parse();
  }, []);
  const filteredMarkets = useMemo(() => {
    if (!search) return ress;

    const query = search.toLowerCase();

    return ress.filter((market: any) => {
      const titleMatch = market.title?.toLowerCase().includes(query);

      const tagMatch = market.tags?.[0]?.label?.toLowerCase().includes(query);

      return titleMatch || tagMatch;
    });
  }, [search, ress]);
  if (loading) return <Loading />;
  return (
    <>
      <div className="flex flex-col h-full w-full"> {/* Родительский контейнер на всю высоту */}
  {filteredMarkets.map((market:any) => (
    <div
      key={market.id}
      className="px-5 cursor-pointer hover:bg-zinc-300 flex-1 flex items-center border-b border-gray-100"
    >
      <div className="flex w-full h-8 gap-5 items-center">
        <Image src={market?.icon} alt="img" width={30} height={30} />
        <span className="truncate">{market?.title}</span>
      </div>
    </div>
  ))}
</div>
    </>
  );
}
