"use client";

import { useState, useEffect } from "react";
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

  const [descExpanded, setDescExpanded] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

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

  const handleBuyNow = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.info("Please login to book tickets");
      router.push(`/auth?redirect=/events/daily/${params.id}/checkout`);
      return;
    }
    router.push(`/events/daily/${params.id}/checkout`);
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

                    <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                      <Tag size={17} className="text-red-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold text-gray-900">Ticket Info: </span>
                        If your payment has been successfully completed but the ticket is not yet visible, please don’t worry — it will be generated automatically.
                      </p>
                    </div>
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
                        <Ticket size={18} />
                      </div>
                      <div className="text-sm leading-snug text-red-600 font-semibold text-base">
                        {getEventPriceRange()}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleBuyNow}
                    className="mt-5 w-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm py-3 rounded-xl transition-colors min-h-[44px]"
                  >
                    {event.isFreeEvent ? "Register Now" : "Book Tickets"}
                  </button>

                  <div className="mt-4 text-center">
                    <div className="text-xs text-gray-500">Price from</div>
                    <div className="text-lg font-semibold text-gray-900">{getEventPriceRange()}</div>
                    <div className={`mt-1 text-sm ${event.isFreeEvent ? "text-green-600 font-semibold" : "text-gray-500"}`}>
                      {event.isFreeEvent ? "Free Entry" : "Available"}
                    </div>
                  </div>
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
            <button
              onClick={handleBuyNow}
              className="shrink-0 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              {event.isFreeEvent ? "Register Now" : "Book Now"} ·{" "}
              <span className="font-bold">{getEventPriceRange()}</span>
            </button>
          </div>
        </div>
      </section>

      <Footer />

      {/* Fixed mobile book bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 md:hidden z-50 safe-area-inset-bottom">
        <div className="space-y-2">
          <button
            onClick={handleBuyNow}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm"
          >
            {event.isFreeEvent ? "Register Now" : "Book Now"} ·{" "}
            <span className="font-bold">{getEventPriceRange()}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
