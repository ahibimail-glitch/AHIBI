// Route: POST /book

import { NextResponse, type NextRequest } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { seats } = (await req.json()) as { seats: string[] }
    if (!Array.isArray(seats) || seats.length === 0) {
      return NextResponse.json({ error: "No seats provided" }, { status: 400 })
    }
    // Simulate success: return the same seats as booked.
    return NextResponse.json({ booked: seats }, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
