"use client";
import Image from "next/image";
import CustomConnect from "./CustomConnect";
import { useRouter } from "next/navigation";
import { useModal } from "./Modal";
import { useEffect, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { DepositContent } from "./DepositContent";
import Loading from "./Loading";

export default function Header() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { openModal, closeModal } = useModal();
  const { address, isConnected, status } = useAppKitAccount();
  const [safe, setSafe] = useState();
  

  useEffect(() => {
    setLoading(true);

    if (!isConnected || !address) return;
    const initAccount = async () => {
      setLoading(true);
      try {
        const safeRes = await fetch("/api/user/safe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerAddress: address }),
        });

        const { proxyAddress } = await safeRes.json();
        setSafe(proxyAddress[0].safe_address);
        console.log("safe address:", proxyAddress[0].safe_address);
        console.log(safe)
      } catch {}
    };
    initAccount();
    setLoading(false);

  });
  const handleDeposit = () => {
    openModal(
      <DepositContent address={safe as any} closeModal={closeModal} />
    );
  };
  return (
    <div className="px-4 py-2 rounded-[30px] w-[90vw] border border-sky-300/30 mb-3 shadow-lg hover:shadow-xl sticky">
      <div className="flex items-center w-full px-4">
        <div className="flex-1 flex items-center">
          <button
            className="flex gap-3 text-[25px] cursor-pointer items-center"
            onClick={() => router.push("/home")}
          >
            <Image
              src="/logo.png"
              alt="logo"
              width={40}
              height={40}
              className="object-contain rounded-[10px]"
            />
            <span className="font-semibold">PolyBook</span>
          </button>
        </div>

        <div className="flex justify-center">
          <ul className="flex items-center gap-4">
            <li>
              <button className="border rounded-md px-4 py-1.5 transition border-sky-300/50 hover:bg-sky-300 cursor-pointer">
                Markets
              </button>
            </li>
            <li>
              <button className="border rounded-md px-4 py-1.5 transition border-sky-300/50 hover:bg-sky-300 cursor-pointer">
                Traders
              </button>
            </li>
            <li>
              <button
                className="border rounded-md px-4 py-1.5 transition border-sky-300/50 hover:bg-sky-300 cursor-pointer"
                onClick={() => {
                  handleDeposit();
                }}
              >
                Deposit
              </button>
            </li>
          </ul>
        </div>

        <div className="flex-1 flex items-center justify-end min-w-[140px]">
          <CustomConnect />
        </div>
      </div>
    </div>
  );
}
