"use client";
import DropdownMenu from "@/app/Components/DropDown";
import { Sriracha } from "next/font/google";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function scalpTerminal() {
  const router = useRouter()
  return (
    <div className="relative w-full">
      <div className="h-screen flex flex-col bg-[#F3EFEF]">
        <div className="absolute">
        <DropdownMenu/>

        </div>
        <div className="flex items-center justify-center h-full flex-col gap-5">
          <div className="flex items-center flex-col justify-center">
            <p className="font-semibold text-zinc-700 ">The panel is empty</p>
            <span className="text-zinc-700">
              {" "}
              Select a chart or orderbook to start trading{" "}
            </span>
          </div>
          <div className="flex gap-5">
            <div className=" border border-zinc-700 hover:scale-103 transition">
              <Image
                src={"/bookmark.svg"}
                alt={"img"}
                width={60}
                height={60}
                className=" shadow-lg p-1 cursor-pointer "
              />
            </div>
            <div className=" border border-zinc-700 hover:scale-103 transition">
              <Image
                src={"/metrics.svg"}
                alt={"img"}
                width={60}
                height={60}
                className="shadow-lg p-1  bg-none cursor-pointer  "
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
