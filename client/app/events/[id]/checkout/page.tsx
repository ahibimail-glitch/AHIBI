"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Check,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import HMFTermsContent from "@/components/HMFTermsContent";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";
import CheckoutDetailedBreakdown from "@/components/CheckoutDetailedBreakdown";
import {
  trackCheckoutStarted,
  trackPaymentFailed,
  trackPaymentSuccess,
  trackPurchase,
} from "@/lib/analytics/google-analytics";

// Types
interface TicketType {
  _id: string;
  name: string;
  price: number;
  basePrice?: number;
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
  convenience?: {
    percentage?: number;
    fixedAmount?: number;
    includeGst?: boolean;
    gstPercentage?: number;
  };
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

  const [event, setEvent] = useState<Event | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState<Map<string, { ticket: TicketType; quantity: number }>>(new Map());
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());
  const [isBooking, setIsBooking] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const checkoutStartedKeyRef = useRef<string | null>(null);

  // HMF event state
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');

  const HMF_id = ["691b1066a9a25d4fec36f96c", "691b13caa9a25d4fec36fa70", "691b146fa9a25d4fec36fb25", "691b14f1a9a25d4fec36fbd7", "691b156ea9a25d4fec36fc8d", "691b15c5a9a25d4fec36fd3a", "691b15faa9a25d4fec36fd3f", "691b162ca9a25d4fec36fd44", "691b1771a9a25d4fec36feaf", "6927db2d2cd1c48b94f5b9e5", "6927f5532cd1c48b94f5bd94", "6927f5f02cd1c48b94f5be37", "6927f61d2cd1c48b94f5be3d", "6927f66e2cd1c48b94f5be88", "6927f69c2cd1c48b94f5be8c", "6927f6cf2cd1c48b94f5be91", "6927f7102cd1c48b94f5bedb", "6927f73c2cd1c48b94f5bee0", "6927f7a32cd1c48b94f5bf36", "6927f7dd2cd1c48b94f5bf3b"];
  const HF_id = ["6927db2d2cd1c48b94f5b9e5",
    + "6927f5532cd1c48b94f5bd94", "6927f5f02cd1c48b94f5be37", "6927f61d2cd1c48b94f5be3d", "6927f66e2cd1c48b94f5be88", "6927f69c2cd1c48b94f5be8c", "6927f6cf2cd1c48b94f5be91", "6927f7102cd1c48b94f5bedb", "6927f73c2cd1c48b94f5bee0", "6927f7a32cd1c48b94f5bf36", "6927f7dd2cd1c48b94f5bf3b"];

  const isHMFEvent = HMF_id.includes(eventId);
  const isHFEvent = HF_id.includes(eventId);
  const isSpecial = eventId === "68c2c33eb6ef88c76f50ce7c";
  const CHEESE_EVENT_ID = "6a28ecaba70d7b412aa9efb4";
  const CHEESE_GROUP_COUPONS: Record<string, string> = {
    GROUP10D1B1: "General Admission (June 26, BATCH 1)",
    GROUP10D1B2: "General Admission (June 26, BATCH 2)",
    GROUP10D2: "General Admission (June 27)",
  };

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
  const baseSubtotalAmount = Array.from(selectedTickets.values()).reduce((sum, item) => {
    const base = typeof item.ticket.basePrice === "number" ? item.ticket.basePrice : item.ticket.price;
    return sum + (base * item.quantity);
  }, 0);
  const totalTicketQuantity = Array.from(selectedTickets.values()).reduce((sum, item) => sum + item.quantity, 0);
  const discountAmount = appliedCoupon?.discountAmount || 0;
  const payableAmount = Math.max(0, subtotalAmount - discountAmount);

  const isFreeEvent = event?.isFreeEvent || false;

  const getAnalyticsEventPayload = () => {
    if (!event?._id || !event?.title) return null;

    return {
      event_id: event._id,
      event_name: event.title,
    };
  };

  const conveniencePercentage = event?.convenience?.percentage ?? 0;
  const convenienceFixedAmount = event?.convenience?.fixedAmount ?? 0;
  const includeConvenience = conveniencePercentage !== 0 || convenienceFixedAmount !== 0;
  const includeGst = event?.convenience?.includeGst ?? false;
  const gstPercentage = event?.convenience?.gstPercentage ?? 18;

  const getGroup10ValidationError = (codeToValidate?: string | null) => {
    const effectiveCode = (codeToValidate ?? couponCode ?? appliedCoupon?.code ?? "").trim().toUpperCase();
    const selectedItems = Array.from(selectedTickets.values());
    const getTicketQuantityByName = (ticketName: string) =>
      selectedItems
        .filter((item) => item.ticket.name.trim().toLowerCase() === ticketName.trim().toLowerCase())
        .reduce((sum, item) => sum + item.quantity, 0);

    if (eventId === CHEESE_EVENT_ID && CHEESE_GROUP_COUPONS[effectiveCode]) {
      if (totalTicketQuantity < 4) {
        return "Please select 4 or more tickets to apply this coupon";
      }

      return null;
    }

    if (
      (effectiveCode === "GROUP10D1" || effectiveCode === "GROUP10D2") &&
      eventId === "69e87ca50d43584f4c39846d"
    ) {
      const day1TicketName = "DAY 1 General Admission (SINGLE)";
      const day2TicketName = "DAY 2 General Admission (SINGLE)";
      const allowedCategories = new Set([
        day1TicketName.toLowerCase(),
        day2TicketName.toLowerCase(),
      ]);

      const hasInvalidSelectedCategory = selectedItems.some(
        (item) => !allowedCategories.has(item.ticket.name.trim().toLowerCase())
      );

      if (hasInvalidSelectedCategory) {
        return "This coupon is not applicable for selected ticket category";
      }

      const day1Quantity = getTicketQuantityByName(day1TicketName);
      const day2Quantity = getTicketQuantityByName(day2TicketName);
      const combinedQuantity = day1Quantity + day2Quantity;

      if (selectedItems.length > 0 && combinedQuantity === 0) {
        return "This coupon is not applicable for selected ticket category";
      }

      if (combinedQuantity < 4) {
        return "Please select 4 or more tickets to apply this coupon";
      }

      return null;
    }

    if (effectiveCode !== "GROUP10") return null;

    const generalAdmissionItems = selectedItems.filter((item) => {
      const name = item.ticket.name.trim().toLowerCase();
      return name === "general admission" || name.includes("general admission");
    });

    const generalAdmissionQuantity = generalAdmissionItems.reduce((sum, item) => sum + item.quantity, 0);

    const hasOnlyGeneralAdmissionTickets =
      selectedItems.length > 0 && generalAdmissionItems.length === selectedItems.length;

    if (!hasOnlyGeneralAdmissionTickets) {
      return "This coupon is only valid for General Admission tickets";
    }

    if (generalAdmissionQuantity < 4) {
      return "Please select 4 or more tickets to apply this coupon";
    }

    return null;
  };

  const getNormalizedSpecialGroupCouponCode = (code?: string | null) => {
    const normalized = (code ?? "").trim().toUpperCase();

    if (eventId === CHEESE_EVENT_ID && CHEESE_GROUP_COUPONS[normalized]) {
      return normalized;
    }

    if (eventId !== "69e87ca50d43584f4c39846d") return null;
    if (normalized === "GROUP10D1" || normalized === "GROUP10D2") return normalized;
    return null;
  };

  const getSpecialGroupDiscountAmount = () => {
    const amount = subtotalAmount * 0.1;
    return Number(amount.toFixed(2));
  };

  const getGroup10DiscountAmount = () => {
    const percentage = appliedCoupon?.discountPercentage ?? 10;
    return Math.round((subtotalAmount * percentage) / 100);
  };

  // If GROUP10 was applied, but the user later changes ticket selection below the rule,
  // remove the coupon immediately so the discount can't be used.
  useEffect(() => {
    if (!appliedCoupon) return;

    const validationError = getGroup10ValidationError(appliedCoupon.code);
    if (!validationError) return;

    setAppliedCoupon(null);
    setCouponError(validationError);
    toast.error(validationError);
  }, [selectedTickets, appliedCoupon]);

  useEffect(() => {
    if (!appliedCoupon) return;

    const specialCouponCode = getNormalizedSpecialGroupCouponCode(appliedCoupon.code);
    if (!specialCouponCode) return;

    const recalculatedDiscountAmount = getSpecialGroupDiscountAmount();
    if (appliedCoupon.discountAmount === recalculatedDiscountAmount) return;

    setAppliedCoupon((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        code: specialCouponCode,
        discountPercentage: 10,
        discountAmount: recalculatedDiscountAmount,
      };
    });
  }, [selectedTickets, subtotalAmount, appliedCoupon, eventId]);

  useEffect(() => {
    if (!appliedCoupon) return;
    if (appliedCoupon.code?.trim().toUpperCase() !== "GROUP10") return;

    const recalculatedDiscountAmount = getGroup10DiscountAmount();
    if (appliedCoupon.discountAmount === recalculatedDiscountAmount) return;

    setAppliedCoupon((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        discountAmount: recalculatedDiscountAmount,
      };
    });
  }, [selectedTickets, subtotalAmount, appliedCoupon]);

  // Add free ticket for RSVP events
  useEffect(() => {
    if (event && isFreeEvent && event.ticketTypes.length === 0) {
      // Auto-add a free ticket type for RSVP events
      const freeTicket: TicketType = {
        _id: 'free-rsvp-ticket',
        name: 'Free RSVP',
        price: 0,
        quantity: 1000, // Large number for unlimited RSVP
        sold: 0,
        description: 'Free RSVP ticket for this event',
        capacity: 1,
        benefits: ['Free entry to the event']
      };
      setEvent({
        ...event,
        ticketTypes: [freeTicket]
      });
    }
  }, [event, isFreeEvent]);

  const toggleTicketExpansion = (ticketId: string) => {
    setExpandedTickets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId);
      } else {
        newSet.add(ticketId);
      }
      return newSet;
    });
  };

  const handleAddTicket = (ticket: TicketType) => {
    if (!isFormComplete) {
      toast.error(isHMFEvent ? "Please select your country and state first" : "Please fill in all required fields");
      return;
    }

    // For free RSVP events, allow only 1 ticket per user
    if (isFreeEvent && ticket.price === 0) {
      const currentItem = selectedTickets.get(ticket._id);
      if (currentItem && currentItem.quantity >= 1) {
        toast.error("Only 1 RSVP ticket allowed per user");
        return;
      }
    }

    const currentItem = selectedTickets.get(ticket._id);
    const currentQuantity = currentItem?.quantity || 0;
    const newQuantity = currentQuantity + 1;

    // Check availability
    if (newQuantity > ticket.quantity - ticket.sold) {
      toast.error("No more tickets available");
      return;
    }

    // Check 10 ticket limit (only for paid events)
    if (!isFreeEvent) {
      const totalTickets = Array.from(selectedTickets.values()).reduce((sum, item) => sum + item.quantity, 0);
      if (totalTickets >= 10) {
        toast.error("You can add up to 10 tickets only");
        return;
      }
    }

    setSelectedTickets(prev => new Map(prev).set(ticket._id, { ticket, quantity: newQuantity }));
    toast.success(isFreeEvent ? `RSVP confirmed for ${ticket.name}` : `Added ${ticket.name}`);
  };

  const handleRemoveTicket = (ticketId: string) => {
    const currentItem = selectedTickets.get(ticketId);
    if (!currentItem) return;

    const newQuantity = currentItem.quantity - 1;
    if (newQuantity === 0) {
      setSelectedTickets(prev => {
        const newMap = new Map(prev);
        newMap.delete(ticketId);
        return newMap;
      });
    } else {
      setSelectedTickets(prev => new Map(prev).set(ticketId, { ticket: currentItem.ticket, quantity: newQuantity }));
    }
  };

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

      const group10ValidationError = getGroup10ValidationError(couponCode);
      if (group10ValidationError) {
        setAppliedCoupon(null);
        setCouponError(group10ValidationError);
        toast.error(group10ValidationError);
        return;
      }

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
      const appliedCode = (data?.code || couponCode).trim().toUpperCase();
      const specialCouponCode = getNormalizedSpecialGroupCouponCode(appliedCode);
      const normalizedCouponData = specialCouponCode
        ? {
            ...data,
            code: specialCouponCode,
            discountPercentage: 10,
            discountAmount: getSpecialGroupDiscountAmount(),
          }
        : appliedCode === "GROUP10"
          ? {
              ...data,
              discountAmount: Math.round((subtotalAmount * (data.discountPercentage ?? 10)) / 100),
            }
          : data;

      setAppliedCoupon(normalizedCouponData);
      const discountText = normalizedCouponData.discountPercentage !== undefined
        ? `${normalizedCouponData.discountPercentage}% off`
        : normalizedCouponData.discountPrice !== undefined
          ? `₹${normalizedCouponData.discountPrice} off`
          : 'discount applied';
      toast.success(`Coupon ${normalizedCouponData.code} applied: ${discountText}`);
    } catch (e) {
      setCouponError('Failed to apply coupon');
      toast.error('Failed to apply coupon');
    } finally {
      setCouponApplying(false);
    }
  };

  const handleProceed = () => {
    if (selectedTickets.size === 0) {
      toast.error(isFreeEvent ? "Please confirm your RSVP" : "Please select at least one ticket");
      return;
    }

    const analyticsPayload = getAnalyticsEventPayload();
    const checkoutKey = `${eventId}:${payableAmount}:${totalTicketQuantity}`;
    if (analyticsPayload && checkoutStartedKeyRef.current !== checkoutKey) {
      checkoutStartedKeyRef.current = checkoutKey;
      trackCheckoutStarted({
        ...analyticsPayload,
        amount: payableAmount,
      });
    }

    setCurrentStep(3);
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
      toast.error(isFreeEvent ? "Please confirm your RSVP" : "Please select at least one ticket type");
      return;
    }
    if (!acceptedTerms) {
      toast.error("Please accept the terms and conditions");
      return;
    }

    const couponValidationError = getGroup10ValidationError(appliedCoupon?.code);
    if (couponValidationError) {
      setAppliedCoupon(null);
      setCouponError(couponValidationError);
      toast.error(couponValidationError);
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
          trackPurchase({
            transaction_id: createdBookingIds[0],
            value: 0,
            currency: "INR",
            items: Array.from(selectedTickets.values()).map((item) => ({
              item_id: item.ticket._id,
              item_name: item.ticket.name,
              quantity: item.quantity,
              price: item.ticket.price,
            })),
          });
          router.push(`/events/${event._id}/bookings`);
          return;
        } else {
          throw new Error('No booking was created');
        }
      }

// ...
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
                        discountPrice: appliedCoupon.discountPrice,
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
              const analyticsPayload = getAnalyticsEventPayload();
              const currency = orderData.currency || "INR";

              if (analyticsPayload) {
                trackPaymentSuccess({
                  ...analyticsPayload,
                  amount: totalAmount,
                  currency,
                });
              }

              trackPurchase({
                transaction_id: verificationData.booking?._id || response.razorpay_payment_id,
                value: totalAmount,
                currency,
                items: Array.from(selectedTickets.values()).map((item) => ({
                  item_id: item.ticket._id,
                  item_name: item.ticket.name,
                  quantity: item.quantity,
                  price: item.ticket.price,
                })),
              });
              router.push(`/events/${eventId}/bookings`);
            } else {
              const analyticsPayload = getAnalyticsEventPayload();
              if (analyticsPayload) {
                trackPaymentFailed(analyticsPayload);
              }
              toast.error(verificationData.message || "Payment verification failed");
              setIsProcessingPayment(false);
            }
          } catch (error) {
            console.error("Error in payment handler:", error);
            const analyticsPayload = getAnalyticsEventPayload();
            if (analyticsPayload) {
              trackPaymentFailed(analyticsPayload);
            }
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
      rzp.on("payment.failed", () => {
        const analyticsPayload = getAnalyticsEventPayload();
        if (analyticsPayload) {
          trackPaymentFailed(analyticsPayload);
        }
      });
      rzp.open();

    } catch (error) {
      console.error("Booking error:", error);
      const analyticsPayload = getAnalyticsEventPayload();
      if (analyticsPayload) {
        trackPaymentFailed(analyticsPayload);
      }
      const errorMessage = error instanceof Error ? error.message : "Failed to book ticket";
      toast.error(errorMessage);
    } finally {
      setIsBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  const totalTicketsSelected = Array.from(selectedTickets.values()).reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />

      <div className="flex-1">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="max-w-full mx-auto px-4 py-4 sm:max-w-4xl">
            <button
              onClick={() => router.push(`/events/${eventId}`)}
              className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <h1 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h1>
            <div className="text-sm text-gray-600">
              <p>{event.location.address}: {event.location.city}</p>
              <p>{new Date(event.startDate).toLocaleDateString('en-US', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="max-w-full mx-auto px-4 py-6 sm:max-w-4xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
              {[
                { num: 1, label: "Ticket" },
                { num: 2, label: "Ticket Mode" },
                { num: 3, label: "Review & Proceed to Pay" }
              ].map((step, idx) => (
                <div key={step.num} className="flex items-center flex-1 w-full sm:w-auto">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep >= step.num
                      ? 'bg-black text-white'
                      : 'bg-gray-200 text-gray-500'
                      }`}>
                      {currentStep > step.num ? <Check className="w-4 h-4" /> : step.num}
                    </div>
                    <span className={`text-sm font-medium whitespace-nowrap ${currentStep >= step.num ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < 2 && (
                    <div className={`h-px flex-1 mx-4 hidden sm:block ${currentStep > step.num ? 'bg-black' : 'bg-gray-300'
                      }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-full mx-auto px-4 py-8 sm:max-w-4xl">
          {currentStep === 1 && (
            <>
              {/* HMF Country Selection */}
              {isHMFEvent && (
                <div className="mb-8 p-6 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Visitor Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                      <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                        <SelectTrigger className="w-full">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">State/Province *</label>
                      {sortedStates.length > 0 ? (
                        <Select value={selectedState} onValueChange={setSelectedState}>
                          <SelectTrigger className="w-full">
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
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Ticket Selection */}
              <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-2">{isFreeEvent ? 'Confirm RSVP' : 'Select Tickets'}</h2>
                <p className="text-sm text-gray-600 mb-6">{isFreeEvent ? 'Confirm your attendance for this free event' : 'You can add up to 10 tickets only'}</p>

                <div className="space-y-4">
                  {event.ticketTypes && event.ticketTypes.length > 0 ? (
                    event.ticketTypes.map((ticket) => {
                      const isSoldOut = ticket.quantity <= ticket.sold;
                      const selectedItem = selectedTickets.get(ticket._id);
                      const quantity = selectedItem?.quantity || 0;
                      const isExpanded = expandedTickets.has(ticket._id);
                      const availabilityPercentage = Math.max(0, Math.min(100, ((ticket.quantity - ticket.sold) / ticket.quantity) * 100));
                      const isFastFilling = availabilityPercentage <= 30 && !isSoldOut;

                      return (
                        <div
                          key={ticket._id}
                          className="border border-gray-200 rounded-lg overflow-hidden bg-white"
                        >
                          <div className="p-5">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 space-y-2 sm:space-y-0">
                              <div className="flex-1">
                                <h3 className="text-base font-bold text-gray-900">{ticket.name}</h3>
                                {quantity > 0 && (
                                  <p className="text-xs text-gray-600 mt-1">{quantity} ticket{quantity > 1 ? 's' : ''} added</p>
                                )}
                                <p className="mt-2 text-s text-gray-600">
                                  Capacity: {ticket.capacity} {ticket.capacity === 1 ? "person" : "people"}
                                </p>
                              </div>
                              <div className="text-left sm:text-right">
                                <p className="text-lg font-bold text-gray-900">
                                  {ticket.price === 0 ? 'FREE' : `₹${ticket.price.toLocaleString()}`}
                                </p>
                                {isFastFilling && (
                                  <p className="text-xs text-orange-600 font-medium">Fast Filling</p>
                                )}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="mb-4 text-sm text-gray-700">
                                <p className="mb-2">{ticket.description}</p>
                                {ticket.benefits && ticket.benefits.length > 0 && (
                                  <ul className="space-y-1">
                                    {ticket.benefits.map((benefit, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <span className="text-green-600">•</span>
                                        <span>{benefit}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}

                              </div>
                            )}

                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
                              <button
                                onClick={() => toggleTicketExpansion(ticket._id)}
                                className="flex items-center gap-1 text-sm text-red-600 font-medium hover:underline"
                              >
                                Know {isExpanded ? 'less' : 'more'}
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>

                              <div className="flex flex-row sm:flex-row items-center gap-3 w-full sm:w-auto">
                                {quantity > 0 && (
                                  <>
                                    <button
                                      onClick={() => handleRemoveTicket(ticket._id)}
                                      className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                                    >
                                      Remove
                                    </button>
                                    <span className="px-4 py-2 text-sm font-bold bg-gray-100 rounded">
                                      {quantity}
                                    </span>
                                  </>
                                )}
                                <button
                                  onClick={() => handleAddTicket(ticket)}
                                  disabled={isSoldOut || (isFreeEvent && ticket.price === 0 && selectedTickets.has(ticket._id)) || (!isFreeEvent && totalTicketsSelected >= 10)}
                                  className="px-6 py-2 text-sm font-medium text-red-600 border border-red-600 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isSoldOut ? 'Sold Out' : (isFreeEvent && ticket.price === 0 && selectedTickets.has(ticket._id)) ? 'RSVP Confirmed' : (isFreeEvent && ticket.price === 0) ? 'RSVP Now' : 'Add'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <p>No tickets available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Proceed Button */}
              <button
                onClick={handleProceed}
                disabled={selectedTickets.size === 0}
                className="
    w-full
    py-3 sm:py-4
    bg-red-600
    text-white
    font-semibold
    text-base sm:text-lg
    rounded-xl
    shadow-lg
    hover:bg-red-700
    active:scale-[0.98]
    transition-all duration-200 ease-in-out
    disabled:opacity-50
    disabled:cursor-not-allowed
    disabled:shadow-none
  "
              >
                {isFreeEvent ? "Proceed to Confirm RSVP" : "Proceed"}
              </button>

            </>
          )}

          {currentStep === 3 && (
            <div className="mb-10">

              {/* Heading */}
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {isFreeEvent ? "Review & Confirm RSVP" : "Review & Proceed to Pay"}
              </h2>

              {/* Order Summary Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">

                {/* Selected Tickets */}
                <div className="space-y-5">
                  {Array.from(selectedTickets.values()).map((item) => (
                    <div
                      key={item.ticket._id}
                      className="flex justify-between items-start sm:items-center gap-4"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.ticket.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {item.quantity} ×{" "}
                          {item.ticket.price === 0
                            ? "FREE"
                            : `₹${item.ticket.price.toLocaleString()}`}
                        </p>
                      </div>

                      <p className="font-semibold text-gray-900 text-right">
                        {item.ticket.price === 0
                          ? "FREE"
                          : `₹${(item.ticket.price * item.quantity).toLocaleString()}`}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Coupon Section */}
                {!isFreeEvent && (
                  <div className="border-t border-gray-200 mt-6 pt-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        placeholder="Enter coupon code"
                        value={couponCode}
                        onChange={(e) =>
                          setCouponCode(e.target.value.toUpperCase())
                        }
                        className="flex-1"
                      />
                      <Button
                        onClick={handleApplyCoupon}
                        disabled={couponApplying || !couponCode.trim()}
                        variant="outline"
                        className="sm:w-auto w-full"
                      >
                        {couponApplying ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Apply"
                        )}
                      </Button>
                    </div>

                    {couponError && (
                      <p className="text-xs text-red-600 mt-2">
                        {couponError}
                      </p>
                    )}

                    {appliedCoupon && (
                      <p className="text-xs text-green-600 mt-2">
                        Code {appliedCoupon.code} applied
                      </p>
                    )}
                  </div>
                )}

                {/* Totals */}
                <div className="border-t border-gray-200 mt-6 pt-6 space-y-3">

                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>
                      {subtotalAmount === 0
                        ? "FREE"
                        : `₹${subtotalAmount.toLocaleString()}`}
                    </span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-₹{discountAmount.toLocaleString()}</span>
                    </div>
                  )}

                  {!isFreeEvent && subtotalAmount > 0 && (
                    <CheckoutDetailedBreakdown
                      selectedTickets={selectedTickets}
                      convenience={event?.convenience}
                    />
                  )}

                  <div className="flex justify-between text-lg font-semibold text-gray-900 pt-2">
                    <span>{isFreeEvent ? "RSVP Status" : "Total"}</span>
                    <span>
                      {payableAmount === 0
                        ? "Confirmed"
                        : `₹${payableAmount.toLocaleString()}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <label className="flex items-start gap-3 mb-8 cursor-pointer">
                <Checkbox
                  checked={acceptedTerms}
                  onCheckedChange={(checked) =>
                    setAcceptedTerms(checked as boolean)
                  }
                  className="mt-1"
                />
                <span className="text-sm text-gray-700 leading-relaxed">
                  I accept the{" "}
                  <button
                    type="button"
                    onClick={() => setTermsModalOpen(true)}
                    className="font-semibold underline hover:text-black"
                  >
                    Terms and Conditions
                  </button>
                </span>
              </label>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">

                <button
                  onClick={() => setCurrentStep(1)}
                  className="w-full sm:w-auto px-6 py-3 sm:py-4 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
                >
                  Back
                </button>

                <button
                  onClick={handleBooking}
                  disabled={isBooking || !acceptedTerms}
                  className="
           w-full
    py-3 sm:py-4
    bg-red-600
    text-white
    font-semibold
    text-base sm:text-lg
    rounded-xl
    shadow-lg
    hover:bg-red-700
    active:scale-[0.98]
    transition-all duration-200 ease-in-out
    disabled:opacity-50
    disabled:cursor-not-allowed
    disabled:shadow-none
        "
                >
                  {isBooking ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </span>
                  ) : isFreeEvent ? (
                    "Confirm RSVP"
                  ) : (
                    "Proceed to Payment"
                  )}
                </button>

              </div>
            </div>
          )}

        </div>
      </div>

      {/* Payment Processing Overlay */}
      {isProcessingPayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 sm:p-8 max-w-sm w-full text-center">
            <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {isFreeEvent ? 'Confirming RSVP' : 'Processing Payment'}
            </h3>
            <p className="text-gray-600">
              {isFreeEvent ? 'Please wait...' : 'Do not close this window...'}
            </p>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      <Dialog open={termsModalOpen} onOpenChange={setTermsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle>Terms & Conditions</DialogTitle>
            {isHMFEvent && <DialogDescription>Hornbill Music Festival 2025</DialogDescription>}
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