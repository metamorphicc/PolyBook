"use client"
import { useAppKitAccount } from "@reown/appkit/react"
import { useAppKitBalance } from "@reown/appkit/react";
import { useEffect, useState } from "react";
export default function Profile() {
    const {address, isConnected, status} = useAppKitAccount();
    const {fetchBalance} = useAppKitBalance();
    const [balance, setBalance] = useState<any>(null);

    useEffect(() => {
        (async () => {
            const balance = await fetchBalance()
            setBalance(balance)
        })()
    })
    return (<>
        <div>
            <p>
                {`Profile: ${address}`}
                {`Balance: ${JSON.stringify(balance)}`}
            </p>
        </div>
    </>)

}
