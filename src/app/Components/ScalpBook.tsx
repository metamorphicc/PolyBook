"use client"

import { useEffect, useState } from "react"
import clsx from "clsx"

type GammaEvent = {
  id: string
  question: string
  markets: GammaMarket[]
}

type GammaMarket = {
  id: string
  question: string
  slug: string
  enableOrderBook: boolean
}

type Side = "buy" | "sell"

type Level = {
  price: number
  size: number
}

type DemoOrder = {
  id: string
  side: Side
  price: number
}

export default function ScalpTerminal2() {
  const [market, setMarket] = useState<GammaMarket | null>(null)
  const [bids, setBids] = useState<Level[]>([])
  const [asks, setAsks] = useState<Level[]>([])
  const [orders, setOrders] = useState<DemoOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMarket() {
      setLoading(true)

      const res = await fetch("/api/gamma/search?q=bitcoin", { cache: "no-store" })
      const data = await res.json()

      console.log("events:", data.events)

      const event: GammaEvent | undefined =
        data?.events?.[Math.floor(Math.random() * data.events.length)]

      if (!event || !event.markets?.length) {
        setLoading(false)
        return
      }

      const m = event.markets[0]
      console.log("chosen market:", m)

      setMarket(m)
      setLoading(false)
    }

    loadMarket()
  }, [])

  useEffect(() => {
    if (!market) return

    let alive = true

    async function loadBook() {
      try {
        const mid = 0.5

        const fakeBids: Level[] = Array.from({ length: 10 }, (_, i) => ({
          price: Number((mid - i * 0.01).toFixed(2)),
          size: Math.floor(Math.random() * 1000) / 10,
        }))

        const fakeAsks: Level[] = Array.from({ length: 10 }, (_, i) => ({
          price: Number((mid + i * 0.01).toFixed(2)),
          size: Math.floor(Math.random() * 1000) / 10,
        }))

        if (!alive) return

        setBids(fakeBids)
        setAsks(fakeAsks)
        setLoading(false)
      } catch (e) {
        console.error(e)
      }
    }

    loadBook()
    const i = setInterval(loadBook, 500)

    return () => {
      alive = false
      clearInterval(i)
    }
  }, [market])

  function placeOrder(side: Side, price: number) {
    setOrders((prev) => [
      {
        id: crypto.randomUUID(),
        side,
        price,
      },
      ...prev,
    ])
  }

  function hasOrder(side: Side, price: number) {
    return orders.some((o) => o.side === side && o.price === price)
  }

  if (loading || !market) {
    return (
      <div className="p-4 text-zinc-400 text-sm">
        Loading scalp terminal…
      </div>
    )
  }

  return (
    <div className="w-full bg-zinc-900 border h-full border-zinc-700 rounded-md overflow-hidden font-mono text-xs">
      <div className="px-3 py-2 border-b border-zinc-700">
        <div className="text-zinc-300">
          {market.question ?? market.slug}
        </div>
        <div className="text-zinc-500 text-[10px]">
          Demo scalp · Polymarket · BTC
        </div>
      </div>

      <div className="flex">
        <div className="flex-1 border-r border-zinc-700">
          {bids.map((l) => (
            <div
              key={`bid-${l.price}`}
              onClick={() => placeOrder("buy", l.price)}
              className={clsx(
                "relative flex justify-between px-2 py-[2px] cursor-pointer",
                "hover:bg-green-500/10",
                hasOrder("buy", l.price) && "bg-green-500/30"
              )}
            >
              <span className="text-green-400">
                {l.price.toFixed(2)}
              </span>
              <span className="text-zinc-400">
                {l.size}
              </span>

              {hasOrder("buy", l.price) && (
                <span className="absolute right-1 text-green-300">
                  ●
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="flex-1">
          {asks.map((l) => (
            <div
              key={`ask-${l.price}`}
              onClick={() => placeOrder("sell", l.price)}
              className={clsx(
                "relative flex justify-between px-2 py-[2px] cursor-pointer",
                "hover:bg-red-500/10",
                hasOrder("sell", l.price) && "bg-red-500/30"
              )}
            >
              <span className="text-red-400">
                {l.price.toFixed(2)}
              </span>
              <span className="text-zinc-400">
                {l.size}
              </span>

              {hasOrder("sell", l.price) && (
                <span className="absolute right-1 text-red-300">
                  ●
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-3 py-1 border-t border-zinc-700 text-[10px] text-zinc-500">
        Orders are simulated · Click on book to place
      </div>
    </div>
  )
}