import {
  createSecureClient,
  remoteBuilderSigning,
} from "@polymarket/client";
import { signerFrom } from "@polymarket/client/ethers-v5";
import {
  ClobClient,
  SignatureTypeV2,
  type ApiKeyCreds as LegacyApiKeyCreds,
  type ClobClientOptions,
} from "@polymarket/clob-client-v2";
import type { ethers } from "ethers";

const HOST = "https://clob.polymarket.com";
const CHAIN = 137;
const BUILDER_SIGNING_URL = "/api/polymarket-builder-sign";

type WalletFlow = "deposit-wallet" | "proxy" | "gnosis-safe";
type StoredApiKeyCreds = {
  key: string;
  secret: string;
  passphrase: string;
};

export type PolymarketClientSession = {
  client: ClobClient;
  walletAddress: string;
  ensureTradingApprovals: () => Promise<void>;
};

function isApiKeyCreds(value: unknown): value is StoredApiKeyCreds {
  if (!value || typeof value !== "object") return false;

  const creds = value as Partial<Record<keyof StoredApiKeyCreds, unknown>>;

  return (
    typeof creds.key === "string" &&
    creds.key.length > 0 &&
    typeof creds.secret === "string" &&
    creds.secret.length > 0 &&
    typeof creds.passphrase === "string" &&
    creds.passphrase.length > 0
  );
}

function getSignatureType(flow: WalletFlow) {
  if (flow === "deposit-wallet") return SignatureTypeV2.POLY_1271;
  if (flow === "gnosis-safe") return SignatureTypeV2.POLY_GNOSIS_SAFE;
  return SignatureTypeV2.POLY_PROXY;
}

function buildClient(
  signer: ethers.Signer,
  walletAddress: string,
  flow: WalletFlow,
  creds: LegacyApiKeyCreds,
) {
  return new ClobClient({
    host: HOST,
    chain: CHAIN,
    signer: signer as unknown as ClobClientOptions["signer"],
    creds,
    signatureType: getSignatureType(flow),
    funderAddress: walletAddress.toLowerCase(),
    retryOnError: true,
    throwOnError: true,
  });
}

async function createOfficialClient(
  signer: ethers.Signer,
  walletAddress?: string,
) {
  const adaptedSigner = signerFrom(
    signer as Parameters<typeof signerFrom>[0],
  );
  const shared = {
    signer: adaptedSigner,
    apiKey: remoteBuilderSigning({
      url: BUILDER_SIGNING_URL,
      credentials: "include",
    }),
    ...(walletAddress ? { wallet: walletAddress } : {}),
  };

  return createSecureClient(shared);
}

/**
 * Authenticates the signer against the account wallet with Polymarket's current
 * SDK. Unlike the legacy CLOB helper, this binds the API key to the account
 * wallet, deploys the deterministic Deposit Wallet when needed, and routes its
 * setup transactions through the builder relayer.
 */
export async function initPolymarketClient(
  signer: ethers.Signer,
  walletAddress?: string,
  flow: WalletFlow = "deposit-wallet",
): Promise<PolymarketClientSession> {
  const secureClient = await createOfficialClient(signer, walletAddress);

  await secureClient.setupTradingApprovals();

  const resolvedWallet = secureClient.account.wallet.toLowerCase();
  const credentials = secureClient.credentials;

  if (!isApiKeyCreds(credentials)) {
    throw new Error(
      "Polymarket API credentials are incomplete. Reconnect wallet and try again.",
    );
  }

  return {
    client: buildClient(signer, resolvedWallet, flow, credentials),
    walletAddress: resolvedWallet,
    ensureTradingApprovals: () => secureClient.setupTradingApprovals(),
  };
}
