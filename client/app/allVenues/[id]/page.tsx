
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
  const [showMobileBooking, setShowMobileBooking] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

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

  // Touch swipe handlers for mobile gallery
  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const images = extractVenueImages(venueData);
    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0 && images.length > 0) {
        setActiveImageIndex((prev) => (prev + 1) % images.length);
      } else if (images.length > 0) {
        setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
      }
    }
  };

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
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
      {isVerifying && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-[100]">
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl flex flex-col items-center mx-4">
            <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-purple-200 border-t-purple-600"></div>
            <p className="text-gray-800 text-base sm:text-lg mt-4 font-medium">Verifying payment...</p>
            <p className="text-gray-500 text-sm mt-1">Please wait a moment</p>
          </div>
        </div>
      )}

      {/* Mobile Booking Bottom Sheet */}
      {showMobileBooking && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileBooking(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 bg-white pt-3 pb-2 px-4 border-b z-10">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Book {venueData?.name}</h3>
                <button onClick={() => setShowMobileBooking(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-4 pb-8">
              {bookingSuccess ? (
                <div className="text-center py-6">
                  <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Booking Confirmed!</h3>
                  <div className="text-left space-y-2 text-sm bg-green-50 p-4 rounded-xl mt-4 mb-4">
                    <div className="flex justify-between"><span className="text-gray-500">Date:</span><span className="font-medium">{finalBookingDetails?.bookingDate && format(new Date(finalBookingDetails.bookingDate), 'PP')}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Time:</span><span className="font-medium">{finalBookingDetails?.startTime} - {finalBookingDetails?.endTime}</span></div>
                    <div className="flex justify-between pt-2 border-t border-green-200"><span className="font-medium">Total Paid:</span><span className="font-bold text-green-600 text-lg">₹{finalBookingDetails?.pricing?.totalAmount?.toLocaleString('en-IN')}</span></div>
                  </div>
                  <Button onClick={() => { handleDownloadInvoice(); setShowMobileBooking(false); }} className="w-full bg-green-600 hover:bg-green-700">
                    <Download className="h-4 w-4 mr-2" />Download Invoice
                  </Button>
                </div>
              ) : (
                <>
                  {/* Step 1: Select Date */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-purple-600" />
                      Select Date
                    </h4>
                    <div className="border border-gray-200 rounded-xl p-2 bg-gray-50">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || (venueData?.blockedSlots?.some((slot: any) => new Date(slot.date).toDateString() === date.toDateString() && slot.isFullDayBlocked) || false)}
                        className="rounded-md bg-white w-full"
                      />
                    </div>
                  </div>

                  {/* Step 2: Select Time */}
                  {selectedDate && (
                    <div className="space-y-3 pt-2">
                      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-600" />
                        Select Time for {format(selectedDate, 'PP')}
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Start Time *</Label>
                          <Select
                            value={bookingForm.startTime}
                            onValueChange={(value) =>
                              setBookingForm({ ...bookingForm, startTime: value })
                            }
                            disabled={fullDaySelected}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Start" />
                            </SelectTrigger>

                            <SelectContent
                              position="popper"
                              side="bottom"
                              align="start"
                              sideOffset={6}
                              avoidCollisions
                              className="max-h-[50vh] overflow-y-auto z-[600]"
                            >
                              {getAvailableTimeOptions().map((time) => (
                                <SelectItem
                                  key={time.value}
                                  value={time.value}
                                  disabled={time.disabled || fullDaySelected}
                                >
                                  {time.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                        </div>
                        <div>
                          <Label className="text-xs">End Time *</Label>

                          <Select
                            value={bookingForm.endTime}
                            onValueChange={(value) =>
                              setBookingForm({ ...bookingForm, endTime: value })
                            }
                            disabled={fullDaySelected}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="End" />
                            </SelectTrigger>

                            <SelectContent
                              position="popper"
                              side="bottom"
                              align="start"
                              sideOffset={6}
                              avoidCollisions
                              className="max-h-[50vh] overflow-y-auto z-[600]"
                            >
                              {getAvailableTimeOptions().map((time) => (
                                <SelectItem
                                  key={time.value}
                                  value={time.value}
                                  disabled={time.disabled || fullDaySelected}
                                >
                                  {time.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                        <input id="fullDayMobile" type="checkbox" checked={fullDaySelected} onChange={(e) => { setFullDaySelected(e.target.checked); if (e.target.checked) setBookingForm((prev) => ({ ...prev, startTime: '00:00', endTime: '23:00' })); }} className="h-4 w-4" />
                        <Label htmlFor="fullDayMobile" className="text-sm">Book Full Day</Label>
                      </div>
                      <div>
                        <Label className="text-xs">Event Type (Optional)</Label>
                        <Input value={bookingForm.eventType} onChange={(e) => setBookingForm({ ...bookingForm, eventType: e.target.value })} placeholder="Wedding, Party, Conference..." className="h-10" />
                      </div>
                    </div>
                  )}

                  {/* Price Summary & Book Button */}
                  {selectedDate && (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600">Estimated Total</span>
                          <span className="text-2xl font-bold text-purple-700">₹{estimatedPrice.toLocaleString('en-IN')}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {fullDaySelected ? 'Full day rate' : `${getDurationHours(bookingForm.startTime, bookingForm.endTime) || 0} hrs × hourly rate`}
                        </p>
                      </div>
                      {formError && <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg">{formError}</div>}
                      <Button
                        onClick={handleBookingSubmit}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl text-base"
                        disabled={submitting || authLoading || !bookingForm.startTime || (!fullDaySelected && !bookingForm.endTime)}
                      >
                        {submitting ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Processing...</> : <><IndianRupee className="h-5 w-5 mr-2" />Book & Pay ₹{estimatedPrice.toLocaleString('en-IN')}</>}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navbar Section */}
      <Navbar />

      {/* Main Content Section - Mobile First Design */}
      <div className="lg:container lg:mx-auto lg:px-4 lg:py-6 lg:max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-6">
          {/* Left Panel - Main Image and Venue Details */}
          <div className="lg:col-span-2 space-y-0 lg:space-y-6">
            {/* Hero Image - Full Width on Mobile with Swipe */}
            <div
              className="relative w-full h-[280px] sm:h-[350px] lg:h-[500px] lg:rounded-2xl overflow-hidden shadow-lg group"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {displayImages.length > 0 ? (
                <>
                  <img
                    src={displayImages[activeImageIndex % displayImages.length]}
                    alt={venueData?.name}
                    className="w-full h-full object-cover transition-transform duration-500"
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

                  {/* Top Actions - Floating */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                    <button
                      onClick={() => router.back()}
                      className="lg:hidden bg-black/40 backdrop-blur-md text-white p-2.5 rounded-full"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-2 ml-auto">
                      <button className="bg-black/40 backdrop-blur-md text-white p-2.5 rounded-full">
                        <Share2 className="h-4 w-4" />
                      </button>
                      <button className="bg-black/40 backdrop-blur-md text-white p-2.5 rounded-full">
                        <Bookmark className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Image Counter - Bottom Right */}
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" />
                    {activeImageIndex + 1}/{displayImages.length}
                  </div>

                  {/* Swipe Dots Indicator - Mobile */}
                  {displayImages.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 lg:hidden">
                      {displayImages.slice(0, Math.min(displayImages.length, 5)).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImageIndex(idx)}
                          className={`h-1.5 rounded-full transition-all ${activeImageIndex === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`}
                        />
                      ))}
                      {displayImages.length > 5 && (
                        <span className="text-white/70 text-xs ml-1">+{displayImages.length - 5}</span>
                      )}
                    </div>
                  )}

                  {/* Desktop Navigation Arrows */}
                  {displayImages.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white rounded-full p-3 shadow-xl transition-all hover:scale-110"
                      >
                        <ChevronLeft className="h-5 w-5 text-gray-800" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white rounded-full p-3 shadow-xl transition-all hover:scale-110"
                      >
                        <ChevronRight className="h-5 w-5 text-gray-800" />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center text-gray-400">
                  <ImageIcon className="h-12 w-12 mb-2" />
                  <p className="text-sm font-medium">No images available</p>
                </div>
              )}
            </div>

            {/* Venue Header - Compact Mobile Card */}
            <div className="bg-white lg:rounded-2xl lg:shadow-lg p-4 sm:p-6 space-y-4">
              {/* Name & Location */}
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-gray-900 leading-tight">
                  {venueData?.name}
                </h1>
                <div className="flex items-center gap-1.5 mt-1.5 text-gray-500">
                  <MapPin className="h-4 w-4 text-purple-500 flex-shrink-0" />
                  <span className="text-sm line-clamp-1">
                    {venueData?.address.street}, {venueData?.address.city}
                  </span>
                </div>
              </div>

              {/* Quick Stats - Horizontal Scroll on Mobile */}
              <div className="flex items-center gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 lg:flex-wrap scrollbar-hide">
                {/* Rating Chip */}
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-2 rounded-xl flex-shrink-0">
                  <div className="flex items-center gap-1 text-green-700">
                    <Star className="h-4 w-4 fill-green-600 text-green-600" />
                    <span className="font-bold text-sm">{(venueData?.rating.average ?? 5.0).toFixed(1)}</span>
                  </div>
                  <span className="text-xs text-green-600">({venueData?.rating.count ?? 0} reviews)</span>
                </div>

                {/* Capacity Chip */}
                <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 px-3 py-2 rounded-xl flex-shrink-0">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">{venueData?.capacity} guests</span>
                </div>

                {/* Bookings Chip */}
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl flex-shrink-0">
                  <Award className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">{venueData?.totalBookings || 0}+ booked</span>
                </div>

                {/* Venue Type Chip */}
                {venueData?.venueClassification?.indoorOutdoor && (
                  <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-3 py-2 rounded-xl flex-shrink-0">
                    <Home className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">{venueData.venueClassification.indoorOutdoor}</span>
                  </div>
                )}
              </div>

              {/* Price Display - Mobile Prominent */}
              <div className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100 lg:hidden">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Starting from</p>
                  <p className="text-xl font-bold text-gray-900">
                    ₹{(venueData?.pricing.hourlyRate || venueData?.pricing.basePrice || 0).toLocaleString('en-IN')}
                    <span className="text-sm font-normal text-gray-500">/hr</span>
                  </p>
                </div>
                <Button
                  onClick={() => setShowMobileBooking(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg"
                >
                  Book Now
                </Button>
              </div>

              {/* Desktop Action Buttons */}
              <div className="hidden lg:flex items-center gap-3 pt-2">
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all px-6">
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save Venue
                </Button>
                <Button variant="outline" className="border-2 border-purple-200 text-purple-700 hover:bg-purple-50 px-6">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  View Gallery
                </Button>
                <Button variant="outline" className="border-2 border-gray-200 text-gray-700 hover:bg-gray-50 px-6">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>

            {/* Tabs Section - Mobile Optimized */}
            <Tabs defaultValue="about" className="w-full bg-white lg:rounded-2xl lg:shadow-lg overflow-hidden">
              <TabsList className="border-b border-gray-200 bg-white h-auto p-0 w-full justify-start overflow-x-auto scrollbar-hide">
                <TabsTrigger
                  value="about"
                  className="px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-700 data-[state=active]:bg-transparent rounded-none font-medium transition-all flex-shrink-0"
                >
                  About
                </TabsTrigger>
                <TabsTrigger
                  value="portfolio"
                  className="px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-700 data-[state=active]:bg-transparent rounded-none font-medium transition-all flex-shrink-0"
                >
                  Photos
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-700 data-[state=active]:bg-transparent rounded-none font-medium transition-all flex-shrink-0"
                >
                  Reviews
                </TabsTrigger>
                <TabsTrigger
                  value="faq"
                  className="px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-700 data-[state=active]:bg-transparent rounded-none font-medium transition-all flex-shrink-0"
                >
                  FAQ
                </TabsTrigger>
              </TabsList>

              {/* Portfolio Tab */}
              <TabsContent value="portfolio" className="p-4 sm:p-6">
                <PortfolioSection venueData={venueData} displayImages={displayImages} />
              </TabsContent>

              {/* About Tab */}
              <TabsContent value="about" className="p-4 sm:p-6">
                <div className="space-y-5 sm:space-y-6">
                  {/* About the Venue */}
                  <div className="bg-gradient-to-br from-purple-50/50 to-blue-50/50 rounded-xl p-4 sm:p-5 border border-purple-100/50">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-purple-600" />
                      About this venue
                    </h2>
                    <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{venueData?.description || "This beautiful venue offers a perfect setting for your special events."}</p>
                  </div>

                  {/* Venue Classification - Compact Mobile Grid */}
                  {venueData?.venueClassification && (
                    <div className="bg-white border border-gray-100 p-4 sm:p-5 rounded-xl">
                      <h3 className="font-semibold text-base sm:text-lg mb-3 text-gray-900 flex items-center gap-2">
                        <Award className="h-5 w-5 text-purple-600" />
                        Venue Type
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {venueData.venueClassification.venueTypes?.map((type, idx) => (
                          <Badge key={idx} className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 text-xs sm:text-sm font-medium">
                            {type?.replace?.(/_/g, ' ') || 'N/A'}
                          </Badge>
                        ))}
                        <Badge className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 text-xs sm:text-sm font-medium">
                          {venueData.venueClassification.indoorOutdoor}
                        </Badge>
                        <Badge className="bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 text-xs sm:text-sm font-medium">
                          {venueData.venueClassification.operationMode?.replace?.(/_/g, ' ') || 'N/A'}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Capacity Details - Compact Mobile Cards */}
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-3 text-gray-900 flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-600" />
                      Capacity
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 sm:p-4">
                        <div className="bg-purple-600 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mb-2">
                          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                        <p className="text-xs text-purple-600 font-medium">Standing</p>
                        <p className="text-lg sm:text-xl font-bold text-gray-900">{venueData?.capacityDetails?.standingCapacity || venueData?.capacity}</p>
                      </div>
                      {venueData?.capacityDetails?.seatingCapacity?.theatreStyle && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 sm:p-4">
                          <div className="bg-blue-600 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mb-2">
                            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                          </div>
                          <p className="text-xs text-blue-600 font-medium">Theatre</p>
                          <p className="text-lg sm:text-xl font-bold text-gray-900">{venueData.capacityDetails.seatingCapacity.theatreStyle}</p>
                        </div>
                      )}
                      {venueData?.capacityDetails?.seatingCapacity?.roundTable && (
                        <div className="bg-green-50 border border-green-100 rounded-xl p-3 sm:p-4">
                          <div className="bg-green-600 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mb-2">
                            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                          </div>
                          <p className="text-xs text-green-600 font-medium">Round Table</p>
                          <p className="text-lg sm:text-xl font-bold text-gray-900">{venueData.capacityDetails.seatingCapacity.roundTable}</p>
                        </div>
                      )}
                    </div>
                    {venueData?.capacityDetails?.minimumBookingCapacity && (
                      <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs sm:text-sm font-medium text-amber-800">
                          <span className="font-semibold">Min booking:</span> {venueData.capacityDetails.minimumBookingCapacity} guests
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Amenities & Facilities - Compact Grid */}
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-3 text-gray-900 flex items-center gap-2">
                      <Check className="h-5 w-5 text-purple-600" />
                      Amenities
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                      {venueData?.amenities && Object.entries(venueData.amenities)
                        .filter(([_, value]) => value.available)
                        .map(([key, value]) => {
                          const IconComponent = facilityIcons[key] || Check;
                          return (
                            <div key={key} className="flex items-center gap-2 p-2.5 sm:p-3 bg-gray-50 border border-gray-100 rounded-lg">
                              <div className="p-1.5 bg-green-100 rounded-lg shrink-0">
                                <IconComponent className="h-4 w-4 text-green-600" />
                              </div>
                              <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">
                                {key?.replace?.(/([A-Z])/g, ' $1').trim() || 'N/A'}
                              </span>
                            </div>
                          );
                        })}
                      {venueData?.facilities && Object.entries(venueData.facilities)
                        .filter(([_, value]) => value)
                        .map(([key]) => {
                          const IconComponent = facilityIcons[key] || Check;
                          return (
                            <div key={key} className="flex items-center gap-2 p-2.5 sm:p-3 bg-gray-50 border border-gray-100 rounded-lg">
                              <div className="p-1.5 bg-green-100 rounded-lg shrink-0">
                                <IconComponent className="h-4 w-4 text-green-600" />
                              </div>
                              <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">
                                {key?.replace?.(/([A-Z])/g, ' $1').trim() || 'N/A'}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Parking & Accessibility - Compact */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {venueData?.parking && (
                      <div className="border border-gray-100 rounded-xl p-3 sm:p-4">
                        <h3 className="font-semibold text-sm sm:text-base mb-2 text-gray-900 flex items-center gap-2">
                          <Car className="h-4 w-4 text-purple-600" />
                          Parking
                        </h3>
                        <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                          <p>Car: <span className="font-medium text-gray-900">{venueData.parking.carCapacity} vehicles</span></p>
                          <p>Two Wheeler: <span className="font-medium text-gray-900">{venueData.parking.twoWheelerAvailable ? 'Yes' : 'No'}</span></p>
                        </div>
                      </div>
                    )}
                    {venueData?.accessibility && (
                      <div className="border border-gray-100 rounded-xl p-3 sm:p-4">
                        <h3 className="font-semibold text-sm sm:text-base mb-2 text-gray-900 flex items-center gap-2">
                          <Accessibility className="h-4 w-4 text-blue-600" />
                          Accessibility
                        </h3>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                            {venueData.accessibility.wheelchairAccess ? <Check className="h-3.5 w-3.5 text-green-600" /> : <X className="h-3.5 w-3.5 text-red-500" />}
                            <span className="text-gray-600">Wheelchair Access</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                            {venueData.accessibility.liftElevator ? <Check className="h-3.5 w-3.5 text-green-600" /> : <X className="h-3.5 w-3.5 text-red-500" />}
                            <span className="text-gray-600">Lift/Elevator</span>
                          </div>
                          {venueData.accessibility.nearbyTransport && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {venueData.accessibility.nearbyTransport.airport && <Badge variant="outline" className="text-xs py-0.5">Airport</Badge>}
                              {venueData.accessibility.nearbyTransport.railwayStation && <Badge variant="outline" className="text-xs py-0.5">Railway</Badge>}
                              {venueData.accessibility.nearbyTransport.taxiService && <Badge variant="outline" className="text-xs py-0.5">Taxi</Badge>}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Policies - Compact */}
                  {venueData?.policies && (
                    <div className="border border-gray-100 rounded-xl p-3 sm:p-4">
                      <h3 className="font-semibold text-sm sm:text-base mb-3 text-gray-900">Policies</h3>
                      <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                        {venueData.policies.operatingHours && (
                          <div>
                            <p className="text-gray-500 mb-0.5">Hours</p>
                            <p className="font-medium text-gray-900">{venueData.policies.operatingHours.startTime} - {venueData.policies.operatingHours.endTime}</p>
                          </div>
                        )}
                        {venueData.policies.smokingPolicy && (
                          <div>
                            <p className="text-gray-500 mb-0.5">Smoking</p>
                            <p className="font-medium text-gray-900 capitalize">{venueData.policies.smokingPolicy?.replace?.(/_/g, ' ')}</p>
                          </div>
                        )}
                        {venueData.policies.alcoholServingPermission !== undefined && (
                          <div>
                            <p className="text-gray-500 mb-0.5">Alcohol</p>
                            <p className="font-medium text-gray-900">{venueData.policies.alcoholServingPermission ? 'Allowed' : 'Not Allowed'}</p>
                          </div>
                        )}
                        {venueData.policies.noiseRestrictions && (
                          <div className="col-span-2">
                            <p className="text-gray-500 mb-0.5">Noise</p>
                            <p className="font-medium text-gray-900">{venueData.policies.noiseRestrictions}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Add-on Services - Compact */}
                  {venueData?.addOnServices && (
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base mb-3 text-gray-900">Add-on Services</h3>
                      <div className="flex flex-wrap gap-2">
                        {venueData.addOnServices.cateringPackages?.available && (
                          <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1.5">
                            <UtensilsCrossed className="h-3.5 w-3.5 text-orange-600" />
                            <span className="text-xs sm:text-sm font-medium text-orange-700">Catering</span>
                          </div>
                        )}
                        {venueData.addOnServices.eventManagementServices?.available && (
                          <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1.5">
                            <Award className="h-3.5 w-3.5 text-purple-600" />
                            <span className="text-xs sm:text-sm font-medium text-purple-700">Event Mgmt</span>
                          </div>
                        )}
                        {venueData.addOnServices.photographyDecorPackages?.available && (
                          <div className="flex items-center gap-1.5 bg-pink-50 border border-pink-200 rounded-lg px-2.5 py-1.5">
                            <Gift className="h-3.5 w-3.5 text-pink-600" />
                            <span className="text-xs sm:text-sm font-medium text-pink-700">Photo & Decor</span>
                          </div>
                        )}
                        {venueData.addOnServices.accommodationBundle?.available && (
                          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5">
                            <Home className="h-3.5 w-3.5 text-blue-600" />
                            <span className="text-xs sm:text-sm font-medium text-blue-700">Stay</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Pricing Details - Mobile Optimized */}
                  <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 rounded-xl p-4 sm:p-6 text-white">
                    <h3 className="font-bold text-base sm:text-lg mb-4 flex items-center gap-2">
                      <div className="bg-white/20 p-1.5 rounded-lg">
                        <IndianRupee className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      Pricing
                    </h3>
                    <div className="space-y-2.5 sm:space-y-3">
                      <div className="flex justify-between items-center pb-2.5 border-b border-white/20">
                        <span className="text-purple-100 text-sm">Base Price</span>
                        <span className="font-bold text-lg sm:text-xl">₹{(venueData?.pricing.basePrice || 0).toLocaleString('en-IN')}</span>
                      </div>
                      {venueData?.pricing.hourlyRate && (
                        <div className="flex justify-between items-center pb-2.5 border-b border-white/20">
                          <span className="text-purple-100 text-sm">Hourly</span>
                          <span className="font-bold text-base sm:text-lg">₹{venueData.pricing.hourlyRate.toLocaleString('en-IN')}<span className="text-xs font-normal">/hr</span></span>
                        </div>
                      )}
                      {getHalfDayRate() !== undefined && (
                        <div className="flex justify-between items-center pb-2.5 border-b border-white/20">
                          <span className="text-purple-100 text-sm">Half Day</span>
                          <span className="font-bold text-base sm:text-lg">₹{getHalfDayRate()!.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {venueData?.pricing.fullDayRate && (
                        <div className="flex justify-between items-center pb-2.5 border-b border-white/20">
                          <span className="text-purple-100 text-sm">Full Day</span>
                          <span className="font-bold text-base sm:text-lg">₹{venueData.pricing.fullDayRate.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {venueData?.pricing.securityDeposit && (
                        <div className="flex justify-between items-center pb-2.5 border-b border-white/20">
                          <span className="text-purple-100 text-sm">Security Deposit</span>
                          <span className="font-bold text-base sm:text-lg">₹{venueData.pricing.securityDeposit.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {venueData?.pricing.rentalIncludes && venueData.pricing.rentalIncludes.length > 0 && (
                        <div className="pt-2">
                          <p className="text-xs text-purple-200 mb-2">Includes:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {venueData.pricing.rentalIncludes?.map((item, idx) => (
                              <Badge key={idx} className="bg-white/20 text-white text-xs px-2 py-0.5">
                                {item?.replace?.(/_/g, ' ') || 'N/A'}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Terms & Conditions - Compact */}
                  {(venueData?.terms?.cancellationPolicy || venueData?.terms?.additionalRules || venueData?.pricing?.cancellationPolicy) && (
                    <div className="border-l-3 border-orange-400 bg-orange-50 p-3 sm:p-4 rounded-r-lg">
                      <h3 className="font-semibold text-sm sm:text-base mb-2 text-gray-900">Terms</h3>
                      <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                        {(venueData.terms?.cancellationPolicy || venueData.pricing?.cancellationPolicy) && (
                          <p>
                            <span className="font-medium text-gray-700">Cancellation:</span>{' '}
                            {venueData.terms?.cancellationPolicy ||
                              (venueData.pricing?.cancellationPolicy?.refundable
                                ? `Refundable within ${venueData.pricing.cancellationPolicy.timeFrame || 'specified time'}`
                                : 'Non-refundable'
                              )
                            }
                          </p>
                        )}
                        {venueData.terms?.additionalRules && (
                          <p>
                            <span className="font-medium text-gray-700">Rules:</span>{' '}
                            {venueData.terms.additionalRules}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Reviews Tab - Mobile Optimized */}
              <TabsContent value="reviews" className="p-4 sm:p-6">
                <div className="space-y-4 sm:space-y-5">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                    Reviews ({(venueData?.rating.count ?? 0)})
                  </h2>

                  {/* Write Review - Compact Mobile */}
                  {user ? (
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 sm:p-4 space-y-2.5">
                      <p className="text-sm font-medium text-gray-700">Rate this venue</p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewReview({ ...newReview, rating: star })}
                            className="p-0.5"
                          >
                            <Star className={`h-7 w-7 sm:h-8 sm:w-8 ${newReview.rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                          </button>
                        ))}
                      </div>
                      <Textarea
                        placeholder="Share your experience..."
                        value={newReview.comment}
                        onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                        rows={2}
                        className="text-sm"
                      />
                      <Button onClick={handleSubmitReview} disabled={submittingReview} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto">
                        {submittingReview && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        Submit
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm text-gray-500 text-center">
                      <button onClick={() => router.push(createAuthRedirectUrl())} className="text-purple-600 font-medium">Login</button> to write a review
                    </div>
                  )}

                  {/* Rating Summary - Compact */}
                  <div className="bg-white border border-gray-100 rounded-xl p-3 sm:p-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center flex-shrink-0">
                        <div className="text-3xl sm:text-4xl font-bold text-gray-900">{(venueData?.rating.average ?? 0).toFixed(1)}</div>
                        <div className="flex items-center gap-0.5 mt-1 justify-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={`h-3.5 w-3.5 ${star <= (venueData?.rating.average ?? 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{venueData?.rating.count ?? 0} reviews</p>
                      </div>
                      <div className="flex-1 space-y-1">
                        {[5, 4, 3, 2, 1].map((rating) => {
                          const percentage = venueData?.rating.count ? ((venueData.reviews?.filter(r => r.rating === rating).length || 0) / venueData.rating.count) * 100 : 0;
                          return (
                            <div key={rating} className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 w-3">{rating}</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Individual Reviews - Compact */}
                  <div className="space-y-3">
                    {venueData?.reviews && venueData.reviews.length > 0 ? (
                      venueData.reviews.map((review, index) => (
                        <div key={index} className="bg-white border border-gray-100 rounded-xl p-3 sm:p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center shrink-0">
                              <span className="text-purple-600 font-semibold text-sm">
                                {(review as any).userName?.charAt(0).toUpperCase() || review.user?.name?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-medium text-sm text-gray-900">{(review as any).userName || review.user?.name || 'Anonymous'}</h4>
                                <span className="text-xs text-gray-400">
                                  {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              <div className="flex items-center gap-0.5 mt-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star key={star} className={`h-3 w-3 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                ))}
                              </div>
                              {review.comment && (
                                <p className="text-gray-600 text-xs sm:text-sm mt-2 leading-relaxed">
                                  {review.comment}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-xl">
                        <MessageCircle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm font-medium">No reviews yet</p>
                        <p className="text-gray-400 text-xs mt-1">Be the first to review!</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* FAQ Tab - Mobile Optimized */}
              <TabsContent value="faq" className="p-4 sm:p-6">
                <div className="space-y-3">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                    FAQs
                  </h2>
                  {venueData?.faqs && venueData.faqs.length > 0 ? (
                    <Accordion type="multiple" className="w-full space-y-2">
                      {venueData.faqs
                        .filter((f) => f.isActive !== false)
                        .slice()
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                        .map((f, idx) => (
                          <AccordionItem key={f._id || idx} value={(f._id || String(idx)) as string} className="border border-gray-100 rounded-xl px-3 sm:px-4 data-[state=open]:bg-gray-50">
                            <AccordionTrigger className="text-sm sm:text-base font-medium text-left py-3 hover:no-underline">{f.question}</AccordionTrigger>
                            <AccordionContent className="text-xs sm:text-sm text-gray-600 pb-3">
                              {f.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                    </Accordion>
                  ) : (
                    <div className="bg-gray-50 rounded-xl p-4 text-center text-sm text-gray-500">
                      No FAQs available
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar - Hidden on Mobile, Sticky on Desktop */}
          <div className="hidden lg:block lg:space-y-4 lg:sticky lg:top-4">
            {/* Calendar Card */}
            <Card className="bg-white border border-gray-200 shadow-lg rounded-xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-gray-100 bg-gradient-to-r from-purple-50/50 to-pink-50/50 p-4">
                <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <div className="bg-purple-600 p-1.5 rounded-lg">
                    <CalendarIcon className="h-4 w-4 text-white" />
                  </div>
                  Check Availability
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 p-4">
                {/* Calendar Wrapper */}
                <div className="rounded-lg border border-gray-200 p-2 bg-gray-50">
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

                {/* Legend - Compact */}
                <div className="grid grid-cols-2 gap-1.5 text-[10px] text-gray-500">
                  <LegendDot color="bg-emerald-500" label="Available" />
                  <LegendDot color="bg-amber-500" label="Partial" />
                  <LegendDot color="bg-red-500" label="Blocked" />
                  <LegendDot color="bg-gray-400" label="Past" />
                </div>
              </CardContent>
            </Card>

            {/* Booking Section */}
            {selectedDate && (
              <Card className="bg-white border border-gray-200 shadow-lg rounded-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-50/50 to-pink-50/50 border-b border-gray-100 p-4">
                  <CardTitle className="text-base font-bold text-gray-900">Book Venue</CardTitle>
                  <CardDescription className="text-purple-600 font-medium text-sm mt-1 flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {format(selectedDate, 'PPP')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  {bookingSuccess ? (
                    <div className="text-center py-4">
                      <div className="bg-green-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">Booking Confirmed!</h3>
                      <div className="text-left space-y-2 text-sm bg-green-50 p-3 rounded-lg mt-3 mb-3">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Date:</span>
                          <span className="font-medium">{format(new Date(finalBookingDetails?.bookingDate), 'PP')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Time:</span>
                          <span className="font-medium">{finalBookingDetails?.startTime} - {finalBookingDetails?.endTime}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-green-200">
                          <span className="font-medium">Total:</span>
                          <span className="font-bold text-green-600">₹{finalBookingDetails?.pricing?.totalAmount?.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <Button onClick={handleDownloadInvoice} size="sm" className="w-full bg-green-600 hover:bg-green-700">
                        <Download className="h-4 w-4 mr-1.5" />
                        Download Invoice
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleBookingSubmit} className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="startTime" className="text-xs">Start *</Label>
                          <Select onValueChange={(value) => setBookingForm({ ...bookingForm, startTime: value })} value={bookingForm.startTime} disabled={fullDaySelected}>
                            <SelectTrigger id="startTime" className="h-9 text-sm">
                              <SelectValue placeholder="Start" />
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailableTimeOptions().map((time) => (
                                <SelectItem key={time.value} value={time.value} disabled={time.disabled || fullDaySelected} className="text-sm">
                                  {time.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="endTime" className="text-xs">End *</Label>
                          <Select onValueChange={(value) => setBookingForm({ ...bookingForm, endTime: value })} value={bookingForm.endTime} disabled={fullDaySelected}>
                            <SelectTrigger id="endTime" className="h-9 text-sm">
                              <SelectValue placeholder="End" />
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailableTimeOptions().map((time) => (
                                <SelectItem key={time.value} value={time.value} disabled={time.disabled || fullDaySelected} className="text-sm">
                                  {time.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input id="fullDay" type="checkbox" checked={fullDaySelected} onChange={(e) => { setFullDaySelected(e.target.checked); if (e.target.checked) setBookingForm((prev) => ({ ...prev, startTime: '00:00', endTime: '23:00' })); }} className="h-3.5 w-3.5" />
                        <Label htmlFor="fullDay" className="text-xs font-normal">Full Day</Label>
                      </div>

                      <div>
                        <Label htmlFor="eventType" className="text-xs">Event Type</Label>
                        <Input id="eventType" value={bookingForm.eventType} onChange={(e) => setBookingForm({ ...bookingForm, eventType: e.target.value })} placeholder="Wedding, Party, etc." className="h-9 text-sm" />
                      </div>

                      {/* Price Summary */}
                      <div className="bg-purple-50 border border-purple-100 rounded-lg p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Estimated</span>
                          <span className="font-bold text-purple-700">₹{estimatedPrice.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      {formError && (
                        <div className="p-2 text-xs text-red-700 bg-red-50 rounded-lg">{formError}</div>
                      )}

                      <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-2.5 rounded-lg" disabled={submitting || authLoading}>
                        {submitting ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Processing...</> : <><IndianRupee className="h-4 w-4 mr-1" />Book & Pay</>}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            )}

            {!selectedDate && (
              <Card className="bg-white border border-gray-200 shadow-lg rounded-xl overflow-hidden">
                <CardContent className="p-4">
                  <div className="text-center py-4">
                    <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CalendarIcon className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Select a Date</h3>
                    <p className="text-xs text-gray-500">
                      Choose a date to book
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact Card - Compact */}
            <Card className="bg-gradient-to-br from-purple-600 to-pink-600 text-white border-0 shadow-lg rounded-xl overflow-hidden">
              <CardContent className="p-4">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">
                  <MessageCircle className="h-4 w-4" />
                  Need Help?
                </h3>
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 bg-white/10 p-2.5 rounded-lg">
                    <Phone className="h-4 w-4" />
                    <span className="text-sm">{venueData?.contactInfo.phone}</span>
                  </div>
                  {venueData?.contactInfo.email && (
                    <div className="flex items-center gap-2 bg-white/10 p-2.5 rounded-lg">
                      <Mail className="h-4 w-4" />
                      <span className="text-xs break-all">{venueData.contactInfo.email}</span>
                    </div>
                  )}
                </div>
                <Button size="sm" className="w-full bg-white text-purple-600 hover:bg-gray-50 font-semibold">
                  Contact
                </Button>
              </CardContent>
            </Card>
          </div>


        </div>

        {/* Similar Venues Section - Mobile Optimized */}
        {similarVenues.length > 0 && (
          <div className="mt-6 sm:mt-10 px-4 lg:px-0">
            <h2 className="text-base sm:text-xl font-semibold text-gray-900 mb-4">
              Similar Venues in {venueData?.address.city}
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible">
              {similarVenues.map((venue) => {
                const venueImage = getPrimaryVenueImage(venue);
                return (
                  <div
                    key={venue._id}
                    className="flex-shrink-0 w-[200px] sm:w-[220px] lg:w-full bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => router.push(`/allVenues/${venue._id}`)}
                  >
                    <div className="relative h-28 sm:h-32 lg:h-36 overflow-hidden">
                      {venueImage ? (
                        <img src={venueImage} alt={venue.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">No image</div>
                      )}
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-medium">{venue.rating?.average?.toFixed(1) || '5.0'}</span>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm text-gray-900 truncate">{venue.name}</h3>
                      <div className="flex items-center gap-1 mt-1 text-gray-500">
                        <MapPin className="h-3 w-3" />
                        <span className="text-xs truncate">{venue.address.city}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <span className="text-sm font-bold text-gray-900">₹{(venue.pricing.hourlyRate || venue.pricing.basePrice || 0).toLocaleString('en-IN')}</span>
                        <span className="text-xs text-gray-500">{venue.capacity} guests</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-4 lg:mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/allVenues/list?city=${venueData?.address.city}`)}
                className="text-sm"
              >
                View All in {venueData?.address.city}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Bar - Mobile Only */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 lg:hidden z-50 safe-area-inset-bottom">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">Starting from</p>
            <p className="text-lg font-bold text-gray-900">
              ₹{(venueData?.pricing.hourlyRate || venueData?.pricing.basePrice || 0).toLocaleString('en-IN')}
              <span className="text-xs font-normal text-gray-500">/hr</span>
            </p>
          </div>
          <Button
            onClick={() => setShowMobileBooking(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg flex-shrink-0"
          >
            <CalendarIcon className="h-4 w-4 mr-1.5" />
            Book Now
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
