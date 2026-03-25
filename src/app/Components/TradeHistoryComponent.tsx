export const fetchHistory = async (safeAddr: string) => {
    const response = await fetch(`https://gamma-api.polymarket.com/positions?user=${safeAddr}`);
    const data = await response.json();
    
    return data.map((pos: any) => ({
      title: pos.condition?.description, 
      outcome: pos.outcome,              
      amount: pos.size,                  
      entryPrice: pos.avgPrice,          
      status: pos.isClaimed ? "Closed" : "Open", 
      timestamp: new Date(pos.updatedAt).toLocaleDateString() 
    }));
  };