"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isBooked: boolean;
  bookingId?: string;
  price?: number;
  note?: string;
}

interface AvailabilityData {
  _id?: string;
  date: string;
  timeSlots: TimeSlot[];
  dayStatus: "available" | "unavailable" | "partially_booked" | "fully_booked";
  specialPricing: {
    isSpecialDay: boolean;
    multiplier: number;
    fixedPrice?: number;
    reason?: string;
  };
  minimumBookingDuration: number;
  maximumBookingDuration: number;
  advanceBookingDays: number;
}

interface TeachingBookingSummary {
  _id: string;
  startTime: string;
  endTime: string;
  studentName: string;
  mode?: string;
  status?: string;
  classTitle?: string;
  amount?: number;
}

interface EventBookingSummary {
  _id: string;
  startTime: string;
  endTime: string;
  eventName?: string;
  status?: string;
  type?: string;
}

interface UnifiedDayData {
  dayStatus?: string;
  bookedSlots?: Array<{
    startTime: string;
    endTime: string;
    type: string;
    label?: string;
    status?: string;
  }>;
  availableSlots?: unknown[];
}

interface AvailabilityCalendarProps {
  onUpdate?: () => void;
}

// ─── Status colour system ────────────────────────────────────────────────────

const STATUS_CONFIG = {
  available: {
    cell: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500 text-white border-0",
    label: "Available",
    legend: "bg-gradient-to-br from-emerald-400 to-emerald-600",
    text: "text-emerald-700",
    detailBadge: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  partially_booked: {
    cell: "bg-amber-50 border-amber-200 hover:bg-amber-100",
    dot: "bg-amber-500",
    badge: "bg-amber-500 text-white border-0",
    label: "Partial",
    legend: "bg-gradient-to-br from-amber-400 to-orange-500",
    text: "text-amber-700",
    detailBadge: "bg-amber-100 text-amber-800 border-amber-200",
  },
  fully_booked: {
    cell: "bg-rose-50 border-rose-200 hover:bg-rose-100",
    dot: "bg-rose-500",
    badge: "bg-rose-500 text-white border-0",
    label: "Full",
    legend: "bg-gradient-to-br from-rose-400 to-rose-600",
    text: "text-rose-700",
    detailBadge: "bg-rose-100 text-rose-800 border-rose-200",
  },
  unavailable: {
    cell: "bg-slate-100 border-slate-300 hover:bg-slate-200",
    dot: "bg-slate-400",
    badge: "bg-slate-400 text-white border-0",
    label: "Blocked",
    legend: "bg-gradient-to-br from-slate-400 to-slate-600",
    text: "text-slate-500",
    detailBadge: "bg-slate-100 text-slate-700 border-slate-200",
  },
  default: {
    cell: "bg-white border-gray-200 hover:bg-gray-50",
    dot: "bg-gray-300",
    badge: "",
    label: "Open",
    legend: "bg-gradient-to-br from-gray-200 to-gray-300",
    text: "text-gray-500",
    detailBadge: "bg-gray-100 text-gray-700 border-gray-200",
  },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

const getStatus = (status?: string): StatusKey =>
  (status && status in STATUS_CONFIG ? status : "default") as StatusKey;

// ─── Component ───────────────────────────────────────────────────────────────

export default function AvailabilityCalendar({ onUpdate }: AvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [availability, setAvailability] = useState<{
    [key: string]: AvailabilityData | undefined;
  }>({});
  const [teachingBookingsByDate, setTeachingBookingsByDate] = useState<{
    [key: string]: TeachingBookingSummary[];
  }>({});
  const [eventBookingsByDate, setEventBookingsByDate] = useState<{
    [key: string]: EventBookingSummary[];
  }>({});
  const [unifiedCalendar, setUnifiedCalendar] = useState<{
    [key: string]: UnifiedDayData;
  }>({});
  const [loading, setLoading] = useState(false);
  const [showTimeSlotDialog, setShowTimeSlotDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockTimeSlot, setBlockTimeSlot] = useState<TimeSlot>({
    startTime: "09:00",
    endTime: "10:00",
    isAvailable: false,
    isBooked: false,
    price: 0,
    note: "",
  });
  const [newTimeSlot, setNewTimeSlot] = useState<TimeSlot>({
    startTime: "09:00",
    endTime: "10:00",
    isAvailable: true,
    isBooked: false,
    price: 0,
    note: "",
  });

  useEffect(() => {
    fetchAvailability();
  }, [currentDate]);

  const toDateKey = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const isPastDateKey = (dateKey: string) => {
    const todayKey = toDateKey(new Date());
    return dateKey < todayKey;
  };

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("artist_token");
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const response = await fetch(
        `/api/artist/availability?month=${month}&year=${year}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        const map: { [key: string]: AvailabilityData } = {};
        data.data.availability.forEach((avail: AvailabilityData) => {
          map[toDateKey(new Date(avail.date))] = avail;
        });
        setAvailability(map);
        setTeachingBookingsByDate(data.data.teachingBookingsByDate || {});
        setEventBookingsByDate(data.data.eventBookingsByDate || {});
        setUnifiedCalendar(data.data.unifiedCalendar || {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveAvailability = async (
    dateKey: string,
    availabilityData: AvailabilityData
  ) => {
    try {
      const token = localStorage.getItem("artist_token");
      const method = availabilityData._id ? "PUT" : "POST";
      const url = availabilityData._id
        ? `/api/artist/availability/${availabilityData._id}`
        : "/api/artist/availability";
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: dateKey,
          timeSlots: availabilityData.timeSlots,
          dayStatus: availabilityData.dayStatus,
          specialPricing: availabilityData.specialPricing,
          minimumBookingDuration: availabilityData.minimumBookingDuration,
          maximumBookingDuration: availabilityData.maximumBookingDuration,
          advanceBookingDays: availabilityData.advanceBookingDays,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        setAvailability((prev) => {
          const next = { ...prev };
          if (result.data?.availability) {
            next[dateKey] = result.data.availability;
          } else {
            delete next[dateKey];
          }
          return next;
        });
        if (onUpdate) onUpdate();
        await fetchAvailability();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    const days = [];
    const current = new Date(startDate);
    for (let i = 0; i < 42; i++) {
      const dateKey = toDateKey(current);
      days.push({
        date: new Date(current),
        dateKey,
        isCurrentMonth: current.getMonth() === month,
        isToday: current.toDateString() === new Date().toDateString(),
        availability: availability[dateKey],
      });
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const splitSlotsForBlock = (
    slots: TimeSlot[],
    blockStart: string,
    blockEnd: string,
    note?: string
  ) => {
    const updated: TimeSlot[] = [];
    for (const slot of slots) {
      if (slot.isBooked) { updated.push(slot); continue; }
      if (slot.endTime <= blockStart || slot.startTime >= blockEnd) { updated.push(slot); continue; }
      if (slot.startTime >= blockStart && slot.endTime <= blockEnd) {
        updated.push({ ...slot, isAvailable: false, note: note || slot.note });
        continue;
      }
      if (slot.startTime < blockStart)
        updated.push({ ...slot, endTime: blockStart });
      updated.push({ ...slot, startTime: blockStart, endTime: blockEnd, isAvailable: false, isBooked: false, note: note || slot.note });
      if (slot.endTime > blockEnd)
        updated.push({ ...slot, startTime: blockEnd });
    }
    return updated.sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const ensureDefaultOpenSlots = (dateKey: string) => {
    const existing = availability[dateKey];
    if (existing?.timeSlots?.length) return existing;
    return {
      ...(existing ?? {
        date: dateKey,
        specialPricing: { isSpecialDay: false, multiplier: 1 },
        minimumBookingDuration: 2,
        maximumBookingDuration: 8,
        advanceBookingDays: 7,
        dayStatus: "available",
      }),
      timeSlots: [{ startTime: "00:00", endTime: "23:59", isAvailable: true, isBooked: false }],
    } as AvailabilityData;
  };

  const blockFullDay = (dateKey: string) => {
    const base = availability[dateKey];
    saveAvailability(dateKey, {
      ...(base || {
        date: dateKey,
        specialPricing: { isSpecialDay: false, multiplier: 1 },
        minimumBookingDuration: 2,
        maximumBookingDuration: 8,
        advanceBookingDays: 7,
      }),
      dayStatus: "unavailable",
      timeSlots: [{ startTime: "00:00", endTime: "23:59", isAvailable: false, isBooked: false, note: "Blocked by artist" }],
    });
  };

  const blockTimeRange = (dateKey: string) => {
    const day = ensureDefaultOpenSlots(dateKey);
    saveAvailability(dateKey, {
      ...day,
      timeSlots: splitSlotsForBlock(day.timeSlots, blockTimeSlot.startTime, blockTimeSlot.endTime, blockTimeSlot.note),
    });
    setShowBlockDialog(false);
    setBlockTimeSlot({ startTime: "09:00", endTime: "10:00", isAvailable: false, isBooked: false, price: 0, note: "" });
  };

  const addTimeSlot = (dateKey: string) => {
    const day = availability[dateKey] || {
      date: dateKey, timeSlots: [], dayStatus: "available",
      specialPricing: { isSpecialDay: false, multiplier: 1 },
      minimumBookingDuration: 2, maximumBookingDuration: 8, advanceBookingDays: 7,
    };
    saveAvailability(dateKey, { ...day, timeSlots: [...day.timeSlots, newTimeSlot] });
    setShowTimeSlotDialog(false);
    setNewTimeSlot({ startTime: "09:00", endTime: "10:00", isAvailable: true, isBooked: false, price: 0, note: "" });
  };

  const removeTimeSlot = (dateKey: string, slotIndex: number) => {
    const day = availability[dateKey];
    if (!day) return;
    saveAvailability(dateKey, { ...day, timeSlots: day.timeSlots.filter((_, i) => i !== slotIndex) });
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + (direction === "next" ? 1 : -1));
    setCurrentDate(d);
  };

  const calendarDays = generateCalendarDays();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const resolveDayDisplay = (dateKey: string, dayAvail?: AvailabilityData) => {
    const teachingCount = teachingBookingsByDate[dateKey]?.length || 0;
    const eventCount = eventBookingsByDate[dateKey]?.length || 0;
    const unifiedStatus = unifiedCalendar[dateKey]?.dayStatus as StatusKey | undefined;
    const displayStatus =
      unifiedStatus ||
      (teachingCount + eventCount > 0 ? "partially_booked" : dayAvail?.dayStatus);
    return {
      teachingCount,
      eventCount,
      bookingCount: teachingCount + eventCount,
      unifiedStatus,
      displayStatus,
      status: getStatus(displayStatus),
    };
  };

  const selectedAvailability = selectedDate ? availability[selectedDate] : undefined;
  const selectedDayDisplay = selectedDate ? resolveDayDisplay(selectedDate, selectedAvailability) : null;
  const selectedTeachingBookings = selectedDate ? teachingBookingsByDate[selectedDate] || [] : [];
  const selectedEventBookings = selectedDate ? eventBookingsByDate[selectedDate] || [] : [];
  const selectedUnifiedDay = selectedDate ? unifiedCalendar[selectedDate] : undefined;
  const selectedStatus = selectedDayDisplay?.status ?? "default";
  const statusCfg = STATUS_CONFIG[selectedStatus];

  const renderBookingSections = (dateKey: string) => {
    const eventBookings = eventBookingsByDate[dateKey] || [];
    const teachingBookings = teachingBookingsByDate[dateKey] || [];
    const unifiedBooked = unifiedCalendar[dateKey]?.bookedSlots || [];

    return (
      <>
        {eventBookings.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Event bookings</h4>
            <div className="space-y-2">
              {eventBookings.map((booking) => (
                <div
                  key={booking._id}
                  className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-4 py-3 rounded-xl border bg-blue-50 border-blue-200"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-blue-900">{booking.eventName || "Event booking"}</p>
                    <p className="text-xs text-blue-700">
                      {booking.startTime} – {booking.endTime}
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 capitalize">
                    {booking.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {teachingBookings.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Teaching sessions</h4>
            <div className="space-y-2">
              {teachingBookings.map((booking) => (
                <div
                  key={booking._id}
                  className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-4 py-3 rounded-xl border bg-purple-50 border-purple-200"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-purple-900">{booking.studentName}</p>
                    <p className="text-xs text-purple-700">
                      {booking.startTime} – {booking.endTime}
                      {booking.classTitle ? ` · ${booking.classTitle}` : ""}
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 capitalize">
                    {booking.mode || "teaching"} · {booking.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {unifiedBooked.length > 0 && eventBookings.length === 0 && teachingBookings.length === 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Booked / blocked</h4>
            <div className="space-y-2">
              {unifiedBooked.map((slot, i) => (
                <div
                  key={i}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    slot.type === "event"
                      ? "bg-blue-50 border-blue-200 text-blue-800"
                      : slot.type === "teaching"
                        ? "bg-purple-50 border-purple-200 text-purple-800"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  {slot.startTime} – {slot.endTime}
                  {slot.label ? ` · ${slot.label}` : ""}
                  {slot.type === "teaching" ? " (Teaching)" : slot.type === "event" ? " (Event)" : ""}
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  // ── Slot status pill inside detail panel ──────────────────────────────────
  const slotPill = (slot: TimeSlot) => {
    if (slot.isBooked) return "bg-rose-100 text-rose-800 border-rose-200";
    if (slot.isAvailable) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div className="space-y-5 font-sans">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Synced with event bookings and paid teaching sessions. Block times here to prevent new bookings.
        </p>
        {loading && (
          <span className="text-xs text-muted-foreground animate-pulse">Refreshing…</span>
        )}
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <button
            onClick={() => navigateMonth("prev")}
            className="w-9 h-9 shrink-0 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
          >
            ←
          </button>
          <h2 className="text-base sm:text-xl font-semibold text-gray-900 min-w-0 text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={() => navigateMonth("next")}
            className="w-9 h-9 shrink-0 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
          >
            →
          </button>
        </div>
        <button
          onClick={() => setCurrentDate(new Date())}
          className="px-4 py-1.5 rounded-full text-sm border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors self-center sm:self-auto"
        >
          Today
        </button>
      </div>

      {/* ── Calendar Grid ──────────────────────────────────────────────────── */}
      {/* ── Calendar Grid ──────────────────────────────────────────────────── */}
      <Card className="overflow-hidden shadow-md border-gray-200 rounded-2xl">
        <CardContent className="p-0">

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 bg-gradient-to-r from-indigo-600 to-violet-600">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="py-2 sm:py-3 text-center text-[9px] sm:text-[11px] font-bold uppercase tracking-wide sm:tracking-widest text-white/90"
              >
                <span className="sm:hidden">{d.charAt(0)}</span>
                <span className="hidden sm:inline">{d}</span>
              </div>
            ))}
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7">
            {calendarDays.map(({ date, dateKey, isCurrentMonth, isToday, availability: dayAvail }) => {
              const { teachingCount, eventCount, bookingCount, displayStatus, status } = resolveDayDisplay(dateKey, dayAvail);
              const isPast = isPastDateKey(dateKey);
              const isSelected = selectedDate === dateKey;
              const hasActivity = Boolean(dayAvail) || bookingCount > 0 || Boolean(displayStatus);

              const availableSlots = dayAvail
                ? dayAvail.timeSlots.filter((s) => s.isAvailable && !s.isBooked).length
                : null;

              // ✅ CLEAN + COLORFUL STATUS STYLES
              const statusStyles = {
                available: {
                  cell: "bg-green-50 hover:bg-green-100 border-green-200",
                  bar: "bg-green-500",
                  badge: "bg-green-500 text-white",
                  slotText: "text-green-700",
                  dot: "bg-green-500",
                  label: "Available",
                },
                partially_booked: {
                  cell: "bg-yellow-50 hover:bg-yellow-100 border-yellow-200",
                  bar: "bg-yellow-500",
                  badge: "bg-yellow-500 text-white",
                  slotText: "text-yellow-700",
                  dot: "bg-yellow-500",
                  label: "Partial",
                },
                fully_booked: {
                  cell: "bg-red-50 hover:bg-red-100 border-red-200",
                  bar: "bg-red-500",
                  badge: "bg-red-500 text-white",
                  slotText: "text-red-700",
                  dot: "bg-red-500",
                  label: "Full",
                },
                unavailable: {
                  cell: "bg-gray-100 hover:bg-gray-200 border-gray-300",
                  bar: "bg-gray-500",
                  badge: "bg-gray-500 text-white",
                  slotText: "text-gray-600",
                  dot: "bg-gray-500",
                  label: "Blocked",
                },
                default: {
                  cell: "bg-white hover:bg-gray-50 border-gray-200",
                  bar: "bg-gray-300",
                  badge: "",
                  slotText: "text-gray-400",
                  dot: "bg-gray-300",
                  label: "Open",
                },
              };

              const s = statusStyles[status] ?? statusStyles.default;

              return (
                <div
                  key={dateKey}
                  onClick={() => { if (!isPast) setSelectedDate(isSelected ? "" : dateKey); }}
                  className={[
                    "relative min-h-[52px] sm:min-h-[90px] border-b border-r transition-all duration-200 select-none overflow-hidden",
                    isCurrentMonth
                      ? hasActivity
                        ? s.cell
                        : "bg-white hover:bg-gray-50 border-gray-200"
                      : "bg-gray-50 border-gray-100",
                    isPast ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                    isSelected ? "ring-2 ring-inset ring-indigo-500 shadow-inner" : "",
                  ].join(" ")}
                >
                  {/* Top color bar — reflects availability + bookings */}
                  {isCurrentMonth && hasActivity && (
                    <div className={`absolute top-0 left-0 right-0 h-1 ${s.bar}`} />
                  )}

                  {/* Hover overlay (NEW ✨) */}
                  {!isPast && (
                    <div className="absolute inset-0 opacity-0 hover:opacity-100 transition bg-black/5" />
                  )}

                  <div className="p-1 sm:p-2 pt-2 sm:pt-3">
                    {/* Date row */}
                    <div className="flex items-start justify-between mb-1.5">
                      <span
                        className={[
                          "text-sm font-semibold leading-none",
                          isToday
                            ? "w-6 h-6 flex items-center justify-center rounded-full bg-indigo-600 text-white text-xs shadow-md"
                            : isCurrentMonth
                              ? "text-gray-800"
                              : "text-gray-300",
                        ].join(" ")}
                      >
                        {date.getDate()}
                      </span>

                      {/* Status dot */}
                      {isCurrentMonth && hasActivity && (
                        <span className={`w-2 h-2 rounded-full mt-0.5 ${s.dot}`} />
                      )}
                    </div>

                    {/* Status Info */}
                    {isCurrentMonth && (
                      <div className="space-y-0.5">
                        {displayStatus && displayStatus !== "default" && (
                          <span className={`inline-block text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full ${s.badge}`}>
                            {s.label}
                          </span>
                        )}

                        {availableSlots !== null && availableSlots > 0 && (
                          <p className={`text-[9px] sm:text-[10px] font-medium ${s.slotText}`}>
                            {availableSlots} open
                          </p>
                        )}

                        {eventCount > 0 && (
                          <p className="text-[9px] sm:text-[10px] font-semibold text-blue-600">
                            {eventCount} event{eventCount !== 1 ? "s" : ""}
                          </p>
                        )}
                        {teachingCount > 0 && (
                          <p className="text-[9px] sm:text-[10px] font-semibold text-purple-600">
                            {teachingCount} teaching
                          </p>
                        )}

                        {!displayStatus && bookingCount === 0 && !dayAvail && (
                          <span className="text-[9px] sm:text-[10px] text-gray-400">Open</span>
                        )}

                        {dayAvail?.specialPricing?.isSpecialDay && (
                          <p className="text-[9px] sm:text-[10px] font-semibold text-orange-500">
                            ★ Special
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected overlay */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>

        </CardContent>
      </Card>

      {/* ── Selected Date Details ──────────────────────────────────────────── */}
      {selectedDate && (
        <Card className="shadow-sm border-gray-200 overflow-hidden">
          {/* Coloured top strip that reflects the day status */}
          <div
            className={`h-1.5 w-full ${statusCfg.legend}`}
          />

          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-base font-semibold text-gray-800">
                <Calendar className="h-4 w-4 text-indigo-500" />
                {new Date(selectedDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                {(selectedAvailability || selectedUnifiedDay?.dayStatus || selectedTeachingBookings.length > 0 || selectedEventBookings.length > 0) && (
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusCfg.detailBadge}`}
                  >
                    {statusCfg.label}
                  </span>
                )}
              </span>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => blockFullDay(selectedDate)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Block full day
                </button>

                {/* Block time range dialog */}
                <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
                  <DialogTrigger asChild>
                    <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500 text-white hover:bg-rose-600 transition-colors">
                      Block time
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Block a time range</DialogTitle>
                      <DialogDescription>
                        This range will be marked unavailable for bookings.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-1">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="blockStartTime">From</Label>
                          <Input id="blockStartTime" type="time" value={blockTimeSlot.startTime}
                            onChange={(e) => setBlockTimeSlot((p) => ({ ...p, startTime: e.target.value }))} />
                        </div>
                        <div>
                          <Label htmlFor="blockEndTime">To</Label>
                          <Input id="blockEndTime" type="time" value={blockTimeSlot.endTime}
                            onChange={(e) => setBlockTimeSlot((p) => ({ ...p, endTime: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="blockNote">Reason (optional)</Label>
                        <Textarea id="blockNote" placeholder="e.g. Travel / Personal commitment"
                          value={blockTimeSlot.note}
                          onChange={(e) => setBlockTimeSlot((p) => ({ ...p, note: e.target.value }))} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowBlockDialog(false)}>Cancel</Button>
                        <Button className="bg-rose-500 hover:bg-rose-600" onClick={() => blockTimeRange(selectedDate)}>Block</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Add slot dialog */}
                <Dialog open={showTimeSlotDialog} onOpenChange={setShowTimeSlotDialog}>
                  <DialogTrigger asChild>
                    <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Add slot
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Add available time slot</DialogTitle>
                      <DialogDescription>
                        Explicitly allow a time slot for bookings.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-1">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="startTime">Start</Label>
                          <Input id="startTime" type="time" value={newTimeSlot.startTime}
                            onChange={(e) => setNewTimeSlot((p) => ({ ...p, startTime: e.target.value }))} />
                        </div>
                        <div>
                          <Label htmlFor="endTime">End</Label>
                          <Input id="endTime" type="time" value={newTimeSlot.endTime}
                            onChange={(e) => setNewTimeSlot((p) => ({ ...p, endTime: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="price">Custom Price (optional)</Label>
                        <Input id="price" type="number" placeholder="Leave empty to use base price"
                          value={newTimeSlot.price || ""}
                          onChange={(e) => setNewTimeSlot((p) => ({ ...p, price: e.target.value ? parseInt(e.target.value) : 0 }))} />
                      </div>
                      <div>
                        <Label htmlFor="note">Note (optional)</Label>
                        <Textarea id="note" placeholder="Any notes for this slot" value={newTimeSlot.note}
                          onChange={(e) => setNewTimeSlot((p) => ({ ...p, note: e.target.value }))} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowTimeSlotDialog(false)}>Cancel</Button>
                        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => addTimeSlot(selectedDate)}>Add</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            {selectedAvailability ? (
              <>
                {/* Time Slots */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Time Slots</h4>
                  {selectedAvailability.timeSlots.length > 0 ? (
                    <div className="space-y-2">
                      {selectedAvailability.timeSlots.map((slot, i) => (
                        <div
                          key={i}
                          className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-4 py-3 rounded-xl border ${slot.isBooked
                              ? "bg-rose-50 border-rose-200"
                              : slot.isAvailable
                                ? "bg-emerald-50 border-emerald-200"
                                : "bg-slate-50 border-slate-200"
                            }`}
                        >
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                            {/* Colour accent line */}
                            <div
                              className={`w-1 h-8 rounded-full flex-shrink-0 ${slot.isBooked ? "bg-rose-400" : slot.isAvailable ? "bg-emerald-400" : "bg-slate-400"
                                }`}
                            />
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-semibold text-gray-800">
                              {slot.startTime} – {slot.endTime}
                            </span>
                            {slot.price ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
                                ₹{slot.price}
                              </span>
                            ) : null}
                            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${slotPill(slot)}`}>
                              {slot.isBooked ? "Booked" : slot.isAvailable ? "Available" : "Blocked"}
                            </span>
                            {slot.note && (
                              <span className="text-xs text-gray-400 italic">{slot.note}</span>
                            )}
                          </div>
                          {!slot.isBooked && (
                            <button
                              onClick={() => removeTimeSlot(selectedDate, i)}
                              className="w-7 h-7 self-end sm:self-auto flex items-center justify-center rounded-lg text-gray-400 hover:bg-rose-100 hover:text-rose-500 transition-colors shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Alert className="border-gray-200">
                      <AlertDescription className="text-sm text-gray-500">
                        No time slots set. Add slots to make yourself available for bookings.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {renderBookingSections(selectedDate)}

                {/* Special Pricing */}
                {selectedAvailability.specialPricing.isSpecialDay && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Special Pricing</h4>
                    <div className="p-3 rounded-xl bg-orange-50 border border-orange-200">
                      <p className="text-sm text-orange-800 font-medium">
                        {selectedAvailability.specialPricing.reason}
                      </p>
                      {selectedAvailability.specialPricing.multiplier !== 1 && (
                        <p className="text-xs text-orange-600 mt-1">
                          Price multiplier: {selectedAvailability.specialPricing.multiplier}×
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : selectedTeachingBookings.length > 0 || selectedEventBookings.length > 0 || (selectedUnifiedDay?.bookedSlots?.length ?? 0) > 0 ? (
              <div className="space-y-4">
                {renderBookingSections(selectedDate)}
              </div>
            ) : (
              <Alert className="border-indigo-100 bg-indigo-50">
                <AlertDescription className="text-sm text-indigo-700">
                  This date is <strong>open by default</strong>. Use "Block time" or "Block full day" to restrict availability.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {(
          [
            { key: "available", label: "Available" },
            { key: "partially_booked", label: "Partially Booked" },
            { key: "fully_booked", label: "Fully Booked" },
            { key: "unavailable", label: "Blocked" },
            { key: "default", label: "Open (default)" },
          ] as { key: StatusKey; label: string }[]
        ).map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${STATUS_CONFIG[key].dot}`} />
            <span className="text-xs text-gray-600">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-gray-600">Event booking</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-xs text-gray-600">Teaching session</span>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[9px] font-bold">9</span>
          <span className="text-xs text-gray-600">Today</span>
        </div>
      </div>
    </div>
  );
}