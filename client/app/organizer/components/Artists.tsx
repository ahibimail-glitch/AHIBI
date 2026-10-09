"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Music,
  Search,
  MessageSquare,
  Calendar,
  Loader2,
  Star,
  MapPin,
  IndianRupee,
  ArrowRight,
} from "lucide-react";

interface Artist {
  _id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  type: string;
  profilePic?: string;
  rating: {
    average: number;
    count: number;
  };
  totalBookings: number;
  basePrice?: number;
  genres?: string[];
}

interface LatestBooking {
  _id: string;
  artist: {
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
  };
  hasDiscussion: boolean;
  unreadCount: number;
  lastMessage: {
    message: string;
    timestamp: string;
  } | null;
}

export default function Artists() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"list" | "bookings">("bookings");
  const [artists, setArtists] = useState<Artist[]>([]);
  const [latestBookings, setLatestBookings] = useState<LatestBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredArtists, setFilteredArtists] = useState<Artist[]>([]);

  useEffect(() => {
    if (activeTab === "list") {
      fetchArtists();
    } else {
      fetchLatestBookings();
    }
  }, [activeTab]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = artists.filter(
        (artist) =>
          artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          artist.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          artist.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredArtists(filtered);
    } else {
      setFilteredArtists(artists);
    }
  }, [searchQuery, artists]);

  const fetchArtists = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("organizer_token");
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organizer/artists/list`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setArtists(response.data.data.artists);
        setFilteredArtists(response.data.data.artists);
      }
    } catch (error) {
      console.error("Error fetching artists:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestBookings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("organizer_token");
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organizer/bookings/latest?limit=10`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setLatestBookings(response.data.data.bookings);
      }
    } catch (error) {
      console.error("Error fetching latest bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const openChat = (bookingId: string) => {
    router.push(`/organizer/chat/${bookingId}`);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Artists</h2>
          <p className="text-muted-foreground">Manage artist bookings and communications</p>
        </div>
        <div className="flex gap-2">
          <Link href="/allArtists/list">
          <Button
           
           >
            <Music className="h-4 w-4 mr-2" />
            All Artists
          </Button>
          </Link>
          <Button
            variant={activeTab === "bookings" ? "default" : "outline"}
            onClick={() => setActiveTab("bookings")}
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
            <CardDescription>Recent booking requests and discussions</CardDescription>
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
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                            {booking.artist.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{booking.artist.name}</h4>
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
                              {booking.event.name}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(booking.event.date)}
                              </span>
                              <span className="flex items-center gap-1">
                                <IndianRupee className="h-3 w-3" />
                                {booking.booking.requestedAmount.toLocaleString()}
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
                        <div className="flex flex-col items-end gap-2">
                          {booking.unreadCount > 0 && (
                            <Badge variant="destructive" className="ml-auto">
                              {booking.unreadCount} new
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            onClick={() => openChat(booking._id)}
                            className="flex items-center gap-2"
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
