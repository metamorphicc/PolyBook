import { useEffect, useState } from "react";

type GammaMarket = {
    slug?: string;
    events?: {
      seriesSlug?: string;
      series?: { slug?: string }[];
    }[];
  };

export default function Markets() {
  const [loading, setLoading] = useState(false);
  const [market, setMarket] = useState<GammaMarket[]>([]);
  useEffect(() => {
    const getMarkets = async () => {
      setLoading(true);
      const res = await fetch("/api/search", {
        cache: "no-store",
      });
      const resJson = await res.json()
      console.log(`MARKETS: ` + (JSON.stringify(resJson)));
      setMarket(resJson)
      console.log(resJson);
      

      setLoading(false);
    };
    getMarkets();
  }, []);


  if (loading) return <div>Loading...</div>;
  return <div>not loading</div>;
}
