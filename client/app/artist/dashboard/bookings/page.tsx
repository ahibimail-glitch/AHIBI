"use client";

import { useState, useEffect } from "react";
import { useDashboard } from "../layout";
import { BookingRequest } from "../types";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, CheckCircle2, MessageSquare } from "lucide-react";

export default function BookingsPage() {
  const { profile } = useDashboard();
  const router = useRouter();
  const [pendingBookings, setPendingBookings] = useState<BookingRequest[]>([]);
  const [acceptedBookings, setAcceptedBookings] = useState<BookingRequest[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  const [bookingDetailsOpen, setBookingDetailsOpen] = useState(false);
  const [loadingBookingDetails, setLoadingBookingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    fetchAllBookings();
  }, []);

  const formatDateDDMMYY = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };

  const fetchAllBookings = async () => {
    try {
      setLoadingBookings(true);
      const token = localStorage.getItem("artist_token");
      
      const pendingResponse = await fetch("/api/artist/bookings?status=pending", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const acceptedResponse = await fetch("/api/artist/bookings?status=accepted", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json();
        setPendingBookings(pendingData.data.bookings || []);
      }
      
      if (acceptedResponse.ok) {
        const acceptedData = await acceptedResponse.json();
        setAcceptedBookings(acceptedData.data.bookings || []);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchBookingDetails = async (bookingId: string) => {
    try {
      setLoadingBookingDetails(true);
      const token = localStorage.getItem("artist_token");
      const response = await fetch(`/api/artist/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) return;

      const data = await response.json();
      const booking = data?.data?.booking;
      if (booking) {
        setSelectedBooking(booking);
        setBookingDetailsOpen(true);
      }
    } catch (e) {
      console.error("Error fetching booking details:", e);
    } finally {
      setLoadingBookingDetails(false);
    }
  };

  const handleBookingAction = async (bookingId: string, action: "accept" | "decline", counterOffer?: { amount: number; message: string }) => {
    try {
      const token = localStorage.getItem("artist_token");
      let endpoint = `/api/artist/bookings/${bookingId}/${action}`;
      let body = {};

      if (action === "decline") {
        const reason = prompt("Please provide a reason for declining:");
        if (!reason) return;
        body = { reason };
      } else if (counterOffer) {
        endpoint = `/api/artist/bookings/${bookingId}/counter-offer`;
        body = counterOffer;
      }

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        fetchAllBookings();
        if (action === "accept" && !counterOffer) {
          setActiveTab("accepted");
        }
      }
    } catch (error) {
      console.error(`Error ${action}ing booking:`, error);
    }
  };

  const renderPendingBooking = (request: BookingRequest) => (
    <div key={request._id} className="p-4 border rounded-lg">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold">{request.event?.name || "Unknown Event"}</h3>
        <Badge variant="outline">Rs.{request.booking.requestedAmount}</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-1">
        by {request.organizer?.name || "Unknown Organizer"}
      </p>
      <p className="text-sm text-muted-foreground mb-1">
        <Calendar className="h-4 w-4 inline mr-1" />
        {request.event?.date ? formatDateDDMMYY(request.event.date) : "Date not specified"}
        {request.event?.startTime && request.event?.endTime ? ` • ${request.event.startTime} - ${request.event.endTime}` : ""}
      </p>
      <p className="text-sm text-muted-foreground mb-3">
        <MapPin className="h-4 w-4 inline mr-1" />
        {request.event.venue?.name || "Unknown Venue"}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => fetchBookingDetails(request._id)}
          disabled={loadingBookingDetails}
        >
          View Details
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push(`/artist/chat/${request._id}`)}
          className="flex items-center gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          Chat
        </Button>
        <Button
          size="sm"
          className="flex-1 min-w-[120px]"
          onClick={() => handleBookingAction(request._id, "accept")}
        >
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 min-w-[140px] bg-transparent"
          onClick={() => {
            const amount = prompt("Enter counter offer amount:");
            const message = prompt("Add a message (optional):");
            if (amount) {
              handleBookingAction(request._id, "accept", {
                amount: parseInt(amount),
                message: message || ""
              });
            }
          }}
        >
          Counter Offer
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleBookingAction(request._id, "decline")}
        >
          Decline
        </Button>
      </div>
    </div>
  );

  const renderAcceptedBooking = (request: BookingRequest) => (
    <div key={request._id} className="p-4 border rounded-lg bg-green-50/50 border-green-200">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{request.event?.name || "Unknown Event"}</h3>
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Accepted
          </Badge>
        </div>
        <Badge variant="outline" className="border-green-300">Rs.{request.booking.requestedAmount}</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-1">
        by {request.organizer?.name || "Unknown Organizer"}
      </p>
      <p className="text-sm text-muted-foreground mb-1">
        <Calendar className="h-4 w-4 inline mr-1" />
        {request.event?.date ? formatDateDDMMYY(request.event.date) : "Date not specified"}
        {request.event?.startTime && request.event?.endTime ? ` • ${request.event.startTime} - ${request.event.endTime}` : ""}
      </p>
      <p className="text-sm text-muted-foreground mb-3">
        <MapPin className="h-4 w-4 inline mr-1" />
        {request.event.venue?.name || "Unknown Venue"}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => fetchBookingDetails(request._id)}
          disabled={loadingBookingDetails}
          className="border-green-300 hover:bg-green-100"
        >
          View Details
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push(`/artist/chat/${request._id}`)}
          className="flex items-center gap-2 border-green-300 hover:bg-green-100"
        >
          <MessageSquare className="h-4 w-4" />
          Chat
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">
            Pending ({pendingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Accepted ({acceptedBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking Requests</CardTitle>
              <CardDescription>New requests waiting for your response</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingBookings ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading bookings...
                </div>
              ) : pendingBookings.length > 0 ? (
                pendingBookings.map(renderPendingBooking)
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No pending booking requests
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accepted" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Accepted Bookings</CardTitle>
              <CardDescription>Confirmed events you are performing at</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingBookings ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading bookings...
                </div>
              ) : acceptedBookings.length > 0 ? (
                acceptedBookings.map(renderAcceptedBooking)
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No accepted bookings yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={bookingDetailsOpen} onOpenChange={setBookingDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>Organizer and event information</DialogDescription>
          </DialogHeader>
          {selectedBooking ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Event</div>
                <div className="font-medium">{selectedBooking.event?.name || "Unknown Event"}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedBooking.event?.date ? formatDateDDMMYY(selectedBooking.event.date) : "Date not specified"}
                  {selectedBooking.event?.startTime && selectedBooking.event?.endTime
                    ? ` • ${selectedBooking.event.startTime} - ${selectedBooking.event.endTime}`
                    : ""}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedBooking.event?.venue?.name || "Unknown Venue"}
                  {selectedBooking.event?.venue?.address && (
                    <span className="block text-xs mt-1">{selectedBooking.event.venue.address}</span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Organizer</div>
                <div className="font-medium">{selectedBooking.organizer?.name}</div>
                <div className="text-sm text-muted-foreground">{selectedBooking.organizer?.email}</div>
                {selectedBooking.organizer?.phone && (
                  <div className="text-sm text-muted-foreground">{selectedBooking.organizer.phone}</div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-sm">
                  Offered: <span className="font-medium">Rs.{selectedBooking.booking?.requestedAmount}</span>
                </div>
                <Badge variant={selectedBooking.booking?.status === "accepted" ? "default" : "outline"}>
                  {selectedBooking.booking?.status}
                </Badge>
              </div>

              {selectedBooking.createdAt && (
                <div className="text-xs text-muted-foreground">
                  Requested on: {formatDateDDMMYY(selectedBooking.createdAt)}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No details available.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
