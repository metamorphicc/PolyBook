import { RelayClient } from '@polymarket/builder-relayer-client'

const BUILDER_API_KEY = process.env.NEXT_PUBLIC_PM_BUILDER_KEY!
const BUILDER_SECRET = process.env.PM_BUILDER_SECRET! 
const BUILDER_PASSPHRASE = process.env.PM_BUILDER_PASSPHRASE!

export function getRelayClient() {
  return new RelayClient(
    BUILDER_API_KEY,
    BUILDER_SECRET as any ,
    BUILDER_PASSPHRASE as any,
    137 as any, 
    'https://builder-relayer.polymarket.com' as any
  )
}
