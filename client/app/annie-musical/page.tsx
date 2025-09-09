"use client"

import { useEffect, useState, useRef } from "react"
import SeatingChart from "@/components/seating-chart"
import CartSummary from "@/components/cart-summary"
import { useSeatsStore } from "@/store/seats-store"
import { ThemeProvider } from "@/components/theme-provider"
import Navbar from "../Navbar"

export default function Page() {
  const fetchSeats = useSeatsStore((state) => state.fetchSeats)
  const seats = useSeatsStore((state) => state.seats)
  const selectedIds = useSeatsStore((state) => state.selectedIds)
  const [loading, setLoading] = useState(true)
  const cartSummaryRef = useRef<HTMLDivElement>(null)
  const [prevSelectedSeatsCount, setPrevSelectedSeatsCount] = useState(0)

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await fetchSeats()
      setLoading(false)
    }
    init()
  }, [fetchSeats])

  // Scroll to cart summary when a seat is selected
  useEffect(() => {
    if (selectedIds.length > prevSelectedSeatsCount && cartSummaryRef.current) {
      cartSummaryRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      })
    }
    setPrevSelectedSeatsCount(selectedIds.length)
  }, [selectedIds.length, prevSelectedSeatsCount])

  return (
    <ThemeProvider attribute="class">
      <Navbar/>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <main className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-4 md:py-6">
          <header className="mb-4 sm:mb-6 text-center lg:text-left">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-balance bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 leading-tight">
              Book Your Seats for Annie Musical
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground mt-1 sm:mt-2 max-w-2xl mx-auto lg:mx-0">
              Select your preferred seats and proceed to secure payment. Experience the magic of Annie Musical live!
            </p>
          </header>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 border-4 border-slate-200 border-t-slate-600 mb-3"></div>
              <p className="text-base sm:text-lg md:text-xl font-medium text-slate-600">Loading seats...</p>
              <p className="text-sm text-slate-500 mt-1">Please wait while we fetch the latest seat availability</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 lg:gap-6">
              <div ref={cartSummaryRef}>
                <CartSummary />
              </div>
              <div>
                <SeatingChart />
              </div>
            </div>
          )}
        </main>
      </div>
    </ThemeProvider>
  )
}
