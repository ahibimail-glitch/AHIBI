"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Booking {
  _id: string;
  event: any;
  eventSnapshot?: { _id?: string; title?: string; startDate?: string };
  user: { name?: string; email?: string; phone?: string };
  bookedAt: string;
  ticketType?: string;
  quantity?: number;
  total?: number;
  status?: string;
  paymentId?: string;
  paymentStatus?: string;
  country?: string;
  state?: string;
  modeOfPayment?: string;
  visitorType?: string;
}

const HMF_IDS = [
  "691b1066a9a25d4fec36f96c",
  "691b13caa9a25d4fec36fa70",
  "691b146fa9a25d4fec36fb25",
  "691b14f1a9a25d4fec36fbd7",
  "691b156ea9a25d4fec36fc8d",
  "691b15c5a9a25d4fec36fd3a",
  "691b15faa9a25d4fec36fd3f",
  "691b162ca9a25d4fec36fd44",
  "691b1771a9a25d4fec36feaf",
];

export default function HmfTickets() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [selectedTicketType, setSelectedTicketType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedVisitorType, setSelectedVisitorType] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("admin_token");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const resp = await fetch(`${apiUrl}/api/admin/bookings/all`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });
        if (!resp.ok) throw new Error("Failed to fetch bookings");
        const data = await resp.json();
        const list: Booking[] = Array.isArray(data?.bookings) ? data.bookings : [];
        // Filter by HMF event IDs (from event or snapshot)
        const filtered = list.filter((b) => {
          const id = String(b.event?._id || b.eventSnapshot?._id || "");
          return HMF_IDS.includes(id);
        });
        setBookings(filtered);
      } catch (e: any) {
        setError(e?.message || "Failed to load HMF tickets");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Extract unique values for filter dropdowns
  const uniqueEvents = useMemo(() => {
    const events = new Set<string>();
    bookings.forEach((b) => {
      const title = b.event?.title || b.eventSnapshot?.title;
      if (title) events.add(title);
    });
    return Array.from(events).sort();
  }, [bookings]);

  const uniqueTicketTypes = useMemo(() => {
    const types = new Set<string>();
    bookings.forEach((b) => {
      if (b.ticketType) types.add(b.ticketType);
    });
    return Array.from(types).sort();
  }, [bookings]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<string>();
    bookings.forEach((b) => {
      if (b.status) statuses.add(b.status);
    });
    return Array.from(statuses).sort();
  }, [bookings]);

  const uniqueCountries = useMemo(() => {
    const countries = new Set<string>();
    bookings.forEach((b) => {
      if (b.country) countries.add(b.country);
    });
    return Array.from(countries).sort();
  }, [bookings]);

  const uniqueStates = useMemo(() => {
    const states = new Set<string>();
    bookings.forEach((b) => {
      if (b.state) states.add(b.state);
    });
    return Array.from(states).sort();
  }, [bookings]);

  const uniqueVisitorTypes = useMemo(() => {
    const types = new Set<string>();
    bookings.forEach((b) => {
      if (b.visitorType) types.add(b.visitorType);
    });
    return Array.from(types).sort();
  }, [bookings]);

  const visible = useMemo(() => {
    let filtered = [...bookings];

    // Search filter
    const q = search.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((b) => {
        const title = String(b.event?.title || b.eventSnapshot?.title || "").toLowerCase();
        const name = String(b.user?.name || "").toLowerCase();
        const email = String(b.user?.email || "").toLowerCase();
        const phone = String(b.user?.phone || "");
        return title.includes(q) || name.includes(q) || email.includes(q) || phone.includes(q);
      });
    }

    // Event filter
    if (selectedEvent !== "all") {
      filtered = filtered.filter((b) => {
        const title = b.event?.title || b.eventSnapshot?.title;
        return title === selectedEvent;
      });
    }

    // Ticket type filter
    if (selectedTicketType !== "all") {
      filtered = filtered.filter((b) => b.ticketType === selectedTicketType);
    }

    // Status filter
    if (selectedStatus !== "all") {
      filtered = filtered.filter((b) => b.status === selectedStatus);
    }

    // Source filter (Online/Manual)
    if (selectedSource !== "all") {
      if (selectedSource === "online") {
        filtered = filtered.filter((b) => b.paymentId);
      } else if (selectedSource === "manual") {
        filtered = filtered.filter((b) => !b.paymentId);
      }
    }

    // Country filter
    if (selectedCountry !== "all") {
      filtered = filtered.filter((b) => b.country === selectedCountry);
    }

    // State filter
    if (selectedState !== "all") {
      filtered = filtered.filter((b) => b.state === selectedState);
    }

    // Visitor type filter
    if (selectedVisitorType !== "all") {
      filtered = filtered.filter((b) => b.visitorType === selectedVisitorType);
    }

    // Date range filter
    if (startDate) {
      filtered = filtered.filter((b) => {
        if (!b.bookedAt) return false;
        const bookingDate = new Date(b.bookedAt);
        return bookingDate >= new Date(startDate);
      });
    }

    if (endDate) {
      filtered = filtered.filter((b) => {
        if (!b.bookedAt) return false;
        const bookingDate = new Date(b.bookedAt);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return bookingDate <= end;
      });
    }

    return filtered;
  }, [bookings, search, selectedEvent, selectedTicketType, selectedStatus, selectedSource, selectedCountry, selectedState, selectedVisitorType, startDate, endDate]);

  const handleExport = () => {
    const rows = visible.map((b) => ({
      BookingID: b._id,
      Event: b.event?.title || b.eventSnapshot?.title || "",
      TicketType: b.ticketType || "",
      Quantity: b.quantity,
      Total: b.total,
      Status: b.status,
      Source: b.paymentId ? 'Online' : 'Manual',
      Country: b.country || '',
      State: b.state || '',
      'Mode of Payment': b.paymentId ? 'Online' : (b.modeOfPayment || 'Manual'),
      'Visitor Type': b.visitorType || '',
      Customer: b.user?.name || "",
      Email: b.user?.email || "",
      Phone: b.user?.phone || "",
      BookedAt: b.bookedAt ? format(new Date(b.bookedAt), "yyyy-MM-dd HH:mm") : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HMF Tickets");
    XLSX.writeFile(wb, `hmf_tickets_${Date.now()}.xlsx`);
  };

  const clearAllFilters = () => {
    setSearch("");
    setSelectedEvent("all");
    setSelectedTicketType("all");
    setSelectedStatus("all");
    setSelectedSource("all");
    setSelectedCountry("all");
    setSelectedState("all");
    setSelectedVisitorType("all");
    setStartDate("");
    setEndDate("");
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search) count++;
    if (selectedEvent !== "all") count++;
    if (selectedTicketType !== "all") count++;
    if (selectedStatus !== "all") count++;
    if (selectedSource !== "all") count++;
    if (selectedCountry !== "all") count++;
    if (selectedState !== "all") count++;
    if (selectedVisitorType !== "all") count++;
    if (startDate) count++;
    if (endDate) count++;
    return count;
  }, [search, selectedEvent, selectedTicketType, selectedStatus, selectedSource, selectedCountry, selectedState, selectedVisitorType, startDate, endDate]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>HMF Tickets</CardTitle>
          <CardDescription>Filtered bookings for selected HMF events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and Action Bar */}
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search by event, name, email, phone"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="whitespace-nowrap"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFiltersCount}
                  </Badge>
                )}
                {showFilters ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </Button>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X className="h-4 w-4 mr-2" /> Clear
                </Button>
              )}
              <Button variant="outline" onClick={handleExport} disabled={visible.length === 0}>
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Event Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Event</label>
                      <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Events" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Events</SelectItem>
                          {uniqueEvents.map((event) => (
                            <SelectItem key={event} value={event}>
                              {event}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Ticket Type Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ticket Type</label>
                      <Select value={selectedTicketType} onValueChange={setSelectedTicketType}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          {uniqueTicketTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          {uniqueStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Source Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Source</label>
                      <Select value={selectedSource} onValueChange={setSelectedSource}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Sources" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sources</SelectItem>
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Country Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Country</label>
                      <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Countries" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Countries</SelectItem>
                          {uniqueCountries.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* State Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">State</label>
                      <Select value={selectedState} onValueChange={setSelectedState}>
                        <SelectTrigger>
                          <SelectValue placeholder="All States" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All States</SelectItem>
                          {uniqueStates.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Start Date Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Date</label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>

                    {/* End Date Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">End Date</label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>

                    {/* Visitor Type Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Visitor Type</label>
                      <Select value={selectedVisitorType} onValueChange={setSelectedVisitorType}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Visitor Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Visitor Types</SelectItem>
                          {uniqueVisitorTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results Summary */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Showing <strong>{visible.length}</strong> of <strong>{bookings.length}</strong> bookings
              </span>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-gray-600">Loading...</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Ticket Type</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Mode of Payment</TableHead>
                    <TableHead>Visitor Type</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Booked At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((b) => (
                    <TableRow key={b._id}>
                      <TableCell>{b.event?.title || b.eventSnapshot?.title}</TableCell>
                      <TableCell>{b.ticketType || "-"}</TableCell>
                      <TableCell>{b.quantity}</TableCell>
                      <TableCell>₹{b.total}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{b.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={b.paymentId ? 'secondary' : 'outline'}>{b.paymentId ? 'Online' : 'Manual'}</Badge>
                      </TableCell>
                      <TableCell>{b.country || '-'}</TableCell>
                      <TableCell>{b.state || '-'}</TableCell>
                      <TableCell>
                        {b.paymentId ? (
                          <Badge variant="secondary">Online</Badge>
                        ) : (
                          b.modeOfPayment ? (
                            <Badge variant="outline">{b.modeOfPayment}</Badge>
                          ) : (
                            <Badge variant="outline">Manual</Badge>
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        {b.visitorType ? (
                          <Badge variant="outline">{b.visitorType}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{b.user?.name || "-"}</span>
                          <span className="text-xs text-gray-500">{b.user?.email || ""}</span>
                          <span className="text-xs text-gray-500">{b.user?.phone || ""}</span>
                        </div>
                      </TableCell>
                      <TableCell>{b.bookedAt ? format(new Date(b.bookedAt), "dd MMM yyyy, HH:mm") : "-"}</TableCell>
                    </TableRow>
                  ))}
                  {visible.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center text-sm text-gray-500">
                        {bookings.length === 0 ? "No bookings found for HMF events." : "No bookings match the selected filters."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
