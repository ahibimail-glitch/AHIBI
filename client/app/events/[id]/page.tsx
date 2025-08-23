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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-400 via-white to-purple-400 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Event Not Available</h2>
            <p className="text-gray-600 mb-6">{error || "Invalid event data received"}</p>
            <div className="space-y-3">
              <Button onClick={() => window.location.reload()} className="w-full">
                Try Again
              </Button>
              <Button variant="outline" onClick={() => router.push('/events')} className="w-full">
                Browse All Events
              </Button>
              <Button variant="outline" onClick={() => router.push('/')} className="w-full">
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
       {/* Ticket Information Banner */}
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 my-4 mx-auto container">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-amber-800">
                      <span className="font-medium">Payment done but ticket missing?</span> No worries—your ticket will appear within a few hours in your Dashboard. If not, contact us via WhatsApp or Email.
                    </p>
                  </div>
                </div>
              </div>
      <div className="container mx-auto px-4 py-8 flex-1">
        {/* <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFavorite(!isFavorite)}
              className={isFavorite ? 'bg-accent' : ''}
            >
              <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
              {isFavorite ? 'Saved' : 'Save'}
            </Button>
          </div>
        </div> */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Image */}
            <AspectRatio ratio={16 / 9} className="rounded-lg overflow-hidden mb-8">
              <Image
                src={event.banner || "/placeholder.svg"}
                alt={event.title}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                priority
              />
            </AspectRatio>

            {/* Event Info */}
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-4">
                {event.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-6">
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  <span>
                    {startDateTime.date}
                    {endDateTime && (
                      <>
                        <span className="mx-2">-</span>
                        <span>{endDateTime.date}</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  <span>{timeRange}</span>
                </div>
              </div>
            </div>

            {/* Event Description */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">About This Event</h2>
              <p className="text-muted-foreground whitespace-pre-line">
                {event.description}
              </p>
            </div>

            {/* Event Location */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Location</h2>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-muted rounded-full">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">{event.location.address}</h3>
                  <p className="text-muted-foreground">
                    {[
                      event.location.city,
                      event.location.state,
                      event.location.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {event.location.coordinates && (
                    <Button variant="link" className="p-0 h-auto mt-2" asChild>
                      <a
                        href={`https://www.google.com/maps?q=${encodeURIComponent(
                          event.location.address
                        )}+${encodeURIComponent(event.location.city)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View on map
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Event Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Tickets */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              {/* Terms and Conditions and Prohibited Items buttons side by side on desktop, stacked on mobile */}
              {event.title.includes("Dr. T Ao Trophy") && (
                <div className="flex flex-col md:flex-row gap-3 mb-6">
                  <Dialog open={termsModalOpen} onOpenChange={setTermsModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full text-sm bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100 hover:text-yellow-900"
                        onClick={() => setTermsModalOpen(true)}
                      >
                        View Terms & Conditions
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg max-h-[90vh]">
                      <div className="absolute right-4 top-4">
                        {/* <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 rounded-full p-0" 
                          onClick={() => document.querySelector('[data-state="open"] [role="dialog"] button[aria-label="Close"]')?.click()}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Close</span>
                        </Button> */}
                      </div>
                      <DialogHeader className="pr-10">
                        <DialogTitle className="text-xl">Terms and Conditions</DialogTitle>
                        <DialogDescription>
                          Please read the following terms and conditions carefully before booking.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="overflow-y-auto max-h-[60vh] pr-2 mt-4">
                        <ul className="text-sm space-y-3 list-none">
                         <li className="pb-2 border-b border-gray-100"><span className="font-medium">1.</span> By purchasing a ticket to the Dr. T Ao Trophy 2025, you agree to the following terms and conditions.</li>

                          <li className="pb-2 border-b border-gray-100"><span className="font-medium">2.</span> Tickets are for general admission and have no reserved seating. Entry is on a first-come, first-served basis.</li>

                          <li className="pb-2 border-b border-gray-100"><span className="font-medium">3.</span> Pre-booked tickets come with your own personalized QR codes. QR codes can be scanned only once and cannot be reused for re-entry. Once inside, exiting and re-entering the venue using the same ticket is not allowed.</li>

                          <li className="pb-2 border-b border-gray-100"><span className="font-medium">4.</span> Scalping or reselling tickets at a higher price is strictly prohibited. Violators will be penalised by the organizers.</li>

                          <li className="pb-2 border-b border-gray-100"><span className="font-medium">5.</span> Professional cameras and recording devices are not permitted. Full recording or live streaming of the match is prohibited.</li>

                          <li className="pb-2 border-b border-gray-100"><span className="font-medium">6.</span> Attendees must comply with security checks upon entry. Any disruptive behavior may result in ejection without a refund.</li>

                          <li className="pb-2 border-b border-gray-100"><span className="font-medium">7.</span> All ticket sales are final. No refunds or exchanges will be provided unless the event is cancelled or rescheduled.</li>

                          <li className="pb-2 border-b border-gray-100"><span className="font-medium">8.</span> Attendees assume all risks associated with attending the event. The Organizers are not responsible for any personal injury or loss.</li>

                          <li className="pb-2 border-b border-gray-100"><span className="font-medium">9.</span> Attendees must present a valid ticket from the authorized ticketing partners at the entrance.</li>

                          <li className="pb-2 border-b border-gray-100"><span className="font-medium">10.</span> Children of any age will require a ticket and must be accompanied by an adult.</li>

                          <li className="pb-2 border-b border-gray-100"><span className="font-medium">11.</span> Prohibited items include weapons, drugs, outside food and beverages, laser pointers, and any other items deemed dangerous or inappropriate.</li>

                          <li className="pb-2 border-b border-gray-100"><span className="font-medium">12.</span> The tournament will proceed rain or shine. In case of extreme weather, the Technical Committee will communicate any changes or cancellations through proper channels.</li>

                          <li className="pb-2 border-b border-gray-100"><span className="font-medium">13.</span> Attendees shall be liable to actions from the organizer for harassment, foul language, or abusive behavior.</li>

                          <li className="pb-2 border-b border-gray-100"><span className="font-medium">14.</span> First aid services will be available on-site. Attendees requiring medical attention should notify event staff immediately.</li>

                          <li className="pb-2 border-b border-gray-100"><span className="font-medium">15.</span> The venue will provide accommodations for attendees with disabilities, including designated seating areas and accessible restrooms.</li>

                          <li className="pb-2 border-b border-gray-100"><span className="font-medium">16.</span> Only authorized vendors are permitted to sell goods within the premises.</li>
                          
                          <li className="pb-2 border-b border-gray-100"><span className="font-medium">17.</span> By attending, you consent to being photographed or recorded for promotional purposes by Dr. T Ao Trophy and its partners.</li>

                          <li className="pb-2 border-b border-gray-100"><span className="font-medium">18.</span> Any disputes regarding the league will be resolved by the organizers, and their decision will be final.</li>

                          <li className="pb-2 border-b border-gray-100"><span className="font-medium">19.</span> Political messages, discriminatory placards, unauthorized displays, racists propaganda, and actions violating the tournament ethics or sportsmanship are strictly prohibited. Violators may be removed and face the penalties as per the rules.</li>
                         
                         <li className="pb-2"><span className="font-medium">20.</span> The Organizers reserve the right to modify these terms at any time.</li>
                        </ul>
                       
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button 
                          variant="default" 
                          className="bg-primary" 
                          onClick={() => setTermsModalOpen(false)}
                        >
                          I Understand
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={prohibitedItemsModalOpen} onOpenChange={setProhibitedItemsModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full text-sm bg-red-50 border-red-200 text-red-800 hover:bg-red-100 hover:text-red-900"
                        onClick={() => setProhibitedItemsModalOpen(true)}
                      >
                        View Prohibited Items
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg max-h-[90vh]">
                      <DialogHeader>
                        <DialogTitle className="text-xl">Prohibited Items</DialogTitle>
                        <DialogDescription>
                          The following items are not allowed at the Dr. T Ao Trophy 2025 event.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="overflow-y-auto max-h-[60vh] pr-2 mt-4">
                        <ul className="text-sm space-y-2 list-disc pl-5">
                          <li>No bottles (glass or plastic)</li>
                          <li>No coins or metal objects</li>
                          <li>No tobacco products or smoking devices</li>
                          <li>No fireworks or pyrotechnics</li>
                          <li>No sharp objects or weapons</li>
                          <li>No flammable liquids or aerosols</li>
                          <li>No laser pointers</li>
                          <li>No outside food or beverages</li>
                          <li>No illegal substances</li>
                          <li>No large bags or backpacks</li>
                          <li>No professional cameras or recording equipment</li>
                          <li>No drones or remote-controlled devices</li>
                          <li>No banners or flags with offensive content</li>
                          <li>No animals (except service animals)</li>
                        </ul>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button
                          variant="default"
                          className="bg-primary"
                          onClick={() => setProhibitedItemsModalOpen(false)}
                        >
                          I Understand
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {event.ticketTypes && event.ticketTypes.length > 0 ? (
                <div className="space-y-6">
                  {/* Ticket Selection Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Select Tickets</h3>
                    <Badge variant="outline" className="px-3 py-1">
                      {event.ticketTypes.reduce((acc, t) => acc + (t.quantity - t.sold), 0)} tickets remaining
                    </Badge>
                  </div>

                  {/* Ticket Types */}
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
                        className={`border ${quantity > 0 ? 'border-primary border-2' : 'border-border'} overflow-hidden transition-all duration-200 hover:shadow-md`}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-md ${isSoldOut ? 'bg-muted' : quantity > 0 ? 'bg-primary/10' : 'bg-muted/50'}`}>
                                <TicketIcon className={`h-5 w-5 ${isSoldOut ? 'text-muted-foreground' : quantity > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                              </div>
                              <div>
                                <CardTitle className="text-lg">{ticket.name}</CardTitle>
                                {isSoldOut && (
                                  <Badge variant="outline" className="mt-1 bg-muted text-muted-foreground">
                                    Sold Out
                                  </Badge>
                                )}
                                {isLimited && !isSoldOut && (
                                  <Badge variant="outline" className="mt-1 bg-amber-50 text-amber-600 border-amber-200">
                                    Limited Availability
                                  </Badge>
                                )}
                                {quantity > 0 && (
                                  <Badge variant="default" className="mt-1 bg-primary text-primary-foreground">
                                    {quantity} selected
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xl font-semibold">₹{ticket.price}</span>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-3">
                            {ticket.description}
                            <br />
                            <Badge variant="outline" className="mt-1 bg-green-50 text-green-600 border-green-200">{ticket.capacity} person allowed</Badge>
                          </p>

                          {/* Benefits list */}
                          {ticket.benefits && ticket.benefits.length > 0 && (
                            <div className="bg-muted/30 rounded-md p-3 mb-3">
                              <p className="text-xs font-medium mb-2">INCLUDES:</p>
                              <ul className="space-y-1.5 text-sm">
                                {ticket.benefits.map((benefit: string, i: number) => (
                                  <li key={i} className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></div>
                                    <span className="text-muted-foreground">{benefit}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Availability indicator */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className={`font-medium ${isSoldOut ? 'text-destructive' : isLimited ? 'text-amber-600' : 'text-primary'}`}>
                                {isSoldOut ? 'Sold Out' : `${ticket.quantity - ticket.sold} remaining`}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${isSoldOut ? 'bg-destructive' : isLimited ? 'bg-amber-500' : 'bg-primary'}`}
                                style={{ width: `${100 - availabilityPercentage}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Quantity Selector */}
                          {!isSoldOut && (
                            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Quantity</span>
                                <span className="text-sm text-muted-foreground">
                                  ₹{ticket.price} × {quantity} = ₹{ticket.price * quantity}
                                </span>
                              </div>
                              <div className="flex items-center justify-center gap-3">
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
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="text-lg font-semibold min-w-[2rem] text-center">
                                  {quantity}
                                </span>
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
                                        }, 0);
                                      }
                                    }
                                  }}
                                  disabled={quantity >= ticket.quantity - ticket.sold}
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="text-xs text-muted-foreground text-center mt-2">
                                Max {ticket.quantity - ticket.sold} tickets per booking
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Booking Summary */}
                  {selectedTickets.size > 0 && (
                    <div ref={summaryRef}>
                      <Card className="border-primary border-2">
                        <CardHeader>
                          <CardTitle className="text-lg">Booking Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {Array.from(selectedTickets.values()).map((item) => (
                              <div key={item.ticket._id} className="flex justify-between items-center">
                                <div>
                                  <span className="font-medium">{item.ticket.name}</span>
                                  <span className="text-sm text-muted-foreground ml-2">× {item.quantity}</span>
                                </div>
                                <span className="font-semibold">₹{item.ticket.price * item.quantity}</span>
                              </div>
                            ))}
                            <div className="border-t pt-3">
                              <div className="flex justify-between items-center">
                                <span className="text-lg font-bold">Total</span>
                                <span className="text-2xl font-bold text-primary">
                                  ₹{Array.from(selectedTickets.values()).reduce((sum, item) => sum + (item.ticket.price * item.quantity), 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button
                            className="w-full"
                            onClick={handleBooking}
                            disabled={isBooking}
                            size="lg"
                          >
                            {isBooking ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              `Book ${Array.from(selectedTickets.values()).reduce((sum, item) => sum + item.quantity, 0)} Ticket${Array.from(selectedTickets.values()).reduce((sum, item) => sum + item.quantity, 0) > 1 ? 's' : ''}`
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
