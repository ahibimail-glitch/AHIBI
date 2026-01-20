"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Calendar, Clock, Users, MapPin, IndianRupee, CheckCircle, XCircle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getApiUrl } from "@/config";

interface Court {
  _id: string;
  courtName: string;
  courtNumber: string;
  sportType: string;
  specifications: {
    surfaceType: string;
    dimensions: {
      length: number;
      width: number;
      unit: string;
    };
    indoor: boolean;
    covered: boolean;
    airConditioned: boolean;
  };
  capacity: {
    players: number;
    spectators: number;
  };
  pricing: {
    weekday: {
      offPeak: { pricePerHour: number; timeRange: { start: string; end: string } };
      peak: { pricePerHour: number; timeRange: { start: string; end: string } };
    };
    weekend: {
      offPeak: { pricePerHour: number; timeRange: { start: string; end: string } };
      peak: { pricePerHour: number; timeRange: { start: string; end: string } };
    };
    minimumDuration: number;
    maximumDuration: number;
    slotInterval: number;
  };
  venue: {
    _id: string;
    venueName: string;
    address: {
      street: string;
      city: string;
      state: string;
      pincode: string;
    };
    operatingHours?: {
      monday?: { open?: string; close?: string; closed?: boolean };
      tuesday?: { open?: string; close?: string; closed?: boolean };
      wednesday?: { open?: string; close?: string; closed?: boolean };
      thursday?: { open?: string; close?: string; closed?: boolean };
      friday?: { open?: string; close?: string; closed?: boolean };
      saturday?: { open?: string; close?: string; closed?: boolean };
      sunday?: { open?: string; close?: string; closed?: boolean };
    };
  };
  images: Array<{ url: string; caption: string; isMain: boolean }>;
  features: {
    lighting: boolean;
    scoreboard: boolean;
    nets: boolean;
    goals: boolean;
    seating: boolean;
    soundSystem: boolean;
    cctv: boolean;
  };
}

interface TimeSlot {
  _id: string;
  startTime: string;
  endTime: string;
  price: number;
  status: "available" | "booked" | "held" | "blocked";
  duration: number;
}

interface BookingDetails {
  numberOfPlayers: number;
  contactDetails: {
    name: string;
    phone: string;
    email: string;
  };
  specialRequests: string;
}

export default function CourtBookingPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const courtId = params.id as string;

  const [court, setCourt] = useState<Court | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails>({
    numberOfPlayers: 1,
    contactDetails: {
      name: "",
      phone: "",
      email: "",
    },
    specialRequests: "",
  });

  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingStep, setBookingStep] = useState<"slots" | "details" | "payment">("slots");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [error, setError] = useState("");

  const [previewAdvancePaymentPercent, setPreviewAdvancePaymentPercent] = useState<number>(10);

  const [paymentSummary, setPaymentSummary] = useState<{
    advancePaymentPercent: number;
    payableAmount: number;
    totalAmount: number;
  } | null>(null);

  // Fetch court details
  useEffect(() => {
    const fetchCourtDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(getApiUrl(`/sports/courts/${courtId}`));
        const data = await response.json();

        if (data.success && data.data.court) {
          setCourt(data.data.court);
          setPreviewAdvancePaymentPercent(Number(data.data.advancePaymentPercent) || 10);
        } else {
          setError("Court not found");
        }
      } catch (err) {
        console.error("Error fetching court:", err);
        setError("Failed to load court details");
      } finally {
        setLoading(false);
      }
    };

    if (courtId) {
      fetchCourtDetails();
    }
  }, [courtId]);

  const getDayKeyForDate = (date: Date) => {
    const days: Array<
      "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday"
    > = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

    return days[date.getDay()];
  };

  const operatingHoursForSelectedDate = useMemo(() => {
    if (!court?.venue?.operatingHours) return null;

    const dayKey = getDayKeyForDate(selectedDate);
    const hours = (court.venue.operatingHours as any)[dayKey];

    if (!hours || hours.closed) return null;

    return {
      open: hours.open || "06:00",
      close: hours.close || "23:00",
    };
  }, [court, selectedDate]);

  const slotsWithinOperatingHours = useMemo(() => {
    if (!operatingHoursForSelectedDate) return availableSlots;

    const { open, close } = operatingHoursForSelectedDate;

    return availableSlots.filter((slot) => {
      // Keep a small safety net to ensure we never show slots outside venue hours,
      // even if they were accidentally generated server-side.
      return slot.startTime >= open && slot.endTime <= close;
    });
  }, [availableSlots, operatingHoursForSelectedDate]);

  // Fetch available slots when date changes
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!courtId || !selectedDate) return;

      try {
        setSlotsLoading(true);
        setError("");
        const dateStr = selectedDate.toISOString().split("T")[0];
        const response = await fetch(
          getApiUrl(`/sports/courts/${courtId}/slots?date=${dateStr}`)
        );
        const data = await response.json();

        if (data.success) {
          setAvailableSlots(data.data.slots || []);
        } else {
          setError(data.message || "Failed to load slots");
        }
      } catch (err) {
        console.error("Error fetching slots:", err);
        setError("Failed to load available slots");
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchAvailableSlots();
  }, [courtId, selectedDate]);

  // Auto-fill contact details from user
  useEffect(() => {
    if (user) {
      setBookingDetails((prev) => ({
        ...prev,
        contactDetails: {
          name: user.name || "",
          phone: user.phone || "",
          email: user.email || "",
        },
      }));
    }
  }, [user]);

  const handleDateChange = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    
    // Don't allow past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newDate >= today) {
      setSelectedDate(newDate);
      setSelectedSlots([]);
    }
  };

  const handleSlotSelection = (slot: TimeSlot) => {
    if (slot.status !== "available") return;

    const isSelected = selectedSlots.some((s) => s._id === slot._id);

    if (isSelected) {
      setSelectedSlots(selectedSlots.filter((s) => s._id !== slot._id));
    } else {
      // Check if slot is consecutive
      const newSlots = [...selectedSlots, slot].sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      );

      // Validate consecutive slots
      let isConsecutive = true;
      for (let i = 1; i < newSlots.length; i++) {
        if (newSlots[i - 1].endTime !== newSlots[i].startTime) {
          isConsecutive = false;
          break;
        }
      }

      if (isConsecutive) {
        setSelectedSlots(newSlots);
      } else {
        alert("Please select consecutive time slots");
      }
    }
  };

  const calculateTotalPrice = () => {
    const baseAmount = selectedSlots.reduce((sum, slot) => sum + slot.price, 0);
    const platformFee = 0;
    const taxes = 0;
    const totalAmount = baseAmount;

    return { baseAmount, platformFee, taxes, totalAmount };
  };

  const handleProceedToDetails = () => {
    if (selectedSlots.length === 0) {
      alert("Please select at least one time slot");
      return;
    }

    if (!user) {
      router.push(`/auth?redirect=/sports/courts/${courtId}/booking`);
      return;
    }

    setBookingStep("details");
  };

  const handleProceedToPayment = () => {
    if (!bookingDetails.contactDetails.name || !bookingDetails.contactDetails.phone) {
      alert("Please fill in all required contact details");
      return;
    }

    if (bookingDetails.numberOfPlayers < 1 || bookingDetails.numberOfPlayers > (court?.capacity.players || 1)) {
      alert(`Number of players must be between 1 and ${court?.capacity.players}`);
      return;
    }

    setBookingStep("payment");
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!user) {
      router.push(`/auth?redirect=/sports/courts/${courtId}/booking`);
      return;
    }

    try {
      setProcessingPayment(true);
      setError("");

      // Step 1: Hold slots
      const holdResponse = await fetch(getApiUrl('/sports/slots/hold'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          slotIds: selectedSlots.map((s) => s._id),
        }),
      });

      const holdData = await holdResponse.json();
      if (!holdData.success) {
        throw new Error(holdData.message || "Failed to hold slots");
      }

      // Step 2: Create order
      const orderResponse = await fetch(getApiUrl('/sports/bookings/create-order'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          venueId: court?.venue._id,
          courtId: courtId,
          slotIds: selectedSlots.map((s) => s._id),
          numberOfPlayers: bookingDetails.numberOfPlayers,
          contactDetails: bookingDetails.contactDetails,
        }),
      });

      const orderData = await orderResponse.json();
      if (!orderData.success) {
        throw new Error(orderData.message || "Failed to create order");
      }

      setPaymentSummary({
        advancePaymentPercent: Number(orderData.data?.pricing?.advancePaymentPercent) || 10,
        payableAmount: Number(orderData.data?.pricing?.payableAmount) || Math.round(Number(orderData.data?.amount || 0) / 100),
        totalAmount: Number(orderData.data?.pricing?.totalAmount) || pricing.totalAmount,
      });

      // Step 3: Load Razorpay
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load payment gateway");
      }

      // Step 4: Open Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.data.amount,
        currency: orderData.data.currency,
        name: court?.venue.venueName || "AHIBI Sports",
        description: `${court?.courtName} - ${court?.sportType}`,
        order_id: orderData.data.orderId,
        handler: async function (response: any) {
          try {
            // Verify payment
            const verifyResponse = await fetch(getApiUrl('/sports/bookings/verify-payment'), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                contactDetails: bookingDetails.contactDetails,
                specialRequests: bookingDetails.specialRequests,
              }),
            });

            const verifyData = await verifyResponse.json();
            if (verifyData.success) {
              router.push(`/sports/bookings/${verifyData.data.booking._id}?success=true`);
            } else {
              throw new Error(verifyData.message || "Payment verification failed");
            }
          } catch (err: any) {
            setError(err.message || "Payment verification failed");
            setProcessingPayment(false);
          }
        },
        prefill: {
          name: bookingDetails.contactDetails.name,
          email: bookingDetails.contactDetails.email,
          contact: bookingDetails.contactDetails.phone,
        },
        theme: {
          color: "#f97316",
        },
        modal: {
          ondismiss: function () {
            setProcessingPayment(false);
            // Release slots
            fetch(getApiUrl('/sports/slots/release'), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              body: JSON.stringify({
                slotIds: selectedSlots.map((s) => s._id),
              }),
            });
          },
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      console.error("Payment error:", err);
      setError(err.message || "Payment failed");
      setProcessingPayment(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!court) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Court Not Found</h2>
          <p className="text-gray-600">The court you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const pricing = calculateTotalPrice();
  const selectedDuration = selectedSlots.reduce((sum, slot) => sum + slot.duration, 0);

  const advancePaymentPercent = paymentSummary?.advancePaymentPercent ?? previewAdvancePaymentPercent ?? 10;
  const payNowAmount = paymentSummary?.payableAmount ?? Math.max(0, Math.round((pricing.totalAmount * advancePaymentPercent) / 100));

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{court.courtName}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  <span>{court.venue.venueName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">
                    {court.sportType.toUpperCase()}
                  </span>
                </div>
                {court.specifications.indoor && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">Indoor</span>
                )}
                {court.specifications.airConditioned && (
                  <span className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs">AC</span>
                )}
              </div>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  bookingStep === "slots" ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-500"
                }`}
              >
                1
              </div>
              <span className="text-xs mt-2 font-medium">Select Slots</span>
            </div>
            <div className="flex-1 h-1 bg-gray-200 mx-2">
              <div
                className={`h-full transition-all ${
                  bookingStep !== "slots" ? "bg-orange-500" : "bg-gray-200"
                }`}
              />
            </div>
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  bookingStep === "details"
                    ? "bg-orange-500 text-white"
                    : bookingStep === "payment"
                    ? "bg-orange-100 text-orange-500"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                2
              </div>
              <span className="text-xs mt-2 font-medium">Details</span>
            </div>
            <div className="flex-1 h-1 bg-gray-200 mx-2">
              <div
                className={`h-full transition-all ${
                  bookingStep === "payment" ? "bg-orange-500" : "bg-gray-200"
                }`}
              />
            </div>
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  bookingStep === "payment" ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-400"
                }`}
              >
                3
              </div>
              <span className="text-xs mt-2 font-medium">Payment</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {bookingStep === "slots" && (
              <>
                {/* Date Selection */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-500" />
                    Select Date
                  </h2>
                  <div className="flex items-center justify-between gap-4">
                    <button
                      onClick={() => handleDateChange(-1)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      disabled={selectedDate.toDateString() === new Date().toDateString()}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex-1 text-center">
                      <div className="text-2xl font-bold text-gray-800">
                        {selectedDate.toLocaleDateString("en-US", { weekday: "short" })}
                      </div>
                      <div className="text-lg text-gray-600">
                        {selectedDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDateChange(1)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-7 gap-2">
                    {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                      const date = new Date();
                      date.setDate(date.getDate() + offset);
                      const isSelected = date.toDateString() === selectedDate.toDateString();
                      const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

                      return (
                        <button
                          key={offset}
                          onClick={() => !isPast && setSelectedDate(date)}
                          disabled={isPast}
                          className={`p-3 rounded-lg text-center transition-all ${
                            isSelected
                              ? "bg-orange-500 text-white shadow-lg"
                              : isPast
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-gray-50 hover:bg-orange-50 text-gray-700"
                          }`}
                        >
                          <div className="text-xs font-medium">
                            {date.toLocaleDateString("en-US", { weekday: "short" })}
                          </div>
                          <div className="text-lg font-bold">{date.getDate()}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slots */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-orange-500" />
                      Available Time Slots
                    </h2>
                    {operatingHoursForSelectedDate && (
                      <div className="text-xs text-gray-600 bg-gray-50 px-3 py-1 rounded-full border border-dashed border-gray-200">
                        Venue hours:{" "}
                        <span className="font-semibold">
                          {operatingHoursForSelectedDate.open} - {operatingHoursForSelectedDate.close}
                        </span>
                      </div>
                    )}
                  </div>

                  {slotsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    </div>
                  ) : slotsWithinOperatingHours.length === 0 ? (
                    <div className="text-center py-12">
                      <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No slots available for this date</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {slotsWithinOperatingHours.map((slot) => {
                        const isSelected = selectedSlots.some((s) => s._id === slot._id);
                        const isAvailable = slot.status === "available";

                        return (
                          <button
                            key={slot._id}
                            onClick={() => handleSlotSelection(slot)}
                            disabled={!isAvailable}
                            className={`p-4 rounded-lg border-2 transition-all ${
                              isSelected
                                ? "border-orange-500 bg-orange-50"
                                : isAvailable
                                ? "border-gray-200 hover:border-orange-300 bg-white"
                                : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-50"
                            }`}
                          >
                            <div className="text-sm font-bold text-gray-800">
                              {slot.startTime}
                            </div>
                            <div className="text-xs text-gray-500">{slot.endTime}</div>
                            <div className="text-xs font-medium text-orange-600 mt-1">
                              ₹{slot.price}
                            </div>
                            {!isAvailable && (
                              <div className="text-xs text-red-500 mt-1">Booked</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {selectedSlots.length > 0 && (
                    <div className="mt-6 p-4 bg-orange-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Selected Time</p>
                          <p className="text-lg font-bold text-gray-800">
                            {selectedSlots[0].startTime} -{" "}
                            {selectedSlots[selectedSlots.length - 1].endTime}
                          </p>
                          <p className="text-sm text-gray-600">
                            Duration: {selectedDuration} minutes
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedSlots([])}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {bookingStep === "details" && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-500" />
                  Booking Details
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Players *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={court.capacity.players}
                      value={bookingDetails.numberOfPlayers}
                      onChange={(e) =>
                        setBookingDetails({
                          ...bookingDetails,
                          numberOfPlayers: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum: {court.capacity.players} players
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={bookingDetails.contactDetails.name}
                      onChange={(e) =>
                        setBookingDetails({
                          ...bookingDetails,
                          contactDetails: {
                            ...bookingDetails.contactDetails,
                            name: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={bookingDetails.contactDetails.phone}
                      onChange={(e) =>
                        setBookingDetails({
                          ...bookingDetails,
                          contactDetails: {
                            ...bookingDetails.contactDetails,
                            phone: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={bookingDetails.contactDetails.email}
                      onChange={(e) =>
                        setBookingDetails({
                          ...bookingDetails,
                          contactDetails: {
                            ...bookingDetails.contactDetails,
                            email: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Special Requests (Optional)
                    </label>
                    <textarea
                      value={bookingDetails.specialRequests}
                      onChange={(e) =>
                        setBookingDetails({
                          ...bookingDetails,
                          specialRequests: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Any special requirements or notes..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setBookingStep("slots")}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleProceedToPayment}
                    className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Continue to Payment
                  </button>
                </div>
              </div>
            )}

            {bookingStep === "payment" && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-orange-500" />
                  Payment Summary
                </h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-700">
                    <span>Court Charges</span>
                    <span>₹{pricing.baseAmount}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-lg font-bold text-gray-800">
                    <span>Total Amount</span>
                    <span>₹{pricing.totalAmount}</span>
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4 mb-6">
                  <div className="flex justify-between text-gray-700">
                    <span>Advance to pay now ({advancePaymentPercent}%)</span>
                    <span className="font-bold">₹{payNowAmount}</span>
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-800 mb-2">Booking Summary</h3>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p>
                      <strong>Date:</strong>{" "}
                      {selectedDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p>
                      <strong>Time:</strong> {selectedSlots[0]?.startTime} -{" "}
                      {selectedSlots[selectedSlots.length - 1]?.endTime}
                    </p>
                    <p>
                      <strong>Duration:</strong> {selectedDuration} minutes
                    </p>
                    <p>
                      <strong>Players:</strong> {bookingDetails.numberOfPlayers}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setBookingStep("details")}
                    disabled={processingPayment}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePayment}
                    disabled={processingPayment}
                    className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processingPayment ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Pay ₹{payNowAmount}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Booking Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Booking Summary</h3>

              {court.images && court.images.length > 0 && (
                <img
                  src={court.images.find((img) => img.isMain)?.url || court.images[0]?.url}
                  alt={court.courtName}
                  className="w-full h-40 object-cover rounded-lg mb-4"
                />
              )}

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">Court</p>
                  <p className="font-semibold text-gray-800">{court.courtName}</p>
                </div>

                <div>
                  <p className="text-gray-600">Sport</p>
                  <p className="font-semibold text-gray-800">{court.sportType.toUpperCase()}</p>
                </div>

                {selectedSlots.length > 0 && (
                  <>
                    <div>
                      <p className="text-gray-600">Date</p>
                      <p className="font-semibold text-gray-800">
                        {selectedDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-600">Time</p>
                      <p className="font-semibold text-gray-800">
                        {selectedSlots[0].startTime} -{" "}
                        {selectedSlots[selectedSlots.length - 1].endTime}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-600">Duration</p>
                      <p className="font-semibold text-gray-800">{selectedDuration} minutes</p>
                    </div>

                    <div className="border-t pt-3">
                      <p className="text-gray-600">Total Amount</p>
                      <p className="text-2xl font-bold text-orange-600">₹{pricing.totalAmount}</p>
                    </div>
                  </>
                )}
              </div>

              {bookingStep === "slots" && (
                <button
                  onClick={handleProceedToDetails}
                  disabled={selectedSlots.length === 0}
                  className="w-full mt-6 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              )}

              {/* Court Features */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold text-gray-800 mb-3">Court Features</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {court.features.lighting && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      Lighting
                    </div>
                  )}
                  {court.features.scoreboard && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      Scoreboard
                    </div>
                  )}
                  {court.features.nets && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      Nets
                    </div>
                  )}
                  {court.features.seating && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      Seating
                    </div>
                  )}
                  {court.features.cctv && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      CCTV
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
