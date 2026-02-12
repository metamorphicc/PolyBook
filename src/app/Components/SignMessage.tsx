import { useAppKitAccount } from "@reown/appkit/react";
import { useEffect } from "react";
import { useSignMessage } from "wagmi";

export default function SignMessage() {
  const { address, isConnected } = useAppKitAccount();
  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    if (!address || !isConnected) return;

    (async () => {
      const res = await fetch("/api/getNonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      const messageToSign = await res.text();

      const signed = await signMessageAsync({ message: messageToSign });

      console.log("signature:", signed);

      const row = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, message: "fdsf", signed }),
      });
    })();
  }, [address, isConnected, signMessageAsync]);

  return null;
}
