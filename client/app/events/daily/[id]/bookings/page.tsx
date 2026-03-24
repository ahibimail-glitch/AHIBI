"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Calendar, Clock, MapPin, Download, Ticket } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";

interface Booking {
  _id: string;
  dailyEvent: {
    _id: string;
    title: string;
    banner: string;
    location: {
      address: string;
      city: string;
    };
    startTime: string;
    duration: {
      hours: number;
      minutes: number;
    };
    ticketTypes?: Array<{
      _id: string;
      name: string;
      price: number;
    }>;
  };
  selectedDate: string;
  ticketType: string | {
    _id?: string;
    name: string;
    price: number;
  };
  quantity: number;
  total: number;
  bookingId: string;
  qrCode: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

export default function DailyEventBookingsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Please login to view bookings");
          router.push(`/auth?redirect=/events/daily/${eventId}/bookings`);
          return;
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/bookings/daily-event/${eventId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch bookings");
        }

        const data = await response.json();
        setBookings(data.data.bookings || []);
      } catch (err: any) {
        console.error("Error fetching bookings:", err);
        setError(err.message || "Failed to load bookings");
        toast.error("Failed to load bookings");
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [eventId, router]);

  const handleDownloadTicket = async (bookingId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bookings/${bookingId}/ticket`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to download ticket");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ticket-${bookingId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Ticket downloaded successfully");
    } catch (err: any) {
      console.error("Error downloading ticket:", err);
      toast.error("Failed to download ticket");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      confirmed: { label: "Confirmed", className: "bg-green-100 text-green-800" },
      pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
      cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800" },
      completed: { label: "Completed", className: "bg-blue-100 text-blue-800" },
    };

    const config = variants[status] || variants.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      paid: { label: "Paid", className: "bg-green-100 text-green-800" },
      pending: { label: "Payment Pending", className: "bg-yellow-100 text-yellow-800" },
      failed: { label: "Payment Failed", className: "bg-red-100 text-red-800" },
      free: { label: "Free", className: "bg-blue-100 text-blue-800" },
    };

    const config = variants[status] || variants.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getTicketTypeName = (booking: Booking): string => {
    // If ticketType is an object with a name, return it
    if (typeof booking.ticketType === 'object' && booking.ticketType?.name) {
      return booking.ticketType.name;
    }
    
    // If ticketType is a string (ID), look it up in the event's ticketTypes
    if (typeof booking.ticketType === 'string' && booking.dailyEvent?.ticketTypes) {
      const ticketTypeObj = booking.dailyEvent.ticketTypes.find(
        tt => tt._id === booking.ticketType || tt.name === booking.ticketType
      );
      if (ticketTypeObj) {
        return ticketTypeObj.name;
      }
    }
    
    // Fallback: if it's a string and looks like a ticket name (not an ID), return it
    if (typeof booking.ticketType === 'string') {
      // Check if it looks like a MongoDB ObjectId (24 hex characters)
      if (booking.ticketType.length === 24 && /^[0-9a-fA-F]{24}$/.test(booking.ticketType)) {
        return "Ticket"; // It's an ID we couldn't resolve
      }
      return booking.ticketType; // It's already a name
    }
    
    return "Ticket";
  };

  if (loading || !bookings) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => router.push(`/events/daily/${eventId}`)}>
              Back to Event
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => router.push(`/events/daily/${eventId}`)}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Event
          </Button>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Bookings</h1>
            <p className="text-gray-600">View and manage your daily event bookings</p>
          </div>

          {bookings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
                <p className="text-gray-600 mb-6">You haven't booked any tickets for this event yet</p>
                <Button onClick={() => router.push(`/events/daily/${eventId}/checkout`)}>
                  Book Tickets
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <Card key={booking._id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">
                          {booking.dailyEvent.title}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                          {getStatusBadge(booking.status)}
                          {getPaymentStatusBadge(booking.paymentStatus)}
                        </div>
                      </div>
                      {booking.dailyEvent.banner && (
                        <img
                          src={booking.dailyEvent.banner}
                          alt={booking.dailyEvent.title}
                          className="w-20 h-20 object-cover rounded-lg ml-4"
                        />
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-2">
                        <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Event Date</p>
                          <p className="text-sm text-gray-600">
                            {booking.selectedDate 
                              ? format(new Date(booking.selectedDate), "EEEE, MMMM dd, yyyy")
                              : "Date TBA"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Time</p>
                          <p className="text-sm text-gray-600">
                            {booking.dailyEvent?.startTime || "Time TBA"} 
                            {booking.dailyEvent?.duration && (
                              <> ({booking.dailyEvent.duration.hours || 0}h{" "}
                              {booking.dailyEvent.duration.minutes || 0}m)</>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Venue</p>
                          <p className="text-sm text-gray-600">
                            {booking.dailyEvent?.location?.address || "Venue TBA"}
                          </p>
                          {booking.dailyEvent?.location?.city && (
                            <p className="text-xs text-gray-500">
                              {booking.dailyEvent.location.city}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Ticket className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Ticket Details</p>
                          <p className="text-sm text-gray-600">
                            {getTicketTypeName(booking)} x {booking.quantity || 1}
                          </p>
                          <p className="text-xs text-gray-500">₹{(booking.total || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900">Booking ID</p>
                        <p className="text-sm font-mono text-gray-600">{booking.bookingId}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">Booked On</p>
                        <p className="text-sm text-gray-600">
                          {booking.createdAt 
                            ? format(new Date(booking.createdAt), "MMM dd, yyyy 'at' h:mm a")
                            : "N/A"}
                        </p>
                      </div>
                    </div>

                    {booking.qrCode && (
                      <div className="flex justify-center p-4 bg-white border border-gray-200 rounded-lg">
                        <img
                          src={booking.qrCode}
                          alt="QR Code"
                          className="w-48 h-48"
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleDownloadTicket(booking._id)}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Ticket
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
