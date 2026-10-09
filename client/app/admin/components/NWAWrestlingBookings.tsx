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
import { Eye, Download, Search, X, Video, Users, Calendar, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";

const EVENT_IMAGES: Record<string, string> = {
  "1st NWA Provisional Championship & 1st NWA Under 15 Championship cum 1st Wrestling Festival":
    "https://res.cloudinary.com/dovc3lfgz/image/upload/v1771518218/ahibi/ttof83dmfocmdqovcb3v.jpg",
  "30th Naga Traditional Wrestling Championship cum 1st Wrestling Festival":
    "https://res.cloudinary.com/dovc3lfgz/image/upload/v1771517850/ahibi/xy6prc6usk8fxgocy4ay.jpg",
};

interface LivestreamBooking {
  _id: string;
  user: {
    name: string;
    email: string;
    phone: string;
  };
  livestream: {
    title: string;
    thumbnailUrl?: string;
    posterUrl?: string;
    price: number;
  };
  amount: number;
  status: string;
  paymentDate: string;
  accessGranted: boolean;
  paymentId?: string;
  orderId?: string;
  transactionId?: string;
}

export default function NWAWrestlingBookings() {
  const [bookings, setBookings] = useState<LivestreamBooking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<LivestreamBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [selectedBooking, setSelectedBooking] = useState<LivestreamBooking | null>(null);
  const { toast } = useToast();

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch("/api/livestream/purchase/admin/bookings", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch bookings");
      }

      const data = await response.json();
      if (data.success) {
        setBookings(data.data);
        setFilteredBookings(data.data);
      } else {
        throw new Error(data.message || "Failed to fetch bookings");
      }
    } catch (error: any) {
      console.error("Error fetching bookings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Filter bookings
  useEffect(() => {
    let filtered = bookings;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (booking) =>
          booking.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          booking.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          booking.livestream.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          booking.paymentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          booking.orderId?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((booking) => booking.status === statusFilter);
    }

    // Date filter
    if (dateFilter) {
      const filterDate = format(dateFilter, "yyyy-MM-dd");
      filtered = filtered.filter((booking) => {
        const bookingDate = format(new Date(booking.paymentDate), "yyyy-MM-dd");
        return bookingDate === filterDate;
      });
    }

    setFilteredBookings(filtered);
  }, [bookings, searchQuery, statusFilter, dateFilter]);

  // Export to Excel
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filteredBookings.map((booking) => ({
        "Customer Name": booking.user.name,
        "Email": booking.user.email,
        "Phone": booking.user.phone,
        "Livestream Title": booking.livestream.title,
        "Amount": `₹${booking.amount}`,
        "Status": booking.status,
        "Payment Date": format(new Date(booking.paymentDate), "dd MMM yyyy, hh:mm a"),
        "Access Granted": booking.accessGranted ? "Yes" : "No",
        "Payment ID": booking.paymentId || "N/A",
        "Order ID": booking.orderId || "N/A",
        "Transaction ID": booking.transactionId || "N/A",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "NWA Wrestling Bookings");
    XLSX.writeFile(wb, `nwa-wrestling-bookings-${format(new Date(), "dd-MM-yyyy")}.xlsx`);
  };

  // Calculate stats
  const totalRevenue = filteredBookings.reduce((sum, booking) => sum + booking.amount, 0);
  const totalBookings = filteredBookings.length;
  const completedBookings = filteredBookings.filter((b) => b.status === "completed").length;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">NWA Wrestling Championships</h1>
          <p className="text-gray-600 mt-1">Manage livestream bookings for wrestling events</p>
        </div>
        <Button onClick={exportToExcel} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{totalBookings}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{completedBookings}</p>
              </div>
              <Video className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Search by name, email, title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateFilter ? format(dateFilter, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={dateFilter}
                    onSelect={setDateFilter}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setDateFilter(undefined);
                }}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bookings ({filteredBookings.length})</CardTitle>
          <CardDescription>
            List of all NWA Wrestling Championship livestream bookings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Video className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your filters or check back later.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Livestream</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => (
                    <TableRow key={booking._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                            <img
                              src={
                                EVENT_IMAGES[booking.livestream.title] ||
                                booking.livestream.thumbnailUrl ||
                                booking.livestream.posterUrl ||
                                "/placeholder.jpg"
                              }
                              alt={booking.livestream.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="font-medium">{booking.livestream.title}</div>
                            <div className="text-sm text-gray-500">
                              {booking.accessGranted ? "Access Granted" : "Access Pending"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{booking.user.name}</div>
                          <div className="text-sm text-gray-500">{booking.user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{booking.user.phone}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">₹{booking.amount}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            booking.status === "completed"
                              ? "default"
                              : booking.status === "pending"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(booking.paymentDate), "dd MMM yyyy")}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(booking.paymentDate), "hh:mm a")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-mono max-w-32 truncate">
                          {booking.paymentId || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBooking(booking)}
                        >
                          <Eye className="h-4 w-4" />
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

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">Booking Details</CardTitle>
                  <CardDescription>View complete booking information</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedBooking(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Livestream Info */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Livestream Information</h3>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={
                        EVENT_IMAGES[selectedBooking.livestream.title] ||
                        selectedBooking.livestream.thumbnailUrl ||
                        selectedBooking.livestream.posterUrl ||
                        "/placeholder.jpg"
                      }
                      alt={selectedBooking.livestream.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{selectedBooking.livestream.title}</h4>
                    <p className="text-sm text-gray-600">Price: ₹{selectedBooking.livestream.price}</p>
                    <Badge
                      variant={selectedBooking.accessGranted ? "default" : "secondary"}
                      className="mt-2"
                    >
                      {selectedBooking.accessGranted ? "Access Granted" : "Access Pending"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Name</Label>
                    <p className="font-medium">{selectedBooking.user.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Email</Label>
                    <p className="font-medium">{selectedBooking.user.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Phone</Label>
                    <p className="font-medium">{selectedBooking.user.phone}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Status</Label>
                    <Badge
                      variant={
                        selectedBooking.status === "completed"
                          ? "default"
                          : selectedBooking.status === "pending"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {selectedBooking.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Payment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Amount Paid</Label>
                    <p className="font-medium text-lg">₹{selectedBooking.amount}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Payment Date</Label>
                    <p className="font-medium">
                      {format(new Date(selectedBooking.paymentDate), "dd MMM yyyy, hh:mm a")}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Payment ID</Label>
                    <p className="font-mono text-sm">{selectedBooking.paymentId || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Order ID</Label>
                    <p className="font-mono text-sm">{selectedBooking.orderId || "N/A"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
