"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Edit,
  Trash2,
  Eye,
  Plus,
  Search,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import EditEventForm from "./EditEventForm";

interface Event {
  _id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  category: string;
  status: string;
  approvalStatus: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
  };
  ticketTypes: Array<{
    name: string;
    price: number;
    quantity: number;
    sold: number;
  }>;
  totalTickets: number;
  ticketsSold: number;
  totalRevenue: number;
  rejectionReason?: string;
  createdAt: string;
}

interface EventsProps {
  filterStatus?: "approved" | "pending" | "rejected" | "all";
}

export default function Events({ filterStatus = "all" }: EventsProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const { toast } = useToast();
  // Local view toggle for Approved view
  const [viewStatus, setViewStatus] = useState<'approved' | 'paused'>('approved');

  // Fetch events from API
  useEffect(() => {
    fetchEvents();
  }, [filterStatus, viewStatus]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("organizer_token");
      if (!token) {
        window.location.href = "/organizer/auth/login";
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      // If viewing Approved tab, use local toggle to load approved or paused
      const effectiveStatus = filterStatus === 'approved' ? viewStatus : (filterStatus !== 'all' ? filterStatus : undefined);
      const statusParam = effectiveStatus ? `&status=${effectiveStatus}` : "";
      const response = await fetch(`${apiUrl}/api/organizer/events?${statusParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      setEvents(data.data?.events || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort events based on status and search
  const getFilteredEvents = () => {
    let filtered = events;
    // Determine effective status for filtering
    const effectiveStatus = filterStatus === 'approved' ? viewStatus : filterStatus;
    if (effectiveStatus !== "all") {
      filtered = events.filter(event => event.status === effectiveStatus);
    }

    // Search filter
    filtered = filtered.filter((event) =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.city.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sorting
    if (filterStatus === "all") {
      const priority: Record<string, number> = {
        approved: 0,
        active: 0,
        pending: 1,
        paused: 2,
        rejected: 3,
        completed: 4,
        draft: 5,
        cancelled: 6,
      };
      filtered = [...filtered].sort((a, b) => {
        const pa = priority[a.status] ?? 99;
        const pb = priority[b.status] ?? 99;
        if (pa !== pb) return pa - pb;
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      });
    } else {
      // For specific tabs like approved/pending etc., sort by start date
      filtered = [...filtered].sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
    }

    return filtered;
  };

  const filteredEvents = getFilteredEvents();

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingEventId(eventId);
      const token = localStorage.getItem("organizer_token");
      if (!token) {
        window.location.href = "/organizer/auth/login";
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${apiUrl}/api/organizer/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete event');
      }

      // Remove the event from the list
      setEvents(events.filter(event => event._id !== eventId));
      
      toast({
        title: "Success",
        description: "Event deleted successfully!",
        variant: "default",
      });
    } catch (err) {
      console.error('Error deleting event:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete event",
        variant: "destructive",
      });
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleEditSuccess = () => {
    setEditingEventId(null);
    fetchEvents(); // Refresh the events list
    toast({
      title: "Success",
      description: "Event updated successfully!",
      variant: "default",
    });
  };

  // Pause/Resume own events
  const handlePauseEvent = async (eventId: string) => {
    try {
      const token = localStorage.getItem("organizer_token");
      if (!token) {
        window.location.href = "/organizer/auth/login";
        return;
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/pause`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to pause event');
      }
      const data = await res.json();
      const updated = data.data?.event || data.event || data;
      setEvents(prev => prev.map(e => e._id === eventId ? { ...e, status: updated.status || 'paused' } : e));
      toast({ title: 'Event paused', description: 'This event is now paused.' });
    } catch (err) {
      console.error('Pause failed', err);
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to pause event', variant: 'destructive' });
    }
  };

  const handleResumeEvent = async (eventId: string) => {
    try {
      const token = localStorage.getItem("organizer_token");
      if (!token) {
        window.location.href = "/organizer/auth/login";
        return;
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/resume`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to resume event');
      }
      const data = await res.json();
      const updated = data.data?.event || data.event || data;
      setEvents(prev => prev.map(e => e._id === eventId ? { ...e, status: updated.status || 'approved' } : e));
      toast({ title: 'Event resumed', description: 'This event is now live (approved).' });
    } catch (err) {
      console.error('Resume failed', err);
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to resume event', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case "paused":
        return <Badge className="bg-amber-100 text-amber-800">Paused</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "active":
        return <Badge className="bg-blue-100 text-blue-800">Active</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPageTitle = () => {
    switch (filterStatus) {
      case "approved":
        return "Approved Events";
      case "pending":
        return "Pending Events";
      case "rejected":
        return "Rejected Events";
      default:
        return "My Events";
    }
  };

  const getPageDescription = () => {
    switch (filterStatus) {
      case "approved":
        return "Events that have been approved and are live";
      case "pending":
        return "Events waiting for admin approval";
      case "rejected":
        return "Events that were not approved";
      default:
        return "Manage and track your events";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-pink-600" />
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchEvents} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // If editing an event, show the edit form
  if (editingEventId) {
    return (
      <EditEventForm
        eventId={editingEventId}
        onSuccess={handleEditSuccess}
        onCancel={() => setEditingEventId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{getPageTitle()}</h2>
          <p className="text-sm sm:text-base text-gray-600">{getPageDescription()}</p>
        </div>
        {filterStatus === 'approved' && (
          <div className="inline-flex rounded-md border overflow-hidden self-start sm:self-auto">
            <button
              className={`px-3 py-1 text-sm ${viewStatus === 'approved' ? 'bg-primary text-white' : 'bg-white'}`}
              onClick={() => setViewStatus('approved')}
            >
              Approved
            </button>
            <button
              className={`px-3 py-1 text-sm ${viewStatus === 'paused' ? 'bg-primary text-white' : 'bg-white'}`}
              onClick={() => setViewStatus('paused')}
            >
              Paused
            </button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search events by name or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline" className="w-full sm:w-auto">Filter</Button>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>{getPageTitle()}</CardTitle>
          <CardDescription>
            {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Name</TableHead>
                  <TableHead>Date & Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tickets</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event._id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{event.title}</div>
                        <div className="text-sm text-gray-500">
                          {event.ticketTypes.length > 0 ? `₹${event.ticketTypes[0].price}` : '₹0'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{new Date(event.startDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500">{event.location.address}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(event.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {event.ticketsSold}/{event.totalTickets}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-gradient-to-r from-pink-500 to-purple-600 h-2 rounded-full"
                          style={{
                            width: `${event.totalTickets > 0 ? (event.ticketsSold / event.totalTickets) * 100 : 0}%`,
                          }}
                        ></div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">₹{event.totalRevenue}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {event.status === 'approved' || event.status === 'active' ? (
                          <>
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white"
                              onClick={() => router.push(`/organizer/dashboard/crm/${event._id}`)}
                            >
                              <Users className="h-4 w-4 mr-1" />
                              Activate CRM
                            </Button>
                            <Button size="sm" variant="outline" className="text-amber-600 hover:bg-amber-50" onClick={() => handlePauseEvent(event._id)}>
                              Pause
                            </Button>
                          </>
                        ) : null}
                        {event.status === 'paused' ? (
                          <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50" onClick={() => handleResumeEvent(event._id)}>
                            Resume
                          </Button>
                        ) : null}
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setEditingEventId(event._id)}
                          disabled={event.status === "completed"}
                          title={event.status === "completed" ? "Cannot edit completed events" : "Edit event"}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteEvent(event._id)}
                          disabled={event.status === "completed" || deletingEventId === event._id}
                          title={event.status === "completed" ? "Cannot delete completed events" : "Delete event"}
                        >
                          {deletingEventId === event._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {event.status === "completed" && (
                        <div className="flex items-center space-x-1 mt-1 text-xs text-gray-500">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Completed events cannot be modified</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {filteredEvents.map((event) => (
              <div key={event._id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                {/* Event Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{event.title}</h3>
                    <p className="text-sm text-gray-500">
                      {event.ticketTypes.length > 0 ? `₹${event.ticketTypes[0].price}` : '₹0'}
                    </p>
                  </div>
                  {getStatusBadge(event.status)}
                </div>

                {/* Event Details */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{new Date(event.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{event.location.address}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <Users className="h-3 w-3 mr-1" />
                      <span>Tickets</span>
                    </div>
                    <div className="text-xs font-medium">{event.ticketsSold}/{event.totalTickets}</div>
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                      <div
                        className="bg-gradient-to-r from-pink-500 to-purple-600 h-1 rounded-full"
                        style={{
                          width: `${event.totalTickets > 0 ? (event.ticketsSold / event.totalTickets) * 100 : 0}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-xs text-gray-600 mb-1">Revenue</div>
                    <div className="text-sm font-medium">₹{event.totalRevenue}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {event.status === 'approved' || event.status === 'active' ? (
                    <>
                      {/* <Button
                        size="sm"
                        className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white"
                        onClick={() => router.push(`/organizer/dashboard/crm/${event._id}`)}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Activate CRM
                      </Button> */}
                      <Button size="sm" variant="outline" className="text-amber-600 hover:bg-amber-50 flex-1" onClick={() => handlePauseEvent(event._id)}>
                        Pause
                      </Button>
                    </>
                  ) : null}
                  {event.status === 'paused' ? (
                    <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50 flex-1" onClick={() => handleResumeEvent(event._id)}>
                      Resume
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" className="flex-1">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setEditingEventId(event._id)}
                    disabled={event.status === "completed"}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-red-600 hover:text-red-700 flex-1"
                    onClick={() => handleDeleteEvent(event._id)}
                    disabled={event.status === "completed" || deletingEventId === event._id}
                  >
                    {deletingEventId === event._id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
