"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import {
  Minus,
  Plus,
  Loader2,
  ArrowLeft,
  Ticket as TicketIcon,
  XCircle,
  Users,
  CheckCircle2,
  Info,
  ShieldCheck,
  Calendar,
  MapPin,
  Tag,
  X,
  AlertCircle,
} from "lucide-react";
import Script from "next/script";

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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import HMFTermsContent from "@/components/HMFTermsContent";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";

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

interface Event {
  _id: string;
  title: string;
  description: string;
  banner: string;
  startDate: string;
  endDate: string;
  bookingEndTime?: string | null;
  category: string;
  ticketTypes: TicketType[];
  location: {
    address: string;
    city: string;
  };
  isFreeEvent?: boolean;
  termsAndConditions?: string;
}

interface UserProfile {
  _id?: string;
  name: string;
  email: string;
  phone: string;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const summaryRef = useRef<HTMLDivElement | null>(null);

  const [event, setEvent] = useState<Event | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState<Map<string, { ticket: TicketType; quantity: number }>>(new Map());
  const [isBooking, setIsBooking] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  // HMF event state
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');

  const HMF_id = ["691b1066a9a25d4fec36f96c", "691b13caa9a25d4fec36fa70", "691b146fa9a25d4fec36fb25", "691b14f1a9a25d4fec36fbd7", "691b156ea9a25d4fec36fc8d", "691b15c5a9a25d4fec36fd3a", "691b15faa9a25d4fec36fd3f", "691b162ca9a25d4fec36fd44", "691b1771a9a25d4fec36feaf", "6927db2d2cd1c48b94f5b9e5", "6927f5532cd1c48b94f5bd94", "6927f5f02cd1c48b94f5be37", "6927f61d2cd1c48b94f5be3d", "6927f66e2cd1c48b94f5be88", "6927f69c2cd1c48b94f5be8c", "6927f6cf2cd1c48b94f5be91", "6927f7102cd1c48b94f5bedb", "6927f73c2cd1c48b94f5bee0", "6927f7a32cd1c48b94f5bf36", "6927f7dd2cd1c48b94f5bf3b"];
  const HF_id = ["6927db2d2cd1c48b94f5b9e5", "6927f5532cd1c48b94f5bd94", "6927f5f02cd1c48b94f5be37", "6927f61d2cd1c48b94f5be3d", "6927f66e2cd1c48b94f5be88", "6927f69c2cd1c48b94f5be8c", "6927f6cf2cd1c48b94f5be91", "6927f7102cd1c48b94f5bedb", "6927f73c2cd1c48b94f5bee0", "6927f7a32cd1c48b94f5bf36", "6927f7dd2cd1c48b94f5bf3b"];
  
  const isHMFEvent = HMF_id.includes(eventId);
  const isHFEvent = HF_id.includes(eventId);
  const isSpecial = eventId === "68c2c33eb6ef88c76f50ce7c";

  const countries = [
    "India", "Afghanistan", "Bangladesh", "Bhutan", "Maldives", "Nepal", "Pakistan", "Sri Lanka",
    "China", "Japan", "South Korea", "Thailand", "Vietnam", "Indonesia", "Malaysia", "Singapore",
    "Philippines", "Myanmar", "Cambodia", "Laos", "Brunei", "Mongolia", "Taiwan",
    "United States", "Canada", "Mexico", "United Kingdom", "Germany", "France", "Italy", "Spain",
    "Netherlands", "Belgium", "Switzerland", "Austria", "Sweden", "Norway", "Denmark", "Finland",
    "Poland", "Czech Republic", "Hungary", "Romania", "Bulgaria", "Greece", "Turkey", "Russia",
    "Ukraine", "Belarus", "Estonia", "Latvia", "Lithuania", "Portugal", "Ireland", "Iceland",
    "Australia", "New Zealand"
  ];

  const statesByCountry: Record<string, string[]> = {
    India: [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
      'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
      'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
      'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
      'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir'
    ],
  };

  const sortedCountries = Array.from(new Set(countries)).sort();
  const availableStates = statesByCountry[selectedCountry] || [];
  const sortedStates = [...availableStates].sort();

  const isFormComplete = !isHMFEvent || (selectedCountry !== '' && (availableStates.length === 0 ? selectedState.trim() !== '' : selectedState !== ''));

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

  useEffect(() => {
    setSelectedCountry('');
    setSelectedState('');
  }, []);

  useEffect(() => {
    setSelectedState('');
  }, [selectedCountry]);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/events/${eventId}`);
        if (!response.ok) throw new Error("Failed to fetch event");
        const data = await response.json();
        setEvent(data);
      } catch (err) {
        toast.error("Failed to load event details");
        router.push(`/events/${eventId}`);
      } finally {
        setLoading(false);
      }
    };

    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Please login to continue");
          router.push(`/auth?redirect=/events/${eventId}/checkout`);
          return;
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          localStorage.removeItem("token");
          toast.error("Session expired. Please login again");
          router.push(`/auth?redirect=/events/${eventId}/checkout`);
          return;
        }
        setUser(data.data.user);
      } catch (e) {
        toast.error("Authentication error");
        router.push(`/auth?redirect=/events/${eventId}/checkout`);
      }
    };

    fetchProfile();
    fetchEvent();
  }, [eventId, router]);

  const subtotalAmount = Array.from(selectedTickets.values()).reduce((sum, item) => sum + (item.ticket.price * item.quantity), 0);
  const discountAmount = appliedCoupon?.discountAmount || 0;
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
        setAppliedCoupon(null);
        setCouponError(data?.message || 'Invalid coupon');
        toast.error(data?.message || 'Invalid coupon');
        return;
      }
      setAppliedCoupon(data);
      toast.success(`Coupon ${data.code} applied: ${data.discountPercentage}% off`);
    } catch (e) {
      setCouponError('Failed to apply coupon');
      toast.error('Failed to apply coupon');
    } finally {
      setCouponApplying(false);
    }
  };

  const handleBooking = async () => {
    setBookingError(null);
    if (isBookingClosed) {
      const msg = "Bookings are closed for this event.";
      setBookingError(msg);
      toast.error(msg);
      return;
    }
    if (isHMFEvent && !isFormComplete) {
      toast.error("Please select your country and state before booking");
      return;
    }
    if (selectedTickets.size === 0) {
      toast.error("Please select at least one ticket type");
      return;
    }
    if (!acceptedTerms) {
      toast.error("Please accept the terms and conditions");
      return;
    }
    if (!event || !event._id || !user) {
      toast.error("Event information is missing");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please log in to book tickets");
      router.push(`/auth?redirect=/events/${eventId}/checkout`);
      return;
    }

    // Check ticket limit for special events
    if (isSpecial) {
      setIsBooking(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bookings/my-bookings`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (res.ok) {
          const bookingsData = await res.json();
          const allBookings: any[] = bookingsData.bookings || bookingsData.data || [];
          const eventBookings = allBookings.filter((b: any) => {
            const ev = b.event || b.eventSnapshot || null;
            const evId = typeof ev === 'string' ? ev : ev?._id;
            const sameEvent = String(evId) === String(event._id);
            const isConfirmed = b?.status === 'confirmed' || b?.paymentStatus === 'completed';
            const notAnnie = b?.bookingType !== 'annie-musical';
            return sameEvent && isConfirmed && notAnnie;
          });

          const existingTicketCount = eventBookings.reduce((total: number, b: any) => {
            return total + (b.quantity || 0);
          }, 0);

          const newTicketCount = Array.from(selectedTickets.values()).reduce((sum, item) => {
            return sum + item.quantity;
          }, 0);

          if (existingTicketCount + newTicketCount > 10) {
            setIsBooking(false);
            const msg = `You can't buy more than 10 tickets from 1 ID. You already have ${existingTicketCount} tickets for this event.`;
            setBookingError(msg);
            toast.error(msg);
            return;
          }
        }
      } catch (error) {
        console.error("Error checking existing bookings:", error);
        setIsBooking(false);
        toast.error("Unable to verify existing bookings. Please try again.");
        return;
      }
      setIsBooking(false);
    }

    setIsBooking(true);

    try {
      const totalAmount = payableAmount;

      // Handle free/zero-price bookings
      if (totalAmount <= 0) {
        setIsProcessingPayment(true);
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const createdBookingIds: string[] = [];
        for (const { ticket, quantity } of Array.from(selectedTickets.values())) {
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
          return;
        } else {
          throw new Error('No booking was created');
        }
      }

      // Create Razorpay order
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

      // Open Razorpay Checkout
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
            setIsProcessingPayment(true);
            
            const verificationResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/payments/verify-payment`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
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
                }),
              }
            );

            const verificationData = await verificationResponse.json();

            if (verificationResponse.ok && verificationData.success) {
              toast.success("Booking confirmed!");
              localStorage.setItem('lastBookingId', verificationData.booking._id);
              router.push(`/events/${verificationData.booking._id}/bookings`);
            } else {
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
        theme: {
          color: "#000000",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error("Booking error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to book ticket";
      toast.error(errorMessage);
    } finally {
      setIsBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
          <p className="text-lg font-semibold text-gray-900">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-gray-50 to-white">
      <Navbar />
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/events/${eventId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors mb-6 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Event</span>
          </button>
          
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Checkout</h1>
            <p className="text-gray-600">{event.title}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{new Date(event.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{event.location.city}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content - Ticket Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* HMF Country Selection */}
            {isHMFEvent && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 sm:p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Visitor Information</h2>
                  <p className="text-sm text-gray-600">Required for event registration</p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Country *</label>
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                      <SelectTrigger className="w-full h-12 rounded-2xl border-gray-300 focus:border-black focus:ring-black">
                        <SelectValue placeholder="Select your country" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedCountries.map((country) => (
                          <SelectItem key={country} value={country}>{country}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">State/Province *</label>
                    {sortedStates.length > 0 ? (
                      <Select value={selectedState} onValueChange={setSelectedState}>
                        <SelectTrigger className="w-full h-12 rounded-2xl border-gray-300 focus:border-black focus:ring-black">
                          <SelectValue placeholder="Select your state" />
                        </SelectTrigger>
                        <SelectContent>
                          {sortedStates.map((state) => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="Enter your state/province"
                        value={selectedState}
                        onChange={(e) => setSelectedState(e.target.value)}
                        className="h-12 rounded-2xl border-gray-300 focus:border-black focus:ring-black"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {bookingError && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">{bookingError}</p>
                </div>
              </div>
            )}

            {/* Ticket Categories */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Select Tickets</h2>
                <p className="text-sm text-gray-600">Choose your preferred ticket categories</p>
              </div>
              
              <div className="space-y-4">
                {event.ticketTypes && event.ticketTypes.length > 0 ? (
                  event.ticketTypes.map((ticket) => {
                    const isSoldOut = ticket.quantity <= ticket.sold;
                    const selectedItem = selectedTickets.get(ticket._id);
                    const quantity = selectedItem?.quantity || 0;
                    const availabilityPercentage = Math.max(0, Math.min(100, ((ticket.quantity - ticket.sold) / ticket.quantity) * 100));
                    const isLimited = availabilityPercentage <= 20 && !isSoldOut;

                    return (
                      <div
                        key={ticket._id}
                        className={`rounded-2xl border-2 transition-all overflow-hidden ${
                          quantity > 0
                            ? 'border-black bg-gray-50 shadow-md'
                            : isSoldOut
                            ? 'border-gray-200 bg-gray-50 opacity-60'
                            : 'border-gray-200 hover:border-gray-400 bg-white'
                        }`}
                      >
                        <div className="p-5 sm:p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-bold text-gray-900">{ticket.name}</h3>
                                {isSoldOut && (
                                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                                    Sold Out
                                  </span>
                                )}
                                {isLimited && !isSoldOut && (
                                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                                    Limited
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{ticket.description}</p>
                            </div>
                            <div className="text-right ml-4">
                              <span className="text-2xl font-bold text-gray-900">₹{ticket.price.toLocaleString()}</span>
                            </div>
                          </div>

                          {ticket.benefits && ticket.benefits.length > 0 && (
                            <div className="bg-gray-50 rounded-xl p-4 mb-4">
                              <p className="text-xs font-semibold text-gray-900 mb-2">What's included:</p>
                              <ul className="space-y-1.5">
                                {ticket.benefits.map((benefit, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                                    <span>{benefit}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {isHMFEvent && (
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 mb-4 text-xs space-y-1">
                              <div className="flex justify-between text-gray-700">
                                <span>Ticket price</span>
                                <span>₹{Math.max(0, (ticket.price || 0) - 50).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-gray-700">
                                <span>Tourism sustainability fund</span>
                                <span>₹50</span>
                              </div>
                              <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-300">
                                <span>Total</span>
                                <span>₹{ticket.price.toLocaleString()}</span>
                              </div>
                            </div>
                          )}

                          {!isSoldOut && (
                            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 border border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-semibold text-gray-900">Quantity</span>
                                {quantity > 0 && (
                                  <span className="text-sm font-bold text-gray-900">
                                    ₹{(ticket.price * quantity).toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-center gap-4">
                                <button
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
                                  className="w-10 h-10 rounded-full bg-white border-2 border-gray-300 hover:border-black disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center hover:scale-105"
                                >
                                  <Minus className="w-5 h-5 text-gray-700" />
                                </button>
                                
                                <span className="w-16 h-10 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center text-base font-bold text-gray-900">
                                  {quantity}
                                </span>
                                
                                <button
                                  onClick={() => {
                                    if (!isFormComplete) {
                                      toast.error(isHMFEvent ? "Please select your country and state first" : "Please fill in all required fields");
                                      return;
                                    }
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
                                  className="w-10 h-10 rounded-full bg-black text-white hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center hover:scale-105"
                                >
                                  <Plus className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <TicketIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No tickets available at this time</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Booking Summary */}
          <div ref={summaryRef} className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="bg-gradient-to-br from-black via-gray-900 to-black rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <TicketIcon className="w-5 h-5" />
                  Order Summary
                </h2>
              </div>

              <div className="p-6">
                {selectedTickets.size === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <TicketIcon className="w-8 h-8 text-white/40" />
                    </div>
                    <p className="text-sm text-white/70">No tickets selected</p>
                    <p className="text-xs text-white/50 mt-1">Select tickets to continue</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Selected Tickets */}
                    {Array.from(selectedTickets.values()).map((item) => (
                      <div key={item.ticket._id} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-white text-sm">{item.ticket.name}</h3>
                            <p className="text-xs text-white/60 mt-1">
                              {item.quantity} × ₹{item.ticket.price.toLocaleString()}
                            </p>
                          </div>
                          <span className="text-lg font-bold text-white">
                            ₹{(item.ticket.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    {/* Coupon */}
                    <div className="pt-4 border-t border-white/10">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                          <Input
                            placeholder="Promo code"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            className="pl-10 h-12 rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white focus:ring-white"
                          />
                        </div>
                        <button
                          onClick={handleApplyCoupon}
                          disabled={couponApplying || !couponCode.trim()}
                          className="px-6 h-12 bg-white text-black rounded-2xl font-semibold text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {couponApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                        </button>
                      </div>
                      {couponError && <p className="text-xs text-red-400 mt-2">{couponError}</p>}
                      {appliedCoupon && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Code {appliedCoupon.code} applied</span>
                        </div>
                      )}
                    </div>

                    {/* Pricing Breakdown */}
                    <div className="space-y-3 pt-4 border-t border-white/10">
                      <div className="flex justify-between text-white/80 text-sm">
                        <span>Subtotal</span>
                        <span className="font-semibold">₹{subtotalAmount.toLocaleString()}</span>
                      </div>
                      
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-green-400 text-sm">
                          <span>Discount ({appliedCoupon.code})</span>
                          <span className="font-semibold">-₹{discountAmount.toLocaleString()}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-white pt-3 border-t border-white/10">
                        <span className="text-base font-semibold">Total</span>
                        <span className="text-2xl font-bold">₹{payableAmount.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Terms & Checkout */}
                    <div className="pt-4 space-y-4">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <Checkbox
                          id="terms"
                          checked={acceptedTerms}
                          onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                          className="mt-1 border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-black"
                        />
                        <span className="text-xs text-white/80 leading-relaxed">
                          I accept the{" "}
                          <button
                            type="button"
                            onClick={() => setTermsModalOpen(true)}
                            className="text-white font-semibold hover:underline"
                          >
                            Terms and Conditions
                          </button>
                        </span>
                      </label>

                      <button
                        onClick={handleBooking}
                        disabled={isBooking || !acceptedTerms || (isHMFEvent && !isFormComplete)}
                        className="w-full h-14 bg-white text-black rounded-full font-bold text-base hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl transform hover:scale-105 disabled:transform-none"
                      >
                        {isBooking ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-5 h-5" />
                            Proceed to Payment
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Security Badge */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Secure Payment</p>
                  <p className="text-xs text-gray-600">Your information is protected</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Processing Overlay */}
      {isProcessingPayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-gradient-to-br from-black to-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Processing Payment</h3>
            <p className="text-gray-600 mb-6">
              Please wait while we confirm your booking...
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-amber-800">
                Do not refresh or close this page
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      <Dialog open={termsModalOpen} onOpenChange={setTermsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Terms & Conditions</DialogTitle>
            {isHMFEvent && <DialogDescription className="text-gray-600">Hornbill Music Festival 2025</DialogDescription>}
          </DialogHeader>
          <div className="prose max-w-none">
            {isHFEvent ? (
              <p className="text-gray-700">Hornbill Festival Terms and Conditions...</p>
            ) : (
              <HMFTermsContent />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}