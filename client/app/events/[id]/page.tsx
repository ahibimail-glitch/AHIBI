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
  MapIcon,
  Users,
  Shield,
  CheckCircle2,
  Instagram,
  Gift,
  Percent,
  Sparkles,
  Timer,
  Zap,

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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// App Components - Using dynamic imports to avoid SSR issues
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";
import TermsAndConditions from "@/components/AhibiFest/TermsAndConditons";
import FAQPage from "@/components/AhibiFest/FAQ";

// Event Card Component (simplified for related events)
const EventCard = ({
  event,
}: {
  event: { id: string; title: string; date: string; image: string };
}) => (
  <Card className="overflow-hidden hover:shadow-md transition-shadow">
    <div className="relative aspect-video">
      <Image
        src={event.image}
        alt={event.title}
        fill
        className="object-cover"
      />
    </div>
    <CardContent className="p-4">
      <h3 className="font-semibold line-clamp-2 text-sm sm:text-base">{event.title}</h3>
      <p className="text-xs sm:text-sm text-muted-foreground mt-1">{event.date}</p>
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs sm:text-sm" asChild>
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
  isFreeEvent?: boolean;
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
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);

  // Free/RSVP booking flow
  const handleFreeBooking = async () => {
    try {
      setBookingError(null);
      if (!acceptedTerms) {
        setBookingError("Please accept the terms and conditions to proceed.");
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) {
        toast.info("Please login to RSVP");
        router.push(`/auth?redirect=/events/${params.id}`);
        return;
      }
      setIsBooking(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event: params.id,
          quantity: 1,
          price: 0,
          ticketType: 'RSVP',
          ...(isHMFEvent ? { country: selectedCountry, state: selectedState } : {})
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to create RSVP booking');
      }
      toast.success('RSVP confirmed! Your ticket has been generated.');
      // Redirect to booking invoice page using booking id
      const bookingId = data?.booking?.id || data?.booking?._id;
      if (bookingId) {
        try {
          localStorage.setItem('lastBookingId', bookingId);
          router.push(`/events/${bookingId}/bookings`);
        } catch {
          // fallback: stay on page
        }
      }
    } catch (e: any) {
      setBookingError(e.message || 'Something went wrong while booking');
    } finally {
      setIsBooking(false);
    }
  };

  // Form state for BikerBash contact form
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // HMF event country selection state
  const [selectedCountry, setSelectedCountry] = useState('India');
  const [selectedState, setSelectedState] = useState('');

  // HMF event IDs
  const HMF_id = ["691b1066a9a25d4fec36f96c", "691b13caa9a25d4fec36fa70", "691b146fa9a25d4fec36fb25", "691b14f1a9a25d4fec36fbd7", "691b156ea9a25d4fec36fc8d", "691b15c5a9a25d4fec36fd3a", "691b15faa9a25d4fec36fd3f", "691b162ca9a25d4fec36fd44", "691b1771a9a25d4fec36feaf"];

  // Check if current event is an HMF event
  const isHMFEvent = HMF_id.includes(params.id);

  // Debug logging
  console.log('Current event ID:', params.id);
  console.log('Is HMF Event:', isHMFEvent);
  console.log('HMF IDs:', HMF_id);


  // List of countries for selection
  const countries = [
    "India", "Afghanistan", "Bangladesh", "Bhutan", "Maldives", "Nepal", "Pakistan", "Sri Lanka",
    "China", "Japan", "South Korea", "Thailand", "Vietnam", "Indonesia", "Malaysia", "Singapore",
    "Philippines", "Myanmar", "Cambodia", "Laos", "Brunei", "Mongolia", "Taiwan",
    "United States", "Canada", "Mexico", "United Kingdom", "Germany", "France", "Italy", "Spain",
    "Netherlands", "Belgium", "Switzerland", "Austria", "Sweden", "Norway", "Denmark", "Finland",
    "Poland", "Czech Republic", "Hungary", "Romania", "Bulgaria", "Greece", "Turkey", "Russia",
    "Ukraine", "Belarus", "Estonia", "Latvia", "Lithuania", "Portugal", "Ireland", "Iceland",
    "Australia", "New Zealand", "Fiji", "Papua New Guinea", "Solomon Islands", "Vanuatu",
    "Samoa", "Tonga", "Kiribati", "Micronesia", "Palau", "Marshall Islands", "Nauru", "Tuvalu",
    "South Africa", "Egypt", "Nigeria", "Kenya", "Tanzania", "Ghana", "Uganda", "Morocco",
    "Ethiopia", "Sudan", "Algeria", "Tunisia", "Libya", "Zimbabwe", "Zambia", "Botswana",
    "Namibia", "Angola", "Mozambique", "Madagascar", "Mauritius", "Seychelles", "Rwanda",
    "Burundi", "Somalia", "Djibouti", "Eritrea", "South Sudan", "Chad", "Niger", "Mali",
    "Burkina Faso", "Senegal", "Guinea", "Sierra Leone", "Liberia", "Ivory Coast", "Togo",
    "Benin", "Cameroon", "Central African Republic", "Congo", "Democratic Republic of Congo",
    "Gabon", "Equatorial Guinea", "Sao Tome and Principe", "Cape Verde", "Guinea-Bissau",
    "Gambia", "Mauritania", "Comoros", "Mayotte", "Reunion", "St. Helena", "Ascension", "Tristan da Cunha",
    "Brazil", "Argentina", "Chile", "Peru", "Colombia", "Venezuela", "Ecuador", "Bolivia",
    "Paraguay", "Uruguay", "Guyana", "Suriname", "French Guiana", "Falkland Islands",
    "Mexico", "Guatemala", "Belize", "El Salvador", "Honduras", "Nicaragua", "Costa Rica",
    "Panama", "Cuba", "Jamaica", "Haiti", "Dominican Republic", "Puerto Rico", "Trinidad and Tobago",
    "Barbados", "Bahamas", "Grenada", "St. Lucia", "St. Vincent and the Grenadines", "Dominica",
    "St. Kitts and Nevis", "Antigua and Barbuda", "Aruba", "Curacao", "St. Maarten",
    "Saudi Arabia", "UAE", "Qatar", "Kuwait", "Bahrain", "Oman", "Yemen", "Jordan",
    "Lebanon", "Syria", "Iraq", "Iran", "Afghanistan", "Pakistan", "Bangladesh", "Sri Lanka",
    "Maldives", "Nepal", "Bhutan", "Myanmar", "Thailand", "Vietnam", "Cambodia", "Laos",
    "Malaysia", "Singapore", "Indonesia", "Philippines", "Brunei", "East Timor", "Mongolia",
    "North Korea", "South Korea", "Japan", "China", "Taiwan", "Hong Kong", "Macau"
  ];

  // Ensure unique country list and sort alphabetically
  const uniqueCountries = Array.from(new Set(countries));
  const sortedCountries = uniqueCountries.sort((a, b) => a.localeCompare(b));

  // States by country (extendable). If country not listed, use free-text input fallback
  const statesByCountry: Record<string, string[]> = {
    India: [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
    ],
  };
  const availableStates = statesByCountry[selectedCountry] || [];
  const sortedStates = [...availableStates].sort((a, b) => a.localeCompare(b));
  useEffect(() => {
    // Reset state when country changes
    setSelectedState('');
  }, [selectedCountry]);

  // Check if form is completely filled (for HMF require both country and state)
  const isFormComplete = !isHMFEvent || (selectedCountry !== '' && (availableStates.length === 0 ? selectedState.trim() !== '' : selectedState !== ''));

  // Check if any ticket is selected
  const hasSelectedTicket = selectedTickets.size > 0;

  // Reset applied coupon if selection changes
  useEffect(() => {
    setAppliedCoupon(null);
    setCouponError(null);
  }, [Array.from(selectedTickets.entries()).map(([id, v]) => `${id}:${v.quantity}`).join('|')]);

  const subtotalAmount = Array.from(selectedTickets.values()).reduce((sum, item) => sum + (item.ticket.price * item.quantity), 0);
  // Discount applies ONCE per category
  const discountAmount = appliedCoupon?.discountAmount ? appliedCoupon.discountAmount : 0;
  const payableAmount = Math.max(0, subtotalAmount - discountAmount);

  const handleApplyCoupon = async () => {
    try {
      setCouponApplying(true);
      setCouponError(null);
      const token = localStorage.getItem("token");
      if (!token) {
        setCouponError("Please log in to apply coupon");
        toast.error("Please log in to apply coupon");
        return;
      }
      if (!event?._id) return;
      const tickets = Array.from(selectedTickets.values()).map(item => ({
        ticketType: item.ticket.name,
        quantity: item.quantity,
        price: item.ticket.price,
      }));
      const apiBase = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");
      const res = await fetch(`${apiBase}/api/coupons/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: couponCode, eventId: event._id, tickets }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        console.warn('Coupon validation failed:', res.status, data);
        setAppliedCoupon(null);
        setCouponError(data?.message || 'Invalid coupon');
        toast.error(data?.message || 'Invalid coupon');
        return;
      }
      setAppliedCoupon(data);
      toast.success(`Coupon ${data.code} applied: ${data.discountPercentage}% off`);
    } catch (e) {
      console.error('Coupon apply error:', e);
      setCouponError('Failed to apply coupon');
      toast.error('Failed to apply coupon');
    } finally {
      setCouponApplying(false);
    }
  };

  // Handle form submission for BikerBash contact form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingForm(true);

    try {
      // Here you can add your form submission logic
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

      toast.success("Thank you for your interest! We'll get back to you soon.");

      // Reset form
      setFormData({
        name: '',
        phone: '',
        email: ''
      });
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleBooking = async () => {
    // clear any prior error shown in UI
    setBookingError(null);
    if (selectedTickets.size === 0) {
      toast.error("Please select at least one ticket type");
      return;
    }

    // Check if form is complete for BikerBash and HMF events
    if ((isBikerBash || isHMFEvent) && !isFormComplete) {
      const errorMessage = isHMFEvent
        ? "Please select your country and state before booking"
        : "Please fill in all form fields before booking";
      toast.error(errorMessage);
      return;
    }
    if (!event || !event._id) {
      toast.error("Event information is missing");
      return;
    }

    // Fire Meta Pixel CompleteRegistration on payment intent for Biker Bash
    if (typeof window !== 'undefined' && (window as any).fbq && isBikerBash) {
      try {
        (window as any).fbq('track', 'CompleteRegistration', {
          value: 1160,
          currency: 'INR',
        });
      } catch (err) {
        console.warn('fbq track CompleteRegistration failed', err);
      }
    }

    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token || !user) {
      toast.error("You must be logged in to book tickets");
      router.push("/auth?redirect=" + encodeURIComponent(window.location.pathname));
      return;
    }

    // For special events, check if user already has 10 or more tickets
    if (isSpecial) {
      setIsBooking(true); // Show loading state while checking
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bookings/my-bookings`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (res.ok) {
          const bookingsData = await res.json();
          console.log("Bookings data:", bookingsData); // Debug log

          const allBookings: any[] = bookingsData.bookings || bookingsData.data || [];

          const eventBookings = allBookings.filter((b: any) => {
            const ev = b.event || b.eventSnapshot || null;
            const evId = typeof ev === 'string' ? ev : ev?._id;
            const sameEvent = String(evId) === String(event._id);
            const isConfirmed = b?.status === 'confirmed' || b?.paymentStatus === 'completed';
            const notAnnie = b?.bookingType !== 'annie-musical';
            return sameEvent && isConfirmed && notAnnie;
          });

          console.log("Event bookings (confirmed):", eventBookings); // Debug log

          // Calculate total existing tickets for this event
          const existingTicketCount = eventBookings.reduce((total: number, b: any) => {
            return total + (b.quantity || 0);
          }, 0);

          // Calculate new tickets being requested
          const newTicketCount = Array.from(selectedTickets.values()).reduce((sum, item) => {
            return sum + item.quantity;
          }, 0);

          console.log("Existing tickets:", existingTicketCount, "New tickets:", newTicketCount); // Debug log

          // Check if total would exceed 10
          if (existingTicketCount + newTicketCount > 10) {
            setIsBooking(false); // Reset loading state
            console.log("TICKET LIMIT EXCEEDED - Showing error message"); // Debug log
            const msg = `You can't buy more than 10 tickets from 1 ID. You already have ${existingTicketCount} tickets for this event.`;
            setBookingError(msg); // show in UI
            toast.error(msg);
            return;
          }
        } else {
          console.error("Failed to fetch bookings:", res.status, res.statusText);
          const errorData = await res.json().catch(() => ({}));
          console.error("Error data:", errorData);
        }
      } catch (error) {
        console.error("Error checking existing bookings:", error);
        setIsBooking(false); // Reset loading state on error
        toast.error("Unable to verify existing bookings. Please try again.");
        return;
      }
      setIsBooking(false); // Reset loading state before continuing
    }

    setIsBooking(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Please log in to book tickets");
      }

      const subtotal = Array.from(selectedTickets.values()).reduce((sum, item) => sum + (item.ticket.price * item.quantity), 0);
      const totalAmount = Math.max(0, subtotal - (appliedCoupon?.discountAmount || 0));

      // If payable amount is zero, bypass Razorpay and create booking(s) directly
      if (totalAmount <= 0) {
        setIsProcessingPayment(true);
        try {
          const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
          const createdBookingIds: string[] = [];
          for (const { ticket, quantity } of Array.from(selectedTickets.values())) {
            // Create one booking per quantity to align with scan/check-in capacity logic
            for (let i = 0; i < quantity; i++) {
              const resp = await fetch(`${apiBase}/api/bookings`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  event: event._id,
                  user: (user as any)?._id || 'self',
                  quantity: 1,
                  price: 0,
                  ticketType: ticket.name,
                  ...(isHMFEvent && { country: selectedCountry, state: selectedState }),
                }),
              });
              const data = await resp.json();
              if (!resp.ok) {
                throw new Error(data?.message || 'Failed to create zero-price booking');
              }
              const bid = data?.booking?.id || data?.booking?._id;
              if (bid) createdBookingIds.push(bid);
            }
          }

          if (createdBookingIds.length > 0) {
            toast.success('Booking confirmed!');
            localStorage.setItem('lastBookingId', createdBookingIds[0]);
            router.push(`/events/${createdBookingIds[0]}/bookings`);
            return; // Stop further processing
          } else {
            throw new Error('No booking was created');
          }
        } catch (e: any) {
          console.error('Zero-price booking error:', e);
          toast.error(e?.message || 'Failed to complete zero-price booking');
          setIsProcessingPayment(false);
          return;
        }
      }

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
              ...(isBikerBash && {
                contactInfo: {
                  name: formData.name,
                  phone: formData.phone,
                  email: formData.email,
                }
              }),
              ...(isHMFEvent && {
                country: selectedCountry,
                state: selectedState,
              }),
            },
            ...(appliedCoupon ? { coupon: { code: appliedCoupon.code } } : {}),
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
            // Show processing state immediately after payment
            setIsProcessingPayment(true);
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
                ...(isBikerBash && {
                  contactInfo: {
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email,
                  }
                }),
                ...(isHMFEvent && {
                  country: selectedCountry,
                  state: selectedState,
                }),
                ...(appliedCoupon ? {
                  coupon: {
                    code: appliedCoupon.code,
                    ticketCategory: appliedCoupon.ticketCategory,
                    discountPercentage: appliedCoupon.discountPercentage,
                    discountAmount: appliedCoupon.discountAmount,
                  }
                } : {}),
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
              setIsProcessingPayment(false);
            }
          } catch (error) {
            console.error("Error in payment handler:", error);
            toast.error("An error occurred while processing your payment. Please contact support.");
            setIsProcessingPayment(false);
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
  const isSpecial = params.id === "68c2c33eb6ef88c76f50ce7c";
  const isBikerBash = params.id === "68d3ce2c0d439c1425c6cdd1";
  const dontshow = false;
  // Customized UI for a specific event ID while preserving booking logic

  //How many ticket left from each ticket category
  // AHIBI TICKETS LEFT
  const left = [
    {
      _id: "68c2c33eb6ef88c76f50ce7d",
      quantity: 50
    },
    {
      _id: "68c2c33eb6ef88c76f50ce7e",
      quantity: 50
    },
    {
      _id: "68c2c33eb6ef88c76f50ce7f",
      quantity: 50
    },
    {
      _id: "68c2c33eb6ef88c76f50ce80",
      quantity: 50
    },
    {
      _id: "68c56699e0a28b9006543bdc",
      quantity: 0
    }
  ];



  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      {/* Premium Information Banner */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <div className="bg-indigo-50 rounded-lg p-4 flex items-start gap-3">
            <div className="bg-indigo-100 rounded-full p-2">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Payment done but ticket missing?</p>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                No worries—your ticket will appear within a few hours in your Dashboard. If not, contact us via{" "}
                <a href="#" className="text-indigo-600 hover:underline font-medium">WhatsApp</a> or{" "}
                <a href="#" className="text-indigo-600 hover:underline font-medium">Email</a>.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Image */}
            <div className="relative rounded-xl overflow-hidden shadow-lg">
              <AspectRatio ratio={16 / 9}>
                <Image
                  src={event.banner || "/placeholder.svg"}
                  alt={event.title}
                  fill
                  className="object-cover transition-transform duration-300 hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                <div className="absolute bottom-4 left-4">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">{event.title}</h1>
                  <p className="text-xs sm:text-sm text-gray-200 mt-1">{event.category}</p>
                </div>
              </AspectRatio>
            </div>

            {/* Event Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-3">
                <div className="bg-indigo-100 rounded-full p-2">
                  <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Date</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {startDateTime.date}
                    {endDateTime && (
                      <>
                        <span className="mx-1">→</span>
                        <span>{endDateTime.date}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-3">
                <div className="bg-purple-100 rounded-full p-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Time</p>
                  <p className="text-sm font-semibold text-gray-900">{timeRange}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg p-4 sm:p-6 shadow-md border border-gray-100">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                About This Event
              </h2>

              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
              {/*CONCERT SCHEDULE FOR NIS  */}
              {params.id === '68e3b8037e8e587e70ed9371' && (
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    🎵 Evening Concert Schedule
                  </h3>

                  <div className="flex flex-col gap-6">
                    {/* Day 1 */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-base sm:text-lg font-semibold text-indigo-600">
                          📅 Day 1
                        </h4>
                        <span className="text-sm sm:text-base text-gray-500 font-medium">
                          05:30 PM – 07:30 PM
                        </span>
                      </div>
                      <p className="text-sm sm:text-base text-gray-800">
                        <span className="font-medium">Evening Concert by</span>{" "}
                        <em>House of Tyah</em>, <em>Incipit Band</em>
                      </p>
                    </div>

                    {/* Day 2 */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-base sm:text-lg font-semibold text-indigo-600">
                          📅 Day 2
                        </h4>
                        <span className="text-sm sm:text-base text-gray-500 font-medium">
                          06:00 PM – 07:30 PM
                        </span>
                      </div>

                      <p className="text-sm sm:text-base text-gray-800 mb-3">
                        <span className="font-medium">Concert begins</span>
                      </p>

                      <ul className="list-disc list-inside space-y-2 text-gray-700 text-sm sm:text-base">
                        <li>
                          <strong>Band 1 – AFTER AMEN</strong>{" "}
                          <span className="text-gray-500">(20 minutes)</span>
                        </li>
                        <li>
                          <em>Freebies / Merch Giveaway</em>
                        </li>
                        <li>
                          <strong>Band 2 – Power Faith</strong>{" "}
                          <span className="text-gray-500">(30 minutes)</span>
                        </li>
                        <li>
                          Pastor Temjen <span className="text-gray-500">(10–15 minutes)</span>
                        </li>
                        <li>
                          <strong>Band 3 – 5th Note</strong>{" "}
                          <span className="text-gray-500">(30 minutes)</span>
                        </li>
                      </ul>

                      <div className="mt-4 text-xs sm:text-sm text-gray-500">
                        ⏱️ Total Duration: 1 hour 30 minutes
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>


            {/* Location */}
            <div className="bg-white rounded-lg p-4 sm:p-6 shadow-md border border-gray-100">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                Venue Details
              </h2>

              <div className="flex flex-col sm:flex-row gap-6">
                {/* Left: Venue Info + Social Media */}
                <div className="flex flex-col gap-6 flex-1">
                  {/* Venue Info */}
                  <div className="flex items-start gap-3">
                    <div className="bg-indigo-100 rounded-full p-2">
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">
                        {event.location.address}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600">
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
                          className="mt-3 border-gray-300 text-gray-900 hover:bg-gray-100 rounded-lg text-xs sm:text-sm"
                          asChild
                        >
                          <a
                            href={`https://www.google.com/maps?q=${encodeURIComponent(
                              event.location.address
                            )}+${encodeURIComponent(event.location.city)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MapIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                            View on Map
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Social Media (only for specific event) */}
                  {params.id === '68c6d350e0a28b9006548bd2' && (<div className="bg-white rounded-lg p-4   "> <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Follow Us On:</h2> <div className="flex items-center space-x-4"> <a href="https://www.instagram.com/tribefc.nl/?hl=en" target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:text-pink-700 transition-colors" aria-label="Instagram" > <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"> <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.415-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.415-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" /> </svg> </a> <a href="https://www.facebook.com/people/Tribe-Fighting-Championship/61566285986297/#" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 transition-colors" aria-label="Facebook" > <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"> <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" /> </svg> </a> <a href="https://www.youtube.com/@TribeFightingChampionship" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700 transition-colors" aria-label="YouTube" > <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"> <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /> </svg> </a> </div> </div>)}
                </div>

                {/* Right: Large Venue Image */}
                {params.id === '68c6d350e0a28b9006548bd2' &&
                  <div className="sm:w-80 md:w-[28rem] flex-shrink-0">
                    <img
                      src="/images/Seating-Map.png"
                      alt="Venue"
                      className="w-full h-80 sm:h-96 md:h-[28rem] object-contain "
                    />
                  </div>}

              </div>
              {/* Ticket to hornbill */}
              {params.id === '68e374bf79834b5747c42105' && (
                <div className="bg-white rounded-lg p-4 sm:p-6 ">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Follow Us On:</h2>
                  <div className="flex items-center space-x-4">
                    <a
                      href="https://www.instagram.com/tafmanagaland?igsh=MTUwNmtkb2dkZjQwNQ=="
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-600 hover:text-pink-700 transition-colors"
                      aria-label="Instagram"
                    >
                      <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.415-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.415-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                      </svg>
                    </a>
                    <a
                      href="https://www.facebook.com/share/1BLgCD7u7X/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                      aria-label="Facebook"
                    >
                      <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                      </svg>
                    </a>
                    <a
                      href="https://youtube.com/@tafmanagaland?si=cm1Iw6k8gVvdV23M"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-600 hover:text-red-700 transition-colors"
                      aria-label="YouTube"
                    >
                      <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                    </a>
                  </div>
                </div>
              )}
              {/* Nagaland Influencer summit */}
              {params.id === '68e3b8037e8e587e70ed9371' && (
                <div className="bg-white rounded-lg p-4 sm:p-6 ">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Follow Us On:</h2>
                  <div className="flex items-center space-x-4">
                    <a
                      href="https://www.instagram.com/nagaland_influencers_summit?igsh=MWZyeHd0ZHRvY29waw=="
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-600 hover:text-pink-700 transition-colors"
                      aria-label="Instagram"
                    >
                      <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.415-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.415-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                      </svg>
                    </a>
                    <a
                      href="https://www.facebook.com/share/1CXihzwp7m/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                      aria-label="Facebook"
                    >
                      <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                      </svg>
                    </a>
                    <a
                      href="https://x.com/Nagalandin58844?t=F4VaSi1epeJKJVNYF0hjtQ&s=08"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-600 hover:text-red-700 transition-colors"
                      aria-label="X"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 1200 1227"
                        fill="currentColor"
                        className="h-6 w-6 sm:h-8 sm:w-8"
                        aria-hidden="true"
                      >
                        <path d="M714.163 519.284 1160.89 0H1056.36L667.137 450.887 364.527 0H0l463.309 681.821L0 1226.44h104.529l410.099-478.133 319.646 478.133h364.526L714.138 519.284h.025ZM563.759 687.828l-47.578-68.541L142.34 80.003h166.47l305.476 440.944 47.578 68.541 403.812 582.303H899.206L563.759 687.828Z" />
                      </svg>
                    </a>

                  </div>
                </div>
              )}
            </div>




            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="bg-white rounded-lg p-4 sm:p-6 shadow-md border border-gray-100">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">Events Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag: string) => (
                    <Badge
                      key={tag}
                      className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 text-xs px-2 sm:px-3 py-1"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>


          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Form */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-blue-900">
                  {isHMFEvent ? "Please select your country before booking tickets" : "Please fill the details before booking tickets"}
                </h2>
                {hasSelectedTicket && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Form Locked
                  </div>
                )}
              </div>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Country selection for HMF events */}
                {isHMFEvent && (
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <Select
                      value={selectedCountry}
                      onValueChange={setSelectedCountry}
                      disabled={hasSelectedTicket}
                    >
                      <SelectTrigger
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${hasSelectedTicket ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                          }`}
                      >
                        <SelectValue placeholder="Select your country" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedCountries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">Select your country of residence</p>
                    {/* State selection */}
                    <div className="mt-4">
                      <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                        State/Province
                      </label>
                      {sortedStates.length > 0 ? (
                        <Select
                          value={selectedState}
                          onValueChange={setSelectedState}
                          disabled={hasSelectedTicket}
                        >
                          <SelectTrigger
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${hasSelectedTicket ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                          >
                            <SelectValue placeholder="Select your state" />
                          </SelectTrigger>
                          <SelectContent>
                            {sortedStates.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          placeholder="Enter your state/province"
                          value={selectedState}
                          onChange={(e) => setSelectedState(e.target.value)}
                          disabled={hasSelectedTicket}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${hasSelectedTicket ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                        />
                      )}
                      <p className="text-xs text-gray-500 mt-1">Select your state/region</p>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Ticket Categories */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-100">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Ticket Categories</h2>
              {event.ticketTypes && event.ticketTypes.length > 0 ? (
                <div className="space-y-6">
                  {/* Ticket Selection Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">Select Tickets</h3>
                      <p className="text-xs sm:text-sm text-gray-600">Choose your preferred ticket type</p>
                    </div>
                    {/* <Badge variant="outline" className="mt-2 sm:mt-0 px-3 py-1 bg-white border-indigo-200 text-indigo-700 text-xs sm:text-sm">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      {event.ticketTypes.reduce((acc, t) => acc + (t.quantity - t.sold), 0)} available
                    </Badge> */}
                  </div>
                  {bookingError && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 flex items-start gap-2">
                      <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <div className="text-sm">{bookingError}</div>
                    </div>
                  )}
                  {/* Ticket Types */}
                  <div className="grid grid-cols-1 gap-4">
                    {event.ticketTypes.map((ticket) => {
                      const availabilityPercentage = Math.max(
                        0,
                        Math.min(100, ((ticket.quantity - ticket.sold) / ticket.quantity) * 100)
                      );
                      const isSoldOut = ticket.quantity <= ticket.sold;
                      const isLimited = availabilityPercentage <= 20 && !isSoldOut;
                      const selectedItem = selectedTickets.get(ticket._id);
                      const quantity = selectedItem?.quantity || 0;

                      return (
                        <Card
                          key={ticket._id}
                          className={`border-2 transition-all duration-200 hover:shadow-md w-full max-w-full ${quantity > 0
                            ? 'border-indigo-500 bg-indigo-50/30'
                            : isSoldOut
                              ? 'border-gray-200 bg-gray-50'
                              : 'border-gray-200 hover:border-indigo-300'
                            } rounded-lg overflow-hidden relative`}
                        >
                          {/* Sold Out Overlay */}
                          {isSoldOut && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10 rounded-lg">


                              <img src="/sold-out.webp" className="h-60 w-60" />


                            </div>
                          )}
                          <CardHeader className="p-4 pb-2">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${isSoldOut ? 'bg-gray-100' : quantity > 0 ? 'bg-indigo-100' : 'bg-gray-50'
                                  }`}>
                                  <TicketIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${isSoldOut ? 'text-gray-400' : quantity > 0 ? 'text-indigo-600' : 'text-gray-600'
                                    }`} />
                                </div>
                                <div>
                                  <CardTitle className="text-base sm:text-lg text-gray-900">{ticket.name}</CardTitle>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {isSoldOut && (
                                      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs">
                                        Sold Out
                                      </Badge>
                                    )}
                                    {isLimited && !isSoldOut && (
                                      <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-xs animate-pulse">
                                        Limited Availability
                                      </Badge>
                                    )}
                                    {quantity > 0 && (
                                      <Badge className="bg-indigo-500 text-white text-xs">
                                        {quantity} selected
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-left">
                                <span className="text-lg sm:text-xl font-semibold text-indigo-600">₹{ticket.price}</span>
                                <p className="text-xs text-gray-500">per ticket</p>
                                
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <p className=" text-green-600 font-bold mb-3">{ticket.description}</p>
                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                {ticket.capacity} capacity
                              </Badge>
                            </div>
                            {ticket.benefits && ticket.benefits.length > 0 && (
                              <div className="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-100">
                                <p className="text-xs font-semibold text-gray-800 mb-2 flex items-center">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Included Benefits
                                </p>
                                <ul className="space-y-1">
                                  {ticket.benefits.map((benefit: string, i: number) => (
                                    <li key={i} className="flex items-center gap-2 text-xs text-gray-700">
                                      <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"></div>
                                      {benefit}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className={`font-semibold flex items-center gap-1 ${isSoldOut ? 'text-red-600' : isLimited ? 'text-amber-600' : 'text-green-600'
                                  }`}>
                                  {isSoldOut ? (
                                    <>
                                      <XCircle className="h-3 w-3" />
                                      Sold Out
                                    </>
                                  ) : (
                                    <>
                                      {/* <CheckCircle2 className="h-3 w-3" />
                                      {ticket.quantity - ticket.sold} remaining */}
                                    </>
                                  )}
                                </span>
                                {/* <span className="text-gray-500">{ticket.sold} / {ticket.quantity} sold</span> */}
                              </div>
                              {/* <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${isSoldOut ? 'bg-red-500' : isLimited ? 'bg-amber-500' : 'bg-green-500'
                                    }`}
                                  style={{ width: `${100 - availabilityPercentage}%` }}
                                ></div>
                              </div> */}
                            </div>
                              <CardContent>
                            {isHMFEvent && (
                                  <div className="mt-2 text-[11px] sm:text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-md p-2">
                                    <div className="flex items-center justify-between">
                                      <span>Ticket price</span>
                                      <span>₹{Math.max(0, (ticket.price || 0) - 50)}</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                      <span>Tourism sustainability tax</span>
                                      <span>₹50</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-1 font-semibold text-gray-800">
                                      <span>Total</span>
                                      <span>₹{ticket.price}</span>
                                    </div>
                                  </div>
                                )}
                          </CardContent>
                            {!isSoldOut && (
                              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs sm:text-sm font-semibold text-gray-800">Quantity</span>
                                  <span className="text-xs sm:text-sm font-semibold text-indigo-600">
                                    ₹{(ticket.price * quantity).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center justify-center gap-2 sm:gap-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (!isFormComplete) {
                                        const errorMessage = isHMFEvent
                                          ? "Please select your country and state before selecting a ticket"
                                          : "Please fill in all form fields before selecting a ticket";
                                        toast.error(errorMessage);
                                        return;
                                      }
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
                                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                                  >
                                    <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                  <span className="px-3 sm:px-4 py-1 bg-white rounded-lg border border-gray-200 text-sm sm:text-base font-semibold text-indigo-600">
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
                                          }, 100);
                                        }
                                      }
                                    }}
                                    disabled={quantity >= ticket.quantity - ticket.sold}
                                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-green-50 hover:border-green-300 hover:text-green-600"
                                  >
                                    <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                </div>
                                {/* <p className="text-xs text-gray-500 text-center mt-2 flex items-center justify-center gap-1">
                                  <Info className="h-3 w-3" />
                                  Max {ticket.quantity - ticket.sold} per booking
                                </p> */}
                              </div>
                            )}
                          </CardContent>
                        
                        </Card>
                      );
                    })}
                  </div>

                  {/* Booking Summary */}
                  {selectedTickets.size > 0 && (
                    <div ref={summaryRef} className="animate-in slide-in-from-bottom-4 w-full max-w-full">
                      <Card className="border-2 border-indigo-500 shadow-md bg-white w-full">
                        <CardHeader className="bg-indigo-600 text-white rounded-t-lg p-4">
                          <CardTitle className="text-base sm:text-xl flex items-center">
                            <TicketIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                            Booking Summary
                          </CardTitle>
                          <CardDescription className="text-indigo-100 text-xs sm:text-sm">
                            Review your ticket selection
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                          <div className="space-y-3">
                            {Array.from(selectedTickets.values()).map((item) => (
                              <div key={item.ticket._id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-gray-50 rounded-lg border border-gray-100 gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-indigo-100 rounded-full">
                                    <TicketIcon className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="font-semibold text-gray-900 text-sm sm:text-base block truncate">{item.ticket.name}</span>
                                    <p className="text-xs sm:text-sm text-gray-600">
                                      Quantity: {item.quantity} • ₹{item.ticket.price} each
                                    </p>
                                  </div>
                                </div>
                                <span className="text-sm sm:text-lg font-semibold text-indigo-600 sm:text-right">
                                  ₹{(item.ticket.price * item.quantity).toLocaleString()}
                                </span>
                              </div>
                            ))}
                            <div className="border-t border-gray-200 pt-3 space-y-2">
                              {/* Coupon input */}
                              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                <div className="flex-1">
                                  <Input placeholder="Enter coupon code" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} />
                                </div>
                                <Button variant="outline" onClick={handleApplyCoupon} disabled={couponApplying || !couponCode.trim()}>
                                  {couponApplying ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Applying...</>) : 'Apply'}
                                </Button>
                              </div>
                              {couponError && <p className="text-xs text-red-600">{couponError}</p>}
                              {/* Summary rows */}
                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm sm:text-base text-gray-700">Subtotal</span>
                                <span className="text-sm sm:text-base font-semibold text-gray-900">₹{Array.from(selectedTickets.values()).reduce((sum, item) => sum + (item.ticket.price * item.quantity), 0).toLocaleString()}</span>
                              </div>
                              {appliedCoupon?.discountAmount > 0 && (
                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                  <span className="text-sm sm:text-base text-green-700">Coupon ({appliedCoupon.code})</span>
                                  <span className="text-sm sm:text-base font-semibold text-green-700">-₹{appliedCoupon.discountAmount.toLocaleString()}</span>
                                </div>
                              )}
                              <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                                <span className="text-base sm:text-lg font-semibold text-gray-900">To Pay</span>
                                <span className="text-base sm:text-xl font-bold text-indigo-600">₹{Math.max(0, Array.from(selectedTickets.values()).reduce((sum, item) => sum + (item.ticket.price * item.quantity), 0) - (appliedCoupon?.discountAmount || 0)).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="p-4 sm:p-6 pt-0 space-y-3">
                          <div className="flex items-start gap-2 w-full">
                            <Checkbox
                              id="terms"
                              checked={acceptedTerms}
                              onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                              className="mt-1"
                            />
                            <label
                              htmlFor="terms"
                              className="text-xs sm:text-sm text-gray-600 cursor-pointer"
                            >
                              I accept to the{" "}
                              <button
                                type="button"
                                onClick={() => setTermsModalOpen(true)}
                                className="text-indigo-600 hover:underline font-semibold"
                              >
                                Terms and Conditions*
                              </button>
                            </label>
                          </div>
                          <Button
                            className="w-full h-10 sm:h-12 text-sm sm:text-base font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
                            onClick={handleBooking}
                            disabled={isBooking || !acceptedTerms}
                          >
                            {isBooking ? (
                              <>
                                <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                Processing Payment...
                              </>
                            ) : (
                              <>
                                <TicketIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                Book {Array.from(selectedTickets.values()).reduce((sum, item) => sum + item.quantity, 0)} Ticket
                                {Array.from(selectedTickets.values()).reduce((sum, item) => sum + item.quantity, 0) > 1 ? "s" : ""}
                              </>
                            )}
                          </Button>
                        </CardFooter>
                      </Card>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6">
                
                  {event.isFreeEvent && (
                    <Card className="border-2 border-green-500 bg-white">
                      <CardHeader className="p-4">
                        <CardTitle className="text-base sm:text-lg text-green-700">Free/RSVP Booking</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">This is a free event. Reserve your spot instantly.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-3">
                        {bookingError && (
                          <div className="mt-1 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 flex items-start gap-2">
                            <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <div className="text-sm">{bookingError}</div>
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          <Checkbox
                            id="terms-free"
                            checked={acceptedTerms}
                            onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                            className="mt-1"
                          />
                          <label htmlFor="terms-free" className="text-xs sm:text-sm text-gray-600 cursor-pointer">
                            I accept to the{" "}
                            <button type="button" onClick={() => setTermsModalOpen(true)} className="text-indigo-600 hover:underline font-semibold">
                              Terms and Conditions*
                            </button>
                          </label>
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <Button
                          className="w-full h-10 sm:h-12 text-sm sm:text-base font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
                          onClick={handleFreeBooking}
                          disabled={isBooking || !acceptedTerms}
                        >
                          {isBooking ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Reserving...
                            </>
                          ) : (
                            <>
                              <TicketIcon className="mr-2 h-4 w-4" />
                              RSVP Now (Free)
                            </>
                          )}
                        </Button>
                      </CardFooter>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>


        {/* Payment Processing Overlay */}
        {isProcessingPayment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl p-4 sm:p-6 max-w-[90vw] sm:max-w-sm mx-4 text-center shadow-lg">
              <div className="mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-spin" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Generating Your Ticket</h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Your payment was successful! We're now generating your ticket and invoice.
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="text-left">
                    <p className="text-xs sm:text-sm font-semibold text-amber-800">Please do not refresh</p>
                    <p className="text-xs text-amber-700">This may take a moment. You'll be redirected automatically.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className || ""}`}
      {...props}
    >
      {children}
    </label>
  );
}
