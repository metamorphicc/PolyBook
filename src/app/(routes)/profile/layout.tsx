import { notFound } from "next/navigation";
import { getAppMode, isTradingMode } from "@/app/lib/appMode";

export default function ProfileLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!isTradingMode(getAppMode())) notFound();

  return children;
}
