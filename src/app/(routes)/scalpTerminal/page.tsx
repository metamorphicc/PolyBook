import { getAppMode, isTradingMode } from "@/app/lib/appMode";

export default async function ScalpTerminalPage() {
  if (isTradingMode(getAppMode())) {
    const { default: TradingTerminal } = await import("./TradingTerminal");
    return <TradingTerminal />;
  }

  const { default: PortfolioTerminal } = await import("./PortfolioTerminal");
  return <PortfolioTerminal />;
}
