"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Eye, Download, Search, X, Music, Users, Calendar, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";

interface AnnieBooking {
  _id: string;
  user: {
    name: string;
    email: string;
    phone: string;
  };
  seats: Array<{
    id: string;
    price: number;
    category?: string;
  }>;
  totalAmount: number;
  paymentStatus: string;
  paymentId?: string;
  transactionId?: string;
  bookedAt: string;
  status: string;
}

export default function AnnieMusicalBookings() {
  const [bookings, setBookings] = useState<AnnieBooking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<AnnieBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Filter states
  const [nameFilter, setNameFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [seatFilter, setSeatFilter] = useState<string>("");

  // Stats
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    totalSeats: 0,
  });

  const fetchAnnieBookings = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("admin_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const response = await fetch(`${apiUrl}/api/annie-musical/admin/bookings`, {
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
          throw new Error('Access Denied: You do not have permission to view Annie Musical bookings.');
        }
        throw new Error('Failed to fetch Annie Musical bookings');
      }

      const data = await response.json();
      setBookings(data.bookings || []);
      setFilteredBookings(data.bookings || []);

      // Calculate stats
      const totalBookings = data.bookings?.length || 0;
      const totalRevenue = data.bookings?.reduce((sum: number, booking: AnnieBooking) => sum + booking.totalAmount, 0) || 0;
      const totalSeats = data.bookings?.reduce((sum: number, booking: AnnieBooking) => sum + booking.seats.length, 0) || 0;

      setStats({
        totalBookings,
        totalRevenue,
        totalSeats,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load Annie Musical bookings';
      console.error('Error fetching Annie Musical bookings:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnieBookings();
  }, [fetchAnnieBookings]);

  // Apply filters whenever filter values change
  useEffect(() => {
    applyFilters();
  }, [nameFilter, statusFilter, dateFilter, seatFilter, bookings]);

  // Filter function
  const applyFilters = () => {
    let result = [...bookings];

    if (nameFilter) {
      result = result.filter((booking: AnnieBooking) => 
        booking.user?.name?.toLowerCase().includes(nameFilter.toLowerCase()) ||
        booking.user?.email?.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }

    if (statusFilter && statusFilter !== "all") {
      result = result.filter((booking: AnnieBooking) => booking.paymentStatus === statusFilter);
    }

    if (seatFilter) {
      result = result.filter((booking: AnnieBooking) => 
        booking.seats.some(seat => seat.id.toLowerCase().includes(seatFilter.toLowerCase()))
      );
    }

    if (dateFilter) {
      result = result.filter((booking: AnnieBooking) => {
        const bookedDate = new Date(booking.bookedAt).toDateString();
        const filterDate = dateFilter.toDateString();
        return bookedDate === filterDate;
      });
    }

    setFilteredBookings(result);
  };

  // Reset all filters
  const resetFilters = () => {
    setNameFilter("");
    setStatusFilter("all");
    setSeatFilter("");
    setDateFilter(undefined);
  };

  // Export to Excel function
  const exportToExcel = () => {
    const headers = ["Customer Name", "Email", "Phone", "Seats", "Total Amount", "Payment Status", "Transaction ID", "Booked Date"];

    const data = [
      headers,
      ...filteredBookings.map((booking: AnnieBooking) => [
        booking.user?.name || "NA",
        booking.user?.email || "NA",
        booking.user?.phone || "NA",
        booking.seats.map(seat => seat.id).join(", "),
        `₹${booking.totalAmount}`,
        booking.paymentStatus,
        booking.transactionId || "NA",
        new Date(booking.bookedAt).toLocaleDateString()
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);

    const wscols = [
      { wch: 20 }, // Customer Name
      { wch: 25 }, // Email
      { wch: 15 }, // Phone
      { wch: 30 }, // Seats
      { wch: 15 }, // Total Amount
      { wch: 15 }, // Payment Status
      { wch: 20 }, // Transaction ID
      { wch: 15 }, // Booked Date
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Annie Musical Bookings");

    const fileName = `annie-musical-bookings-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      default:
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
    }
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
        <h3 className="text-lg font-medium text-red-600 mb-2">Error loading Annie Musical bookings</h3>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Total Bookings</p>
                <p className="text-3xl font-bold">{stats.totalBookings}</p>
              </div>
              <Music className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Total Revenue</p>
                <p className="text-3xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Seats Booked</p>
                <p className="text-3xl font-bold">{stats.totalSeats}</p>
              </div>
              <Users className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Bookings Table */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Annie Musical Confirmed Bookings
            </CardTitle>
            <CardDescription>Total: {filteredBookings.length} confirmed bookings</CardDescription>
          </div>
          <Button onClick={exportToExcel} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export to Excel
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filter section */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="name-filter">Customer</Label>
              <div className="relative">
                <Input
                  id="name-filter"
                  placeholder="Search by name or email"
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
              <Label htmlFor="status-filter">Payment Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Confirmed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="seat-filter">Seat ID</Label>
              <div className="relative">
                <Input
                  id="seat-filter"
                  placeholder="Search by seat ID"
                  value={seatFilter}
                  onChange={(e) => setSeatFilter(e.target.value)}
                  className="pr-8"
                />
                {seatFilter && (
                  <button 
                    onClick={() => setSeatFilter("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                )}
              </div>
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
                  <CalendarComponent
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
          {(nameFilter || statusFilter !== "all" || seatFilter || dateFilter) && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-500">Active filters:</span>
              <div className="flex flex-wrap gap-2">
                {nameFilter && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    Customer: {nameFilter}
                    <button onClick={() => setNameFilter("")}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {statusFilter !== "all" && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    Status: {statusFilter}
                    <button onClick={() => setStatusFilter("all")}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {seatFilter && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    Seat: {seatFilter}
                    <button onClick={() => setSeatFilter("")}>
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
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Booked Date</TableHead>
                <TableHead>Transaction ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking: AnnieBooking) => (
                <TableRow key={booking._id}>
                  <TableCell className="font-medium">{booking.user?.name || "NA"}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{booking.user?.email || "NA"}</div>
                      <div className="text-gray-500">{booking.user?.phone || "NA"}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {booking.seats.map((seat, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {seat.id}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {booking.seats.length} seat{booking.seats.length > 1 ? 's' : ''}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">₹{booking.totalAmount.toLocaleString()}</TableCell>
                  <TableCell>{getStatusBadge(booking.paymentStatus)}</TableCell>
                  <TableCell>{new Date(booking.bookedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">
                      {booking.transactionId ? booking.transactionId.slice(-8) : "NA"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredBookings.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No confirmed Annie Musical bookings match your filters.</p>
              <Button variant="outline" onClick={resetFilters} className="mt-2">
                Clear all filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
