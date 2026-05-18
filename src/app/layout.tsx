import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppKitProviderr } from "../../Provider";
import { ModalProvider } from "./Components/Modal";
import { ThemeProvider } from "./Components/ThemeProvider";
import { ThemeToggle } from "./Components/ThemeToggle";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PolyBook Scalp Terminal",
  description: "Fast Polymarket crypto scalp terminal for BTC, ETH, SOL, and XRP.",
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
            <ThemeToggle />
            <div className="min-h-screen theme-bg">
              <AppKitProviderr>{children}</AppKitProviderr>
            </div>
          </ModalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
