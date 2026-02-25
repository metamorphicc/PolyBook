"use client";
import { useState } from "react";

export default function DropdownMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block text-left ">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center cursor-pointer w-12 h-12 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg focus:outline-none"
      >
        <span className="text-xl">{isOpen ? "✕" : "☰"}</span>
      </button>

      <div
        className={`
          absolute right-0 mt-2 w-48 origin-top-right rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 transition-all duration-200 ease-out
          ${
            isOpen
              ? "transform opacity-100 scale-100"
              : "transform opacity-0 scale-95 pointer-events-none"
          }
        `}
      >
        <div className="py-2">
          <a
            href="#"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            profile
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
            className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            log out
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
