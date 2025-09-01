"use client"

import { useEffect, useState } from "react"
import SeatingChart from "@/components/seating-chart"
import CartSummary from "@/components/cart-summary"
import { useSeatsStore } from "@/store/seats-store"
import { ThemeProvider } from "@/components/theme-provider"

export default function Page() {
  const fetchSeats = useSeatsStore((state) => state.fetchSeats)
  const seats = useSeatsStore((state) => state.seats)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await fetchSeats()
      setLoading(false)
    }
    init()
  }, [fetchSeats])

  return (
    <ThemeProvider attribute="class">
      <main className="mx-auto max-w-6xl p-4 md:p-6 bg-gradient-to-b from-slate-50 to-white rounded-2xl">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold text-balance bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
            Book Your Seats for Annie
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select your seats and proceed to payment. Seats are held for 10 minutes.
          </p>
        </header>

        {loading ? (
          <div className="text-center py-10">Loading seats...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
            <SeatingChart />
            <CartSummary />
          </div>
        )}
      </main>
    </ThemeProvider>
  )
}
