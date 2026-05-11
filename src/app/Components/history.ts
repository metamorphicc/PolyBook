export type PositionView = {
  title: string;
  outcome: string;
  amount: number;
  entryPrice: number;
  status: "Open" | "Closed";
  timestamp: string;
};

export const fetchHistory = async (
  safeAddr: string
): Promise<PositionView[]> => {
  try {
    const res = await fetch(`/api/position?user=${safeAddr}`);

    if (!res.ok) {
      const text = await res.text();
      console.error("[fetchHistory] API error:", res.status, text);
      return [];
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      console.warn("[fetchHistory] Unexpected response format:", data);
      return [];
    }

    return data.map((pos: any) => ({
      title: pos.condition?.description ?? "Unknown market",
      outcome: pos.outcome ?? "",
      amount: Number(pos.size ?? 0),
      entryPrice: Number(pos.avgPrice ?? 0),
      status: pos.isClaimed ? "Closed" : "Open",
      timestamp: pos.updatedAt
        ? new Date(pos.updatedAt).toLocaleDateString()
        : "",
    }));
  } catch (e) {
    console.error("[fetchHistory] fetch failed:", e);
    return [];
  }
};