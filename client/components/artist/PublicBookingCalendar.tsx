"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, Clock, DollarSign, MapPin, User, CheckCircle2, AlertCircle } from "lucide-react";
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

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isBooked: boolean;
  price?: number;
  notes?: string;
  bookingId?: string;
}

interface DayAvailability {
  _id: string;
  date: string;
  dayStatus: 'available' | 'partially_booked' | 'fully_booked' | 'unavailable';
  timeSlots: TimeSlot[];
  bookedSlots?: Array<{
    startTime: string;
    endTime: string;
    type: string;
    label?: string;
  }>;
  specialPricing?: {
    isSpecial: boolean;
    multiplier?: number;
    fixedPrice?: number;
    reason?: string;
  };
}

interface Artist {
  _id: string;
  name: string;
  basePrice: number;
  city: string;
  type: string;
}

interface BookingFormData {
  eventName: string;
  eventDescription: string;
  eventLocation: string;
  duration: number;
  specialRequests: string;
}

interface PublicBookingCalendarProps {
  artistId: string;
  artist: Artist;
}

export default function PublicBookingCalendar({ artistId, artist }: PublicBookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasBookingToken, setHasBookingToken] = useState(true);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateObj, setSelectedDateObj] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [manualStartTime, setManualStartTime] = useState('');
  const [manualEndTime, setManualEndTime] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookingForm, setBookingForm] = useState<BookingFormData>({
    eventName: '',
    eventDescription: '',
    eventLocation: '',
    duration: 2,
    specialRequests: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, artistId]);

  const toDateKey = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getTodayKey = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatDateDDMMYY = (dateKey: string) => {
    const [yyyy, mm, dd] = dateKey.split('-');
    return `${dd}/${mm}/${String(yyyy).slice(-2)}`;
  };

  const safeParseDate = (dateKey: string) => new Date(`${dateKey}T00:00:00`);

  const getBookingToken = () => localStorage.getItem('token') || localStorage.getItem('organizer_token');
  const isOrganizerSession = () => !localStorage.getItem('token') && !!localStorage.getItem('organizer_token');
  const getLoginUrl = () => `/auth?redirect=${encodeURIComponent(`/artist/profile/${artistId}/booking`)}`;

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const token = getBookingToken();
      if (!token) {
        setHasBookingToken(false);
        setAvailability([]);
        return;
      }

      setHasBookingToken(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const response = await fetch(`/api/organizer/artists/${artistId}/calendar?month=${month}&year=${year}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json().catch((): null => null);

      if (!response.ok) {
        setAvailability([]);
        toast({
          title: "Booking unavailable",
          description: data?.message || "Please login to book this artist.",
          variant: "destructive",
        });
        return;
      }

      const calendarData = data?.data?.calendarData;
      if (!calendarData || typeof calendarData !== 'object') {
        setAvailability([]);
        return;
      }

      const normalizedAvailability: DayAvailability[] = Object.entries(calendarData).map(
        ([dateKey, dayData]: any) => ({
          _id: `${artistId}-${dateKey}`,
          date: dateKey,
          dayStatus: dayData?.dayStatus || 'available',
          timeSlots: Array.isArray(dayData?.availableSlots)
            ? dayData.availableSlots.map((slot: any) => ({
                startTime: slot.startTime,
                endTime: slot.endTime,
                isAvailable: true,
                isBooked: false,
                price: slot.calculatedPrice || slot.price,
                notes: slot.note,
              }))
            : [],
          bookedSlots: Array.isArray(dayData?.bookedSlots) ? dayData.bookedSlots : [],
          specialPricing: dayData?.isSpecialDay
            ? {
                isSpecial: true,
                reason: dayData?.specialReason,
              }
            : undefined,
        })
      );

      setAvailability(normalizedAvailability);
    } catch (error) {
      console.error('Error fetching availability:', error);
      setAvailability([]);
    } finally {
      setLoading(false);
    }
  };

  const getDateAvailability = (date: Date) => {
    const dateStr = toDateKey(date);
    return availability.find(avail => avail.date === dateStr);
  };

  const isDateDisabled = (date: Date) => {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    if (date < todayStart) return true;

    const dayAvail = getDateAvailability(date);
    if (!dayAvail) return false;
    return dayAvail.dayStatus === 'unavailable' || dayAvail.dayStatus === 'fully_booked';
  };

  const handleDateSelect = (date?: Date) => {
    if (!date || isDateDisabled(date)) return;

    const dateKey = toDateKey(date);
    setSelectedDateObj(date);
    setSelectedDate(dateKey);
    setSelectedTimeSlot(null);
    setManualStartTime('');
    setManualEndTime('');
  };

  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    if (timeSlot.isAvailable && !timeSlot.isBooked) {
      setSelectedTimeSlot(timeSlot);
      setManualStartTime('');
      setManualEndTime('');
    }
  };

  const handleManualTimeContinue = () => {
    if (!selectedDate) return;

    if (!manualStartTime || !manualEndTime) {
      toast({
        title: "Select time",
        description: "Please select both start and end time.",
        variant: "destructive",
      });
      return;
    }

    const start = new Date(`2000-01-01T${manualStartTime}:00`);
    const end = new Date(`2000-01-01T${manualEndTime}:00`);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time.",
        variant: "destructive",
      });
      return;
    }

    setBookingForm(prev => ({ ...prev, duration: Math.ceil(durationHours) }));
    setSelectedTimeSlot({
      startTime: manualStartTime,
      endTime: manualEndTime,
      isAvailable: true,
      isBooked: false,
      price: artist.basePrice,
    });
  };

  const calculatePrice = () => {
    if (!selectedTimeSlot || !selectedDate) return artist.basePrice;

    const dayAvail = availability.find(avail => avail.date === selectedDate);
    let price = selectedTimeSlot.price || artist.basePrice;

    if (dayAvail?.specialPricing?.isSpecial) {
      if (dayAvail.specialPricing.fixedPrice) {
        price = dayAvail.specialPricing.fixedPrice;
      } else if (dayAvail.specialPricing.multiplier) {
        price = price * dayAvail.specialPricing.multiplier;
      }
    }

    return price * bookingForm.duration;
  };

  const handleBookingSubmit = async () => {
    if (!selectedDate || !selectedTimeSlot) return;

    try {
      setSubmitting(true);

      const bookingData = {
        artistId,
        event: {
          name: bookingForm.eventName,
          description: bookingForm.eventDescription,
          date: selectedDate,
          startTime: selectedTimeSlot.startTime,
          endTime: selectedTimeSlot.endTime,
          venue: {
            name: bookingForm.eventLocation,
            address: bookingForm.eventLocation,
            city: artist.city,
            state: '',
            pincode: ''
          },
          eventType: 'private_party',
          expectedAudience: 0
        },
        requestedAmount: calculatePrice(),
        organizerRequirements: '',
        specialRequirements: bookingForm.specialRequests
      };

      const response = await fetch('/api/organizer/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getBookingToken()}`
        },
        body: JSON.stringify(bookingData)
      });

      if (response.ok) {
        const successData = await response.json().catch(() => ({}));
        setCreatedBookingId(successData?.data?.booking?._id || null);
        setShowSuccessModal(true);
        setSelectedDate(null);
        setSelectedTimeSlot(null);
        setManualStartTime('');
        setManualEndTime('');
        setBookingForm(prev => ({
          ...prev,
          eventName: '',
          eventLocation: '',
          eventDescription: '',
          specialRequests: '',
          duration: 1
        }));
        fetchAvailability();
      } else {
        const errorData = await response.json().catch(() => ({}));

        if (errorData.message === "Organizer not found" || response.status === 401) {
          toast({
            title: "Authentication Required",
            description: "Please login to make booking requests. Your session may have expired.",
            variant: "destructive",
            action: (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.location.href = getLoginUrl();
                }}
              >
                Login Again
              </Button>
            )
          });
          setHasBookingToken(false);
        } else if (errorData.message?.includes('token') || response.status === 403) {
          toast({
            title: "Session Expired",
            description: "Your login session has expired. Please login again.",
            variant: "destructive",
            action: (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.location.href = getLoginUrl();
                }}
              >
                Login Again
              </Button>
            )
          });
          setHasBookingToken(false);
        } else {
          toast({
            title: "Booking Failed",
            description: errorData.message || "Failed to create booking request. Please try again.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Error",
        description: "An error occurred while creating the booking request",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const calendarModifiers = useMemo(() => {
    const partiallyBooked: Date[] = [];
    const fullyBooked: Date[] = [];
    const unavailable: Date[] = [];

    for (const day of availability) {
      const d = safeParseDate(day.date);
      if (isNaN(d.getTime())) continue;

      if (day.dayStatus === 'partially_booked') partiallyBooked.push(d);
      if (day.dayStatus === 'fully_booked') fullyBooked.push(d);
      if (day.dayStatus === 'unavailable') unavailable.push(d);
    }

    return { partiallyBooked, fullyBooked, unavailable };
  }, [availability]);

  const selectedDayAvailability = selectedDate ? availability.find(avail => avail.date === selectedDate) : null;

  const manualDurationHours = manualStartTime && manualEndTime
    ? (new Date(`2000-01-01T${manualEndTime}:00`).getTime() - new Date(`2000-01-01T${manualStartTime}:00`).getTime()) / (1000 * 60 * 60)
    : null;

  const isManualTimeRangeValid = manualDurationHours !== null && Number.isFinite(manualDurationHours) && manualDurationHours > 0;

  const totalPrice = calculatePrice();
  const selectedDateLabel = selectedDate ? formatDateDDMMYY(selectedDate) : '';

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-50 via-white to-blue-50 px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-blue-600 px-3 py-1 text-white hover:bg-blue-700">
                  Booking calendar
                </Badge>
                <Badge variant="outline" className="rounded-full border-slate-200 bg-white/70 text-slate-700">
                  Light theme UI
                </Badge>
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  Book {artist.name}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  Choose a date, pick a time slot, and send a booking request in a clean, mobile-friendly flow.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <MapPin className="h-4 w-4 text-slate-500" />
                  <span>{artist.city}</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <User className="h-4 w-4 text-slate-500" />
                  <span>{artist.type}</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <DollarSign className="h-4 w-4 text-slate-500" />
                  <span>From ₹{artist.basePrice}/hour</span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 md:w-[420px]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Selected date</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedDateLabel || 'None'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Time slot</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedTimeSlot ? `${selectedTimeSlot.startTime} - ${selectedTimeSlot.endTime}` : 'Not chosen'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Estimated total</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  ₹{selectedTimeSlot ? totalPrice : artist.basePrice}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Main content */}
      <div className="">
        <div className="space-y-6">
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 sm:text-lg">
                <CalendarIcon className="h-5 w-5 text-slate-600" />
                Pick a date
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
                <div className="overflow-x-auto">
                  <div className="min-w-[320px]">
                    <Calendar
                      mode="single"
                      month={currentDate}
                      onMonthChange={setCurrentDate}
                      selected={selectedDateObj}
                      onSelect={handleDateSelect}
                      disabled={isDateDisabled}
                      modifiers={calendarModifiers}
                      modifiersClassNames={{
                        partiallyBooked: "bg-amber-200 text-amber-950 hover:bg-amber-300 focus:bg-amber-200 font-medium",
                        fullyBooked: "bg-rose-500 text-white hover:bg-rose-600 focus:bg-rose-500 cursor-not-allowed opacity-95",
                        unavailable: "bg-slate-100 text-slate-500 cursor-not-allowed opacity-90",
                      }}
                      className="rounded-2xl border-0 bg-white shadow-sm"
                      classNames={{
                        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 p-2 sm:p-4",
                        month: "space-y-4 w-full",
                        caption: "flex justify-center pt-1 relative items-center px-2",
                        caption_label: "text-sm font-semibold text-slate-800",
                        nav: "space-x-1 flex items-center",
                        nav_button: "h-8 w-8 bg-transparent p-0 opacity-60 hover:opacity-100 rounded-lg",
                        nav_button_previous: "absolute left-1",
                        nav_button_next: "absolute right-1",
                        table: "w-full border-collapse space-y-1",
                        head_row: "flex justify-around",
                        head_cell: "text-slate-500 rounded-md w-8 sm:w-9 font-normal text-[0.75rem] sm:text-[0.8rem] flex-1 text-center",
                        row: "flex w-full mt-2 justify-around",
                        cell: "text-center text-sm p-0 relative flex-1 [&:has([aria-selected])]:bg-transparent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                        day: "h-8 w-8 sm:h-10 sm:w-10 p-0 font-normal hover:bg-slate-100 rounded-xl aria-selected:opacity-100 mx-auto text-sm sm:text-base transition-colors",
                        day_selected: "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white shadow-sm",
                        day_today: "bg-slate-100 text-slate-900 font-semibold",
                        day_outside: "text-slate-400 opacity-50",
                        day_disabled: "text-slate-400 opacity-50 line-through",
                        day_hidden: "invisible",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                  <span className="h-3 w-3 rounded-full bg-amber-300 ring-1 ring-amber-400" />
                  Partially booked
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                  <span className="h-3 w-3 rounded-full bg-rose-500" />
                  Fully booked
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                  <span className="h-3 w-3 rounded-full bg-slate-200 ring-1 ring-slate-300" />
                  Open / available
                </div>
              </div>

              {!loading && !hasBookingToken && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Login to view availability and send booking requests.</p>
                </div>
              )}

              {!loading && hasBookingToken && availability.length === 0 && (
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <p>All dates are open by default. Only dates explicitly marked unavailable by the artist will be blocked.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedDate && (
            <Card className="border border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 sm:text-lg">
                  <Clock className="h-5 w-5 text-slate-600" />
                  Time options for {formatDateDDMMYY(selectedDate)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 px-4 pb-4 sm:px-6 sm:pb-6">
                {selectedDayAvailability?.bookedSlots && selectedDayAvailability.bookedSlots.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 mb-2">
                      Already booked on this date
                    </p>
                    <div className="space-y-1">
                      {selectedDayAvailability.bookedSlots.map((slot, i) => (
                        <p key={i} className="text-sm text-amber-900">
                          {slot.startTime}–{slot.endTime}
                          {slot.label ? ` · ${slot.label}` : ''}
                          {slot.type === 'teaching' ? ' (Teaching)' : slot.type === 'event' ? ' (Event)' : ''}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {selectedDayAvailability?.dayStatus === 'unavailable' ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    This date is marked unavailable by the artist.
                  </div>
                ) : selectedDayAvailability && selectedDayAvailability.timeSlots.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {selectedDayAvailability.timeSlots.map((slot, index) => {
                      const active = slot.isAvailable && !slot.isBooked;
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleTimeSlotSelect(slot)}
                          className={`group rounded-2xl border p-4 text-left transition-all ${
                            active
                              ? 'border-emerald-200 bg-emerald-50 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-900'
                              : 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-80'
                          }`}
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {slot.startTime} - {slot.endTime}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">Per hour pricing</p>
                            </div>
                            <Badge
                              variant={active ? 'default' : 'secondary'}
                              className={active ? 'rounded-full bg-emerald-600 text-white' : 'rounded-full'}
                            >
                              {slot.isBooked ? 'Booked' : slot.isAvailable ? 'Available' : 'Unavailable'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <DollarSign className="h-4 w-4 text-slate-500" />
                            <span>₹{slot.price || artist.basePrice}/hour</span>
                          </div>
                          {slot.notes && (
                            <p className="mt-2 text-xs leading-5 text-slate-500">{slot.notes}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                      <p className="text-sm font-medium text-slate-900">Choose a custom timing</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        This artist hasn’t set predefined slots for this date. Pick a quick duration, use a popular time range, or enter your own timings.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Quick select</Label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { hours: 2, label: '2 hours' },
                          { hours: 3, label: '3 hours' },
                          { hours: 4, label: '4 hours' },
                          { hours: 6, label: '6 hours' },
                        ].map(({ hours, label }) => (
                          <Button
                            key={hours}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const now = new Date();
                              const startHour = now.getHours();
                              const start = `${String(startHour).padStart(2, '0')}:00`;
                              const endHour = (startHour + hours) % 24;
                              const end = `${String(endHour).padStart(2, '0')}:00`;
                              setManualStartTime(start);
                              setManualEndTime(end);
                              setBookingForm(prev => ({ ...prev, duration: hours }));
                            }}
                            className="rounded-full border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Popular times</Label>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {[
                          { start: '09:00', end: '12:00', label: 'Morning (9 AM – 12 PM)' },
                          { start: '14:00', end: '17:00', label: 'Afternoon (2 PM – 5 PM)' },
                          { start: '17:00', end: '20:00', label: 'Evening (5 PM – 8 PM)' },
                          { start: '18:00', end: '21:00', label: 'Dinner (6 PM – 9 PM)' },
                        ].map(({ start, end, label }) => (
                          <Button
                            key={label}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setManualStartTime(start);
                              setManualEndTime(end);
                              const duration = (new Date(`2000-01-01T${end}:00`).getTime() - new Date(`2000-01-01T${start}:00`).getTime()) / (1000 * 60 * 60);
                              setBookingForm(prev => ({ ...prev, duration: Math.ceil(duration) }));
                            }}
                            className="justify-start rounded-2xl border-slate-300 bg-white text-left text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 sm:text-sm"
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="manualStartTime" className="text-xs font-medium text-slate-600">
                            Start time
                          </Label>
                          <Input
                            id="manualStartTime"
                            type="time"
                            value={manualStartTime}
                            onChange={(e) => {
                              setManualStartTime(e.target.value);
                              if (manualEndTime) {
                                const start = new Date(`2000-01-01T${e.target.value}:00`);
                                const end = new Date(`2000-01-01T${manualEndTime}:00`);
                                const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                                if (duration > 0) {
                                  setBookingForm(prev => ({ ...prev, duration: Math.ceil(duration) }));
                                }
                              }
                            }}
                            className="rounded-xl"
                          />
                        </div>
                        <div>
                          <Label htmlFor="manualEndTime" className="text-xs font-medium text-slate-600">
                            End time
                          </Label>
                          <Input
                            id="manualEndTime"
                            type="time"
                            value={manualEndTime}
                            onChange={(e) => {
                              setManualEndTime(e.target.value);
                              if (manualStartTime) {
                                const start = new Date(`2000-01-01T${manualStartTime}:00`);
                                const end = new Date(`2000-01-01T${e.target.value}:00`);
                                const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                                if (duration > 0) {
                                  setBookingForm(prev => ({ ...prev, duration: Math.ceil(duration) }));
                                }
                              }
                            }}
                            className="rounded-xl"
                          />
                        </div>
                      </div>

                      {manualStartTime && manualEndTime && !isManualTimeRangeValid && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                          End time must be after start time.
                        </div>
                      )}

                      {isManualTimeRangeValid && (
                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                          <p className="text-sm font-medium text-blue-900">
                            Duration: {Math.ceil(manualDurationHours!)} hour(s)
                          </p>
                          <p className="mt-1 text-xs text-blue-700">
                            You can edit this later before sending the request.
                          </p>
                        </div>
                      )}

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-slate-500">Set the timings first, then continue to the booking details.</p>
                        <Button
                          onClick={handleManualTimeContinue}
                          disabled={!manualStartTime || !manualEndTime || !isManualTimeRangeValid}
                          className="rounded-full bg-blue-600 px-5 text-white hover:bg-blue-700"
                        >
                          Continue to details
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {selectedDate && selectedTimeSlot && (
            <Card className="border border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
                <CardTitle className="text-base font-semibold text-slate-900 sm:text-lg">
                  Finalize your booking
                </CardTitle>
                <p className="text-sm text-slate-600">
                  {selectedDateLabel} • {selectedTimeSlot.startTime} - {selectedTimeSlot.endTime}
                </p>
              </CardHeader>
              <CardContent className="space-y-5 px-4 pb-4 sm:px-6 sm:pb-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="eventName" className="text-sm font-medium text-slate-700">
                      Event Name *
                    </Label>
                    <Input
                      id="eventName"
                      value={bookingForm.eventName}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, eventName: e.target.value }))}
                      placeholder="Enter event name"
                      required
                      className="mt-1 rounded-xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="eventLocation" className="text-sm font-medium text-slate-700">
                      Event Location *
                    </Label>
                    <Input
                      id="eventLocation"
                      value={bookingForm.eventLocation}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, eventLocation: e.target.value }))}
                      placeholder="Enter event location"
                      required
                      className="mt-1 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="duration" className="text-sm font-medium text-slate-700">
                    Duration (hours) *
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    max="12"
                    value={bookingForm.duration}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 1 }))}
                    required
                    className="mt-1 rounded-xl"
                  />
                </div>

                <div>
                  <Label htmlFor="eventDescription" className="text-sm font-medium text-slate-700">
                    Event Description
                  </Label>
                  <Textarea
                    id="eventDescription"
                    value={bookingForm.eventDescription}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, eventDescription: e.target.value }))}
                    placeholder="Describe your event"
                    rows={4}
                    className="mt-1 rounded-xl"
                  />
                </div>

                <div>
                  <Label htmlFor="specialRequests" className="text-sm font-medium text-slate-700">
                    Special Requests
                  </Label>
                  <Textarea
                    id="specialRequests"
                    value={bookingForm.specialRequests}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, specialRequests: e.target.value }))}
                    placeholder="Any special requirements or requests"
                    rows={3}
                    className="mt-1 rounded-xl"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="space-y-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-slate-500" />Base Price</span>
                      <span>₹{selectedTimeSlot?.price || artist.basePrice}/hour</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-500" />Duration</span>
                      <span>{bookingForm.duration} hours</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
                      <span>Total</span>
                      <span className="text-blue-700">₹{totalPrice}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedTimeSlot(null);
                      setManualStartTime('');
                      setManualEndTime('');
                      setBookingForm(prev => ({
                        ...prev,
                        eventName: '',
                        eventLocation: '',
                        eventDescription: '',
                        specialRequests: '',
                        duration: 1,
                      }));
                    }}
                    className="flex-1 rounded-full border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBookingSubmit}
                    disabled={submitting || !bookingForm.eventName || !bookingForm.eventLocation}
                    className="flex-1 rounded-full bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {submitting ? 'Sending...' : 'Send Booking Request'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl">
          <div className="px-5 py-6 sm:px-6">
            <DialogHeader>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <DialogTitle className="text-xl font-semibold text-slate-900">
                  Booking request sent!
                </DialogTitle>
                <p className="mt-2 text-sm text-slate-600">
                  Your request has been successfully sent to <span className="font-medium text-slate-900">{artist.name}</span>.
                </p>
              </div>
            </DialogHeader>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <h4 className="text-sm font-semibold text-blue-900">What happens next?</h4>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-blue-800">
                  <li>• The artist team reviews your request</li>
                  <li>• They contact you via phone or email</li>
                  <li>• You confirm final details and pricing</li>
                  <li>• The booking is confirmed after agreement</li>
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => {
                    setShowSuccessModal(false);
                    window.location.href = isOrganizerSession()
                      ? '/organizer/dashboard'
                      : createdBookingId
                        ? `/profile/artist-bookings/${createdBookingId}`
                        : '/profile';
                  }}
                  className="w-full rounded-full bg-blue-600 text-white hover:bg-blue-700"
                >
                  Check Booking Status
                </Button>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSuccessModal(false);
                      window.location.href = `/artist/profile/${artistId}`;
                    }}
                    className="flex-1 rounded-full border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    View Artist Profile
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowSuccessModal(false)}
                    className="flex-1 rounded-full border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
