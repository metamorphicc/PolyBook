'use client'

import { useState } from 'react'

type Market = {
  id: string
  question: string
  clobTokenIds: string
}

type Selected = {
  market: Market | null
  side: 'yes' | 'no' | null
}

export default function MarketsSection({ markets }: { markets: Market[] }) {
  const [selected, setSelected] = useState<Selected>({ market: null, side: null })

  return (
    <>
      <div className="flex flex-col w-full max-h-80 border overflow-y-auto">
        {markets.map((m) => (
          <div
            key={m.id}
            onClick={() => setSelected({ market: m, side: null })}
            className="border p-3 w-full flex justify-between cursor-pointer hover:shadow-lg"
          >
            <div>
              <p className="hover:scale-103 transition">{m.question}</p>
            </div>
            <div className="flex gap-5 text-white">
              <button
                onClick={e => { e.stopPropagation(); setSelected({ market: m, side: 'yes' }) }}
                className="bg-green-500 h-7 cursor-pointer hover:bg-green-400 px-3 rounded-[10px] py-0.5"
              >
                YES
              </button>
              <button
                onClick={e => { e.stopPropagation(); setSelected({ market: m, side: 'no' }) }}
                className="bg-red-500 cursor-pointer h-7 hover:bg-red-400 px-3 rounded-[10px] py-0.5"
              >
                NO
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="w-full flex flex-col h-full p-15 justify-between">
        <div className="w-full h-[60%] w-[50%] border rounded-[40px] items-center flex justify-center p-5">
          {selected.market ? (
            <div className="flex flex-col gap-3 w-full">
              <p className="text-sm font-semibold">{selected.market.question}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelected(s => ({ ...s, side: 'yes' }))}
                  className={`px-4 py-1.5 rounded-[10px] text-white transition ${
                    selected.side === 'yes'
                      ? 'bg-green-600 ring-2 ring-green-300'
                      : 'bg-green-500 hover:bg-green-400'
                  }`}
                >
                  YES
                </button>
                <button
                  onClick={() => setSelected(s => ({ ...s, side: 'no' }))}
                  className={`px-4 py-1.5 rounded-[10px] text-white transition ${
                    selected.side === 'no'
                      ? 'bg-red-600 ring-2 ring-red-300'
                      : 'bg-red-500 hover:bg-red-400'
                  }`}
                >
                  NO
                </button>
              </div>
              {selected.side && (
                <div className="flex flex-col gap-2 mt-1">
                  <input
                    type="number"
                    placeholder="Amount (USDC)"
                    className="border rounded-[10px] px-3 py-1.5 text-sm bg-transparent"
                  />
                  <button className="bg-blue-500 hover:bg-blue-400 text-white rounded-[10px] py-1.5 text-sm">
                    Place Order
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Select a market...</p>
          )}
        </div>
        <div className="p-10 h-[30%] flex items-center justify-center rounded-[40px] flex w-full border">
          Smth
        </div>
      </div>
    </>
  )
}