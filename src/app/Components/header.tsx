"use client";
import Image from "next/image";
import CustomConnect from "./CustomConnect";
import { useRouter } from "next/navigation";

export default function Header() {
  const router = useRouter();
  return (
    <>
      <div className="px-4 py-2 border rounded-full mb-3 justify-between flex items-center">
        <div className="flex justify-between gap-4 w-full items-center px-4">
          <ul>
            <li>
              <p className="flex gap-4 text-[25px]">
                <Image
                  src="/logo.png"
                  alt="logo"
                  width={40}
                  height={40}
                  className="object-contain"
                />
                PolyBooks
              </p>
            </li>
          </ul>
          <ul className="flex items-center justify-end gap-4">
            <li>
              <button className="border rounded-md px-4 py-1.5 transition border-zinc-500 hover:bg-zinc-700 cursor-pointer">
                Markets
              </button>{" "}
            </li>
            <li>
              <button className="border rounded-md px-4 py-1.5 transition border-zinc-500 hover:bg-zinc-700 cursor-pointer">
                Traders
              </button>
            </li>
            <li>
              <button className="border rounded-md px-4 py-1.5 transition border-zinc-500 hover:bg-zinc-700 cursor-pointer">
                Analytic
              </button>
            </li>
            <li>
              <button
                className="border rounded-md px-4 py-1.5 transition border-zinc-500 hover:bg-zinc-700 cursor-pointer"
                onClick={() => router.push("/profile")}
              >
                Profile
              </button>
            </li>
          </ul>
          <ul className="flex">
            <li className="w-50">
              <CustomConnect/>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
