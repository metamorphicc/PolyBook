"use client";
import DropdownMenu from "@/app/Components/DropDown";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Scalp() {
  const router = useRouter();
  return (
    <div className="relative w-full">
      <div className="h-screen w-full flex flex-col">
        <div className="flex w-full justify-start px-4 py-2 shadow-lg">
        <button onClick={() => {router.back()}} className="px-6 py-2 shadow-lg w-30 rounded-[20px] mt-3 ml-6 flex cursor-pointer justify-center items-center">
            <div className="flex items-center justify-center w-full">
            <Image src={"/back.svg"} width={15} height={15} alt={"ads"} className=""/>

            </div>
          <span className="p-1">Back</span>
        </button>
        </div>
        <div className="w-full h-full ">
          <div className="text-white  h-full flex flex-col justify-center items-center">
            <div className="flex items-center p-6  w-screen shadow-lg justify-center flex-col gap-6">
              <div className="flex items-center flex-col text-black gap-2">
                <p className="text-[25px] font-semibold">
                  Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Accusantium, rerum?
                </p>
                <span className="">
                 Lorem ipsum dolor sit amet consectetur adipisicing elit. Ut impedit illum maiores voluptates, deserunt a.
                </span>
              </div>
              <div className=" mb-20 flex gap-6 flex justify-center ">
                <div className="cursor-pointer shadow-lg rounded-[10px] hover:scale-103 transition">
                  <button
                    className="text-black text-semibold px-6 py-2 cursor-pointer border rounded-[10px]"
                    onClick={() => {
                      router.replace("/scalpTerminal");
                    }}
                  >
                    Launch scalp
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
