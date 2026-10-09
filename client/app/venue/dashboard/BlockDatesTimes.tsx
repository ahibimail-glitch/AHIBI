'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Ban, Plus, Edit2, Trash2, Save, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Space {
  _id: string;
  name: string;
  blockedSlots: BlockedSlot[];
}

interface BlockedSlot {
  _id: string;
  date: string;
  isFullDayBlocked: boolean;
  timeSlots: TimeSlot[];
  reason: string;
  notes: string;
  createdAt: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface VenueData {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  status: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

const REASONS = [
  { value: 'offline_booking', label: 'Offline Booking' },
  { value: 'internal_event', label: 'Internal Event' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'other', label: 'Other' }
];

const TIME_SLOTS = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

export default function BlockDatesTimes({ venue }: { venue: VenueData | null }) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<string>('');
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState<BlockedSlot | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    date: '',
    isFullDayBlocked: false,
    timeSlots: [{ startTime: '', endTime: '' }] as TimeSlot[],
    reason: 'other',
    notes: ''
  });

  useEffect(() => {
    if (venue) {
      fetchSpaces();
    }
  }, [venue]);

  const fetchSpaces = async () => {
    try {
      const token = localStorage.getItem('venueToken');
      const response = await fetch(`/api/venue/spaces/blocked-slots`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSpaces(data.data.spaces || []);
        }
      }
    } catch (error) {
      console.error('Error fetching spaces:', error);
      toast.error('Failed to fetch spaces');
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockedSlots = async (spaceId: string) => {
    try {
      const token = localStorage.getItem('venueToken');
      const response = await fetch(`/api/venue/spaces/${spaceId}/blocked-slots`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBlockedSlots(data.data.blockedSlots || []);
        }
      }
    } catch (error) {
      console.error('Error fetching blocked slots:', error);
      toast.error('Failed to fetch blocked slots');
    }
  };

  const handleSpaceChange = (spaceId: string) => {
    setSelectedSpace(spaceId);
    if (spaceId) {
      fetchBlockedSlots(spaceId);
    } else {
      setBlockedSlots([]);
    }
  };

  const handleSubmitBlock = async () => {
    if (!selectedSpace || !formData.date) {
      toast.error('Please select a space and date');
      return;
    }

    if (!formData.isFullDayBlocked && (!formData.timeSlots[0].startTime || !formData.timeSlots[0].endTime)) {
      toast.error('Please select time slots or enable full day block');
      return;
    }

    try {
      const token = localStorage.getItem('venueToken');
      const url = editingBlock 
        ? `/api/venue/spaces/${selectedSpace}/blocked-slots/${editingBlock._id}`
        : `/api/venue/spaces/${selectedSpace}/block`;
      
      const method = editingBlock ? 'PUT' : 'POST';
      
      // Don't send timeSlots if blocking full day
      const dataToSend = formData.isFullDayBlocked 
        ? {
            date: formData.date,
            isFullDayBlocked: formData.isFullDayBlocked,
            timeSlots: [],
            reason: formData.reason,
            notes: formData.notes
          }
        : formData;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success(editingBlock ? 'Block updated successfully' : 'Date/time blocked successfully');
          setShowBlockForm(false);
          setEditingBlock(null);
          resetForm();
          fetchBlockedSlots(selectedSpace);
          fetchSpaces(); // Refresh spaces list to show updated blocks
        } else {
          toast.error(data.message || 'Failed to block date/time');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to block date/time');
      }
    } catch (error) {
      console.error('Error blocking date/time:', error);
      toast.error('Failed to block date/time');
    }
  };

  const handleEditBlock = (block: BlockedSlot) => {
    setEditingBlock(block);
    setFormData({
      date: new Date(block.date).toISOString().split('T')[0],
      isFullDayBlocked: block.isFullDayBlocked,
      timeSlots: block.timeSlots.length > 0 ? block.timeSlots : [{ startTime: '', endTime: '' }],
      reason: block.reason,
      notes: block.notes
    });
    setShowBlockForm(true);
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('Are you sure you want to remove this block?')) {
      return;
    }

    try {
      const token = localStorage.getItem('venueToken');
      const response = await fetch(`/api/venue/spaces/${selectedSpace}/blocked-slots/${blockId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Block removed successfully');
          fetchBlockedSlots(selectedSpace);
          fetchSpaces(); // Refresh spaces list
        } else {
          toast.error(data.message || 'Failed to remove block');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to remove block');
      }
    } catch (error) {
      console.error('Error removing block:', error);
      toast.error('Failed to remove block');
    }
  };

  const resetForm = () => {
    setFormData({
      date: '',
      isFullDayBlocked: false,
      timeSlots: [{ startTime: '', endTime: '' }],
      reason: 'other',
      notes: ''
    });
  };

  const addTimeSlot = () => {
    setFormData(prev => ({
      ...prev,
      timeSlots: [...prev.timeSlots, { startTime: '', endTime: '' }]
    }));
  };

  const removeTimeSlot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.filter((_, i) => i !== index)
    }));
  };

  const updateTimeSlot = (index: number, field: 'startTime' | 'endTime', value: string) => {
    setFormData(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.map((slot, i) => 
        i === index ? { ...slot, [field]: value } : slot
      )
    }));
  };

  if (loading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Ban className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-xl text-gray-900">Block Dates & Times</CardTitle>
              <CardDescription className="text-gray-600">Manage unavailable dates and time slots</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-200 border-t-red-600"></div>
            <p className="text-gray-600">Loading blocked dates...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Space Selection */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg border p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Space</label>
            <Select value={selectedSpace} onValueChange={handleSpaceChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a space to manage blocks" />
              </SelectTrigger>
              <SelectContent>
                {spaces.map((space) => (
                  <SelectItem key={space._id} value={space._id}>
                    {space.name} ({space.blockedSlots?.length || 0} blocks)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedSpace && (
            <div className="flex items-end">
              <Button 
                onClick={() => { setShowBlockForm(true); setEditingBlock(null); resetForm(); }}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Block
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Blocked Slots List */}
      {selectedSpace && blockedSlots.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-lg border p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Blocked Dates & Times</h3>
          <div className="space-y-3">
            {blockedSlots.map((block) => (
              <div key={block._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-gray-900">
                        {format(new Date(block.date), 'PPP')}
                      </span>
                      {block.isFullDayBlocked && (
                        <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                          Full Day
                        </span>
                      )}
                    </div>
                    {!block.isFullDayBlocked && block.timeSlots.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {block.timeSlots.map((slot, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">
                            <Clock className="h-3 w-3 mr-1" />
                            {slot.startTime} - {slot.endTime}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>Reason: {REASONS.find(r => r.value === block.reason)?.label || block.reason}</span>
                      {block.notes && <span>Notes: {block.notes}</span>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditBlock(block)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteBlock(block._id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No blocked slots message */}
      {selectedSpace && blockedSlots.length === 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-lg border p-8 text-center">
          <Ban className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No blocked dates</h3>
          <p className="text-gray-600 mb-4">This space has no blocked dates for the selected month</p>
          <Button 
            onClick={() => { setShowBlockForm(true); setEditingBlock(null); resetForm(); }}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add First Block
          </Button>
        </div>
      )}

      {/* Block Form Modal */}
      {showBlockForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingBlock ? 'Edit Block' : 'Add New Block'}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowBlockForm(false); setEditingBlock(null); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="fullDay"
                    checked={formData.isFullDayBlocked}
                    onChange={(e) => setFormData(prev => ({ ...prev, isFullDayBlocked: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="fullDay" className="text-sm font-medium text-gray-700">
                    Block entire day
                  </label>
                </div>

                {!formData.isFullDayBlocked && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time Slots</label>
                    <div className="space-y-2">
                      {formData.timeSlots.map((slot, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Select
                            value={slot.startTime}
                            onValueChange={(value) => updateTimeSlot(index, 'startTime', value)}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue placeholder="Start" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.map(time => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-gray-500">to</span>
                          <Select
                            value={slot.endTime}
                            onValueChange={(value) => updateTimeSlot(index, 'endTime', value)}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue placeholder="End" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.map(time => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {formData.timeSlots.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeTimeSlot(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addTimeSlot}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Time Slot
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <Select
                    value={formData.reason}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REASONS.map(reason => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add any additional notes..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => { setShowBlockForm(false); setEditingBlock(null); }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitBlock}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingBlock ? 'Update Block' : 'Add Block'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
