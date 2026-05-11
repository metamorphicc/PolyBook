"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function DropdownMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex h-11 w-11 cursor-pointer items-center justify-center border border-zinc-800 bg-zinc-950 text-xl text-white shadow-lg transition-colors hover:bg-zinc-900 focus:outline-none"
        aria-label="Open terminal menu"
      >
        {isOpen ? (
          "x"
        ) : (
          <span className="flex flex-col gap-1" aria-hidden="true">
            <span className="block h-0.5 w-5 bg-white" />
            <span className="block h-0.5 w-5 bg-white" />
            <span className="block h-0.5 w-5 bg-white" />
          </span>
        )}
      </button>

      <div
        className={`absolute left-0 z-50 mt-2 w-56 origin-top-left bg-zinc-950 text-zinc-100 shadow-2xl ring-1 ring-zinc-800 transition-all duration-200 ease-out ${
          isOpen
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <div className="py-2">
          <Link href="/" className="block px-4 py-2 text-sm hover:bg-zinc-900">
            Terminal
          </Link>
          <Link
            href="/profile"
            className="block px-4 py-2 text-sm hover:bg-zinc-900"
          >
            Profile
          </Link>
          <button
            type="button"
            disabled
            className="block w-full cursor-not-allowed px-4 py-2 text-left text-sm text-zinc-500"
          >
            Layout presets
          </button>
          <div className="my-1 border-t border-zinc-800" />
          <button
            type="button"
            disabled
            className="block w-full cursor-not-allowed px-4 py-2 text-left text-sm text-zinc-500"
          >
            General markets disabled
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[-1]" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
