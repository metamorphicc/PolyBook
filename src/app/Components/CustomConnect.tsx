import { createAppKit, useAppKit, useDisconnect } from "@reown/appkit/react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function CustomConnect() {
  const { address, isConnected, status } = useAppKitAccount();
  const { open, close } = useAppKit();
  const { disconnect } = useDisconnect();
  const [nonce, setNonce] = useState<any>();
  const [authDone, setAuthDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isConnected || !address || authDone) return;
    const getNonce = async () => {
      console.log("status: ", status);

      const nonceRes = await fetch("http://localhost:8089/api/getNonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      console.log(JSON.stringify(nonceRes));
      setNonce(JSON.stringify(nonceRes));
    };

    const verify = async () => {
      const signRes = await fetch("http://localhost:8089/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, nonce }),
      });

      const data = await signRes.json();
      setAuthDone(true);
      console.log("USER JUST REGISTERED <---------", data);
    };
    getNonce();
    verify();
  }, [isConnected, address, status]);
  return (
    <>
      {!address || !isConnected ? (
        <div className="w-full flex items-center justify-end ">
          <button
            onClick={() => open({ view: "Connect" })}
            className="cursor-pointer px-4 transition bg-sky-300/70 transition rounded-full h-10 hover:bg-sky-300"
          >
            Connect wallet
          </button>
        </div>
      ) : (
        <div className="w-full flex items-center gap-4 justify-end">
          <div className="flex px-3 md:sr-only">
            <div>
              <span className="">
                Cash: <p className="ml-1">$0.00</p>
              </span>
            </div>
            <div>
              <span>In-trade: $0.00</span>
            </div>
          </div>

          <button
            className="border rounded-md px-4 w-[110px] py-1.5 bg-sky-300/70 transition border-sky-300/50 hover:bg-sky-300 cursor-pointer md:text-[13px] md:w-[90px]"
            onClick={() => router.push("/profile")}
          >
            Profile
          </button>

          <button
            onClick={() => disconnect()}
            className="border rounded-md px-4 w-[110px] py-1.5 bg-sky-300/70 transition border-sky-300/50 hover:bg-sky-300 cursor-pointer md:text-[13px] md:w-[90px] flex items-center justify-center"
          >
            Disconnect
          </button>
        </div>
      )}
    </>
  );
}
