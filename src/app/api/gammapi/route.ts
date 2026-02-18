import { NextResponse } from "next/server"

const GAMMA_HOST = "https://gamma-api.polymarket.com/markets"

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
