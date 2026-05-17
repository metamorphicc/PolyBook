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
        <h2 className="text-xl font-bold text-white">Top Up Balance</h2>
        <p className="text-zinc-400">Your Safe deposit address:</p>

        <div className="flex items-center justify-center border border-white/10 bg-zinc-950/60 p-3">
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
          className="group relative px-2 w-full py-2 border border-white/20 flex items-center justify-start text-white text-[14px] cursor-pointer hover:border-white/50 transition-all active:scale-[0.98]"
        >
          <span className="truncate pr-16">{address}</span>
          
          <Image src={"/copy.svg"} width={16} height={16} alt="img" />
        </div>
        {copied && <span className="text-xs text-green-400">Address copied</span>}
        <span className="text-md text-white">Send Polygon assets to this Safe address to start trade</span>
        <button
          onClick={closeModal}
          className="bg-white py-2 rounded-lg text-black cursor-pointer hover:shadow-lg font-bold mt-2"
        >
          Close
        </button>
      </div>
    );
  };
