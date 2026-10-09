"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { sportsApi } from "@/lib/api/sports";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

// Force dynamic rendering
export const dynamic = "force-dynamic";

interface SlotItem {
  _id: string;
  startTime: string;
  endTime: string;
  price: number;
  status: "available" | "booked" | "held" | "blocked";
}

type DayKey =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

interface OperatingHoursDay {
  open?: string;
  close?: string;
  closed?: boolean;
}

interface CourtDetails {
  _id: string;
  courtName: string;
  pricing?: {
    duration: number;
  };
  venue?: {
    _id: string;
    operatingHours?: Partial<Record<DayKey, OperatingHoursDay>>;
    venueName?: string;
  };
}

function formatDateISO(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeSlot(startTime: string, endTime: string, duration: number): string {
  // For 30-minute slots, show both start and end time
  // For 60-minute slots, show just the start time (as it's implied to be 1 hour)
  if (duration === 30) {
    return `${startTime} - ${endTime}`;
  } else {
    return `${startTime}`;
  }
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export default function CourtCalendarPage() {
  const router = useRouter();
  const params = useParams();
  
  if (!params?.id) {
    return <div>Loading...</div>;
  }
  
  const courtId = params!.id as string;

  const [anchorDate, setAnchorDate] = useState<Date>(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [weekSlots, setWeekSlots] = useState<Record<string, SlotItem[]>>({});
  const [court, setCourt] = useState<CourtDetails | null>(null);
  // Multi-slot selection (contiguous within a day)
  const [selectedForBooking, setSelectedForBooking] = useState<{
    date: string;
    slots: SlotItem[];
  } | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    numberOfPlayers: 2,
    paymentMethod: "cash" as "cash" | "upi" | "wallet" | "online",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const weekDays = useMemo(() => {
    // Build a 7-day range starting at anchorDate (Mon-Sun or Today + next 6 days)
    return Array.from({ length: 7 }).map((_, i) => addDays(anchorDate, i));
  }, [anchorDate]);

  const fetchWeek = async () => {
    if (!courtId) return;
    setLoading(true);
    setError("");
    try {
      // Fetch court details (for operating hours)
      const courtRes = await sportsApi.getCourtDetails(courtId);
      setCourt(courtRes.data?.data?.court || null);

      const results = await Promise.all(
        weekDays.map((d) => sportsApi.getAvailableSlots(courtId, formatDateISO(d)))
      );
      const map: Record<string, SlotItem[]> = {};
      results.forEach((res, idx) => {
        const day = formatDateISO(weekDays[idx]);
        const slots = (res.data?.data?.slots || []) as SlotItem[];
        map[day] = slots;
      });
      setWeekSlots(map);
    } catch (e: any) {
      console.error("Failed to load slots:", e);
      setError(e?.response?.data?.message || "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Simple auth presence check for arena partner
    const token = localStorage.getItem("arenaPartnerToken");
    if (!token) {
      router.replace("/arena-partner/auth");
      return;
    }
    // initial fetch
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchWeek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courtId, anchorDate]);

  const moveWeek = (delta: number) => {
    setAnchorDate((d) => addDays(d, delta * 7));
  };

  const statusBadge = (status: SlotItem["status"]) => {
    const common = "px-2 py-0.5 rounded-full text-xs font-medium";
    if (status === "available") return <span className={`${common} bg-green-100 text-green-700`}>Available</span>;
    if (status === "booked") return <span className={`${common} bg-red-100 text-red-700`}>Booked</span>;
    if (status === "held") return <span className={`${common} bg-yellow-100 text-yellow-700`}>On hold</span>;
    return <span className={`${common} bg-gray-100 text-gray-700`}>Blocked</span>;
  };

  const dayKeyForDate = (d: Date): DayKey => {
    const keys: DayKey[] = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    return keys[d.getDay()];
  };

  const getOperatingHoursFor = (d: Date): { open?: string; close?: string; closed?: boolean } | null => {
    const oh = court?.venue?.operatingHours;
    if (!oh) return null;
    const key = dayKeyForDate(d);
    const day = oh[key];
    if (!day) return null;
    if (day.closed) return { closed: true };
    return { open: day.open || "06:00", close: day.close || "23:00", closed: false };
  };

  const filterByOperatingHours = (slots: SlotItem[], d: Date): SlotItem[] => {
    const hours = getOperatingHoursFor(d);
    if (!hours) return slots; // no constraint configured -> show all
    if (hours.closed) return [];
    const { open, close } = hours;
    return slots.filter((s) => s.startTime >= (open as string) && s.endTime <= (close as string));
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const filterByCurrentTime = (slots: SlotItem[], d: Date): SlotItem[] => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const slotDate = new Date(d);
    slotDate.setHours(0, 0, 0, 0);
    
    // If it's not today, return all slots
    if (slotDate.getTime() !== today.getTime()) {
      return slots;
    }
    
    // For today, filter out past time slots
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    return slots.filter((slot) => {
      const [slotHour, slotMinute] = slot.startTime.split(':').map(Number);
      const slotTimeInMinutes = slotHour * 60 + slotMinute;
      
      // Allow slots that are at least 30 minutes in the future
      // This gives users time to book before the slot starts
      return slotTimeInMinutes > currentTimeInMinutes + 30;
    });
  };

  const computeRange = (slots: SlotItem[]) => {
    if (!slots || slots.length === 0) return { start: "", end: "", totalPrice: 0 };
    const sorted = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const duration = court?.pricing?.duration || 60;
    const firstSlot = sorted[0];
    const lastSlot = sorted[sorted.length - 1];
    
    // Calculate total price
    const totalPrice = sorted.reduce((sum, slot) => sum + slot.price, 0);
    
    if (duration === 30) {
      // For 30-minute slots, show full range
      return { start: firstSlot.startTime, end: lastSlot.endTime, totalPrice };
    } else {
      // For 60-minute slots, show start time and count
      const slotCount = sorted.length;
      return { 
        start: firstSlot.startTime, 
        end: lastSlot.endTime,
        totalPrice,
        display: slotCount === 1 
          ? firstSlot.startTime 
          : `${firstSlot.startTime} (${slotCount} slots)`
      };
    }
  };

  const areContiguous = (slots: SlotItem[]) => {
    if (slots.length <= 1) return true;
    const sorted = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].endTime !== sorted[i + 1].startTime) return false;
    }
    return true;
  };

  const submitWalkIn = async () => {
    if (!selectedForBooking || !court) return;
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const token = localStorage.getItem("arenaPartnerToken");
      const { start, end } = computeRange(selectedForBooking.slots);
      const res = await fetch("/api/arena-partner/bookings/walk-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          venueId: court.venue?._id,
          courtId: courtId,
          bookingDate: selectedForBooking.date,
          startTime: start,
          endTime: end,
          numberOfPlayers: Number(form.numberOfPlayers) || 1,
          contactDetails: {
            name: form.name,
            phone: form.phone,
            email: form.email || undefined,
          },
          paymentMethod: form.paymentMethod,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to create booking");
      setSubmitMsg({ type: "success", text: "Booking created successfully" });
      setSelectedForBooking(null);
      setForm({ name: "", phone: "", email: "", numberOfPlayers: 2, paymentMethod: "cash" });
      await fetchWeek();
    } catch (e: any) {
      setSubmitMsg({ type: "error", text: e?.message || "Error creating booking" });
    } finally {
      setSubmitting(false);
    }
  };

  const regenerateSlots = async (date: string) => {
    if (!courtId) return;
    setRegenerating(true);
    try {
      const token = localStorage.getItem("arenaPartnerToken");
      const res = await fetch(`/api/sports/courts/${courtId}/regenerate-slots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ date }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to regenerate slots");
      console.log("Slots regenerated:", json.data);
      await fetchWeek(); // Refresh the calendar
    } catch (e: any) {
      console.error("Error regenerating slots:", e);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-orange-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Court Calendar</h1>
                <p className="text-sm text-gray-600">
                  View weekly availability and bookings
                  {court && (
                    <span className="ml-2 text-orange-600">
                      (Duration: {court.pricing?.duration || 60}min)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {court && (
                <button
                  onClick={() => regenerateSlots(formatDateISO(new Date()))}
                  disabled={regenerating}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  {regenerating ? "Regenerating..." : "Regenerate Today's Slots"}
                </button>
              )}
              <Link
                href="/arena-partner/courts"
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Back to Courts
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between">
          <button
            onClick={() => moveWeek(-1)}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {" "}-{" "}
              {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" as const })}
            </div>
            <div className="text-sm text-gray-600">7-day view</div>
          </div>
          <button
            onClick={() => moveWeek(1)}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3">{error}</div>
        )}

        {/* Manual booking form (inline) */}
        {selectedForBooking && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-500">Create walk-in booking</div>
                <div className="text-lg font-semibold text-gray-900">
                  {new Date(selectedForBooking.date).toLocaleDateString()} · {computeRange(selectedForBooking.slots).display || `${computeRange(selectedForBooking.slots).start} - ${computeRange(selectedForBooking.slots).end}`}
                </div>
                <div className="text-xl font-bold text-orange-600 mt-1">
                  Total Price: ₹{computeRange(selectedForBooking.slots).totalPrice}
                </div>
                {selectedForBooking.slots.length > 1 && (
                  <div className="text-xs text-gray-500 mt-1">
                    ({selectedForBooking.slots.length} slots × ₹{selectedForBooking.slots[0]?.price || 0} each)
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedForBooking(null)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
            {!areContiguous(selectedForBooking.slots) && (
              <div className="mt-3 text-sm text-red-700">Please select contiguous slots only.</div>
            )}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Name</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Phone</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Contact number"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Email (optional)</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="Email address"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Number of players</label>
                <input
                  type="number"
                  min={1}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={form.numberOfPlayers}
                  onChange={(e) => setForm((f) => ({ ...f, numberOfPlayers: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Payment method</label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={form.paymentMethod}
                  onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value as any }))}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="wallet">Wallet</option>
                  <option value="online">Online</option>
                </select>
              </div>
            </div>
            {submitMsg && (
              <div className={`mt-4 text-sm ${submitMsg.type === "success" ? "text-green-700" : "text-red-700"}`}>
                {submitMsg.text}
              </div>
            )}
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={submitWalkIn}
                disabled={submitting || !form.name || !form.phone || !areContiguous(selectedForBooking.slots)}
                className="px-4 py-2 rounded-lg bg-orange-600 text-white disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create booking"}
              </button>
              <button
                onClick={() => setSelectedForBooking(null)}
                className="px-4 py-2 rounded-lg border border-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Week columns */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {weekDays.map((day) => {
            const key = formatDateISO(day);
            const allSlots = weekSlots[key] || [];
            const filteredByHours = filterByOperatingHours(allSlots, day);
            const filtered = filterByCurrentTime(filteredByHours, day);
            const hours = getOperatingHoursFor(day);
            return (
              <div key={key} className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {day.toLocaleDateString("en-US", { weekday: "long" })}
                      {isToday(day) && (
                        <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                          Today
                        </span>
                      )}
                    </div>
                    {isToday(day) && filteredByHours.length > filtered.length && (
                      <div className="text-xs text-gray-500">
                        Past times hidden
                      </div>
                    )}
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {day.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {hours?.closed
                      ? "Closed"
                      : hours
                      ? `Operational: ${hours.open} - ${hours.close}`
                      : "Operational hours not set"}
                  </div>
                </div>
                <div className="p-4 space-y-2 max-h-[520px] overflow-auto">
                  {loading && filtered.length === 0 ? (
                    <div className="text-sm text-gray-500">Loading...</div>
                  ) : filtered.length === 0 ? (
                    <div className="text-sm text-gray-500">No slots</div>
                  ) : (
                    filtered.map((slot) => {
                      const isSelected =
                        selectedForBooking?.date === key &&
                        selectedForBooking?.slots?.some((s) => s._id === slot._id);
                      const canSelect = slot.status === "available";
                      return (
                        <div
                          key={slot._id}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm cursor-pointer ${
                            slot.status === "available"
                              ? "bg-green-50 border-green-100"
                              : slot.status === "booked"
                              ? "bg-red-50 border-red-100"
                              : slot.status === "held"
                              ? "bg-yellow-50 border-yellow-100"
                              : "bg-gray-50 border-gray-100"
                          } ${isSelected ? "ring-2 ring-orange-500" : ""}`}
                          title={`${formatTimeSlot(slot.startTime, slot.endTime, court?.pricing?.duration || 60)}`}
                          onClick={() => {
                            if (!canSelect) return;
                            setSubmitMsg(null);
                            setSelectedForBooking((prev) => {
                              if (!prev || prev.date !== key) {
                                return { date: key, slots: [slot] };
                              }
                              const exists = prev.slots.find((s) => s._id === slot._id);
                              let nextSlots = exists
                                ? prev.slots.filter((s) => s._id !== slot._id)
                                : [...prev.slots, slot];
                              // Validate contiguous; if not contiguous, do not add and show message
                              if (!exists) {
                                const sorted = [...nextSlots].sort((a, b) => a.startTime.localeCompare(b.startTime));
                                let ok = true;
                                for (let i = 0; i < sorted.length - 1; i++) {
                                  if (sorted[i].endTime !== sorted[i + 1].startTime) { ok = false; break; }
                                }
                                if (!ok) {
                                  setSubmitMsg({ type: "error", text: "Please select contiguous slots" });
                                  // revert adding
                                  nextSlots = prev.slots;
                                }
                              }
                              return { date: key, slots: nextSlots };
                            });
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-800">
                              {formatTimeSlot(slot.startTime, slot.endTime, court?.pricing?.duration || 60)}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-green-600">₹{slot.price}</span>
                              {statusBadge(slot.status)}
                            </div>
                          </div>
                          {slot.status === "available" && (
                            <div className="flex justify-end mt-1">
                              <span className="px-2 py-1 rounded-md bg-orange-100 text-orange-800 text-xs">
                                {isSelected ? "Selected" : "Tap to select"}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
