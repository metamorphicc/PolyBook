import { createAppKit, useAppKit, useDisconnect } from "@reown/appkit/react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMemo } from "react";
import { useAccount, useConnectorClient } from "wagmi";
import { BrowserProvider, JsonRpcSigner } from "ethers";
import { initPolymarketClient } from "./verifyUser";
import { useBalance } from "wagmi";
import { formatUnits } from "viem";

function useEthersSigner() {
  const { data: client } = useConnectorClient();
  return useMemo(() => {
    if (!client) return undefined;
    const { account, chain, transport } = client;
    const network = {
      chainId: chain.id,
      name: chain.name,
      ensAddress: chain.contracts?.ensRegistry?.address,
    };
    const provider = new BrowserProvider(transport, network);
    return new JsonRpcSigner(provider, account?.address);
  }, [client]);
}

export default function CustomConnect() {
  const signer = useEthersSigner();
  const { address, isConnected, status } = useAppKitAccount();
  const { open, close } = useAppKit();
  const { disconnect } = useDisconnect();
  const [nonce, setNonce] = useState<any>();
  const [authDone, setAuthDone] = useState(false);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [safe, setSafe] = useState<any>();
  const [client, setClient] = useState<any>();
  const [safeAddress, setSafeAddress] = useState();
  const { data: balance } = useBalance({
    address: safeAddress,
    query: {
      enabled: !!safeAddress,
    },
  });
  const formattedBalance =
    balance && balance.value
      ? formatUnits(balance.value, balance.decimals)
      : "0.00";
  useEffect(() => {
    setLoading(true);
    if (isConnected || address || authDone) return;
    console.log(`useeffect`)

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
        console.log("balance: ", formattedBalance);
        const tradingClient = await initPolymarketClient(signer, proxyAddress);
        setClient(tradingClient);

        setAuthDone(true);
      } catch {}
    };

    const getSafeWallet = async () => {
      const safeRow = await fetch("/api/user/safe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerAddress: address }),
      });
      setSafe(JSON.stringify(safeRow));
      console.log(`status: ${status}`);
    };

    getSafeWallet();
    initAccount();
    setLoading(false);
  }, [isConnected, address, status]);
  console.log(safeAddress);
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
          <div className="flex px-3">
            <div className="flex items-center">
              <span className="flex items-center flex-col">
                Cash: <p className="ml-1 text-[14x]">{formattedBalance} POL</p>
              </span>
            </div>
            <div>
              <span>In-trade: $0.00</span>
            </div>
          </div>
          <button
            onClick={() => {
              router.push("/scalp");
            }}
            className="border rounded-md px-4 w-[110px] py-1.5 bg-sky-300/70 transition border-sky-300/50 hover:bg-sky-300 cursor-pointer md:text-[13px] md:w-[90px] mr-9"
          >
            Scalping
          </button>

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
