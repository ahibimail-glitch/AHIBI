"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
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
  MessageSquare,
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

const isUpcomingDate = (value: unknown) => {
  if (!value) return false;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date >= today;
};

export default function ProfilePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  // Avatar State
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  // Bookings State
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [sportsBookings, setSportsBookings] = useState<any[]>([]);
  const [artistBookings, setArtistBookings] = useState<any[]>([]);
  const [bookingType, setBookingType] = useState<"events" | "daily-events" | "artist" | "sports">("events");

  const isDailyBooking = (booking: any) => Boolean(booking.isDailyEvent || booking.dailyEvent);

  const getSafeImageSrc = (src?: string) => {
    if (!src || typeof src !== "string") return "/placeholder.jpg";
    if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")) return src;
    return "/placeholder.jpg";
  };

  const regularEventBookings = userBookings.filter((b) => !isDailyBooking(b));
  const dailyEventBookings = userBookings.filter((b) => isDailyBooking(b));
  const upcomingBookingsCount =
    userBookings.filter((booking) =>
      isUpcomingDate(
        isDailyBooking(booking)
          ? booking.selectedDate || booking.dailyEvent?.startDate || booking.dailyEvent?.date
          : booking.event?.startDate || booking.event?.date
      )
    ).length +
    artistBookings.filter((booking) => isUpcomingDate(booking.event?.date)).length +
    sportsBookings.filter((booking) =>
      isUpcomingDate(booking.date || booking.bookingDate || booking.startTime)
    ).length;

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

        // Fetch Artist Bookings
        const artistBookingsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organizer/bookings`, { headers });
        const artistBookingsData = await artistBookingsRes.json().catch((): any => null);
        if (artistBookingsRes.ok && artistBookingsData?.success) {
          setArtistBookings(artistBookingsData.data?.bookings || []);
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

  const handleSaveProfile = () => {
    setIsEditing(false);
    setIsProfileDialogOpen(false);
  }; // Add your API save logic here

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
    const eventSlug = String(booking.event?.slug || "");
    const externalUrl = String(booking.event?.externalBookingUrl || "");
    const isHornbillShowcase =
      eventSlug === "ticket-to-hornbill-showcase-day1" ||
      externalUrl.includes("/ticket-to-hornbill");

    if (isHornbillShowcase) router.push(`/ticket-to-hornbill/pass/${booking._id}`);
    else if (booking.bookingType === "annie-musical") router.push(`/annie-musical/bookings/${booking._id}`);
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

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:py-7">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="relative shrink-0">
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
                <Avatar className="h-14 w-14 border border-slate-200 sm:h-16 sm:w-16">
                  <AvatarImage src={profileData.profilePic || profileData.avatar || "/images/profile.png"} className="object-cover" />
                  <AvatarFallback className="bg-slate-100 text-base font-bold text-slate-500">
                    {profileData.name?.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  size="icon"
                  aria-label="Change profile photo"
                  title="Change profile photo"
                  disabled={uploadingAvatar}
                  onClick={handleSelectAvatar}
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full border-2 border-white bg-slate-900 text-white shadow-sm hover:bg-slate-700"
                >
                  <Camera className="h-3.5 w-3.5" />
                </Button>
                {avatarError && <p className="absolute left-0 top-full mt-2 w-48 text-xs font-medium text-rose-600">{avatarError}</p>}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="min-w-0 truncate text-lg font-bold tracking-tight text-slate-950 sm:text-xl">
                    {profileData.name}
                  </h1>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle className="h-3 w-3" /> Verified
                  </span>
                </div>
                <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-500 sm:text-sm">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{profileData.email}</span>
                </p>
              </div>

              <Button
                type="button"
                aria-label="Edit profile"
                onClick={() => {
                  setIsEditing(true);
                  setIsProfileDialogOpen(true);
                }}
                variant="outline"
                className="h-9 shrink-0 rounded-xl border-slate-200 px-2.5 text-slate-700 shadow-none sm:px-3"
              >
                <Edit className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Edit profile</span>
              </Button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3 text-center sm:px-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">Bookings</p>
                <p className="mt-0.5 text-2xl font-bold leading-none text-slate-950">
                  {userBookings.length + sportsBookings.length + artistBookings.length}
                </p>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50/60 px-3 py-3 text-center sm:px-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-600 sm:text-xs">Upcoming</p>
                <p className="mt-0.5 text-2xl font-bold leading-none text-rose-600">{upcomingBookingsCount}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:py-7">
        <div className="space-y-4">

            {/* Booking Type Pill Toggle */}
            <div aria-label="Booking type" className="scrollbar-hide flex w-full gap-2 overflow-x-auto rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1.5">
              {[
                { id: "events", label: "Events", count: regularEventBookings.length, icon: Ticket },
                { id: "daily-events", label: "Daily Events", count: dailyEventBookings.length, icon: Calendar },
                { id: "artist", label: "Artist bookings", count: artistBookings.length, icon: MessageSquare },
                // { id: "sports", label: "Sports", count: sportsBookings.length }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setBookingType(tab.id as any)}
                  aria-pressed={bookingType === tab.id}
                  className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold whitespace-nowrap transition-colors sm:flex-1 ${
                    bookingType === tab.id
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white hover:text-slate-950"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${bookingType === tab.id ? "bg-white/15 text-white" : "bg-white text-slate-500"}`}>{tab.count}</span>
                </button>
              ))}
            </div>

            {/* List Renderer */}
            <div className="space-y-4">

              {/* --- REGULAR EVENTS --- */}
              {bookingType === "events" && (
                regularEventBookings.length > 0 ? regularEventBookings.map((booking) => (
                  <div key={booking._id} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
                    <div className="flex items-start gap-3 sm:gap-5 lg:grid lg:grid-cols-[7rem_minmax(0,1fr)_11rem] lg:items-center lg:gap-6">
                    <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-32 sm:w-28">
                      <Image
                        src={getSafeImageSrc(booking.event?.banner)}
                        alt={booking.event?.title || "Event poster"}
                        fill
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = "/placeholder.jpg";
                        }}
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="min-w-0 line-clamp-2 font-sans text-[15px] font-semibold leading-snug text-slate-900 sm:text-base">
                            {booking.event?.title || booking.dailyEvent?.title || "Event Name Unavailable"}
                          </h3>
                          {booking.paymentStatus === "completed" ? (
                            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 lg:hidden" aria-label="Completed" role="img" />
                          ) : (
                            <Badge variant="outline" className={`${getStatusColor(booking.paymentStatus)} shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize tracking-normal lg:hidden`}>
                              {booking.paymentStatus}
                            </Badge>
                          )}
                        </div>
                        {booking.nuscSeasonPassType && (
                          <p className="mt-2 text-xs font-semibold text-emerald-700">
                            Season pass · Match {booking.nuscSeasonMatchIndex || "—"} of 10
                          </p>
                        )}
                        <div className="mt-3 grid gap-1.5 text-[13px] font-medium leading-5 text-slate-600">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2"><Calendar className="h-4 w-4 shrink-0 text-slate-400"/>
                              {new Date(booking.nuscSeasonPassType ? booking.event?.startDate || booking.bookedAt : booking.bookedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="shrink-0 text-sm font-bold text-slate-950 lg:hidden">₹{booking.total.toLocaleString()}</span>
                          </div>
                          <span className="flex items-center gap-2"><Ticket className="h-4 w-4 shrink-0 text-slate-400"/> {booking.totalTickets || booking.quantity} {Number(booking.totalTickets || booking.quantity) === 1 ? "ticket" : "tickets"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="hidden min-w-0 flex-col gap-3 lg:flex">
                      <div className="flex items-center justify-between gap-3">
                        {booking.paymentStatus === "completed" ? (
                          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Completed" role="img" />
                        ) : (
                          <Badge variant="outline" className={`${getStatusColor(booking.paymentStatus)} shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize tracking-normal`}>
                            {booking.paymentStatus}
                          </Badge>
                        )}
                        <span className="truncate text-sm font-bold text-slate-950">₹{booking.total.toLocaleString()}</span>
                      </div>
                      {(booking.paymentStatus === 'completed' || booking.paymentStatus === 'paid') && (
                        <Button size="sm" onClick={() => handleViewTicket(booking)} className="h-11 w-full rounded-xl bg-slate-950 text-sm font-semibold text-white hover:bg-slate-800">
                          <Ticket className="mr-2 h-4 w-4" /> View ticket
                        </Button>
                      )}
                    </div>
                    </div>
                    {(booking.paymentStatus === 'completed' || booking.paymentStatus === 'paid') && (
                      <div className="mt-4 border-t border-slate-100 pt-3 sm:flex sm:justify-end lg:hidden">
                        <Button size="sm" onClick={() => handleViewTicket(booking)} className="h-11 w-full rounded-xl bg-slate-950 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto sm:px-5">
                          <Ticket className="mr-2 h-4 w-4" /> View ticket
                        </Button>
                      </div>
                    )}
                  </div>
                )) : (
                  <EmptyState icon={<Ticket className="w-12 h-12 text-slate-300"/>} title="No event bookings yet" desc="Discover and book exciting upcoming events." link="/events" linkText="Explore Events" />
                )
              )}

              {/* --- DAILY EVENTS --- */}
              {bookingType === "daily-events" && (
                dailyEventBookings.length > 0 ? dailyEventBookings.map((booking) => (
                  <div key={booking._id} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
                    <div className="flex items-start gap-3 sm:gap-5 lg:grid lg:grid-cols-[7rem_minmax(0,1fr)_11rem] lg:items-center lg:gap-6">
                    <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-32 sm:w-28">
                      <Image
                        src={getSafeImageSrc(booking.dailyEvent?.banner)}
                        alt={booking.dailyEvent?.title || "Daily event poster"}
                        fill
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = "/placeholder.jpg";
                        }}
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur text-xs font-bold px-2 py-1 rounded-md text-slate-900">Daily</div>
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="min-w-0 line-clamp-2 font-sans text-[15px] font-semibold leading-snug text-slate-900 sm:text-base">
                            {booking.dailyEvent?.title || "Daily Event"}
                          </h3>
                          {booking.paymentStatus === "completed" ? (
                            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 lg:hidden" aria-label="Completed" role="img" />
                          ) : (
                            <Badge variant="outline" className={`${getStatusColor(booking.paymentStatus)} shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize tracking-normal lg:hidden`}>
                              {booking.paymentStatus}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-3 grid gap-1.5 text-[13px] font-medium leading-5 text-slate-600">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2"><Calendar className="h-4 w-4 shrink-0 text-slate-400"/>
                              {new Date(booking.selectedDate || booking.bookedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="shrink-0 text-sm font-bold text-slate-950 lg:hidden">₹{booking.total.toLocaleString()}</span>
                          </div>
                          <span className="flex items-center gap-2"><Ticket className="h-4 w-4 shrink-0 text-slate-400"/> {booking.totalTickets || booking.quantity} {Number(booking.totalTickets || booking.quantity) === 1 ? "ticket" : "tickets"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="hidden min-w-0 flex-col gap-3 lg:flex">
                      <div className="flex items-center justify-between gap-3">
                        {booking.paymentStatus === "completed" ? (
                          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Completed" role="img" />
                        ) : (
                          <Badge variant="outline" className={`${getStatusColor(booking.paymentStatus)} shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize tracking-normal`}>
                            {booking.paymentStatus}
                          </Badge>
                        )}
                        <span className="truncate text-sm font-bold text-slate-950">₹{booking.total.toLocaleString()}</span>
                      </div>
                      {booking.paymentStatus === 'completed' && (
                        <Button size="sm" onClick={() => handleViewTicket(booking)} className="h-11 w-full rounded-xl bg-slate-950 text-sm font-semibold text-white hover:bg-slate-800">
                          <Ticket className="mr-2 h-4 w-4" /> View ticket
                        </Button>
                      )}
                    </div>
                    </div>
                    {booking.paymentStatus === 'completed' && (
                      <div className="mt-4 border-t border-slate-100 pt-3 sm:flex sm:justify-end lg:hidden">
                        <Button size="sm" onClick={() => handleViewTicket(booking)} className="h-11 w-full rounded-xl bg-slate-950 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto sm:px-5">
                          <Ticket className="mr-2 h-4 w-4" /> View ticket
                        </Button>
                      </div>
                    )}
                  </div>
                )) : (
                  <EmptyState icon={<Calendar className="w-12 h-12 text-slate-300"/>} title="No daily events booked" desc="Find fun daily activities happening near you." link="/events/daily" linkText="Explore Daily Events" />
                )
              )}

              {/* --- ARTIST BOOKINGS --- */}
              {bookingType === "artist" && (
                artistBookings.length > 0 ? artistBookings.map((booking) => (
                  <div key={booking._id} className="group flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md sm:gap-5 sm:p-5">
                    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-br from-violet-50 to-blue-50 sm:h-28 sm:w-32">
                      {booking.artist?.profilePic ? (
                        <Image src={getSafeImageSrc(booking.artist.profilePic)} alt={booking.artist?.name || "Artist"} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <MessageSquare className="h-10 w-10 text-slate-300" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div>
                        <h3 className="mb-2 line-clamp-2 text-base font-bold leading-tight text-slate-900 sm:text-lg">
                          {booking.event?.name || "Artist Booking"}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium text-slate-500 sm:gap-x-4 sm:text-sm">
                          <span className="flex items-center gap-1.5"><User className="h-4 w-4"/> {booking.artist?.name || "Artist"}</span>
                          <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4"/>
                            {booking.event?.date ? new Date(booking.event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : "Date TBA"}
                          </span>
                          <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4"/> {booking.event?.venue?.name || booking.event?.venue?.address || "Venue TBA"}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4 pt-4 border-t border-slate-100">
                        <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 rounded-md uppercase tracking-wider text-[10px] font-bold px-2 py-1 w-fit">
                          {booking.booking?.status || "pending"}
                        </Badge>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-lg text-slate-900">₹{Number(booking.booking?.finalAmount || booking.booking?.requestedAmount || 0).toLocaleString()}</span>
                          <Button size="sm" onClick={() => router.push(`/profile/artist-bookings/${booking._id}`)} className="rounded-lg bg-slate-900 text-white hover:bg-slate-800">
                            Open Chat
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <EmptyState icon={<MessageSquare className="w-12 h-12 text-slate-300"/>} title="No artist bookings yet" desc="Book an artist and your request will appear here." link="/allArtists" linkText="Explore Artists" />
                )
              )}

              {/* --- SPORTS --- (hidden while /sports is disabled) */}
              {false && bookingType === "sports" && (
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
          </div>
      </main>

      <Dialog
        open={isProfileDialogOpen}
        onOpenChange={(open) => {
          setIsProfileDialogOpen(open);
          if (!open) setIsEditing(false);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-slate-100 bg-slate-50 p-5 pr-12 text-left sm:p-6">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <User className="h-5 w-5 text-slate-500" /> Account Settings
            </DialogTitle>
            <DialogDescription>Manage your personal information and contact details.</DialogDescription>
          </DialogHeader>
          <Card className="rounded-none border-0 bg-white shadow-none">
            <CardContent className="space-y-8 p-5 sm:p-8">

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
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setIsProfileDialogOpen(false);
                      }}
                      className="h-11 rounded-xl border-slate-200 text-slate-600"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

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
