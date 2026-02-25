"use client";

import { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock, DollarSign, User, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [manualStartTime, setManualStartTime] = useState('');
  const [manualEndTime, setManualEndTime] = useState('');
  const [showBookingForm, setShowBookingForm] = useState(false);
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

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getDateAvailability = (date: Date) => {
    const dateStr = toDateKey(date);
    return availability.find(avail => avail.date === dateStr);
  };

  const getDayStatusColor = (date: Date) => {
    const todayKey = getTodayKey();
    const dateKey = toDateKey(date);
    if (dateKey < todayKey) return 'bg-gray-100 text-gray-400 cursor-not-allowed';

    const dayAvail = getDateAvailability(date);
    if (!dayAvail) return 'bg-green-50 text-green-800 hover:bg-green-100 cursor-pointer';
    
    switch (dayAvail.dayStatus) {
      case 'available':
        return 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer';
      case 'partially_booked':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 cursor-pointer';
      case 'fully_booked':
        return 'bg-red-100 text-red-800';
      case 'unavailable':
        return 'bg-gray-100 text-gray-500';
      default:
        return 'bg-gray-100 text-gray-400';
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateClick = (date: Date) => {
    const todayKey = getTodayKey();
    const dateKey = toDateKey(date);
    if (dateKey < todayKey) {
      return;
    }

    const dayAvail = getDateAvailability(date);
    if (dayAvail && (dayAvail.dayStatus === 'unavailable' || dayAvail.dayStatus === 'fully_booked')) {
      return;
    }
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
      setShowBookingForm(true);
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
    setShowBookingForm(true);
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
        toast({
          title: "Booking Request Sent",
          description: "Your booking request has been sent to the artist for approval.",
        });
        setShowBookingForm(false);
        setSelectedDate(null);
        setSelectedTimeSlot(null);
        setManualStartTime('');
        setManualEndTime('');
        setBookingForm({
          eventName: '',
          eventDescription: '',
          eventLocation: '',
          duration: 2,
          specialRequests: ''
        });
        fetchAvailability(); // Refresh availability
      } else {
        const errorData = await response.json();
        toast({
          title: "Booking Failed",
          description: errorData.message || "Failed to create booking request",
          variant: "destructive"
        });
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

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const selectedDayAvailability = selectedDate ? availability.find(avail => avail.date === selectedDate) : null;
  const manualDurationHours = manualStartTime && manualEndTime
    ? (new Date(`2000-01-01T${manualEndTime}:00`).getTime() - new Date(`2000-01-01T${manualStartTime}:00`).getTime()) / (1000 * 60 * 60)
    : null;
  const isManualTimeRangeValid = manualDurationHours !== null && Number.isFinite(manualDurationHours) && manualDurationHours > 0;

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
          <span>Partially Booked</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
          <span>Fully Booked</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
          <span>Unavailable</span>
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

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center font-medium text-gray-500 text-sm">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {days.map((date, index) => (
          <div key={index} className="aspect-square">
            {date ? (
              <div
                className={`w-full h-full p-1 text-center text-sm rounded-lg transition-colors ${getDayStatusColor(date)} ${
                  selectedDate === toDateKey(date) ? 'ring-2 ring-pink-500' : ''
                }`}
                onClick={() => handleDateClick(date)}
              >
                {date.getDate()}
              </div>
            ) : (
              <div className="w-full h-full"></div>
            )}
          </div>
        ))}
      </div>

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
                    This artist hasn’t set predefined slots for this date. Select a time range and send a request.
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="manualStartTime">From</Label>
                    <Input
                      id="manualStartTime"
                      type="time"
                      value={manualStartTime}
                      onChange={(e) => setManualStartTime(e.target.value)}
                    />
                    <div className="text-xs text-gray-500 mt-1">Example: 18:30</div>
                  </div>
                  <div>
                    <Label htmlFor="manualEndTime">To</Label>
                    <Input
                      id="manualEndTime"
                      type="time"
                      value={manualEndTime}
                      onChange={(e) => setManualEndTime(e.target.value)}
                    />
                    <div className="text-xs text-gray-500 mt-1">Example: 21:30</div>
                  </div>
                </div>
                {manualStartTime && manualEndTime && !isManualTimeRangeValid && (
                  <div className="text-sm text-red-600">
                    End time must be after start time.
                  </div>
                )}
                {isManualTimeRangeValid && (
                  <div className="text-sm text-gray-700">
                    Duration: <span className="font-medium">{Math.ceil(manualDurationHours!)} hour(s)</span>
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

      {/* Booking Form Dialog */}
      <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book {artist.name}</DialogTitle>
            <DialogDescription>
              {selectedDate && selectedTimeSlot && (
                <>
                  {formatDateDDMMYY(selectedDate)} • {selectedTimeSlot.startTime} - {selectedTimeSlot.endTime}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
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
                onClick={() => setShowBookingForm(false)}
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
