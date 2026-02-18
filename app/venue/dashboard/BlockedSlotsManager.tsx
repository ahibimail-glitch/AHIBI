"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Edit, Calendar as CalendarIcon, Clock, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface BlockedSlot {
  _id?: string;
  date: Date;
  isFullDayBlocked: boolean;
  timeSlots: TimeSlot[];
  reason: string;
  notes: string;
  createdAt?: Date;
}

interface BlockedSlotsManagerProps {
  venueId: string;
  selectedVenueId?: string | null;
  bookings?: Array<{
    bookingDate: string | Date;
    startTime: string;
    endTime: string;
    status: string;
    _id?: string;
  }>;
}

const BlockedSlotsManager: React.FC<BlockedSlotsManagerProps> = ({ venueId, selectedVenueId, bookings = [] }) => {
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<BlockedSlot | null>(null);
  
  // Form state
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [isFullDay, setIsFullDay] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([{ startTime: '09:00', endTime: '17:00' }]);
  const [reason, setReason] = useState('offline_booking');
  const [notes, setNotes] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Helpers
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const rangesOverlap = (a: { start: number; end: number }, b: { start: number; end: number }) => {
    return a.start < b.end && b.start < a.end;
  };

  const isSameDay = (d1: Date, d2: Date) => d1.toDateString() === d2.toDateString();

  const getUnavailableRangesForDate = (date: Date) => {
    const dayStr = date.toDateString();
    // Confirmed bookings on this date
    const bookingRanges = bookings
      .filter(b => b.status === 'confirmed' && new Date(b.bookingDate).toDateString() === dayStr)
      .map(b => ({ start: toMinutes(b.startTime), end: toMinutes(b.endTime), source: 'booking' as const }));

    // Existing blocks on this date
    const blockForDay = blockedSlots.find(s => isSameDay(new Date(s.date), date));
    const blockRanges: Array<{ start: number; end: number; source: 'block' }> = [];
    if (blockForDay) {
      if (blockForDay.isFullDayBlocked) {
        blockRanges.push({ start: 0, end: 24 * 60, source: 'block' });
      } else if (Array.isArray(blockForDay.timeSlots)) {
        blockForDay.timeSlots.forEach(ts => {
          blockRanges.push({ start: toMinutes(ts.startTime), end: toMinutes(ts.endTime), source: 'block' });
        });
      }
    }

    return { bookingRanges, blockRanges };
  };

  useEffect(() => {
    fetchBlockedSlots();
  }, [selectedVenueId]);

  const fetchBlockedSlots = async () => {
    try {
      const token = localStorage.getItem('venueToken');
      const url = selectedVenueId
        ? `${apiUrl}/api/venue/blocked-slots?venueId=${selectedVenueId}`
        : `${apiUrl}/api/venue/blocked-slots`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setBlockedSlots(data.data.blockedSlots || []);
      }
    } catch (error) {
      console.error('Error fetching blocked slots:', error);
      toast.error('Failed to load blocked slots');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTimeSlot = () => {
    setTimeSlots([...timeSlots, { startTime: '09:00', endTime: '17:00' }]);
  };

  const handleRemoveTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const handleTimeSlotChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const updated = [...timeSlots];
    updated[index][field] = value;
    setTimeSlots(updated);
  };

  const handleSubmit = async () => {
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }

    if (!isFullDay && timeSlots.length === 0) {
      toast.error('Please add at least one time slot or block the full day');
      return;
    }

    // Validate against existing bookings and blocks for the selected date
    const { bookingRanges, blockRanges } = getUnavailableRangesForDate(selectedDate);
    const existingRanges = [...bookingRanges, ...blockRanges];

    if (isFullDay) {
      if (existingRanges.length > 0) {
        toast.error('Cannot block full day: There are existing bookings or blocks on this date.');
        return;
      }
    } else {
      // Validate each proposed timeslot
      for (const ts of timeSlots) {
        const proposed = { start: toMinutes(ts.startTime), end: toMinutes(ts.endTime) };
        if (proposed.start >= proposed.end) {
          toast.error('Each time slot must have start time before end time.');
          return;
        }
        for (const ex of existingRanges) {
          if (rangesOverlap(proposed, { start: (ex as any).start, end: (ex as any).end })) {
            toast.error('Selected time overlaps with an existing booking or blocked time.');
            return;
          }
        }
      }
    }

    try {
      const token = localStorage.getItem('venueToken');
      const payload: Record<string, unknown> = {
        date: selectedDate.toISOString(),
        isFullDayBlocked: isFullDay,
        timeSlots: isFullDay ? [] : timeSlots,
        reason,
        notes
      };
      if (selectedVenueId) payload.venueId = selectedVenueId;

      const requestUrl = editingSlot 
        ? `${apiUrl}/api/venue/blocked-slots/${editingSlot._id}`
        : `${apiUrl}/api/venue/blocked-slots`;
      
      const method = editingSlot ? 'PUT' : 'POST';

      const response = await fetch(requestUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success) {
        toast.success(editingSlot ? 'Blocked slot updated successfully' : 'Blocked slot added successfully');
        fetchBlockedSlots();
        resetForm();
        setDialogOpen(false);
      } else {
        toast.error(data.message || 'Failed to save blocked slot');
      }
    } catch (error) {
      console.error('Error saving blocked slot:', error);
      toast.error('Failed to save blocked slot');
    }
  };

  const handleDelete = async (slotId: string) => {
    if (!confirm('Are you sure you want to remove this blocked slot?')) {
      return;
    }

    try {
      const token = localStorage.getItem('venueToken');
      const response = await fetch(`${apiUrl}/api/venue/blocked-slots/${slotId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Blocked slot removed successfully');
        fetchBlockedSlots();
      } else {
        toast.error(data.message || 'Failed to remove blocked slot');
      }
    } catch (error) {
      console.error('Error deleting blocked slot:', error);
      toast.error('Failed to remove blocked slot');
    }
  };

  const handleEdit = (slot: BlockedSlot) => {
    setEditingSlot(slot);
    setSelectedDate(new Date(slot.date));
    setIsFullDay(slot.isFullDayBlocked);
    setTimeSlots(slot.timeSlots.length > 0 ? slot.timeSlots : [{ startTime: '09:00', endTime: '17:00' }]);
    setReason(slot.reason);
    setNotes(slot.notes);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingSlot(null);
    setSelectedDate(undefined);
    setIsFullDay(false);
    setTimeSlots([{ startTime: '09:00', endTime: '17:00' }]);
    setReason('offline_booking');
    setNotes('');
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      offline_booking: 'Offline Booking',
      internal_event: 'Internal Event',
      maintenance: 'Maintenance',
      holiday: 'Holiday',
      other: 'Other'
    };
    return labels[reason] || reason;
  };

  const getReasonColor = (reason: string) => {
    const colors: Record<string, string> = {
      offline_booking: 'bg-blue-100 text-blue-800',
      internal_event: 'bg-purple-100 text-purple-800',
      maintenance: 'bg-orange-100 text-orange-800',
      holiday: 'bg-green-100 text-green-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[reason] || colors.other;
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Blocked Dates & Time Slots</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage offline bookings and internal reservations</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Block Date/Time</span>
              <span className="sm:hidden">Block Date</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
            <DialogHeader>
              <DialogTitle>{editingSlot ? 'Edit Blocked Slot' : 'Block Date or Time Slot'}</DialogTitle>
              <DialogDescription>
                Mark specific dates or time slots as unavailable for online bookings
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div>
                <Label>Select Date *</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border mt-2"
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </div>

              {/* Unavailable ranges indicator for the selected date */}
              {selectedDate && (
                <div className="rounded-md border p-3 bg-muted/40">
                  <div className="text-sm font-medium mb-2">Unavailable on {format(selectedDate, 'EEE, MMM d, yyyy')}</div>
                  {(() => {
                    const { bookingRanges, blockRanges } = getUnavailableRangesForDate(selectedDate);
                    const any = bookingRanges.length + blockRanges.length > 0;
                    if (!any) return <div className="text-xs text-gray-500">No existing bookings or blocks.</div>;
                    return (
                      <div className="flex flex-col gap-1">
                        {bookingRanges.map((r, idx) => (
                          <div key={`ubk-${idx}`} className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 w-fit">
                            Booking: {`${String(Math.floor(r.start/60)).padStart(2,'0')}:${String(r.start%60).padStart(2,'0')}`} - {`${String(Math.floor(r.end/60)).padStart(2,'0')}:${String(r.end%60).padStart(2,'0')}`}
                          </div>
                        ))}
                        {blockRanges.map((r, idx) => (
                          <div key={`ublk-${idx}`} className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800 w-fit">
                            Blocked: {`${String(Math.floor(r.start/60)).padStart(2,'0')}:${String(r.start%60).padStart(2,'0')}`} - {`${String(Math.floor(r.end/60)).padStart(2,'0')}:${String(r.end%60).padStart(2,'0')}`}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fullDay"
                  checked={isFullDay}
                  onCheckedChange={(checked) => setIsFullDay(checked as boolean)}
                />
                <Label htmlFor="fullDay" className="cursor-pointer">
                  Block entire day
                </Label>
              </div>

              {!isFullDay && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Time Slots</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddTimeSlot}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Slot
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {timeSlots.map((slot, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => handleTimeSlotChange(index, 'startTime', e.target.value)}
                          className="flex-1"
                        />
                        <span>to</span>
                        <Input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => handleTimeSlotChange(index, 'endTime', e.target.value)}
                          className="flex-1"
                        />
                        {timeSlots.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTimeSlot(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Reason *</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="offline_booking">Offline Booking</SelectItem>
                    <SelectItem value="internal_event">Internal Event</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="holiday">Holiday</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes..."
                  rows={3}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} className="w-full sm:w-auto">
                  {editingSlot ? 'Update' : 'Block Date/Time'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {blockedSlots.length === 0 ? (
        <Card>
          <CardContent className="p-6 sm:p-12 text-center">
            <Ban className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Blocked Slots</h3>
            <p className="text-gray-600 mb-4">
              You haven't blocked any dates or time slots yet. Block dates to prevent online bookings for offline reservations or internal events.
            </p>
            <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Block Your First Date
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {blockedSlots.map((slot) => (
            <Card key={slot._id}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-gray-500" />
                        <span className="font-semibold text-base sm:text-lg">
                          {format(new Date(slot.date), 'EEEE, MMMM d, yyyy')}
                        </span>
                      </div>
                      <Badge className={getReasonColor(slot.reason)}>
                        {getReasonLabel(slot.reason)}
                      </Badge>
                    </div>
                    
                    {slot.isFullDayBlocked ? (
                      <div className="flex items-center gap-2 text-red-600 ml-0 sm:ml-8">
                        <Ban className="h-4 w-4" />
                        <span className="font-medium">Full Day Blocked</span>
                      </div>
                    ) : (
                      <div className="ml-0 sm:ml-8 space-y-1">
                        {slot.timeSlots.map((timeSlot, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-gray-700">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>{timeSlot.startTime} - {timeSlot.endTime}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {slot.notes && (
                      <p className="text-gray-600 text-sm mt-3 ml-0 sm:ml-8">{slot.notes}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 self-end sm:self-start">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(slot)}
                      className="flex-1 sm:flex-none"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="ml-1 sm:hidden">Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => slot._id && handleDelete(slot._id)}
                      className="flex-1 sm:flex-none"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                      <span className="ml-1 sm:hidden">Delete</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlockedSlotsManager;
