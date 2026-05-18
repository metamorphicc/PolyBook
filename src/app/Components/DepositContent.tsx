"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";

export const DepositContent = ({ address, closeModal }: { address: string; closeModal: () => void }) => {
    const [copied, setCopied] = useState(false);
    const [qrSvg, setQrSvg] = useState("");
    const qrValue = useMemo(() => (address ? `ethereum:${address}@137` : ""), [address]);
  
    const handleCopy = async () => {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); 
    };

    useEffect(() => {
      let cancelled = false;

      const buildQr = async () => {
        if (!qrValue) {
          setQrSvg("");
          return;
        }

        const svg = await QRCode.toString(qrValue, {
          type: "svg",
          errorCorrectionLevel: "M",
          margin: 1,
          width: 96,
          color: {
            dark: "#020617",
            light: "#ffffff",
          },
        });

        if (!cancelled) setQrSvg(svg);
      };

      buildQr().catch(() => {
        if (!cancelled) setQrSvg("");
      });

      return () => {
        cancelled = true;
      };
    }, [qrValue]);
  
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-[var(--foreground)]">Top Up Balance</h2>
        <p className="theme-muted">Your Safe deposit address:</p>

        <div className="flex items-center justify-center border theme-border bg-[var(--surface-muted)] p-3">
          <div className="flex h-[112px] w-[112px] items-center justify-center bg-white p-2">
            {qrSvg ? (
              <div
                className="h-24 w-24"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <span className="text-xs text-zinc-500">QR unavailable</span>
            )}
          </div>
        </div>
        
        <div 
          onClick={handleCopy}
          className="group relative flex w-full cursor-pointer items-center justify-start border theme-border px-2 py-2 text-[14px] text-[var(--foreground)] transition-all hover:border-[var(--accent)] active:scale-[0.98]"
        >
          <span className="truncate pr-16">{address}</span>
          
          <Image src={"/copy.svg"} width={16} height={16} alt="img" />
        </div>
        {copied && <span className="text-xs text-green-400">Address copied</span>}
        <span className="text-md text-[var(--foreground)]">Send Polygon assets to this Safe address to start trade</span>
        <button
          onClick={closeModal}
          className="mt-2 cursor-pointer bg-[var(--foreground)] py-2 font-bold text-[var(--background)] hover:shadow-lg"
        >
          Close
        </button>
      </div>
    );
  };
