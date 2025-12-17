
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

// Portfolio Section Component
function PortfolioSection({ venueData, displayImages }: { venueData: VenueData | null, displayImages: string[] }) {
  const [showAllVenueImages, setShowAllVenueImages] = useState(false);
  const [showAllMenuCards, setShowAllMenuCards] = useState(false);

  const venueImages = venueData?.documents?.venueImages || venueData?.gallery || [];
  const menuCards = venueData?.documents?.menuCards || [];
  const videoTour = venueData?.documents?.venueVideoTour?.url;

  const displayVenueImages = showAllVenueImages ? venueImages : venueImages.slice(0, 3);
  const displayMenuCards = showAllMenuCards ? menuCards : menuCards.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Venue Images Section */}
      {venueImages.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Venue Images</h3>
          <div className="grid grid-cols-3 gap-3">
            {displayVenueImages.map((image: any, index: number) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group">
                <img
                  src={image.url || image}
                  alt={`${venueData?.name} ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
          {venueImages.length > 3 && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowAllVenueImages(!showAllVenueImages)}
            >
              {showAllVenueImages ? 'Show Less' : `View More (${venueImages.length - 3} more)`}
            </Button>
          )}
        </div>
      )}

      {/* Menu Cards Section */}
      {menuCards.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Menu</h3>
          <div className="grid grid-cols-3 gap-3">
            {displayMenuCards.map((menu: any, index: number) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group">
                {menu.url?.endsWith('.pdf') ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 group-hover:bg-gray-200 transition-colors">
                    <UtensilsCrossed className="h-16 w-16 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600 text-center px-2">{menu.name || 'Menu Card'}</span>
                  </div>
                ) : (
                  <img
                    src={menu.url}
                    alt={menu.name || `Menu ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                )}
              </div>
            ))}
          </div>
          {menuCards.length > 3 && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowAllMenuCards(!showAllMenuCards)}
            >
              {showAllMenuCards ? 'Show Less' : `View More (${menuCards.length - 3} more)`}
            </Button>
          )}
        </div>
      )}

      {/* Video Tour Section */}
      {videoTour && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Video Tour</h3>
          <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
            <video
              src={videoTour}
              controls
              className="w-full h-full object-cover"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}

      {/* Fallback if no portfolio items */}
      {venueImages.length === 0 && menuCards.length === 0 && !videoTour && displayImages.length > 0 && (
        <div>
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
        </div>
      )}
    </div>
  );
}

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

    const dur = fullDaySelected ? 24 : getDurationHours(bookingForm.startTime, bookingForm.endTime);
    if (dur <= 0) return 0;

    let variable = 0;
    if (fullDaySelected && typeof fullDay === 'number') {
      variable = fullDay;
    } else if (dur > 12) {
      if (typeof halfDay === 'number' && halfDay > 0) {
        variable = halfDay;
      } else {
        const derivedHalf = Math.min(
          typeof fullDay === 'number' ? fullDay / 2 : Number.POSITIVE_INFINITY,
          hourly > 0 ? hourly * 12 : Number.POSITIVE_INFINITY
        );
        variable = Number.isFinite(derivedHalf) ? derivedHalf : (hourly > 0 ? hourly * 12 : 0);
      }
    } else {
      variable = hourly * dur;
    }

    const total = base + variable + cleaning;
    return Math.max(0, Math.round(total));
  };

  useEffect(() => {
    setEstimatedPrice(computeEstimatedPrice());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingForm.startTime, bookingForm.endTime, fullDaySelected, venueData]);

  // Helper: get Half Day Rate for display (explicit or derived)
  const getHalfDayRate = () => {
    const hourly = venueData?.pricing?.hourlyRate;
    const fullDay = venueData?.pricing?.fullDayRate;
    const half = venueData?.pricing?.halfDayRate;
    if (typeof half === 'number' && half > 0) return half;
    const candidates: number[] = [];
    if (typeof fullDay === 'number' && fullDay > 0) candidates.push(fullDay / 2);
    if (typeof hourly === 'number' && hourly > 0) candidates.push(hourly * 12);
    if (candidates.length === 0) return undefined;
    return Math.min(...candidates);
  };

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

    // Add confirmed bookings
    bookings.forEach(booking => {
      // Only mark dates as unavailable for confirmed bookings
      if (booking.status === 'confirmed') {
        unavailableDates.push(new Date(booking.bookingDate));
      }
    });

    // Add blocked dates (full day blocks)
    if (venueData?.blockedSlots) {
      venueData.blockedSlots.forEach((slot: any) => {
        if (slot.isFullDayBlocked) {
          unavailableDates.push(new Date(slot.date));
        }
      });
    }

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
    // guestCount will be auto-populated below

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      {isVerifying && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-[100]">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600"></div>
            <p className="text-gray-800 text-lg mt-4 font-medium">Verifying payment...</p>
            <p className="text-gray-500 text-sm mt-1">Please wait a moment</p>
          </div>
        </div>
      )}

      {/* Navbar Section */}
      <Navbar />

      {/* Main Content Section - Premium Light Theme */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Main Image and Venue Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Large Image */}
            <div className="relative w-full h-[300px] sm:h-[400px] lg:h-[550px] rounded-2xl overflow-hidden shadow-2xl group">
              {displayImages.length > 0 ? (
                <>
                  <img
                    src={displayImages[currentImageIndex % displayImages.length]}
                    alt={venueData?.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Image Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                  {/* Image Counter Badge */}
                  <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    {currentImageIndex + 1} / {displayImages.length}
                  </div>

                  {displayImages.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white rounded-full p-2 sm:p-3 shadow-xl transition-all duration-300 hover:scale-110 backdrop-blur-sm"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 text-gray-800" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white rounded-full p-2 sm:p-3 shadow-xl transition-all duration-300 hover:scale-110 backdrop-blur-sm"
                        aria-label="Next image"
                      >
                        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-gray-800" />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center text-gray-400">
                  <ImageIcon className="h-16 w-16 mb-3" />
                  <p className="text-lg font-medium">No images available</p>
                </div>
              )}
            </div>

            {/* Venue Header Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 space-y-6">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 leading-tight">
                  {venueData?.name}
                </h1>
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="h-5 w-5 mt-0.5 text-purple-600 flex-shrink-0" />
                  <span className="text-base sm:text-lg">
                    {venueData?.address.street}, {venueData?.address.city}, {venueData?.address.state}
                  </span>
                </div>
              </div>

              {/* Rating and Stats */}
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl shadow-md">
                    <Star className="h-5 w-5 fill-white" />
                    <span className="font-bold text-lg">{(venueData?.rating.average ?? 5.0).toFixed(1)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{(venueData?.rating.count ?? 6)} Reviews</p>
                    <p className="text-xs text-gray-500">Verified ratings</p>
                  </div>
                </div>

                <div className="h-10 w-px bg-gray-300 hidden sm:block"></div>

                <div className="flex items-center gap-2">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Up to {venueData?.capacity}</p>
                    <p className="text-xs text-gray-500">Guest capacity</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Award className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{venueData?.totalBookings || 0}+ Bookings</p>
                    <p className="text-xs text-gray-500">Successfully hosted</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 flex-wrap pt-2">
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6">
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save Venue
                </Button>
                <Button variant="outline" className="border-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 transition-all duration-300 px-6">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  View Gallery
                </Button>
                <Button variant="outline" className="border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 px-6">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>

            {/* Tabs Section */}
            <Tabs defaultValue="portfolio" className="w-full bg-white rounded-2xl shadow-lg overflow-hidden">
              <TabsList className="border-b-2 border-gray-100 bg-gradient-to-r from-gray-50 to-white h-auto p-0 w-full justify-start">
                <TabsTrigger
                  value="portfolio"
                  className="px-6 py-4 data-[state=active]:border-b-4 data-[state=active]:border-purple-600 data-[state=active]:text-purple-700 data-[state=active]:bg-purple-50/50 rounded-none font-semibold transition-all duration-300 hover:bg-gray-50"
                >
                  Portfolio
                </TabsTrigger>
                <TabsTrigger
                  value="about"
                  className="px-6 py-4 data-[state=active]:border-b-4 data-[state=active]:border-purple-600 data-[state=active]:text-purple-700 data-[state=active]:bg-purple-50/50 rounded-none font-semibold transition-all duration-300 hover:bg-gray-50"
                >
                  About
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="px-6 py-4 data-[state=active]:border-b-4 data-[state=active]:border-purple-600 data-[state=active]:text-purple-700 data-[state=active]:bg-purple-50/50 rounded-none font-semibold transition-all duration-300 hover:bg-gray-50"
                >
                  Reviews
                </TabsTrigger>
                <TabsTrigger
                  value="faq"
                  className="px-6 py-4 data-[state=active]:border-b-4 data-[state=active]:border-purple-600 data-[state=active]:text-purple-700 data-[state=active]:bg-purple-50/50 rounded-none font-semibold transition-all duration-300 hover:bg-gray-50"
                >
                  FAQ
                </TabsTrigger>
              </TabsList>

              {/* Portfolio Tab */}
              <TabsContent value="portfolio" className="p-6 sm:p-8">
                <PortfolioSection venueData={venueData} displayImages={displayImages} />
              </TabsContent>

              {/* About Tab */}
              <TabsContent value="about" className="p-6 sm:p-8">
                <div className="space-y-8">
                  {/* About the Venue */}
                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <Building2 className="h-7 w-7 text-purple-600" />
                      About {venueData?.name}
                    </h2>
                    <p className="text-gray-700 leading-relaxed text-base sm:text-lg">{venueData?.description || "This beautiful venue offers a perfect setting for your special events."}</p>
                  </div>

                  {/* Venue Classification */}
                  {venueData?.venueClassification && (
                    <div className="bg-white border-2 border-gray-100 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
                      <h3 className="font-bold text-xl mb-5 text-gray-900 flex items-center gap-2">
                        <Award className="h-6 w-6 text-purple-600" />
                        Venue Type & Classification
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Venue Type</p>
                          <div className="flex flex-wrap gap-2">
                            {venueData.venueClassification.venueTypes?.map((type, idx) => (
                              <Badge key={idx} className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-1 text-sm font-medium">
                                {type?.replace?.(/_/g, ' ') || 'N/A'}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Setting</p>
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 px-3 py-1.5 text-sm font-medium">
                            {venueData.venueClassification.indoorOutdoor}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Operation</p>
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 px-3 py-1.5 text-sm font-medium">
                            {venueData.venueClassification.operationMode?.replace?.(/_/g, ' ') || 'N/A'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Capacity Details */}
                  <div>
                    <h3 className="font-bold text-xl mb-5 text-gray-900 flex items-center gap-2">
                      <Users className="h-6 w-6 text-purple-600" />
                      Capacity Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <div className="bg-purple-600 w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-md">
                          <Users className="h-7 w-7 text-white" />
                        </div>
                        <p className="text-sm font-medium text-purple-700 mb-1 uppercase tracking-wide">Standing Capacity</p>
                        <p className="text-3xl font-bold text-gray-900">{venueData?.capacityDetails?.standingCapacity || venueData?.capacity}</p>
                      </div>
                      {venueData?.capacityDetails?.seatingCapacity?.theatreStyle && (
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                          <div className="bg-blue-600 w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-md">
                            <Users className="h-7 w-7 text-white" />
                          </div>
                          <p className="text-sm font-medium text-blue-700 mb-1 uppercase tracking-wide">Theatre Style</p>
                          <p className="text-3xl font-bold text-gray-900">{venueData.capacityDetails.seatingCapacity.theatreStyle}</p>
                        </div>
                      )}
                      {venueData?.capacityDetails?.seatingCapacity?.roundTable && (
                        <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                          <div className="bg-green-600 w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-md">
                            <Users className="h-7 w-7 text-white" />
                          </div>
                          <p className="text-sm font-medium text-green-700 mb-1 uppercase tracking-wide">Round Table</p>
                          <p className="text-3xl font-bold text-gray-900">{venueData.capacityDetails.seatingCapacity.roundTable}</p>
                        </div>
                      )}
                    </div>
                    {venueData?.capacityDetails?.minimumBookingCapacity && (
                      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-amber-800">
                          <span className="font-bold">Minimum booking:</span> {venueData.capacityDetails.minimumBookingCapacity} guests required
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Amenities & Facilities */}
                  <div>
                    <h3 className="font-bold text-xl mb-5 text-gray-900 flex items-center gap-2">
                      <Check className="h-6 w-6 text-purple-600" />
                      Amenities & Facilities
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {venueData?.amenities && Object.entries(venueData.amenities)
                        .filter(([_, value]) => value.available)
                        .map(([key, value]) => {
                          const IconComponent = facilityIcons[key] || Check;
                          return (
                            <div key={key} className="flex items-start gap-4 p-4 bg-white border-2 border-gray-100 rounded-xl hover:border-purple-200 hover:shadow-md transition-all duration-300">
                              <div className="p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl shrink-0 shadow-sm">
                                <IconComponent className="h-6 w-6 text-green-700" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-900 break-words leading-tight">
                                  {key?.replace?.(/([A-Z])/g, ' $1').trim() || 'N/A'}
                                </p>
                                {value.description && (
                                  <p className="text-xs text-gray-600 mt-1.5 break-words leading-relaxed">{value.description}</p>
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
                            <div key={key} className="flex items-center gap-4 p-4 bg-white border-2 border-gray-100 rounded-xl hover:border-purple-200 hover:shadow-md transition-all duration-300">
                              <div className="p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl shadow-sm">
                                <IconComponent className="h-6 w-6 text-green-700" />
                              </div>
                              <span className="text-sm font-semibold text-gray-900">
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
                  <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 rounded-2xl p-8 shadow-2xl text-white">
                    <h3 className="font-bold text-2xl mb-6 flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                        <IndianRupee className="h-6 w-6" />
                      </div>
                      Pricing Information
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-4 border-b border-white/20">
                        <span className="text-purple-100 font-medium">Base Price</span>
                        <span className="font-bold text-2xl">₹ {(venueData?.pricing.basePrice || 0).toLocaleString('en-IN')}</span>
                      </div>
                      {venueData?.pricing.hourlyRate && (
                        <div className="flex justify-between items-center pb-4 border-b border-white/20">
                          <span className="text-purple-100 font-medium">Hourly Rate</span>
                          <span className="font-bold text-xl">₹ {venueData.pricing.hourlyRate.toLocaleString('en-IN')}<span className="text-sm font-normal">/hour</span></span>
                        </div>
                      )}
                      {getHalfDayRate() !== undefined && (
                        <div className="flex justify-between items-center pb-4 border-b border-white/20">
                          <span className="text-purple-100 font-medium">Half Day Rate</span>
                          <span className="font-bold text-xl">₹ {getHalfDayRate()!.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {venueData?.pricing.fullDayRate && (
                        <div className="flex justify-between items-center pb-4 border-b border-white/20">
                          <span className="text-purple-100 font-medium">Full Day Rate</span>
                          <span className="font-bold text-xl">₹ {venueData.pricing.fullDayRate.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {venueData?.pricing.securityDeposit && (
                        <div className="flex justify-between items-center pb-4 border-b border-white/20">
                          <span className="text-purple-100 font-medium">Security Deposit</span>
                          <span className="font-bold text-xl">₹ {venueData.pricing.securityDeposit.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {venueData?.pricing.rentalIncludes && venueData.pricing.rentalIncludes.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-white/20">
                          <p className="text-sm font-semibold text-purple-100 mb-3 uppercase tracking-wide">Rental Includes:</p>
                          <div className="flex flex-wrap gap-2">
                            {venueData.pricing.rentalIncludes?.map((item, idx) => (
                              <Badge key={idx} className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border-white/30 px-3 py-1">
                                {item?.replace?.(/_/g, ' ') || 'N/A'}
                              </Badge>
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
              <TabsContent value="reviews" className="p-6 sm:p-8">
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
              <TabsContent value="faq" className="p-6 sm:p-8">
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

            <Card className="bg-white border-2 border-purple-100 shadow-xl rounded-2xl overflow-hidden top-6">
              <CardHeader className="pb-4 border-b-2 border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <div className="bg-purple-600 p-2 rounded-lg">
                    <CalendarIcon className="h-5 w-5 text-white" />
                  </div>
                  Check Availability
                </CardTitle>
                <CardDescription className="text-sm text-gray-600 font-medium mt-2">
                  Select a date to see booking availability
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                {/* Calendar Wrapper */}
                <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
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
                    className="rounded-md bg-white"
                  />
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                  <LegendDot color="bg-emerald-500" label="Available" />
                  <LegendDot color="bg-amber-500" label="Partially Booked" />
                  <LegendDot color="bg-yellow-500" label="Partially Blocked" />
                  <LegendDot color="bg-red-500" label="Fully Blocked" />
                  <LegendDot color="bg-gray-400" label="Past Dates" />
                </div>

                {/* Info Note */}
                <p className="text-xs text-gray-500 text-center leading-relaxed">
                  Blocked dates are unavailable for online booking due to
                  offline reservations or venue maintenance.
                </p>
              </CardContent>
            </Card>


            {/* Booking Section */}
            {selectedDate && (
              <Card className="bg-white border-2 border-purple-100 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-gray-100">
                  <CardTitle className="text-2xl font-bold text-gray-900">Book {venueData?.name}</CardTitle>
                  <CardDescription className="text-purple-700 font-semibold text-base mt-2 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {format(selectedDate, 'PPP')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {bookingSuccess ? (
                    <div className="text-center p-8 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl">
                      <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <CheckCircle className="h-12 w-12 text-green-600" />
                      </div>
                      <h3 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h3>
                      <p className="text-gray-600 text-lg mb-8">Your invoice has been generated successfully.</p>

                      <div className="text-left space-y-3 text-gray-700 mb-8 bg-white p-6 rounded-xl border-2 border-green-200 shadow-md">
                        <div className="flex justify-between items-center pb-3 border-b">
                          <span className="font-medium text-gray-600">Booking ID:</span>
                          <span className="font-bold text-gray-900">{finalBookingDetails?._id}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b">
                          <span className="font-medium text-gray-600">Date:</span>
                          <span className="font-bold text-gray-900">{format(new Date(finalBookingDetails?.bookingDate), 'PPP')}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b">
                          <span className="font-medium text-gray-600">Time:</span>
                          <span className="font-bold text-gray-900">{finalBookingDetails?.startTime} - {finalBookingDetails?.endTime}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b">
                          <span className="font-medium text-gray-600">Guests:</span>
                          <span className="font-bold text-gray-900">{finalBookingDetails?.guestCount}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <span className="font-semibold text-gray-700 text-lg">Total Paid:</span>
                          <span className="font-bold text-green-600 text-2xl">₹{finalBookingDetails?.pricing?.totalAmount?.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      <Button
                        onClick={handleDownloadInvoice}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg"
                      >
                        <Download className="h-5 w-5 mr-2" />
                        Download Invoice
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <form onSubmit={handleBookingSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="startTime">Start Time *</Label>
                            <Select
                              onValueChange={(value) => setBookingForm({ ...bookingForm, startTime: value })}
                              value={bookingForm.startTime}
                              disabled={fullDaySelected}
                            >
                              <SelectTrigger id="startTime">
                                <SelectValue placeholder={fullDaySelected ? "Set to 12:00 AM" : "Select start time"} />
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableTimeOptions().map((time) => (
                                  <SelectItem
                                    key={time.value}
                                    value={time.value}
                                    disabled={time.disabled || fullDaySelected}
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
                              disabled={fullDaySelected}
                            >
                              <SelectTrigger id="endTime">
                                <SelectValue placeholder={fullDaySelected ? "Disabled for full-day" : "Select end time"} />
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableTimeOptions().map((time) => (
                                  <SelectItem
                                    key={time.value}
                                    value={time.value}
                                    disabled={time.disabled || fullDaySelected}
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
                            <p className="text-xs text-gray-500 mt-1">{fullDaySelected ? 'Full day selected – end time not required' : 'Select an end time after the start time'}</p>
                          </div>
                        </div>

                        {/* Full Day Toggle */}
                        <div className="flex items-center gap-2">
                          <input
                            id="fullDay"
                            type="checkbox"
                            checked={fullDaySelected}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFullDaySelected(checked);
                              if (checked) {
                                setBookingForm((prev) => ({ ...prev, startTime: '00:00', endTime: '23:00' }));
                              }
                            }}
                            className="h-4 w-4"
                          />
                          <Label htmlFor="fullDay">Full Day Booking</Label>
                        </div>

                        <div>
                          <Label htmlFor="eventType">Event Type</Label>
                          <Input id="eventType" value={bookingForm.eventType} onChange={(e) => setBookingForm({ ...bookingForm, eventType: e.target.value })} placeholder="e.g., Wedding, Conference, Party" />
                        </div>
                        <div>
                          <Label htmlFor="specialRequirements">Special Requirements</Label>
                          <Textarea id="specialRequirements" value={bookingForm.specialRequirements} onChange={(e) => setBookingForm({ ...bookingForm, specialRequirements: e.target.value })} placeholder="Any special requests or requirements..." />
                        </div>

                        {/* Estimated Price Summary */}
                        <div className="bg-gray-50 border rounded p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700 font-medium">Estimated Price</span>
                            <span className="text-gray-900 font-semibold">₹ {estimatedPrice.toLocaleString('en-IN')}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Pricing = Base + {fullDaySelected ? 'Full-day' : (getDurationHours(bookingForm.startTime, bookingForm.endTime) > 12 ? 'Half-day (derived)' : 'Hourly × duration')} {venueData?.pricing?.cleaningFee ? '+ Cleaning fee' : ''}
                          </p>
                        </div>

                        {formError && (
                          <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg">
                            <span className="font-medium">Error:</span> {formError}
                          </div>
                        )}

                        <Button
                          type="submit"
                          className="w-full bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 hover:from-purple-700 hover:via-purple-600 hover:to-pink-700 text-white font-bold py-4 text-lg rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                          disabled={submitting || authLoading}
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <IndianRupee className="h-5 w-5 mr-2" />
                              Book and Pay Now
                            </>
                          )}
                        </Button>
                      </form>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!selectedDate && (
              <Card className="bg-white border-2 border-purple-100 shadow-xl rounded-2xl overflow-hidden">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 p-10 rounded-2xl">
                      <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <CalendarIcon className="h-10 w-10 text-purple-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">Select a Date</h3>
                      <p className="text-gray-600 text-base leading-relaxed max-w-sm mx-auto">
                        Choose an available date from the calendar above to start your booking process
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact Card */}
            <Card className="bg-gradient-to-br from-purple-600 via-purple-500 to-pink-600 text-white border-0 shadow-2xl rounded-2xl overflow-hidden">
              <CardContent className="p-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6">
                  <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <MessageCircle className="h-6 w-6" />
                    Need Help?
                  </h3>
                  <p className="text-purple-100 text-sm">We're here to assist you</p>
                </div>
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm p-4 rounded-xl">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Phone className="h-5 w-5" />
                    </div>
                    <span className="text-base font-medium">{venueData?.contactInfo.phone}</span>
                  </div>
                  {venueData?.contactInfo.email && (
                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm p-4 rounded-xl">
                      <div className="bg-white/20 p-2 rounded-lg">
                        <Mail className="h-5 w-5" />
                      </div>
                      <span className="text-base font-medium break-all">{venueData.contactInfo.email}</span>
                    </div>
                  )}
                </div>
                <Button className="w-full bg-white text-purple-600 hover:bg-gray-50 font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
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
