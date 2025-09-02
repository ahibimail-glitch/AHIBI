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
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "../Navbar";
import Footer from "../Footer";

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

  const [userBookings, setUserBookings] = useState<Booking[]>([]);

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
          // Filter out pending bookings - only show completed/paid bookings
          const completedBookings = (data.bookings || []).filter((booking: Booking) => 
            booking.paymentStatus === 'completed' || booking.paymentStatus === 'paid'
          );
          setUserBookings(completedBookings);
        }
      } catch (e) {
        setError("Network error. Please try again.");
      }
      setLoading(false);
    };

    fetchProfile();
    fetchUserBookings();
  }, []);

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    eventRecommendations: true,
    promotionalEmails: false,
    weeklyDigest: true,
  });

  const [privacy, setPrivacy] = useState({
    profileVisibility: "public",
    showAttendedEvents: true,
    showInterests: true,
    allowMessages: true,
  });

  const savedEvents = [
    {
      id: 1,
      title: "Jazz Night Under Stars",
      date: "July 22, 2024",
      price: "₹800",
      image: "/images/carausel1.jpg?height=100&width=150",
    },
    {
      id: 2,
      title: "Food & Wine Festival",
      date: "August 5, 2024",
      price: "₹1,200",
      image: "/images/carausel1.jpg?height=100&width=150",
    },
    {
      id: 3,
      title: "Art Exhibition Opening",
      date: "August 10, 2024",
      price: "₹500",
      image: "/images/carausel1.jpg?height=100&width=150",
    },
  ];

  const handleSaveProfile = () => {
    setIsEditing(false);
  };

  const handleInterestToggle = (interest: string) => {
    setProfileData((prevProfile) => {
      if (!prevProfile) return null;

      const newInterests = prevProfile.interests.includes(interest)
        ? prevProfile.interests.filter((i) => i !== interest)
        : [...prevProfile.interests, interest];

      return { ...prevProfile, interests: newInterests };
    });
  };

  const handleViewTicket = (booking: any) => {
    if (booking.bookingType === 'annie-musical') {
      // For Annie Musical bookings, redirect to booking detail page
      router.push(`/annie-musical/bookings/${booking._id}`);
    } else {
      // For regular event bookings, use the existing route
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

  const availableInterests = [
    "Music",
    "Comedy",
    "Technology",
    "Food",
    "Art",
    "Dance",
    "Sports",
    "Theater",
    "Literature",
    "Photography",
    "Travel",
    "Fashion",
    "Gaming",
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
          <Navbar />
        </header>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
          <Navbar />
        </header>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 text-lg">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
          <Navbar />
        </header>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-gray-600 text-lg">No profile data found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50 shadow-sm">
        <Navbar />
      </header>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Enhanced Profile Header */}
        <Card className="mb-8 shadow-lg border-0 bg-gradient-to-r from-white via-white to-blue-50/30">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-6 lg:space-y-0 lg:space-x-8">
              {/* Avatar Section */}
              <div className="relative group">
                <div className="relative">
                  <Avatar className="w-28 h-28 lg:w-32 lg:h-32 border-4 border-white shadow-xl ring-4 ring-blue-50">
                    <AvatarImage
                      src={profileData.avatar || "/images/profile.png"}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {profileData.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute -bottom-1 -right-1 h-10 w-10 rounded-full p-0 shadow-lg border-2 border-white hover:scale-105 transition-transform"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 w-full lg:w-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                      {profileData.name}
                    </h1>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                      Verified Member
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="self-start sm:self-auto bg-white hover:bg-gray-50 border-gray-200"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {isEditing ? "Cancel" : "Edit Profile"}
                  </Button>
                </div>

                {/* Contact Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                    <Mail className="h-4 w-4 mr-2 text-blue-500" />
                    <span className="truncate">{profileData.email}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                    <MapPin className="h-4 w-4 mr-2 text-red-500" />
                    <span>{profileData.city || "Location not set"}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                    <Calendar className="h-4 w-4 mr-2 text-green-500" />
                    <span>Member since 2025</span>
                  </div>
                </div>

                {/* Bio */}
                {profileData.bio && (
                  <p className="text-gray-700 leading-relaxed mb-4 bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-lg p-4">
                    {profileData.bio}
                  </p>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{userBookings.length}</div>
                    <div className="text-xs text-gray-500">Total Bookings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {userBookings.filter(b => b.paymentStatus === "completed").length}
                    </div>
                    <div className="text-xs text-gray-500">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      ₹{userBookings.reduce((sum, booking) => sum + booking.total, 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Total Spent</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Tabs */}
        <Tabs defaultValue="bookings" className="space-y-8">
          <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
            <TabsList className="grid w-full grid-cols-2 h-14 bg-gray-50/50">
              <TabsTrigger 
                value="bookings" 
                className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
              >
                <Ticket className="h-4 w-4 mr-2" />
                My Bookings
              </TabsTrigger>
              <TabsTrigger 
                value="personal" 
                className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
              >
                <Settings className="h-4 w-4 mr-2" />
                Personal Info
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="bookings" className="space-y-6">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">My Bookings</CardTitle>
                    <CardDescription className="text-gray-600">
                      All your event bookings and tickets
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {userBookings.length} bookings
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {userBookings && userBookings.length > 0 ? (
                    userBookings.map((booking, index) => (
                      <div
                        key={booking._id}
                        className="group relative bg-gradient-to-r from-white to-gray-50/50 border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-blue-200"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                          <div className="flex items-start space-x-4">
                            <div className="relative">
                              <Image
                                src={booking.event?.banner || "/images/profile.png"}
                                alt={booking.event?.title || "Event"}
                                width={120}
                                height={80}
                                className="w-20 h-16 lg:w-24 lg:h-18 rounded-lg object-cover shadow-sm ring-2 ring-white"
                              />
                              <div className="absolute -top-2 -left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                                #{index + 1}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
                                {booking.event?.title || "Event"}
                              </h3>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-3">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {new Date(booking.bookedAt).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </div>
                                <div className="flex items-center">
                                  <Ticket className="h-4 w-4 mr-1" />
                                  {booking.quantity} ticket{booking.quantity > 1 ? 's' : ''}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(booking.paymentStatus)}
                                <Badge
                                  className={`${getStatusColor(booking.paymentStatus)} border font-medium px-3 py-1`}
                                >
                                  {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right lg:ml-6">
                            <p className="text-2xl font-bold text-gray-900 mb-3">₹{booking.total.toLocaleString()}</p>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleViewTicket(booking)}
                                className="hover:bg-blue-50 hover:border-blue-300"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                View Ticket
                              </Button>
                              {/* {booking.paymentStatus === "completed" && (
                                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              )} */}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Ticket className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
                      <p className="text-gray-500 mb-6">You haven't booked any events yet</p>
                      <Button asChild>
                        <Link href="/events">Explore Events</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="personal" className="space-y-6">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                <CardTitle className="text-xl font-bold text-gray-900">Personal Information</CardTitle>
                <CardDescription className="text-gray-600">
                  Manage your personal details and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                {/* Contact Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Contact Information</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</Label>
                      <Input
                        id="name"
                        value={profileData.name}
                        onChange={(e) =>
                          setProfileData({ ...profileData, name: e.target.value })
                        }
                        disabled={!isEditing}
                        className="bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            email: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                        className="bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone Number</Label>
                      <div className="relative">
                        <Input
                          id="phone"
                          type={showPhone ? "text" : "password"}
                          value={profileData.phone}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              phone: e.target.value,
                            })
                          }
                          disabled={!isEditing}
                          className="bg-gray-50 border-gray-200 focus:bg-white transition-colors pr-12"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPhone(!showPhone)}
                        >
                          {showPhone ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-sm font-medium text-gray-700">City</Label>
                      <Input
                        id="city"
                        value={profileData.city || ""}
                        onChange={(e) =>
                          setProfileData({ ...profileData, city: e.target.value })
                        }
                        disabled={!isEditing}
                        placeholder="Enter your city"
                        className="bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Bio Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">About You</h3>
                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-sm font-medium text-gray-700">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profileData.bio || ""}
                      onChange={(e) =>
                        setProfileData({ ...profileData, bio: e.target.value })
                      }
                      disabled={!isEditing}
                      rows={4}
                      placeholder="Tell us about yourself..."
                      className="bg-gray-50 border-gray-200 focus:bg-white transition-colors resize-none"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                {isEditing && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
                    <Button onClick={handleSaveProfile} className="flex-1 sm:flex-none">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 sm:flex-none"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <Footer />
    </div>
  );
}