import { useAppKitAccount } from "@reown/appkit/react";
import { useEffect, useRef } from "react";
import { useSignMessage } from "wagmi";

export default function SignMessage() {
  const { address, isConnected } = useAppKitAccount();
  const { signMessageAsync } = useSignMessage();
  const calledRef = useRef(false);
  console.log("entry sign message")

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!address || !isConnected || token) return;
    if (calledRef.current) return;
    calledRef.current = true;
    (async () => {
      const res = await fetch("http://localhost:8089/api/getNonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      console.log(`res from signmes${res}`);
      const messageToSign = await res.text();
      console.log(`msg to sign: ${messageToSign}`);

      const sighed = await signMessageAsync({ message: messageToSign });

      console.log("signature:", sighed);

      const token = await fetch("http://localhost:8089/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, message: messageToSign, sighed }),
      });
      const { verifyToken } = await token.json();
      if (typeof window !== "undefined") {
        localStorage.setItem("auth_token", verifyToken);
      }
    })();
  }, [address, isConnected, signMessageAsync]);

  return null;
}
