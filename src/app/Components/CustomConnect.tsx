import { useAppKit } from "@reown/appkit/react";
import { useAppKitAccount } from "@reown/appkit/react";
import SignMessage from "./SignMessage";

export default function CustomConnect() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  return (
    <>
      <div className="w-full">
        <button
          onClick={() => {
            open({ view: "Connect" });
          }}
          className="cursor-pointer bg-black px-2 w-full transition hover:bg-zinc-700 border rounded-full h-10"
        >
          коннект валлет
        </button>

      </div>
    </>
  );
}
