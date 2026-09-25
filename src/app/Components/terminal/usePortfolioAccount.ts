"use client";

import type { TradingSettings } from "../tradingSettings";
import type { TradingAccount } from "./useTradingAccount";

const unavailable = async () => {
  throw new Error("Trading actions are unavailable in portfolio mode.");
};

const PORTFOLIO_ACCOUNT: TradingAccount = {
  depositWallet: null,
  ready: false,
  hydrating: false,
  activating: false,
  activationError: null,
  balanceUsd: null,
  allowanceUsd: null,
  positions: [],
  orders: [],
  fills: [],
  activate: unavailable,
  placeOrder: unavailable,
  closePosition: unavailable,
  cancelOrder: unavailable,
  cancelAllInMarket: unavailable,
  refresh: () => {},
  setActiveMarket: () => {},
};

/** A deliberately inert account model with no wallet or authentication imports. */
export function usePortfolioAccount(settings: TradingSettings): TradingAccount {
  void settings;
  return PORTFOLIO_ACCOUNT;
}
