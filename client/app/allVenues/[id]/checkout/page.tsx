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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Building2
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

interface TimeOption {
  value: string;
  label: string;
  available?: boolean;
  disabled?: boolean;
  bookings?: any[];
}

const generateTimeOptions = (): TimeOption[] => {
  const times: TimeOption[] = [];
  for (let i = 0; i < 24; i++) {
    const time = `${String(i).padStart(2, '0')}:00`;
    const h = i % 12 || 12;
    const ampm = i < 12 ? 'AM' : 'PM';
    times.push({ value: time, label: `${h}:00 ${ampm}` });
  }
  return times;
};

const availableTimes: TimeOption[] = generateTimeOptions();

const LegendDot = ({
  color,
  label,
}: {
  color: string
  label: string
}) => {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-gray-600">{label}</span>
    </div>
  )
}

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

    const dur = fullDaySelected ? 24 : getDurationHours(bookingForm.startTime, bookingForm.endTime);
    if (dur <= 0) return 0;

    let variable = 0;
    let includeBase = false;

    // Rules:
    // - < 12 hours: security + base + hourly * duration
    // - half day: security + halfDayRate
    // - full day: security + fullDayRate
    if (fullDaySelected) {
      if (typeof fullDay === 'number' && fullDay > 0) {
        variable = fullDay;
      } else {
        variable = hourly > 0 ? hourly * 24 : 0;
      }
    } else if (dur >= 12) {
      if (typeof halfDay === 'number' && halfDay > 0) {
        variable = halfDay;
      } else {
        // Per rule: for half-day bookings, do NOT fall back to hourly.
        // Only use explicit half-day or a derived half-day from full-day.
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
  }, [bookingForm.startTime, bookingForm.endTime, fullDaySelected, venueData]);

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

      // Use local date formatting to avoid timezone issues
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

  // Fetch availability when date changes
  useEffect(() => {
    if (selectedDate && resolvedVenueId) {
      fetchAvailabilityData(selectedDate);
    }
  }, [selectedDate, resolvedVenueId]);

  // Generate available time options based on availability data
  const getAvailableTimeOptions = (): TimeOption[] => {
    if (!availabilityData) {
      return availableTimes; // Fallback to all times if no availability data
    }

    return availableTimes.map(timeOption => {
      const timeSlot = availabilityData.timeSlots.find(slot => slot.time === timeOption.value);
      const isAvailable = timeSlot?.available !== false;

      return {
        ...timeOption,
        available: isAvailable,
        disabled: !isAvailable,
        bookings: timeSlot?.bookings || []
      } as TimeOption;
    });
  };

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
    // Function to format the date as YYYY-MM-DD in the local timezone
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
    if (!fullDaySelected && !bookingForm.startTime) {
      setFormError('Please select a start time.');
      return;
    }
    if (!fullDaySelected) {
      if (!bookingForm.endTime) {
        setFormError('Please select an end time.');
        return;
      }
      if (bookingForm.startTime >= bookingForm.endTime) {
        setFormError('End time must be after start time.');
        return;
      }
    }

    // Safety check: ensure we have a valid venue ID
    if (!resolvedVenueId) {
      setFormError('Unable to process booking. Venue information not loaded properly.');
      toast.error('Please refresh the page and try again.');
      return;
    }

    setSubmitting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      // Auto guest count: minimumBookingCapacity or 1
      const autoGuestCount = venueData?.capacityDetails?.minimumBookingCapacity && venueData.capacityDetails.minimumBookingCapacity > 0
        ? venueData.capacityDetails.minimumBookingCapacity
        : 1;

      const orderResponse = await fetch(`${apiUrl}/api/venue/${resolvedVenueId}/bookings/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          bookingDate: toYYYYMMDD(selectedDate),
          startTime: fullDaySelected ? '00:00' : bookingForm.startTime,
          endTime: fullDaySelected ? '23:00' : bookingForm.endTime,
          guestCount: autoGuestCount,
          eventType: bookingForm.eventType,
          specialRequirements: bookingForm.specialRequirements,
          pricingHint: {
            estimatedPrice,
            fullDaySelected,
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
          color: '#8A2BE2'
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-purple-600 mx-auto" />
          <p className="mt-6 text-gray-600 text-lg">Loading venue information...</p>
        </div>
      </div>
    );
  }

  if (!loading && !venueData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <CalendarIcon className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Venue Not Found</h2>
          <p className="text-gray-600 text-lg mb-6">
            The venue you're looking for doesn't exist or has been removed.
          </p>
          <Button
            onClick={() => router.push('/allVenues')}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
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
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl flex flex-col items-center mx-4">
            <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-purple-200 border-t-purple-600"></div>
            <p className="text-gray-800 text-base sm:text-lg mt-4 font-medium">Verifying payment...</p>
            <p className="text-gray-500 text-sm mt-1">Please wait a moment</p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/allVenues/${venueId}`)} className="p-0 h-auto font-normal">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Venue
          </Button>
          <span>/</span>
          <span className="text-gray-900 font-medium">Checkout</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Venue Info & Calendar */}
          <div className="lg:col-span-2 space-y-6">
            {/* Venue Summary Card */}
            <Card className="bg-white border border-gray-200 shadow-lg rounded-xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-purple-100 p-3 rounded-xl">
                    <Building2 className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{venueData?.name || 'Venue'}</h2>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{venueData?.address?.street || 'Address'}, {venueData?.address?.city || 'City'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>Capacity: {venueData?.capacity || 0} guests</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{venueData?.contactInfo?.phone || 'Contact'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calendar Card */}
            <Card className="bg-white border border-gray-200 shadow-lg rounded-xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-gray-100 bg-gradient-to-r from-purple-50/50 to-pink-50/50">
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <div className="bg-purple-600 p-1.5 rounded-lg">
                    <CalendarIcon className="h-4 w-4 text-white" />
                  </div>
                  Select Booking Date
                </CardTitle>
                <CardDescription className="text-purple-600">
                  Choose your preferred date from the calendar
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 p-6">
                {/* Calendar Wrapper */}
                <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
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
                    modifiers={{
                      partiallyBooked: getPartiallyBookedDates(),
                      fullyBlocked: (date) =>
                        venueData?.blockedSlots?.some((slot: any) => {
                          const slotDate = new Date(slot.date)
                          return (
                            slotDate.toDateString() === date.toDateString() &&
                            slot.isFullDayBlocked
                          )
                        }) || false,

                      partiallyBlocked: (date) =>
                        venueData?.blockedSlots?.some((slot: any) => {
                          const slotDate = new Date(slot.date)
                          return (
                            slotDate.toDateString() === date.toDateString() &&
                            !slot.isFullDayBlocked
                          )
                        }) || false,

                      past: (date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0)),
                    }}
                    modifiersClassNames={{
                      available:
                        "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-medium",

                      partiallyBooked:
                        "bg-amber-200 text-amber-900 hover:bg-amber-300",

                      partiallyBlocked:
                        "bg-yellow-200 text-yellow-900 hover:bg-yellow-300",

                      fullyBlocked:
                        "bg-red-300 text-red-900 line-through cursor-not-allowed opacity-90",

                      past:
                        "text-gray-400 cursor-not-allowed opacity-60",

                      today:
                        "border border-indigo-500 text-indigo-700 bg-indigo-50",
                    }}
                    className="rounded-md bg-white w-full"
                  />
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <LegendDot color="bg-emerald-500" label="Available" />
                  <LegendDot color="bg-amber-500" label="Partial" />
                  <LegendDot color="bg-red-500" label="Blocked" />
                  <LegendDot color="bg-gray-400" label="Past" />
                </div>
              </CardContent>
            </Card>

            {/* Time Selection */}
            {selectedDate && (
              <Card className="bg-white border border-gray-200 shadow-lg rounded-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-50/50 to-pink-50/50 border-b border-gray-100">
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-purple-600" />
                    Select Time Slot
                  </CardTitle>
                  <CardDescription className="text-purple-600">
                    {format(selectedDate, 'PPP')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleBookingSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startTime" className="text-sm font-medium">Start Time *</Label>
                        <Select onValueChange={(value) => setBookingForm({ ...bookingForm, startTime: value })} value={bookingForm.startTime} disabled={fullDaySelected}>
                          <SelectTrigger id="startTime" className="h-11">
                            <SelectValue placeholder="Select start time" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableTimeOptions().map((time) => (
                              <SelectItem key={time.value} value={time.value} disabled={time.disabled || fullDaySelected}>
                                {time.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="endTime" className="text-sm font-medium">End Time *</Label>
                        <Select onValueChange={(value) => setBookingForm({ ...bookingForm, endTime: value })} value={bookingForm.endTime} disabled={fullDaySelected}>
                          <SelectTrigger id="endTime" className="h-11">
                            <SelectValue placeholder="Select end time" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableTimeOptions().map((time) => (
                              <SelectItem key={time.value} value={time.value} disabled={time.disabled || fullDaySelected}>
                                {time.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <input id="fullDay" type="checkbox" checked={fullDaySelected} onChange={(e) => { setFullDaySelected(e.target.checked); if (e.target.checked) setBookingForm((prev) => ({ ...prev, startTime: '00:00', endTime: '23:00' })); }} className="h-4 w-4" />
                      <Label htmlFor="fullDay" className="text-sm font-medium cursor-pointer">Book Full Day (00:00 - 23:00)</Label>
                    </div>

                    <div>
                      <Label htmlFor="eventType" className="text-sm font-medium">Event Type</Label>
                      <Input id="eventType" value={bookingForm.eventType} onChange={(e) => setBookingForm({ ...bookingForm, eventType: e.target.value })} placeholder="Wedding, Party, Conference, etc." className="h-11" />
                    </div>

                    <div>
                      <Label htmlFor="specialRequirements" className="text-sm font-medium">Special Requirements (Optional)</Label>
                      <Input id="specialRequirements" value={bookingForm.specialRequirements} onChange={(e) => setBookingForm({ ...bookingForm, specialRequirements: e.target.value })} placeholder="Any special needs or requests..." className="h-11" />
                    </div>

                    {formError && (
                      <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg">{formError}</div>
                    )}

                    <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-lg" disabled={submitting || authLoading}>
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <IndianRupee className="h-4 w-4 mr-2" />
                          Proceed to Payment - ₹{estimatedPrice.toLocaleString('en-IN')}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Booking Summary & Contact */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-6">
              {/* Booking Summary */}
              <Card className="bg-white border border-gray-200 shadow-lg rounded-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-50/50 to-pink-50/50 border-b border-gray-100">
                  <CardTitle className="text-lg font-bold text-gray-900">Booking Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {bookingSuccess ? (
                    <div className="text-center py-6">
                      <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Booking Confirmed!</h3>
                      <div className="text-left space-y-2 text-sm bg-green-50 p-4 rounded-xl mt-4 mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Date:</span>
                          <span className="font-medium">{format(new Date(finalBookingDetails?.bookingDate), 'PP')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Time:</span>
                          <span className="font-medium">{finalBookingDetails?.startTime} - {finalBookingDetails?.endTime}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-green-200">
                          <span className="font-medium">Total Paid:</span>
                          <span className="font-bold text-green-600 text-lg">₹{finalBookingDetails?.pricing?.totalAmount?.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <Button onClick={handleDownloadInvoice} className="w-full bg-green-600 hover:bg-green-700">
                        <Download className="h-4 w-4 mr-2" />
                        Download Invoice
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Venue:</span>
                          <span className="font-medium text-gray-900">{venueData?.name || 'Venue'}</span>
                        </div>
                        {selectedDate && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Date:</span>
                              <span className="font-medium text-gray-900">{format(selectedDate, 'PP')}</span>
                            </div>
                            {(bookingForm.startTime || fullDaySelected) && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Time:</span>
                                <span className="font-medium text-gray-900">
                                  {fullDaySelected ? 'Full Day' : `${bookingForm.startTime} - ${bookingForm.endTime}`}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        {bookingForm.eventType && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Event Type:</span>
                            <span className="font-medium text-gray-900">{bookingForm.eventType}</span>
                          </div>
                        )}
                      </div>

                      <div className="border-t pt-4">
                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600">Estimated Total</span>
                            <span className="text-2xl font-bold text-purple-700">₹{estimatedPrice.toLocaleString('en-IN')}</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {fullDaySelected
                              ? `Full day rate + security deposit${venueData?.pricing?.cleaningFee ? ' + cleaning fee' : ''}`
                              : (getDurationHours(bookingForm.startTime, bookingForm.endTime) || 0) >= 12
                                ? `Half day rate + security deposit${venueData?.pricing?.cleaningFee ? ' + cleaning fee' : ''}`
                                : `${getDurationHours(bookingForm.startTime, bookingForm.endTime) || 0} hrs × hourly rate + base price + security deposit${venueData?.pricing?.cleaningFee ? ' + cleaning fee' : ''}`}
                          </p>
                        </div>
                      </div>

                      {!selectedDate && (
                        <div className="text-center py-4">
                          <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CalendarIcon className="h-6 w-6 text-purple-600" />
                          </div>
                          <p className="text-sm text-gray-500">Select a date to see pricing</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact Card */}
              <Card className="bg-gradient-to-br from-purple-600 to-pink-600 text-white border-0 shadow-lg rounded-xl overflow-hidden">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Need Help?
                  </h3>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3 bg-white/10 p-3 rounded-lg">
                      <Phone className="h-4 w-4" />
                      <span className="text-sm">{venueData?.contactInfo.phone}</span>
                    </div>
                    {venueData?.contactInfo.email && (
                      <div className="flex items-center gap-3 bg-white/10 p-3 rounded-lg">
                        <Mail className="h-4 w-4" />
                        <span className="text-xs break-all">{venueData.contactInfo.email}</span>
                      </div>
                    )}
                  </div>
                  <Button size="sm" className="w-full bg-white text-purple-600 hover:bg-gray-50 font-semibold">
                    Contact Venue
                  </Button>
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