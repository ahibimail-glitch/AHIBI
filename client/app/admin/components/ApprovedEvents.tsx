"use client";

import { useState, useEffect, ChangeEvent, useRef } from "react";
import { format } from "date-fns";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Eye, Edit, Trash2, Plus, PlusCircle, Upload } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { uploadFile, validateFile, createImagePreview } from "@/lib/cloudinary";

interface TicketType {
  name: string;
  description: string;
  price: number;
  quantity: number;
  capacity: number;
  benefits: string[];
  sold?: number;
  _id?: string;
}

interface Event {
  _id: string;
  title: string;
  description: string;
  termsAndConditions?: string;
  category: string;
  startDate: string;
  endDate: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    pincode?: string;
    coordinates?: [number, number];
  };
  status: string;
  createdAt: string;
  banner?: string;
  coverImage?: string;
  socialLinks?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
  ticketTypes: TicketType[];
  organizer?: string;
  convenience?: {
    includeGst?: boolean;
    gstPercentage?: number;
    includeConvenience?: boolean;
    conveniencePercentage?: number;
    convenienceFixedAmount?: number;
    percentage?: number;
    fixedAmount?: number;
  };
  isFreeEvent?: boolean;
}

export default function ApprovedEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewStatus, setViewStatus] = useState<'approved' | 'paused'>('approved');

  // Edit event state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Delete event state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchApprovedEvents = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("admin_token");
        if (!token) {
          window.location.href = "/admin/login";
          return;
        }
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const res = await fetch(`${apiUrl}/api/admin/events?status=${viewStatus}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch approved events');
        }
        
        const response = await res.json();
        
        if (!response.data || !Array.isArray(response.data.events)) {
          throw new Error("Invalid data format received from server");
        }
        setEvents(response.data.events);
      } catch (err: any) {
        console.error('Error fetching events:', err);
        setError(err.message || "Failed to load events. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchApprovedEvents();
  }, [viewStatus]);

  const handlePauseEvent = async (id: string) => {
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) return;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await axios.put(`${apiUrl}/api/admin/events/${id}/pause`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 200) {
        // If viewing approved list, remove; if viewing paused, update item
        if (viewStatus === 'approved') {
          setEvents(prev => prev.filter(e => e._id !== id));
        } else {
          const updated = res.data.data?.event || res.data.event || res.data;
          setEvents(prev => prev.map(e => e._id === id ? updated : e));
        }
      }
    } catch (e) {
      console.error('Pause event failed', e);
      alert('Failed to pause event');
    }
  };

  const handleResumeEvent = async (id: string) => {
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) return;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await axios.put(`${apiUrl}/api/admin/events/${id}/resume`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 200) {
        const updated = res.data.data?.event || res.data.event || res.data;
        if (viewStatus === 'paused') {
          // Remove from paused list when resumed
          setEvents(prev => prev.filter(e => e._id !== id));
        } else {
          setEvents(prev => {
            const exists = prev.some(e => e._id === id);
            return exists ? prev.map(e => e._id === id ? updated : e) : [updated, ...prev];
          });
        }
      }
    } catch (e) {
      console.error('Resume event failed', e);
      alert('Failed to resume event');
    }
  };

  const handleEditClick = (event: Event) => {
    // Deep copy and ensure all fields are properly initialized
    const eventCopy = JSON.parse(JSON.stringify(event));
    
    // Fix category case - convert from database format (Music) to frontend format (music)
    if (eventCopy.category) {
      eventCopy.category = eventCopy.category.toLowerCase();
    }
    
    // Ensure location has all required fields
    if (!eventCopy.location) {
      eventCopy.location = {
        address: '',
        city: '',
        state: '',
        country: 'India',
        pincode: ''
      };
    } else {
      eventCopy.location = {
        address: eventCopy.location.address || '',
        city: eventCopy.location.city || '',
        state: eventCopy.location.state || '',
        country: eventCopy.location.country || 'India',
        pincode: eventCopy.location.pincode || '',
        coordinates: eventCopy.location.coordinates
      };
    }
    
    // Ensure convenience fees are properly structured
    if (!eventCopy.convenience) {
      eventCopy.convenience = {
        includeGst: false,
        gstPercentage: 18,
        includeConvenience: true,
        conveniencePercentage: 5,
        convenienceFixedAmount: 0
      };
    } else {
      // Handle both old and new convenience structure
      eventCopy.convenience = {
        includeGst: eventCopy.convenience.includeGst || false,
        gstPercentage: eventCopy.convenience.gstPercentage || 18,
        includeConvenience: eventCopy.convenience.includeConvenience !== false,
        conveniencePercentage: eventCopy.convenience.conveniencePercentage || eventCopy.convenience.percentage || 5,
        convenienceFixedAmount: eventCopy.convenience.convenienceFixedAmount || eventCopy.convenience.fixedAmount || 0
      };
    }

    if (!eventCopy.termsAndConditions) {
      eventCopy.termsAndConditions = '';
    }

    if (!eventCopy.socialLinks) {
      eventCopy.socialLinks = {
        website: '',
        facebook: '',
        instagram: '',
        twitter: '',
        youtube: '',
      };
    } else {
      eventCopy.socialLinks = {
        website: eventCopy.socialLinks.website || '',
        facebook: eventCopy.socialLinks.facebook || '',
        instagram: eventCopy.socialLinks.instagram || '',
        twitter: eventCopy.socialLinks.twitter || '',
        youtube: eventCopy.socialLinks.youtube || '',
      };
    }
    
    // Mark free flag
    eventCopy.isFreeEvent = !!eventCopy.isFreeEvent;
    // Ensure ticket types only for paid events
    if (!eventCopy.isFreeEvent) {
      if (!eventCopy.ticketTypes || eventCopy.ticketTypes.length === 0) {
        eventCopy.ticketTypes = [{
          name: 'General Admission',
          description: '',
          price: 0,
          quantity: 100,
          capacity: 1,
          benefits: ['Entry to the event'],
          sold: 0
        }];
      }
      eventCopy.ticketTypes = eventCopy.ticketTypes.map((ticket: TicketType) => ({
        ...ticket,
        benefits: ticket.benefits && ticket.benefits.length > 0 ? ticket.benefits : ['Entry to the event'],
        capacity: ticket.capacity || 1,
        sold: ticket.sold || 0
      }));
    } else {
      // For free events, ensure no ticket types
      eventCopy.ticketTypes = [];
      // Zero out convenience for UI consistency
      eventCopy.convenience = {
        includeGst: false,
        gstPercentage: 0,
        includeConvenience: false,
        conveniencePercentage: 0,
        convenienceFixedAmount: 0
      };
    }
    
    console.log('Event data for editing:', eventCopy); // Debug log
    setEditingEvent(eventCopy);
    setImagePreview(event.banner || null);
    setCoverPreview(eventCopy.coverImage || null);
    setIsEditDialogOpen(true);
    setEditError(null);
  };

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !editingEvent) return;

    const file = e.target.files[0];
    const validationError = validateFile(file);
    if (validationError) {
      setEditError(validationError);
      return;
    }

    try {
      setIsUploading(true);
      setEditError(null);
      const preview = await createImagePreview(file);
      setImagePreview(preview);
      const uploadResponse = await uploadFile(file);
      if (uploadResponse.status !== 'success' || !uploadResponse.data?.photo?.url) {
        throw new Error(uploadResponse.message || 'Failed to upload image');
      }
      setEditingEvent({ ...editingEvent, banner: uploadResponse.data.photo.url });
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCoverImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !editingEvent) return;

    const file = e.target.files[0];
    const validationError = validateFile(file);
    if (validationError) {
      setEditError(validationError);
      return;
    }

    try {
      setIsUploadingCover(true);
      setEditError(null);
      const preview = await createImagePreview(file);
      setCoverPreview(preview);
      const uploadResponse = await uploadFile(file);
      if (uploadResponse.status !== 'success' || !uploadResponse.data?.photo?.url) {
        throw new Error(uploadResponse.message || 'Failed to upload image');
      }
      setEditingEvent({ ...editingEvent, coverImage: uploadResponse.data.photo.url });
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleEventInputChange = (field: string, value: any) => {
    if (editingEvent) {
      if (field === 'startDate' || field === 'endDate') {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          setEditingEvent({ ...editingEvent, [field]: date.toISOString() });
        }
        return;
      }

      const keys = field.split('.');
      if (keys.length > 1) {
        setEditingEvent(prev => {
          if (!prev) return null;
          const newEvent = { ...prev };
          let current: any = newEvent;
          for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
          }
          current[keys[keys.length - 1]] = value;
          return newEvent;
        });
      } else {
        setEditingEvent({ ...editingEvent, [field]: value });
      }
    }
  };

  const handleTicketTypeChange = (index: number, field: keyof TicketType, value: any) => {
    if (editingEvent) {
      const updatedTicketTypes = [...editingEvent.ticketTypes];
      const numericFields: (keyof TicketType)[] = ['price', 'quantity', 'capacity'];
      updatedTicketTypes[index] = {
        ...updatedTicketTypes[index],
        [field]: numericFields.includes(field) ? Number(value) : value
      };
      setEditingEvent({ ...editingEvent, ticketTypes: updatedTicketTypes });
    }
  };

  const addTicketType = () => {
    if (editingEvent) {
      const newTicket: TicketType = { name: '', description: '', price: 0, quantity: 100, capacity: 1, benefits: [''] };
      setEditingEvent({ ...editingEvent, ticketTypes: [...editingEvent.ticketTypes, newTicket] });
    }
  };

  const removeTicketType = (index: number) => {
    if (editingEvent && editingEvent.ticketTypes.length > 1) {
      const updatedTicketTypes = editingEvent.ticketTypes.filter((_, i) => i !== index);
      setEditingEvent({ ...editingEvent, ticketTypes: updatedTicketTypes });
    }
  };

  const handleBenefitChange = (ticketIndex: number, benefitIndex: number, value: string) => {
    if (editingEvent) {
      const updatedTicketTypes = [...editingEvent.ticketTypes];
      updatedTicketTypes[ticketIndex].benefits[benefitIndex] = value;
      setEditingEvent({ ...editingEvent, ticketTypes: updatedTicketTypes });
    }
  };

  const addBenefit = (ticketIndex: number) => {
    if (editingEvent) {
      const updatedTicketTypes = [...editingEvent.ticketTypes];
      updatedTicketTypes[ticketIndex].benefits.push('');
      setEditingEvent({ ...editingEvent, ticketTypes: updatedTicketTypes });
    }
  };

  const removeBenefit = (ticketIndex: number, benefitIndex: number) => {
    if (editingEvent && editingEvent.ticketTypes[ticketIndex].benefits.length > 1) {
      const updatedTicketTypes = [...editingEvent.ticketTypes];
      updatedTicketTypes[ticketIndex].benefits = updatedTicketTypes[ticketIndex].benefits.filter((_, i) => i !== benefitIndex);
      setEditingEvent({ ...editingEvent, ticketTypes: updatedTicketTypes });
    }
  };

  const handleFeeChange = (field: string, value: any) => {
    if (editingEvent) {
      setEditingEvent({
        ...editingEvent,
        convenience: {
          ...editingEvent.convenience,
          [field]: typeof value === 'boolean' ? value : Number(value)
        }
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingEvent) return;
    setIsEditLoading(true);
    setEditError(null);
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        window.location.href = "/admin/login";
        return;
      }
      
      // Prepare data for backend - convert category back to database format
      const dataToSend = {
        ...editingEvent,
        isFreeEvent: !!editingEvent.isFreeEvent,
        ticketTypes: editingEvent.isFreeEvent ? [] : editingEvent.ticketTypes,
        convenience: editingEvent.isFreeEvent ? { percentage: 0, fixedAmount: 0 } : editingEvent.convenience,
        category: editingEvent.category ? editingEvent.category.charAt(0).toUpperCase() + editingEvent.category.slice(1) : 'Other'
      };
      
      console.log('Sending data to backend:', dataToSend); // Debug log
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await axios.put(`${apiUrl}/api/admin/events/${editingEvent._id}`, dataToSend, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 200 && response.data) {
        const updatedEvent = response.data.event || response.data;
        setEvents(prev => prev.map(event => event._id === updatedEvent._id ? updatedEvent : event));
        setIsEditDialogOpen(false);
        alert("Event updated successfully");
      } else {
        setEditError("Failed to update event");
      }
    } catch (err: any) {
      console.error('Update error:', err);
      setEditError(err.response?.data?.message || "Failed to update event");
    } finally {
      setIsEditLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        window.location.href = "/admin/login";
        return;
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      await axios.delete(`${apiUrl}/api/admin/events/${eventToDelete}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvents(prev => prev.filter(event => event._id !== eventToDelete));
      setIsDeleteDialogOpen(false);
      setEventToDelete(null);
      alert('Event deleted successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredEvents = searchQuery
    ? events.filter(
        (event) =>
          event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.location.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : events;

  const sortedFilteredEvents = [...filteredEvents].sort((a, b) => {
    const aDate = new Date(a.startDate || a.createdAt).getTime();
    const bDate = new Date(b.startDate || b.createdAt).getTime();
    return bDate - aDate; // latest first
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;
  if (error) return <div className="text-center p-8"><p className="text-red-500">{error}</p><Button className="mt-4" onClick={() => window.location.reload()}>Retry</Button></div>;

  return (
    <>
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Approved Events</CardTitle>
              <CardDescription>View and manage all approved events on the platform</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-md border overflow-hidden">
                <button
                  className={`px-3 py-1 text-sm ${viewStatus === 'approved' ? 'bg-primary text-white' : 'bg-white'}`}
                  onClick={() => setViewStatus('approved')}
                >Approved</button>
                <button
                  className={`px-3 py-1 text-sm ${viewStatus === 'paused' ? 'bg-primary text-white' : 'bg-white'}`}
                  onClick={() => setViewStatus('paused')}
                >Paused</button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search events..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 w-80" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {events.length === 0 ? "No approved events found" : "No events match your search"}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFilteredEvents.map((event) => (
                    <TableRow key={event._id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-3">
                          {event.banner && <img src={event.banner} alt={event.title} className="h-10 w-10 rounded-md object-cover" />}
                          <div>
                            <div className="font-medium">{event.title}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1">{event.description}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{event.category}</span></TableCell>
                      <TableCell>
                        <div className="font-medium">{event.location.city}</div>
                        <div className="text-xs text-muted-foreground">{event.location.address}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{format(new Date(event.startDate), 'MMM d, yyyy')}</div>
                        <div className="text-xs text-muted-foreground">to {format(new Date(event.endDate), 'MMM d, yyyy')}</div>
                      </TableCell>
                      <TableCell><span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">{event.status.charAt(0).toUpperCase() + event.status.slice(1)}</span></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {/* Pause/Resume button */}
                          {event.status === 'approved' ? (
                            <Button variant="outline" size="sm" className="h-8 gap-1 text-amber-600 hover:bg-amber-50" onClick={() => handlePauseEvent(event._id)}>
                              Pause
                            </Button>
                          ) : event.status === 'paused' ? (
                            <Button variant="outline" size="sm" className="h-8 gap-1 text-green-600 hover:bg-green-50" onClick={() => handleResumeEvent(event._id)}>
                              Resume
                            </Button>
                          ) : null}
                          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => handleEditClick(event)}><Edit className="h-3.5 w-3.5" /><span>Edit</span></Button>
                          <Button variant="outline" size="sm" className="h-8 gap-1 text-red-500 hover:bg-red-50" onClick={() => { setEventToDelete(event._id); setIsDeleteDialogOpen(true); }}><Trash2 className="h-3.5 w-3.5" /><span>Delete</span></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl">
          {editingEvent && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Event</DialogTitle>
                <DialogDescription>Make changes to your event here. Click save when you're done.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 max-h-[80vh] overflow-y-auto p-1 pr-4">
                {/* Banner Upload */}
                <div className="space-y-2">
                  <Label>Event Banner</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-48 h-27 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                      {imagePreview ? <img src={imagePreview} alt="Banner preview" className="w-full h-full object-cover" /> : <span className="text-xs text-muted-foreground">No Image</span>}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/jpeg,image/png,image/webp" />
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}><Upload className="mr-2 h-4 w-4" />{isUploading ? 'Uploading...' : 'Change Image'}</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Event Cover</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-48 h-27 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                      {coverPreview ? <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" /> : <span className="text-xs text-muted-foreground">No Image</span>}
                    </div>
                    <input type="file" ref={coverInputRef} onChange={handleCoverImageChange} className="hidden" accept="image/jpeg,image/png,image/webp" />
                    <Button type="button" variant="outline" onClick={() => coverInputRef.current?.click()} disabled={isUploadingCover}><Upload className="mr-2 h-4 w-4" />{isUploadingCover ? 'Uploading...' : 'Change Image'}</Button>
                  </div>
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Event Title</Label>
                    <Input 
                      id="title" 
                      value={editingEvent.title || ''} 
                      onChange={(e) => handleEventInputChange('title', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={editingEvent.category || ''} 
                      onValueChange={(value) => handleEventInputChange('category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="music">Music</SelectItem>
                        <SelectItem value="comedy">Comedy</SelectItem>
                        <SelectItem value="theatre">Theatre</SelectItem>
                        <SelectItem value="dance">Dance</SelectItem>
                        <SelectItem value="food">Food</SelectItem>
                        <SelectItem value="art">Art</SelectItem>
                        <SelectItem value="sports">Sports</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={editingEvent.description} onChange={(e) => handleEventInputChange('description', e.target.value)} /></div>

                <div className="space-y-2">
                  <Label htmlFor="termsAndConditions">Terms & Conditions</Label>
                  <Textarea id="termsAndConditions" value={editingEvent.termsAndConditions || ''} onChange={(e) => handleEventInputChange('termsAndConditions', e.target.value)} />
                </div>

                <div className="space-y-4 p-4 border rounded-md">
                  <h4 className="font-medium">Social & Website Links</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input id="website" value={editingEvent.socialLinks?.website || ''} onChange={(e) => handleEventInputChange('socialLinks.website', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instagram">Instagram</Label>
                      <Input id="instagram" value={editingEvent.socialLinks?.instagram || ''} onChange={(e) => handleEventInputChange('socialLinks.instagram', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="facebook">Facebook</Label>
                      <Input id="facebook" value={editingEvent.socialLinks?.facebook || ''} onChange={(e) => handleEventInputChange('socialLinks.facebook', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="twitter">X/Twitter</Label>
                      <Input id="twitter" value={editingEvent.socialLinks?.twitter || ''} onChange={(e) => handleEventInputChange('socialLinks.twitter', e.target.value)} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="youtube">YouTube</Label>
                      <Input id="youtube" value={editingEvent.socialLinks?.youtube || ''} onChange={(e) => handleEventInputChange('socialLinks.youtube', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="startDate">Start Date</Label><Input id="startDate" type="datetime-local" value={editingEvent.startDate ? format(new Date(editingEvent.startDate), "yyyy-MM-dd'T'HH:mm") : ''} onChange={(e) => handleEventInputChange('startDate', e.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor="endDate">End Date</Label><Input id="endDate" type="datetime-local" value={editingEvent.endDate ? format(new Date(editingEvent.endDate), "yyyy-MM-dd'T'HH:mm") : ''} onChange={(e) => handleEventInputChange('endDate', e.target.value)} /></div>
                </div>

                {/* Location */}
                <div className="space-y-4 p-4 border rounded-md">
                  <h4 className="font-medium">Location</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Venue Address *</Label>
                      <Input 
                        id="address" 
                        value={editingEvent.location?.address || ''} 
                        onChange={(e) => handleEventInputChange('location.address', e.target.value)}
                        placeholder="e.g., 123 Main St, City Convention Center"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City *</Label>
                        <Input 
                          id="city" 
                          value={editingEvent.location?.city || ''} 
                          onChange={(e) => handleEventInputChange('location.city', e.target.value)}
                          placeholder="e.g., Mumbai"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State *</Label>
                        <Input 
                          id="state" 
                          value={editingEvent.location?.state || ''} 
                          onChange={(e) => handleEventInputChange('location.state', e.target.value)}
                          placeholder="e.g., Maharashtra"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country *</Label>
                        <Input 
                          id="country" 
                          value={editingEvent.location?.country || 'India'} 
                          onChange={(e) => handleEventInputChange('location.country', e.target.value)}
                          placeholder="e.g., India"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pincode">Pincode *</Label>
                        <Input 
                          id="pincode" 
                          value={editingEvent.location?.pincode || ''} 
                          onChange={(e) => handleEventInputChange('location.pincode', e.target.value)}
                          placeholder="e.g., 400001"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event Type */}
                <div className="space-y-4 p-4 border rounded-md">
                  <h4 className="font-medium">Event Type</h4>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isFreeEvent"
                      checked={!!editingEvent.isFreeEvent}
                      onCheckedChange={(checked) => setEditingEvent(prev => prev ? { ...prev, isFreeEvent: !!checked, ticketTypes: !!checked ? [] : prev.ticketTypes } : prev)}
                    />
                    <Label htmlFor="isFreeEvent" className="text-sm">This is a Free/RSVP Event</Label>
                  </div>
                </div>

                {/* Ticket Types */}
                {!editingEvent.isFreeEvent && (
                <div className="space-y-4 p-4 border rounded-md"><div className="flex items-center justify-between"><h4 className="font-medium">Ticket Types</h4><Button type="button" variant="outline" size="sm" onClick={addTicketType}><PlusCircle className="h-4 w-4 mr-2" />Add Ticket</Button></div>
                  {editingEvent.ticketTypes.map((ticket, index) => (
                    <div key={index} className="p-3 border rounded-md space-y-3 bg-muted/50">
                      <div className="flex justify-between items-center"><h5 className="font-semibold">Ticket #{index + 1}</h5>{editingEvent.ticketTypes.length > 1 && <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => removeTicketType(index)}><Trash2 className="h-4 w-4" /></Button>}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Name</Label><Input value={ticket.name} onChange={(e) => handleTicketTypeChange(index, 'name', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Description</Label><Input value={ticket.description} onChange={(e) => handleTicketTypeChange(index, 'description', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Price</Label><Input type="number" value={ticket.price} onChange={(e) => handleTicketTypeChange(index, 'price', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={ticket.quantity} onChange={(e) => handleTicketTypeChange(index, 'quantity', e.target.value)} /></div>
                        <div className="space-y-2 md:col-span-2"><Label>Capacity</Label><Input type="number" value={ticket.capacity} onChange={(e) => handleTicketTypeChange(index, 'capacity', e.target.value)} /></div>
                      </div>
                      <div className="space-y-2"><div className="flex items-center justify-between"><Label>Benefits</Label><Button type="button" variant="outline" size="sm" onClick={() => addBenefit(index)}><Plus className="h-4 w-4 mr-2" />Add</Button></div>
                        {ticket.benefits.map((benefit, benefitIndex) => (
                          <div key={benefitIndex} className="flex gap-2"><Input value={benefit} onChange={(e) => handleBenefitChange(index, benefitIndex, e.target.value)} /><Button type="button" variant="ghost" size="sm" onClick={() => removeBenefit(index, benefitIndex)}><Trash2 className="h-4 w-4" /></Button></div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                )}

                {/* Fees Configuration */}
                <div className="space-y-4 p-4 border rounded-md">
                  <h4 className="font-medium">Fee Configuration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* GST Configuration */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeGst"
                          checked={(editingEvent.convenience?.includeGst || false) && !editingEvent.isFreeEvent}
                          onCheckedChange={(checked) => !editingEvent.isFreeEvent && handleFeeChange('includeGst', checked === true)}
                        />
                        <Label htmlFor="includeGst" className="text-sm font-medium">
                          Include GST
                        </Label>
                      </div>
                      {editingEvent.convenience?.includeGst && !editingEvent.isFreeEvent && (
                        <div className="space-y-2">
                          <Label htmlFor="gstPercentage">GST Percentage (%)</Label>
                          <Input
                            id="gstPercentage"
                            type="number"
                            value={editingEvent.convenience?.gstPercentage || 18}
                            onChange={(e) => handleFeeChange('gstPercentage', parseFloat(e.target.value) || 0)}
                            placeholder="18"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                        </div>
                      )}
                    </div>

                    {/* Convenience Fee Configuration */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeConvenience"
                          checked={(editingEvent.convenience?.includeConvenience !== false) && !editingEvent.isFreeEvent}
                          onCheckedChange={(checked) => !editingEvent.isFreeEvent && handleFeeChange('includeConvenience', checked === true)}
                        />
                        <Label htmlFor="includeConvenience" className="text-sm font-medium">
                          Include Convenience Fee
                        </Label>
                      </div>
                      {editingEvent.convenience?.includeConvenience !== false && !editingEvent.isFreeEvent && (
                        <div className="space-y-2">
                          <div className="space-y-2">
                            <Label htmlFor="conveniencePercentage">Convenience Percentage (%)</Label>
                            <Input
                              id="conveniencePercentage"
                              type="number"
                              value={editingEvent.convenience?.conveniencePercentage || 5}
                              onChange={(e) => handleFeeChange('conveniencePercentage', parseFloat(e.target.value) || 0)}
                              placeholder="5"
                              min="0"
                              max="100"
                              step="0.1"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="convenienceFixed">Fixed Amount (₹)</Label>
                            <Input
                              id="convenienceFixed"
                              type="number"
                              value={editingEvent.convenience?.convenienceFixedAmount || 0}
                              onChange={(e) => handleFeeChange('convenienceFixedAmount', parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={isEditLoading || isUploading}>{isEditLoading ? 'Saving...' : 'Save Changes'}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the event.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
