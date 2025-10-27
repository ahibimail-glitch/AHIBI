
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
  Loader2
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
  };
  contactInfo: {
    phone: string;
    email?: string;
    website?: string;
  };
  capacity: number;
  facilities: {
    [key: string]: boolean;
  };
  pricing: {
    basePrice: number;
    hourlyRate?: number;
    fullDayRate?: number;
    cleaningFee?: number;
    securityDeposit?: number;
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
  terms?: {
    cancellationPolicy?: string;
    additionalRules?: string;
  };
}

interface Booking {
  _id: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: string;
}

// Mock images for the carousel - replace with actual venue images
// Generate time options for dropdowns (e.g., 9:00 AM to 9:00 PM)
const generateTimeOptions = () => {
  const times = [];
  for (let i = 0; i < 24; i++) {
    const time = `${String(i).padStart(2, '0')}:00`;
    const h = i % 12 || 12;
    const ampm = i < 12 ? 'AM' : 'PM';
    times.push({ value: time, label: `${h}:00 ${ampm}` });
  }
  return times;
};

const availableTimes = generateTimeOptions();

const venueImages = [
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2098&q=80",
  "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80",
  "https://images.unsplash.com/photo-1511578314322-379afb476865?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80",
  "https://images.unsplash.com/photo-1478146896981-b80fe463b330?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
];

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
  inHouseCatering: Gift,
  stage: Award,
  powerBackup: Zap,
  accommodation: Home,
  airConditioned: Snowflake,
};

export default function VenueDetailPage() {
  const params = useParams();
  const venueId = params.id as string;
  const [venueData, setVenueData] = useState<VenueData | null>(null);
  const [resolvedVenueId, setResolvedVenueId] = useState<string | null>(null);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [finalBookingDetails, setFinalBookingDetails] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
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
      const images = venueData?.gallery && venueData.gallery.length > 0 ? venueData.gallery : venueImages;
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
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

  // Helper function to format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const nextImage = () => {
    const images = venueData?.gallery && venueData.gallery.length > 0 ? venueData.gallery : venueImages;
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    const images = venueData?.gallery && venueData.gallery.length > 0 ? venueData.gallery : venueImages;
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
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
    a.download = `${venueData?.name.replace(/\s+/g, '-')}-Invoice-${finalBookingDetails._id}.txt`;
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

  const displayImages = venueData && venueData.gallery && venueData.gallery.length > 0
    ? venueData.gallery.map(g => g.url)
    : venueImages;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {isVerifying && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-[100]">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white"></div>
          <p className="text-white text-lg mt-4">Verifying payment, please wait...</p>
        </div>
      )}


      {/* Navbar Section */}
      <div className="bg-transparent fixed w-full z-50">

        <Navbar />
      </div>

      {/* Hero Section with Image Carousel */}
      <div className="relative h-[60vh] md:h-[70vh] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={displayImages[currentImageIndex]}
            alt={venueData?.name}
            className="w-full h-full object-cover transition-opacity duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
        </div>

        {displayImages.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm transition-all duration-200"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm transition-all duration-200"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {displayImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-200 ${
                    index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Hero Content */}
        <div className="absolute inset-0 flex items-center justify-center text-center px-4">
          <div className="max-w-4xl">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 drop-shadow-lg">
              {venueData?.name}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-6 drop-shadow-md">
              {venueData?.address.city}, {venueData?.address.state}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
              <div className="flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <Star className="h-5 w-5 text-yellow-400 mr-2" />
                <span className="text-white font-medium">{venueData?.rating.average || 0} Rating</span>
              </div>
              <div className="flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <Users className="h-5 w-5 text-white mr-2" />
                <span className="text-white font-medium">Up to {venueData?.capacity} Guests</span>
              </div>
              <div className="flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <Award className="h-5 w-5 text-white mr-2" />
                <span className="text-white font-medium">{venueData?.totalBookings} Bookings</span>
              </div>
            </div>
          </div>
        </div>
      </div>


      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="xl:col-span-2 space-y-8">
            {/* Quick Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-6 text-center">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <MapPin className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">Prime Location</h3>
                  <p className="text-sm text-gray-600">{venueData?.address.city}, {venueData?.address.state}</p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-6 text-center">
                  <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">Capacity</h3>
                  <p className="text-sm text-gray-600">Up to {venueData?.capacity} guests</p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-6 text-center">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Clock className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">Rating</h3>
                  <p className="text-sm text-gray-600">{venueData?.rating.average || 0} / 5.0</p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-6 text-center">
                  <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Zap className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">Price</h3>
                  <p className="text-sm text-gray-600">₹{venueData?.pricing.hourlyRate || venueData?.pricing.basePrice}/hour</p>
                </CardContent>
              </Card>
            </div>

            {/* Venue Details */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl font-bold text-gray-800 flex items-center">
                  <MapPin className="h-6 w-6 mr-3 text-purple-600" />
                  Venue Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl">
                  <Label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Description</Label>
                  <p className="text-lg text-gray-800 mt-2">{venueData?.description}</p>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl">
                  <Label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Address</Label>
                  <p className="text-lg text-gray-800 mt-2">
                    {venueData?.address.street}, {venueData?.address.city}, {venueData?.address.state} - {venueData?.address.pincode}
                  </p>
                  {venueData?.address.landmark && (
                    <p className="text-sm text-gray-600 mt-1">Landmark: {venueData.address.landmark}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <Label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Contact</Label>
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-4 w-4 mr-2 text-green-600" />
                        <span>{venueData?.contactInfo.phone}</span>
                      </div>
                      {venueData?.contactInfo.email && (
                        <div className="flex items-center text-gray-600">
                          <Mail className="h-4 w-4 mr-2 text-blue-600" />
                          <span>{venueData.contactInfo.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                    <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Max Capacity</Label>
                    <p className="text-xl font-bold text-gray-800">{venueData?.capacity}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Facilities */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-800 flex items-center">
                  <Shield className="h-6 w-6 mr-3 text-green-600" />
                  Facilities & Amenities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries((venueData?.facilities ?? {}) as Record<string, boolean>).map(([key, value]) => {
                    const IconComponent = facilityIcons[key as keyof typeof facilityIcons];
                    return (
                      <div key={key} className={`p-4 rounded-xl transition-all duration-200 ${value ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200' : 'bg-gray-50 opacity-60'
                        }`}>
                        <div className="flex items-center space-x-3">
                          {value ? (
                            <div className="p-2 bg-green-500 rounded-lg">
                              <IconComponent className="h-5 w-5 text-white" />
                            </div>
                          ) : (
                            <div className="p-2 bg-gray-400 rounded-lg">
                              <XCircle className="h-5 w-5 text-white" />
                            </div>
                          )}
                          <div>
                            <span className={`font-medium ${value ? 'text-gray-800' : 'text-gray-500'}`}>
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            {value && <CheckCircle className="h-4 w-4 text-green-500 inline ml-2" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Terms & Conditions */}
            {venueData?.terms && (venueData.terms.cancellationPolicy || venueData.terms.additionalRules) && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-gray-800 flex items-center">
                    <Heart className="h-6 w-6 mr-3 text-red-600" />
                    Terms & Policies
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {venueData?.terms.cancellationPolicy && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <Label className="text-sm font-semibold text-blue-800 uppercase tracking-wide">
                        Cancellation Policy
                      </Label>
                      <p className="text-gray-700 mt-2">{venueData.terms.cancellationPolicy}</p>
                    </div>
                  )}

                  {venueData?.terms.additionalRules && (
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <Label className="text-sm font-semibold text-purple-800 uppercase tracking-wide">
                        Additional Rules
                      </Label>
                      <p className="text-gray-700 mt-2">{venueData.terms.additionalRules}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Booking Sidebar */}
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
                      const unavailableDates = getUnavailableDates();
                      return unavailableDates.some(unavailableDate =>
                        date.toDateString() === unavailableDate.toDateString()
                      ) || date < new Date(new Date().setHours(0, 0, 0, 0));
                    }}
                    modifiers={{
                      unavailable: getUnavailableDates(),
                      past: date => date < new Date(new Date().setHours(0, 0, 0, 0)),
                      available: date => date >= new Date(new Date().setHours(0, 0, 0, 0)) && !getUnavailableDates().some(unavailableDate => unavailableDate.toDateString() === date.toDateString()),
                    }}
                    modifiersClassNames={{
                      unavailable: 'bg-red-200 text-red-900 cursor-not-allowed opacity-60',
                      past: 'text-gray-400 cursor-not-allowed opacity-50',
                      available: 'text-green-600',
                      today: '',
                    }}
                    className="rounded-md"
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-gray-600">Unavailable</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">Available</span>
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
                              {availableTimes.map((time) => (
                                <SelectItem key={time.value} value={time.value}>
                                  {time.label}
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
                              {availableTimes.map((time) => (
                                <SelectItem key={time.value} value={time.value}>
                                  {time.label}
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
      </div>


      <Footer />
    </div>
  );
}