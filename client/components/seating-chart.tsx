"use client"

import { useMemo, useCallback, useState, useEffect } from "react"
import { useSeatsStore, type Seat } from "@/store/seats-store"
import { useToast } from "@/hooks/use-toast"

// Memoized Legend component
const Legend = () => {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200">
      <h3 className="text-sm font-semibold text-slate-700 mb-2 sm:mb-3 text-center">Seat Categories & Pricing</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-red-500 flex-shrink-0" aria-hidden />
          <span className="font-medium">Row X - ₹1,500</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-cyan-500 flex-shrink-0" aria-hidden />
          <span className="font-medium">Rows A-C - ₹1,200</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-emerald-500 flex-shrink-0" aria-hidden />
          <span className="font-medium">Rows D-N - ₹500</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-yellow-400 flex-shrink-0" aria-hidden />
          <span className="text-slate-600">Held</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-gray-300 flex-shrink-0" aria-hidden />
          <span className="text-slate-600">Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-sky-500 ring-1 sm:ring-2 ring-sky-300 flex-shrink-0" aria-hidden />
          <span className="text-slate-600">Selected</span>
        </div>
      </div>
    </div>
  )
}

// Memoized seat component
const SeatButton = ({ 
  seat, 
  rowId, 
  isSelected, 
  onSeatClick 
}: { 
  seat: Seat
  rowId: string
  isSelected: boolean
  onSeatClick: (id: string) => void
}) => {
  const { id, status, number, price } = seat
  const isBooked = status === "booked"
  const isLocked = status === "selected" && !isSelected

  const getSeatColor = useCallback((price: number) => {
    if (price === 1500) return "bg-red-500 hover:bg-red-400 active:bg-red-600 text-white"
    if (price === 1000) return "bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-white"
    return "bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white"
  }, [])

  const baseClasses = useMemo(() => {
    if (isBooked) return "bg-gray-300 text-gray-500 cursor-not-allowed"
    if (isLocked) return "bg-yellow-400 text-white cursor-not-allowed"
    return getSeatColor(price)
  }, [isBooked, isLocked, price, getSeatColor])

  const ringClasses = isSelected ? "ring-2 sm:ring-3 ring-sky-400 ring-offset-1" : ""

  const handleClick = useCallback(() => {
    if (!isBooked && !isLocked) {
      onSeatClick(id)
    }
  }, [id, isBooked, isLocked, onSeatClick])

  return (
    <button
      onClick={handleClick}
      disabled={isBooked || isLocked}
      className={`
        w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8
        rounded-lg text-[9px] sm:text-[10px] md:text-xs 
        font-bold flex items-center justify-center 
        transition-all duration-200 ease-in-out
        touch-manipulation select-none
        ${baseClasses} ${ringClasses}
        ${!isBooked && !isLocked ? 'transform hover:scale-110 active:scale-95 shadow-sm hover:shadow-md' : ''}
      `}
      aria-label={`Seat ${rowId}${number}, Price ₹${price}${isBooked ? ', Booked' : isLocked ? ', In Progress' : isSelected ? ', Selected' : ', Available'}`}
    >
      {number}
    </button>
  )
}

export default function SeatingChart() {
  const { seats, toggleSeat, selectedIds } = useSeatsStore()
  const { toast } = useToast()
  const [isMobile, setIsMobile] = useState(false)

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Organize seats by rows in a single line (BookMyShow style)
  const rows = useMemo(() => {
    const grouped: Record<string, Seat[]> = {}
    const seatEntries = Object.values(seats)
    
    // Group seats by row
    seatEntries.forEach(seat => {
      if (!grouped[seat.row]) {
        grouped[seat.row] = []
      }
      grouped[seat.row].push(seat)
    })

    // Sort seats within each row by number
    Object.keys(grouped).forEach(rowId => {
      grouped[rowId].sort((a, b) => a.number - b.number)
    })

    // Sort rows with X at bottom, others reverse alphabetically  
    return Object.entries(grouped).sort(([rowA], [rowB]) => {
      if (rowA === 'X') return 1
      if (rowB === 'X') return -1
      return rowB.localeCompare(rowA)
    })
  }, [seats])

  // Optimized seat click handler
  const handleSeatClick = useCallback((seatId: string) => {
    const seat = seats[seatId]
    if (!seat) return

    const { status, row, number } = seat

    if (status === "booked") {
      toast({ 
        title: "Seat unavailable", 
        description: `Seat ${row}${number} is already booked.`, 
        variant: "destructive",
        duration: 3000
      })
      return
    }

    if (status === "selected" && !selectedIds.includes(seatId)) {
      toast({ 
        title: "Seat in progress", 
        description: `Seat ${row}${number} is being booked. Try again soon.`, 
        variant: "destructive",
        duration: 3000
      })
      return
    }

    toggleSeat(seatId)
  }, [seats, selectedIds, toggleSeat, toast])

  // Split seats into left and right sections for aisle
  const createRowWithAisle = useCallback((seats: Seat[]) => {
    // Reverse the order within each row so seats fill in reverse order
    const reversed = [...seats].reverse()
    const totalSeats = reversed.length
    const leftCount = Math.floor(totalSeats / 2)

    return {
      left: reversed.slice(0, leftCount),
      right: reversed.slice(leftCount)
    }
  }, [])

  return (
    <div className="w-full bg-gradient-to-b from-slate-50 to-white rounded-xl p-3 sm:p-4 md:p-5 shadow-sm border border-slate-200">
      {/* Legend */}
      <div className="mb-4 sm:mb-5">
        <Legend />
      </div>
      {/* Booking Notice */}
      <div className="mb-4 sm:mb-6">
        <div className="relative overflow-hidden rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50 to-white shadow-sm">
          <div className="absolute -left-6 -top-6 h-20 w-20 rounded-full bg-amber-200/40 blur-2xl" />
          <div className="flex items-start gap-3 p-3 sm:p-4">
            <div className="mt-0.5 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-amber-500 text-white shadow">
              ⚠️
            </div>
            <div className="text-xs sm:text-sm text-slate-700">
              <div className="font-semibold text-amber-800">Important booking notice</div>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                <li>
                  Once you select a seat, ensure you have a stable internet connection and complete the
                  payment within <span className="font-semibold text-amber-800">10 minutes</span>. Otherwise,
                  your selection will be released and you may need to start again.
                </li>
                <li>
                  If you face any payment failure, please contact us via WhatsApp or email.
                </li>
              </ul>
              <div className="mt-2 flex items-center gap-2 text-[11px] sm:text-xs text-amber-700">
                <span>⏳ Hold window: 10 minutes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Theater Layout */}
      <div className="space-y-4 sm:space-y-5">
        {/* Entry indicator */}
        <div className="flex justify-center">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-4 sm:px-6 md:px-8 py-1.5 sm:py-2 font-bold text-xs sm:text-sm md:text-base rounded-lg shadow-lg">
            🚪 ENTRANCE
          </div>
        </div>

        {/* Seating Chart */}
        <div className="overflow-x-auto pb-2">
          <div className="flex flex-col items-center gap-1.5 sm:gap-2 md:gap-3 min-w-fit px-2">
            {rows.map(([rowId, rowSeats]) => {
              const { left, right } = createRowWithAisle(rowSeats)
              const rowPrice = rowSeats[0]?.price

              return (
                <div key={rowId} className="flex items-center justify-center gap-1.5 sm:gap-2 md:gap-3 w-full">
                  {/* Row Label */}
                  <div className="w-8 sm:w-10 md:w-12 flex-shrink-0 text-center">
                    <div className="text-xs sm:text-sm md:text-base font-bold text-slate-700">{rowId}</div>
                    <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5">₹{rowPrice}</div>
                  </div>

                  {/* Left Section */}
                  <div className="flex gap-0.5 sm:gap-1 md:gap-1.5">
                    {left.map((seat) => (
                      <SeatButton
                        key={seat.id}
                        seat={seat}
                        rowId={rowId}
                        isSelected={seat.status === "selected" && selectedIds.includes(seat.id)}
                        onSeatClick={handleSeatClick}
                      />
                    ))}
                  </div>

                  {/* Center Aisle */}
                  <div className="w-4 sm:w-6 md:w-8 flex-shrink-0 flex justify-center">
                    <div className="w-0.5 h-6 sm:h-7 md:h-8 bg-gradient-to-b from-slate-300 to-slate-400 opacity-60 rounded-full" />
                  </div>

                  {/* Right Section */}
                  <div className="flex gap-0.5 sm:gap-1 md:gap-1.5">
                    {right.map((seat) => (
                      <SeatButton
                        key={seat.id}
                        seat={seat}
                        rowId={rowId}
                        isSelected={seat.status === "selected" && selectedIds.includes(seat.id)}
                        onSeatClick={handleSeatClick}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Stage */}
        <div className="flex justify-center">
          <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 text-black px-6 sm:px-8 md:px-12 py-2 sm:py-2.5 font-bold text-xs sm:text-sm md:text-base rounded-lg shadow-lg border-2 border-yellow-500">
            🎭 SCREEN / STAGE
          </div>
        </div>

        {/* Washrooms */}
        <div className="flex justify-between items-center max-w-3xl mx-auto px-2">
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded-lg shadow">
            🚻 WASHROOM
          </div>
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded-lg shadow">
            WASHROOM 🚻
          </div>
        </div>
      </div>

      {/* Mobile Selection Summary - Only show on mobile when cart is not visible */}
      {selectedIds.length > 0 && isMobile && (
        <div className="fixed bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm border-2 border-sky-200 rounded-xl shadow-2xl p-4 z-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-900">
                {selectedIds.length} seat{selectedIds.length !== 1 ? 's' : ''} selected
              </div>
              <div className="text-xs text-slate-600">
                Total: ₹{selectedIds.reduce((total, id) => total + (seats[id]?.price || 0), 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm">
              View Cart
            </div>
          </div>
        </div>
      )}
    </div>
  )
}