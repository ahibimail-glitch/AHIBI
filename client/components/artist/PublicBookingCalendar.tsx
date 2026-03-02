"use client";

import { useMemo, useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, DollarSign, User, MapPin } from "lucide-react";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  const [hasOrganizerToken, setHasOrganizerToken] = useState(true);
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

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('organizer_token');
      if (!token) {
        setHasOrganizerToken(false);
        setAvailability([]);
        return;
      }
      setHasOrganizerToken(true);
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
          description: data?.message || "Please login as organizer to book this artist.",
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
          dayStatus: dayData?.dayStatus || 'unavailable',
          timeSlots: Array.isArray(dayData?.availableSlots)
            ? dayData.availableSlots.map((slot: any) => ({
                startTime: slot.startTime,
                endTime: slot.endTime,
                isAvailable: true,
                isBooked: false,
                price: slot.calculatedPrice,
                notes: slot.note,
              }))
            : [],
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
    if (!date) return;
    if (isDateDisabled(date)) return;

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
      // Don't show dialog, just set state to show inline form
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
    // Don't show dialog, just set state to show inline form
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
          'Authorization': `Bearer ${localStorage.getItem('organizer_token')}`
        },
        body: JSON.stringify(bookingData)
      });

      if (response.ok) {
        // Show success modal instead of toast
        setShowSuccessModal(true);
        // Reset form after successful submission
        setSelectedDate(null);
        setSelectedTimeSlot(null);
        setManualStartTime('');
        setManualEndTime('');
        setBookingForm(prev => ({ ...prev, eventName: '', eventLocation: '', eventDescription: '', specialRequests: '', duration: 1 }));
        fetchAvailability(); // Refresh availability
      } else {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific error cases
        if (errorData.message === "Organizer not found" || response.status === 401) {
          toast({
            title: "Authentication Required",
            description: "Please login as an organizer to make booking requests. Your session may have expired.",
            variant: "destructive",
            action: (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  localStorage.removeItem('organizer_token');
                  window.location.href = '/organizer/auth/login';
                }}
              >
                Login Again
              </Button>
            )
          });
          // Clear invalid token
          localStorage.removeItem('organizer_token');
          setHasOrganizerToken(false);
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
                  localStorage.removeItem('organizer_token');
                  window.location.href = '/organizer/auth/login';
                }}
              >
                Login Again
              </Button>
            )
          });
          localStorage.removeItem('organizer_token');
          setHasOrganizerToken(false);
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
      const d = new Date(day.date);
      if (isNaN(d.getTime())) continue;

      if (day.dayStatus === 'partially_booked') partiallyBooked.push(d);
      if (day.dayStatus === 'fully_booked') fullyBooked.push(d);
      if (day.dayStatus === 'unavailable') unavailable.push(d);
    }

    return {
      partiallyBooked,
      fullyBooked,
      unavailable,
    };
  }, [availability]);

  const selectedDayAvailability = selectedDate ? availability.find(avail => avail.date === selectedDate) : null;
  const manualDurationHours = manualStartTime && manualEndTime
    ? (new Date(`2000-01-01T${manualEndTime}:00`).getTime() - new Date(`2000-01-01T${manualStartTime}:00`).getTime()) / (1000 * 60 * 60)
    : null;
  const isManualTimeRangeValid = manualDurationHours !== null && Number.isFinite(manualDurationHours) && manualDurationHours > 0;

  return (
    <div className="space-y-6">

      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Select a date
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="flex justify-center overflow-x-auto">
            <Calendar
              mode="single"
              month={currentDate}
              onMonthChange={setCurrentDate}
              selected={selectedDateObj}
              onSelect={handleDateSelect}
              disabled={isDateDisabled}
              modifiers={calendarModifiers}
              modifiersClassNames={{
                partiallyBooked:
                  "bg-yellow-400 text-yellow-900 hover:bg-yellow-500 hover:text-yellow-950 focus:bg-yellow-400 focus:text-yellow-900 font-medium",
                fullyBooked:
                  "bg-red-500 text-white hover:bg-red-600 hover:text-white focus:bg-red-500 focus:text-white cursor-not-allowed opacity-90",
                unavailable:
                  "bg-gray-100 text-gray-500 cursor-not-allowed opacity-80",
              }}
              className="rounded-lg border-0"
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4 w-full",
                caption: "flex justify-center pt-1 relative items-center px-2",
                caption_label: "text-sm font-semibold",
                nav: "space-x-1 flex items-center",
                nav_button: "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex justify-around",
                head_cell:
                  "text-gray-500 rounded-md w-8 sm:w-9 font-normal text-[0.75rem] sm:text-[0.8rem] flex-1 text-center",
                row: "flex w-full mt-2 justify-around",
                cell:
                  "text-center text-sm p-0 relative flex-1 [&:has([aria-selected])]:bg-transparent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: "h-8 w-8 sm:h-9 sm:w-9 p-0 font-normal hover:bg-gray-100 rounded-md aria-selected:opacity-100 mx-auto text-sm sm:text-base",
                day_selected:
                  "bg-blue-500 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-500 focus:text-white",
                day_today: "bg-gray-100 text-gray-900 font-semibold",
                day_outside: "text-gray-400 opacity-50",
                day_disabled: "text-gray-400 opacity-50 line-through",
                day_hidden: "invisible",
              }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-400 border border-yellow-500"></div>
              <span className="text-gray-600">Partially Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span className="text-gray-600">Fully Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-100 border border-gray-300"></div>
              <span className="text-gray-600">Available</span>
            </div>
          </div>

          {!loading && !hasOrganizerToken && (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
              Login as an organizer to view availability and book this artist.
            </div>
          )}

          {!loading && hasOrganizerToken && availability.length === 0 && (
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 text-sm">
              All dates are open by default. Only dates explicitly marked unavailable by the artist will be blocked.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Date Time Slots */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Available Time Slots - {formatDateDDMMYY(selectedDate)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDayAvailability?.dayStatus === 'unavailable' ? (
              <div className="text-sm text-gray-600">
                This date is marked unavailable by the artist.
              </div>
            ) : selectedDayAvailability && selectedDayAvailability.timeSlots.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedDayAvailability.timeSlots.map((slot, index) => (
                  <div
                    key={index}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      slot.isAvailable && !slot.isBooked
                        ? 'border-green-300 bg-green-50 hover:bg-green-100'
                        : 'border-gray-300 bg-gray-50 cursor-not-allowed'
                    }`}
                    onClick={() => handleTimeSlotSelect(slot)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">
                        {slot.startTime} - {slot.endTime}
                      </span>
                      <Badge variant={slot.isAvailable && !slot.isBooked ? "default" : "secondary"}>
                        {slot.isBooked ? 'Booked' : slot.isAvailable ? 'Available' : 'Unavailable'}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      ₹{slot.price || artist.basePrice}/hour
                    </div>
                    {slot.notes && (
                      <div className="text-xs text-gray-500 mt-1">{slot.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="text-sm text-gray-800 font-medium">
                    Pick your preferred time
                  </div>
                  <div className="text-sm text-gray-600">
                    This artist hasn’t set predefined slots for this date. Choose a quick duration or set a custom time range.
                  </div>
                </div>

                {/* Quick Duration Buttons */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Quick select</Label>
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
                        className="text-xs sm:text-sm"
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Common Time Presets */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Popular times</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                        className="text-xs sm:text-sm justify-start"
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Time */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Or choose custom time</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="manualStartTime" className="text-xs text-gray-600">Start time</Label>
                      <Input
                        id="manualStartTime"
                        type="time"
                        value={manualStartTime}
                        onChange={(e) => {
                          setManualStartTime(e.target.value);
                          // Auto-calculate duration if end time is set
                          if (manualEndTime) {
                            const start = new Date(`2000-01-01T${e.target.value}:00`);
                            const end = new Date(`2000-01-01T${manualEndTime}:00`);
                            const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                            if (duration > 0) {
                              setBookingForm(prev => ({ ...prev, duration: Math.ceil(duration) }));
                            }
                          }
                        }}
                      />
                      <div className="text-xs text-gray-500 mt-1">e.g., 18:30</div>
                    </div>
                    <div>
                      <Label htmlFor="manualEndTime" className="text-xs text-gray-600">End time</Label>
                      <Input
                        id="manualEndTime"
                        type="time"
                        value={manualEndTime}
                        onChange={(e) => {
                          setManualEndTime(e.target.value);
                          // Auto-calculate duration if start time is set
                          if (manualStartTime) {
                            const start = new Date(`2000-01-01T${manualStartTime}:00`);
                            const end = new Date(`2000-01-01T${e.target.value}:00`);
                            const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                            if (duration > 0) {
                              setBookingForm(prev => ({ ...prev, duration: Math.ceil(duration) }));
                            }
                          }
                        }}
                      />
                      <div className="text-xs text-gray-500 mt-1">e.g., 21:30</div>
                    </div>
                  </div>
                </div>

                {manualStartTime && manualEndTime && !isManualTimeRangeValid && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    End time must be after start time.
                  </div>
                )}
                {isManualTimeRangeValid && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Duration:</span> {Math.ceil(manualDurationHours!)} hour(s)
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      You can edit this before sending the request.
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-500">
                    You can edit this later before sending.
                  </div>
                  <Button onClick={handleManualTimeContinue} disabled={!manualStartTime || !manualEndTime || !isManualTimeRangeValid}>
                    Continue to details
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Booking Form - Inline */}
      {selectedDate && selectedTimeSlot && (
        <Card className="mt-4">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Book {artist.name}</h3>
                <p className="text-sm text-gray-600">
                  {formatDateDDMMYY(selectedDate)} • {selectedTimeSlot.startTime} - {selectedTimeSlot.endTime}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="eventName">Event Name *</Label>
                  <Input
                    id="eventName"
                    value={bookingForm.eventName}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, eventName: e.target.value }))}
                    placeholder="Enter event name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="eventLocation">Event Location *</Label>
                  <Input
                    id="eventLocation"
                    value={bookingForm.eventLocation}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, eventLocation: e.target.value }))}
                    placeholder="Enter event location"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="duration">Duration (hours) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="12"
                  value={bookingForm.duration}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 1 }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="eventDescription">Event Description</Label>
                <Textarea
                  id="eventDescription"
                  value={bookingForm.eventDescription}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, eventDescription: e.target.value }))}
                  placeholder="Describe your event"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="specialRequests">Special Requests</Label>
                <Textarea
                  id="specialRequests"
                  value={bookingForm.specialRequests}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, specialRequests: e.target.value }))}
                  placeholder="Any special requirements or requests"
                  rows={2}
                />
              </div>

              {/* Pricing Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span>Base Price:</span>
                  <span>₹{selectedTimeSlot?.price || artist.basePrice}/hour</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span>Duration:</span>
                  <span>{bookingForm.duration} hours</span>
                </div>
                <div className="flex justify-between items-center font-semibold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span className="text-green-600">₹{calculatePrice()}</span>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTimeSlot(null);
                    setManualStartTime('');
                    setManualEndTime('');
                    setBookingForm(prev => ({ ...prev, eventName: '', eventLocation: '', eventDescription: '', specialRequests: '', duration: 1 }));
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBookingSubmit}
                  disabled={submitting || !bookingForm.eventName || !bookingForm.eventLocation}
                  className="flex-1"
                >
                  {submitting ? 'Sending...' : 'Send Booking Request'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <DialogTitle className="text-xl font-semibold text-gray-900">Booking Request Sent!</DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Your booking request has been successfully sent to <span className="font-medium">{artist.name}</span>.
            </p>
            <p className="text-gray-700 font-medium">
              The artist team will contact you shortly to confirm the details.
            </p>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Artist team will review your request</li>
                <li>• They'll contact you via phone or email</li>
                <li>• You'll discuss final details and pricing</li>
                <li>• Booking will be confirmed upon agreement</li>
              </ul>
            </div>
            
            <div className="flex space-x-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowSuccessModal(false)}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowSuccessModal(false);
                  // Optionally redirect to artist profile or bookings page
                  window.location.href = `/artist/profile/${artistId}`;
                }}
                className="flex-1"
              >
                View Artist Profile
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
