import { NextResponse } from "next/server"


const nowSec = Math.floor(Date.now() / 1000);
const h1 = 3600
const roundStartUnix = Math.floor(nowSec / h1) * h1;

const GAMMA_HOST = "https://gamma-api.polymarket.com/tags/slug/15M"



export async function GET(req: Request) {
  const res = await fetch(GAMMA_HOST, {
    headers: {
      "accept": "application/json",
    },
    cache: "no-store",
  })

  const data = await res.json()
  return NextResponse.json(data)
}
