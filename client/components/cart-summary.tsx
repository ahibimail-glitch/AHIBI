"use client"

import { useMemo, useState } from "react"
import { useSeatsStore } from "@/store/seats-store"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CartSummary() {
  const { seats, selectedIds, setBooked } = useSeatsStore()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuth() // Get user from auth hook

  const selectedSeats = useMemo(() => selectedIds.map((id) => seats[id]).filter(Boolean), [selectedIds, seats])
  const total = useMemo(() => selectedSeats.reduce((sum, s) => sum + s.price, 0), [selectedSeats])

  const handlePay = async () => {
    if (selectedSeats.length === 0 || loading) return
    setLoading(true)
    setMessage(null)

    console.log("handlePay called")

    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!razorpayKeyId) {
      toast({
        title: "Configuration Error",
        description: "Razorpay Key ID is not configured. Please contact support.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token")
      if (!token || !user) {
        toast({ title: "Authentication Error", description: "You must be logged in to book seats.", variant: "destructive" })
        return
      }

      console.log("Creating booking and getting Razorpay order")

      // 1. Create booking and get Razorpay order
      const resp = await fetch("/api/annie-musical/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ seatIds: selectedSeats.map((s) => s._id) }),
      })

      if (!resp.ok) {
        const errorData = await resp.json()
        throw new Error(errorData.message || "Failed to create booking.")
      }

      const { booking, razorpayOrder } = await resp.json()

      console.log("Razorpay order created:", razorpayOrder)

      // 2. Open Razorpay Checkout
      const options = {
        key: razorpayKeyId, // Use the validated key
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "Ahibi",
        description: "Annie Musical Ticket Booking",
        order_id: razorpayOrder.id,
        handler: async function (response: any) {
          // 3. Verify payment and confirm booking
          try {
            console.log("Verifying payment")

            const verificationResp = await fetch("/api/annie-musical/confirm", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                bookingId: booking._id,
              }),
            })

            if (!verificationResp.ok) {
              const errorData = await verificationResp.json()
              throw new Error(errorData.message || "Payment verification failed.")
            }

            const { updatedBooking } = await verificationResp.json()
            setBooked(updatedBooking.seats)
            toast({ title: "Payment Successful!", description: "Your seats are confirmed." })
          } catch (error: any) {
            console.error("Payment verification error:", error)
            toast({ title: "Error", description: error.message, variant: "destructive" })
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone,
        },
        notes: {
          address: "Ahibi Inc.",
        },
        theme: {
          color: "#3399cc",
        },
      }

      console.log("Opening Razorpay Checkout")

      const rzp = new window.Razorpay(options)
      rzp.open()

    } catch (e: any) {
      console.error("Payment Error:", e); // Log the full error
      toast({ title: "Error", description: e?.message || "Something went wrong", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <aside className="w-full ml-32 lg:w-80 lg:sticky lg:top-6 rounded-xl border bg-gradient-to-b from-white to-slate-50 text-card-foreground p-4 shadow-sm">
      <h2 className="text-lg font-semibold mb-2 text-pretty">Your Selection</h2>
      {selectedSeats.length === 0 ? (
        <p className="text-sm text-muted-foreground">No seats selected.</p>
      ) : (
        <ul className="text-sm mb-3 max-h-40 overflow-auto pr-1 space-y-1">
          {selectedSeats.map((s) => (
            <li key={s.id} className="flex items-center justify-between">
              <span className="font-mono">{s.id}</span>
              <span>₹{s.price.toLocaleString("en-IN")}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between border-t pt-2 mt-2">
        <span className="text-sm font-medium">Total</span>
        <span className="text-base font-semibold">₹{total.toLocaleString("en-IN")}</span>
      </div>
      <button
        onClick={handlePay}
        disabled={selectedSeats.length === 0 || loading}
        className="mt-3 w-full rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 text-white py-2.5 disabled:opacity-60 disabled:cursor-not-allowed hover:from-emerald-500 hover:to-emerald-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-600"
        aria-label="Proceed to Pay"
      >
        {loading ? "Processing..." : "Proceed to Pay"}
      </button>
      {message && (
        <p className="mt-2 text-sm" role="status">
          {message}
        </p>
      )}
    </aside>
  )
}
