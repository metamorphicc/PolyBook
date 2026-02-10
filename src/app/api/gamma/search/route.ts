import { NextResponse } from "next/server"

const GAMMA_HOST = "https://gamma-api.polymarket.com"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? "bitcoin"

  const url = new URL(`${GAMMA_HOST}/public-search`)
  url.searchParams.set("q", q)
  url.searchParams.set("active", "true")
  url.searchParams.set("limit", "10")

  const res = await fetch(url.toString(), {
    headers: {
      "accept": "application/json",
    },
    cache: "no-store",
  })

  const data = await res.json()
  return NextResponse.json(data)
}
