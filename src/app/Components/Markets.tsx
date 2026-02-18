import { useEffect, useState } from "react";

export default function Markets() {
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const getMarkets = async () => {
      setLoading(true);
      const res = await fetch("/api/gammapi", {
        cache: "no-store",
      });
      console.log(`MARKETS: ` + await res.text());
      setLoading(false);
    };
    getMarkets();
  }, []);

  if (loading) return <div>Loading...</div>;
  return <div>not loading</div>;
}
