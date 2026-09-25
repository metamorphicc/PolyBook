import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ModalProvider } from "./Components/Modal";
import { ThemeProvider } from "./Components/ThemeProvider";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002"),
  title: {
    default: "PolyBook — Fast-market research terminal",
    template: "%s · PolyBook",
  },
  description:
    "A read-first Polymarket fast-market terminal for BTC, ETH, SOL, and XRP.",
  openGraph: {
    title: "PolyBook — Fast-market research terminal",
    description:
      "Live orderbooks, reference charts, position controls, and explicit trading guards in one workspace.",
    type: "website",
  },
};

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
