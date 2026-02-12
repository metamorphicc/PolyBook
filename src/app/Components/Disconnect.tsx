import { useAppKit } from "@reown/appkit/react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useDisconnect } from "@reown/appkit/react";

export default function CustomDisconnect() {
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAppKitAccount();

  return (
    <>
      <div>
        <button
          onClick={() => {
            disconnect({ namespace: "eip155" });
          }}
        >
            отключить

        </button>
      </div>
    </>
  );
}
