"use client";
import { useAppKitAccount } from "@reown/appkit/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/Components/header";
import Image from "next/image";
export default function Profile() {
  const { address, isConnected, status } = useAppKitAccount();
  const [balance, setBalance] = useState<any>(null);
  const router = useRouter();
  
  return (
    <>
      <div className="flex flex-col items-center h-screen py-5 gap-15 overflow-hidden">
        <Header />
        <div className="h-3/4 w-[70vw] shadow-lg hover:scale-101 transition">
          <div className="px-7 py-4 flex h-full gap-15">
            <div className="w-[70%] ">
              <div className=" h-[30%] p-3 flex flex-col justify-center">
                <div className="bg-white rounded-[60px] h-[70%] flex items-center px-8 shadow-lg gap-3">
                  <Image
                    src={"/logo.png"}
                    alt="img"
                    width={45}
                    height={45}
                    className="rounded-[60px]"
                  />
                  <div>
                    <p className="font-bold text-[19px]">Morph</p>
                    <span className="font-stretch-expanded">
                      description blab bbla bla
                    </span>
                  </div>
                  <button>send</button>
                </div>
              </div>
              <div className="h-[90%]">
                <div className="bg-white rounded-[30px] h-[70%] flex items-center justify-center px-5 shadow-lg">
                  trades history
                </div>
              </div>
            </div>
            <div className="w-[30%] h-full flex flex-col">
              <div className="h-[30%] flex items-center  justify-center">
                <div className="h-[70%] flex shadow-lg w-full  items-center justify-center">
                  <div className="h-full flex flex-col w-[40%] items-center justify-center">
                    <p className="flex justify-center">W/R: 90% </p>
                    <p className="flex justify-center">PnL: </p>
                  </div>
                </div>
              </div>
              <div className="h-[70%] ">
                <div className="h-[90%] flex justify-center shadow-lg rounded-[30px] p-5">markets(?)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
