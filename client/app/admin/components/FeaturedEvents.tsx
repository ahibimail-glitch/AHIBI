"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Star, StarOff, Loader2, Calendar, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Event {
  _id: string;
  title: string;
  description: string;
  category: string;
  startDate: string;
  endDate: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
  };
  status: string;
  isFeatured: boolean;
  banner?: string;
  ticketsSold?: number;
  totalTickets?: number;
}

export default function FeaturedEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        window.location.href = "/admin/login";
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/admin/events?status=approved`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch events');
      }
      
      const response = await res.json();
      
      if (!response.data || !Array.isArray(response.data.events)) {
        throw new Error("Invalid data format received from server");
      }
      
      setEvents(response.data.events);
    } catch (err: any) {
      console.error('Error fetching events:', err);
      setError(err.message || "Failed to load events");
      toast({
        title: "Error",
        description: err.message || "Failed to load events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFeatured = async (eventId: string, currentStatus: boolean) => {
    setUpdatingEventId(eventId);
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        window.location.href = "/admin/login";
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/admin/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isFeatured: !currentStatus
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update event');
      }

      // Update local state
      setEvents(events.map(event => 
        event._id === eventId 
          ? { ...event, isFeatured: !currentStatus }
          : event
      ));

      toast({
        title: "Success",
        description: `Event ${!currentStatus ? 'added to' : 'removed from'} featured events`,
      });
    } catch (err: any) {
      console.error('Error updating event:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to update event",
        variant: "destructive",
      });
    } finally {
      setUpdatingEventId(null);
    }
  };

  const filteredEvents = events.filter((event) => {
    const query = searchQuery.toLowerCase();
    return (
      event.title.toLowerCase().includes(query) ||
      event.category.toLowerCase().includes(query) ||
      event.location.city.toLowerCase().includes(query)
    );
  });

  const featuredEvents = filteredEvents.filter(event => event.isFeatured);
  const nonFeaturedEvents = filteredEvents.filter(event => !event.isFeatured);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Featured Events</h2>
          <p className="text-gray-600 mt-1">
            Manage which events appear on the homepage
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
            {featuredEvents.length} Featured
          </Badge>
          <Badge variant="outline">
            {events.length} Total Events
          </Badge>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Events</CardTitle>
          <CardDescription>
            Find events by title, category, or location
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Featured Events Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            Featured Events ({featuredEvents.length})
          </CardTitle>
          <CardDescription>
            These events will be displayed on the homepage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {featuredEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No featured events. Click the star icon on any event below to feature it.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {featuredEvents.map((event) => (
                    <TableRow key={event._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {event.banner && (
                            <img
                              src={event.banner}
                              alt={event.title}
                              className="w-12 h-12 rounded object-cover"
                            />
                          )}
                          <div>
                            <div className="font-medium">{event.title}</div>
                            <div className="text-sm text-gray-500 line-clamp-1">
                              {event.description}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{event.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(event.startDate), "MMM dd, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3" />
                          {event.location.city}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFeatured(event._id, event.isFeatured)}
                          disabled={updatingEventId === event._id}
                        >
                          {updatingEventId === event._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <StarOff className="h-4 w-4 text-yellow-500" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Events Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StarOff className="h-5 w-5 text-gray-400" />
            All Events ({nonFeaturedEvents.length})
          </CardTitle>
          <CardDescription>
            Click the star icon to feature an event on the homepage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {nonFeaturedEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? "No events found matching your search." : "All events are featured!"}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nonFeaturedEvents.map((event) => (
                    <TableRow key={event._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {event.banner && (
                            <img
                              src={event.banner}
                              alt={event.title}
                              className="w-12 h-12 rounded object-cover"
                            />
                          )}
                          <div>
                            <div className="font-medium">{event.title}</div>
                            <div className="text-sm text-gray-500 line-clamp-1">
                              {event.description}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{event.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(event.startDate), "MMM dd, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3" />
                          {event.location.city}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFeatured(event._id, event.isFeatured)}
                          disabled={updatingEventId === event._id}
                        >
                          {updatingEventId === event._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Star className="h-4 w-4 text-gray-400 hover:text-yellow-500" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
