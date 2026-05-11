// "use client";

// import { useMemo } from "react";
// import { RelayClient } from "@polymarket/builder-relayer-client";
// import { BuilderConfig } from "@polymarket/builder-signing-sdk";

// export function useRelayClient(ethersSigner: any) {
//   return useMemo(() => {
//     if (!ethersSigner) return null;

//     const builderConfig = new BuilderConfig({
//       remoteBuilderConfig: {
//         url: "/api/polymarket/sign",
//       },
//     });

//     return new RelayClient(
//       "https://relayer-v2.polymarket.com/",
//       137,
//       ethersSigner,
//       builderConfig
//     );
//   }, [ethersSigner]);
// }

// async function ensureSafe(relayClient: RelayClient): Promise<string> {
//     // можешь заранее знать safeAddress или дать relayer'у самому
//     const response = await relayClient.deploy(); // попросит сигнатуру 1 раз
//     const result = await relayClient.pollUntilState(
//       response.transactionID,
//       [
//         RelayerTransactionState.STATE_MINED,
//         RelayerTransactionState.STATE_CONFIRMED,
//         RelayerTransactionState.STATE_FAILED,
//       ],
//       "60",
//       3000
//     );
//     return result.proxyAddress; // safeAddress
//   }