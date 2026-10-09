"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  MessageSquare,
  Calendar,
  Loader2,
  Star,
  MapPin,
  IndianRupee,
  ArrowRight,
} from "lucide-react";

interface Organizer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  city: string;
  profilePic?: string;
}

interface LatestBooking {
  _id: string;
  organizer?: {
    _id: string;
    name: string;
    companyName?: string;
    profilePic?: string;
  };
  customer?: {
    _id: string;
    name: string;
    profilePic?: string;
  };
  event: {
    name: string;
    date: string;
    venue: {
      name: string;
    };
  };
  booking: {
    status: string;
    requestedAmount: number;
    finalAmount?: number;
  };
  hasDiscussion: boolean;
  unreadCount: number;
  lastMessage: {
    message: string;
    timestamp: string;
  } | null;
}

export default function OrganizerPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"list" | "bookings">("bookings");
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [latestBookings, setLatestBookings] = useState<LatestBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === "list") {
      fetchOrganizers();
    } else {
      fetchLatestBookings();
    }
  }, [activeTab]);

  const fetchOrganizers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("artist_token");
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/artist/bookings`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        // Extract unique organizers from bookings
        const bookings = response.data.data.bookings || [];
        const uniqueOrganizers = new Map();
        
        bookings.forEach((booking: any) => {
          const requester = booking.organizer || booking.customer;
          if (requester && !uniqueOrganizers.has(requester._id)) {
            uniqueOrganizers.set(requester._id, requester);
          }
        });

        setOrganizers(Array.from(uniqueOrganizers.values()));
      }
    } catch (error) {
      console.error("Error fetching organizers:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestBookings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("artist_token");
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/artist/bookings?limit=10`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        const bookings = response.data.data.bookings || [];
        
        // Add discussion status
        const bookingsWithStatus = bookings.map((booking: any) => {
          const hasDiscussion = booking.communication?.messages?.length > 0;
          const unreadCount = booking.communication?.messages?.filter(
            (msg: any) => msg.sender === 'organizer' && !msg.isRead
          ).length || 0;

          return {
            ...booking,
            hasDiscussion,
            unreadCount,
            lastMessage: booking.communication?.messages?.length > 0
              ? booking.communication.messages[booking.communication.messages.length - 1]
              : null
          };
        });

        setLatestBookings(bookingsWithStatus);
      }
    } catch (error) {
      console.error("Error fetching latest bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const openChat = (bookingId: string) => {
    router.push(`/artist/chat/${bookingId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Organizers</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Manage organizer communications and bookings</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === "bookings" ? "default" : "outline"}
            onClick={() => setActiveTab("bookings")}
            className="w-full sm:w-auto"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Latest Bookings
          </Button>
        </div>
      </div>

    

      {activeTab === "bookings" && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Bookings</CardTitle>
            <CardDescription>Recent booking requests and discussions with organizers</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : latestBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent bookings
              </div>
            ) : (
              <div className="space-y-4">
                {latestBookings.map((booking) => (
                  <Card key={booking._id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                            {(booking.organizer?.name || booking.customer?.name || "C").charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold">{booking.organizer?.name || booking.customer?.name || "Customer"}</h4>
                              {booking.organizer?.companyName && (
                                <span className="text-sm text-muted-foreground">
                                  ({booking.organizer.companyName})
                                </span>
                              )}
                              <Badge
                                variant={
                                  booking.booking.status === "accepted" ||
                                  booking.booking.status === "confirmed"
                                    ? "default"
                                    : booking.booking.status === "pending"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {booking.booking.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {booking.event?.name || "Unknown Event"}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {booking.event?.date ? formatDate(booking.event.date) : "Date not set"}
                              </span>
                              <span className="flex items-center gap-1">
                                <IndianRupee className="h-3 w-3" />
                                {booking.booking?.finalAmount
                                  ? booking.booking.finalAmount.toLocaleString()
                                  : booking.booking?.requestedAmount?.toLocaleString() || "N/A"}
                              </span>
                            </div>
                            {booking.hasDiscussion && booking.lastMessage && (
                              <div className="mt-2 p-2 bg-muted rounded text-sm">
                                <p className="text-muted-foreground text-xs mb-1">
                                  Last message:
                                </p>
                                <p className="line-clamp-1">{booking.lastMessage.message}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                          {booking.unreadCount > 0 && (
                            <Badge variant="destructive" className="sm:ml-auto w-fit">
                              {booking.unreadCount} new
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            onClick={() => openChat(booking._id)}
                            className="flex items-center justify-center gap-2 w-full sm:w-auto"
                          >
                            <MessageSquare className="h-4 w-4" />
                            {booking.hasDiscussion ? "Continue Chat" : "Start Chat"}
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
