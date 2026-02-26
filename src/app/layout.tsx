import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createConfig } from "wagmi";
import { AppKitProviderr } from "../../Provider";
import { http } from "viem";
import { mainnet } from "viem/chains";
import { ModalProvider } from "./Components/Modal";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PolyBook",
  description: "",
};

const config = createConfig({
  chains: [mainnet],
  transports: { [mainnet.id]: http() },
});

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
        <ModalProvider>
        <div id="modal-root" />

        <AppKitProviderr>{children}</AppKitProviderr>
        </ModalProvider>
      </body>
    </html>
  );
}
