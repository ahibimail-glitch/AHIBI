"use client"

import { useMemo } from "react"
import { useSeatsStore, type Seat } from "@/store/seats-store"
import { useToast } from "@/hooks/use-toast"

function Legend() {
  // Note: This could be made dynamic if pricing tiers are complex
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 rounded bg-red-500" aria-hidden />
        <span>Row X - ₹1,500</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 rounded bg-cyan-500" aria-hidden />
        <span>Rows A-C - ₹1,200</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 rounded bg-emerald-500" aria-hidden />
        <span>Rows D-N - ₹500</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 rounded bg-yellow-400" aria-hidden />
        <span>In progress (held)</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 rounded bg-gray-300" aria-hidden />
        <span>Booked</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 rounded bg-sky-500 ring-2 ring-sky-300" aria-hidden />
        <span>Selected</span>
      </div>
    </div>
  )
}

export default function SeatingChart() {
  const { seats, toggleSeat, selectedIds } = useSeatsStore()
  const { toast } = useToast()

  const rows = useMemo(() => {
    const grouped: Record<string, { left: Seat[]; right: Seat[] }> = {}
    for (const seat of Object.values(seats)) {
      if (!grouped[seat.row]) {
        grouped[seat.row] = { left: [], right: [] }
      }
    }

    // Sort all seats by number first
    const sortedSeats = Object.values(seats).sort((a, b) => a.number - b.number);

    // Distribute seats into left and right sections
    for (const seat of sortedSeats) {
        const row = grouped[seat.row];
        // The first half of seats in a row goes to the left, the rest to the right.
        // This relies on the total number of seats per row being even.
        if (row.left.length < (Object.values(seats).filter(s => s.row === seat.row).length / 2)) {
            row.left.push(seat);
        } else {
            row.right.push(seat);
        }
    }

    // Sort rows reverse-alphabetically, with 'X' at the very bottom
    return Object.entries(grouped).sort(([rowA], [rowB]) => {
      if (rowA === 'X') return 1;
      if (rowB === 'X') return -1;
      return rowB.localeCompare(rowA);
    });
  }, [seats])

  const getSeatColor = (price: number) => {
    if (price === 1500) return "bg-red-500 hover:bg-red-400 text-white"; // Premium
    if (price === 1200) return "bg-cyan-500 hover:bg-cyan-400 text-white"; // Mid
    return "bg-emerald-500 hover:bg-emerald-400 text-white"; // Economy
  };

  return (
    <section className="w-full flex flex-col items-center">
      <div className="mb-6">
        <Legend />
      </div>

      <div className="bg-black text-white px-4 py-1 mb-4 font-semibold">ENTRY</div>

      <div className="flex flex-col w-full items-center gap-3">
        {rows.map(([rowId, { left, right }]) => (
          <div key={rowId} className="flex items-center justify-center gap-8 w-full max-w-3xl">
            {/* Left Column */}
            <div className="flex flex-1 gap-2 justify-end items-center">
              <div className="w-8 shrink-0 text-sm font-semibold text-slate-700">{rowId}</div>
              {left.map((seat) => {
                const { id, status, number } = seat
                const isSelected = status === "selected" && selectedIds.includes(id)
                const isBooked = status === "booked"
                const isLocked = status === "selected" && !selectedIds.includes(id)
                const baseClasses = isBooked
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : isLocked
                  ? "bg-yellow-400 text-white cursor-not-allowed"
                  : getSeatColor(seat.price);
                const ringClasses = isSelected ? "ring-2 ring-offset-2 ring-sky-400" : ""

                return (
                  <button
                    key={id}
                    onClick={() => {
                      if (isBooked) {
                        toast({ title: "Seat unavailable", description: `Seat ${rowId}${number} is already booked.`, variant: "destructive" })
                        return
                      }
                      if (isLocked) {
                        toast({ title: "Seat in progress", description: `Seat ${rowId}${number} is currently being booked. Please try again soon.`, variant: "destructive" })
                        return
                      }
                      toggleSeat(id)
                    }}
                    disabled={isBooked || isLocked}
                    className={`w-6 h-6 rounded text-[10px] font-medium flex items-center justify-center transition ${baseClasses} ${ringClasses}`}
                    aria-label={`Seat ${rowId}${number}`}
                  >
                    {number}
                  </button>
                )
              })}
            </div>

            {/* Right Column */}
            <div className="flex flex-1 gap-2 justify-start items-center">
              {right.map((seat) => {
                const { id, status, number } = seat
                const isSelected = status === "selected" && selectedIds.includes(id)
                const isBooked = status === "booked"
                const isLocked = status === "selected" && !selectedIds.includes(id)
                const baseClasses = isBooked
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : isLocked
                  ? "bg-yellow-400 text-white cursor-not-allowed"
                  : getSeatColor(seat.price);
                const ringClasses = isSelected ? "ring-2 ring-offset-2 ring-sky-400" : ""

                return (
                  <button
                    key={id}
                    onClick={() => {
                      if (isBooked) {
                        toast({ title: "Seat unavailable", description: `Seat ${rowId}${number} is already booked.`, variant: "destructive" })
                        return
                      }
                      if (isLocked) {
                        toast({ title: "Seat in progress", description: `Seat ${rowId}${number} is currently being booked. Please try again soon.`, variant: "destructive" })
                        return
                      }
                      toggleSeat(id)
                    }}
                    disabled={isBooked || isLocked}
                    className={`w-6 h-6 rounded text-[10px] font-medium flex items-center justify-center transition ${baseClasses} ${ringClasses}`}
                    aria-label={`Seat ${rowId}${number}`}
                  >
                    {number}
                  </button>
                )
              })}
            </div>
            <div className="w-16 shrink-0 text-left pl-1 text-sm text-slate-600">₹{left[0]?.price}</div>
          </div>
        ))}
      </div>

      <div className="bg-yellow-400 text-black px-10 py-2 mt-8 font-semibold">STAGE</div>

      <div className="flex justify-between w-full max-w-3xl mt-2 px-4">
          <div className="bg-gray-800 text-white px-4 py-1">WASHROOM</div>
          <div className="bg-gray-800 text-white px-4 py-1">WASHROOM</div>
      </div>
    </section>
  )
}
