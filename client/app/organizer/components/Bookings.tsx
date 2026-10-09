"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import {
  Calendar,
  Ticket,
  DollarSign,
  Search,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  X,
} from "lucide-react";

interface Booking {
  _id: string;
  event: {
    _id: string;
    title: string;
    banner?: string;
    startDate: string;
  };
  user?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  quantity: number;
  price: number;
  total: number;
  status: string;
  paymentStatus: string;
  ticketType: string;
  bookedAt: string;
  checkedInAt?: string;
}

export default function Bookings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDailyEvents, setShowDailyEvents] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [ticketTypeFilter, setTicketTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);

  const uniqueEvents = useMemo(
    () => Array.from(new Set(bookings.map((b) => b.event.title).filter(Boolean))),
    [bookings]
  );

  const uniqueTicketTypes = useMemo(
    () => Array.from(new Set(bookings.map((b) => b.ticketType).filter(Boolean))),
    [bookings]
  );

  const activeFilterCount = [
    statusFilter !== "all",
    eventFilter !== "all",
    ticketTypeFilter !== "all",
    !!dateFilter,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setStatusFilter("all");
    setEventFilter("all");
    setTicketTypeFilter("all");
    setDateFilter(undefined);
  };

  // Fetch bookings data
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem('organizer_token');
        if (!token) {
          setError('No authentication token found');
          setLoading(false);
          return;
        }

        const endpoint = showDailyEvents 
          ? '/api/bookings/organizer-daily-bookings'
          : '/api/bookings/organizer-bookings';

        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch bookings');
        }

        const data = await response.json();
        setBookings(data.bookings || []);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [showDailyEvents]);

  const filteredBookings = bookings.filter((booking) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      (booking.user?.name ?? "").toLowerCase().includes(query) ||
      (booking.user?.email ?? "").toLowerCase().includes(query) ||
      booking.event.title.toLowerCase().includes(query);

    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    const matchesEvent = eventFilter === "all" || booking.event.title === eventFilter;
    const matchesTicketType =
      ticketTypeFilter === "all" || booking.ticketType === ticketTypeFilter;
    const matchesDate =
      !dateFilter ||
      new Date(booking.bookedAt).toDateString() === dateFilter.toDateString();

    return matchesSearch && matchesStatus && matchesEvent && matchesTicketType && matchesDate;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      case "checked-in":
        return <Badge className="bg-blue-100 text-blue-800">Checked In</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Calendar className="h-4 w-4 text-yellow-600" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "checked-in":
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-400" />;
    }
  };

  // Calculate stats
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => b.status === "confirmed").length;
  const pendingBookings = bookings.filter(b => b.status === "pending").length;
  const totalRevenue = bookings.reduce((sum, b) => sum + b.total, 0);

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Export to CSV
  const handleExport = () => {
    const csvHeaders = ['Customer Name', 'Email', 'Phone', 'Event', 'Ticket Type', 'Quantity', 'Total Amount', 'Status', 'Booked Date', 'Event Date'];
    const csvRows = filteredBookings.map(booking => [
      booking.user?.name ?? "",
      booking.user?.email ?? "",
      booking.user?.phone ?? "",
      booking.event.title,
      booking.ticketType,
      booking.quantity,
      booking.total,
      booking.status,
      formatDate(booking.bookedAt),
      formatDate(booking.event.startDate)
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bookings-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Event Bookings</h2>
            <p className="text-gray-600">Manage and track all bookings for your events</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-pink-600" />
            <p className="text-gray-600">Loading bookings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Event Bookings</h2>
            <p className="text-gray-600">Manage and track all bookings for your events</p>
          </div>
        </div>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
              <p className="text-red-800 font-medium">Error loading bookings</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {showDailyEvents ? "Daily Event Bookings" : "Event Bookings"}
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Manage and track all bookings for your {showDailyEvents ? "daily events" : "events"}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant={showDailyEvents ? "default" : "outline"}
            onClick={() => {
              setShowDailyEvents(!showDailyEvents);
              setLoading(true);
              resetFilters();
            }}
            className={showDailyEvents ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 w-full sm:w-auto" : "w-full sm:w-auto"}
          >
            <Calendar className="h-4 w-4 mr-2" />
            {showDailyEvents ? "Show Regular Events" : "Show Daily Events"}
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button className="bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 transition-opacity w-full sm:w-auto relative">
                <Filter className="h-4 w-4 mr-2" />
                Filter
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white text-pink-600 text-xs font-semibold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Filter Bookings</h4>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 px-2 text-xs">
                      Clear all
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status-filter">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="checked-in">Checked In</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event-filter">Event</Label>
                  <Select value={eventFilter} onValueChange={setEventFilter}>
                    <SelectTrigger id="event-filter">
                      <SelectValue placeholder="All events" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All events</SelectItem>
                      {uniqueEvents.map((event) => (
                        <SelectItem key={event} value={event}>
                          {event}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ticket-type-filter">Ticket Type</Label>
                  <Select value={ticketTypeFilter} onValueChange={setTicketTypeFilter}>
                    <SelectTrigger id="ticket-type-filter">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {uniqueTicketTypes.map((ticketType) => (
                        <SelectItem key={ticketType} value={ticketType}>
                          {ticketType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Booking Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {dateFilter ? (
                          format(dateFilter, "PPP")
                        ) : (
                          <span className="text-muted-foreground">Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={dateFilter}
                        onSelect={setDateFilter}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90"
                  onClick={() => setFilterOpen(false)}
                >
                  Apply Filters
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Search */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search bookings by customer name, email, or event..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500">Active filters:</span>
              {statusFilter !== "all" && (
                <Badge variant="outline" className="flex items-center gap-1 capitalize">
                  Status: {statusFilter}
                  <button type="button" onClick={() => setStatusFilter("all")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {eventFilter !== "all" && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Event: {eventFilter}
                  <button type="button" onClick={() => setEventFilter("all")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {ticketTypeFilter !== "all" && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Ticket: {ticketTypeFilter}
                  <button type="button" onClick={() => setTicketTypeFilter("all")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {dateFilter && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Date: {format(dateFilter, "PPP")}
                  <button type="button" onClick={() => setDateFilter(undefined)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 px-2 text-xs">
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Ticket className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Bookings</p>
                <p className="text-2xl font-bold">{totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Confirmed</p>
                <p className="text-2xl font-bold">{confirmedBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold">{pendingBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Total Revenue</p>
                <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings Table */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>
            {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Ticket Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dates</TableHead>
               
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow key={booking._id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{booking.user?.name}</div>
                      <div className="text-sm text-gray-500">{booking.user?.email}</div>
                      <div className="text-sm text-gray-500">{booking.user?.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{booking.event.title}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-gray-700">
                      {booking.ticketType}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Ticket className="h-4 w-4 text-gray-400" />
                      <span>{booking.quantity}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      
                      <span className="font-medium">₹{booking.total.toLocaleString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(booking.status)}
                      {getStatusBadge(booking.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>Booked: {formatDate(booking.bookedAt)}</div>
                      <div className="text-gray-500">Event: {formatDate(booking.event.startDate)}</div>
                    </div>
                  </TableCell>
                 
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
