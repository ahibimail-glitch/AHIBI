"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";

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

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [bookingDetails, setBookingDetails] = useState<any | null>(null);

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
    console.log("Booking payload:", {
      event,
      user,
      quantity,

    });

    // Validate required data
    if (!selectedTicket) {
      toast.error("Please select a ticket type");
      return;
    }
    if (!event || !event._id) {
      toast.error("Event information is missing");
      return;
    }
    if (!quantity || quantity < 1) {
      toast.error("Please select a valid quantity");
      return;
    }

    setIsBooking(true);
    try {
      // Get auth token
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Please log in to book tickets");
      }

      // Validate event and ticket data
      if (!event) {
        throw new Error("Event information not available");
      }

      if (!selectedTicket) {
        throw new Error("Please select a ticket");
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/bookings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            event,
            user,
            quantity,
            price: selectedTicket.price,
            ticketType: selectedTicket.name,
          }),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to book ticket");
      }

      toast.success("Ticket booked successfully!");
      console.log(responseData)
      // Navigate to booking invoice with the booking ID from the response
      if (responseData.booking) {
        localStorage.setItem('lastBookingId', responseData.booking.id);
        router.push(`/events/${event?._id}/bookings`);
      } else {
        console.error("No booking ID in response:", responseData);
        toast.error(
          "Error processing your booking. Please check your bookings."
        );
        router.push("/profile/bookings");
      }
    } catch (error) {
      console.error("Booking error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to book ticket";
      toast.error(errorMessage);

      // If unauthorized, redirect to login
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
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Received event data:", data);

        if (isMounted) {
          setEvent(data);
          if (data.ticketTypes && data.ticketTypes.length > 0) {
            setSelectedTicket(data.ticketTypes[0]);
          }
        }
      } catch (err) {
        console.error("Error fetching event:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load event");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    const fetchProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
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
          setError(data.message || "Failed to fetch profile");
        } else {
          setUser(data.data.user);
        }
      } catch (e) {
        setError("Network error. Please try again.");
      }
      setLoading(false);
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
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Error Loading Event</h2>
        <p className="text-muted-foreground mb-4">
          {error || "Invalid event data received"}
        </p>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
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
            <div className="relative w-full h-96 rounded-lg overflow-hidden mb-8">
              <Image
                src={event.banner || "/placeholder.svg"}
                alt={event.title}
                fill
                className="object-fill"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                priority
              />
            </div>

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
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">Tickets</h2>
                <Badge variant="outline" className="px-3 py-1">
                  {event.ticketTypes?.reduce((acc, t) => acc + (t.quantity - t.sold), 0) || 0} tickets remaining
                </Badge>
              </div>

              {event.ticketTypes && event.ticketTypes.length > 0 ? (
                <div className="space-y-6">
                  {/* Group tickets by category/price */}
                  {event.ticketTypes.map((ticket) => {
                    // Calculate availability percentage
                    const availabilityPercentage = Math.max(
                      0,
                      Math.min(100, ((ticket.quantity - ticket.sold) / ticket.quantity) * 100)
                    );

                    // Determine status badge
                    const isSoldOut = ticket.quantity <= ticket.sold;
                    const isLimited = availabilityPercentage <= 20 && !isSoldOut;

                    return (
                      <Card
                        key={ticket._id}
                        className={`border ${selectedTicket?._id === ticket._id ? 'border-primary border-2' : 'border-border'} overflow-hidden transition-all duration-200 hover:shadow-md`}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-md ${isSoldOut ? 'bg-muted' : 'bg-primary/10'}`}>
                                <TicketIcon className={`h-5 w-5 ${isSoldOut ? 'text-muted-foreground' : 'text-primary'}`} />
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
                              <span className="text-muted-foreground">
                                {ticket.sold} of {ticket.quantity} tickets sold
                              </span>
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
                        </CardContent>

                        <CardFooter className="pt-2 flex justify-end">
                          <Button
                            variant={selectedTicket?._id === ticket._id ? "default" : "outline"}
                            onClick={() => {
                              if (selectedTicket?._id === ticket._id) {
                                handleBooking();
                              } else {
                                setSelectedTicket(ticket);
                              }
                            }}
                            className={`${isSoldOut ? 'opacity-50' : ''}`}
                            disabled={isSoldOut || isBooking}
                            size="sm"
                          >
                            {isBooking
                              ? "Processing..."
                              : isSoldOut
                                ? "Sold Out"
                                : selectedTicket?._id === ticket._id
                                  ? "Confirm Booking"
                                  : "Book Now"}
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
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
