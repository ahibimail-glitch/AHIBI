"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Check,
  Calendar as CalendarIcon,
} from "lucide-react";
import Script from "next/script";
import { format, isSameDay, startOfDay } from "date-fns";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface DailyEvent {
  _id: string;
  title: string;
  description: string;
  banner: string;
  periodStartDate: string;
  periodEndDate: string;
  startTime: string;
  duration: {
    hours: number;
    minutes: number;
  };
  activeDates: string[];
  category: string;
  ticketTypes: TicketType[];
  location: {
    address: string;
    city: string;
  };
  isFreeEvent?: boolean;
  termsAndConditions?: string;
  bookingDeadlineHours?: number;
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

export default function DailyEventCheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<DailyEvent | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("");
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

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/daily-events/${eventId}`);
        if (!response.ok) throw new Error("Failed to fetch daily event");
        const data = await response.json();
        setEvent(data);
      } catch (err) {
        toast.error("Failed to load daily event details");
        router.push(`/events/daily/${eventId}`);
      } finally {
        setLoading(false);
      }
    };

    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Please login to continue");
          router.push(`/auth?redirect=/events/daily/${eventId}/checkout`);
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
          router.push(`/auth?redirect=/events/daily/${eventId}/checkout`);
          return;
        }
        setUser(data.data.user);
      } catch (e) {
        toast.error("Authentication error");
        router.push(`/auth?redirect=/events/daily/${eventId}/checkout`);
      }
    };

    fetchProfile();
    fetchEvent();
  }, [eventId, router]);

  const subtotalAmount = Array.from(selectedTickets.values()).reduce((sum, item) => sum + (item.ticket.price * item.quantity), 0);
  const discountAmount = appliedCoupon?.discountAmount || 0;
  const payableAmount = Math.max(0, subtotalAmount - discountAmount);

  const isFreeEvent = event?.isFreeEvent || false;

  const activeDates = event?.activeDates ?? [];
  const sortedActiveDates = [...activeDates].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const today = startOfDay(new Date());
  const futureActiveDates = sortedActiveDates.filter((d) => startOfDay(new Date(d)).getTime() >= today.getTime());
  const minFutureActiveDate = futureActiveDates.length ? new Date(futureActiveDates[0]) : undefined;
  const maxFutureActiveDate = futureActiveDates.length ? new Date(futureActiveDates[futureActiveDates.length - 1]) : undefined;

  const selectedDay = selectedDate ? new Date(selectedDate) : undefined;

  const isDateAvailable = (date: Date) =>
    startOfDay(date).getTime() >= today.getTime() && futureActiveDates.some((d) => isSameDay(new Date(d), date));

  const getGroup10ValidationError = () => {
    const normalizedCode = couponCode.trim().toUpperCase();
    const appliedCode = appliedCoupon?.code?.trim().toUpperCase();

    if (normalizedCode !== "GROUP10" && appliedCode !== "GROUP10") {
      return null;
    }

    const selectedItems = Array.from(selectedTickets.values());
    const generalAdmissionItems = selectedItems.filter(
      (item) => item.ticket.name.trim().toLowerCase() === "general admission"
    );
    const generalAdmissionQuantity = generalAdmissionItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
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

  const handleSelectDate = (day: Date | undefined) => {
    if (!day) return;
    if (startOfDay(day).getTime() < today.getTime()) return;
    const match = futureActiveDates.find((d) => isSameDay(new Date(d), day));
    if (match) setSelectedDate(match);
  };

  const handleClearDate = () => {
    setSelectedDate("");
    setSelectedTickets(new Map());
  };

  useEffect(() => {
    if (!appliedCoupon) return;

    const validationError = getGroup10ValidationError();
    if (!validationError) return;

    setAppliedCoupon(null);
    setCouponError(validationError);
    toast.error(validationError);
  }, [selectedTickets, appliedCoupon]);

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
    if (!selectedDate) {
      toast.error("Please select a date first");
      return;
    }

    if (event?.bookingDeadlineHours && event.bookingDeadlineHours > 0) {
      const eventDateTime = new Date(selectedDate);
      const [hours, minutes] = event.startTime.split(':').map(Number);
      eventDateTime.setHours(hours, minutes, 0, 0);
      
      const deadlineTime = new Date(eventDateTime.getTime() - (event.bookingDeadlineHours * 60 * 60 * 1000));
      const now = new Date();
      
      if (now >= deadlineTime) {
        toast.error(`Booking deadline has passed. Bookings close ${event.bookingDeadlineHours} hours before the event.`);
        return;
      }
    }

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

    if (newQuantity > ticket.quantity - ticket.sold) {
      toast.error("No more tickets available");
      return;
    }

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

      const group10ValidationError = getGroup10ValidationError();
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
      setAppliedCoupon(data);
      const discountText = data.discountPercentage !== undefined 
        ? `${data.discountPercentage}% off` 
        : data.discountPrice !== undefined 
          ? `₹${data.discountPrice} off`
          : 'discount applied';
      toast.success(`Coupon ${data.code} applied: ${discountText}`);
    } catch (e) {
      setCouponError('Failed to apply coupon');
      toast.error('Failed to apply coupon');
    } finally {
      setCouponApplying(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
    toast.success("Coupon removed");
  };

  const handleProceedToPayment = async () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    if (selectedTickets.size === 0) {
      toast.error("Please select at least one ticket");
      return;
    }

    if (!acceptedTerms) {
      toast.error("Please accept the terms and conditions");
      return;
    }

    if (event?.bookingDeadlineHours && event.bookingDeadlineHours > 0) {
      const eventDateTime = new Date(selectedDate);
      const [hours, minutes] = event.startTime.split(':').map(Number);
      eventDateTime.setHours(hours, minutes, 0, 0);
      
      const deadlineTime = new Date(eventDateTime.getTime() - (event.bookingDeadlineHours * 60 * 60 * 1000));
      const now = new Date();
      
      if (now >= deadlineTime) {
        toast.error(`Booking deadline has passed. Bookings close ${event.bookingDeadlineHours} hours before the event.`);
        return;
      }
    }

    if (isFreeEvent) {
      await handleFreeBooking();
    } else {
      await initiatePayment();
    }
  };

  const handleFreeBooking = async () => {
    try {
      setIsBooking(true);
      setBookingError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please login to continue");
        return;
      }

      const bookings = Array.from(selectedTickets.values()).map(item => ({
        dailyEvent: event!._id,
        selectedDate: selectedDate,
        ticketType: item.ticket._id,
        quantity: item.quantity,
        price: item.ticket.price,
        total: item.ticket.price * item.quantity,
        isDailyEvent: true,
      }));

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bookings/free`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookings }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create booking");
      }

      toast.success("RSVP confirmed successfully!");
      router.push(`/events/daily/${eventId}/bookings`);
    } catch (err: any) {
      setBookingError(err.message || "Failed to create booking");
      toast.error(err.message || "Failed to create booking");
    } finally {
      setIsBooking(false);
    }
  };

  const initiatePayment = async () => {
    try {
      setIsBooking(true);
      setBookingError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please login to continue");
        return;
      }

      const group10ValidationError = getGroup10ValidationError();
      if (group10ValidationError) {
        setAppliedCoupon(null);
        setCouponError(group10ValidationError);
        toast.error(group10ValidationError);
        setIsBooking(false);
        return;
      }

      const bookings = Array.from(selectedTickets.values()).map(item => ({
        dailyEvent: event!._id,
        selectedDate: selectedDate,
        ticketType: item.ticket._id,
        quantity: item.quantity,
        price: item.ticket.price,
        total: item.ticket.price * item.quantity,
        isDailyEvent: true,
      }));

      const payload: any = { bookings };
      if (appliedCoupon) {
        payload.couponCode = appliedCoupon.code;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bookings/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to initiate payment");
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: data.order.currency,
        name: event!.title,
        description: `Booking for ${format(new Date(selectedDate), "MMM dd, yyyy")}`,
        order_id: data.order.id,
        handler: async (response: RazorpayResponse) => {
          await verifyPayment(response, data.bookingIds);
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone,
        },
        theme: {
          color: "#3B82F6",
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.on("payment.failed", (response: any) => {
        toast.error("Payment failed. Please try again.");
        setIsBooking(false);
      });
      razorpay.open();
    } catch (err: any) {
      setBookingError(err.message || "Failed to initiate payment");
      toast.error(err.message || "Failed to initiate payment");
      setIsBooking(false);
    }
  };

  const verifyPayment = async (razorpayResponse: RazorpayResponse, bookingIds: string[]) => {
    try {
      setIsProcessingPayment(true);

      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bookings/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          razorpay_payment_id: razorpayResponse.razorpay_payment_id,
          razorpay_order_id: razorpayResponse.razorpay_order_id,
          razorpay_signature: razorpayResponse.razorpay_signature,
          bookingIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Payment verification failed");
      }

      toast.success("Payment successful! Booking confirmed.");
      router.push(`/events/daily/${eventId}/bookings`);
    } catch (err: any) {
      toast.error(err.message || "Payment verification failed");
      setIsProcessingPayment(false);
      setIsBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!event || !user) {
    return null;
  }

  const totalTickets = Array.from(selectedTickets.values()).reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <Navbar />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <Button
            variant="ghost"
            onClick={() => router.push(`/events/daily/${eventId}`)}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Event
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h1>
                <p className="text-gray-600 mb-4">{event.category}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CalendarIcon className="h-4 w-4" />
                  <span>
                    {format(new Date(event.periodStartDate), "MMM dd")} - {format(new Date(event.periodEndDate), "MMM dd, yyyy")}
                  </span>
                  <span className="mx-2">•</span>
                  <span>{event.startTime} ({event.duration.hours}h {event.duration.minutes}m)</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Select Date</h2>
                <div className="space-y-3 ">
                  <Calendar
                    mode="single"
                    selected={selectedDay}
                    onSelect={handleSelectDate}
                    disabled={(date) => !isDateAvailable(date)}
                    showOutsideDays={false}
                    defaultMonth={minFutureActiveDate ?? today}
                    fromDate={today}
                    toDate={maxFutureActiveDate}
                    className="rounded-md border bg-white lg:px-52"
                  />
                  <p className="text-sm text-gray-600">
                    {selectedDate
                      ? format(new Date(selectedDate), "EEEE, MMMM dd, yyyy")
                      : "Select a  date"}
                  </p>

                  {selectedDate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearDate}
                      className="w-fit"
                    >
                      Clear date
                    </Button>
                  )}
                </div>
                {/* {event.bookingDeadlineHours && event.bookingDeadlineHours > 0 && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <strong>Note:</strong> Bookings close {event.bookingDeadlineHours} hour{event.bookingDeadlineHours !== 1 ? 's' : ''} before the event start time.
                    </p>
                  </div>
                )} */}
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Select Tickets</h2>
                <div className="space-y-4">
                  {event.ticketTypes.map((ticket) => {
                    const selectedItem = selectedTickets.get(ticket._id);
                    const available = ticket.quantity - ticket.sold;
                    const isExpanded = expandedTickets.has(ticket._id);

                    return (
                      <div key={ticket._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{ticket.name}</h3>
                            <p className="text-sm text-gray-600">{ticket.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">
                              {ticket.price === 0 ? "Free" : `₹${ticket.price}`}
                            </p>
                            {/* <p className="text-xs text-gray-500">{available} available</p> */}
                          </div>
                        </div>

                        {ticket.benefits && ticket.benefits.length > 0 && (
                          <div className="mb-3">
                            <button
                              onClick={() => toggleTicketExpansion(ticket._id)}
                              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              {isExpanded ? "Hide" : "Show"} benefits
                            </button>
                            {isExpanded && (
                              <ul className="mt-2 space-y-1">
                                {ticket.benefits.map((benefit, idx) => (
                                  <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    {benefit}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          {selectedItem ? (
                            <div className="flex items-center gap-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveTicket(ticket._id)}
                              >
                                -
                              </Button>
                              <span className="font-semibold">{selectedItem.quantity}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddTicket(ticket)}
                                disabled={available === 0}
                              >
                                +
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddTicket(ticket)}
                              disabled={available === 0 || !selectedDate}
                            >
                              Add
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {!isFreeEvent && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Apply Coupon</h2>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
                      <div>
                        <p className="font-semibold text-green-900">{appliedCoupon.code}</p>
                        <p className="text-sm text-green-700">
                          {appliedCoupon.discountPercentage !== undefined
                            ? `${appliedCoupon.discountPercentage}% off`
                            : `₹${appliedCoupon.discountPrice} off`}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleRemoveCoupon}>
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter coupon code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleApplyCoupon}
                        disabled={!couponCode || couponApplying}
                      >
                        {couponApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                      </Button>
                    </div>
                  )}
                  {couponError && <p className="text-sm text-red-600 mt-2">{couponError}</p>}
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-6 bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Booking Summary</h2>

                <div className="space-y-3 mb-4">
                  {Array.from(selectedTickets.values()).map(item => (
                    <div key={item.ticket._id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.ticket.name} x {item.quantity}
                      </span>
                      <span className="font-semibold">₹{(item.ticket.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold">₹{subtotalAmount.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                    <span>Total</span>
                    <span>₹{payableAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                    />
                    <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
                      I accept the{" "}
                      {event.termsAndConditions ? (
                        <button
                          onClick={() => setTermsModalOpen(true)}
                          className="text-blue-600 hover:underline"
                        >
                          terms and conditions
                        </button>
                      ) : (
                        <span className="text-blue-600">terms and conditions</span>
                      )}
                    </label>
                  </div>
                </div>

                <Button
                  onClick={handleProceedToPayment}
                  disabled={isBooking || isProcessingPayment || selectedTickets.size === 0 || !acceptedTerms || !selectedDate}
                  className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isBooking || isProcessingPayment ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {isFreeEvent ? "Confirm RSVP" : "Proceed to Payment"}
                </Button>

                {bookingError && (
                  <p className="text-sm text-red-600 mt-2">{bookingError}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={termsModalOpen} onOpenChange={setTermsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Terms and Conditions</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap">{event.termsAndConditions}</p>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
