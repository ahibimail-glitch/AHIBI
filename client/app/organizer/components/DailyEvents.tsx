"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, Pause, Play, Loader2 } from "lucide-react";
import { format } from "date-fns";

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
}

interface DailyEventsProps {
  filterStatus?: string;
}

export default function DailyEvents({ filterStatus }: DailyEventsProps) {
  const [dailyEvents, setDailyEvents] = useState<DailyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

              {!event.isFreeEvent && (
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tickets Sold:</span>
                    <span className="font-semibold">
                      {event.ticketsSold} / {event.totalTickets}
                    </span>
                  </div>
                </div>
              )}

              {(event.status === "approved" || event.status === "paused") && (
                <Button
                  onClick={() => handlePauseResume(event._id, event.status)}
                  variant={event.status === "paused" ? "default" : "outline"}
                  className="w-full mt-2"
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
