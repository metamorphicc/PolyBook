"use client";
import { useAppKitAccount } from "@reown/appkit/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/Components/header";

export default function Profile() {
  const { address, isConnected, status } = useAppKitAccount();
  const [balance, setBalance] = useState<any>(null);
  const router = useRouter();
  useEffect(() => {});
  return (
    <>
      <div className="flex flex-col items-center h-screen py-5 gap-15">
        <Header />
        <div className="h-1/2 w-[80vw] border flex">
          <div className="flex h-1/2 ">
            <div className="bg-black w-full">fd</div>
          </div>
          <div className="flex h-1/2 w-full">
            <div className="bg-black w-full" >fd</div>
          </div>
        </div>
      </div>
    </>
  );
}
