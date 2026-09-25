import { getAppMode, isTradingMode } from "../lib/appMode";
import { serverEnv } from "../lib/env";

export default async function ProductLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!isTradingMode(getAppMode())) return children;

  // Fail the trading build before it can be deployed with only part of the
  // private stack configured. Values are read here but never passed to clients.
  serverEnv();

  const [{ TradingProviders }, { default: SessionSync }] = await Promise.all([
    import("../../../Provider"),
    import("../Components/SessionSync"),
  ]);

  return (
    <TradingProviders>
      <SessionSync />
      {children}
    </TradingProviders>
  );
}
