"use client";
import DropdownMenu from "@/app/Components/DropDown";
import Image from "next/image";

export default function scalpTerminal() {
  return (
    <div className="relative w-full">
      <div className="h-screen flex flex-col">
        <div className="flex items-center justify-center h-full flex-col gap-5">
            <div className="flex items-center flex-col justify-center">
                <p></p>
                <span></span>
            </div>
            <div className="flex gap-5">
                <div className=" ">
                    <Image src={"/bookmark.svg"} alt={"img" }width={50} height={50} className=" shadow-lg cursor-pointer hover:scale-103 transition"/>
                </div>
                <div className=" ">
                <Image src={"/metrics.svg"} alt={"img" }width={50} height={50} className="shadow-lg bg-none cursor-pointer hover:scale-103 transition"/>

                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
