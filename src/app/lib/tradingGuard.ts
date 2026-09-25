import "server-only";

import { NextResponse } from "next/server";
import { getAppMode, isTradingMode } from "./appMode";

export function rejectOutsideTradingMode() {
  if (isTradingMode(getAppMode())) return null;

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
