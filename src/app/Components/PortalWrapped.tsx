"use client";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export function PortalWrapper({ children, onClose }: { children: React.ReactNode, onClose: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative z-10 bg-zinc-900 border border-white/10 p-6 rounded-3xl max-w-md w-full mx-4 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white">✕</button>
        {children}
      </div>
    </div>,
    document.getElementById("modal-root")! 
  );
}