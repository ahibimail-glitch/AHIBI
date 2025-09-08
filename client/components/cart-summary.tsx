"use client"

import { useMemo, useState } from "react"
import { useSeatsStore } from "@/store/seats-store"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import InvoiceGenerator from "./invoice-generator"

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CartSummary() {
  const { seats, selectedIds, setBooked, clearSelection, fetchSeats } = useSeatsStore()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [showInvoice, setShowInvoice] = useState(false)
  const [invoiceData, setInvoiceData] = useState<any>(null)
  const [paymentProcessed, setPaymentProcessed] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth() // Get user from auth hook

  const selectedSeats = useMemo(() => selectedIds.map((id) => seats[id]).filter(Boolean), [selectedIds, seats])
  const total = useMemo(() => selectedSeats.reduce((sum, s) => sum + s.price, 0), [selectedSeats])

  // Function to check booking status after payment
  const checkBookingStatus = async (bookingId: string, attempts = 0) => {
    if (attempts > 10) return; // Max 10 attempts (50 seconds)
    
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const resp = await fetch(`/api/annie-musical/booking/${bookingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (resp.ok) {
        const data = await resp.json();
        if (data.booking && data.booking.status === 'confirmed') {
          toast({ 
            title: "Booking Confirmed!", 
            description: "Your payment has been verified and seats are confirmed.",
          });
          return;
        }
      }
      
      // Try again after 5 seconds
      setTimeout(() => checkBookingStatus(bookingId, attempts + 1), 5000);
    } catch (error) {
      console.error("Error checking booking status:", error);
    }
  };

  const handlePay = async () => {
    if (selectedSeats.length === 0 || loading) return
    setLoading(true)
    setMessage(null)
    setPaymentProcessed(false)

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
          try {
            console.log("Payment completed:", response.razorpay_payment_id)
            setPaymentProcessed(true)
            
            // Directly confirm the booking on the server
            const confirmResp = await fetch("/api/annie-musical/confirm", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                bookingId: booking._id,
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature
              }),
            })
            
            if (!confirmResp.ok) {
              const errorData = await confirmResp.json()
              console.error("Booking confirmation failed:", errorData)
              toast({ 
                title: "Payment Processed", 
                description: "Your payment was successful, but we couldn't confirm your booking. Please contact support.",
                variant: "destructive"
              })
              return
            }
            
            const confirmData = await confirmResp.json()
            console.log("Booking confirmed:", confirmData)
            
            // Generate invoice data after confirmation
            const invoiceInfo = {
              bookingId: booking._id,
              eventTitle: "Annie Musical",
              eventDate: "2025-10-18", // You should get this from the event data
              eventTime: "17:30", // You should get this from the event data
              eventLocation: "Mumbai Theatre, Mumbai",
              seats: selectedSeats.map(seat => ({
                id: seat.id,
                price: seat.price,
                category: "General" // Use a default value directly
              })),
              totalAmount: total,
              paymentId: response.razorpay_payment_id,
              transactionId: response.razorpay_order_id,
              customerName: user.name,
              customerEmail: user.email,
              customerPhone: user.phone,
              bookingDate: new Date().toISOString(),
              ticketType: "Annie Musical Ticket",
              benefits: ["Entry to Annie Musical", "Reserved Seating", "Digital Ticket"],
              status: "Confirmed"
            } 

            
            setInvoiceData(invoiceInfo)
            console.log(invoiceInfo)
            setShowInvoice(true)
            
            toast({ 
              title: "Booking Confirmed!", 
              description: "Your payment was successful and your seats are confirmed." 
            })
            
            // Mark seats as booked in the UI
            setBooked(selectedSeats.map(s => s.id))
            
            // Clear selected seats and refresh available seats
            clearSelection()
            fetchSeats()
          } catch (error) {
            console.error("Error confirming booking:", error)
            toast({ 
              title: "Error", 
              description: "There was an error confirming your booking. Please contact support.",
              variant: "destructive"
            })
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
        // Handle payment failure
        modal: {
          ondismiss: function() {
            setLoading(false)
            console.log("Payment modal dismissed")
          }
        }
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

  if (showInvoice && invoiceData) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
        <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
          <div className="p-4 sm:p-6 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white sticky top-0 z-10">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Booking Confirmation</h2>
            <button
              onClick={() => setShowInvoice(false)}
              className="text-slate-400 hover:text-slate-600 text-2xl sm:text-3xl font-light transition-colors"
            >
              ×
            </button>
          </div>
          <div className="p-4 sm:p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
      <span className="text-white text-sm font-bold">✓</span>
    </div>
    <div>
      <h3 className="font-semibold text-green-800 mb-1">Payment Processed Successfully</h3>
    </div>
  </div>
</div>

          <div className="flex-1 overflow-y-auto">
            <InvoiceGenerator 
              invoiceData={invoiceData}
              onDownload={() => {
                toast({ title: "Invoice Downloaded", description: "Your booking receipt has been saved successfully!" })
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Mobile Cart - Sticky at top on mobile */}
      <div className="xl:hidden mb-6">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">Your Selection</h2>
            {selectedSeats.length > 0 && (
              <div className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-sm font-medium">
                {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          
          {selectedSeats.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🎭</span>
              </div>
              <p className="text-slate-500 font-medium">No seats selected</p>
              <p className="text-sm text-slate-400 mt-1">Choose your preferred seats from the chart below</p>
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
                {selectedSeats.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-slate-700 bg-white px-2 py-1 rounded">{s.id}</span>
                      <span className="text-sm text-slate-600">Row {s.row}</span>
                    </div>
                    <span className="font-semibold text-slate-800">₹{s.price.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold text-slate-800">Total Amount</span>
                  <span className="text-2xl font-bold text-slate-900">₹{total.toLocaleString("en-IN")}</span>
                </div>
                
                <button
                  onClick={handlePay}
                  disabled={selectedSeats.length === 0 || loading}
                  className="w-full py-3 sm:py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-emerald-500 hover:to-emerald-400 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Processing...
                    </div>
                  ) : (
                    "Proceed to Pay"
                  )}
                </button>
              </div>
            </>
          )}
          
          {message && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700" role="status">{message}</p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Cart - Sidebar */}
      <aside className="hidden xl:block w-full sticky top-6">
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Your Selection</h2>
            {selectedSeats.length > 0 && (
              <div className="bg-sky-100 text-sky-700 px-2 py-1 rounded-full text-xs font-medium">
                {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          
          {selectedSeats.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🎭</span>
              </div>
              <p className="text-slate-500 font-medium">No seats selected</p>
              <p className="text-xs text-slate-400 mt-1">Choose your preferred seats from the seating chart</p>
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
                {selectedSeats.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">{s.id}</span>
                      <div>
                        <div className="text-sm font-medium text-slate-700">Row {s.row}, Seat {s.number}</div>
                        <div className="text-xs text-slate-500">Annie Musical</div>
                      </div>
                    </div>
                    <span className="font-bold text-slate-800">₹{s.price.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold text-slate-800">Total Amount</span>
                  <span className="text-2xl font-bold text-slate-900">₹{total.toLocaleString("en-IN")}</span>
                </div>
                
                <button
                  onClick={handlePay}
                  disabled={selectedSeats.length === 0 || loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:from-emerald-500 hover:to-emerald-400 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Processing Payment...
                    </div>
                  ) : (
                    "Proceed to Pay"
                  )}
                </button>
              </div>
            </>
          )}
          
          {message && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700" role="status">{message}</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
