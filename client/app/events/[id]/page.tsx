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
  Timer,
} from "lucide-react";

import { format } from "date-fns";
import Image from "next/image";
import Link from "next/link";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// App Components - Using dynamic imports to avoid SSR issues
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";

// Event Card Component (simplified for related events)
const EventCard = ({
  event,
}: {
  event: { id: string; title: string; date: string; image: string; price: string; location: string };
}) => (
  <div className="flex-shrink-0 w-64">
    <Link href={`/events/${event.id}`} className="block">
      <Card className="overflow-hidden hover:shadow-lg transition-shadow border-0">
        <div className="relative h-80">
          <Image
            src={event.image}
            alt={event.title}
            fill
            className="object-cover"
          />
        </div>
        <CardContent className="p-4 bg-white">
          <p className="text-xs text-gray-500 mb-1">{event.location}</p>
          <h3 className="font-semibold text-sm mb-2 line-clamp-2">{event.title}</h3>
          <p className="text-xs text-gray-600 mb-2">{event.date}</p>
          <p className="text-sm font-bold">{event.price}</p>
        </CardContent>
      </Card>
    </Link>
  </div>
);

// Types
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
  coordinates?: {
    type: string;
    coordinates: [number, number];
  };
}

interface EventRating {
  average: number;
  count: number;
}

interface PaymentStatus {
  artistsPaid: boolean;
  venuePaid: boolean;
  organizerPaid: boolean;
}

interface ConvenienceFee {
  percentage: number;
  fixedAmount: number;
}

interface Event {
  _id: string;
  title: string;
  description: string;
  banner: string;
  coverImage?: string;
  gallery: string[];
  organizer: EventOrganizer | null;
  artists: any[];
  startDate: string;
  endDate: string;
  bookingEndTime?: string | null;
  category: string;
  tags: string[];
  ticketTypes: TicketType[];
  location: EventLocation;
  convenience: ConvenienceFee;
  termsAndConditions?: string;
  rating: EventRating;
  paymentStatus: PaymentStatus;
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
  socialLinks?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
}

interface EventResponse extends Event { }

interface EventDetailPageProps {
  params: {
    id: string;
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

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [relatedEvents, setRelatedEvents] = useState<
    Array<{ id: string; title: string; date: string; image: string; price: string; location: string }>
  >([]);

  // HMF event IDs
  const HMF_id = ["691b1066a9a25d4fec36f96c", "691b13caa9a25d4fec36fa70", "691b146fa9a25d4fec36fb25", "691b14f1a9a25d4fec36fbd7", "691b156ea9a25d4fec36fc8d", "691b15c5a9a25d4fec36fd3a", "691b15faa9a25d4fec36fd3f", "691b162ca9a25d4fec36fd44", "691b1771a9a25d4fec36feaf", "6927db2d2cd1c48b94f5b9e5", "6927f5532cd1c48b94f5bd94", "6927f5f02cd1c48b94f5be37", "6927f61d2cd1c48b94f5be3d", "6927f66e2cd1c48b94f5be88", "6927f69c2cd1c48b94f5be8c", "6927f6cf2cd1c48b94f5be91", "6927f7102cd1c48b94f5bedb", "6927f73c2cd1c48b94f5bee0", "6927f7a32cd1c48b94f5bf36", "6927f7dd2cd1c48b94f5bf3b"];
  const HF_id = ["6927db2d2cd1c48b94f5b9e5", "6927f5532cd1c48b94f5bd94", "6927f5f02cd1c48b94f5be37", "6927f61d2cd1c48b94f5be3d", "6927f66e2cd1c48b94f5be88", "6927f69c2cd1c48b94f5be8c", "6927f6cf2cd1c48b94f5be91", "6927f7102cd1c48b94f5bedb", "6927f73c2cd1c48b94f5bee0", "6927f7a32cd1c48b94f5bf36", "6927f7dd2cd1c48b94f5bf3b"];

  const isHMFEvent = HMF_id.includes(params.id);
  const isHFEvent = HF_id.includes(params.id);
  const isSpecial = params.id === "68c2c33eb6ef88c76f50ce7c";
  const isBikerBash = params.id === "68d3ce2c0d439c1425c6cdd1";

  // Format date and time from ISO string
  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        date: format(date, "EEEE, MMMM d, yyyy"),
        time: format(date, "h:mm a"),
        fullDateTime: format(date, "yyyy-MM-dd'T'HH:mm"),
      };
    } catch (error) {
      console.error("Error formatting date:", error);
      return {
        date: "Date not available",
        time: "Time not available",
        fullDateTime: "",
      };
    }
  };

  const getEventImage = (e: any) => {
    const url = e?.coverImage || e?.banner || '';
    if (!url) return "/placeholder.svg";
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    if (!base) return url;
    if (url.startsWith('/')) return `${base}${url}`;
    return `${base}/${url}`;
  };

  const getEventPriceRange = (e: any) => {
    if (e?.isFreeEvent) return 'Free';
    if (!Array.isArray(e?.ticketTypes) || e.ticketTypes.length === 0) return 'TBA';
    const prices = e.ticketTypes.map((t: any) => t?.price).filter((p: any) => typeof p === 'number' && p > 0);
    if (prices.length === 0) return 'Free';
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    if (minPrice === maxPrice) return `₹${minPrice}`;
    return `₹${minPrice} - ₹${maxPrice}`;
  };

  const normalizeExternalUrl = (url?: string) => {
    if (!url) return "";
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    return `https://${trimmed}`;
  };

  const hasSocial = (url?: string) => typeof url === "string" && url.trim() !== "";

  useEffect(() => {
    const fetchRelated = async () => {
      try {
        if (!event?.category) return;

        const now = new Date();

        const toCards = (eventsList: any[]) =>
          eventsList
            .filter((e: any) => String(e?._id) !== String(event._id))
            .filter((e: any) => {
              const end = new Date(e?.endDate || e?.startDate);
              if (isNaN(end.getTime())) return true;
              return end >= now;
            })
            .map((e: any) => {
              const dt = formatDateTime(e.startDate);
              const location = [e?.location?.city, e?.category].filter(Boolean).join(' • ');
              return {
                id: e._id,
                title: e.title,
                date: `${dt.date} | ${dt.time}`,
                image: getEventImage(e),
                price: getEventPriceRange(e),
                location,
              };
            });

        const fetchEvents = async (opts: { city?: string }) => {
          const qs = new URLSearchParams();
          qs.set('category', event.category);
          qs.set('limit', '30');
          if (opts.city) qs.set('city', opts.city);

          const res = await fetch(`/api/events?${qs.toString()}`, { cache: 'no-store' });
          if (!res.ok) return [];
          const data = await res.json();
          return Array.isArray(data?.data?.events) ? data.data.events : [];
        };

        const city = event.location?.city;

        const firstBatchRaw = await fetchEvents({ city });
        let cards = toCards(firstBatchRaw);

        if (cards.length < 8 && city) {
          const fallbackRaw = await fetchEvents({});
          const fallbackCards = toCards(fallbackRaw);
          const seen = new Set(cards.map((c) => c.id));
          for (const c of fallbackCards) {
            if (seen.has(c.id)) continue;
            cards.push(c);
            seen.add(c.id);
            if (cards.length >= 12) break;
          }
        }

        setRelatedEvents(cards.slice(0, 12));
      } catch {
        setRelatedEvents([]);
      }
    };

    fetchRelated();
  }, [event]);

  // Booking cutoff logic
  const bookingCutoff = (() => {
    if (!event) return null;
    const raw = event.bookingEndTime || event.endDate;
    if (!raw) return null;
    const dt = new Date(raw);
    if (isNaN(dt.getTime())) return null;
    return dt;
  })();

  const isBookingClosed = (() => {
    if (!bookingCutoff) return false;
    return new Date() > bookingCutoff;
  })();

  // Handle Buy Now button click
  const handleBuyNowClick = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.info("Please login to book tickets");
      router.push(`/auth?redirect=/events/${params.id}/checkout`);
      return;
    }

    // Redirect to checkout page
    router.push(`/events/${params.id}/checkout`);
  };

  useEffect(() => {
    let isMounted = true;
    const fetchEvent = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log(`Fetching event with ID: ${params.id}`);
        const response = await fetch(`/api/events/${params.id}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          if (response.status === 401) {
            toast.error("Please log in to view event details");
            router.push("/auth?redirect=" + encodeURIComponent(window.location.pathname));
            return;
          }
          if (response.status === 404) {
            throw new Error("Event not found. It may have been removed or is not available.");
          }
          if (response.status === 403) {
            throw new Error("This event is not available for public viewing.");
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Received event data:", data);

        if (isMounted) {
          setEvent(data);
        }
      } catch (err) {
        console.error("Error fetching event:", err);
        const errorMsg = err instanceof Error ? err.message : "Failed to load event";

        if (errorMsg.toLowerCase().includes("token") ||
          errorMsg.toLowerCase().includes("auth") ||
          errorMsg.toLowerCase().includes("login")) {
          toast.error("Please log in to view event details");
          router.push("/auth?redirect=" + encodeURIComponent(window.location.pathname));
          return;
        }

        if (isMounted) {
          setError(errorMsg);
          if (errorMsg.includes("not found") || errorMsg.includes("not available")) {
            setTimeout(() => {
              router.push("/events");
            }, 3000);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          console.log("No auth token found - user not logged in");
          return;
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        const data = await res.json();

        if (!res.ok || !data.success) {
          if (data.message?.toLowerCase().includes("token") ||
            data.message?.toLowerCase().includes("auth") ||
            res.status === 401) {
            console.log("Auth error in profile fetch:", data.message);
            localStorage.removeItem("token");
            return;
          }
          console.log("Non-auth error in profile fetch:", data.message);
        } else {
          setUser(data.data.user);
        }
      } catch (e) {
        console.error("Profile fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    fetchEvent();

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full blur-xl opacity-30"></div>
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600 relative z-10" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">Loading Event</p>
            <p className="text-sm text-gray-600">Please wait a moment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-4 sm:p-6">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-7 w-7 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Event Unavailable</h2>
            <p className="text-gray-600 mb-6 text-sm">{error || "Invalid event data received"}</p>
            <div className="space-y-3">
              <Button
                onClick={() => window.location.reload()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm"
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/events')}
                className="w-full border-gray-300 text-gray-900 hover:bg-gray-100 rounded-lg text-sm"
              >
                Browse All Events
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full border-gray-300 text-gray-900 hover:bg-gray-100 rounded-lg text-sm"
              >
                Go to Homepage
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isBookingClosed) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-4 sm:p-6">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-7 w-7 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Bookings Closed</h2>
            <p className="text-gray-600 mb-6 text-sm">Bookings are closed for this event.</p>
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => router.push('/events')}
                className="w-full border-gray-300 text-gray-900 hover:bg-gray-100 rounded-lg text-sm"
              >
                Browse All Events
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full border-gray-300 text-gray-900 hover:bg-gray-100 rounded-lg text-sm"
              >
                Go to Homepage
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Format dates
  const startDateTime = formatDateTime(event.startDate);
  const endDateTime = event.endDate ? formatDateTime(event.endDate) : null;

  // Format time range
  const formatTimeRange = (start: string, end?: string) => {
    const startTime = formatDateTime(start);
    if (!end) return startTime.time;
    const endTime = formatDateTime(end);
    return `${startTime.time} - ${endTime.time}`;
  };

  const timeRange = formatTimeRange(event.startDate, event.endDate);

  // Calculate price range for display
  const priceRange = (() => {
    if (event.isFreeEvent) return "Free";
    if (!event.ticketTypes || event.ticketTypes.length === 0) return "TBA";

    const prices = event.ticketTypes.map(t => t.price).filter(p => p > 0);
    if (prices.length === 0) return "Free";

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    if (minPrice === maxPrice) return `₹${minPrice}`;
    return `₹${minPrice} - ₹${maxPrice}`;
  })();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      {params.id === '69303656ca38d79b1c9e4202' && (
        <>
          <Script id="meta-pixel-base" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '844675348311797');
              fbq('track', 'PageView');
            `}
          </Script>
          <noscript>
            <img height="1" width="1" style={{ display: 'none' }} src="https://www.facebook.com/tr?id=844675348311797&ev=PageView&noscript=1" alt="" />
          </noscript>
        </>
      )}

      {/* Hero Section - Black Background with Event Poster and Details */}
      <div className="bg-white text-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start max-w-6xl mx-auto">

            {/* Event Poster */}
            <div className="relative">
              <div className="relative rounded-xl overflow-hidden shadow-lg border">
                <Image
                  src={event.coverImage || event.banner || "/placeholder.svg"}
                  alt={event.title}
                  width={500}
                  height={700}
                  className="object-cover w-full"
                  priority
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 bg-white/80 backdrop-blur hover:bg-white text-gray-700 rounded-full shadow"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Event Details */}
            <div className="space-y-6">
              <div>
                <Badge className="bg-gray-100 text-gray-800 mb-3">
                  {event.category}
                </Badge>

                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  {event.title}
                </h1>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CalendarIcon className="h-4 w-4" />
                  <span>
                    {startDateTime.date}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Timer className="h-4 w-4" />
                  <span>
                    {startDateTime.time} Onwards
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {event.location.address}, {event.location.city}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleBuyNowClick}
                className="w-full md:w-auto bg-black text-white hover:bg-gray-900 font-semibold py-6 px-8 rounded-lg text-lg"
              >
                Book Now
                <span className="ml-4 font-bold">{priceRange}</span>
              </Button>

              {/* NORTHEAST DANCE LEAGUE REGISTERATION BUTTON */}
              {event._id === "698358b4adfa8417cead34d0" &&
                <div className="flex justify-start mt-6">
                  <Link
                    href="/NortheastGrandDanceLeague/register"
                    className="inline-flex items-center gap-2 rounded-full
             border border-black
             px-6 py-3 text-sm sm:text-base font-semibold
             text-black shadow-lg
             transition-all duration-300
             hover:bg-black hover:text-white
             hover:scale-105"
                  >
                    Register as a Participant →
                  </Link>

                </div>


              }
            </div>





          </div>
        </div>
      </div>


      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* Description Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">DESCRIPTION</h2>
          <div className="prose max-w-none text-gray-700">
            <p className="leading-relaxed whitespace-pre-line">{event.description}</p>
          </div>

          {event.tags && event.tags.length > 0 && (
            <div className="mt-6">
              <Badge className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50">
                {event.category}
              </Badge>
            </div>
          )}
        </div>

        {event.socialLinks && Object.values(event.socialLinks).some((v) => typeof v === 'string' && v.trim() !== '') && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">FOLLOW</h2>
            <div className="flex flex-wrap gap-3">
              {hasSocial(event.socialLinks.website) && (
                <a
                  href={normalizeExternalUrl(event.socialLinks.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  <Globe className="h-4 w-4" />
                  Website
                </a>
              )}
              {hasSocial(event.socialLinks.instagram) && (
                <a
                  href={normalizeExternalUrl(event.socialLinks.instagram)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-pink-600 hover:bg-pink-50"
                >
                  <Instagram className="h-4 w-4" />
                  Instagram
                </a>
              )}
              {hasSocial(event.socialLinks.facebook) && (
                <a
                  href={normalizeExternalUrl(event.socialLinks.facebook)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
                >
                  <Facebook className="h-4 w-4" />
                  Facebook
                </a>
              )}
              {hasSocial(event.socialLinks.twitter) && (
                <a
                  href={normalizeExternalUrl(event.socialLinks.twitter)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                >
                  <Twitter className="h-4 w-4" />
                  X
                </a>
              )}
              {hasSocial(event.socialLinks.youtube) && (
                <a
                  href={normalizeExternalUrl(event.socialLinks.youtube)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <Youtube className="h-4 w-4" />
                  YouTube
                </a>
              )}
            </div>
          </div>
        )}

        {/* Venue Section with Map */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">VENUE DETAILS</h2>
            <div className="space-y-2 text-sm">

              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium">{event.location.address}</p>
                  <p className="text-gray-600">{event.location.city}, {event.location.state}</p>
                </div>
              </div>
            </div>
            <Button
              variant="link"
              className="text-blue-600 hover:text-blue-700 p-0 mt-2"
              asChild
            >
              <a
                href={`https://www.google.com/maps?q=${encodeURIComponent(
                  event.location.address
                )}+${encodeURIComponent(event.location.city)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Directions
              </a>
            </Button>
          </div>
          <div className="relative h-64 rounded-xl overflow-hidden shadow-md">
            {/* Google Map */}
            <iframe
              title="Event Location"
              className="absolute inset-0 w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${encodeURIComponent(
                `${event.location.address}, ${event.location.city}`
              )}&output=embed`}
            />

            {/* Overlay card */}
            <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-md rounded-lg px-4 py-3 shadow-lg flex items-center justify-between gap-3">
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">
                  {event.location.address}
                </p>
                <p className="text-xs text-gray-500">
                  {event.location.city}
                </p>
              </div>

              <Button size="sm" className="shrink-0" asChild>
                <a
                  href={`https://www.google.com/maps?q=${encodeURIComponent(
                    `${event.location.address}, ${event.location.city}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Directions
                </a>
              </Button>
            </div>
          </div>

        </div>

        {/* Terms & Conditions */}
        <div className="mb-8">
          <button
            onClick={() => setShowTerms(!showTerms)}
            className="w-full flex items-center justify-between py-4 border-t border-b border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-xl font-bold">TERMS & CONDITIONS</h2>
            <ChevronDown
              className={`h-5 w-5 transition-transform ${showTerms ? "rotate-180" : ""
                }`}
            />
          </button>
          {showTerms && (
            <div className="py-4 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {event.termsAndConditions || "N/A"}
            </div>
          )}
        </div>

        {/* You Might Also Like Section */}
        {relatedEvents.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">YOU MIGHT ALSO LIKE</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full bg-gray-100 hover:bg-gray-200"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full bg-gray-100 hover:bg-gray-200"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {relatedEvents.map((relatedEvent) => (
                <EventCard key={relatedEvent.id} event={relatedEvent} />
              ))}
            </div>
          </div>
        )}


        {/* Event Details Footer */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg mb-1">{event.title}</h3>
              <p className="text-sm text-gray-600">
                {startDateTime.date} | {startDateTime.time}
              </p>
            </div>
            <Button
              onClick={handleBuyNowClick}
              className="bg-black text-white hover:bg-gray-800 font-semibold px-8 py-6 rounded-lg"
            >
              Book Now
            </Button>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Book Now Button (Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:hidden z-50">
        <Button
          onClick={handleBuyNowClick}
          className="w-full bg-black text-white hover:bg-gray-800 font-semibold py-6 rounded-lg text-lg"
        >
          Book Now
          <span className="ml-4">{priceRange}</span>
        </Button>
      </div>

      <Footer />
    </div>
  );
}