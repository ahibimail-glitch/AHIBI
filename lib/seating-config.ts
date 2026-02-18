// Seating configuration mapped from the provided diagram.
// Totals: 374 seats.
// Pricing tiers: X=₹1500 (red), A–C=₹1000 (blue), D–N=₹500 (green).

export type RowId = "X" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" | "N"
export type SeatStatus = "available" | "selected" | "booked"

export type RowConfig = {
  row: RowId
  count: number
  price: number
  color: "red" | "blue" | "green"
}

export const seatingConfig: RowConfig[] = [
  { row: "X", count: 22, price: 1500, color: "red" },
  { row: "A", count: 24, price: 1000, color: "blue" },
  { row: "B", count: 26, price: 1000, color: "blue" },
  { row: "C", count: 26, price: 1000, color: "blue" },
  { row: "D", count: 26, price: 500, color: "green" },
  { row: "E", count: 26, price: 500, color: "green" },
  { row: "F", count: 26, price: 500, color: "green" },
  { row: "G", count: 26, price: 500, color: "green" },
  { row: "H", count: 26, price: 500, color: "green" },
  { row: "I", count: 26, price: 500, color: "green" },
  { row: "J", count: 26, price: 500, color: "green" },
  { row: "K", count: 22, price: 500, color: "green" },
  { row: "L", count: 22, price: 500, color: "green" },
  { row: "M", count: 22, price: 500, color: "green" },
  { row: "N", count: 28, price: 500, color: "green" },
]

// Helpers
export const seatId = (row: RowId, index: number) => `${row}-${String(index).padStart(2, "0")}`

export const colorForRow = (color: RowConfig["color"]) => {
  // Tailwind classes for available and selected states
  switch (color) {
    case "red":
      return { base: "bg-red-600 text-white hover:bg-red-700", selected: "bg-red-700 ring-2 ring-red-300" }
    case "blue":
      return { base: "bg-sky-600 text-white hover:bg-sky-700", selected: "bg-sky-700 ring-2 ring-sky-300" }
    case "green":
      return {
        base: "bg-emerald-600 text-white hover:bg-emerald-700",
        selected: "bg-emerald-700 ring-2 ring-emerald-300",
      }
  }
}
