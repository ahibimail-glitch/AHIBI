"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
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
  Mail,
  Phone,
  MapPin,
  Calendar,
  Ticket,
  Camera,
  Edit,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Activity,
  Map,
} from "lucide-react";
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
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Avatar State
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  // Bookings State
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [sportsBookings, setSportsBookings] = useState<any[]>([]);
  const [bookingType, setBookingType] = useState<"events" | "daily-events" | "sports">("events");

  const isDailyBooking = (booking: any) => Boolean(booking.isDailyEvent || booking.dailyEvent);
  
  const getSafeImageSrc = (src?: string) => {
    if (!src || typeof src !== "string") return "/placeholder.jpg";
    if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")) return src;
    return "/placeholder.jpg";
  };

  const regularEventBookings = userBookings.filter((b) => !isDailyBooking(b));
  const dailyEventBookings = userBookings.filter((b) => isDailyBooking(b));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

        // Fetch Profile
        const profileRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`, { headers });
        const profileData = await profileRes.json();
        if (profileRes.ok && profileData.success) {
          setProfileData(profileData.data.user);
        } else {
          setError(profileData.message || "Failed to fetch profile");
        }

        // Fetch Events
        const eventsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bookings/my-bookings`, { headers });
        const eventsData = await eventsRes.json();
        if (eventsRes.ok) {
          const filtered = (eventsData.bookings || []).filter(
            (b: any) => b.paymentStatus === "completed" || b.paymentStatus === "paid" || (b.bookingType === "annie-musical" && b.paymentStatus === "pending")
          );
          setUserBookings(filtered);
        }

        // Fetch Sports
        const sportsRes = await fetch(getApiUrl("/sports/my-bookings"), { headers });
        const sportsData = await sportsRes.json();
        if (sportsData.success) {
          setSportsBookings(sportsData.data.bookings || []);
        }
      } catch (e) {
        setError("Network error. Please try again.");
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleSaveProfile = () => setIsEditing(false); // Add your API save logic here

  const handleSelectAvatar = () => {
    if (uploadingAvatar) return;
    setAvatarError(null);
    avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... [Your existing avatar upload logic remains exactly the same]
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    try {
      if (!file.type.startsWith("image/")) throw new Error("Please select an image file");
      if (file.size > 5 * 1024 * 1024) throw new Error("Image must be smaller than 5MB");
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication required");

      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append("photo", file);

      const uploadRes = await fetch(getApiUrl("upload"), { method: "POST", body: formData });
      const uploadData = await uploadRes.json().catch((): any => null);
      const uploadedUrl = uploadData?.data?.photo?.url;
      
      if (!uploadRes.ok || uploadData?.status !== "success" || typeof uploadedUrl !== "string") {
        throw new Error(uploadData?.message || "Failed to upload image");
      }

      const updateRes = await fetch(getApiUrl("auth/update-profile"), {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ profilePic: uploadedUrl }),
      });

      const updateData = await updateRes.json().catch((): any => null);
      if (!updateRes.ok || !updateData?.success) throw new Error(updateData?.message || "Failed to update profile");
      if (updateData?.data?.user) setProfileData(updateData.data.user);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Failed to upload profile picture");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleViewTicket = (booking: any) => {
    if (booking.bookingType === "annie-musical") router.push(`/annie-musical/bookings/${booking._id}`);
    else if (booking.isDailyEvent && booking.dailyEvent) router.push(`/events/daily/${booking.dailyEvent._id}/bookings?bookingId=${booking._id}`);
    else if (booking.event) router.push(`/events/${booking.event._id}/bookings?bookingId=${booking._id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "paid":
        return "bg-emerald-50 text-emerald-600 border-emerald-200";
      case "pending":
        return "bg-amber-50 text-amber-600 border-amber-200";
      default:
        return "bg-rose-50 text-rose-600 border-rose-200";
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex justify-center items-center">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-t-2 border-slate-900 animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex justify-center items-center p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm text-center border border-slate-100">
            <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4 opacity-80" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Oops! Something went wrong</h2>
            <p className="text-slate-500 mb-6">{error || "No profile data found."}</p>
            <Button onClick={() => window.location.reload()} className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800">
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const completedBookingsCount =
    userBookings.filter((b) => b.paymentStatus === "completed" || b.paymentStatus === "paid").length +
    sportsBookings.filter((b) => b.status === "completed").length;

  const totalSpent =
    userBookings.reduce((sum, b) => sum + b.total, 0) +
    sportsBookings.reduce((sum, b) => sum + b.pricing.totalAmount, 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      {/* Hero Section */}
      <div className="bg-white border-b border-slate-200 shadow-sm relative overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 bg-grid-slate-100/[0.2] bg-[size:20px_20px]"></div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

        <div className="container mx-auto px-4 py-12 relative z-10 max-w-5xl">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Avatar Profile */}
            <div className="relative group shrink-0">
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
              
              <div className="relative rounded-full p-1 bg-white border border-slate-200 shadow-sm">
                <Avatar className="w-32 h-32 md:w-40 md:h-40 shadow-inner">
                  <AvatarImage src={profileData.profilePic || profileData.avatar || "/images/profile.png"} className="object-cover" />
                  <AvatarFallback className="text-4xl font-bold bg-slate-100 text-slate-400">
                    {profileData.name?.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                
                <Button
                  size="icon"
                  disabled={uploadingAvatar}
                  onClick={handleSelectAvatar}
                  className="absolute bottom-2 right-2 h-10 w-10 rounded-full border-2 border-white bg-slate-900 text-white hover:bg-slate-800 shadow-md transition-transform hover:scale-105"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              {avatarError && <div className="absolute -bottom-6 w-full text-center text-xs text-rose-500 font-medium">{avatarError}</div>}
            </div>

            {/* Profile Info & Stats */}
            <div className="flex-1 w-full text-center md:text-left pt-2">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
                    {profileData.name}
                  </h1>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <CheckCircle className="h-3.5 w-3.5" /> Verified Account
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4" /> {profileData.email}
                    </span>
                  </div>
                </div>

                <Button 
                  onClick={() => setIsEditing(!isEditing)}
                  variant={isEditing ? "destructive" : "outline"}
                  className="rounded-xl shadow-sm transition-all"
                >
                  {isEditing ? "Cancel Editing" : <><Edit className="w-4 h-4 mr-2"/> Edit Profile</>}
                </Button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-slate-500 text-sm font-medium mb-1">Total Bookings</span>
                  <span className="text-2xl font-bold text-slate-900">{userBookings.length + sportsBookings.length}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-slate-500 text-sm font-medium mb-1">Completed</span>
                  <span className="text-2xl font-bold text-slate-900">{completedBookingsCount}</span>
                </div>
                <div className="col-span-2 md:col-span-1 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-slate-500 text-sm font-medium mb-1">Total Spent</span>
                  <span className="text-2xl font-bold text-slate-900">₹{totalSpent.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <Tabs defaultValue="bookings" className="w-full">
          
          {/* Main Navigation Tabs */}
          <TabsList className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 flex w-full max-w-sm mx-auto mb-10">
            <TabsTrigger value="bookings" className="flex-1 rounded-xl py-2.5 text-sm font-semibold data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
              <Ticket className="h-4 w-4 mr-2" /> Bookings
            </TabsTrigger>
            <TabsTrigger value="personal" className="flex-1 rounded-xl py-2.5 text-sm font-semibold data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
              <User className="h-4 w-4 mr-2" /> Personal Info
            </TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-6 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Booking Type Pill Toggle */}
            <div className="flex gap-2 p-1 bg-slate-200/50 rounded-xl max-w-fit mx-auto md:mx-0 overflow-x-auto">
              {[
                { id: "events", label: "Events", count: regularEventBookings.length },
                { id: "daily-events", label: "Daily Events", count: dailyEventBookings.length },
                { id: "sports", label: "Sports", count: sportsBookings.length }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setBookingType(tab.id as any)}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                    bookingType === tab.id 
                    ? "bg-white text-slate-900 shadow border border-slate-200" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                >
                  {tab.label} <span className="ml-1.5 opacity-60 text-xs">({tab.count})</span>
                </button>
              ))}
            </div>

            {/* List Renderer */}
            <div className="space-y-4">
              
              {/* --- REGULAR EVENTS --- */}
              {bookingType === "events" && (
                regularEventBookings.length > 0 ? regularEventBookings.map((booking) => (
                  <div key={booking._id} className="group bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-5">
                    <div className="w-full sm:w-40 h-32 relative rounded-xl overflow-hidden shrink-0 bg-slate-100">
                      <Image src={getSafeImageSrc(booking.event?.banner)} alt="Event" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 leading-tight mb-2 line-clamp-2">
                          {booking.event?.title || booking.dailyEvent?.title || "Event Name Unavailable"}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 font-medium">
                          <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4"/> 
                            {new Date(booking.bookedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="flex items-center gap-1.5"><Ticket className="h-4 w-4"/> {booking.totalTickets || booking.quantity} Ticket(s)</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                        <Badge variant="outline" className={`${getStatusColor(booking.paymentStatus)} rounded-md uppercase tracking-wider text-[10px] font-bold px-2 py-1`}>
                          {booking.paymentStatus}
                        </Badge>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-lg text-slate-900">₹{booking.total.toLocaleString()}</span>
                          {(booking.paymentStatus === 'completed' || booking.paymentStatus === 'paid') && (
                            <Button size="sm" onClick={() => handleViewTicket(booking)} className="rounded-lg bg-slate-900 text-white hover:bg-slate-800">View Ticket</Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <EmptyState icon={<Ticket className="w-12 h-12 text-slate-300"/>} title="No event bookings yet" desc="Discover and book exciting upcoming events." link="/events" linkText="Explore Events" />
                )
              )}

              {/* --- DAILY EVENTS --- */}
              {bookingType === "daily-events" && (
                dailyEventBookings.length > 0 ? dailyEventBookings.map((booking) => (
                  <div key={booking._id} className="group bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-5">
                    <div className="w-full sm:w-40 h-32 relative rounded-xl overflow-hidden shrink-0 bg-slate-100">
                      <Image src={getSafeImageSrc(booking.dailyEvent?.banner)} alt="Daily Event" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur text-xs font-bold px-2 py-1 rounded-md text-slate-900">Daily</div>
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 leading-tight mb-2 line-clamp-2">
                          {booking.dailyEvent?.title || "Daily Event"}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 font-medium">
                          <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4"/> 
                            {new Date(booking.selectedDate || booking.bookedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="flex items-center gap-1.5"><Ticket className="h-4 w-4"/> {booking.totalTickets || booking.quantity} Ticket(s)</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                        <Badge variant="outline" className={`${getStatusColor(booking.paymentStatus)} rounded-md uppercase tracking-wider text-[10px] font-bold px-2 py-1`}>
                          {booking.paymentStatus}
                        </Badge>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-lg text-slate-900">₹{booking.total.toLocaleString()}</span>
                          {booking.paymentStatus === 'completed' && (
                            <Button size="sm" onClick={() => handleViewTicket(booking)} className="rounded-lg bg-slate-900 text-white hover:bg-slate-800">View Ticket</Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <EmptyState icon={<Calendar className="w-12 h-12 text-slate-300"/>} title="No daily events booked" desc="Find fun daily activities happening near you." link="/events/daily" linkText="Explore Daily Events" />
                )
              )}

              {/* --- SPORTS --- */}
              {bookingType === "sports" && (
                sportsBookings.length > 0 ? sportsBookings.map((booking) => (
                  <div key={booking._id} className="group bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-5">
                    <div className="w-full sm:w-32 h-32 relative rounded-xl shrink-0 bg-slate-50 border border-slate-100 flex items-center justify-center text-4xl">
                      {booking.court.sportType === 'cricket' ? '🏏' : booking.court.sportType === 'football' ? '⚽' : booking.court.sportType === 'basketball' ? '🏀' : booking.court.sportType === 'badminton' ? '🏸' : booking.court.sportType === 'tennis' ? '🎾' : '🏟️'}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-lg text-slate-900">{booking.venue.venueName}</h3>
                          <Badge variant="outline" className={`${getStatusColor(booking.status)} rounded-md capitalize`}>{booking.status}</Badge>
                        </div>
                        <p className="text-sm text-slate-500 font-medium mb-3 uppercase tracking-wider text-[11px]">{booking.court.courtName} • {booking.court.sportType}</p>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                          <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md"><Calendar className="h-3.5 w-3.5 text-slate-400"/> {new Date(booking.bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                          <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md"><Clock className="h-3.5 w-3.5 text-slate-400"/> {booking.startTime} - {booking.endTime}</span>
                          <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md"><MapPin className="h-3.5 w-3.5 text-slate-400"/> {booking.venue.address.city}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-4 mt-4 pt-4 border-t border-slate-100">
                        <span className="font-bold text-lg text-slate-900">₹{booking.pricing.totalAmount.toLocaleString()}</span>
                        <Button size="sm" onClick={() => router.push(`/sports/bookings/${booking._id}`)} className="rounded-lg bg-slate-900 text-white hover:bg-slate-800">Details</Button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <EmptyState icon={<Activity className="w-12 h-12 text-slate-300"/>} title="No sports bookings found" desc="Book a court and start playing your favorite sport." link="/sports" linkText="Browse Venues" />
                )
              )}

            </div>
          </TabsContent>

          {/* Personal Info Tab */}
          <TabsContent value="personal" className="outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
              <CardHeader className="bg-slate-50 border-b border-slate-100 pb-6">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <User className="w-5 h-5 text-slate-500" /> Account Settings
                </CardTitle>
                <CardDescription>Manage your personal information and contact details.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 sm:p-8 space-y-8">
                
                {/* Grid Layout for Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Full Name</Label>
                    <Input
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      disabled={!isEditing}
                      className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white h-12 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Email Address</Label>
                    <Input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      disabled={!isEditing}
                      className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white h-12 transition-all disabled:opacity-70"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Phone Number</Label>
                    <div className="relative">
                      <Input
                        type={showPhone ? "text" : "password"}
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        disabled={!isEditing}
                        className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white h-12 pr-12 transition-all disabled:opacity-70"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1.5 h-9 w-9 text-slate-400 hover:text-slate-900"
                        onClick={() => setShowPhone(!showPhone)}
                      >
                        {showPhone ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold text-xs uppercase tracking-wider">City</Label>
                    <Input
                      value={profileData.city || ""}
                      onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Add your city"
                      className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white h-12 transition-all disabled:opacity-70"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <Label className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Bio / About Me</Label>
                  <Textarea
                    value={profileData.bio || ""}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    disabled={!isEditing}
                    rows={4}
                    placeholder="Tell us a little bit about yourself..."
                    className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white resize-none transition-all disabled:opacity-70"
                  />
                </div>

                {isEditing && (
                  <div className="flex items-center gap-3 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-2">
                    <Button onClick={handleSaveProfile} className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 h-11 px-8">
                      <Save className="h-4 w-4 mr-2" /> Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)} className="rounded-xl h-11 border-slate-200 text-slate-600">
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

// Reusable Empty State Component
function EmptyState({ icon, title, desc, link, linkText }: { icon: React.ReactNode, title: string, desc: string, link: string, linkText: string }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 border-dashed p-12 text-center flex flex-col items-center justify-center">
      <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 max-w-sm mx-auto mb-8">{desc}</p>
      <Button asChild className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm px-8">
        <Link href={link}>{linkText}</Link>
      </Button>
    </div>
  );
}