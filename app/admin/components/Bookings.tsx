"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Download, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import * as XLSX from 'xlsx';

interface Booking {
  _id: string;
  eventTitle?: string;
  event: {
    title: string;
    startDate: string;
    endDate: string;
  };
  eventSnapshot?: {
    title?: string;
    startDate?: string;
    endDate?: string;
  };
  user: {
    name: string;
    email: string;
    phone?: string;
  };
  bookedAt: string;
  quantity: number;
  total: number;
  status: string;
  ticketType?: string;
}

interface BookingsProps {
  bookings?: Booking[];
}

export default function Bookings({ bookings: propBookings }: BookingsProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [nameFilter, setNameFilter] = useState<string>("");
  const [phoneFilter, setPhoneFilter] = useState<string>("");
  const [ticketTypeFilter, setTicketTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  
  // Unique lists for filters
  const [uniqueEvents, setUniqueEvents] = useState<string[]>([]);
  const [uniqueTicketTypes, setUniqueTicketTypes] = useState<string[]>([]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("admin_token");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        
        const response = await fetch(`${apiUrl}/api/admin/bookings/all`, {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : "",
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          credentials: 'include',
          mode: 'cors'
        });
        
        
        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('Access Denied: You do not have permission to view this page.');
          }
          throw new Error('Failed to fetch bookings');
        }

        const data = await response.json();
        console.log(data.bookings);
        setBookings(data.bookings);
        setFilteredBookings(data.bookings);
        
        // Extract unique events and categories for filters with proper typing
        const events: string[] = Array.from(
          new Set(
            data.bookings
              .map((booking: Booking) => booking.eventTitle || booking.event?.title || booking.eventSnapshot?.title)
              .filter((title: string | undefined): title is string => Boolean(title))
          )
        );
        setUniqueEvents(events);
        
        const ticketTypes: string[] = Array.from(
          new Set(
            data.bookings
              .map((booking: Booking) => booking.ticketType)
              .filter((type: string | undefined): type is string => Boolean(type))
          )
        );
        setUniqueTicketTypes(ticketTypes);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load bookings';
        console.error('Error fetching bookings:', errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, []);
  
  // Apply filters whenever filter values change
  useEffect(() => {
    applyFilters();
  }, [eventFilter, nameFilter, phoneFilter, ticketTypeFilter, dateFilter, bookings]);
  
  // Filter function
  const applyFilters = () => {
    let result = [...bookings];
    
    if (eventFilter && eventFilter !== "all") {
      result = result.filter((booking: Booking) => (booking.eventTitle || booking.event?.title || booking.eventSnapshot?.title) === eventFilter);
    }
    
    if (nameFilter) {
      result = result.filter((booking: Booking) => 
        booking.user?.name?.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }

    if (phoneFilter) {
      result = result.filter((booking: Booking) =>
        booking.user?.phone?.includes(phoneFilter)
      );
    }
    
    if (ticketTypeFilter && ticketTypeFilter !== "all") {
      result = result.filter((booking: Booking) => booking.ticketType === ticketTypeFilter);
    }
    
    if (dateFilter) {
      result = result.filter((booking: Booking) => {
        const bookedDate = new Date(booking.bookedAt).toDateString();
        const filterDate = dateFilter.toDateString();
        return bookedDate === filterDate;
      });
    }
    
    setFilteredBookings(result);
  };
  
  // Reset all filters
  const resetFilters = () => {
    setEventFilter("all");
    setNameFilter("");
    setPhoneFilter("");
    setTicketTypeFilter("all");
    setDateFilter(undefined);
  };
  
  // Export to Excel function
  const exportToExcel = () => {
    // Prepare data for Excel export
    const headers = ["Event", "Customer", "Email", "Phone", "Booked Date", "Ticket Type", "Quantity", "Total Amount"];
    
    const data = [
      headers,
      ...filteredBookings.map((booking: Booking) => [
        booking.eventTitle || booking.event?.title || booking.eventSnapshot?.title || "NA",
        booking.user?.name || "NA",
        booking.user?.email || "NA",
        booking.user?.phone || "NA",
        new Date(booking.bookedAt).toLocaleDateString(),
        booking.ticketType || "NA",
        booking.quantity,   
        `₹${booking.total}`
      ])
    ];
    
    // Create a worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    const wscols = [
      { wch: 25 }, // Event
      { wch: 20 }, // Customer
      { wch: 25 }, // Email
      { wch: 15 }, // Phone
      { wch: 15 }, // Booked Date
      { wch: 15 }, // Ticket Type
      { wch: 10 }, // Quantity
      { wch: 15 }, // Total Amount
    ];
    ws['!cols'] = wscols;
    
    // Create a workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bookings");
    
    // Generate file name with current date
    const fileName = `bookings-export-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Export to Excel file
    XLSX.writeFile(wb, fileName);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-red-600 mb-2">Error loading bookings</h3>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  if (!bookings.length) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-gray-600 mb-2">No bookings found</h3>
        <p className="text-gray-500">There are no bookings to display.</p>
      </div>
    );
  }

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Bookings</CardTitle>
          <CardDescription>Total: {filteredBookings.length} bookings</CardDescription>
        </div>
        <Button onClick={exportToExcel} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export to Excel
        </Button>
      </CardHeader>
      <CardContent>
        {/* Filter section */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <Label htmlFor="event-filter">Event</Label>
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger id="event-filter">
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
          
          <div>
            <Label htmlFor="name-filter">Customer Name</Label>
            <div className="relative">
              <Input
                id="name-filter"
                placeholder="Search by name"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="pr-8"
              />
              {nameFilter && (
                <button 
                  onClick={() => setNameFilter("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="phone-filter">Phone Number</Label>
            <div className="relative">
              <Input
                id="phone-filter"
                placeholder="Search by phone"
                value={phoneFilter}
                onChange={(e) => setPhoneFilter(e.target.value)}
                className="pr-8"
              />
              {phoneFilter && (
                <button
                  onClick={() => setPhoneFilter("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              )}
            </div>
          </div>
          
          <div>
            <Label htmlFor="ticket-type-filter">Ticket Type</Label>
            <Select value={ticketTypeFilter} onValueChange={setTicketTypeFilter}>
              <SelectTrigger id="ticket-type-filter">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTicketTypes.map((ticketType) => (
                  <SelectItem key={ticketType} value={ticketType}>
                    {ticketType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="date-filter">Booking Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  id="date-filter"
                >
                  {dateFilter ? (
                    format(dateFilter, "PPP")
                  ) : (
                    <span className="text-muted-foreground">Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        {/* Active filters display */}
        {(eventFilter !== "all" || nameFilter || phoneFilter || ticketTypeFilter !== "all" || dateFilter) && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-500">Active filters:</span>
            <div className="flex flex-wrap gap-2">
              {eventFilter !== "all" && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Event: {eventFilter}
                  <button onClick={() => setEventFilter("all")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {nameFilter && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Name: {nameFilter}
                  <button onClick={() => setNameFilter("")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {phoneFilter && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Phone: {phoneFilter}
                  <button onClick={() => setPhoneFilter("")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {ticketTypeFilter !== "all" && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Ticket Type: {ticketTypeFilter}
                  <button onClick={() => setTicketTypeFilter("all")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {dateFilter && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Date: {format(dateFilter, "PP")}
                  <button onClick={() => setDateFilter(undefined)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-6 px-2">
                Clear all
              </Button>
            </div>
          </div>
        )}
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Booked Date</TableHead>
              <TableHead>Ticket Type</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Total Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookings.map((booking: Booking) => (
              <TableRow key={booking._id}>
                <TableCell>{booking.eventTitle || booking.event?.title || booking.eventSnapshot?.title || "NA"}</TableCell>
                <TableCell>
                  <div>{booking.user?.name || "NA"}</div>
                  <div className="text-xs text-gray-500">{booking.user?.email || "NA"}</div>
                </TableCell>
                <TableCell>{booking.user?.phone || "NA"}</TableCell>
                <TableCell>{new Date(booking.bookedAt).toLocaleDateString()}</TableCell>
                <TableCell>{booking.ticketType || "NA"}</TableCell>
                <TableCell>{booking.quantity}</TableCell>
                <TableCell>₹{booking.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {filteredBookings.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No bookings match your filters.</p>
            <Button variant="outline" onClick={resetFilters} className="mt-2">
              Clear all filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
