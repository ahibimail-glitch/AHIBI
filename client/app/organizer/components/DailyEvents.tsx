"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, Pause, Play, Loader2, Edit, ClipboardList, Mail, PhoneCall } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DailyEvent {
  _id: string;
  title: string;
  description: string;
  banner: string;
  category: string;
  periodStartDate: string;
  periodEndDate: string;
  startTime: string;
  duration: {
    hours: number;
    minutes: number;
  };
  activeDates: string[];
  excludedDates: string[];
  location: {
    address: string;
    city: string;
    state?: string;
  };
  status: string;
  ticketTypes: any[];
  ticketsSold: number;
  totalTickets: number;
  isFreeEvent: boolean;
  bookingType?: "ticketed" | "rsvp" | "call_to_book";
  pendingRsvpCount?: number;
}

interface RsvpRequest {
  _id: string;
  name: string;
  email: string;
  phone: string;
  partySize: number;
  address: string;
  requestedDate: string;
  status: "pending" | "contacted" | "booked" | "declined";
  createdAt: string;
}

function formatRequestedDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return format(new Date(year, month - 1, day, 12), "EEE, MMM d, yyyy");
}

interface DailyEventsProps {
  filterStatus?: string;
  onEdit?: (eventId: string) => void;
}

export default function DailyEvents({ filterStatus, onEdit }: DailyEventsProps) {
  const [dailyEvents, setDailyEvents] = useState<DailyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rsvpEvent, setRsvpEvent] = useState<DailyEvent | null>(null);
  const [rsvpRequests, setRsvpRequests] = useState<RsvpRequest[]>([]);
  const [isRsvpLoading, setIsRsvpLoading] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [updatingRsvpId, setUpdatingRsvpId] = useState<string | null>(null);

  const fetchDailyEvents = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("organizer_token");
      if (!token) {
        throw new Error("Authentication required");
      }

      const url = filterStatus
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/organizer/daily-events?status=${filterStatus}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/organizer/daily-events`;

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setDailyEvents(response.data.data.dailyEvents || []);
      }
    } catch (err: any) {
      console.error("Error fetching daily events:", err);
      setError(err.response?.data?.message || "Failed to load daily events");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyEvents();
  }, [filterStatus]);

  const openRsvpRequests = async (event: DailyEvent) => {
    setRsvpEvent(event);
    setRsvpRequests([]);
    setRsvpError(null);
    setIsRsvpLoading(true);
    try {
      const token = localStorage.getItem("organizer_token");
      if (!token) throw new Error("Authentication required");
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organizer/daily-events/${event._id}/rsvps`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.data.success) throw new Error(response.data.message || "Failed to load RSVP requests");
      setRsvpRequests(response.data.data.rsvpRequests || []);
    } catch (err: any) {
      setRsvpError(err.response?.data?.message || err.message || "Failed to load RSVP requests");
    } finally {
      setIsRsvpLoading(false);
    }
  };

  const updateRsvpStatus = async (request: RsvpRequest, status: RsvpRequest["status"]) => {
    if (!rsvpEvent || updatingRsvpId) return;
    setUpdatingRsvpId(request._id);
    setRsvpError(null);
    try {
      const token = localStorage.getItem("organizer_token");
      if (!token) throw new Error("Authentication required");
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organizer/daily-events/${rsvpEvent._id}/rsvps/${request._id}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.data.success) throw new Error(response.data.message || "Failed to update RSVP request");
      setRsvpRequests((current) => current.map((item) => item._id === request._id ? response.data.data.rsvpRequest : item));
      if (request.status === "pending" && status !== "pending") {
        setDailyEvents((current) => current.map((event) => event._id === rsvpEvent._id
          ? { ...event, pendingRsvpCount: Math.max(0, (event.pendingRsvpCount || 0) - 1) }
          : event));
      }
    } catch (err: any) {
      setRsvpError(err.response?.data?.message || err.message || "Failed to update RSVP request");
    } finally {
      setUpdatingRsvpId(null);
    }
  };

  const handlePauseResume = async (eventId: string, currentStatus: string) => {
    try {
      const token = localStorage.getItem("organizer_token");
      if (!token) {
        throw new Error("Authentication required");
      }

      const action = currentStatus === "paused" ? "resume" : "pause";
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organizer/daily-events/${eventId}/${action}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        fetchDailyEvents();
      }
    } catch (err: any) {
      console.error(`Error ${currentStatus === "paused" ? "resuming" : "pausing"} daily event:`, err);
      alert(err.response?.data?.message || "Failed to update daily event status");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: "Pending Approval", className: "bg-yellow-100 text-yellow-800" },
      approved: { label: "Approved", className: "bg-green-100 text-green-800" },
      rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
      paused: { label: "Paused", className: "bg-gray-100 text-gray-800" },
      completed: { label: "Completed", className: "bg-blue-100 text-blue-800" },
    };

    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (dailyEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Daily Events Found</h3>
        <p className="text-gray-600">
          {filterStatus
            ? `No ${filterStatus} daily events at the moment.`
            : "You haven't created any daily events yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Daily Events</h2>
        <Badge variant="outline">{dailyEvents.length} Events</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dailyEvents.map((event) => (
          <Card key={event._id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative h-48">
              <img
                src={event.banner}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2">
                {getStatusBadge(event.status)}
              </div>
            </div>

            <CardHeader>
              <CardTitle className="line-clamp-2">{event.title}</CardTitle>
              <Badge variant="secondary" className="w-fit">
                {event.category}
              </Badge>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">
                    {event.periodStartDate && event.periodEndDate ? (
                      <>
                        {format(new Date(event.periodStartDate), "MMM dd")} - {format(new Date(event.periodEndDate), "MMM dd, yyyy")}
                      </>
                    ) : (
                      "Date not available"
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {event.activeDates?.length || 0} active dates
                    {event.excludedDates?.length > 0 && `, ${event.excludedDates.length} excluded`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>
                  {event.startTime || "Time TBA"} ({event.duration?.hours || 0}h {event.duration?.minutes || 0}m)
                </span>
              </div>

              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">
                  {event.location?.address || "Venue TBA"}{event.location?.city ? `, ${event.location.city}` : ""}
                </span>
              </div>

              {event.bookingType === "rsvp" || event.bookingType === "call_to_book" ? (
                <div className="flex items-start gap-2 border-t pt-3 text-sm text-gray-600">
                  <ClipboardList className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900">RSVP requests</div>
                    <div>Contact guests to confirm before marking booked.</div>
                  </div>
                </div>
              ) : !event.isFreeEvent && (
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tickets Sold:</span>
                    <span className="font-semibold">
                      {event.ticketsSold} / {event.totalTickets}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {(event.bookingType === "rsvp" || event.bookingType === "call_to_book") && (
                  <Button onClick={() => openRsvpRequests(event)} variant="outline" className="w-full" size="sm">
                    <ClipboardList className="mr-2 h-4 w-4" /> Manage RSVP requests
                    {event.pendingRsvpCount ? ` · ${event.pendingRsvpCount} pending` : ""}
                  </Button>
                )}
                {onEdit && event.status !== "completed" && (
                  <Button
                    onClick={() => onEdit(event._id)}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Event
                  </Button>
                )}
                
                {(event.status === "approved" || event.status === "paused") && (
                  <Button
                    onClick={() => handlePauseResume(event._id, event.status)}
                    variant={event.status === "paused" ? "default" : "outline"}
                    className="w-full"
                    size="sm"
                  >
                    {event.status === "paused" ? (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Resume Event
                      </>
                    ) : (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause Event
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={Boolean(rsvpEvent)} onOpenChange={(open) => {
        if (!open) {
          setRsvpEvent(null);
          setRsvpRequests([]);
          setRsvpError(null);
        }
      }}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>RSVP requests{rsvpEvent ? `: ${rsvpEvent.title}` : ""}</DialogTitle>
            <DialogDescription>Call each guest to discuss their request. Mark it booked only after you both agree.</DialogDescription>
          </DialogHeader>

          {rsvpError && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{rsvpError}</p>}
          {isRsvpLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-pink-600" /></div>
          ) : rsvpRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 px-5 py-10 text-center text-sm text-gray-600">
              No RSVP requests have been submitted for this event yet.
            </div>
          ) : (
            <div className="space-y-4">
              {rsvpRequests.map((request) => {
                const statusClass = request.status === "booked"
                  ? "bg-green-100 text-green-800"
                  : request.status === "declined"
                    ? "bg-gray-100 text-gray-700"
                    : request.status === "contacted"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-amber-100 text-amber-800";
                return (
                  <article key={request._id} className="rounded-xl border border-gray-200 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{request.name}</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          {formatRequestedDate(request.requestedDate)} | {request.partySize} {request.partySize === 1 ? "person" : "people"}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass}`}>{request.status}</span>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                      <a className="inline-flex items-center gap-2 hover:text-gray-950" href={`tel:${request.phone.replace(/[^\d+]/g, "")}`}>
                        <PhoneCall className="h-4 w-4" /> {request.phone}
                      </a>
                      <a className="inline-flex min-w-0 items-center gap-2 break-all hover:text-gray-950" href={`mailto:${request.email}`}>
                        <Mail className="h-4 w-4 shrink-0" /> {request.email}
                      </a>
                      <p className="sm:col-span-2"><span className="font-medium">Address:</span> {request.address}</p>
                      <p className="text-xs text-gray-500 sm:col-span-2">Received {format(new Date(request.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                    </div>
                    {(request.status === "pending" || request.status === "contacted") && (
                      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
                        {request.status === "pending" && (
                          <Button size="sm" variant="outline" disabled={Boolean(updatingRsvpId)} onClick={() => updateRsvpStatus(request, "contacted")}>
                            {updatingRsvpId === request._id ? "Saving..." : "Mark contacted"}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" disabled={Boolean(updatingRsvpId)} onClick={() => updateRsvpStatus(request, "declined")}>
                          Mark declined
                        </Button>
                        <Button size="sm" disabled={Boolean(updatingRsvpId)} onClick={() => updateRsvpStatus(request, "booked")}>
                          Mark booked
                        </Button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
