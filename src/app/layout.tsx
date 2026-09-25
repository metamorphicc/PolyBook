import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ModalProvider } from "./Components/Modal";
import { ThemeProvider } from "./Components/ThemeProvider";
import { getAppMode, isTradingMode } from "./lib/appMode";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateMetadata(): Metadata {
  const trading = isTradingMode(getAppMode());
  const title = trading
    ? "PolyBook — Fast-market trading terminal"
    : "PolyBook — Fast-market research terminal";
  const description = trading
    ? "A guarded Polymarket execution workspace for BTC, ETH, SOL, and XRP fast markets."
    : "A read-only Polymarket research terminal for BTC, ETH, SOL, and XRP fast markets.";

  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002",
    ),
    title: {
      default: title,
      template: "%s · PolyBook",
    },
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <ModalProvider>
            <div id="modal-root" />
            <div className="min-h-screen theme-bg">
              {children}
            </div>
          </ModalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
