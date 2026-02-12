
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
  const [childVenues, setChildVenues] = useState<VenueData[]>([]);
  const [similarVenues, setSimilarVenues] = useState<VenueData[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
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
        setActiveImageIndex((prev: number) => (prev + 1) % images.length);
      } else if (images.length > 0) {
        setActiveImageIndex((prev: number) => (prev - 1 + images.length) % images.length);
      }
    }
  };

  const fetchChildVenues = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/`);
      const data = await response.json();
      if (data.success) {
        const venues: VenueData[] = data.data.venues || [];
        const children = venues
          .filter((v) => v.managedByVenueId === resolvedVenueId)
          .slice(0, 12);
        setChildVenues(children);
      }
    } catch (error) {
      console.error('Error fetching child venues:', error);
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
        setActiveImageIndex((prev: number) => (prev + 1) % images.length);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [venueId]);


  // Fetch similar venues when venue data is loaded
  useEffect(() => {
    if (venueData) {
      fetchSimilarVenues();
    }
  }, [venueData]);

  // Fetch child venues (only when current venue is a parent/root venue)
  useEffect(() => {
    if (venueData && resolvedVenueId && venueData.managedByVenueId == null) {
      fetchChildVenues();
    } else {
      setChildVenues([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueData, resolvedVenueId]);


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
    const images = extractVenueImages(venueData);
    if (images.length > 0) {
      setActiveImageIndex((prev: number) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    const images = extractVenueImages(venueData);
    if (images.length > 0) {
      setActiveImageIndex((prev: number) => (prev - 1 + images.length) % images.length);
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
                  onClick={() => router.push(`/allVenues/${venueId}/checkout`)}
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
                {childVenues.length > 0 && (
                  <TabsTrigger
                    value="more-venues"
                    className="px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-700 data-[state=active]:bg-transparent rounded-none font-medium transition-all flex-shrink-0"
                  >
                    More Venues
                  </TabsTrigger>
                )}
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
                            <p className="font-medium text-gray-900 whitespace-pre-line">{venueData.policies.noiseRestrictions}</p>
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

              {childVenues.length > 0 && (
                <TabsContent value="more-venues" className="p-4 sm:p-6">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                      More venues from {venueData?.name}
                    </h2>
                    <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible">
                      {childVenues.map((venue) => {
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
                                <span className="text-xs font-medium">{venue.rating?.average?.toFixed(1) || '0.0'}</span>
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
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* Book Now CTA - Sticky on Mobile */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
            <Button
              onClick={() => router.push(`/allVenues/${venueId}/checkout`)}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-lg"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Book This Venue
            </Button>
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
            onClick={() => router.push(`/allVenues/${venueId}/checkout`)}
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
