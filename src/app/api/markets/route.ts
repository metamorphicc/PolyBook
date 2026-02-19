import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const url = `https://gamma-api.polymarket.com/events?active=true&closed=false&order=volume&ascending=false`

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    })

    const data = await res.json()
    
    if (!Array.isArray(data)) return NextResponse.json([])

    return NextResponse.json(data)
  } catch (error) {
    console.error("Fetch error:", error)
    return NextResponse.json({ error: 'Server Error' }, { status: 500 })
  }
}