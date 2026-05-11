export type Position = {
    conditionId: string;
    size: number;
    avgPrice: number;
    cashPnl: number;
    isClaimed: boolean;
  };
  
  export const fetchPositions = async (
    safeAddr: string
  ): Promise<Position[]> => {
    try {
      const res = await fetch(`/api/pol/poses?user=${safeAddr}`);
  
      if (!res.ok) {
        const text = await res.text();
        console.error("[fetchPositions] API error:", res.status, text);
        return [];
      }
  
      const data = await res.json();
      if (!Array.isArray(data)) {
        console.warn("[fetchPositions] unexpected format:", data);
        return [];
      }
  
      return data.map((p: any) => ({
        conditionId: p.conditionId,
        size: Number(p.size ?? 0),
        avgPrice: Number(p.avgPrice ?? 0),
        cashPnl: Number(p.cashPnl ?? 0),
        isClaimed: !!p.isClaimed,
      }));
    } catch (e) {
      console.error("[fetchPositions] failed:", e);
      return [];
    }
  };