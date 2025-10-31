"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, Plus, Edit, Trash2, Save, X, User, DollarSign, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  dayStatus: 'available' | 'unavailable' | 'partially_booked' | 'fully_booked';
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

interface AvailabilityCalendarProps {
  onUpdate?: () => void;
}

export default function AvailabilityCalendar({ onUpdate }: AvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availability, setAvailability] = useState<{ [key: string]: AvailabilityData }>({});
  const [bookings, setBookings] = useState<{ [key: string]: any[] }>({});
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [showTimeSlotDialog, setShowTimeSlotDialog] = useState(false);
  const [newTimeSlot, setNewTimeSlot] = useState<TimeSlot>({
    startTime: '09:00',
    endTime: '10:00',
    isAvailable: true,
    isBooked: false,
    price: 0,
    note: ''
  });

  // Get calendar data for current month
  useEffect(() => {
    fetchAvailability();
    fetchBookings();
  }, [currentDate]);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('artist_token');
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      const response = await fetch(`/api/artist/availability?month=${month}&year=${year}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const availabilityMap: { [key: string]: AvailabilityData } = {};
        
        data.data.availability.forEach((avail: AvailabilityData) => {
          const dateKey = new Date(avail.date).toISOString().split('T')[0];
          availabilityMap[dateKey] = avail;
        });
        
        setAvailability(availabilityMap);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('artist_token');
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      // Fetch all bookings for this month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      const response = await fetch(`/api/artist/bookings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const bookingsMap: { [key: string]: any[] } = {};
        
        (data.data?.bookings || []).forEach((booking: any) => {
          const bookingDate = new Date(booking.event.date);
          if (bookingDate >= startDate && bookingDate <= endDate) {
            const dateKey = bookingDate.toISOString().split('T')[0];
            if (!bookingsMap[dateKey]) {
              bookingsMap[dateKey] = [];
            }
            bookingsMap[dateKey].push(booking);
          }
        });
        
        setBookings(bookingsMap);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const saveAvailability = async (dateKey: string, availabilityData: AvailabilityData) => {
    try {
      const token = localStorage.getItem('artist_token');
      const method = availabilityData._id ? 'PUT' : 'POST';
      const url = availabilityData._id 
        ? `/api/artist/availability/${availabilityData._id}`
        : '/api/artist/availability';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: dateKey,
          timeSlots: availabilityData.timeSlots,
          dayStatus: availabilityData.dayStatus,
          specialPricing: availabilityData.specialPricing,
          minimumBookingDuration: availabilityData.minimumBookingDuration,
          maximumBookingDuration: availabilityData.maximumBookingDuration,
          advanceBookingDays: availabilityData.advanceBookingDays
        })
      });

      if (response.ok) {
        const result = await response.json();
        setAvailability(prev => ({
          ...prev,
          [dateKey]: result.data.availability
        }));
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error saving availability:', error);
    }
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      const dateKey = current.toISOString().split('T')[0];
      const isCurrentMonth = current.getMonth() === month;
      const isToday = current.toDateString() === new Date().toDateString();
      const dayAvailability = availability[dateKey];
      const dayBookings = bookings[dateKey] || [];

      days.push({
        date: new Date(current),
        dateKey,
        isCurrentMonth,
        isToday,
        availability: dayAvailability,
        bookings: dayBookings
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const getDayStatusColor = (status?: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'partially_booked': return 'bg-yellow-100 text-yellow-800';
      case 'fully_booked': return 'bg-red-100 text-red-800';
      case 'unavailable': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  const addTimeSlot = (dateKey: string) => {
    const dayAvailability = availability[dateKey] || {
      date: dateKey,
      timeSlots: [],
      dayStatus: 'available',
      specialPricing: { isSpecialDay: false, multiplier: 1 },
      minimumBookingDuration: 2,
      maximumBookingDuration: 8,
      advanceBookingDays: 7
    };

    const updatedSlots = [...dayAvailability.timeSlots, newTimeSlot];
    const updatedAvailability = {
      ...dayAvailability,
      timeSlots: updatedSlots
    };

    saveAvailability(dateKey, updatedAvailability);
    setShowTimeSlotDialog(false);
    setNewTimeSlot({
      startTime: '09:00',
      endTime: '10:00',
      isAvailable: true,
      isBooked: false,
      price: 0,
      note: ''
    });
  };

  const removeTimeSlot = (dateKey: string, slotIndex: number) => {
    const dayAvailability = availability[dateKey];
    if (!dayAvailability) return;

    const updatedSlots = dayAvailability.timeSlots.filter((_, index) => index !== slotIndex);
    const updatedAvailability = {
      ...dayAvailability,
      timeSlots: updatedSlots
    };

    saveAvailability(dateKey, updatedAvailability);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold text-gray-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
          Today
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map(({ date, dateKey, isCurrentMonth, isToday, availability: dayAvailability, bookings: dayBookings }) => {
              const hasBooking = dayBookings.length > 0;
              const confirmedBooking = dayBookings.find((b: any) => b.booking?.status === 'confirmed');
              
              return (
                <div
                  key={dateKey}
                  className={`
                    min-h-[100px] p-2 border-2 rounded-lg cursor-pointer transition-all
                    ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                    ${isToday ? 'ring-2 ring-purple-500 shadow-md' : ''}
                    ${selectedDate === dateKey ? 'bg-purple-50 border-purple-300 shadow-md' : 'border-gray-200'}
                    ${hasBooking ? 'bg-green-50 border-green-300' : ''}
                    hover:shadow-lg hover:scale-105
                  `}
                  onClick={() => {
                    setSelectedDate(selectedDate === dateKey ? '' : dateKey);
                    if (hasBooking && dayBookings.length === 1) {
                      setSelectedBooking(dayBookings[0]);
                      setShowBookingDialog(true);
                    }
                  }}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm font-semibold ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                      {date.getDate()}
                    </span>
                    <div className="flex flex-col items-end gap-1">
                      {confirmedBooking && (
                        <Badge className="bg-green-500 text-white text-xs">
                          <DollarSign className="h-3 w-3 mr-1" />
                          ₹{confirmedBooking.booking?.finalAmount || confirmedBooking.booking?.requestedAmount || 0}
                        </Badge>
                      )}
                      {dayAvailability && (
                        <Badge variant="secondary" className={`text-xs ${getDayStatusColor(dayAvailability.dayStatus)}`}>
                          {dayAvailability.timeSlots.filter(slot => slot.isAvailable && !slot.isBooked).length} slots
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {hasBooking && (
                    <div className="space-y-1 mt-2">
                      {dayBookings.map((booking: any, idx: number) => (
                        <div
                          key={idx}
                          className="text-xs bg-white p-1 rounded border border-green-200 cursor-pointer hover:bg-green-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBooking(booking);
                            setShowBookingDialog(true);
                          }}
                        >
                          <div className="font-semibold text-green-700 truncate">
                            {booking.event.name}
                          </div>
                          <div className="text-gray-600 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {booking.event.startTime} - {booking.event.endTime}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {!hasBooking && dayAvailability && (
                    <div className="space-y-1 mt-2">
                      {dayAvailability.specialPricing.isSpecialDay && (
                        <div className="text-xs text-orange-600 font-medium bg-orange-50 px-1 py-0.5 rounded">
                          Special Pricing
                        </div>
                      )}
                      {dayAvailability.timeSlots.length > 0 && (
                        <div className="text-xs text-gray-500">
                          {dayAvailability.timeSlots.filter(slot => !slot.isBooked).length} available
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                <Calendar className="h-5 w-5 inline mr-2" />
                {new Date(selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
              <Dialog open={showTimeSlotDialog} onOpenChange={setShowTimeSlotDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Time Slot
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Time Slot</DialogTitle>
                    <DialogDescription>
                      Create a new available time slot for this date.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startTime">Start Time</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={newTimeSlot.startTime}
                          onChange={(e) => setNewTimeSlot(prev => ({ ...prev, startTime: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endTime">End Time</Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={newTimeSlot.endTime}
                          onChange={(e) => setNewTimeSlot(prev => ({ ...prev, endTime: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="price">Custom Price (optional)</Label>
                      <Input
                        id="price"
                        type="number"
                        placeholder="Leave empty to use base price"
                        value={newTimeSlot.price || ''}
                        onChange={(e) => setNewTimeSlot(prev => ({ ...prev, price: e.target.value ? parseInt(e.target.value) : 0 }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="note">Note (optional)</Label>
                      <Textarea
                        id="note"
                        placeholder="Any special notes for this time slot"
                        value={newTimeSlot.note}
                        onChange={(e) => setNewTimeSlot(prev => ({ ...prev, note: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="available"
                        checked={newTimeSlot.isAvailable}
                        onCheckedChange={(checked) => setNewTimeSlot(prev => ({ ...prev, isAvailable: checked }))}
                      />
                      <Label htmlFor="available">Available for booking</Label>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowTimeSlotDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={() => addTimeSlot(selectedDate)}>
                        Add Time Slot
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {availability[selectedDate] ? (
              <div className="space-y-4">
                {/* Time Slots */}
                <div>
                  <h4 className="font-medium mb-2">Time Slots</h4>
                  {availability[selectedDate].timeSlots.length > 0 ? (
                    <div className="space-y-2">
                      {availability[selectedDate].timeSlots.map((slot, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center space-x-4">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">
                              {slot.startTime} - {slot.endTime}
                            </span>
                            {slot.price && (
                              <Badge variant="outline">₹{slot.price}</Badge>
                            )}
                            <Badge variant={slot.isAvailable ? 'default' : 'secondary'}>
                              {slot.isBooked ? 'Booked' : slot.isAvailable ? 'Available' : 'Unavailable'}
                            </Badge>
                          </div>
                          {!slot.isBooked && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTimeSlot(selectedDate, index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Alert>
                      <AlertDescription>
                        No time slots set for this date. All dates are available for booking by default.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Day Status */}
                <div>
                  <h4 className="font-medium mb-2">Day Status</h4>
                  <Badge className={getDayStatusColor(availability[selectedDate].dayStatus)}>
                    {availability[selectedDate].dayStatus.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>

                {/* Special Pricing */}
                {availability[selectedDate].specialPricing.isSpecialDay && (
                  <div>
                    <h4 className="font-medium mb-2">Special Pricing</h4>
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                      <p className="text-sm text-orange-800">
                        {availability[selectedDate].specialPricing.reason}
                      </p>
                      {availability[selectedDate].specialPricing.multiplier !== 1 && (
                        <p className="text-sm text-orange-600">
                          Price multiplier: {availability[selectedDate].specialPricing.multiplier}x
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  No availability set for this date. All dates are available for booking by default.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Booking Details Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              Complete information about this booking
            </DialogDescription>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedBooking.event.name}</h3>
                <div className="flex items-center gap-4 text-sm">
                  <Badge className={selectedBooking.booking?.status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'}>
                    {selectedBooking.booking?.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                  </Badge>
                  <span className="text-gray-600 flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {selectedBooking.organizer?.name || 'Organizer'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Event Date</p>
                  <p className="font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(selectedBooking.event.date).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Time</p>
                  <p className="font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {selectedBooking.event.startTime} - {selectedBooking.event.endTime}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Venue</p>
                  <p className="font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {selectedBooking.event.venue.name}
                  </p>
                  <p className="text-xs text-gray-500">{selectedBooking.event.venue.city}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Amount</p>
                  <p className="text-xl font-bold text-purple-600 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    ₹{selectedBooking.booking?.finalAmount || selectedBooking.booking?.requestedAmount || 0}
                  </p>
                </div>
              </div>

              {selectedBooking.contract?.organizerRequirements && (
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="text-sm font-semibold mb-1">Special Requirements</p>
                  <p className="text-sm text-gray-700">{selectedBooking.contract.organizerRequirements}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-green-50 border-2 border-green-300 rounded"></div>
              <span>Booked</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-green-100 border-2 border-green-200 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-yellow-100 border-2 border-yellow-200 rounded"></div>
              <span>Partially Booked</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-red-100 border-2 border-red-200 rounded"></div>
              <span>Fully Booked</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
