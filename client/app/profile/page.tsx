"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  CreditCard,
  Heart,
  Ticket,
  Settings,
  Camera,
  Edit,
  Save,
  Eye,
  EyeOff,
  Download,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  LogOut,
  Bell,
  Lock,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "../Navbar";
import Footer from "../Footer";
import { getApiUrl } from "@/config";

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  bio: string;
  interests: string[];
  [key: string]: any;
}

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const router = useRouter();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = React.useRef<HTMLInputElement | null>(null);

  interface Booking {
    _id: string;
    event: {
      _id: string;
      title: string;
      banner: string;
    };
    ticketType: string;
    quantity: number;
    price: number;
    total: number;
    status: string;
    paymentStatus: string;
    bookedAt: string;
    bookingType: string;
  }

  interface SportsBooking {
    _id: string;
    bookingDate: string;
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
    createdAt: string;
  }

  interface LivestreamPurchase {
    _id: string;
    livestream: {
      _id: string;
      title: string;
      thumbnailUrl?: string;
      posterUrl?: string;
    };
    amount: number;
    status: string;
    paymentDate: string;
    accessGranted: boolean;
    paymentId?: string;
    orderId?: string;
  }

  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [sportsBookings, setSportsBookings] = useState<SportsBooking[]>([]);
  const [livestreamPurchases, setLivestreamPurchases] = useState<LivestreamPurchase[]>([]);
  const [bookingType, setBookingType] = useState<'events' | 'sports' | 'livestream'>('events');

  // Fetch user profile from backend
  React.useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.message || "Failed to fetch profile");
        } else {
          setProfileData(data.data.user);
          console.log(data.data.user);
        }
      } catch (e) {
        setError("Network error. Please try again.");
      }
      setLoading(false);
    };

    const fetchUserBookings = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bookings/my-bookings`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || "Failed to fetch bookings");
        } else {
          console.log(data.bookings[0]);
          const filteredBookings = (data.bookings || []).filter((booking: Booking) =>
            booking.paymentStatus === 'completed' ||
            booking.paymentStatus === 'paid' ||
            (booking.bookingType === 'annie-musical' && booking.paymentStatus === 'pending')
          );
          setUserBookings(filteredBookings);
        }
      } catch (e) {
        setError("Network error. Please try again.");
      }
    };

    const fetchSportsBookings = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(getApiUrl("/sports/my-bookings"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (data.success) {
          setSportsBookings(data.data.bookings || []);
        } else {
          console.error("Failed to fetch sports bookings:", data.message);
        }
      } catch (err) {
        console.error("Error fetching sports bookings:", err);
      }
    };

    const fetchLivestreamPurchases = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(getApiUrl("/livestream/purchase/history"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (data.success) {
          setLivestreamPurchases(data.data || []);
        } else {
          console.error("Failed to fetch livestream purchases:", data.message);
        }
      } catch (err) {
        console.error("Error fetching livestream purchases:", err);
      }
    };

    fetchProfile();
    fetchUserBookings();
    fetchSportsBookings();
    fetchLivestreamPurchases();
  }, []);

  const handleSaveProfile = () => {
    setIsEditing(false);
  };

  const handleSelectAvatar = () => {
    if (uploadingAvatar) return;
    setAvatarError(null);
    avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('Image must be smaller than 5MB');
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      setUploadingAvatar(true);

      const formData = new FormData();
      formData.append('photo', file);

      const uploadRes = await fetch(getApiUrl('upload'), {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json().catch((): null => null);

      const uploadedUrl = uploadData?.data?.photo?.url;
      if (!uploadRes.ok || uploadData?.status !== 'success' || typeof uploadedUrl !== 'string') {
        throw new Error(uploadData?.message || 'Failed to upload image');
      }

      const updateRes = await fetch(getApiUrl('auth/update-profile'), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profilePic: uploadedUrl }),
      });

      const updateData = await updateRes.json().catch((): null => null);
      if (!updateRes.ok || !updateData?.success) {
        throw new Error(updateData?.message || 'Failed to update profile');
      }

      if (updateData?.data?.user) {
        setProfileData(updateData.data.user);
      }
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Failed to upload profile picture');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const handleViewTicket = (booking: any) => {
    if (booking.bookingType === 'annie-musical') {
      router.push(`/annie-musical/bookings/${booking._id}`);
    } else {
      router.push(`/events/${booking._id}/bookings`);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "paid":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "paid":
        return "bg-green-50 text-green-700 border-green-200";
      case "pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      default:
        return "bg-red-50 text-red-700 border-red-200";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 text-lg">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4 bg-black text-white hover:bg-gray-800">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-gray-600 text-lg">No profile data found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Profile Section - Black Background */}
      <div className="bg-white text-gray-900">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8">

              {/* Avatar */}
              <div className="relative group mx-auto md:mx-0">

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />

                <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-gray-200 shadow-sm">
                  <AvatarImage
                    src={profileData.profilePic || profileData.avatar || "/images/profile.png"}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-3xl font-bold bg-gray-100 text-gray-900 ">
                    {profileData.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>

                <Button
                  size="sm"
                  type="button"
                  disabled={uploadingAvatar}
                  onClick={handleSelectAvatar}
                  className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full p-0 bg-gray-900 text-white hover:bg-gray-800 shadow"
                >
                  <Camera className="h-4 w-4" />
                </Button>

                {avatarError ? (
                  <div className="mt-3 text-center text-sm text-red-600">{avatarError}</div>
                ) : null}
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div className="text-center sm:text-left">

                    <h1 className="text-3xl md:text-4xl font-bold mb-2">
                      {profileData.name}
                    </h1>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Verified</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span>{profileData.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* <Button
                    onClick={() => setIsEditing(!isEditing)}
                    className="mt-4 sm:mt-0 bg-gray-900 text-white hover:bg-gray-800"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {isEditing ? "Cancel" : "Edit Profile"}
                  </Button> */}
                </div>

                {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-200">
                  <div>
                    <div className="text-3xl font-bold">
                      {userBookings.length + sportsBookings.length + livestreamPurchases.length}
                    </div>
                    <div className="text-sm text-gray-500">Total Bookings</div>
                  </div>

                  <div>
                    <div className="text-3xl font-bold">
                      {userBookings.filter(
                        b =>
                          b.paymentStatus === "completed" ||
                          b.paymentStatus === "paid"
                      ).length +
                        sportsBookings.filter(b => b.status === "completed").length +
                        livestreamPurchases.filter(p => p.status === "completed").length}
                    </div>
                    <div className="text-sm text-gray-500">Completed</div>
                  </div>

                  <div>
                    <div className="text-3xl font-bold">
                      ₹
                      {(
                        userBookings.reduce(
                          (sum, booking) => sum + booking.total,
                          0
                        ) +
                        sportsBookings.reduce(
                          (sum, booking) => sum + booking.pricing.totalAmount,
                          0
                        ) +
                        livestreamPurchases.reduce(
                          (sum, purchase) => sum + purchase.amount,
                          0
                        )
                      ).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Total Spent</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

               
               
      </div>


      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Tabs */}
        <div className="mb-8">
          <Tabs defaultValue="bookings" className="space-y-8">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <TabsList className="h-auto p-0 bg-transparent grid w-full grid-cols-2 gap-4">
                <TabsTrigger
                  value="bookings"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-black rounded-none pb-4 font-semibold"
                >
                  <Ticket className="h-5 w-5 mr-2" />
                  My Bookings
                </TabsTrigger>
                <TabsTrigger
                  value="personal"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-black rounded-none pb-4 font-semibold"
                >
                  <User className="h-5 w-5 mr-2" />
                  Personal Info
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Bookings Tab */}
            <TabsContent value="bookings" className="space-y-6">
              {/* Booking Type Toggle */}
              <div className="grid grid-cols-3 gap-3 border-b border-gray-200 pb-4">
                <button
                  onClick={() => setBookingType('events')}
                  className={`px-4 py-3 font-semibold transition-all rounded-lg text-sm ${bookingType === 'events'
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  Events ({userBookings.length})
                </button>
                <button
                  onClick={() => setBookingType('sports')}
                  className={`px-4 py-3 font-semibold transition-all rounded-lg text-sm ${bookingType === 'sports'
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  Sports ({sportsBookings.length})
                </button>
                <button
                  onClick={() => setBookingType('livestream')}
                  className={`px-4 py-3 font-semibold transition-all rounded-lg text-sm ${bookingType === 'livestream'
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  Livestream ({livestreamPurchases.length})
                </button>
              </div>

              {/* Event Bookings */}
              {bookingType === 'events' && (
                <div className="space-y-4">
                  {userBookings && userBookings.length > 0 ? (
                    userBookings.map((booking) => (
                      <div
                        key={booking._id}
                        className="border border-gray-200 rounded-lg p-6 hover:border-black transition-all hover:shadow-md"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="relative w-24 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                              <Image
                                src={booking.event?.banner || "/placeholder.jpg"}
                                alt={booking.event?.title || "Event"}
                                fill
                                className="object-cover"
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg mb-2 line-clamp-1">
                                {booking.event?.title || "Event"}
                              </h3>

                              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(booking.bookedAt).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Ticket className="h-4 w-4" />
                                  {booking.quantity} ticket{booking.quantity > 1 ? 's' : ''}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge
                                  className={`${getStatusColor(booking.paymentStatus)} border font-medium`}
                                >
                                  {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                                </Badge>
                                {booking.bookingType === 'annie-musical' && booking.paymentStatus === 'pending' && (
                                  <Badge className="bg-blue-50 text-blue-700 border border-blue-200">
                                    Payment Processing
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:text-right">
                            <div className="text-2xl font-bold">₹{booking.total.toLocaleString()}</div>
                            {(booking.bookingType === 'annie-musical' && booking.paymentStatus === 'completed') ||
                              (booking.bookingType !== 'ahibi-fest' && booking.paymentStatus === 'completed') ? (
                              <Button
                                onClick={() => handleViewTicket(booking)}
                                className="bg-black text-white hover:bg-gray-800"
                              >
                                View Ticket
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16 border border-gray-200 rounded-lg">
                      <Ticket className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No event bookings found</h3>
                      <p className="text-gray-500 mb-6">Start exploring amazing events</p>
                      <Button asChild className="bg-black text-white hover:bg-gray-800">
                        <Link href="/events">Explore Events</Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Sports Bookings */}
              {bookingType === 'sports' && (
                <div className="space-y-4">
                  {sportsBookings && sportsBookings.length > 0 ? (
                    sportsBookings.map((booking) => (
                      <div
                        key={booking._id}
                        className="border border-gray-200 rounded-lg p-6 hover:border-black transition-all hover:shadow-md"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-black flex items-center justify-center text-white text-3xl">
                              {booking.court.sportType === 'cricket' ? '🏏' :
                                booking.court.sportType === 'football' ? '⚽' :
                                  booking.court.sportType === 'basketball' ? '🏀' :
                                    booking.court.sportType === 'badminton' ? '🏸' :
                                      booking.court.sportType === 'tennis' ? '🎾' :
                                        booking.court.sportType === 'volleyball' ? '🏐' :
                                          booking.court.sportType === 'table_tennis' ? '🏓' :
                                            booking.court.sportType === 'swimming' ? '🏊' :
                                              booking.court.sportType === 'gym' ? '💪' :
                                                booking.court.sportType === 'yoga' ? '🧘' : '🏟️'}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg mb-1">
                                {booking.venue.venueName}
                              </h3>
                              <p className="text-sm text-gray-600 mb-3">
                                {booking.court.courtName} • {booking.court.sportType.toUpperCase()}
                              </p>

                              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(booking.bookingDate).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {booking.startTime} - {booking.endTime}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {booking.venue.address.city}
                                </div>
                              </div>

                              <Badge className={`${getStatusColor(booking.status)} border font-medium`}>
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:text-right">
                            <div className="text-2xl font-bold">₹{booking.pricing.totalAmount.toLocaleString()}</div>
                            <Button
                              onClick={() => router.push(`/sports/bookings/${booking._id}`)}
                              className="bg-black text-white hover:bg-gray-800"
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16 border border-gray-200 rounded-lg">
                      <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No sports bookings found</h3>
                      <p className="text-gray-500 mb-6">Book your favorite sports venue</p>
                      <Button asChild className="bg-black text-white hover:bg-gray-800">
                        <Link href="/sports">Browse Venues</Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Livestream Purchases */}
              {bookingType === 'livestream' && (
                <div className="space-y-4">
                  {livestreamPurchases && livestreamPurchases.length > 0 ? (
                    livestreamPurchases.map((purchase) => (
                      <div
                        key={purchase._id}
                        className="border border-gray-200 rounded-lg p-6 hover:border-black transition-all hover:shadow-md"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="relative w-24 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                              <Image
                                src={purchase.livestream?.thumbnailUrl || purchase.livestream?.posterUrl || "/placeholder.jpg"}
                                alt={purchase.livestream?.title || "Livestream"}
                                fill
                                className="object-cover"
                              />
                              {purchase.accessGranted && (
                                <div className="absolute top-2 right-2">
                                  <CheckCircle className="h-4 w-4 text-green-500 bg-white rounded-full p-0.5" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg mb-2 line-clamp-1">
                                {purchase.livestream?.title || "Livestream"}
                              </h3>

                              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(purchase.paymentDate).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </div>
                                <div className="flex items-center gap-1">
                                  <CreditCard className="h-4 w-4" />
                                  {purchase.paymentId ? `ID: ${purchase.paymentId.slice(-8)}` : 'Payment Complete'}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge
                                  className={`${getStatusColor(purchase.status)} border font-medium`}
                                >
                                  {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                                </Badge>
                                {purchase.accessGranted && (
                                  <Badge className="bg-green-50 text-green-700 border border-green-200">
                                    Access Granted
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:text-right">
                            <div className="text-2xl font-bold">₹{purchase.amount.toLocaleString()}</div>
                            <Button
                              onClick={() => router.push(`/livestream/${purchase.livestream._id}`)}
                              className="bg-black text-white hover:bg-gray-800"
                            >
                              {purchase.accessGranted ? 'Watch Now' : 'View Details'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16 border border-gray-200 rounded-lg">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold mb-2">No livestream purchases found</h3>
                      <p className="text-gray-500 mb-6">Purchase access to exclusive livestream events</p>
                      <Button asChild className="bg-black text-white hover:bg-gray-800">
                        <Link href="/livestream">Browse Livestreams</Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Personal Info Tab */}
            <TabsContent value="personal" className="space-y-6">
              <div className="border border-gray-200 rounded-lg">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold">Personal Information</h2>
                  <p className="text-gray-600 mt-1">Manage your account details</p>
                </div>

                <div className="p-6 space-y-8">
                  {/* Contact Information */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold border-b border-gray-200 pb-2">Contact Details</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="font-medium">Full Name</Label>
                        <Input
                          id="name"
                          value={profileData.name}
                          onChange={(e) =>
                            setProfileData({ ...profileData, name: e.target.value })
                          }
                          disabled={!isEditing}
                          className="border-gray-300 focus:border-black focus:ring-black"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="font-medium">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={(e) =>
                            setProfileData({ ...profileData, email: e.target.value })
                          }
                          disabled={!isEditing}
                          className="border-gray-300 focus:border-black focus:ring-black"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="font-medium">Phone Number</Label>
                        <div className="relative">
                          <Input
                            id="phone"
                            type={showPhone ? "text" : "password"}
                            value={profileData.phone}
                            onChange={(e) =>
                              setProfileData({ ...profileData, phone: e.target.value })
                            }
                            disabled={!isEditing}
                            className="border-gray-300 focus:border-black focus:ring-black pr-12"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPhone(!showPhone)}
                          >
                            {showPhone ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="city" className="font-medium">City</Label>
                        <Input
                          id="city"
                          value={profileData.city || ""}
                          onChange={(e) =>
                            setProfileData({ ...profileData, city: e.target.value })
                          }
                          disabled={!isEditing}
                          placeholder="Enter your city"
                          className="border-gray-300 focus:border-black focus:ring-black"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bio Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b border-gray-200 pb-2">About</h3>
                    <div className="space-y-2">
                      <Label htmlFor="bio" className="font-medium">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profileData.bio || ""}
                        onChange={(e) =>
                          setProfileData({ ...profileData, bio: e.target.value })
                        }
                        disabled={!isEditing}
                        rows={4}
                        placeholder="Tell us about yourself..."
                        className="border-gray-300 focus:border-black focus:ring-black resize-none"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {isEditing && (
                    <div className="flex gap-3 pt-6 border-t border-gray-200">
                      <Button
                        onClick={handleSaveProfile}
                        className="bg-black text-white hover:bg-gray-800"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        className="border-gray-300"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Footer />
    </div>
  );
}