"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner"
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
  Ticket as TicketIcon
} from "lucide-react"
import { format } from "date-fns"
import Image from "next/image"
import Link from "next/link"
import dynamic from 'next/dynamic';

// UI Components
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// App Components - Using dynamic imports to avoid SSR issues
import Navbar from "@/app/Navbar"
import Footer from "@/app/Footer"
// Event Card Component (simplified for related events)
const EventCard = ({ event }: { event: { id: string; title: string; date: string; image: string } }) => (
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
type TicketType = {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  description?: string;
  refundable?: boolean;
  refundPolicy?: string;
};

type EventOrganizer = {
  _id: string;
  name: string;
  avatar?: string;
  rating?: number;
};

type EventLocation = {
  venue: string;
  address: string;
  city: string;
  state: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
};

type EventStatus = 'draft' | 'published' | 'cancelled';

interface Event {
  _id: string;
  title: string;
  description: string;
  longDescription?: string;
  startDate: string;
  endDate: string;
  time: string;
  location: EventLocation;
  banner: string;
  images: string[];
  category: string;
  organizer: EventOrganizer;
  ticketTypes: TicketType[];
  tags: string[];
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  attendees?: number;
  totalCapacity?: number;
  highlights?: string[];
}

interface EventResponse {
  success: boolean;
  data: Event;
  message?: string;
}

interface EventDetailPageProps {
  params: {
    id: string;
  };
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [selectedTicketType, setSelectedTicketType] = useState<string>('');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Mock data for development
  const mockEvent: Event = {
    _id: params.id,
    title: "Summer Music Festival 2024",
    description: "The biggest music festival of the year featuring top artists from around the world.",
    longDescription: "Join us for an unforgettable weekend of music, food, and fun at the annual Summer Music Festival. Experience performances from top international and local artists across multiple stages. Enjoy a variety of food trucks, art installations, and interactive experiences throughout the festival grounds.",
    startDate: "2024-07-15",
    endDate: "2024-07-17",
    time: "12:00 PM - 11:00 PM",
    location: {
      venue: "Sunset Park",
      address: "1234 Music Lane",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      coordinates: {
        lat: 19.0760,
        lng: 72.8777,
      },
    },
    banner: "/images/carausel1.jpg",
    images: [
      "/images/carausel1.jpg",
      "/images/carausel2.jpg",
      "/images/carausel3.jpg",
      "/images/carausel4.jpg",
    ],
    category: "Music Festival",
    organizer: {
      _id: "org123",
      name: "Music Events India",
      avatar: "/images/logo.png",
      rating: 4.8,
    },
    ticketTypes: [
      {
        _id: "ticket1",
        name: "General Admission",
        price: 1500,
        quantity: 500,
        sold: 250,
        description: "Access to all general areas",
        refundable: true,
        refundPolicy: "Full refund up to 7 days before the event"
      },
      {
        _id: "ticket2",
        name: "VIP Pass",
        price: 3500,
        quantity: 100,
        sold: 75,
        description: "VIP access with premium viewing areas",
        refundable: true,
        refundPolicy: "Full refund up to 14 days before the event"
      },
    ],
    tags: ["Music", "Festival", "Outdoor", "All Ages"],
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attendees: 325,
    totalCapacity: 1000,
    highlights: [
      "50+ artists across 3 stages",
      "Food and beverage stalls",
      "Art installations",
      "Free parking available"
    ]
  };

  useEffect(() => {
    let isMounted = true;
    
    const fetchEvent = async () => {
      try {
        setLoading(true);
        setError(null);

        // In development, use mock data
        if (process.env.NODE_ENV === 'development') {
          console.log('Using mock event data');
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
          if (isMounted) {
            setEvent(mockEvent);
            if (mockEvent.ticketTypes?.length > 0) {
              setSelectedTicketType(mockEvent.ticketTypes[0]._id);
            }
          }
          return;
        }

        console.log(`Fetching event with ID: ${params.id}`);
        const response = await fetch(`/api/events/${params.id}`, {
          cache: 'no-store' // Ensure we get fresh data
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received event data:', data);
        
        if (isMounted) {
          if (data.success && data.event) {
            setEvent(data.event);
            if (data.event.ticketTypes?.length > 0) {
              setSelectedTicketType(data.event.ticketTypes[0]._id);
            }
          } else {
            throw new Error(data.message || 'Invalid event data received');
          }
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
          setError(errorMessage);
          toast.error('Failed to load event details: ' + errorMessage);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setIsLoading(false);
        }
      }
    };

    if (params.id) {
      fetchEvent();
    } else {
      setError('No event ID provided');
      setLoading(false);
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  // Loading state
  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-lg font-medium">Loading event details...</p>
            <p className="text-sm text-muted-foreground">Please wait while we load the event information</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-red-700 mb-2">Error Loading Event</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button variant="default" onClick={() => window.location.reload()}>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch (e) {
      return timeString;
    }
  };

  // Get selected ticket type
  const selectedTicket = selectedTicketType && event
    ? event.ticketTypes.find(t => t._id === selectedTicketType)
    : null;

  // Calculate available tickets
  const availableTickets = selectedTicket ? selectedTicket.quantity - (selectedTicket.sold || 0) : 0;

  // Handle ticket type selection
  const handleTicketTypeChange = (value: string) => {
    setSelectedTicketType(value);
    setTicketQuantity(1); // Reset quantity when ticket type changes
  };

  // Calculate max tickets available for the selected ticket type
  const maxTickets = selectedTicket
    ? Math.max(0, selectedTicket.quantity - (selectedTicket.sold || 0))
    : 0;

  // Handle ticket quantity changes
  const handleQuantityChange = (quantity: number) => {
    if (quantity >= 1 && quantity <= maxTickets) {
      setTicketQuantity(quantity);
    }
  };

  // Handle booking
  const handleBookNow = () => {
    if (!selectedTicketType) {
      toast.error('Please select a ticket type');
      return;
    }

    if (!ticketQuantity) {
      toast.error('Please select at least one ticket');
      return;
    }

    // In a real app, you would redirect to checkout
    toast.success(`Added ${ticketQuantity} ${selectedTicket?.name} ticket(s) to cart`);
    console.log('Booking details:', {
      eventId: event?._id,
      eventTitle: event?.title,
      ticketTypeId: selectedTicketType,
      ticketType: selectedTicket?.name,
      quantity: ticketQuantity,
      totalPrice: selectedTicket?.price * ticketQuantity,
    });
  };

  // Toggle bookmark
  const toggleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    toast.success(isBookmarked ? 'Removed from saved events' : 'Saved to your events');
  };

  // Calculate total price
  const calculateTotal = (): number => {
    if (!event?.ticketTypes) return 0;

    return event.ticketTypes.reduce((total, ticket) => {
      const quantity = ticketQuantity;
      return total + (ticket.price * quantity);
    }, 0);
  };

  const total = calculateTotal();
  const convenienceFee = Math.round(total * 0.1); // 10% convenience fee
  const totalWithFees = total + convenienceFee;

  // Mock related events (in a real app, this would come from an API)
  const relatedEvents = [
    {
      id: '1',
      title: 'Summer Music Festival After Party',
      date: 'July 18, 2024',
      image: '/images/carausel1.jpg',
    },
    {
      id: '2',
      title: 'Local Bands Night',
      date: 'August 5, 2024',
      image: '/images/carausel2.jpg',
    },
    {
      id: '3',
      title: 'Electronic Dance Music Festival',
      date: 'August 15, 2024',
      image: '/images/carausel3.jpg',
    },
  ];

  const getMaxTickets = (): number => {
    if (!event?.ticketTypes) return 0;
    const selectedTicket = event.ticketTypes.find((t) => t._id === selectedTicketType);
    return selectedTicket ? selectedTicket.quantity - (selectedTicket.sold || 0) : 0;
  };

  const getSelectedTicketPrice = (): number => {
    if (!event?.ticketTypes) return 0;
    const selectedTicket = event.ticketTypes.find((t) => t._id === selectedTicketType);
    return selectedTicket ? selectedTicket.price : 0;
  };

  const getRefundPolicyText = (): string => {
    if (!event?.ticketTypes || !selectedTicketType) return 'Select a ticket type to see refund policy';
    const selectedTicket = event.ticketTypes.find((t) => t._id === selectedTicketType);
    if (!selectedTicket) return 'Select a ticket type to see refund policy';

    if (selectedTicket.refundable) {
      return selectedTicket.refundPolicy || 'Refundable as per organizer\'s policy';
    }
    return 'Non-refundable. All sales are final.';
  };

  const handleCheckout = (): void => {
    if (!selectedTicketType) {
      toast.error('Please select a ticket type');
      return;
    }

    // In a real app, you would redirect to checkout
    // router.push(`/checkout?eventId=${event._id}&ticketTypeId=${selectedTicketType}&quantity=${ticketQuantity}`);

    toast.success('Redirecting to checkout...');
  };

  const renderTicketTypeOptions = () => {
    if (!event?.ticketTypes?.length) {
      return <p className="text-muted-foreground">No ticket types available</p>;
    }

    return (
      <Select value={selectedTicketType} onValueChange={setSelectedTicketType}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a ticket type" />
        </SelectTrigger>
        <SelectContent>
          {event.ticketTypes.map((ticket) => (
            <SelectItem key={ticket._id} value={ticket._id}>
              <div className="flex justify-between w-full">
                <span>{ticket.name}</span>
                <span className="ml-4 font-medium">₹{ticket.price.toLocaleString('en-IN')}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const renderTicketQuantity = () => {
    const maxTickets = getMaxTickets();

    return (
      <div className="flex items-center justify-between p-4 border rounded-md">
        <span className="text-sm font-medium">Quantity</span>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))}
            disabled={ticketQuantity <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center">{ticketQuantity}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTicketQuantity(Math.min(maxTickets, ticketQuantity + 1))}
            disabled={ticketQuantity >= maxTickets}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="flex justify-between items-center mb-6">
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
              onClick={toggleBookmark}
              className={isBookmarked ? 'bg-accent' : ''}
            >
              <Heart className={`h-4 w-4 mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
              {isBookmarked ? 'Saved' : 'Save'}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Image */}
            <div className="relative w-full h-96 rounded-lg overflow-hidden mb-8">
              <Image
                src={event?.banner || "/placeholder.svg"}
                alt={event?.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                priority
              />
            </div>

            {/* Event Info */}
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-4">{event?.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-6">
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  <span>
                    {formatDate(event?.startDate)}
                    {event?.endDate && (
                      <>
                        <span className="mx-2">-</span>
                        <span>
                          {formatDate(event?.endDate)}
                        </span>
                      </>
                    )}
                  </span>
                </div>
                {event?.time && (
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    <span>{formatTime(event?.time)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Event Description */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">About This Event</h2>
              <p className="text-muted-foreground whitespace-pre-line">
                {event?.longDescription || event?.description}
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
                  <h3 className="font-medium">{event?.location.venue}</h3>
                  <p className="text-muted-foreground">
                    {event?.location.address}, {event?.location.city}, {event?.location.state}, {event?.location.country}
                  </p>
                  {event?.location.coordinates && (
                    <Button variant="link" className="p-0 h-auto mt-2" asChild>
                      <a
                        href={`https://www.google.com/maps?q=${event?.location.coordinates.lat},${event?.location.coordinates.lng}`}
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
            {event?.tags && event?.tags.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {event?.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-sm">
                      {tag}
                    </Badge>
                  ))}
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
}: { children: React.ReactNode; className?: string;[key: string]: any }) {
  return (
    <label
      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className || ""}`}
      {...props}
    >
      {children}
    </label>
  )
}
