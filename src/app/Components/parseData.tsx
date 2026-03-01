type HistoryResponse = { history: { t: number; p: number }[] };

export const parseToChartData = (resp: HistoryResponse) => {
  return resp.history.map((p) => ({
    timestamp: p.t,
    probability: p.p,
  }));
};