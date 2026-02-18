"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, Plus, Edit, Trash2, Save, X } from "lucide-react";
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
  const [availability, setAvailability] = useState<{ [key: string]: AvailabilityData | undefined }>({});
  const [loading, setLoading] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [showTimeSlotDialog, setShowTimeSlotDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockTimeSlot, setBlockTimeSlot] = useState<TimeSlot>({
    startTime: '09:00',
    endTime: '10:00',
    isAvailable: false,
    isBooked: false,
    price: 0,
    note: ''
  });
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
  }, [currentDate]);

  const toDateKey = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const isPastDateKey = (dateKey: string) => {
    const now = new Date();
    const todayKey = toDateKey(now);
    return dateKey < todayKey;
  };

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
          const dateKey = toDateKey(new Date(avail.date));
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
      const dateKey = toDateKey(current);
      const isCurrentMonth = current.getMonth() === month;
      const isToday = current.toDateString() === new Date().toDateString();
      const dayAvailability = availability[dateKey];

      days.push({
        date: new Date(current),
        dateKey,
        isCurrentMonth,
        isToday,
        availability: dayAvailability
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
      default: return 'bg-green-50 text-green-800';
    }
  };

  const splitSlotsForBlock = (slots: TimeSlot[], blockStart: string, blockEnd: string, note?: string) => {
    const updated: TimeSlot[] = [];

    for (const slot of slots) {
      // Never alter booked slots
      if (slot.isBooked) {
        updated.push(slot);
        continue;
      }

      // No overlap
      if (slot.endTime <= blockStart || slot.startTime >= blockEnd) {
        updated.push(slot);
        continue;
      }

      // Slot fully within block range -> mark unavailable
      if (slot.startTime >= blockStart && slot.endTime <= blockEnd) {
        updated.push({
          ...slot,
          isAvailable: false,
          note: note || slot.note
        });
        continue;
      }

      // Block is inside slot -> split into up to 3 parts
      if (slot.startTime < blockStart) {
        updated.push({
          ...slot,
          endTime: blockStart,
          isAvailable: slot.isAvailable,
        });
      }

      updated.push({
        ...slot,
        startTime: blockStart,
        endTime: blockEnd,
        isAvailable: false,
        isBooked: false,
        note: note || slot.note
      });

      if (slot.endTime > blockEnd) {
        updated.push({
          ...slot,
          startTime: blockEnd,
          isAvailable: slot.isAvailable,
        });
      }
    }

    // Normalize by sorting
    return updated.sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const ensureDefaultOpenSlots = (dateKey: string) => {
    const existing = availability[dateKey];
    if (existing && Array.isArray(existing.timeSlots) && existing.timeSlots.length > 0) {
      return existing;
    }
    return {
      ...(existing ?? {
        date: dateKey,
        specialPricing: { isSpecialDay: false, multiplier: 1 },
        minimumBookingDuration: 2,
        maximumBookingDuration: 8,
        advanceBookingDays: 7,
        dayStatus: 'available',
      }),
      timeSlots: [
        {
          startTime: '00:00',
          endTime: '23:59',
          isAvailable: true,
          isBooked: false,
        }
      ]
    } as AvailabilityData;
  };

  const blockFullDay = (dateKey: string) => {
    const base = availability[dateKey];
    const availabilityData: AvailabilityData = {
      ...(base || {
        date: dateKey,
        specialPricing: { isSpecialDay: false, multiplier: 1 },
        minimumBookingDuration: 2,
        maximumBookingDuration: 8,
        advanceBookingDays: 7,
      }),
      dayStatus: 'unavailable',
      timeSlots: [
        {
          startTime: '00:00',
          endTime: '23:59',
          isAvailable: false,
          isBooked: false,
          note: 'Blocked by artist'
        }
      ]
    };

    saveAvailability(dateKey, availabilityData);
  };

  const blockTimeRange = (dateKey: string) => {
    const dayAvailability = ensureDefaultOpenSlots(dateKey);
    const updatedSlots = splitSlotsForBlock(
      dayAvailability.timeSlots,
      blockTimeSlot.startTime,
      blockTimeSlot.endTime,
      blockTimeSlot.note
    );
    const updatedAvailability: AvailabilityData = {
      ...dayAvailability,
      timeSlots: updatedSlots
    };
    saveAvailability(dateKey, updatedAvailability);
    setShowBlockDialog(false);
    setBlockTimeSlot({
      startTime: '09:00',
      endTime: '10:00',
      isAvailable: false,
      isBooked: false,
      price: 0,
      note: ''
    });
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigateMonth('prev')}>
            ←
          </Button>
          <h2 className="text-xl font-semibold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <Button variant="outline" onClick={() => navigateMonth('next')}>
            →
          </Button>
        </div>
        <Button onClick={() => setCurrentDate(new Date())}>
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
          
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(({ date, dateKey, isCurrentMonth, isToday, availability: dayAvailability }) => (
              <div
                key={dateKey}
                className={`
                  min-h-[80px] p-2 border rounded cursor-pointer transition-colors
                  ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                  ${isToday ? 'ring-2 ring-blue-500' : ''}
                  ${selectedDate === dateKey ? 'bg-blue-50' : ''}
                  ${isPastDateKey(dateKey) ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-100'}
                `}
                onClick={() => {
                  if (isPastDateKey(dateKey)) return;
                  setSelectedDate(selectedDate === dateKey ? '' : dateKey);
                }}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                    {date.getDate()}
                  </span>
                  <Badge variant="secondary" className={`text-xs ${getDayStatusColor(dayAvailability?.dayStatus)}`}>
                    {dayAvailability
                      ? dayAvailability.timeSlots.filter(slot => slot.isAvailable && !slot.isBooked).length
                      : 'Open'}
                  </Badge>
                </div>
                
                {dayAvailability ? (
                  <div className="space-y-1">
                    {dayAvailability.specialPricing.isSpecialDay && (
                      <div className="text-xs text-orange-600 font-medium">
                        Special
                      </div>
                    )}
                    <div className="text-xs text-gray-600">
                      {dayAvailability.timeSlots.length} slots
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-600">
                    Open by default
                  </div>
                )}
              </div>
            ))}
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
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => blockFullDay(selectedDate)}>
                  Block full day
                </Button>
                <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      Block time
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Block time range</DialogTitle>
                      <DialogDescription>
                        Block a specific time range so it cannot be booked.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="blockStartTime">From</Label>
                          <Input
                            id="blockStartTime"
                            type="time"
                            value={blockTimeSlot.startTime}
                            onChange={(e) => setBlockTimeSlot(prev => ({ ...prev, startTime: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="blockEndTime">To</Label>
                          <Input
                            id="blockEndTime"
                            type="time"
                            value={blockTimeSlot.endTime}
                            onChange={(e) => setBlockTimeSlot(prev => ({ ...prev, endTime: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="blockNote">Reason (optional)</Label>
                        <Textarea
                          id="blockNote"
                          placeholder="Example: Travel / Personal commitment"
                          value={blockTimeSlot.note}
                          onChange={(e) => setBlockTimeSlot(prev => ({ ...prev, note: e.target.value }))}
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={() => blockTimeRange(selectedDate)}>
                          Block
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showTimeSlotDialog} onOpenChange={setShowTimeSlotDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      Add available slot
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add available time slot</DialogTitle>
                      <DialogDescription>
                        Add a slot you want to explicitly allow (optional).
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
                          placeholder="Any notes for this slot"
                          value={newTimeSlot.note}
                          onChange={(e) => setNewTimeSlot(prev => ({ ...prev, note: e.target.value }))}
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowTimeSlotDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={() => addTimeSlot(selectedDate)}>
                          Add
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
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
                        No time slots set for this date. Add time slots to make yourself available for bookings.
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
                  This date is open by default. Use “Block time” or “Block full day” to make yourself unavailable.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded"></div>
              <span>Partially Booked</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
              <span>Fully Booked</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded"></div>
              <span>Unavailable</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
