"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface EventItem {
  _id: string;
  title: string;
  category: string;
  startDate: string;
  endDate: string;
  banner?: string;
  bookingEndTime?: string | null;
  location?: {
    city?: string;
    address?: string;
  };
}

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function ScheduleEvent() {
  const { toast } = useToast();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [bookingEndTime, setBookingEndTime] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        window.location.href = "/admin/login";
        return;
      }

      const res = await fetch(`${apiUrl}/api/admin/events?status=approved`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch events");
      }

      const list: EventItem[] = data?.data?.events || [];
      setEvents(list);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to fetch events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return events;
    return events.filter(e =>
      e.title?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q) ||
      (e.location?.city || "").toLowerCase().includes(q)
    );
  }, [events, searchQuery]);

  const handleSelectEvent = async (eventId: string) => {
    setSelectedEventId(eventId);
    setSelectedEvent(null);
    setBookingEndTime("");

    if (!eventId) return;

    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        window.location.href = "/admin/login";
        return;
      }

      const res = await fetch(`${apiUrl}/api/admin/events/${eventId}/details`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch event details");
      }

      const ev: EventItem = data?.data?.event;
      setSelectedEvent(ev);

      if (ev?.bookingEndTime) {
        const dt = new Date(ev.bookingEndTime);
        if (!isNaN(dt.getTime())) setBookingEndTime(toLocalInputValue(dt));
      } else {
        setBookingEndTime("");
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to fetch event details",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!selectedEventId) return;

    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        window.location.href = "/admin/login";
        return;
      }

      let payload: any = {};

      if (!bookingEndTime.trim()) {
        payload.bookingEndTime = null;
      } else {
        const dt = new Date(bookingEndTime);
        if (isNaN(dt.getTime())) {
          throw new Error("Invalid booking end time");
        }
        payload.bookingEndTime = dt.toISOString();
      }

      const res = await fetch(`${apiUrl}/api/admin/events/${selectedEventId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to update booking end time");
      }

      toast({
        title: "Saved",
        description: "Booking end time updated successfully",
      });

      // Refresh list and details
      await fetchEvents();
      await handleSelectEvent(selectedEventId);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to update booking end time",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const computedCutoffLabel = useMemo(() => {
    if (!selectedEvent) return null;
    const fallback = selectedEvent?.endDate ? new Date(selectedEvent.endDate) : null;
    const explicit = selectedEvent?.bookingEndTime ? new Date(selectedEvent.bookingEndTime) : null;

    const cutoff = explicit && !isNaN(explicit.getTime()) ? explicit : (fallback && !isNaN(fallback.getTime()) ? fallback : null);
    if (!cutoff) return null;

    const isCustom = !!(explicit && !isNaN(explicit.getTime()));
    return {
      text: `${format(cutoff, "MMM d, yyyy h:mm a")}${isCustom ? " (custom)" : " (event end time)"}`,
      isCustom,
    };
  }, [selectedEvent]);

  return (
    <div className="space-y-6">
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              {/* <CardTitle>Schedule Event</CardTitle> */}
              <CardDescription>
                Set a booking cutoff time per event. If not set, booking will be allowed until the event end time.
              </CardDescription>
            </div>
            <Button variant="outline" onClick={fetchEvents} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Events</CardTitle>
                <CardDescription>Search and select an event to schedule bookings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search by title, category, city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="rounded-md border overflow-hidden">
                  <div className="max-h-[520px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead className="w-[64px]">Image</TableHead>
                          <TableHead>Event</TableHead>
                          <TableHead className="w-[140px]">Cutoff</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEvents.map((e) => {
                          const cutoff = e.bookingEndTime ? new Date(e.bookingEndTime) : (e.endDate ? new Date(e.endDate) : null);
                          const cutoffLabel = cutoff && !isNaN(cutoff.getTime()) ? format(cutoff, "MMM d, h:mm a") : "";
                          const isSelected = selectedEventId === e._id;
                          return (
                            <TableRow
                              key={e._id}
                              className={isSelected ? "bg-muted/50" : "cursor-pointer"}
                              onClick={() => handleSelectEvent(e._id)}
                            >
                              <TableCell>
                                <div className="h-10 w-14 rounded-md overflow-hidden bg-muted border">
                                  {e.banner ? (
                                    <img src={e.banner} alt={e.title} className="h-full w-full object-cover" />
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium leading-tight">{e.title}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {(e.location?.city || "") + (e.category ? ` • ${e.category}` : "")}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {e.bookingEndTime ? (
                                  <Badge>{cutoffLabel}</Badge>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Default</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {filteredEvents.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">
                              No events found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-lg">Schedule</CardTitle>
                <CardDescription>Update booking end time for the selected event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedEvent ? (
                  <div className="text-sm text-muted-foreground">
                    Select an event from the left to edit its booking cutoff.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="w-full md:w-[220px]">
                        <div className="rounded-lg overflow-hidden border bg-muted aspect-[16/9]">
                          {selectedEvent.banner ? (
                            <img src={selectedEvent.banner} alt={selectedEvent.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">No image</div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xl font-semibold leading-tight">{selectedEvent.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {selectedEvent.location?.city ? `${selectedEvent.location.city} • ` : ""}
                              {selectedEvent.category}
                            </div>
                          </div>
                          {computedCutoffLabel && (
                            <Badge variant={computedCutoffLabel.isCustom ? "default" : "secondary"}>
                              {computedCutoffLabel.text}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                          <div className="rounded-md border p-3">
                            <div className="text-xs text-muted-foreground">Event Start</div>
                            <div className="font-medium text-sm">{format(new Date(selectedEvent.startDate), "MMM d, yyyy h:mm a")}</div>
                          </div>
                          <div className="rounded-md border p-3">
                            <div className="text-xs text-muted-foreground">Event End</div>
                            <div className="font-medium text-sm">{format(new Date(selectedEvent.endDate), "MMM d, yyyy h:mm a")}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bookingEndTime">Booking End Time (optional)</Label>
                        <Input
                          id="bookingEndTime"
                          type="datetime-local"
                          value={bookingEndTime}
                          onChange={(e) => setBookingEndTime(e.target.value)}
                        />
                        <div className="text-xs text-muted-foreground">
                          Leave empty to default booking cutoff to the event end time.
                        </div>
                      </div>

                      <div className="rounded-md border p-4 bg-muted/30">
                        <div className="text-sm font-medium">Tips</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Use booking end time to stop sales before gates close. This affects:
                          <div className="mt-2">
                            <div>- User bookings</div>
                            <div>- Admin manual bookings</div>
                            <div>- Razorpay paid bookings</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setBookingEndTime("")}>
                        Clear
                      </Button>
                      <Button onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
