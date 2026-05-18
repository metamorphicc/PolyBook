"use client";

import { createPortal } from "react-dom";

export function PortalWrapper({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const root =
    typeof document === "undefined" ? null : document.getElementById("modal-root");
  if (!root) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 mx-4 w-full max-w-md border theme-border theme-surface p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 theme-muted hover:text-[var(--foreground)]"
        >
          x
        </button>
        {children}
      </div>
    </div>,
    root
  );
}
