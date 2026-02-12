import { useAppKit } from "@reown/appkit/react";
import { useAppKitAccount } from "@reown/appkit/react";
import SignMessage from "./SignMessage";

export default function CustomConnect() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  return (
    <>
      <div>
        <button
          onClick={() => {
            open({ view: "Connect" });
          }}
          className="cursor-pointer"
        >
          коннект валлет
        </button>

      </div>
    </>
  );
}
