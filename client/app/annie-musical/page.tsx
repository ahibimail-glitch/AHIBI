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
  const [showTnC, setShowTnC] = useState(false);
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
      <Navbar />
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
              <div className="mt-6 sm:mt-8 md:mt-10 p-2 sm:p-4 bg-white rounded-2xl shadow-md border border-slate-200">
                <button
                  className="w-full text-left flex justify-between items-center font-semibold text-slate-900"
                  onClick={() => setShowTnC(!showTnC)}
                >
                  TERMS & CONDITIONS
                  <span className="ml-2 text-slate-500">{showTnC ? "▲" : "▼"}</span>
                </button>

                {showTnC && (
                  <div className="mt-4 text-sm sm:text-base md:text-base text-slate-700 space-y-2">
                    <p><strong>1. General</strong><br />
                      By purchasing a ticket for the “Annie Musical” (“Event”), the ticket holder (“Attendee”) agrees to these Terms & Conditions.
                      <ul className="list-disc list-inside">
                        <li>These terms apply to all ticket categories and price tiers.</li>
                        <li>This agreement is governed by the laws of Nagaland, India.</li>
                      </ul>
                    </p>

                    <p><strong>2. Ticketing & Entry</strong>
                      <ul className="list-disc list-inside">
                        <li>The QR code on your ticket is valid for one (1) entry per scan for the specific show (matinee or evening) and seat for which it was purchased.</li>
                        <li>Valid QR ticket required for entry; management may request proof of ID or the original card used for purchase.</li>
                        <li>Management may refuse admission for disorderly conduct without refund.</li>
                        <li>Late arrivals will be seated at an appropriate break in the performance.</li>
                      </ul>
                    </p>

                    <p><strong>3. Refunds, Cancellation & Rescheduling</strong>
                      <ul className="list-disc list-inside">
                        <li>All sales are final. Tickets are non-refundable, non-transferable, and not redeemable for cash, except as explicitly stated.</li>
                        <li>Event cancellation: full refund provided.</li>
                        <li>User-initiated refunds within 48 hours of purchase and at least 7 days before the show are eligible.</li>
                        <li>Organizers are not responsible for lost, stolen, or damaged tickets.</li>
                      </ul>
                    </p>

                    <p><strong>4. Prohibited Items & Behavior</strong>
                      <ul className="list-disc list-inside">
                        <li>No outside food, beverages, tobacco, weapons, illegal substances, cameras, or recording devices.</li>
                        <li>No unauthorized photography, audio, or video recording. Phones and devices must be silent.</li>
                        <li>Organizers may evict attendees for misconduct or unsafe behavior without refund.</li>
                      </ul>
                    </p>

                    <p><strong>5. Intellectual Property</strong><br />
                      The Event is under license. All music, script, and imagery are copyrighted. Unauthorized use is illegal.
                    </p>

                    <p><strong>6. Liability</strong><br />
                      Attendees assume all risks. Organizers are not responsible for injury, loss, or damage to personal belongings.
                    </p>

                    <p><strong>7. Media & Photography</strong><br />
                      Attendees consent to being photographed or recorded for promotional purposes without compensation.
                    </p>

                    <p><strong>8. Organizer Rights</strong>
                      <ul className="list-disc list-inside">
                        <li>Notify attendees of cancellations/rescheduling using purchase contact info.</li>
                        <li>Change program, venue, or cast if necessary.</li>
                        <li>Disputes are settled via mutually agreed arbitration.</li>
                      </ul>
                    </p>

                    <p><strong>9. Contact & Support</strong><br />
                      📧 connect@ahibi.in <br />
                      🌐 www.ahibi.in
                    </p>
                  </div>
                )}
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
