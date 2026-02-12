"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from "../../../../hooks/useAuth";
import { createAuthRedirectUrl } from "@/utils/redirectUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CalendarIcon,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  Loader2,
  IndianRupee,
  Download,
  Clock,
  MessageCircle,
  ChevronLeft,
  Users,
  Building2,
  Plus,
  Minus,
  Star
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Navbar from "../../../Navbar";
import Footer from "../../../Footer";

interface VenueData {
  _id: string;
  managedByVenueId?: string | null;
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
    googleMapsLink?: string;
    directions?: string;
  };
  contactInfo: {
    phone: string;
    email?: string;
    website?: string;
  };
  capacity: number;
  capacityDetails?: {
    standingCapacity: number;
    seatingCapacity?: {
      theatreStyle?: number;
      roundTable?: number;
    };
    minimumBookingCapacity?: number;
    multipleEventsPerDay?: boolean;
    timeSlots?: string[];
    peakSeasonRates?: string;
    offSeasonRates?: string;
    advanceBookingDays?: number;
  };
  pricing: {
    basePrice: number;
    hourlyRate?: number;
    halfDayRate?: number;
    fullDayRate?: number;
    cleaningFee?: number;
    securityDeposit?: number;
    rentalIncludes?: string[];
    otherEquipmentDetails?: string;
    securityDepositRequired?: boolean;
    paymentModes?: string[];
    cancellationPolicy?: {
      refundable: boolean;
      timeFrame?: string;
      deductionPercentage?: number;
    };
  };
  blockedSlots?: Array<{
    _id?: string;
    date: Date;
    isFullDayBlocked: boolean;
    timeSlots?: Array<{
      startTime: string;
      endTime: string;
    }>;
    reason: string;
    notes?: string;
  }>;
}

interface Booking {
  _id: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: string;
  eventType?: string;
  guestCount?: number;
  user?: {
    name: string;
  };
}

interface TimeSlot {
  time: string;
  available: boolean;
  bookings: any[];
}

interface AvailabilityData {
  date: string;
  existingBookings: Booking[];
  timeSlots: TimeSlot[];
  summary: {
    totalSlots: number;
    availableSlots: number;
    bookedSlots: number;
  };
}

const TIME_SLOTS = [
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "17:00", label: "5:00 PM" },
  { value: "19:00", label: "7:00 PM" },
];

export default function VenueCheckoutPage() {
  const params = useParams();
  const venueId = params.id as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [venueData, setVenueData] = useState<VenueData | null>(null);
  const [resolvedVenueId, setResolvedVenueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [finalBookingDetails, setFinalBookingDetails] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [guestCount, setGuestCount] = useState<number>(4);

  // Booking form state
  const [bookingForm, setBookingForm] = useState({
    startTime: "",
    endTime: "",
    eventType: "",
    specialRequirements: ""
  });

  // Estimated pricing state
  const [estimatedPrice, setEstimatedPrice] = useState<number>(0);
  const [fullDaySelected, setFullDaySelected] = useState<boolean>(false);

  // Helper: compute duration in hours between start and end (handles overnight)
  const getDurationHours = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDate = new Date(`2000-01-01T${start}:00`);
    const endDate = new Date(`2000-01-01T${end}:00`);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
    if (endDate <= startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }
    return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  };

  // Helper: compute estimated price per rules
  const computeEstimatedPrice = (): number => {
    if (!venueData) return 0;
    const base = venueData.pricing?.basePrice || 0;
    const hourly = venueData.pricing?.hourlyRate || 0;
    const halfDay = venueData.pricing?.halfDayRate;
    const fullDay = venueData.pricing?.fullDayRate;
    const cleaning = venueData.pricing?.cleaningFee || 0;
    const securityDeposit = venueData.pricing?.securityDeposit || 0;

    // Check for full day selection
    if (bookingForm.startTime === "00:00" && bookingForm.endTime === "23:00") {
      if (typeof fullDay === 'number' && fullDay > 0) {
        return securityDeposit + fullDay + cleaning;
      } else {
        // Fallback to hourly calculation for full day
        return securityDeposit + (hourly > 0 ? hourly * 23 : 0) + cleaning;
      }
    }

    // Check for half day selection
    if (bookingForm.startTime === "09:00" && bookingForm.endTime === "17:00") {
      if (typeof halfDay === 'number' && halfDay > 0) {
        return securityDeposit + halfDay + cleaning;
      } else {
        // Fallback to hourly calculation for half day
        return securityDeposit + (hourly > 0 ? hourly * 8 : 0) + cleaning;
      }
    }

    // Custom time calculation
    const dur = getDurationHours(bookingForm.startTime, bookingForm.endTime);
    if (dur <= 0) return 0;

    let variable = 0;
    let includeBase = false;

    if (dur >= 12) {
      if (typeof halfDay === 'number' && halfDay > 0) {
        variable = halfDay;
      } else {
        const derivedHalf =
          typeof fullDay === 'number' && fullDay > 0 ? fullDay / 2 : 0;
        variable = Math.max(0, derivedHalf);
      }
    } else {
      includeBase = true;
      variable = hourly * dur;
    }

    const total =
      securityDeposit +
      (includeBase ? base : 0) +
      variable +
      cleaning;

    return Math.max(0, Math.round(total));
  };

  useEffect(() => {
    setEstimatedPrice(computeEstimatedPrice());
  }, [bookingForm.startTime, bookingForm.endTime, venueData]);

  // Fetch venue data
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    const fetchVenueData = async () => {
      setLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiUrl}/api/venue/${venueId}`);
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 404) {
            toast.error('Venue not found. Please check the URL or go back to venue listings.');
          } else if (response.status === 403) {
            toast.error('This venue is not available for booking.');
          } else {
            toast.error(data.message || 'Failed to load venue data.');
          }
          return;
        }

        if (data.success && data.data.venue) {
          setVenueData(data.data.venue);
          setResolvedVenueId(data.data.venue._id);
          // Set initial guest count to minimum or 4
          const minGuests = data.data.venue.capacityDetails?.minimumBookingCapacity || 4;
          setGuestCount(minGuests);
        } else {
          toast.error('Failed to load venue data.');
        }
      } catch (error) {
        console.error('Fetch venue error:', error);
        toast.error('An error occurred while fetching venue data.');
      } finally {
        setLoading(false);
      }
    };

    fetchVenueData();

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [venueId]);

  // Fetch availability data for selected date
  const fetchAvailabilityData = async (date: Date) => {
    if (!resolvedVenueId) return;

    setLoadingAvailability(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const response = await fetch(`${apiUrl}/api/venue/${resolvedVenueId}/availability/${dateStr}`);
      const data = await response.json();

      if (data.success) {
        setAvailabilityData(data.data.availability);
      } else {
        console.error('Failed to fetch availability:', data.message);
        toast.error('Failed to load availability data');
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error('Error loading availability data');
    } finally {
      setLoadingAvailability(false);
    }
  };

  useEffect(() => {
    if (selectedDate && resolvedVenueId) {
      fetchAvailabilityData(selectedDate);
    }
  }, [selectedDate, resolvedVenueId]);

  const getPartiallyBookedDates = () => {
    const partiallyBookedDates: Date[] = [];
    
    if (venueData?.blockedSlots) {
      venueData.blockedSlots.forEach((slot: any) => {
        if (!slot.isFullDayBlocked) {
          partiallyBookedDates.push(new Date(slot.date));
        }
      });
    }
    
    return partiallyBookedDates;
  };

  const handleDownloadInvoice = () => {
    if (!finalBookingDetails) return;

    const invoiceContent = `
      ${venueData?.name} - Booking Invoice
      =============================
      Booking ID: ${finalBookingDetails._id}
      Date: ${format(new Date(finalBookingDetails.bookingDate), 'PPP')}
      Time: ${finalBookingDetails.startTime} - ${finalBookingDetails.endTime}
      Guests: ${finalBookingDetails.guestCount}
      Event Type: ${finalBookingDetails.eventType || 'N/A'}
      
      Total Amount Paid: INR ${finalBookingDetails.pricing.totalAmount}
      Payment Status: ${finalBookingDetails.pricing.paymentStatus}
      Payment ID: ${finalBookingDetails.paymentDetails.paymentId}
      
      Thank you for booking with ${venueData?.name}!
    `;

    const blob = new Blob([invoiceContent.trim()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${venueData?.name?.replace(/\s+/g, '-') || 'venue'}-Invoice-${finalBookingDetails._id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    const toYYYYMMDD = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    e.preventDefault();
    setFormError(null);

    if (!user) {
      toast.error('You must be logged in to book.');
      router.push(createAuthRedirectUrl());
      return;
    }

    if (!selectedDate) {
      setFormError('Please select a booking date.');
      return;
    }
    if (!bookingForm.startTime) {
      setFormError('Please select a start time.');
      return;
    }
    if (!bookingForm.endTime) {
      setFormError('Please select an end time.');
      return;
    }
    if (bookingForm.startTime >= bookingForm.endTime) {
      setFormError('End time must be after start time.');
      return;
    }

    if (!resolvedVenueId) {
      setFormError('Unable to process booking. Venue information not loaded properly.');
      toast.error('Please refresh the page and try again.');
      return;
    }

    setSubmitting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const orderResponse = await fetch(`${apiUrl}/api/venue/${resolvedVenueId}/bookings/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          bookingDate: toYYYYMMDD(selectedDate),
          startTime: bookingForm.startTime,
          endTime: bookingForm.endTime,
          guestCount: guestCount,
          eventType: bookingForm.eventType,
          specialRequirements: bookingForm.specialRequirements,
          pricingHint: {
            estimatedPrice,
          }
        }),
      });

      const order = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(order.message || order.error || 'Failed to create order.');
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.data.amount,
        currency: order.data.currency,
        name: venueData?.name || 'Venue Booking',
        description: `Booking for ${format(selectedDate, 'PPP')}`,
        order_id: order.data.orderId,
        handler: async function (response: any) {
          setIsVerifying(true);
          const verificationResponse = await fetch(`${apiUrl}/api/venue/${resolvedVenueId}/bookings/verify-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: order.data.bookingId
            }),
          });

          const verificationData = await verificationResponse.json();
          setIsVerifying(false);

          if (verificationData.success) {
            setFinalBookingDetails(verificationData.data.booking);
            setBookingSuccess(true);
            toast.success('Booking confirmed!');
          } else {
            toast.error(verificationData.message || 'Payment verification failed.');
            setFormError('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone,
        },
        notes: {
          venueId: venueId,
          venueName: venueData?.name
        },
        theme: {
          color: '#EF4444'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

      rzp.on('payment.failed', function (response: any) {
        toast.error('Payment failed. Please try again.');
        setFormError(`Payment failed: ${response.error.description}`);
      });

    } catch (error: any) {
      console.error('Booking process error:', error);
      setFormError(error.message || 'An unexpected error occurred.');
      toast.error(error.message || 'An error occurred during the booking process.');
    } finally {
      setSubmitting(false);
    }
  };

  const isTimeSlotAvailable = (time: string): boolean => {
    if (!availabilityData) return true;
    const timeSlot = availabilityData.timeSlots.find(slot => slot.time === time);
    return timeSlot?.available !== false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-red-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading venue information...</p>
        </div>
      </div>
    );
  }

  if (!loading && !venueData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarIcon className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Venue Not Found</h2>
          <p className="text-gray-600 mb-6">
            The venue you're looking for doesn't exist or has been removed.
          </p>
          <Button
            onClick={() => router.push('/allVenues')}
            className="bg-red-500 hover:bg-red-600"
          >
            Browse All Venues
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {isVerifying && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-[100]">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center mx-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-200 border-t-red-600"></div>
            <p className="text-gray-800 text-lg mt-4 font-medium">Verifying payment...</p>
            <p className="text-gray-500 text-sm mt-1">Please wait a moment</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Breadcrumb */}
        <button 
          onClick={() => router.push(`/allVenues/${venueId}`)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6 lg:mb-8">Complete your booking</h1>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Venue Info & Booking Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Venue Summary Card */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                    <Building2 className="w-full h-full p-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h2 className="text-lg lg:text-xl font-bold text-gray-900 truncate">{venueData?.name}</h2>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Star className="h-4 w-4 fill-red-500 text-red-500" />
                        <span className="text-sm font-semibold">4.8</span>
                        <span className="text-sm text-gray-500">· 124 reviews</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{venueData?.address?.city}, {venueData?.address?.state}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calendar Card */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-gray-900">Select a date</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => {
                      if (date < new Date(new Date().setHours(0, 0, 0, 0))) {
                        return true
                      }

                      const isFullyBlocked = venueData?.blockedSlots?.some((slot: any) => {
                        const slotDate = new Date(slot.date)
                        return (
                          slotDate.toDateString() === date.toDateString() &&
                          slot.isFullDayBlocked
                        )
                      })

                      return isFullyBlocked || false
                    }}
                    className="rounded-lg border-0"
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                      month: "space-y-4 w-full",
                      caption: "flex justify-center pt-1 relative items-center px-2",
                      caption_label: "text-sm font-semibold",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex justify-around",
                      head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem] flex-1 text-center",
                      row: "flex w-full mt-2 justify-around",
                      cell: "text-center text-sm p-0 relative flex-1 [&:has([aria-selected])]:bg-transparent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: "h-9 w-9 p-0 font-normal hover:bg-gray-100 rounded-md aria-selected:opacity-100 mx-auto",
                      day_selected: "bg-red-500 text-white hover:bg-red-600 hover:text-white focus:bg-red-500 focus:text-white",
                      day_today: "bg-gray-100 text-gray-900 font-semibold",
                      day_outside: "text-gray-400 opacity-50",
                      day_disabled: "text-gray-400 opacity-50 line-through",
                      day_hidden: "invisible",
                    }}
                  />
                </div>

                {availabilityData && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
                      <span><strong>{availabilityData.summary.totalSlots}</strong> total slots</span>
                      <span className="text-green-600"><strong>{availabilityData.summary.availableSlots}</strong> available</span>
                      <span className="text-red-600"><strong>{availabilityData.summary.bookedSlots}</strong> booked</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Booking Duration Selection */}
            {selectedDate && (
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-gray-900">Select booking duration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Custom Time Option */}
                    <div className="col-span-1">
                      <Label className="text-sm font-medium text-gray-900 mb-2 block">
                        Custom Time
                      </Label>
                      <div className="space-y-2">
                        <Select
                          value={bookingForm.startTime}
                          onValueChange={(value) => {
                            if (isTimeSlotAvailable(value)) {
                              setBookingForm({ ...bookingForm, startTime: value });
                              // Auto-set end time to next available slot
                              const currentIndex = TIME_SLOTS.findIndex(slot => slot.value === value);
                              if (currentIndex !== -1 && currentIndex < TIME_SLOTS.length - 1) {
                                const nextSlot = TIME_SLOTS[currentIndex + 1];
                                if (isTimeSlotAvailable(nextSlot.value)) {
                                  setBookingForm(prev => ({ ...prev, endTime: nextSlot.value }));
                                }
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Start time" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_SLOTS.map((slot) => {
                              const isAvailable = isTimeSlotAvailable(slot.value);
                              return (
                                <SelectItem
                                  key={slot.value}
                                  value={slot.value}
                                  disabled={!isAvailable}
                                  className={!isAvailable ? "text-gray-400" : ""}
                                >
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    {slot.label}
                                    {!isAvailable && <span className="text-xs text-red-500">(Booked)</span>}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <Select
                          value={bookingForm.endTime}
                          onValueChange={(value) => {
                            if (isTimeSlotAvailable(value) && value > bookingForm.startTime) {
                              setBookingForm({ ...bookingForm, endTime: value });
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="End time" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_SLOTS.map((slot) => {
                              const isAvailable = isTimeSlotAvailable(slot.value);
                              const isValidEndTime = slot.value > bookingForm.startTime;
                              return (
                                <SelectItem
                                  key={slot.value}
                                  value={slot.value}
                                  disabled={!isAvailable || !isValidEndTime}
                                  className={!isAvailable || !isValidEndTime ? "text-gray-400" : ""}
                                >
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    {slot.label}
                                    {!isAvailable && <span className="text-xs text-red-500">(Booked)</span>}
                                    {!isValidEndTime && <span className="text-xs text-orange-500">(Before start)</span>}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Half Day Option */}
                    <div>
                      <Label className="text-sm font-medium text-gray-900 mb-2 block">
                        Half Day
                      </Label>
                      <button
                        onClick={() => {
                          setBookingForm({ 
                            ...bookingForm, 
                            startTime: "09:00", 
                            endTime: "17:00" 
                          });
                        }}
                        className={`w-full p-4 rounded-lg border-2 transition-all ${
                          bookingForm.startTime === "09:00" && bookingForm.endTime === "17:00"
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <div className="text-center">
                          <Clock className="h-6 w-6 mx-auto mb-2" />
                          <div className="font-semibold">8 Hours</div>
                          <div className="text-sm">9:00 AM - 5:00 PM</div>
                          {venueData?.pricing?.halfDayRate && (
                            <div className="text-sm font-medium mt-1">
                              ₹{venueData.pricing.halfDayRate.toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Full Day Option */}
                    <div>
                      <Label className="text-sm font-medium text-gray-900 mb-2 block">
                        Full Day
                      </Label>
                      <button
                        onClick={() => {
                          setBookingForm({ 
                            ...bookingForm, 
                            startTime: "00:00", 
                            endTime: "23:00" 
                          });
                        }}
                        className={`w-full p-4 rounded-lg border-2 transition-all ${
                          bookingForm.startTime === "00:00" && bookingForm.endTime === "23:00"
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <div className="text-center">
                          <Clock className="h-6 w-6 mx-auto mb-2" />
                          <div className="font-semibold">23 Hours</div>
                          <div className="text-sm">12:00 AM - 11:00 PM</div>
                          {venueData?.pricing?.fullDayRate && (
                            <div className="text-sm font-medium mt-1">
                              ₹{venueData.pricing.fullDayRate.toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>

                  {bookingForm.startTime && bookingForm.endTime && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-blue-700">
                        <Clock className="h-4 w-4" />
                        <span>
                          Duration: {getDurationHours(bookingForm.startTime, bookingForm.endTime).toFixed(1)} hours
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Guest Count */}
            {selectedDate && bookingForm.startTime && (
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-gray-900">Number of guests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="guestCount" className="text-sm font-medium text-gray-900">
                      Number of guests
                    </Label>
                    <Input
                      id="guestCount"
                      type="number"
                      min="1"
                      max={venueData?.capacity || 999}
                      value={guestCount}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 1 && value <= (venueData?.capacity || 999)) {
                          setGuestCount(value);
                        }
                      }}
                      className="w-full"
                      placeholder="Enter number of guests"
                    />
                    <p className="text-sm text-gray-500">
                      Maximum capacity: {venueData?.capacity || 0} guests
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Event Type (Mobile) */}
            {selectedDate && bookingForm.startTime && (
              <Card className="bg-white border border-gray-200 shadow-sm lg:hidden">
                <CardContent className="p-4">
                  <Label htmlFor="eventType-mobile" className="text-sm font-medium text-gray-900 mb-2 block">
                    Event Type (Optional)
                  </Label>
                  <Input 
                    id="eventType-mobile"
                    value={bookingForm.eventType} 
                    onChange={(e) => setBookingForm({ ...bookingForm, eventType: e.target.value })} 
                    placeholder="Wedding, Party, Conference, etc." 
                    className="h-11"
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Price Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-gray-900">Price summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {bookingSuccess ? (
                    <div className="text-center py-6">
                      <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Booking Confirmed!</h3>
                      <div className="text-left space-y-2 text-sm bg-green-50 p-4 rounded-xl mt-4 mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date:</span>
                          <span className="font-medium">{format(new Date(finalBookingDetails?.bookingDate), 'PP')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Time:</span>
                          <span className="font-medium">{finalBookingDetails?.startTime} - {finalBookingDetails?.endTime}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-green-200">
                          <span className="font-medium">Total Paid:</span>
                          <span className="font-bold text-green-600">₹{finalBookingDetails?.pricing?.totalAmount?.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <Button onClick={handleDownloadInvoice} className="w-full bg-green-600 hover:bg-green-700">
                        <Download className="h-4 w-4 mr-2" />
                        Download Invoice
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {venueData && selectedDate && bookingForm.startTime ? (
                        <div>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Base price</span>
                              <span className="font-medium">₹{venueData.pricing.basePrice.toLocaleString('en-IN')}</span>
                            </div>
                            {bookingForm.startTime && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  {bookingForm.startTime === "00:00" && bookingForm.endTime === "23:00"
                                    ? "Full day rate"
                                    : bookingForm.startTime === "09:00" && bookingForm.endTime === "17:00"
                                    ? "Half day rate"
                                    : `Hourly rate (${getDurationHours(bookingForm.startTime, bookingForm.endTime || bookingForm.startTime).toFixed(1)} hrs)`
                                  }
                                </span>
                                <span className="font-medium">
                                  {bookingForm.startTime === "00:00" && bookingForm.endTime === "23:00"
                                    ? `₹${(venueData.pricing.fullDayRate || (venueData.pricing.hourlyRate || 0) * 23).toLocaleString('en-IN')}`
                                    : bookingForm.startTime === "09:00" && bookingForm.endTime === "17:00"
                                    ? `₹${(venueData.pricing.halfDayRate || (venueData.pricing.hourlyRate || 0) * 8).toLocaleString('en-IN')}`
                                    : `₹${((venueData.pricing.hourlyRate || 0) * getDurationHours(bookingForm.startTime, bookingForm.endTime || bookingForm.startTime)).toLocaleString('en-IN')}`
                                  }
                                </span>
                              </div>
                            )}
                            {venueData.pricing.cleaningFee !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Cleaning fee</span>
                                <span className="font-medium">₹{venueData.pricing.cleaningFee.toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            {venueData.pricing.securityDeposit && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Security deposit</span>
                                <span className="font-medium">₹{venueData.pricing.securityDeposit.toLocaleString('en-IN')}</span>
                              </div>
                            )}
                          </div>

                          <div className="border-t pt-4">
                            <div className="flex justify-between items-center mb-4">
                              <span className="text-base font-semibold text-gray-900">Total</span>
                              <span className="text-2xl font-bold text-gray-900">₹{estimatedPrice.toLocaleString('en-IN')}</span>
                            </div>

                            {formError && (
                              <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg mb-4">{formError}</div>
                            )}

                            <Button 
                              onClick={handleBookingSubmit}
                              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-lg h-auto text-base"
                              disabled={submitting || authLoading || !bookingForm.startTime}
                            >
                              {submitting ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                'Confirm Booking'
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm text-gray-500">Select date and time to see pricing</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}