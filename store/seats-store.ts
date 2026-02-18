"use client"

import { create } from "zustand"

// Simplified types, as seating-config is no longer the source of truth
export type SeatStatus = "available" | "selected" | "booked"

export type Seat = {
  _id: string // Database ID
  id: string // Composite ID for frontend (e.g., "A1")
  row: string
  number: number
  price: number
  status: SeatStatus
}

type SeatsState = {
  seats: Record<string, Seat>
  selectedIds: string[]
  fetchSeats: () => Promise<void>
  toggleSeat: (id: string) => void
  setBooked: (ids: string[]) => void
  clearSelection: () => void
}

// Helper to create composite ID
const seatId = (row: string, number: number) => `${row}${number}`

export const useSeatsStore = create<SeatsState>((set, get) => ({
  seats: {},
  selectedIds: [],
  fetchSeats: async () => {
    try {
      const response = await fetch('/api/annie-musical/seats');
      if (!response.ok) {
        throw new Error('Failed to fetch seats');
      }
      const data: Omit<Seat, 'id'>[] = await response.json();

      const seatsMap: Record<string, Seat> = {};
      for (const seat of data) {
        const id = seatId(seat.row, seat.number);
        seatsMap[id] = { ...seat, id };
      }
      set({ seats: seatsMap, selectedIds: [] }); // Reset selection on fetch
    } catch (error) {
      console.error("Error fetching seats:", error);
      set({ seats: {} }); // Clear seats on error
    }
  },
  toggleSeat: (id) => {
    const seat = get().seats[id];
    if (!seat) return;
    const isSelected = get().selectedIds.includes(id);
    // Block selecting seats that are not available (booked or locked by others),
    // but allow deselecting if the current user already selected it.
    if (seat.status !== "available" && !isSelected) return;

    const selectedIds = isSelected
      ? get().selectedIds.filter((sid) => sid !== id)
      : [...get().selectedIds, id];

    set({
      seats: {
        ...get().seats,
        [id]: { ...seat, status: isSelected ? "available" : "selected" },
      },
      selectedIds,
    });
  },
  setBooked: (ids) => {
    const seats = { ...get().seats };
    const selected = new Set(get().selectedIds);
    for (const id of ids) {
      const s = seats[id];
      if (s) {
        s.status = "booked";
        seats[id] = s;
        selected.delete(id);
      }
    }
    set({ seats, selectedIds: Array.from(selected) });
  },
  clearSelection: () => set({ selectedIds: [] }),
}))
