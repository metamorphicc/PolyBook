"use client";

import { TerminalOnboarding } from "@/app/Components/terminal/TerminalOnboarding";
import { useTradingAccount } from "@/app/Components/terminal/useTradingAccount";
import { TerminalWorkspace, useTerminalSettings } from "./TerminalWorkspace";

export default function TradingTerminal() {
  const { settings, updateSettings } = useTerminalSettings();
  const account = useTradingAccount(settings);

  return (
    <TerminalWorkspace
      account={account}
      settings={settings}
      updateSettings={updateSettings}
      tradingEnabled
      Onboarding={TerminalOnboarding}
    />
  );
}
