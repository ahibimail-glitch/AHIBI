
"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from "../../../hooks/useAuth";
import { createAuthRedirectUrl } from "@/utils/redirectUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
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
  Users,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Star,
  Wifi,
  Car,
  Music,
  Zap,
  Home,
  Snowflake,
  Award,
  Shield,
  Gift,
  Heart,
  Download,
  UtensilsCrossed,
  Accessibility,
  Loader2,
  Bookmark,
  Share2,
  Building2,
  IndianRupee,
  Check,
  X,
  MessageCircle,
  Image as ImageIcon
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Navbar from "../../Navbar";
import Footer from "../../Footer";


interface VenueData {
  _id: string;
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
  venueClassification?: {
    venueTypes: string[];
    venueTypeOther?: string;
    indoorOutdoor: string;
    operationMode: string;
  };
  parking?: {
    carCapacity: number;
    twoWheelerAvailable: boolean;
  };
  accessibility?: {
    wheelchairAccess: boolean;
    liftElevator: boolean;
    nearbyTransport?: {
      airport?: boolean;
      railwayStation?: boolean;
      taxiService?: boolean;
    };
  };
  facilities: {
    [key: string]: boolean;
  };
  amenities?: {
    [key: string]: {
      available: boolean;
      description?: string;
    };
  };
  pricing: {
    basePrice: number;
    hourlyRate?: number;
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
  gallery: Array<{
    url: string;
    caption?: string;
    isMain?: boolean;
  }>;
  rating: {
    average: number;
    count: number;
  };
  totalBookings: number;
  faqs?: Array<{
    _id?: string;
    question: string;
    answer: string;
    isActive?: boolean;
    order?: number;
  }>;
  terms?: {
    cancellationPolicy?: string;
    additionalRules?: string;
  };
  policies?: {
    operatingHours?: {
      startTime?: string;
      endTime?: string;
    };
    noiseRestrictions?: string;
    smokingPolicy?: string;
    alcoholServingPermission?: boolean;
    requiredPermissions?: string;
    eventTypeRestrictions?: string;
  };
  addOnServices?: {
    cateringPackages?: {
      available: boolean;
      menuUrl?: string;
    };
    eventManagementServices?: {
      available: boolean;
      description?: string;
    };
    vendorTieUps?: {
      available: boolean;
      description?: string;
    };
    photographyDecorPackages?: {
      available: boolean;
      description?: string;
    };
    accommodationBundle?: {
      available: boolean;
      description?: string;
    };
    specialDiscounts?: {
      repeatBookings?: boolean;
      offPeakDays?: boolean;
      description?: string;
    };
  };
  documents?: {
    venueImages?: Array<{
      url: string;
      caption?: string;
      isMain?: boolean;
    }>;
    venueVideoTour?: {
      url?: string;
    };
    menuCards?: Array<{
      url: string;
      name?: string;
    }>;
    rateCard?: {
      url?: string;
    };
  };
  reviews?: Array<{
    user: {
      name: string;
    };
    rating: number;
    comment: string;
    createdAt: string;
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

// Mock images for the carousel - replace with actual venue images
// Generate time options for dropdowns (e.g., 9:00 AM to 9:00 PM)
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

// Extract real image URLs from the venue data only (no demo fallbacks)
const extractVenueImages = (venue?: VenueData | null): string[] => {
  if (!venue) return [];
  const primary = (venue.gallery || []).map(g => g.url).filter(Boolean);
  const docs = (venue.documents?.venueImages || []).map(img => img.url).filter(Boolean);
  // Prefer gallery ordering; if any marked as main, move it to front
  const withMainFirst = (list: string[], gallery: VenueData["gallery"]) => {
    const main = (gallery || []).find(g => g.isMain)?.url;
    if (main) {
      const filtered = list.filter(u => u !== main);
      return [main, ...filtered];
    }
    return list;
  };
  const galleryOrdered = withMainFirst(primary, venue.gallery || []);
  return galleryOrdered.length > 0 ? galleryOrdered : docs;
};

// Primary image helper (no demo fallback)
const getPrimaryVenueImage = (venue: VenueData): string => {
  const imgs = extractVenueImages(venue);
  return imgs.length > 0 ? imgs[0] : '';
};

const facilityIcons: { [key: string]: any } = {
  parking: Car,
  ac: Snowflake,
  wifi: Wifi,
  soundSystem: Music,
  lighting: Zap,
  security: Shield,
  catering: UtensilsCrossed,
  accessible: Accessibility,
  petFriendly: Heart,
  alcohol: Gift,
  inHouseCatering: UtensilsCrossed,
  stage: Award,
  powerBackup: Zap,
  accommodation: Home,
  airConditioned: Snowflake,
  airConditioning: Snowflake,
  professionalSoundSystem: Music,
  ledScreenProjection: Award,
  wifiAvailability: Wifi,
  dressingRooms: Home,
  changingRooms: Home,
  securityCctv: Shield,
  alcoholPermission: Gift,
  liveMusicPermission: Music,
  sportsEquipment: Award,
  decorationServices: Gift,
  valetService: Car,
  cateringFlexibility: UtensilsCrossed,
  lightingSystem: Zap,
  washrooms: Home,
};

export default function VenueDetailPage() {
  const params = useParams();
  const venueId = params.id as string;
  const [venueData, setVenueData] = useState<VenueData | null>(null);
  const [resolvedVenueId, setResolvedVenueId] = useState<string | null>(null);
  const [similarVenues, setSimilarVenues] = useState<VenueData[]>([]);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [finalBookingDetails, setFinalBookingDetails] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Booking form state
  const [bookingForm, setBookingForm] = useState({
    startTime: "",
    endTime: "",
    guestCount: "",
    eventType: "",
    specialRequirements: ""
  });

  // Review form state
  const [newReview, setNewReview] = useState<{ rating: number; comment: string }>({ rating: 0, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleSubmitReview = async () => {
    if (!user) {
      toast.error('Please login to write a review.');
      router.push(createAuthRedirectUrl());
      return;
    }
    if (!resolvedVenueId) {
      toast.error('Venue not loaded yet.');
      return;
    }
    if (newReview.rating < 1 || newReview.rating > 5) {
      toast.error('Please select a rating between 1 and 5.');
      return;
    }
    setSubmittingReview(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/venue/${resolvedVenueId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ rating: newReview.rating, comment: newReview.comment })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVenueData(prev => prev ? { ...prev, rating: data.data.rating, reviews: data.data.reviews } : prev);
        setNewReview({ rating: 0, comment: '' });
        toast.success('Review submitted');
      } else {
        toast.error(data.message || 'Failed to submit review');
      }
    } catch (e) {
      console.error('Submit review error', e);
      toast.error('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

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

    const interval = setInterval(() => {
      const images = extractVenueImages(venueData);
      if (images.length > 0) {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [venueId]);

  // Once the real DB ID is known, fetch bookings with the correct ID
  useEffect(() => {
    if (resolvedVenueId) {
      fetchBookings();
    }
  }, [resolvedVenueId]);

  // Fetch similar venues when venue data is loaded
  useEffect(() => {
    if (venueData) {
      fetchSimilarVenues();
    }
  }, [venueData]);

  const fetchBookings = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/${resolvedVenueId || venueId}/bookings`);
      const data = await response.json();
      if (data.success) {
        setBookings(data.data.bookings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const fetchSimilarVenues = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      // Fetch venues from the same city, excluding current venue
      const city = venueData?.address.city;
      const response = await fetch(`${apiUrl}/api/venues?city=${city || ''}&limit=8`);
      const data = await response.json();
      if (data.success) {
        // Filter out current venue and limit to 8 venues
        const filtered = data.data.venues
          .filter((v: VenueData) => v._id !== venueId)
          .slice(0, 8);
        setSimilarVenues(filtered);
      }
    } catch (error) {
      console.error('Error fetching similar venues:', error);
    }
  };

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

      console.log('Fetching availability for date:', dateStr, 'Original date object:', date);
      console.log('Date components - Year:', year, 'Month:', month, 'Day:', day);

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
      console.log('Selected date changed to:', selectedDate);
      console.log('Selected date string:', selectedDate.toString());
      console.log('Selected date ISO:', selectedDate.toISOString());
      fetchAvailabilityData(selectedDate);
    }
  }, [selectedDate, resolvedVenueId]);

  // Helper function to format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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

  // Format time for display (convert 24h to 12h format)
  const formatTimeForDisplay = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const nextImage = () => {
    const images = extractVenueImages(venueData);
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    const images = extractVenueImages(venueData);
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
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

  const getUnavailableDates = () => {
    const unavailableDates: Date[] = [];
    bookings.forEach(booking => {
      if (booking.status === 'confirmed' || booking.status === 'pending') {
        unavailableDates.push(new Date(booking.bookingDate));
      }
    });
    return unavailableDates;
  };

  const getPartiallyBookedDates = () => {
    // For now, we'll treat all dates with bookings as partially booked
    // In the future, we could check if all time slots are booked
    return getUnavailableDates();
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
    if (!bookingForm.startTime || !bookingForm.endTime) {
      setFormError('Please select both start and end times.');
      return;
    }
    if (bookingForm.startTime >= bookingForm.endTime) {
      setFormError('End time must be after start time.');
      return;
    }
    if (!bookingForm.guestCount || parseInt(bookingForm.guestCount) <= 0) {
      setFormError('Please enter a valid number of guests.');
      return;
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
          guestCount: parseInt(bookingForm.guestCount),
          eventType: bookingForm.eventType,
          specialRequirements: bookingForm.specialRequirements,
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
            fetchBookings();
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
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
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

  const displayImages = extractVenueImages(venueData);

  return (
    <div className="min-h-screen bg-white">
      {isVerifying && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-[100]">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white"></div>
          <p className="text-white text-lg mt-4">Verifying payment, please wait...</p>
        </div>
      )}

      {/* Navbar Section */}
      <Navbar />

      {/* Main Content Section - Matching Reference Design */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Main Image and Venue Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Large Image */}
            <div className="relative w-full h-[300px] sm:h-[400px] lg:h-[500px] rounded-lg overflow-hidden">
              {displayImages.length > 0 ? (
                <>
                  <img
                    src={displayImages[currentImageIndex % displayImages.length]}
                    alt={venueData?.name}
                    className="w-full h-full object-cover"
                  />
                  {displayImages.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 sm:p-2 shadow-lg"
                      >
                        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 sm:p-2 shadow-lg"
                      >
                        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-500">
                  No images available
                </div>
              )}
            </div>

            {/* Venue Header Section */}
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">{venueData?.name}</h1>
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {venueData?.address.street}, {venueData?.address.city}, {venueData?.address.state}
                  </span>
                </div>
              </div>

              {/* Rating and Reviews */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded">
                    <span className="font-semibold">{(venueData?.rating.average ?? 5.0).toFixed(1)}</span>
                    <Star className="h-4 w-4 fill-white" />
                  </div>
                  <span className="text-sm text-gray-600">{(venueData?.rating.count ?? 6)} Reviews</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* <Button className="bg-green-600 hover:bg-green-700 text-white">
                  Get Quote
                </Button> */}
                <Button variant="outline" className="border-pink-600 text-pink-600 hover:bg-pink-50">
                  View Photos
                </Button>
                <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                  Share & Reviews
                </Button>
              </div>
            </div>

            {/* Tabs Section */}
            <Tabs defaultValue="portfolio" className="w-full">
              <TabsList className="border-b border-gray-200 bg-transparent h-auto p-0 w-full justify-start">
                <TabsTrigger value="portfolio" className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-pink-600 data-[state=active]:text-pink-600 rounded-none">
                  Portfolio
                </TabsTrigger>
                <TabsTrigger value="about" className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-pink-600 data-[state=active]:text-pink-600 rounded-none">
                  About
                </TabsTrigger>
                <TabsTrigger value="reviews" className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-pink-600 data-[state=active]:text-pink-600 rounded-none">
                  Reviews
                </TabsTrigger>
                <TabsTrigger value="faq" className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-pink-600 data-[state=active]:text-pink-600 rounded-none">
                  FAQ
                </TabsTrigger>
              </TabsList>

              {/* Portfolio Tab */}
              <TabsContent value="portfolio" className="mt-6">
                <div className="grid grid-cols-3 gap-3">
                  {displayImages.slice(0, 12).map((img, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group">
                      <img
                        src={img}
                        alt={`${venueData?.name} ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
                {displayImages.length > 12 && (
                  <Button variant="outline" className="mt-4">
                    View More
                  </Button>
                )}
              </TabsContent>

              {/* About Tab */}
              <TabsContent value="about" className="mt-6">
                <div className="space-y-8">
                  {/* About the Venue */}
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                      About {venueData?.name}
                    </h2>
                    <p className="text-gray-700 leading-relaxed">{venueData?.description || "This beautiful venue offers a perfect setting for your special events."}</p>
                  </div>

                  {/* Venue Classification */}
                  {venueData?.venueClassification && (
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h3 className="font-semibold text-lg mb-4 text-gray-900">Venue Type & Classification</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Venue Type</p>
                          <div className="flex flex-wrap gap-2">
                            {venueData.venueClassification.venueTypes?.map((type, idx) => (
                              <Badge key={idx} variant="secondary">{type?.replace?.(/_/g, ' ') || 'N/A'}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Setting</p>
                          <Badge className="bg-blue-100 text-blue-800">{venueData.venueClassification.indoorOutdoor}</Badge>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Operation</p>
                          <Badge className="bg-green-100 text-green-800">
                            {venueData.venueClassification.operationMode?.replace?.(/_/g, ' ') || 'N/A'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Capacity Details */}
                  <div>
                    <h3 className="font-semibold text-lg mb-4 text-gray-900">Capacity Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="border rounded-lg p-4">
                        <Users className="h-8 w-8 text-purple-600 mb-2" />
                        <p className="text-sm text-gray-600">Standing Capacity</p>
                        <p className="text-2xl font-bold text-gray-900">{venueData?.capacityDetails?.standingCapacity || venueData?.capacity}</p>
                      </div>
                      {venueData?.capacityDetails?.seatingCapacity?.theatreStyle && (
                        <div className="border rounded-lg p-4">
                          <Users className="h-8 w-8 text-blue-600 mb-2" />
                          <p className="text-sm text-gray-600">Theatre Style Seating</p>
                          <p className="text-2xl font-bold text-gray-900">{venueData.capacityDetails.seatingCapacity.theatreStyle}</p>
                        </div>
                      )}
                      {venueData?.capacityDetails?.seatingCapacity?.roundTable && (
                        <div className="border rounded-lg p-4">
                          <Users className="h-8 w-8 text-green-600 mb-2" />
                          <p className="text-sm text-gray-600">Round Table Seating</p>
                          <p className="text-2xl font-bold text-gray-900">{venueData.capacityDetails.seatingCapacity.roundTable}</p>
                        </div>
                      )}
                    </div>
                    {venueData?.capacityDetails?.minimumBookingCapacity && (
                      <p className="text-sm text-gray-600 mt-3">Minimum booking capacity: {venueData.capacityDetails.minimumBookingCapacity} guests</p>
                    )}
                  </div>

                  {/* Amenities & Facilities */}
                  <div>
                    <h3 className="font-semibold text-lg mb-4 text-gray-900">Amenities & Facilities</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {venueData?.amenities && Object.entries(venueData.amenities)
                        .filter(([_, value]) => value.available)
                        .map(([key, value]) => {
                          const IconComponent = facilityIcons[key] || Check;
                          return (
                            <div key={key} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="p-2 bg-green-100 rounded-lg shrink-0">
                                <IconComponent className="h-5 w-5 text-green-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 break-words">
                                  {key?.replace?.(/([A-Z])/g, ' $1').trim() || 'N/A'}
                                </p>
                                {value.description && (
                                  <p className="text-xs text-gray-600 mt-1 break-words">{value.description}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      {venueData?.facilities && Object.entries(venueData.facilities)
                        .filter(([_, value]) => value)
                        .map(([key]) => {
                          const IconComponent = facilityIcons[key] || Check;
                          return (
                            <div key={key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <IconComponent className="h-5 w-5 text-green-600" />
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {key?.replace?.(/([A-Z])/g, ' $1').trim() || 'N/A'}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Parking & Accessibility */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {venueData?.parking && (
                      <div className="border rounded-lg p-6">
                        <h3 className="font-semibold text-lg mb-4 text-gray-900 flex items-center gap-2">
                          <Car className="h-5 w-5 text-purple-600" />
                          Parking Facilities
                        </h3>
                        <div className="space-y-2">
                          <p className="text-gray-700">Car Parking: <span className="font-semibold">{venueData.parking.carCapacity} vehicles</span></p>
                          <p className="text-gray-700">Two Wheeler: <span className="font-semibold">{venueData.parking.twoWheelerAvailable ? 'Available' : 'Not Available'}</span></p>
                        </div>
                      </div>
                    )}
                    {venueData?.accessibility && (
                      <div className="border rounded-lg p-6">
                        <h3 className="font-semibold text-lg mb-4 text-gray-900 flex items-center gap-2">
                          <Accessibility className="h-5 w-5 text-blue-600" />
                          Accessibility
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {venueData.accessibility.wheelchairAccess ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-600" />}
                            <span className="text-gray-700">Wheelchair Access</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {venueData.accessibility.liftElevator ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-600" />}
                            <span className="text-gray-700">Lift/Elevator</span>
                          </div>
                          {venueData.accessibility.nearbyTransport && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-900 mb-2">Nearby Transport:</p>
                              <div className="flex flex-wrap gap-2">
                                {venueData.accessibility.nearbyTransport.airport && <Badge variant="outline">Airport</Badge>}
                                {venueData.accessibility.nearbyTransport.railwayStation && <Badge variant="outline">Railway Station</Badge>}
                                {venueData.accessibility.nearbyTransport.taxiService && <Badge variant="outline">Taxi Service</Badge>}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Policies */}
                  {venueData?.policies && (
                    <div className="border rounded-lg p-6">
                      <h3 className="font-semibold text-lg mb-4 text-gray-900">Venue Policies</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {venueData.policies.operatingHours && (
                          <div>
                            <p className="text-sm font-medium text-gray-900 mb-1">Operating Hours</p>
                            <p className="text-gray-700">{venueData.policies.operatingHours.startTime} - {venueData.policies.operatingHours.endTime}</p>
                          </div>
                        )}
                        {venueData.policies.smokingPolicy && (
                          <div>
                            <p className="text-sm font-medium text-gray-900 mb-1">Smoking Policy</p>
                            <p className="text-gray-700 capitalize">
                              {venueData.policies.smokingPolicy?.replace?.(/_/g, ' ') || 'Not specified'}
                            </p>
                          </div>
                        )}
                        {venueData.policies.alcoholServingPermission !== undefined && (
                          <div>
                            <p className="text-sm font-medium text-gray-900 mb-1">Alcohol Permission</p>
                            <p className="text-gray-700">{venueData.policies.alcoholServingPermission ? 'Allowed' : 'Not Allowed'}</p>
                          </div>
                        )}
                        {venueData.policies.noiseRestrictions && (
                          <div>
                            <p className="text-sm font-medium text-gray-900 mb-1">Noise Restrictions</p>
                            <p className="text-gray-700">{venueData.policies.noiseRestrictions}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Add-on Services */}
                  {venueData?.addOnServices && (
                    <div>
                      <h3 className="font-semibold text-lg mb-4 text-gray-900">Add-on Services</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {venueData.addOnServices.cateringPackages?.available && (
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <UtensilsCrossed className="h-5 w-5 text-orange-600" />
                              <h4 className="font-semibold text-gray-900">Catering Packages</h4>
                            </div>
                            <p className="text-sm text-gray-600">Available</p>
                          </div>
                        )}
                        {venueData.addOnServices.eventManagementServices?.available && (
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Award className="h-5 w-5 text-purple-600" />
                              <h4 className="font-semibold text-gray-900">Event Management</h4>
                            </div>
                            <p className="text-sm text-gray-600">{venueData.addOnServices.eventManagementServices.description || 'Available'}</p>
                          </div>
                        )}
                        {venueData.addOnServices.photographyDecorPackages?.available && (
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Gift className="h-5 w-5 text-pink-600" />
                              <h4 className="font-semibold text-gray-900">Photography & Decor</h4>
                            </div>
                            <p className="text-sm text-gray-600">{venueData.addOnServices.photographyDecorPackages.description || 'Available'}</p>
                          </div>
                        )}
                        {venueData.addOnServices.accommodationBundle?.available && (
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Home className="h-5 w-5 text-blue-600" />
                              <h4 className="font-semibold text-gray-900">Accommodation</h4>
                            </div>
                            <p className="text-sm text-gray-600">{venueData.addOnServices.accommodationBundle.description || 'Available'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Pricing Details */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6">
                    <h3 className="font-semibold text-lg mb-4 text-gray-900 flex items-center gap-2">
                      <IndianRupee className="h-5 w-5 text-purple-600" />
                      Pricing Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                        <span className="text-gray-700">Base Price</span>
                        <span className="font-semibold text-lg">₹ {(venueData?.pricing.basePrice || 0).toLocaleString('en-IN')}</span>
                      </div>
                      {venueData?.pricing.hourlyRate && (
                        <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                          <span className="text-gray-700">Hourly Rate</span>
                          <span className="font-semibold">₹ {venueData.pricing.hourlyRate.toLocaleString('en-IN')}/hour</span>
                        </div>
                      )}
                      {venueData?.pricing.fullDayRate && (
                        <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                          <span className="text-gray-700">Full Day Rate</span>
                          <span className="font-semibold">₹ {venueData.pricing.fullDayRate.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {venueData?.pricing.securityDeposit && (
                        <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                          <span className="text-gray-700">Security Deposit</span>
                          <span className="font-semibold">₹ {venueData.pricing.securityDeposit.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {venueData?.pricing.rentalIncludes && venueData.pricing.rentalIncludes.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-900 mb-2">Rental Includes:</p>
                          <div className="flex flex-wrap gap-2">
                            {venueData.pricing.rentalIncludes?.map((item, idx) => (
                              <Badge key={idx} variant="secondary">{item?.replace?.(/_/g, ' ') || 'N/A'}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  {(venueData?.terms?.cancellationPolicy || venueData?.terms?.additionalRules || venueData?.pricing?.cancellationPolicy) && (
                    <div className="border-l-4 border-orange-500 bg-orange-50 p-6 rounded-r-lg">
                      <h3 className="font-semibold text-lg mb-4 text-gray-900">Terms & Conditions</h3>
                      <div className="space-y-3">
                        {(venueData.terms?.cancellationPolicy || venueData.pricing?.cancellationPolicy) && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-1">Cancellation Policy</h4>
                            <p className="text-sm text-gray-700">
                              {venueData.terms?.cancellationPolicy ||
                                (venueData.pricing?.cancellationPolicy?.refundable
                                  ? `Refundable within ${venueData.pricing.cancellationPolicy.timeFrame || 'specified time'}. ${venueData.pricing.cancellationPolicy.deductionPercentage ? `${venueData.pricing.cancellationPolicy.deductionPercentage}% deduction applies.` : ''}`
                                  : 'Non-refundable'
                                )
                              }
                            </p>
                          </div>
                        )}
                        {venueData.terms?.additionalRules && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-1">Additional Rules</h4>
                            <p className="text-sm text-gray-700">{venueData.terms.additionalRules}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="mt-6">
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-2xl font-semibold text-gray-900">
                      Reviews for {venueData?.name} ({(venueData?.rating.count ?? 0)})
                    </h2>
                  </div>

                  {/* Write Review (only for logged-in users) */}
                  {user ? (
                    <div className="bg-white border rounded-lg p-4 space-y-3">
                      <h3 className="font-semibold text-gray-900">Write a Review</h3>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewReview({ ...newReview, rating: star })}
                            className={`p-1 rounded ${newReview.rating >= star ? 'text-pink-600' : 'text-gray-300'}`}
                            aria-label={`Rate ${star} star`}
                          >
                            <Star className={`h-6 w-6 ${newReview.rating >= star ? 'fill-pink-600' : ''}`} />
                          </button>
                        ))}
                      </div>
                      <Textarea
                        placeholder="Share your experience..."
                        value={newReview.comment}
                        onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                        rows={3}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button onClick={handleSubmitReview} disabled={submittingReview} className="bg-pink-600 hover:bg-pink-700 text-white">
                          {submittingReview ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                          Submit Review
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border rounded-lg p-4 text-gray-600">
                      Please login to write a review.
                    </div>
                  )}

                  {/* Rating Distribution */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                      <div className="text-center">
                        <div className="text-5xl font-bold text-gray-900">{(venueData?.rating.average ?? 0).toFixed(1)}</div>
                        <div className="flex items-center gap-1 mt-2 justify-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={`h-5 w-5 ${star <= (venueData?.rating.average ?? 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                          ))}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{venueData?.rating.count ?? 0} reviews</p>
                      </div>
                      <div className="flex-1 w-full">
                        <div className="space-y-2">
                          {[5, 4, 3, 2, 1].map((rating) => {
                            const percentage = venueData?.rating.count ? ((venueData.reviews?.filter(r => r.rating === rating).length || 0) / venueData.rating.count) * 100 : 0;
                            return (
                              <div key={rating} className="flex items-center gap-3">
                                <span className="text-sm text-gray-600 w-12">{rating} star</span>
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div className="bg-yellow-400 h-2 rounded-full transition-all" style={{ width: `${percentage}%` }}></div>
                                </div>
                                <span className="text-sm text-gray-600 w-12 text-right">{percentage.toFixed(0)}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Individual Reviews */}
                  <div className="space-y-6">
                    {venueData?.reviews && venueData.reviews.length > 0 ? (
                      venueData.reviews.map((review, index) => (
                        <div key={index} className="border-b pb-6 last:border-b-0">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center shrink-0">
                              <span className="text-pink-600 font-semibold text-lg">
                                {(review as any).userName?.charAt(0).toUpperCase() || review.user?.name?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                <div>
                                  <h4 className="font-semibold text-gray-900">{(review as any).userName || review.user?.name || 'Anonymous'}</h4>
                                  <div className="flex items-center gap-1 mt-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star key={star} className={`h-4 w-4 ${star <= review.rating ? 'text-pink-600 fill-pink-600' : 'text-gray-300'}`} />
                                    ))}
                                  </div>
                                </div>
                                <span className="text-sm text-gray-500">
                                  {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </div>
                              <p className="text-gray-700 text-sm mt-2 break-words">
                                {review.comment}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 text-lg font-medium">No reviews yet</p>
                        <p className="text-gray-500 text-sm mt-2">Be the first to review this venue!</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* FAQ Tab */}
              <TabsContent value="faq" className="mt-6">
                <div className="space-y-4">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    FAQ about {venueData?.name}
                  </h2>
                  {venueData?.faqs && venueData.faqs.length > 0 ? (
                    <Accordion type="multiple" className="w-full">
                      {venueData.faqs
                        .filter((f) => f.isActive !== false)
                        .slice()
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                        .map((f, idx) => (
                          <AccordionItem key={f._id || idx} value={(f._id || String(idx)) as string}>
                            <AccordionTrigger>{f.question}</AccordionTrigger>
                            <AccordionContent>
                              {f.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                    </Accordion>
                  ) : (
                    <div className="bg-gray-50 border rounded-lg p-6 text-gray-600">
                      No FAQs added by this venue yet.
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            {/* Calendar */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl  top-6">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-gray-800 flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2 text-purple-600" />
                  Check Availability
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Select an available date for your booking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => {
                      // Only disable past dates, allow selection of dates with existing bookings
                      return date < new Date(new Date().setHours(0, 0, 0, 0));
                    }}
                    modifiers={{
                      partiallyBooked: getPartiallyBookedDates(),
                      past: date => date < new Date(new Date().setHours(0, 0, 0, 0)),
                      available: date => {
                        const isNotPast = date >= new Date(new Date().setHours(0, 0, 0, 0));
                        const hasNoBookings = !getUnavailableDates().some(unavailableDate =>
                          unavailableDate.toDateString() === date.toDateString()
                        );
                        return isNotPast && hasNoBookings;
                      },
                    }}
                    modifiersClassNames={{
                      partiallyBooked: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
                      past: 'text-gray-400 cursor-not-allowed opacity-50',
                      available: 'text-green-600 hover:bg-green-50',
                      today: 'bg-blue-100 text-blue-800',
                    }}
                    className="rounded-md"
                  />
                </div>

                <div className="flex items-center justify-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">Available</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-gray-600">Partially Booked</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="text-gray-600">Past Dates</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Section */}
            {selectedDate && (
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-800">Book {venueData?.name}</CardTitle>
                  <CardDescription className="text-purple-600 font-medium">
                    Selected Date: {format(selectedDate, 'PPP')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {bookingSuccess ? (
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-2xl font-bold text-gray-800">Booking Confirmed!</h3>
                      <p className="text-gray-600 mt-2 mb-6">Your invoice has been generated.</p>

                      <div className="text-left space-y-2 text-gray-700 mb-6 bg-white p-4 rounded-md border">
                        <p><strong>Booking ID:</strong> {finalBookingDetails?._id}</p>
                        <p><strong>Date:</strong> {format(new Date(finalBookingDetails?.bookingDate), 'PPP')}</p>
                        <p><strong>Time:</strong> {finalBookingDetails?.startTime} - {finalBookingDetails?.endTime}</p>
                        <p><strong>Guests:</strong> {finalBookingDetails?.guestCount}</p>
                        <p><strong>Total Paid:</strong> ₹{finalBookingDetails?.pricing?.totalAmount}</p>
                      </div>

                      <Button
                        onClick={handleDownloadInvoice}
                        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                      >
                        <Download className="h-5 w-5 mr-2" />
                        Download Invoice
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Availability Summary */}
                      {/* {availabilityData && (
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-800 mb-2">Availability Summary</h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">{availabilityData.summary.availableSlots}</div>
                              <div className="text-gray-600">Available Slots</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-red-600">{availabilityData.summary.bookedSlots}</div>
                              <div className="text-gray-600">Booked Slots</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">{availabilityData.existingBookings.length}</div>
                              <div className="text-gray-600">Total Bookings</div>
                            </div>
                          </div>
                        </div>
                      )} */}

                      {/* Time Slot Visual Display */}
                      {/* {availabilityData && (
                        <div className="bg-white p-4 rounded-lg border">
                          <h4 className="font-semibold text-gray-800 mb-3">Time Slot Availability</h4>
                          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1 text-xs">
                            {availabilityData.timeSlots.filter((_, index) => index % 2 === 0).map((slot, index) => (
                              <div
                                key={slot.time}
                                className={`p-2 rounded text-center cursor-pointer transition-all ${
                                  slot.available 
                                    ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                    : 'bg-red-100 text-red-800'
                                }`}
                                title={slot.available ? `Available at ${formatTimeForDisplay(slot.time)}` : `Booked at ${formatTimeForDisplay(slot.time)}`}
                              >
                                {formatTimeForDisplay(slot.time)}
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-center space-x-6 mt-3 text-sm">
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                              <span className="text-gray-600">Available</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                              <span className="text-gray-600">Booked</span>
                            </div>
                          </div>
                        </div>
                      )} */}

                      {/* Existing Bookings Display */}
                      {/* {availabilityData && availabilityData.existingBookings.length > 0 && (
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                          <h4 className="font-semibold text-gray-800 mb-3">Existing Bookings for This Date</h4>
                          <div className="space-y-2">
                            {availabilityData.existingBookings.map((booking, index) => (
                              <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                                <div className="flex items-center space-x-3">
                                  <Clock className="h-4 w-4 text-orange-500" />
                                  <span className="font-medium">
                                    {formatTimeForDisplay(booking.startTime)} - {formatTimeForDisplay(booking.endTime)}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600">
                                  {booking.eventType} • {booking.guestCount} guests
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )} */}

                      <form onSubmit={handleBookingSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="startTime">Start Time *</Label>
                            <Select
                              onValueChange={(value) => setBookingForm({ ...bookingForm, startTime: value })}
                              value={bookingForm.startTime}
                            >
                              <SelectTrigger id="startTime">
                                <SelectValue placeholder="Select start time" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableTimeOptions().map((time) => (
                                  <SelectItem
                                    key={time.value}
                                    value={time.value}
                                    disabled={time.disabled}
                                    className={time.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span>{time.label}</span>
                                      {time.disabled && (
                                        <span className="text-red-500 text-xs ml-2">Booked</span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="endTime">End Time *</Label>
                            <Select
                              onValueChange={(value) => setBookingForm({ ...bookingForm, endTime: value })}
                              value={bookingForm.endTime}
                            >
                              <SelectTrigger id="endTime">
                                <SelectValue placeholder="Select end time" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableTimeOptions().map((time) => (
                                  <SelectItem
                                    key={time.value}
                                    value={time.value}
                                    disabled={time.disabled}
                                    className={time.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span>{time.label}</span>
                                      {time.disabled && (
                                        <span className="text-red-500 text-xs ml-2">Booked</span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="guestCount">Number of Guests *</Label>
                          <Input id="guestCount" type="number" min="1" max={venueData?.capacity} value={bookingForm.guestCount} onChange={(e) => setBookingForm({ ...bookingForm, guestCount: e.target.value })} required />
                        </div>
                        <div>
                          <Label htmlFor="eventType">Event Type</Label>
                          <Input id="eventType" value={bookingForm.eventType} onChange={(e) => setBookingForm({ ...bookingForm, eventType: e.target.value })} placeholder="e.g., Wedding, Conference, Party" />
                        </div>
                        <div>
                          <Label htmlFor="specialRequirements">Special Requirements</Label>
                          <Textarea id="specialRequirements" value={bookingForm.specialRequirements} onChange={(e) => setBookingForm({ ...bookingForm, specialRequirements: e.target.value })} placeholder="Any special requests or requirements..." />
                        </div>

                        {formError && (
                          <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg">
                            <span className="font-medium">Error:</span> {formError}
                          </div>
                        )}

                        <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3" disabled={submitting || authLoading}>
                          {submitting ? 'Processing...' : 'Book and Pay Now'}
                        </Button>
                      </form>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!selectedDate && (
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                <CardContent className="pt-8 pb-8">
                  <div className="text-center text-gray-500">
                    <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-8 rounded-2xl">
                      <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-purple-400" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">Select a Date</h3>
                      <p className="text-gray-600">Choose an available date from the calendar above to start your booking process</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact Card */}
            <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-xl">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4">Need Help?</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 mr-3" />
                    <span className="text-sm">{venueData?.contactInfo.phone}</span>
                  </div>
                  {venueData?.contactInfo.email && (
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 mr-3" />
                      <span className="text-sm">{venueData.contactInfo.email}</span>
                    </div>
                  )}
                </div>
                <Button className="w-full mt-4 bg-white text-purple-600 hover:bg-gray-100 font-semibold">
                  Contact Us
                </Button>
              </CardContent>
            </Card>
          </div>


        </div>

        {/* Similar Venues Section */}
        {similarVenues.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Browse Similar Venues in {venueData?.address.city}
            </h2>
            <Carousel className="w-full">
              <CarouselContent>
                {similarVenues.map((venue) => {
                  const venueImage = getPrimaryVenueImage(venue);

                  return (
                    <CarouselItem key={venue._id} className="md:basis-1/2 lg:basis-1/4">
                      <Card
                        className="border hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => router.push(`/allVenues/${venue._id}`)}
                      >
                        <div className="relative h-48 rounded-t-lg overflow-hidden">
                          {venueImage ? (
                            <img
                              src={venueImage}
                              alt={venue.name}
                              className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm">
                              No image
                            </div>
                          )}
                          {venue.venueClassification?.indoorOutdoor && (
                            <Badge className="absolute top-2 right-2 bg-white/90 text-gray-900">
                              {venue.venueClassification.indoorOutdoor}
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-gray-900 mb-1 truncate" title={venue.name}>
                            {venue.name}
                          </h3>
                          <div className="flex items-center gap-1 mb-2">
                            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-sm text-gray-600">
                              {venue.rating?.average ? venue.rating.average.toFixed(1) : '5.0'}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({venue.rating?.count || 0})
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            <MapPin className="h-3 w-3 text-gray-500" />
                            <p className="text-sm text-gray-600 truncate">
                              {venue.address.city}, {venue.address.state}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            <Users className="h-3 w-3 text-gray-500" />
                            <p className="text-sm text-gray-600">
                              Up to {venue.capacity} guests
                            </p>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t">
                            <p className="text-sm font-semibold text-gray-900">
                              ₹ {(venue.pricing.hourlyRate || venue.pricing.basePrice || 0).toLocaleString('en-IN')}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/allVenues/${venue._id}`);
                              }}
                            >
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex" />
              <CarouselNext className="hidden md:flex" />
            </Carousel>
            <div className="text-center mt-6">
              <Button
                variant="outline"
                onClick={() => router.push(`/allVenues/list?city=${venueData?.address.city}`)}
                className="px-8"
              >
                View All Venues in {venueData?.address.city}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
//                 <CardTitle className="text-xl font-semibold text-gray-900">About</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <p className="text-gray-700 leading-relaxed">{venueData?.description}</p>
//               </CardContent>
//             </Card>

//             {/* Venue Spaces */}
//             <Card className="border shadow-sm">
//               <CardHeader>
//                 <CardTitle className="text-xl font-semibold text-gray-900">Venue Spaces</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-4">
//                   <div className="border-b pb-4">
//                     <div className="flex justify-between items-start mb-2">
//                       <div>
//                         <h4 className="font-semibold text-gray-900">Main Hall</h4>
//                         <p className="text-sm text-gray-600">Banquet Hall</p>
//                       </div>
//                       <div className="text-right">
//                         <div className="text-sm text-gray-600">Capacity</div>
//                         <div className="font-semibold">{venueData?.capacity} guests</div>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Address */}
//             <Card className="border shadow-sm">
//               <CardHeader>
//                 <CardTitle className="text-xl font-semibold text-gray-900">Address</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="flex items-start gap-3">
//                   <MapPin className="h-5 w-5 text-gray-600 mt-1" />
//                   <div>
//                     <p className="text-gray-700">
//                       {venueData?.address.street}, {venueData?.address.city}, {venueData?.address.state} - {venueData?.address.pincode}
//                     </p>
//                     {venueData?.address.landmark && (
//                       <p className="text-sm text-gray-600 mt-1">Landmark: {venueData.address.landmark}</p>
//                     )}
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Amenities */}
//             <Card className="border shadow-sm">
//               <CardHeader>
//                 <CardTitle className="text-xl font-semibold text-gray-900">Amenities</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
//                   {Object.entries((venueData?.facilities ?? {}) as Record<string, boolean>)
//                     .filter(([_, value]) => value)
//                     .map(([key]) => {
//                       const IconComponent = facilityIcons[key as keyof typeof facilityIcons] || Check;
//                       return (
//                         <div key={key} className="flex items-center gap-2">
//                           <div className="p-2 bg-green-100 rounded-lg">
//                             <IconComponent className="h-4 w-4 text-green-600" />
//                           </div>
//                           <span className="text-gray-700 text-sm">
//                             {key.replace(/([A-Z])/g, ' $1').trim()}
//                           </span>
//                         </div>
//                       );
//                     })}
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Pricing Details */}
//             <Card className="border shadow-sm">
//               <CardHeader>
//                 <CardTitle className="text-xl font-semibold text-gray-900">Pricing</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-3">
//                   <div className="flex justify-between items-center pb-3 border-b">
//                     <span className="text-gray-700">Venue Rental (per function)</span>
//                     <span className="font-semibold">₹ {(venueData?.pricing.hourlyRate || venueData?.pricing.basePrice || 0).toLocaleString('en-IN')}</span>
//                   </div>
//                   <div className="flex justify-between items-center pb-3 border-b">
//                     <span className="text-gray-700">Veg Price (per plate)</span>
//                     <span className="font-semibold">₹ 800</span>
//                   </div>
//                   <div className="flex justify-between items-center pb-3 border-b">
//                     <span className="text-gray-700">Non-Veg Price (per plate)</span>
//                     <span className="font-semibold">₹ 1,000</span>
//                   </div>
//                   {venueData?.pricing.securityDeposit && (
//                     <div className="flex justify-between items-center pb-3 border-b">
//                       <span className="text-gray-700">Security Deposit</span>
//                       <span className="font-semibold">₹ {venueData.pricing.securityDeposit.toLocaleString('en-IN')}</span>
//                     </div>
//                   )}
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Terms & Conditions */}
//             {venueData?.terms && (venueData.terms.cancellationPolicy || venueData.terms.additionalRules) && (
//               <Card className="border shadow-sm">
//                 <CardHeader>
//                   <CardTitle className="text-xl font-semibold text-gray-900">Terms & Policies</CardTitle>
//                 </CardHeader>
//                 <CardContent className="space-y-4">
//                   {venueData?.terms.cancellationPolicy && (
//                     <div>
//                       <h4 className="font-semibold text-gray-900 mb-2">Cancellation Policy</h4>
//                       <p className="text-gray-700 text-sm">{venueData.terms.cancellationPolicy}</p>
//                     </div>
//                   )}
//                   {venueData?.terms.additionalRules && (
//                     <div>
//                       <h4 className="font-semibold text-gray-900 mb-2">Additional Rules</h4>
//                       <p className="text-gray-700 text-sm">{venueData.terms.additionalRules}</p>
//                     </div>
//                   )}
//                 </CardContent>
//               </Card>
//             )}

//             {/* Reviews Section */}
//             <Card className="border shadow-sm">
//               <CardHeader>
//                 <div className="flex items-center justify-between">
//                   <CardTitle className="text-xl font-semibold text-gray-900">Reviews</CardTitle>
//                   <div className="flex items-center gap-2">
//                     <Star className="h-5 w-5 text-pink-600 fill-pink-600" />
//                     <span className="font-semibold text-lg">{venueData?.rating.average || 5.0}</span>
//                     <span className="text-gray-600">({venueData?.rating.count || 6} reviews)</span>
//                   </div>
//                 </div>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-6">
//                   {/* Sample Review 1 */}
//                   <div className="border-b pb-6">
//                     <div className="flex items-start gap-4">
//                       <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
//                         <span className="text-pink-600 font-semibold">A</span>
//                       </div>
//                       <div className="flex-1">
//                         <div className="flex items-center justify-between mb-2">
//                           <div>
//                             <h4 className="font-semibold text-gray-900">Amit Kumar</h4>
//                             <div className="flex items-center gap-1 mt-1">
//                               {[1, 2, 3, 4, 5].map((star) => (
//                                 <Star key={star} className="h-4 w-4 text-pink-600 fill-pink-600" />
//                               ))}
//                             </div>
//                           </div>
//                           <span className="text-sm text-gray-500">2 weeks ago</span>
//                         </div>
//                         <p className="text-gray-700 text-sm">
//                           Excellent venue for our wedding reception. The staff was very professional and the ambiance was perfect. Highly recommended!
//                         </p>
//                       </div>
//                     </div>
//                   </div>

//                   {/* Sample Review 2 */}
//                   <div className="border-b pb-6">
//                     <div className="flex items-start gap-4">
//                       <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
//                         <span className="text-blue-600 font-semibold">P</span>
//                       </div>
//                       <div className="flex-1">
//                         <div className="flex items-center justify-between mb-2">
//                           <div>
//                             <h4 className="font-semibold text-gray-900">Priya Sharma</h4>
//                             <div className="flex items-center gap-1 mt-1">
//                               {[1, 2, 3, 4].map((star) => (
//                                 <Star key={star} className="h-4 w-4 text-pink-600 fill-pink-600" />
//                               ))}
//                               <Star className="h-4 w-4 text-gray-300" />
//                             </div>
//                           </div>
//                           <span className="text-sm text-gray-500">1 month ago</span>
//                         </div>
//                         <p className="text-gray-700 text-sm">
//                           Great location and beautiful interiors. The catering service was good. Would definitely consider for future events.
//                         </p>
//                       </div>
//                     </div>
//                   </div>

//                   <Button variant="outline" className="w-full">
//                     <MessageCircle className="h-4 w-4 mr-2" />
//                     Write a Review
//                   </Button>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>

//           {/* Booking Sidebar */}
//           <div className="space-y-6">
//             {/* Pricing Summary Card */}
//             <Card className="border shadow-lg  top-6">
//               <CardHeader className="pb-4">
//                 <CardTitle className="text-xl font-semibold text-gray-900">Book this Venue</CardTitle>
//                 <div className="mt-2">
//                   <div className="text-2xl font-bold text-gray-900">
//                     ₹ {(venueData?.pricing.hourlyRate || venueData?.pricing.basePrice || 0).toLocaleString('en-IN')}
//                   </div>
//                   <div className="text-sm text-gray-600">per function</div>
//                 </div>
//               </CardHeader>
//               <CardContent className="space-y-4">
//                 <div className="space-y-3">
//                   <div className="flex items-center justify-between text-sm">
//                     <span className="text-gray-600">Capacity</span>
//                     <span className="font-semibold">{venueData?.capacity} guests</span>
//                   </div>
//                   <div className="flex items-center justify-between text-sm">
//                     <span className="text-gray-600">Veg Price</span>
//                     <span className="font-semibold">₹ 800/plate</span>
//                   </div>
//                   <div className="flex items-center justify-between text-sm">
//                     <span className="text-gray-600">Non-Veg Price</span>
//                     <span className="font-semibold">₹ 1,000/plate</span>
//                   </div>
//                 </div>
//                 <div className="border-t pt-4">
//                   <Button className="w-full bg-pink-600 hover:bg-pink-700 text-white">
//                     <Phone className="h-4 w-4 mr-2" />
//                     Contact Venue
//                   </Button>
//                   <Button variant="outline" className="w-full mt-2">
//                     <CalendarIcon className="h-4 w-4 mr-2" />
//                     Check Availability
//                   </Button>
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Calendar Card */}
//             <Card className="border shadow-sm">
//               <CardHeader className="pb-4">
//                 <CardTitle className="text-lg font-semibold text-gray-900">Select Date</CardTitle>
//               </CardHeader>
//               <CardContent className="space-y-4">
//                 <Calendar
//                   mode="single"
//                   selected={selectedDate}
//                   onSelect={setSelectedDate}
//                   disabled={(date) => {
//                     return date < new Date(new Date().setHours(0, 0, 0, 0));
//                   }}
//                   className="rounded-md border"
//                 />
//               </CardContent>
//             </Card>

//             {/* Booking Section */}
//             {selectedDate && (
//               <Card className="border shadow-sm">
//                 <CardHeader>
//                   <CardTitle className="text-lg font-semibold text-gray-900">Booking Details</CardTitle>
//                   <CardDescription className="text-gray-600">
//                     {format(selectedDate, 'PPP')}
//                   </CardDescription>
//                 </CardHeader>
//                 <CardContent>
//                   {bookingSuccess ? (
//                     <div className="text-center p-4 bg-green-50 rounded-lg">
//                       <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
//                       <h3 className="text-2xl font-bold text-gray-800">Booking Confirmed!</h3>
//                       <p className="text-gray-600 mt-2 mb-6">Your invoice has been generated.</p>

//                       <div className="text-left space-y-2 text-gray-700 mb-6 bg-white p-4 rounded-md border">
//                         <p><strong>Booking ID:</strong> {finalBookingDetails?._id}</p>
//                         <p><strong>Date:</strong> {format(new Date(finalBookingDetails?.bookingDate), 'PPP')}</p>
//                         <p><strong>Time:</strong> {finalBookingDetails?.startTime} - {finalBookingDetails?.endTime}</p>
//                         <p><strong>Guests:</strong> {finalBookingDetails?.guestCount}</p>
//                         <p><strong>Total Paid:</strong> ₹{finalBookingDetails?.pricing?.totalAmount}</p>
//                       </div>

//                       <Button
//                         onClick={handleDownloadInvoice}
//                         className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
//                       >
//                         <Download className="h-5 w-5 mr-2" />
//                         Download Invoice
//                       </Button>
//                     </div>
//                   ) : (
//                     <div className="space-y-6">
//                       {/* Availability Summary */}
//                       {/* {availabilityData && (
//                         <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
//                           <h4 className="font-semibold text-gray-800 mb-2">Availability Summary</h4>
//                           <div className="grid grid-cols-3 gap-4 text-sm">
//                             <div className="text-center">
//                               <div className="text-2xl font-bold text-green-600">{availabilityData.summary.availableSlots}</div>
//                               <div className="text-gray-600">Available Slots</div>
//                             </div>
//                             <div className="text-center">
//                               <div className="text-2xl font-bold text-red-600">{availabilityData.summary.bookedSlots}</div>
//                               <div className="text-gray-600">Booked Slots</div>
//                             </div>
//                             <div className="text-center">
//                               <div className="text-2xl font-bold text-blue-600">{availabilityData.existingBookings.length}</div>
//                               <div className="text-gray-600">Total Bookings</div>
//                             </div>
//                           </div>
//                         </div>
//                       )} */}

//                       {/* Time Slot Visual Display */}
//                       {/* {availabilityData && (
//                         <div className="bg-white p-4 rounded-lg border">
//                           <h4 className="font-semibold text-gray-800 mb-3">Time Slot Availability</h4>
//                           <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1 text-xs">
//                             {availabilityData.timeSlots.filter((_, index) => index % 2 === 0).map((slot, index) => (
//                               <div
//                                 key={slot.time}
//                                 className={`p-2 rounded text-center cursor-pointer transition-all ${
//                                   slot.available 
//                                     ? 'bg-green-100 text-green-800 hover:bg-green-200' 
//                                     : 'bg-red-100 text-red-800'
//                                 }`}
//                                 title={slot.available ? `Available at ${formatTimeForDisplay(slot.time)}` : `Booked at ${formatTimeForDisplay(slot.time)}`}
//                               >
//                                 {formatTimeForDisplay(slot.time)}
//                               </div>
//                             ))}
//                           </div>
//                           <div className="flex items-center justify-center space-x-6 mt-3 text-sm">
//                             <div className="flex items-center space-x-2">
//                               <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
//                               <span className="text-gray-600">Available</span>
//                             </div>
//                             <div className="flex items-center space-x-2">
//                               <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
//                               <span className="text-gray-600">Booked</span>
//                             </div>
//                           </div>
//                         </div>
//                       )} */}

//                       {/* Existing Bookings Display */}
//                       {/* {availabilityData && availabilityData.existingBookings.length > 0 && (
//                         <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
//                           <h4 className="font-semibold text-gray-800 mb-3">Existing Bookings for This Date</h4>
//                           <div className="space-y-2">
//                             {availabilityData.existingBookings.map((booking, index) => (
//                               <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
//                                 <div className="flex items-center space-x-3">
//                                   <Clock className="h-4 w-4 text-orange-500" />
//                                   <span className="font-medium">
//                                     {formatTimeForDisplay(booking.startTime)} - {formatTimeForDisplay(booking.endTime)}
//                                   </span>
//                                 </div>
//                                 <div className="text-sm text-gray-600">
//                                   {booking.eventType} • {booking.guestCount} guests
//                                 </div>
//                               </div>
//                             ))}
//                           </div>
//                         </div>
//                       )} */}

//                       <form onSubmit={handleBookingSubmit} className="space-y-4">
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                           <div>
//                             <Label htmlFor="startTime">Start Time *</Label>
//                             <Select
//                               onValueChange={(value) => setBookingForm({ ...bookingForm, startTime: value })}
//                               value={bookingForm.startTime}
//                             >
//                               <SelectTrigger id="startTime">
//                                 <SelectValue placeholder="Select start time" />
//                               </SelectTrigger>
//                               <SelectContent>
//                                 {getAvailableTimeOptions().map((time) => (
//                                   <SelectItem
//                                     key={time.value}
//                                     value={time.value}
//                                     disabled={time.disabled}
//                                     className={time.disabled ? 'opacity-50 cursor-not-allowed' : ''}
//                                   >
//                                     <div className="flex items-center justify-between w-full">
//                                       <span>{time.label}</span>
//                                       {time.disabled && (
//                                         <span className="text-red-500 text-xs ml-2">Booked</span>
//                                       )}
//                                     </div>
//                                   </SelectItem>
//                                 ))}
//                               </SelectContent>
//                             </Select>
//                           </div>
//                           <div>
//                             <Label htmlFor="endTime">End Time *</Label>
//                             <Select
//                               onValueChange={(value) => setBookingForm({ ...bookingForm, endTime: value })}
//                               value={bookingForm.endTime}
//                             >
//                               <SelectTrigger id="endTime">
//                                 <SelectValue placeholder="Select end time" />
//                               </SelectTrigger>
//                               <SelectContent>
//                                 {getAvailableTimeOptions().map((time) => (
//                                   <SelectItem
//                                     key={time.value}
//                                     value={time.value}
//                                     disabled={time.disabled}
//                                     className={time.disabled ? 'opacity-50 cursor-not-allowed' : ''}
//                                   >
//                                     <div className="flex items-center justify-between w-full">
//                                       <span>{time.label}</span>
//                                       {time.disabled && (
//                                         <span className="text-red-500 text-xs ml-2">Booked</span>
//                                       )}
//                                     </div>
//                                   </SelectItem>
//                                 ))}
//                               </SelectContent>
//                             </Select>
//                           </div>
//                         </div>
//                         <div>
//                           <Label htmlFor="guestCount">Number of Guests *</Label>
//                           <Input id="guestCount" type="number" min="1" max={venueData?.capacity} value={bookingForm.guestCount} onChange={(e) => setBookingForm({ ...bookingForm, guestCount: e.target.value })} required />
//                         </div>
//                         <div>
//                           <Label htmlFor="eventType">Event Type</Label>
//                           <Input id="eventType" value={bookingForm.eventType} onChange={(e) => setBookingForm({ ...bookingForm, eventType: e.target.value })} placeholder="e.g., Wedding, Conference, Party" />
//                         </div>
//                         <div>
//                           <Label htmlFor="specialRequirements">Special Requirements</Label>
//                           <Textarea id="specialRequirements" value={bookingForm.specialRequirements} onChange={(e) => setBookingForm({ ...bookingForm, specialRequirements: e.target.value })} placeholder="Any special requests or requirements..." />
//                         </div>

//                         {formError && (
//                           <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg">
//                             <span className="font-medium">Error:</span> {formError}
//                           </div>
//                         )}

//                         <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3" disabled={submitting || authLoading}>
//                           {submitting ? 'Processing...' : 'Book and Pay Now'}
//                         </Button>
//                       </form>
//                     </div>
//                   )}
//                 </CardContent>
//               </Card>
//             )}

//             {/* Contact Information */}
//             <Card className="border shadow-sm bg-gray-50">
//               <CardHeader>
//                 <CardTitle className="text-lg font-semibold text-gray-900">Contact Information</CardTitle>
//               </CardHeader>
//               <CardContent className="space-y-3">
//                 <div className="flex items-center gap-3">
//                   <div className="p-2 bg-white rounded-lg">
//                     <Phone className="h-5 w-5 text-pink-600" />
//                   </div>
//                   <div>
//                     <div className="text-sm text-gray-600">Phone</div>
//                     <div className="font-medium">{venueData?.contactInfo.phone}</div>
//                   </div>
//                 </div>
//                 {venueData?.contactInfo.email && (
//                   <div className="flex items-center gap-3">
//                     <div className="p-2 bg-white rounded-lg">
//                       <Mail className="h-5 w-5 text-pink-600" />
//                     </div>
//                     <div>
//                       <div className="text-sm text-gray-600">Email</div>
//                       <div className="font-medium text-sm">{venueData.contactInfo.email}</div>
//                     </div>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       </div>


//       <Footer />
//     </div>
//     </div>
//   );
// }