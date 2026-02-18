"use client";
import { useAppKitAccount } from "@reown/appkit/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
export default function Profile() {
  const {address, isConnected, status} = useAppKitAccount();
  const [balance, setBalance] = useState<any>(null);
  const router = useRouter();
  useEffect(() => {});
  return (
    <>
      <div className=" gap-4">
        <p>{`Profile: ${
             address
            ? address.slice(0, 5) + "..." + address.slice(37)
            : "you didn't connect your wallet!"
        }`}</p>

        <p>{`Balance: ${JSON.stringify(balance?.data?.formatted) ?? "0"}`}</p>
      </div>
      <div className="mt-5">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border cursor-pointer"
        >
          back
        </button>
      </div>
    </>
  );
}
