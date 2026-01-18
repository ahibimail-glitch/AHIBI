"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, MapPin, IndianRupee, Filter, Loader2, XCircle, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getApiUrl } from "@/config";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";

interface Booking {
  _id: string;
  bookingDate: Date;
  startTime: string;
  endTime: string;
  duration: number;
  numberOfPlayers: number;
  status: string;
  pricing: {
    totalAmount: number;
  };
  venue: {
    _id: string;
    venueName: string;
    address: {
      city: string;
      state: string;
    };
    gallery?: {
      images?: Array<{ url: string }>;
    };
  };
  court: {
    _id: string;
    courtName: string;
    sportType: string;
  };
  createdAt: Date;
}

export default function MyBookingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed" | "cancelled">("all");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth?redirect=/sports/my-bookings");
      return;
    }

    if (user) {
      fetchBookings();
    }
  }, [user, authLoading, router]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError("");
      
      const response = await fetch(getApiUrl("/sports/my-bookings"), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setBookings(data.data.bookings || []);
      } else {
        setError(data.message || "Failed to load bookings");
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredBookings = () => {
    const now = new Date();
    
    switch (filter) {
      case "upcoming":
        return bookings.filter(
          (b) => new Date(b.bookingDate) >= now && (b.status === "confirmed" || b.status === "checked_in")
        );
      case "completed":
        return bookings.filter((b) => b.status === "completed");
      case "cancelled":
        return bookings.filter((b) => b.status === "cancelled");
      default:
        return bookings;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "completed":
        return "bg-blue-100 text-blue-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      case "checked_in":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getSportIcon = (sportType: string) => {
    const icons: any = {
      cricket: "🏏",
      football: "⚽",
      basketball: "🏀",
      badminton: "🏸",
      tennis: "🎾",
      volleyball: "🏐",
      table_tennis: "🏓",
      swimming: "🏊",
      gym: "💪",
      yoga: "🧘",
      squash: "🎾",
      boxing: "🥊",
      martial_arts: "🥋",
      athletics: "🏃",
      hockey: "🏑",
      kabaddi: "🤼",
      archery: "🏹",
      shooting: "🎯",
      golf: "⛳",
    };
    return icons[sportType] || "🏟️";
  };

  const filteredBookings = getFilteredBookings();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">My Bookings</h1>
          <p className="text-gray-600">View and manage your court bookings</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-800">Filter Bookings</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {["all", "upcoming", "completed", "cancelled"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === f
                    ? "bg-orange-500 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Bookings Found</h3>
            <p className="text-gray-600 mb-6">
              {filter === "all"
                ? "You haven't made any bookings yet."
                : `No ${filter} bookings found.`}
            </p>
            <button
              onClick={() => router.push("/sports")}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Browse Venues
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBookings.map((booking) => (
              <div
                key={booking._id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
                onClick={() => router.push(`/sports/bookings/${booking._id}`)}
              >
                {/* Venue Image */}
                <div className="h-48 bg-gradient-to-br from-orange-400 to-orange-600 relative overflow-hidden">
                  {booking.venue.gallery?.images?.[0]?.url ? (
                    <img
                      src={booking.venue.gallery.images[0].url}
                      alt={booking.venue.venueName}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-6xl">{getSportIcon(booking.court.sportType)}</div>
                    </div>
                  )}
                  <div className="absolute top-4 right-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        booking.status
                      )}`}
                    >
                      {booking.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-1 group-hover:text-orange-600 transition-colors">
                    {booking.venue.venueName}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {booking.court.courtName} • {booking.court.sportType.toUpperCase()}
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      <span>
                        {new Date(booking.bookingDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span>
                        {booking.startTime} - {booking.endTime}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <MapPin className="w-4 h-4 text-orange-500" />
                      <span>
                        {booking.venue.address.city}, {booking.venue.address.state}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <IndianRupee className="w-4 h-4 text-orange-500" />
                      <span className="font-semibold">₹{booking.pricing.totalAmount}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Booked on {new Date(booking.createdAt).toLocaleDateString()}
                    </span>
                    <ChevronRight className="w-5 h-5 text-orange-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        {bookings.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Booking Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-800">{bookings.length}</p>
                <p className="text-sm text-gray-600">Total Bookings</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {bookings.filter((b) => b.status === "confirmed" || b.status === "checked_in").length}
                </p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {bookings.filter((b) => b.status === "completed").length}
                </p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">
                  ₹{bookings.reduce((sum, b) => sum + b.pricing.totalAmount, 0)}
                </p>
                <p className="text-sm text-gray-600">Total Spent</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
