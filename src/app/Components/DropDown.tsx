"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
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
    <div ref={menuRef} className="relative inline-block text-left mt-5 ml-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center cursor-pointer w-12 h-12 rounded-full text-white transition-colors shadow-lg focus:outline-none"
      >
        <span className="text-xl text-black">{isOpen ? "✕" : "☰"}</span>
      </button>

      <div
        className={`
          absolute left-0 mt-2 w-48 origin-top-left rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 transition-all duration-200 ease-out
          ${
            isOpen
              ? "transform opacity-100 scale-100"
              : "transform opacity-0 scale-95 pointer-events-none"
          }
        `}
      >
        <div className="py-2">
          <a
            href="/profile"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            
          >
            Profile
          </a>
          <a
            href="#"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            settings
          </a>
          <a
            href="#"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            settings
          </a>
          <div className="border-t border-gray-100 my-1"></div>
          <a
            href="#"
            className="block px-4 py-2 text-sm text-red-500 hover:bg-red-50"
          >
            Disable scalp mode
          </a>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
