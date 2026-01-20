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

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export default function CourtCalendarPage() {
  const router = useRouter();
  const params = useParams();
  const courtId = params.id as string;

  const [anchorDate, setAnchorDate] = useState<Date>(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [weekSlots, setWeekSlots] = useState<Record<string, SlotItem[]>>({});
  const [court, setCourt] = useState<CourtDetails | null>(null);

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
                <p className="text-sm text-gray-600">View weekly availability and bookings</p>
              </div>
            </div>
            <Link
              href="/arena-partner/courts"
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Back to Courts
            </Link>
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

        {/* Week columns */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {weekDays.map((day) => {
            const key = formatDateISO(day);
            const allSlots = weekSlots[key] || [];
            const filtered = filterByOperatingHours(allSlots, day);
            const hours = getOperatingHoursFor(day);
            return (
              <div key={key} className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-100">
                  <div className="text-sm text-gray-500">
                    {day.toLocaleDateString("en-US", { weekday: "long" })}
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
                    filtered.map((slot) => (
                      <div
                        key={slot._id}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${
                          slot.status === "available"
                            ? "bg-green-50 border-green-100"
                            : slot.status === "booked"
                            ? "bg-red-50 border-red-100"
                            : slot.status === "held"
                            ? "bg-yellow-50 border-yellow-100"
                            : "bg-gray-50 border-gray-100"
                        }`}
                        title={`${slot.startTime} - ${slot.endTime}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-800">
                            {slot.startTime} - {slot.endTime}
                          </span>
                          <span className="text-gray-500">₹{slot.price}</span>
                        </div>
                        <div>{statusBadge(slot.status)}</div>
                      </div>
                    ))
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
