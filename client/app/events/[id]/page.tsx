"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import {
  Minus,
  Plus,
  Loader2,
  ArrowLeft,
  MapPin,
  Clock,
  Calendar as CalendarIcon,
  Share2,
  Heart,
  Star,
  Ticket as TicketIcon,
  X,
  XCircle,
  Crown,
  Sparkles,
  MapIcon,
  Users,
  Shield,
  CheckCircle2,
  Timer,
  Zap,
  Info,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AspectRatio } from "@/components/ui/aspect-ratio";

// UI Components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// App Components - Using dynamic imports to avoid SSR issues
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";

// Event Card Component (simplified for related events)
const EventCard = ({
  event,
}: {
  event: { id: string; title: string; date: string; image: string };
}) => (
  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
    <div className="relative aspect-video">
      <Image
        src={event.image}
        alt={event.title}
        fill
        className="object-cover"
      />
    </div>
    <CardContent className="p-4">
      <h3 className="font-semibold line-clamp-2">{event.title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{event.date}</p>
      <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
        <Link href={`/events/${event.id}`}>View Details</Link>
      </Button>
    </CardContent>
  </Card>
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
  gallery: string[];
  organizer: EventOrganizer | null;
  artists: any[];
  startDate: string;
  endDate: string;
  category: string;
  tags: string[];
  ticketTypes: TicketType[];
  location: EventLocation;
  convenience: ConvenienceFee;
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
  discounts: any[];
  reviews: any[];
  updatedAt: string;
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
  [key: string]: any; // Allow other properties
}
interface BookingDetails {
  _id: string;
  event: string;
  ticket: string;
  quantity: number;
  price: number;
  total: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: object;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<Map<string, { ticket: TicketType; quantity: number }>>(new Map());
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [bookingDetails, setBookingDetails] = useState<any | null>(null);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [prohibitedItemsModalOpen, setProhibitedItemsModalOpen] = useState(false);
  const summaryRef = useRef<HTMLDivElement | null>(null);

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

  const [isBooking, setIsBooking] = useState(false);

  const handleBooking = async () => {
    if (selectedTickets.size === 0) {
      toast.error("Please select at least one ticket type");
      return;
    }
    if (!event || !event._id) {
      toast.error("Event information is missing");
      return;
    }

    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token || !user) {
      toast.error("You must be logged in to book tickets");
      router.push("/auth?redirect=" + encodeURIComponent(window.location.pathname));
      return;
    }

    setIsBooking(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Please log in to book tickets");
      }

      const totalAmount = Array.from(selectedTickets.values()).reduce((sum, item) => {
        return sum + (item.ticket.price * item.quantity);
      }, 0);

      // 1. Create Order (send bookingDetails so backend can recover via webhook if needed)
      const orderResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/payments/create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: totalAmount,
            currency: "INR",
            receipt: `receipt_event_${event._id}`,
            bookingDetails: {
              event: event,
              user: user,
              tickets: Array.from(selectedTickets.values()).map(item => ({
                ticketType: item.ticket.name,
                quantity: item.quantity,
                price: item.ticket.price,
              })),
            },
          }),
        }
      );

      const orderData = await orderResponse.json();
      if (!orderResponse.ok) {
        throw new Error(orderData.message || "Failed to create payment order");
      }

      // 2. Open Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Ahibi",
        description: `Booking for ${event.title}`,
        image: "/logo.png",
        order_id: orderData.id,
        handler: async function (response: RazorpayResponse) {
          try {
            console.log("Razorpay payment response received:", response);

            // Log request being sent to server
            const requestBody = {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              bookingDetails: {
                event: event,
                user: user,
                tickets: Array.from(selectedTickets.values()).map(item => ({
                  ticketType: item.ticket.name,
                  quantity: item.quantity,
                  price: item.ticket.price,
                })),
              },
            };

            console.log("Sending verification request to:",
              `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/payments/verify-payment`);
            console.log("With request body:", requestBody);

            // 3. Verify Payment
            const verificationResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/payments/verify-payment`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(requestBody),
              }
            );

            // Log the response status
            console.log("Verification API response status:", verificationResponse.status);

            const verificationData = await verificationResponse.json();
            console.log("Verification API response data:", verificationData);

            if (verificationResponse.ok && verificationData.success) {
              toast.success("Booking confirmed!");
              localStorage.setItem('lastBookingId', verificationData.booking._id);

              // Log the navigation
              console.log(`Navigating to: /events/${verificationData.booking._id}/bookings`);
              router.push(`/events/${verificationData.booking._id}/bookings`);
            } else {
              console.error("Payment verification failed:", verificationData);
              toast.error(verificationData.message || "Payment verification failed");
            }
          } catch (error) {
            console.error("Error in payment handler:", error);
            toast.error("An error occurred while processing your payment. Please contact support.");
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone,
        },
        notes: {
          address: "Ahibi Corporate Office",
        },
        theme: {
          color: "#3399cc",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error("Booking error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to book ticket";
      toast.error(errorMessage);
      if (
        errorMessage.includes("auth") ||
        errorMessage.includes("login") ||
        errorMessage.includes("token")
      ) {
        router.push(
          "/auth?redirect=" + encodeURIComponent(window.location.pathname)
        );
      }
    } finally {
      setIsBooking(false);
    }
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
            // Authentication error - redirect to login
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
          // Do not preselect tickets. User will choose quantities manually.
        }
      } catch (err) {
        console.error("Error fetching event:", err);
        const errorMsg = err instanceof Error ? err.message : "Failed to load event";

        // Check if the error is token related
        if (errorMsg.toLowerCase().includes("token") ||
          errorMsg.toLowerCase().includes("auth") ||
          errorMsg.toLowerCase().includes("login")) {
          toast.error("Please log in to view event details");
          router.push("/auth?redirect=" + encodeURIComponent(window.location.pathname));
          return;
        }

        if (isMounted) {
          setError(errorMsg);
          // If it's a 404 or 403 error, redirect to events page after a delay
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

        // If no token exists, don't show an error - just don't set the user
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
          // Don't show token errors on screen
          if (data.message?.toLowerCase().includes("token") ||
            data.message?.toLowerCase().includes("auth") ||
            res.status === 401) {
            console.log("Auth error in profile fetch:", data.message);
            localStorage.removeItem("token"); // Clear invalid token
            return; // Don't set error - this avoids showing auth errors on screen
          }
          console.log("Non-auth error in profile fetch:", data.message);
        } else {
          setUser(data.data.user);
        }
      } catch (e) {
        console.error("Profile fetch error:", e);
        // Don't set error for profile fetch issues - this prevents error display
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-xl opacity-50"></div>
            <Loader2 className="h-12 w-12 animate-spin text-white relative z-10" />
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-white mb-2">Loading Event</p>
            <p className="text-slate-300">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Event Unavailable</h2>
            <p className="text-slate-300 mb-6">{error || "Invalid event data received"}</p>
            <div className="space-y-3">
              <Button
                onClick={() => window.location.reload()}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-full"
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/events')}
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-full"
              >
                Browse All Events
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-full"
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
  const isSpecial = params.id === "68bc6cdf40915f05c90380d4";

  // Customized UI for a specific event ID while preserving booking logic
  if (isSpecial) {
    return (
    <>
        <Navbar />
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-black via-red-950 to-black relative overflow-hidden">
        {/* Urban Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 text-red-500 text-9xl font-black transform -rotate-12">♪</div>
          <div className="absolute top-32 right-20 text-red-400 text-6xl font-black transform rotate-45">🎤</div>
          <div className="absolute bottom-20 left-1/4 text-red-600 text-7xl font-black transform -rotate-45">🎵</div>
          <div className="absolute bottom-40 right-10 text-orange-500 text-8xl font-black transform rotate-12">♫</div>
        </div>
        
        <div className="w-full relative z-10">
          {/* Premium Hip Hop Hero Section */}
          <div className="relative overflow-hidden">
            {/* Graffiti-style background elements */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-black/60 to-orange-600/20 z-10" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50 z-20" />
            
            <AspectRatio ratio={16 / 9} className="relative">
              <Image
                src={event.banner || "/placeholder.svg"}
                alt={event.title}
                fill
                priority
                className="object-cover filter brightness-110 contrast-125"
              />
            </AspectRatio>
            
            {/* Urban overlay elements */}
            <div className="absolute top-0 left-0 w-full h-full z-30">
              <div className="absolute top-4 left-4 w-16 h-16 border-4 border-orange-500 rounded-full animate-pulse" />
              <div className="absolute top-8 right-8 w-12 h-12 bg-orange-500/30 backdrop-blur rounded-lg rotate-45" />
              <div className="absolute bottom-4 left-8 w-20 h-1 bg-gradient-to-r from-orange-500 to-transparent" />
            </div>
            
            <div className="absolute inset-0 z-40 flex items-end">
              <div className="container mx-auto px-4 pb-12">
                <div className="max-w-5xl">
                  {/* Festival Badge */}
                  <div className="mb-6">
                    <div className="inline-flex items-center gap-3 bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 rounded-full shadow-2xl">
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                      <span className="text-black font-black text-sm uppercase tracking-wider">Hip Hop & R&B Festival</span>
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    </div>
                  </div>
                  
                  {/* Main Title with Urban Typography */}
                  <h1 className="text-5xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-200 to-orange-400 drop-shadow-2xl leading-tight tracking-tight mb-4 transform hover:scale-105 transition-transform duration-300">
                    {event.title}
                  </h1>
                  
                  {/* Subtitle with street style */}
                  <div className="text-xl md:text-2xl font-bold text-orange-300 mb-6 tracking-wide">
                    🔥 WHERE BEATS MEET THE STREETS 🔥
                  </div>
                  
                  {/* Event Details with Urban Cards */}
                  <div className="flex flex-wrap gap-4 text-white/90">
                    <div className="bg-black/60 backdrop-blur-xl border-2 border-orange-500/50 rounded-2xl px-6 py-4 shadow-2xl hover:border-orange-400 transition-colors">
                      <div className="flex items-center gap-3">
                        <CalendarIcon className="h-6 w-6 text-orange-400" />
                        <div>
                          <div className="text-orange-300 text-xs font-bold uppercase">Date</div>
                          <div className="text-white font-bold">{startDateTime.date}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-black/60 backdrop-blur-xl border-2 border-orange-500/50 rounded-2xl px-6 py-4 shadow-2xl hover:border-orange-400 transition-colors">
                      <div className="flex items-center gap-3">
                        <Clock className="h-6 w-6 text-orange-400" />
                        <div>
                          <div className="text-orange-300 text-xs font-bold uppercase">Time</div>
                          <div className="text-white font-bold">{timeRange}</div>
                        </div>
                      </div>
                    </div>
                    
                    {event.category && (
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl px-6 py-4 shadow-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                            <span className="text-orange-600 text-xs font-black">♪</span>
                          </div>
                          <div>
                            <div className="text-orange-100 text-xs font-bold uppercase">Genre</div>
                            <div className="text-white font-black">{event.category}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Premium Hip Hop Content Section */}
          <div className="container mx-auto px-4 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12 flex-1">
            {/* Left - Details with Urban Style */}
            <div className="lg:col-span-2 space-y-8">
              {/* About Section with Graffiti Style */}
              <div className="relative rounded-3xl border-2 border-orange-500/30 bg-gradient-to-br from-black/80 via-orange-950/20 to-black/80 backdrop-blur-xl p-8 shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-600/10 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-white text-xl font-black">🎤</span>
                    </div>
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-200 uppercase tracking-wide">About the Festival</h2>
                  </div>
                  <p className="text-orange-100 leading-relaxed text-lg whitespace-pre-line font-medium">
                    {event.description}
                  </p>
                  
                  {/* Hip Hop Elements */}
                  <div className="mt-8 flex flex-wrap gap-3">
                    <div className="bg-orange-500/20 border border-orange-400/50 rounded-full px-4 py-2 text-orange-300 text-sm font-bold">
                      🎵 Live Performances
                    </div>
                    <div className="bg-orange-500/20 border border-orange-400/50 rounded-full px-4 py-2 text-orange-300 text-sm font-bold">
                      🔥 Street Food
                    </div>
                    <div className="bg-orange-500/20 border border-orange-400/50 rounded-full px-4 py-2 text-orange-300 text-sm font-bold">
                      💫 Urban Culture
                    </div>
                  </div>
                </div>
              </div>

              {/* Location with Street Style */}
              <div className="relative rounded-3xl border-2 border-orange-500/30 bg-gradient-to-br from-black/80 via-orange-950/20 to-black/80 backdrop-blur-xl p-8 shadow-2xl overflow-hidden">
                <div className="absolute top-0 left-0 w-28 h-28 bg-orange-400/10 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-200 uppercase tracking-wide">The Venue</h2>
                  </div>
                  
                  <div className="bg-black/40 rounded-2xl p-6 border border-orange-500/20">
                    <div className="flex items-start gap-6">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/30 to-orange-600/30 backdrop-blur">
                        <MapPin className="h-8 w-8 text-orange-300" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-bold text-xl mb-2">
                          {event.location.address || "Premium Venue - Details Coming Soon"}
                        </p>
                        <p className="text-orange-200 text-lg">
                          {[event.location.city, event.location.state, event.location.country].filter(Boolean).join(", ")}
                        </p>
                        <div className="mt-4 inline-flex items-center gap-2 bg-orange-500/20 rounded-full px-4 py-2 text-orange-300 text-sm font-bold">
                          📍 Premium Location with Full Facilities
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags with Hip Hop Style */}
              {event.tags?.length ? (
                <div className="relative rounded-3xl border-2 border-orange-500/30 bg-gradient-to-br from-black/80 via-orange-950/20 to-black/80 backdrop-blur-xl p-8 shadow-2xl overflow-hidden">
                  <div className="absolute bottom-0 right-0 w-36 h-36 bg-orange-500/10 rounded-full blur-3xl" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-white text-xl font-black">#</span>
                      </div>
                      <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-200 uppercase tracking-wide">Festival Vibes</h2>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {event.tags.map((t) => (
                        <div key={t} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border-2 border-orange-400/50">
                          #{t.toUpperCase()}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Premium Hip Hop Tickets Section */}
            <div className="space-y-8">
              {/* VIP Ticket Section with Urban Design */}
              <div className="relative rounded-3xl border-3 border-orange-500/50 bg-gradient-to-br from-black/90 via-orange-950/30 to-black/90 backdrop-blur-xl p-8 shadow-2xl overflow-hidden">
                {/* Background Elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-600/10 rounded-full blur-2xl" />
                
                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl">
                        <TicketIcon className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-200 uppercase tracking-wide">Get Your Pass</h3>
                        <p className="text-orange-300 text-sm font-bold">🔥 Limited Spots Available</p>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl px-4 py-2 shadow-lg">
                      <div className="text-white font-black text-sm">
                        {event.ticketTypes?.reduce((acc, t) => acc + (t.quantity - t.sold), 0) || 0} LEFT
                      </div>
                    </div>
                  </div>

                  {event.ticketTypes && event.ticketTypes.length > 0 ? (
                    <div className="space-y-6">
                      {event.ticketTypes.map((ticket) => {
                        const availability = Math.max(0, ticket.quantity - ticket.sold);
                        const isSoldOut = availability <= 0;
                        const selectedItem = selectedTickets.get(ticket._id);
                        const quantity = selectedItem?.quantity || 0;
                        return (
                          <div key={ticket._id} className={`relative rounded-2xl border-2 border-orange-500/30 bg-gradient-to-r from-black/60 to-orange-950/20 backdrop-blur p-6 shadow-xl transition-all duration-300 hover:border-orange-400/60 hover:shadow-2xl ${isSoldOut ? "opacity-50" : ""} ${quantity > 0 ? "border-orange-400 bg-gradient-to-r from-orange-500/10 to-orange-600/10" : ""}`}>
                            {/* Ticket Design Elements */}
                            <div className="absolute top-2 right-2 w-6 h-6 bg-orange-500/20 rounded-full" />
                            <div className="absolute bottom-2 left-2 w-4 h-4 bg-orange-600/20 rounded-full" />
                            
                            <div className="flex items-start justify-between gap-6">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                                    <span className="text-white text-lg font-black">🎫</span>
                                  </div>
                                  <div>
                                    <p className="text-xl font-black text-white uppercase tracking-wide">{ticket.name}</p>
                                    <p className="text-orange-300 text-sm font-bold">{ticket.description}</p>
                                  </div>
                                </div>
                                
                                {/* Availability Bar */}
                                <div className="mb-4">
                                  <div className="flex items-center justify-between text-xs mb-2">
                                    <span className="text-orange-300 font-bold">AVAILABILITY</span>
                                    <span className="text-white font-bold">{availability} / {ticket.quantity}</span>
                                  </div>
                                  <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500"
                                      style={{ width: `${(availability / ticket.quantity) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-200 mb-4">
                                  ₹{ticket.price.toLocaleString()}
                                </div>
                                
                                {/* Quantity Controls */}
                                <div className="flex items-center justify-end gap-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={quantity <= 0}
                                    className="w-10 h-10 p-0 rounded-xl border-2 border-orange-500/50 bg-black/40 text-orange-300 hover:bg-orange-500/20 hover:border-orange-400 transition-all"
                                    onClick={() => {
                                      if (quantity > 0) {
                                        const newQuantity = quantity - 1;
                                        if (newQuantity === 0) {
                                          setSelectedTickets((prev) => {
                                            const m = new Map(prev);
                                            m.delete(ticket._id);
                                            return m;
                                          });
                                        } else {
                                          setSelectedTickets((prev) => new Map(prev).set(ticket._id, { ticket, quantity: newQuantity }));
                                        }
                                      }
                                    }}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  
                                  <div className="w-12 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <span className="text-white font-black text-lg">{quantity}</span>
                                  </div>
                                  
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isSoldOut || quantity >= availability}
                                    className="w-10 h-10 p-0 rounded-xl border-2 border-orange-500/50 bg-black/40 text-orange-300 hover:bg-orange-500/20 hover:border-orange-400 transition-all"
                                    onClick={() => {
                                      const newQuantity = quantity + 1;
                                      if (newQuantity <= availability) {
                                        setSelectedTickets((prev) => new Map(prev).set(ticket._id, { ticket, quantity: newQuantity }));
                                      }
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Checkout Section */}
                      {selectedTickets.size > 0 && (
                        <div className="relative rounded-3xl border-3 border-orange-400/60 bg-gradient-to-br from-orange-500/20 via-black/80 to-orange-600/20 backdrop-blur-xl p-8 shadow-2xl overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-orange-500/10 to-orange-600/10 rounded-3xl" />
                          <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                                  <span className="text-white text-xl font-black">💳</span>
                                </div>
                                <div>
                                  <div className="text-2xl font-black text-white uppercase tracking-wide">Total</div>
                                  <div className="text-orange-300 text-sm font-bold">
                                    {Array.from(selectedTickets.values()).reduce((sum, item) => sum + item.quantity, 0)} Ticket{Array.from(selectedTickets.values()).reduce((sum, item) => sum + item.quantity, 0) > 1 ? "s" : ""} Selected
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-200">
                                  ₹{Array.from(selectedTickets.values()).reduce((s, i) => s + i.ticket.price * i.quantity, 0).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            
                            <Button 
                              className="w-full h-16 text-xl font-black bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-2xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 uppercase tracking-wide" 
                              onClick={handleBooking} 
                              disabled={isBooking}
                            >
                              {isBooking ? (
                                <>
                                  <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                                  Processing Payment...
                                </>
                              ) : (
                                <>
                                  🎫 Secure Your Spot Now
                                </>
                              )}
                            </Button>
                            
                            <div className="mt-4 text-center text-orange-300 text-sm font-bold">
                              🔒 Secure Payment • Instant Confirmation
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-orange-300 text-xl font-bold">🎫 Tickets Coming Soon</div>
                      <div className="text-orange-400 text-sm mt-2">Stay tuned for ticket release!</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Premium Organizer Section */}
              {event.organizer && (
                <div className="relative rounded-3xl border-2 border-orange-500/30 bg-gradient-to-br from-black/80 via-orange-950/20 to-black/80 backdrop-blur-xl p-8 shadow-2xl overflow-hidden">
                  <div className="absolute top-0 right-0 w-28 h-28 bg-orange-500/10 rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Crown className="h-6 w-6 text-white" />
                      </div>
                      <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-200 uppercase tracking-wide">Event Organizer</h2>
                    </div>
                    
                    <div className="bg-black/40 rounded-2xl p-6 border border-orange-500/20">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border-3 border-orange-500/50 shadow-xl">
                          {event.organizer.avatar ? (
                            <AvatarImage src={event.organizer.avatar} alt={event.organizer.name} />
                          ) : (
                            <AvatarFallback className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black text-xl">
                              {event.organizer.name.charAt(0)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1">
                          <div className="text-xl font-black text-white mb-1">{event.organizer.name}</div>
                          {event.organizer.rating && (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-orange-500/20 rounded-full px-3 py-1">
                                <Star className="h-4 w-4 text-orange-400 fill-current" />
                                <span className="text-orange-300 font-bold text-sm">{event.organizer.rating.toFixed(1)}</span>
                              </div>
                            </div>
                          )}
                          <div className="mt-2 text-orange-300 text-sm font-bold">
                            🎪 Premium Event Producer
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      
      </div>
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navbar />

      {/* Premium Information Banner */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20"></div>
        <div className="container mx-auto p-4 relative z-10">
          <div className="bg-amber-500/10 backdrop-blur-xl border-l-4 border-amber-400 rounded-2xl p-6 border border-amber-400/30">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 bg-amber-400/20 rounded-full p-2">
                <Shield className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="text-amber-100 font-semibold mb-2">Payment done but ticket missing?</p>
                <p className="text-amber-200/90 text-sm leading-relaxed">
                  No worries—your ticket will appear within a few hours in your Dashboard. If not, contact us via WhatsApp or Email.   </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            {/* Premium Hero Image */}
            <div className="relative group">
              <div className="absolute  rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
              <AspectRatio ratio={16 / 9} className="relative rounded-2xl overflow-hidden">
                <Image
                  src={event.banner || "/placeholder.svg"}
                  alt={event.title}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                  priority
                />
                {/* <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div> */}

                
              </AspectRatio>
            </div>

            {/* Premium Event Info */}
            <div className="space-y-8">
              <div>
                <h1 className="text-6xl font-black tracking-tighter mb-6 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent leading-tight">
                  {event.title}
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="bg-purple-500/20 rounded-full p-3">
                        <CalendarIcon className="h-6 w-6 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm font-medium">DATE</p>
                        <p className="text-white font-semibold text-lg">
                          {startDateTime.date}
                          {endDateTime && (
                            <>
                              <span className="mx-2 text-slate-400">→</span>
                              <span>{endDateTime.date}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="bg-pink-500/20 rounded-full p-3">
                        <Clock className="h-6 w-6 text-pink-400" />
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm font-medium">TIME</p>
                        <p className="text-white font-semibold text-lg">{timeRange}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-8">
                  <div className="h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent flex-1"></div>
                  <Badge variant="outline" className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-400/30 text-purple-200 px-4 py-2">
                    {event.category}
                  </Badge>
                  <div className="h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent flex-1"></div>
                </div>
              </div>

              {/* Premium Description */}
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
                <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  About This Event
                </h2>
                <div className="prose prose-invert max-w-none">
                  <p className="text-slate-200 text-lg leading-relaxed whitespace-pre-line">
                    {event.description}
                  </p>
                </div>
              </div>

              {/* Premium Location */}
              {/* <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
                <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Venue Details
                </h2>
                <div className="flex items-start gap-6">
                  <div className="bg-blue-500/20 rounded-2xl p-4">
                    <MapPin className="h-8 w-8 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-xl text-white mb-2">{event.location.address}</h3>
                    <p className="text-slate-300 text-lg mb-4">
                      {[
                        event.location.city,
                        event.location.state,
                        event.location.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    {event.location.coordinates && (
                      <Button
                        variant="outline"
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-full px-6"
                        asChild
                      >
                        <a
                          href={`https://www.google.com/maps?q=${encodeURIComponent(
                            event.location.address
                          )}+${encodeURIComponent(event.location.city)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MapIcon className="h-4 w-4 mr-2" />
                          View on Map
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div> */}
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
                <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Location & Venue
                </h2>

                <div className="flex items-center gap-5 p-6 rounded-2xl bg-gradient-to-r from-purple-50/5 to-pink-50/5 border border-white/10 shadow-inner">
                  {/* Icon */}
                  <div className="p-3 bg-gradient-to-br from-green-100 to-teal-100 rounded-2xl shadow-md">
                    <MapPin className="h-7 w-7 text-green-700" />
                  </div>

                  {/* Address details */}
                  <div className="flex-1">
                    <p className="text-xl font-semibold text-white">
                      {event.location.address || "Town Hall"}
                    </p>
                    <p className="text-gray-300 text-sm">
                      {[
                        event.location.city,
                        event.location.state,
                        event.location.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>

                    {/* Google Maps Button */}
                    {event.location.coordinates && (
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          className="px-4 py-2 text-sm font-medium rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-all duration-200"
                          asChild
                        >
                          <a
                            href={`https://www.google.com/maps?q=${encodeURIComponent(
                              event.location.address
                            )}+${encodeURIComponent(event.location.city)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View on Google Maps
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>


              {/* Premium Tags */}
              {event.tags && event.tags.length > 0 && (
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
                  <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                    Events Tags
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {event.tags.map((tag: string) => (
                      <Badge
                        key={tag}
                        className="bg-gradient-to-r from-slate-700 to-slate-600 text-white border-slate-500 px-4 py-2 text-sm font-medium hover:from-slate-600 hover:to-slate-500 transition-all duration-300"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Premium Sidebar */}
          <div className="space-y-8">
            {/* Premium Tickets Section */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">


              {event.ticketTypes && event.ticketTypes.length > 0 ? (
                <div className="space-y-6">
                  {/* Enhanced Ticket Selection Header */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Select Tickets</h3>
                      <p className="text-sm text-gray-600">Choose your preferred ticket type</p>
                    </div>
                    <Badge variant="outline" className="px-4 py-2 bg-white border-2">
                      <Users className="h-4 w-4 mr-1" />
                      {event.ticketTypes.reduce((acc, t) => acc + (t.quantity - t.sold), 0)} available
                    </Badge>
                  </div>

                  {/* Enhanced Ticket Types */}
                  {event.ticketTypes.map((ticket) => {
                    // Calculate availability percentage
                    const availabilityPercentage = Math.max(
                      0,
                      Math.min(100, ((ticket.quantity - ticket.sold) / ticket.quantity) * 100)
                    );

                    // Determine status badge
                    const isSoldOut = ticket.quantity <= ticket.sold;
                    const isLimited = availabilityPercentage <= 20 && !isSoldOut;
                    const selectedItem = selectedTickets.get(ticket._id);
                    const quantity = selectedItem?.quantity || 0;

                    return (
                      <Card
                        key={ticket._id}
                        className={`border-2 transition-all duration-300 hover:shadow-xl ${quantity > 0
                            ? 'border-primary shadow-lg ring-4 ring-primary/10'
                            : isSoldOut
                              ? 'border-gray-200 bg-gray-50'
                              : 'border-gray-200 hover:border-primary/50'
                          } overflow-hidden`}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className={`p-3 rounded-lg transition-colors ${isSoldOut
                                  ? 'bg-gray-100'
                                  : quantity > 0
                                    ? 'bg-gradient-to-r from-primary/10 to-primary/20'
                                    : 'bg-gray-50 hover:bg-primary/10'
                                }`}>
                                <TicketIcon className={`h-6 w-6 ${isSoldOut
                                    ? 'text-gray-400'
                                    : quantity > 0
                                      ? 'text-primary'
                                      : 'text-gray-600'
                                  }`} />
                              </div>
                              <div>
                                <CardTitle className="text-xl">{ticket.name}</CardTitle>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {isSoldOut && (
                                    <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                                      Sold Out
                                    </Badge>
                                  )}
                                  {isLimited && !isSoldOut && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 animate-pulse">
                                      Limited Availability
                                    </Badge>
                                  )}
                                  {quantity > 0 && (
                                    <Badge className="bg-primary text-primary-foreground animate-in">
                                      {quantity} selected
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-3xl font-bold text-primary">₹{ticket.price}</span>
                              <p className="text-sm text-gray-500">per ticket</p>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent>
                          <p className="text-gray-600 mb-4 leading-relaxed">
                            {ticket.description}
                          </p>

                          <div className="flex items-center gap-2 mb-4">
                            <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                              <Users className="h-3 w-3 mr-1" />
                              {ticket.capacity} person capacity
                            </Badge>
                          </div>

                          {/* Enhanced Benefits list */}
                          {ticket.benefits && ticket.benefits.length > 0 && (
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-4 border border-blue-100">
                              <p className="text-sm font-bold mb-3 text-blue-800 flex items-center">
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                WHAT'S INCLUDED:
                              </p>
                              <ul className="space-y-2">
                                {ticket.benefits.map((benefit: string, i: number) => (
                                  <li key={i} className="flex items-center gap-3 text-sm">
                                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex-shrink-0"></div>
                                    <span className="text-gray-700 font-medium">{benefit}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Enhanced Availability indicator */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className={`font-bold flex items-center gap-1 ${isSoldOut
                                  ? 'text-red-600'
                                  : isLimited
                                    ? 'text-amber-600'
                                    : 'text-green-600'
                                }`}>
                                {isSoldOut ? (
                                  <>
                                    <XCircle className="h-4 w-4" />
                                    Sold Out
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    {ticket.quantity - ticket.sold} remaining
                                  </>
                                )}
                              </span>
                              <span className="text-gray-500 text-xs">
                                {ticket.sold} / {ticket.quantity} sold
                              </span>
                            </div>
                            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${isSoldOut
                                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                                    : isLimited
                                      ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                      : 'bg-gradient-to-r from-green-500 to-blue-500'
                                  }`}
                                style={{ width: `${100 - availabilityPercentage}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Quantity Selector */}
                          {/* Enhanced Quantity Selector */}
                          {!isSoldOut && (
                            <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <span className="font-bold text-gray-800">Quantity</span>
                                <div className="text-right">
                                  <span className="text-sm text-gray-600">Total: </span>
                                  <span className="text-lg font-bold text-primary">
                                    ₹{(ticket.price * quantity).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center justify-center gap-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (quantity > 0) {
                                      const newQuantity = quantity - 1;
                                      if (newQuantity === 0) {
                                        setSelectedTickets(prev => {
                                          const newMap = new Map(prev);
                                          newMap.delete(ticket._id);
                                          return newMap;
                                        });
                                      } else {
                                        setSelectedTickets(prev => new Map(prev).set(ticket._id, { ticket, quantity: newQuantity }));
                                      }
                                    }
                                  }}
                                  disabled={quantity <= 0}
                                  className="h-10 w-10 p-0 rounded-full hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                                >
                                  <Minus className="h-5 w-5" />
                                </Button>
                                <div className="px-6 py-2 bg-white rounded-lg border-2 border-primary/20 min-w-[4rem] text-center">
                                  <span className="text-2xl font-bold text-primary">
                                    {quantity}
                                  </span>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newQuantity = quantity + 1;
                                    if (newQuantity <= ticket.quantity - ticket.sold) {
                                      setSelectedTickets(prev => new Map(prev).set(ticket._id, { ticket, quantity: newQuantity }));
                                      if (newQuantity === 1) {
                                        setTimeout(() => {
                                          summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }, 100);
                                      }
                                    }
                                  }}
                                  disabled={quantity >= ticket.quantity - ticket.sold}
                                  className="h-10 w-10 p-0 rounded-full hover:bg-green-50 hover:border-green-300 hover:text-green-600 transition-colors"
                                >
                                  <Plus className="h-5 w-5" />
                                </Button>
                              </div>
                              <div className="text-xs text-gray-500 text-center mt-3 flex items-center justify-center gap-1">
                                <Info className="h-3 w-3" />
                                Maximum {ticket.quantity - ticket.sold} tickets per booking
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Booking Summary */}
                  {selectedTickets.size > 0 && (
                    <div ref={summaryRef} className="animate-in slide-in-from-bottom-4">
                      <Card className="border-2 border-primary shadow-xl bg-gradient-to-r from-blue-50 to-purple-50">
                        <CardHeader className="bg-gradient-to-r from-primary to-primary/90 text-white">
                          <CardTitle className="text-2xl flex items-center">
                            <TicketIcon className="h-6 w-6 mr-2" />
                            Booking Summary
                          </CardTitle>
                          <CardDescription className="text-primary-foreground/80">
                            Review your ticket selection
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            {Array.from(selectedTickets.values()).map((item) => (
                              <div key={item.ticket._id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-primary/10 rounded-lg">
                                    <TicketIcon className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <span className="font-bold text-gray-900">{item.ticket.name}</span>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <span>Quantity: {item.quantity}</span>
                                      <span>•</span>
                                      <span>₹{item.ticket.price} each</span>
                                    </div>
                                  </div>
                                </div>
                                <span className="text-xl font-bold text-primary">
                                  ₹{(item.ticket.price * item.quantity).toLocaleString()}
                                </span>
                              </div>
                            ))}
                            <div className="border-t-2 border-dashed border-gray-300 pt-4">
                              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-primary/5 to-purple/5 rounded-lg">
                                <div>
                                  <span className="text-2xl font-bold text-gray-900">Grand Total</span>
                                  <p className="text-sm text-gray-600">
                                    {Array.from(selectedTickets.values()).reduce((sum, item) => sum + item.quantity, 0)} ticket(s)
                                  </p>
                                </div>
                                <span className="text-4xl font-bold text-primary">
                                  ₹{Array.from(selectedTickets.values()).reduce((sum, item) => sum + (item.ticket.price * item.quantity), 0).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="p-6 pt-0">
                          <Button
                            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
                            onClick={handleBooking}
                            disabled={isBooking}
                          >
                            {isBooking ? (
                              <>
                                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                Processing Payment...
                              </>
                            ) : (
                              <>
                                <TicketIcon className="mr-3 h-5 w-5" />
                                Book {Array.from(selectedTickets.values()).reduce((sum, item) => sum + item.quantity, 0)} Ticket{Array.from(selectedTickets.values()).reduce((sum, item) => sum + item.quantity, 0) > 1 ? 's' : ''}
                              </>
                            )}
                          </Button>
                        </CardFooter>
                      </Card>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="bg-muted/30 inline-flex rounded-full p-3 mb-4">
                    <TicketIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No tickets available for this event</p>
                </div>
              )}
            </div>

            {/* Organizer */}
            {event.organizer && (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h2 className="text-2xl font-semibold mb-4">Organizer</h2>
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 bg-muted">
                    {event.organizer.avatar ? (
                      <AvatarImage
                        src={event.organizer.avatar}
                        alt={event.organizer.name}
                      />
                    ) : (
                      <AvatarFallback>
                        {event.organizer.name.charAt(0)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{event.organizer.name}</h3>
                    {event.organizer.rating && (
                      <div className="flex items-center mt-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current mr-1" />
                        <span className="text-sm text-muted-foreground">
                          {event.organizer.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function Label({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <label
      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className || ""
        }`}
      {...props}
    >
      {children}
    </label>
  );
}
