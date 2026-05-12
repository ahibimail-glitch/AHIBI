"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  MapPin,
  Calendar as CalendarIcon,
  Share2,
  XCircle,
  Instagram,
  Globe,
  Facebook,
  Twitter,
  Youtube,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Timer,
  Heart,
  AlertCircle,
  Tag,
  Clock,
  Ticket,
  Play,
} from "lucide-react";

import { format } from "date-fns";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface EventOrganizer {
  _id: string;
  name: string;
  avatar?: string;
  rating?: number;
}

interface EventLocation {
  address: string;
  city: string;
  state?: string;
  country?: string;
  coordinates?: { type: string; coordinates: [number, number] };
}

interface Event {
  _id: string;
  title: string;
  subtitle?: string;
  description: string;
  banner: string;
  coverImage?: string;
  gallery: Array<{ url: string; caption: string }>;
  organizer: EventOrganizer | null;
  artists: any[];
  startDate: string;
  endDate: string;
  bookingEndTime?: string | null;
  category: string;
  tags: string[];
  ticketTypes: TicketType[];
  location: EventLocation;
  convenience: { percentage: number; fixedAmount: number };
  termsAndConditions?: string;
  rating: { average: number; count: number };
  paymentStatus: { artistsPaid: boolean; venuePaid: boolean; organizerPaid: boolean };
  totalTickets: number;
  ticketsSold: number;
  totalRevenue: number;
  status: string;
  isPublic: boolean;
  isSponsored: boolean;
  isExternal: boolean;
  isVirtual: boolean;
  isFreeEvent?: boolean;
  discounts: any[];
  reviews: any[];
  updatedAt: string;
  price?: string;
  availabilityLabel?: string;
  youtube?: string;
  socialLinks?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
  meta?: {
    title?: string;
    description?: string;
    keywords?: string;
    image?: string;
  };
}

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  bio: string;
  interests: string[];
  [key: string]: any;
}

interface EventDetailPageProps {
  params: { id: string };
}

const LivstreamAvailable=["69845fef7a0a6b29df05b70b","6984618f7a0a6b29df05b794"]
// ─── Related Event Card ───────────────────────────────────────────────────────

const RelatedEventCard = ({
  event,
}: {
  event: { id: string; title: string; date: string; image: string; price: string; location: string };
}) => (
  <Link href={`/events/${event.id}`} className="flex-shrink-0 w-56 block group">
    <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow bg-white">
      <div className="relative h-72 w-full">
        <Image src={event.image} alt={event.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
      </div>
      <div className="p-3">
        <p className="text-[11px] text-gray-400 mb-1 truncate">{event.location}</p>
        <h3 className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 mb-1">{event.title}</h3>
        <p className="text-xs text-gray-500 mb-1">{event.date}</p>
        <p className="text-sm font-bold text-gray-900">{event.price}</p>
      </div>
    </div>
  </Link>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  // UI state
  const [descExpanded, setDescExpanded] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [venueOpen, setVenueOpen] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [interested, setInterested] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; caption: string } | null>(null);

  const [relatedEvents, setRelatedEvents] = useState<
    Array<{ id: string; title: string; date: string; image: string; price: string; location: string }>
  >([]);

  // Special event IDs
  const HMF_id = ["691b1066a9a25d4fec36f96c", "691b13caa9a25d4fec36fa70", "691b146fa9a25d4fec36fb25", "691b14f1a9a25d4fec36fbd7", "691b156ea9a25d4fec36fc8d", "691b15c5a9a25d4fec36fd3a", "691b15faa9a25d4fec36fd3f", "691b162ca9a25d4fec36fd44", "691b1771a9a25d4fec36feaf", "6927db2d2cd1c48b94f5b9e5", "6927f5532cd1c48b94f5bd94", "6927f5f02cd1c48b94f5be37", "6927f61d2cd1c48b94f5be3d", "6927f66e2cd1c48b94f5be88", "6927f69c2cd1c48b94f5be8c", "6927f6cf2cd1c48b94f5be91", "6927f7102cd1c48b94f5bedb", "6927f73c2cd1c48b94f5bee0", "6927f7a32cd1c48b94f5bf36", "6927f7dd2cd1c48b94f5bf3b"];
  const isHMFEvent = HMF_id.includes(params.id);

  // Livestream event IDs
  const LIVESTREAM_EVENTS = ["69845fef7a0a6b29df05b70b", "6984618f7a0a6b29df05b794"];
  const isLivestreamEvent = LIVESTREAM_EVENTS.includes(params.id);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        date: format(date, "EEEE, MMMM d, yyyy"),
        time: format(date, "h:mm a"),
        fullDateTime: format(date, "yyyy-MM-dd'T'HH:mm"),
      };
    } catch {
      return { date: "Date not available", time: "Time not available", fullDateTime: "" };
    }
  };

  const getEventImage = (e: any) => {
    const url = e?.banner || e?.coverImage || "";
    if (!url) return "/placeholder.svg";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const base = process.env.NEXT_PUBLIC_API_URL || "";
    return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
  };

  const getEventPriceRange = (e: any) => {
    if (e?.isFreeEvent) return "Free";
    if (!Array.isArray(e?.ticketTypes) || e.ticketTypes.length === 0) return "TBA";
    const prices = e.ticketTypes.map((t: any) => t?.price).filter((p: any) => typeof p === "number" && p > 0);
    if (prices.length === 0) return "Free";
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `₹${min}` : `₹${min} – ₹${max}`;
  };

  const normalizeExternalUrl = (url?: string) => {
    if (!url?.trim()) return "";
    return url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
  };
  const hasSocial = (url?: string) => typeof url === "string" && url.trim() !== "";

  // ─── Booking cutoff ──────────────────────────────────────────────────────────

  const bookingCutoff = (() => {
    if (!event) return null;
    const raw = event.bookingEndTime || event.endDate;
    if (!raw) return null;
    const dt = new Date(raw);
    return isNaN(dt.getTime()) ? null : dt;
  })();

  const isBookingClosed = bookingCutoff ? new Date() > bookingCutoff : false;

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleBuyNow = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.info("Please login to book tickets");
      router.push(`/auth?redirect=/events/${params.id}/checkout`);
      return;
    }
    router.push(`/events/${params.id}/checkout`);
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;
      const nav = navigator as any;
      if (typeof nav?.share === "function") {
        await nav.share({ title: event?.title || "Event", url });
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

  const handleViewLivestream = () => {
    router.push("/livestream");
  };

  // ─── Data fetching ───────────────────────────────────────────────────────────

  useEffect(() => {
    let isMounted = true;

    const fetchEvent = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/events/${params.id}`, { cache: "no-store" });
        if (!res.ok) {
          if (res.status === 401) { router.push("/auth?redirect=" + encodeURIComponent(window.location.pathname)); return; }
          if (res.status === 404) throw new Error("Event not found.");
          if (res.status === 403) throw new Error("This event is not available.");
          throw new Error(`HTTP error: ${res.status}`);
        }
        const data = await res.json();
        if (isMounted) setEvent(data);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : "Failed to load event");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (res.ok && data.success && isMounted) setUser(data.data.user);
      } catch { /* silent */ }
    };

    fetchProfile();
    fetchEvent();
    return () => { isMounted = false; };
  }, [params.id]);

  useEffect(() => {
    const fetchRelated = async () => {
      if (!event?.category) return;
      const now = new Date();
      const toCards = (list: any[]) =>
        list
          .filter((e: any) => String(e?._id) !== String(event._id))
          .filter((e: any) => { const end = new Date(e?.endDate || e?.startDate); return isNaN(end.getTime()) || end >= now; })
          .map((e: any) => {
            const dt = formatDateTime(e.startDate);
            return { id: e._id, title: e.title, date: `${dt.date} | ${dt.time}`, image: getEventImage(e), price: getEventPriceRange(e), location: [e?.location?.city, e?.category].filter(Boolean).join(" • ") };
          });

      try {
        const qs = new URLSearchParams({ category: event.category, limit: "30" });
        if (event.location?.city) qs.set("city", event.location.city);
        const res = await fetch(`/api/events?${qs}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const events = Array.isArray(data?.data?.events) ? data.data.events : [];
        let cards = toCards(events).slice(0, 12);
        setRelatedEvents(cards);
      } catch { setRelatedEvents([]); }
    };
    fetchRelated();
  }, [event]);

  // ─── Loading / Error states ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-9 w-9 animate-spin text-red-600" />
          <p className="text-sm font-medium text-gray-600">Loading event…</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto p-6">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Event Unavailable</h2>
          <p className="text-sm text-gray-500 mb-6">{error || "Invalid event data."}</p>
          <div className="space-y-2">
            <button onClick={() => window.location.reload()} className="w-full bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors">Try Again</button>
            <button onClick={() => router.push("/events")} className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Browse Events</button>
          </div>
        </div>
      </div>
    );
  }

  if (isBookingClosed) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto p-6">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Bookings Closed</h2>
          <p className="text-sm text-gray-500 mb-6">Ticket sales have ended for this event.</p>
          <button onClick={() => router.push("/events")} className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Browse Events</button>
        </div>
      </div>
    );
  }

  // ─── Derived data ─────────────────────────────────────────────────────────────

  const startDT = formatDateTime(event.startDate);
  const endDT = event.endDate ? formatDateTime(event.endDate) : null;
  const timeRange = endDT ? `${startDT.time} – ${endDT.time}` : `${startDT.time} Onwards`;

  const priceRange = (() => {
    if (event.isFreeEvent) return "Free";
    const prices = (event.ticketTypes || []).map(t => t.price).filter(p => p > 0);
    if (!prices.length) return "Free";
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `₹${min}` : `₹${min} – ₹${max}`;
  })();

  const infoDetails = [
    { icon: CalendarIcon, label: startDT.date },
    { icon: Clock, label: timeRange },
    { icon: MapPin, label: `${event.location.address}, ${event.location.city}` },
    { icon: Ticket, label: priceRange, highlight: true },
  ];

  const descTruncated = event.description.length > 280 ? event.description.slice(0, 280) + "…" : event.description;
  const showReadMore = event.description.length > 280;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── Meta Pixel (conditional) ── */}
      {params.id === "69303656ca38d79b1c9e4202" && (
        <>
          <Script id="meta-pixel-base" strategy="afterInteractive">{`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','844675348311797');fbq('track','PageView');
          `}</Script>
          <noscript><img height="1" width="1" style={{ display: "none" }} src="https://www.facebook.com/tr?id=844675348311797&ev=PageView&noscript=1" alt="" /></noscript>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          HERO — Title + Banner (reference style)
      ══════════════════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10 items-start">
            {/* Left / Main: Title + Big Banner */}

            <div className="lg:col-span-2 order-1">

              {/* Title + Share Row */}
              {/* Title + Share (Always Same Row) */}
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


              {/* Banner */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden">
                <Image
                  src={event.coverImage || event.banner || "/placeholder.svg"}
                  alt={event.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>

            </div>



            {/* Right — sticky info card */}
            <aside className="order-2 lg:order-2">
              <div className="lg:sticky lg:top-24">
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm w-full">
                  <div className="space-y-3.5">
                    {infoDetails.map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 shrink-0 ${item.highlight ? "text-red-600" : "text-gray-400"
                            }`}
                        >
                          <item.icon size={18} />
                        </div>

                        <div
                          className={`text-sm leading-snug ${item.highlight
                            ? "text-red-600 font-semibold text-base"
                            : "text-gray-700"
                            }`}
                        >
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleBuyNow}
                    className="mt-5 w-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm py-3 rounded-xl transition-colors min-h-[44px]"
                  >
                    Book Tickets
                  </button>

                  {isLivestreamEvent && (
                    <button
                      onClick={handleViewLivestream}
                      className="mt-3 w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm py-3 rounded-xl transition-colors min-h-[44px] flex items-center justify-center gap-2"
                    >
                      <Play size={16} />
                      View Online
                    </button>
                  )}

                  <div className="mt-4 text-center">
                    <div className="text-xs text-gray-500">Price from</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {priceRange ?? "₹799 onwards"}
                    </div>
                    <div
                      className={`mt-1 text-sm ${event.availabilityLabel === "Available"
                        ? "text-green-600"
                        : "text-gray-500"
                        }`}
                    >
                      {event.availabilityLabel ?? "Available"}
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>



      {/* ═══════════════════════════════════════════════════════════════════════
          ABOUT THE EVENT
      ══════════════════════════════════════════════════════════════════════════ */}
      <section className="w-full border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">About The Event</h2>
          <p className="text-sm md:text-base text-gray-600 leading-relaxed whitespace-pre-line">
            {descExpanded ? event.description : descTruncated}
          </p>
          {showReadMore && (
            <button
              onClick={() => setDescExpanded(!descExpanded)}
              className="text-red-600 text-sm font-medium mt-2 hover:underline"
            >
              {descExpanded ? "Show Less" : "Read More"}
            </button>
          )}

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {event.tags.map((tag, i) => (
                <span key={i} className="bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">{tag}</span>
              ))}
            </div>
          )}

          {/* You Should Know */}
          <div className="mt-6">
            <h3 className="text-base font-bold text-gray-900 mb-3">You Should Know</h3>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                <AlertCircle size={17} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-600">
                  {event._id=="69e0b9650d43584f4c39482a" ? "Carry a valid photo ID — it may be required at the venue. Refund only applicable if cancelled before 48 hours. For cancellation contact us." : "Carry a valid photo ID — it may be required at the venue."}
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

          {/* NORTHEAST DANCE LEAGUE registration */}
          {event._id === "698358b4adfa8417cead34d0" && (
            <div className="mt-6">
              <Link
                href="/NortheastGrandDanceLeague/register"
                className="inline-flex items-center gap-2 rounded-full border border-gray-900 px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-900 hover:text-white transition-all duration-200"
              >
                Register as a Participant →
              </Link>
            </div>
          )}
        </div>
      </section>



      {/* ═══════════════════════════════════════════════════════════════════════
          VENUE DETAILS + MAP
      ══════════════════════════════════════════════════════════════════════════ */}
      <section className="w-full border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Venue Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Address */}
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

            {/* Map */}
            <div className="relative h-56 rounded-xl overflow-hidden shadow-sm border border-gray-100">
              <iframe
                title="Event Location"
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
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SOCIAL LINKS
      ══════════════════════════════════════════════════════════════════════════ */}
      {event.socialLinks && Object.values(event.socialLinks).some(link => link && link.trim() !== '') && (
        <section className="w-full border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Connect With Us</h2>
            <div className="flex flex-wrap gap-3">
              {event.socialLinks.website && (
                <a
                  href={event.socialLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  <Globe className="w-4 h-4" />
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
                  <Instagram className="w-4 h-4" />
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
                  <Facebook className="w-4 h-4" />
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
                  <Twitter className="w-4 h-4" />
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
                  <Youtube className="w-4 h-4" />
                  YouTube
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          GALLERY/MAP IMAGES
      ══════════════════════════════════════════════════════════════════════════ */}
      {event.gallery && event.gallery.length > 0 && (
        <section className="w-full border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Event Maps & Gallery</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {event.gallery.map((image, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedImage(image)}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer"
                >
                  <Image
                    src={image.url}
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
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TERMS & CONDITIONS (accordion)
      ══════════════════════════════════════════════════════════════════════════ */}
      <section className="w-full border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <button
            onClick={() => setShowTerms(!showTerms)}
            className="flex items-center justify-between w-full py-5 text-left"
          >
            <h2 className="text-lg md:text-xl font-bold text-gray-900 ">Terms &amp; Conditions</h2>
            {showTerms
              ? <ChevronUp size={18} className="text-gray-400" />
              : <ChevronDown size={18} className="text-gray-400" />
            }
          </button>
          {showTerms && (
            <div className="pb-6 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {event.termsAndConditions || "No terms and conditions specified."}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          YOU MIGHT ALSO LIKE
      ══════════════════════════════════════════════════════════════════════════ */}
      {relatedEvents.length > 0 && (
        <section className="w-full border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg md:text-xl font-bold text-gray-900">You Might Also Like</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    document.getElementById("related-scroll")?.scrollBy({ left: -240, behavior: "smooth" });
                  }}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => {
                    document.getElementById("related-scroll")?.scrollBy({ left: 240, behavior: "smooth" });
                  }}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div
              id="related-scroll"
              className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide"
              style={{ scrollSnapType: "x mandatory" }}
            >
              {relatedEvents.map(e => (
                <div key={e.id} style={{ scrollSnapAlign: "start" }}>
                  <RelatedEventCard event={e} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          STICKY FOOTER SUMMARY (desktop)
      ══════════════════════════════════════════════════════════════════════════ */}
      <section className="w-full border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-900">{event.title}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{startDT.date} · {startDT.time}</p>
              <p className="text-sm text-gray-400 mt-0.5">{event.location.city}</p>
            </div>
            <button
              onClick={handleBuyNow}
              className="shrink-0 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Book Now · <span className="font-bold">{priceRange}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          IMAGE MODAL
      ══════════════════════════════════════════════════════════════════════════ */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
          >
            <XCircle size={32} />
          </button>
          <div className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center">
            <img
              src={selectedImage.url}
              alt={selectedImage.caption || 'Gallery image'}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            {selectedImage.caption && (
              <p className="text-white text-center mt-4 text-sm font-medium">{selectedImage.caption}</p>
            )}
          </div>
        </div>
      )}

      <Footer />

      {/* ═══════════════════════════════════════════════════════════════════════
          FIXED MOBILE BOOK BAR
      ══════════════════════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 md:hidden z-50 safe-area-inset-bottom">
        <div className="space-y-2">
          <button
            onClick={handleBuyNow}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm"
          >
            Book Now · <span className="font-bold">{priceRange}</span>
          </button>
          
          {isLivestreamEvent && (
            <button
              onClick={handleViewLivestream}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
            >
              <Play size={16} />
              View Online
            </button>
          )}
        </div>
      </div>
    </div>
  );
}