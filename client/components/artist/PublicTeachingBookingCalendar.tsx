"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  GraduationCap,
  IndianRupee,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Monitor,
  MapPin,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  downloadPdfFromUrl,
  runAfterRazorpay,
  setRazorpayCheckoutActive,
} from "@/lib/razorpayUi";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface TeachingClassInfo {
  _id: string;
  title: string;
  mode: "online" | "offline" | "both";
  maxStudents?: number;
  pricing?: { amount: number; currency?: string; pricingType?: string };
  schedule?: {
    days?: string[];
    startTime?: string;
    endTime?: string;
    durationMinutes?: number;
  };
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  price?: number;
  maxStudents?: number;
  bookedCount?: number;
  spotsLeft?: number;
}

interface BookedSlot {
  startTime: string;
  endTime: string;
  type: string;
  label?: string;
}

interface DayCalendarData {
  dayStatus: "available" | "partially_booked" | "fully_booked" | "unavailable";
  availableSlots: TimeSlot[];
  bookedSlots: BookedSlot[];
}

interface PublicTeachingBookingCalendarProps {
  artistId: string;
  artistName: string;
  teachingClass: TeachingClassInfo;
  onClose?: () => void;
  onPaymentStateChange?: (active: boolean) => void;
  initialCalendarData?: Record<string, DayCalendarData>;
  initialMonthKey?: string;
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
}

export default function PublicTeachingBookingCalendar({
  artistId,
  artistName,
  teachingClass,
  onClose,
  onPaymentStateChange,
  initialCalendarData,
  initialMonthKey,
}: PublicTeachingBookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentMonthKey = getMonthKey(currentDate);
  const hasInitialMonthData =
    !!initialCalendarData &&
    !!initialMonthKey &&
    initialMonthKey === currentMonthKey;
  const [calendarData, setCalendarData] = useState<Record<string, DayCalendarData>>(
    hasInitialMonthData ? initialCalendarData : {}
  );
  const [loading, setLoading] = useState(!hasInitialMonthData);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateObj, setSelectedDateObj] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedMode, setSelectedMode] = useState<"online" | "offline" | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successInvoice, setSuccessInvoice] = useState<{ invoiceNumber?: string; invoiceUrl?: string } | null>(null);
  const [studentForm, setStudentForm] = useState({
    studentName: "",
    studentEmail: "",
    studentPhone: "",
    message: "",
  });

  const toDateKey = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatDateLabel = (dateKey: string) => {
    const [yyyy, mm, dd] = dateKey.split("-");
    return `${dd}/${mm}/${String(yyyy).slice(-2)}`;
  };

  const usedInitialDataRef = useRef(false);

  const fetchCalendar = useCallback(async () => {
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    const monthKey = getMonthKey(currentDate);

    if (
      !usedInitialDataRef.current &&
      initialCalendarData &&
      initialMonthKey === monthKey
    ) {
      usedInitialDataRef.current = true;
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(
        `/api/artist/public/${artistId}/teaching/calendar?month=${month}&year=${year}&classId=${teachingClass._id}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load calendar");
      setCalendarData(data?.data?.calendarData || {});
    } catch (error) {
      console.error(error);
      setCalendarData({});
      toast({
        title: "Could not load availability",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [artistId, currentDate, initialCalendarData, initialMonthKey, teachingClass._id]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  useEffect(() => {
    if (!initialCalendarData || !initialMonthKey) return;
    if (initialMonthKey !== getMonthKey(currentDate)) return;
    setCalendarData(initialCalendarData);
    setLoading(false);
  }, [initialCalendarData, initialMonthKey, currentDate]);

  useEffect(() => {
    if (teachingClass.mode === "online") setSelectedMode("online");
    else if (teachingClass.mode === "offline") setSelectedMode("offline");
    else setSelectedMode("");
  }, [teachingClass.mode]);

  const getDayData = (date: Date) => calendarData[toDateKey(date)];

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    const day = getDayData(date);
    if (!day) return false;
    return day.dayStatus === "fully_booked" || day.dayStatus === "unavailable" || day.availableSlots.length === 0;
  };

  const handleDateSelect = (date?: Date) => {
    if (!date || isDateDisabled(date)) return;
    const key = toDateKey(date);
    setSelectedDateObj(date);
    setSelectedDate(key);
    setSelectedSlot(null);
  };

  const calendarModifiers = useMemo(() => {
    const partiallyBooked: Date[] = [];
    const fullyBooked: Date[] = [];
    const unavailable: Date[] = [];

    Object.entries(calendarData).forEach(([dateKey, day]) => {
      const d = new Date(`${dateKey}T00:00:00`);
      if (isNaN(d.getTime())) return;
      if (day.dayStatus === "partially_booked") partiallyBooked.push(d);
      if (day.dayStatus === "fully_booked") fullyBooked.push(d);
      if (day.dayStatus === "unavailable") unavailable.push(d);
    });

    return { partiallyBooked, fullyBooked, unavailable };
  }, [calendarData]);

  const selectedDay = selectedDate ? calendarData[selectedDate] : null;
  const price = teachingClass.pricing?.amount || 0;

  const loadRazorpayScript = async () => {
    if (typeof window === "undefined") return false;
    if (window.Razorpay) return true;
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      return new Promise<boolean>((resolve) => {
        if (window.Razorpay) {
          resolve(true);
          return;
        }
        existing.addEventListener("load", () => resolve(!!window.Razorpay), { once: true });
        existing.addEventListener("error", () => resolve(false), { once: true });
      });
    }
    return new Promise<boolean>((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const downloadInvoiceWithRetry = async (invoiceUrl: string, filename: string) => {
    const delays = [0, 800, 1600, 2400];
    for (const delay of delays) {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      try {
        await downloadPdfFromUrl(invoiceUrl, filename);
        return;
      } catch (downloadError) {
        if (delay === delays[delays.length - 1]) {
          throw downloadError;
        }
      }
    }
  };

  const handleBookAndPay = async () => {
    if (!selectedDate || !selectedSlot) return;
    if (!studentForm.studentName.trim() || !studentForm.studentPhone.trim()) {
      toast({ title: "Name and phone are required", variant: "destructive" });
      return;
    }
    if (!selectedMode) {
      toast({ title: "Please select online or offline mode", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const orderRes = await fetch(
        `/api/artist/public/${artistId}/teaching/bookings/create-order`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            classId: teachingClass._id,
            bookingDate: selectedDate,
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime,
            mode: selectedMode,
            ...studentForm,
          }),
        }
      );
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData?.message || "Artist is not available at this time");
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Unable to load payment gateway");
      }

      if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
        throw new Error("Payment gateway is not configured");
      }

      const verifyAndComplete = async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        setVerifyingPayment(true);
        try {
          const verifyRes = await fetch(
            `/api/artist/public/${artistId}/teaching/bookings/verify-payment`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                bookingId: orderData.data.bookingId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            }
          );
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) {
            throw new Error(verifyData?.message || "Payment verification failed");
          }

          const invoiceNumber = verifyData?.data?.booking?.invoiceNumber as string | undefined;
          const invoiceUrl = verifyData?.data?.booking?.invoiceUrl as string | undefined;

          setSuccessInvoice({ invoiceNumber, invoiceUrl });
          setShowSuccess(true);
          fetchCalendar();

          if (invoiceUrl) {
            try {
              await downloadInvoiceWithRetry(
                invoiceUrl,
                `${invoiceNumber || "teaching-invoice"}.pdf`
              );
            } catch (downloadError) {
              console.error(downloadError);
              toast({
                title: "Booking confirmed",
                description: "Payment succeeded. Use the download button if the invoice did not open automatically.",
              });
            }
          }
        } catch (err) {
          toast({
            title: "Booking failed",
            description: err instanceof Error ? err.message : "Payment could not be confirmed",
            variant: "destructive",
          });
        } finally {
          setVerifyingPayment(false);
          setSubmitting(false);
          setRazorpayCheckoutActive(false);
          onPaymentStateChange?.(false);
        }
      };

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.data.razorpayOrder.amount,
        currency: orderData.data.razorpayOrder.currency,
        name: "Ahibi Teaching",
        description: `${teachingClass.title} with ${artistName}`,
        order_id: orderData.data.razorpayOrder.id,
        prefill: {
          name: studentForm.studentName,
          email: studentForm.studentEmail,
          contact: studentForm.studentPhone,
        },
        theme: { color: "#5b6cff" },
        handler(response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          runAfterRazorpay(() => verifyAndComplete(response));
        },
        modal: {
          ondismiss() {
            setSubmitting(false);
            setVerifyingPayment(false);
            setRazorpayCheckoutActive(false);
            onPaymentStateChange?.(false);
          },
        },
      };

      setSubmitting(false);
      setRazorpayCheckoutActive(true);
      onPaymentStateChange?.(true);

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        setSubmitting(false);
        setVerifyingPayment(false);
        setRazorpayCheckoutActive(false);
        onPaymentStateChange?.(false);
        toast({ title: "Payment failed", description: "Please try again", variant: "destructive" });
      });
      rzp.open();
    } catch (error) {
      setSubmitting(false);
      setVerifyingPayment(false);
      setRazorpayCheckoutActive(false);
      onPaymentStateChange?.(false);
      toast({
        title: "Cannot book this slot",
        description: error instanceof Error ? error.message : "Artist may not be available",
        variant: "destructive",
      });
    }
  };

  const modeOptions =
    teachingClass.mode === "both"
      ? (["online", "offline"] as const)
      : teachingClass.mode === "online"
        ? (["online"] as const)
        : (["offline"] as const);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-[#f8fbff] to-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge className="mb-2 bg-[#5b6cff] hover:bg-[#5b6cff]">Teaching booking</Badge>
            <h3 className="text-xl font-bold text-slate-900">{teachingClass.title}</h3>
            <p className="mt-1 text-sm text-slate-600">
              Pick a date and time, then pay securely to confirm your session with {artistName}.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-slate-500">Session fee</p>
            <p className="text-2xl font-bold text-green-600">₹{price.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarIcon className="h-5 w-5 text-slate-600" />
              Select date
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <>
                <Calendar
                  mode="single"
                  month={currentDate}
                  onMonthChange={setCurrentDate}
                  selected={selectedDateObj}
                  onSelect={handleDateSelect}
                  disabled={isDateDisabled}
                  modifiers={calendarModifiers}
                  modifiersClassNames={{
                    partiallyBooked: "bg-amber-200 text-amber-950 font-medium",
                    fullyBooked: "bg-rose-500 text-white opacity-90",
                    unavailable: "bg-slate-200 text-slate-500",
                  }}
                  className="rounded-xl border bg-white"
                />
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /> Partially booked</span>
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Fully booked</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5 text-slate-600" />
              {selectedDate ? `Times for ${formatDateLabel(selectedDate)}` : "Available times"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedDate ? (
              <p className="text-sm text-slate-500">Select a date to see open session slots.</p>
            ) : !selectedDay || selectedDay.availableSlots.length === 0 ? (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                Artist is not available on this date. Please choose another day.
              </div>
            ) : (
              <>
                {selectedDay.bookedSlots.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Already booked</p>
                    <div className="space-y-1">
                      {selectedDay.bookedSlots.map((slot, i) => (
                        <p key={i} className="text-sm text-slate-600">
                          {slot.startTime}–{slot.endTime}
                          {slot.label ? ` · ${slot.label}` : ""}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedDay.availableSlots.map((slot, i) => {
                    const active = selectedSlot?.startTime === slot.startTime;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`rounded-xl border p-3 text-left transition ${
                          active
                            ? "border-[#5b6cff] bg-[#5b6cff]/10"
                            : "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                        }`}
                      >
                        <p className="font-semibold text-slate-900">{slot.startTime} – {slot.endTime}</p>
                        <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                          <IndianRupee className="h-3 w-3" /> ₹{slot.price || price}
                        </p>
                        {typeof slot.spotsLeft === "number" && (
                          <p className="mt-1 text-xs font-medium text-emerald-700">
                            {slot.spotsLeft} spot{slot.spotsLeft !== 1 ? "s" : ""} left
                            {slot.maxStudents ? ` of ${slot.maxStudents}` : ""}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedDate && selectedSlot && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your details & payment</CardTitle>
            <p className="text-sm text-slate-500">
              {formatDateLabel(selectedDate)} · {selectedSlot.startTime}–{selectedSlot.endTime}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Your name *</Label>
                <Input
                  value={studentForm.studentName}
                  onChange={(e) => setStudentForm((p) => ({ ...p, studentName: e.target.value }))}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input
                  value={studentForm.studentPhone}
                  onChange={(e) => setStudentForm((p) => ({ ...p, studentPhone: e.target.value }))}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={studentForm.studentEmail}
                  onChange={(e) => setStudentForm((p) => ({ ...p, studentEmail: e.target.value }))}
                  className="mt-1 rounded-xl"
                />
              </div>
            </div>

            {modeOptions.length > 1 && (
              <div>
                <Label className="mb-2 block">Session mode *</Label>
                <div className="flex gap-2">
                  {modeOptions.map((mode) => (
                    <Button
                      key={mode}
                      type="button"
                      variant={selectedMode === mode ? "default" : "outline"}
                      onClick={() => setSelectedMode(mode)}
                      className="rounded-full capitalize"
                    >
                      {mode === "online" ? <Monitor className="h-4 w-4 mr-1" /> : <MapPin className="h-4 w-4 mr-1" />}
                      {mode}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>Message (optional)</Label>
              <Textarea
                value={studentForm.message}
                onChange={(e) => setStudentForm((p) => ({ ...p, message: e.target.value }))}
                rows={2}
                className="mt-1 rounded-xl"
                placeholder="Goals, experience level, questions..."
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
              <span className="font-medium text-slate-700">Total payable</span>
              <span className="text-xl font-bold text-[#5b6cff]">₹{price.toLocaleString()}</span>
            </div>

            <Button
              onClick={handleBookAndPay}
              disabled={submitting || verifyingPayment}
              className="w-full rounded-xl bg-gradient-to-br from-[#5b6cff] to-[#7c3aed] hover:opacity-95"
            >
              {submitting || verifyingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Pay & confirm booking
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {verifyingPayment && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <div className="rounded-2xl bg-white px-6 py-5 shadow-xl text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#5b6cff] mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-900">Confirming your booking…</p>
            <p className="text-xs text-slate-500 mt-1">Securing your session</p>
          </div>
        </div>
      )}

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <DialogTitle className="text-xl">Session booked!</DialogTitle>
              <p className="mt-2 text-sm text-slate-600">
                Your payment was successful. {artistName} has been notified of your teaching session.
              </p>
              {successInvoice?.invoiceNumber && (
                <p className="mt-2 text-xs text-slate-500">
                  Invoice: {successInvoice.invoiceNumber}
                </p>
              )}
            </div>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            {successInvoice?.invoiceUrl && (
              <Button
                variant="outline"
                className="w-full rounded-full"
                onClick={async () => {
                  try {
                    await downloadPdfFromUrl(
                      successInvoice.invoiceUrl!,
                      `${successInvoice.invoiceNumber || "teaching-invoice"}.pdf`
                    );
                  } catch {
                    toast({
                      title: "Download failed",
                      description: "Could not download the invoice. Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download invoice
              </Button>
            )}
            <Button
              className="w-full rounded-full"
              onClick={() => {
                setShowSuccess(false);
                setSuccessInvoice(null);
                onClose?.();
              }}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
