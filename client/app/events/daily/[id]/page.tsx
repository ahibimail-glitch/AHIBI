"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  MapPin,
  Calendar as CalendarIcon,
  Share2,
  AlertCircle,
  Clock,
  Ticket,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Tag,
} from "lucide-react";

import { format } from "date-fns";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";
import { trackBookingStarted, trackEventView } from "@/lib/analytics/google-analytics";

interface TicketType {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  description: string;
  benefits?: string[];
  capacity: number;
}

interface DailyEvent {
  _id: string;
  title: string;
  description: string;
  banner: string;
  coverImage?: string;
  gallery: Array<{ url: string; caption: string }>;
  organizer: any;
  category: string;
  tags: string[];
  periodStartDate: string;
  periodEndDate: string;
  startTime: string;
  duration: {
    hours: number;
    minutes: number;
  };
  activeDates: string[];
  excludedDates: string[];
  ticketTypes: TicketType[];
  bookingType?: "ticketed" | "rsvp" | "call_to_book";
  location: {
    address: string;
    city: string;
    state?: string;
    country?: string;
  };
  convenience: { percentage: number; fixedAmount: number };
  termsAndConditions?: string;
  isFreeEvent?: boolean;
  bookingDeadlineHours?: number;
  socialLinks?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
}

interface DailyEventDetailPageProps {
  params: { id: string };
}

export default function DailyEventDetailPage({ params }: DailyEventDetailPageProps) {
  const router = useRouter();
  const [event, setEvent] = useState<DailyEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const trackedEventViewId = useRef<string | null>(null);

  const [descExpanded, setDescExpanded] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const isRsvpEvent = event?.bookingType === "rsvp" || event?.bookingType === "call_to_book";

  useEffect(() => {
    let isMounted = true;

    const fetchEvent = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/daily-events/${params.id}`, { 
          cache: "no-store" 
        });
        
        if (!res.ok) {
          if (res.status === 404) throw new Error("Daily event not found.");
          if (res.status === 403) throw new Error("This daily event is not available.");
          throw new Error(`HTTP error: ${res.status}`);
        }
        
        const data = await res.json();
        if (isMounted) setEvent(data);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : "Failed to load daily event");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchEvent();

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  // GEL Blaster uses a dedicated booking experience
  useEffect(() => {
    if ((event as any)?.slug === "ge-blaster") {
      router.replace("/ge-blaster");
    }
  }, [event, router]);

  useEffect(() => {
    if (!event || trackedEventViewId.current === event._id) return;

    trackedEventViewId.current = event._id;
    trackEventView({
      event_id: event._id,
      event_name: event.title,
    });
  }, [event]);

  const handleBuyNow = () => {
    if (isRsvpEvent) return;

    if (event) {
      trackBookingStarted({
        event_id: event._id,
        event_name: event.title,
      });
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast.info("Please login to book tickets");
      router.push(`/auth?redirect=/events/daily/${params.id}/checkout`);
      return;
    }
    router.push(`/events/daily/${params.id}/checkout`);
  };

  const handleRsvpRequest = () => {
    router.push(`/events/daily/${params.id}/rsvp`);
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;
      const nav = navigator as any;
      if (typeof nav?.share === "function") {
        await nav.share({ title: event?.title || "Daily Event", url });
        return;
      }
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
        return;
      }
      toast.error("Sharing not supported on this device");
    } catch (err: any) {
      if (err?.name !== "AbortError") toast.error("Failed to share link");
    }
  };

  const getEventImageUrl = (url?: string) => {
    if (!url) return "/placeholder.svg";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const base = process.env.NEXT_PUBLIC_API_URL || "";
    return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
  };

  const getEventPriceRange = () => {
    if (!event) return "TBA";
    if (event.isFreeEvent) return "Free";
    if (!Array.isArray(event.ticketTypes) || event.ticketTypes.length === 0) return "TBA";
    
    const prices = event.ticketTypes.map(t => t.price).filter(p => typeof p === "number" && p > 0);
    if (prices.length === 0) return "Free";
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `₹${min}` : `₹${min} – ₹${max}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md mx-auto bg-white rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error || "Event not found"}</p>
          <Button onClick={() => router.push("/events/daily")}>
            Back to Daily Events
          </Button>
        </div>
      </div>
    );
  }

  const descriptionText = event.description || "";
  const shouldTruncate = descriptionText.length > 280;
  const displayedDescription = descExpanded || !shouldTruncate 
    ? descriptionText 
    : descriptionText.slice(0, 280) + "...";

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-10">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-sm">
                <Image
                  src={getEventImageUrl(event.coverImage || event.banner)}
                  alt={event.title}
                  fill
                  className="object-contain"
                  priority
                />
              </div>

              <div className="mb-6">
                <div className="flex items-start justify-between gap-3 mb-6">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 leading-tight flex-1">
                    {event.title}
                  </h1>
                  <button
                    onClick={handleShare}
                    className="shrink-0 w-11 h-11 flex items-center justify-center bg-gray-100 border border-gray-200 text-gray-700 rounded-full hover:bg-gray-200 active:scale-[0.96] transition-all"
                    aria-label="Share event"
                  >
                    <Share2 size={18} />
                  </button>
                </div>
              </div>

              <section className="w-full border-t border-gray-100 pt-6">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">About The Event</h2>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed whitespace-pre-line">
                  {displayedDescription}
                </p>

                {shouldTruncate && (
                  <button
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="text-red-600 text-sm font-medium mt-2 hover:underline inline-flex items-center gap-1"
                  >
                    {descExpanded ? (
                      <>
                        <ChevronUp size={16} />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown size={16} />
                        Read More
                      </>
                    )}
                  </button>
                )}

                {event.tags && event.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {event.tags.map((tag, i) => (
                      <span key={i} className="bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-6">
                  <h3 className="text-base font-bold text-gray-900 mb-3">You Should Know</h3>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                      <AlertCircle size={17} className="text-red-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-gray-600">
                        Carry a valid photo ID — it may be required at the venue. 
                      </p>
                    </div>

                    {!isRsvpEvent && (
                      <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                        <Tag size={17} className="text-red-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold text-gray-900">Ticket Info: </span>
                          If your payment has been successfully completed but the ticket is not yet visible, please don’t worry — it will be generated automatically.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Venue Details + Map */}
              <section className="w-full border-t border-gray-100 pt-6">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Venue Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <MapPin size={17} className="text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{event.location.address}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {[event.location.city, event.location.state, event.location.country].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </div>

                    <a
                      href={`https://www.google.com/maps?q=${encodeURIComponent(`${event.location.address}, ${event.location.city}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:underline"
                    >
                      <MapPin size={14} /> Get Directions
                    </a>
                  </div>

                  <div className="relative h-56 rounded-xl overflow-hidden shadow-sm border border-gray-100">
                    <iframe
                      title="Daily Event Location"
                      className="absolute inset-0 w-full h-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps?q=${encodeURIComponent(`${event.location.address}, ${event.location.city}`)}&output=embed`}
                    />
                    <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-md rounded-lg px-3 py-2.5 shadow-lg flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-800 truncate">{event.location.address}</p>
                        <p className="text-[11px] text-gray-400">{event.location.city}</p>
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${encodeURIComponent(`${event.location.address}, ${event.location.city}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Directions
                      </a>
                    </div>
                  </div>
                </div>
              </section>

              {/* Social Links */}
              {event.socialLinks && Object.values(event.socialLinks).some(link => link && link.trim() !== '') && (
                <section className="w-full border-t border-gray-100 pt-6">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Connect With Us</h2>
                  <div className="flex flex-wrap gap-3">
                    {event.socialLinks.website && (
                      <a
                        href={event.socialLinks.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        Website
                      </a>
                    )}
                    {event.socialLinks.instagram && (
                      <a
                        href={event.socialLinks.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-700 rounded-lg hover:bg-pink-100 transition-colors text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                        </svg>
                        Instagram
                      </a>
                    )}
                    {event.socialLinks.facebook && (
                      <a
                        href={event.socialLinks.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Facebook
                      </a>
                    )}
                    {event.socialLinks.twitter && (
                      <a
                        href={event.socialLinks.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 text-sky-700 rounded-lg hover:bg-sky-100 transition-colors text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                        </svg>
                        X/Twitter
                      </a>
                    )}
                    {event.socialLinks.youtube && (
                      <a
                        href={event.socialLinks.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                        YouTube
                      </a>
                    )}
                  </div>
                </section>
              )}

              {/* Gallery */}
              {event.gallery && event.gallery.length > 0 && (
                <section className="w-full border-t border-gray-100 pt-6">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Event Maps & Gallery</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {event.gallery.map((image, index) => (
                      <div key={index} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                        <Image
                          src={getEventImageUrl(image.url)}
                          alt={image.caption || `Event image ${index + 1}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {image.caption && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                            <p className="text-white text-sm font-medium line-clamp-2">{image.caption}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}


              {event.termsAndConditions && (
                <Card>
                  <CardContent className="p-6">
                    <Button
                      variant="ghost"
                      onClick={() => setShowTerms(!showTerms)}
                      className="w-full justify-between p-0 h-auto hover:bg-transparent"
                    >
                      <h2 className="text-xl font-bold text-gray-900">Terms & Conditions</h2>
                      {showTerms ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </Button>
                    {showTerms && (
                      <div className="mt-4 prose prose-sm max-w-none">
                        <p className="text-gray-700 whitespace-pre-wrap">{event.termsAndConditions}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-24">
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm w-full">
                  <div className="space-y-3.5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0 text-gray-400">
                        <CalendarIcon size={18} />
                      </div>
                      <div className="text-sm leading-snug text-gray-700">
                        {format(new Date(event.periodStartDate), "MMMM d, yyyy")} -{" "}
                        {format(new Date(event.periodEndDate), "MMMM d, yyyy")}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0 text-gray-400">
                        <Clock size={18} />
                      </div>
                      <div className="text-sm leading-snug text-gray-700">
                        Starts at {event.startTime} • {event.duration.hours}h {event.duration.minutes}m
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0 text-gray-400">
                        <MapPin size={18} />
                      </div>
                      <div className="text-sm leading-snug text-gray-700">
                        {event.location.address}, {event.location.city}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0 text-red-600">
                        {isRsvpEvent ? <ClipboardList size={18} /> : <Ticket size={18} />}
                      </div>
                      <div className="text-sm leading-snug text-red-600 font-semibold text-base">
                        {isRsvpEvent ? (
                          <div className="space-y-1">
                            <div>Booking enquiry</div>
                            <div className="text-sm font-medium text-gray-600">The organizer will review your details and follow up about availability and pricing</div>
                          </div>
                        ) : getEventPriceRange()}
                      </div>
                    </div>
                  </div>

                  {isRsvpEvent ? (
                    <button
                      onClick={handleRsvpRequest}
                      className="mt-5 w-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm py-3 rounded-xl transition-colors min-h-[44px]"
                    >
                      Register your interest
                    </button>
                  ) : (
                    <button
                      onClick={handleBuyNow}
                      className="mt-5 w-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm py-3 rounded-xl transition-colors min-h-[44px]"
                    >
                      {event.isFreeEvent ? "Register Now" : "Book Tickets"}
                    </button>
                  )}

                  {isRsvpEvent ? (
                    <div className="mt-4 text-center text-sm text-gray-500">This sends a booking enquiry, not a confirmed booking. The organizer can contact you to discuss availability and pricing.</div>
                  ) : (
                    <div className="mt-4 text-center">
                      <div className="text-xs text-gray-500">Price from</div>
                      <div className="text-lg font-semibold text-gray-900">{getEventPriceRange()}</div>
                      <div className={`mt-1 text-sm ${event.isFreeEvent ? "text-green-600 font-semibold" : "text-gray-500"}`}>
                        {event.isFreeEvent ? "Free Entry" : "Available"}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky footer summary (desktop) */}
      <section className="w-full border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-900">{event.title}</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {format(new Date(event.periodStartDate), "MMM d, yyyy")} · {event.startTime}
              </p>
              <p className="text-sm text-gray-400 mt-0.5">{event.location.city}</p>
            </div>
            {isRsvpEvent ? (
              <button onClick={handleRsvpRequest} className="shrink-0 rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700">
                Register your interest
              </button>
            ) : (
              <button
                onClick={handleBuyNow}
                className="shrink-0 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
              >
                {event.isFreeEvent ? "Register Now" : "Book Now"} ·{" "}
                <span className="font-bold">{getEventPriceRange()}</span>
              </button>
            )}
          </div>
        </div>
      </section>

      <Footer />

      {/* Fixed mobile book bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 md:hidden z-50 safe-area-inset-bottom">
        <div className="space-y-2">
          {isRsvpEvent ? (
            <button onClick={handleRsvpRequest} className="w-full rounded-xl bg-red-600 py-3.5 text-center text-sm font-semibold text-white transition-colors hover:bg-red-700">
              Register your interest
            </button>
          ) : (
            <button
              onClick={handleBuyNow}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm"
            >
              {event.isFreeEvent ? "Register Now" : "Book Now"} ·{" "}
              <span className="font-bold">{getEventPriceRange()}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
