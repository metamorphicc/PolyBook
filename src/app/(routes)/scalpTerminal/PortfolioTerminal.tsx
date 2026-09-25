"use client";

import { usePortfolioAccount } from "@/app/Components/terminal/usePortfolioAccount";
import { TerminalWorkspace, useTerminalSettings } from "./TerminalWorkspace";

export default function PortfolioTerminal() {
  const { settings, updateSettings } = useTerminalSettings();
  const account = usePortfolioAccount(settings);

  return (
    <TerminalWorkspace
      account={account}
      settings={settings}
      updateSettings={updateSettings}
      tradingEnabled={false}
    />
  );
}
