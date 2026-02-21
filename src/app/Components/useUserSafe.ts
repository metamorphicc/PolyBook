import { RelayClient, RelayerTxType } from '@polymarket/builder-relayer-client'
import { BuilderConfig } from '@polymarket/builder-signing-sdk'
import { createWalletClient, http } from 'viem'
import { polygon } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const RELAYER_URL = 'https://relayer-v2.polymarket.com/'
const RPC_URL = process.env.NEXT_PUBLIC_POLYGON_RPC!

const BUILDER_API_KEY = process.env.POLY_BUILDER_API_KEY!
const BUILDER_SECRET = process.env.POLY_BUILDER_SECRET!
const BUILDER_PASSPHRASE = process.env.POLY_BUILDER_PASSPHRASE!

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`)

const wallet = createWalletClient({
  account,
  chain: polygon,
  transport: http(RPC_URL),
})

const builderConfig = new BuilderConfig({
  localBuilderCreds: {
    key: BUILDER_API_KEY,
    secret: BUILDER_SECRET,
    passphrase: BUILDER_PASSPHRASE,
  },
})

export function getRelayClient() {
  return new RelayClient(
    RELAYER_URL,
    137,
    wallet,
    builderConfig,
    RelayerTxType.SAFE
  )
}
