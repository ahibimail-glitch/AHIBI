"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from "../../../hooks/useAuth";
import { createAuthRedirectUrl } from "@/utils/redirectUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  CalendarIcon,
  MapPin,
  Phone,
  Mail,
  Users,
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
  UtensilsCrossed,
  Accessibility,
  Loader2,
  Share2,
  Building2,
  Check,
  X,
  MessageCircle,
  Image as ImageIcon,
  Globe,
  Info,
  DoorOpen,
  Heart,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "../../Navbar";
import Footer from "../../Footer";

// Types remain the same
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

// Hero Carousel Component
interface HeroCarouselProps {
  images: string[];
  venueName: string;
}

const HeroCarousel = ({ images, venueName }: HeroCarouselProps) => {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === images.length - 1 ? 0 : c + 1));

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: venueName, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  return (
    <div className="relative w-full aspect-[16/9] md:aspect-[21/9] overflow-hidden rounded-2xl bg-gray-100">
      {images.map((img, i) => (
        <img
          key={i}
          src={img}
          alt={`${venueName} - Photo ${i + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${i === current ? "opacity-100" : "opacity-0"
            }`}
        />
      ))}

      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-lg"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5 text-gray-800" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-lg"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5 text-gray-800" />
          </button>
        </>
      )}

      <button
        onClick={handleShare}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-lg"
        aria-label="Share venue"
      >
        <Share2 className="w-4 h-4 text-gray-800" />
      </button>

      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all ${i === current ? "bg-white w-6" : "bg-white/60 w-2"
                }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Helper functions
const extractVenueImages = (venue?: VenueData | null): string[] => {
  if (!venue) return [];
  const primary = (venue.gallery || []).map(g => g.url).filter(Boolean);
  const docs = (venue.documents?.venueImages || []).map(img => img.url).filter(Boolean);
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
  'Wi-Fi': Wifi,
  'Sound System': Music,
  'Projector': Award,
  'Stage': Award,
  'Dance Floor': Music,
  'Catering Kitchen': UtensilsCrossed,
  'Bar Area': Gift,
  'Bridal Suite': Home,
  'Green Room': DoorOpen,
  'Coat Check': Home,
  'Air Conditioning': Snowflake,
  'Heating': Zap,
  'Restrooms': Home,
  'Elevator': Accessibility,
  'Loading Dock': Building2,
  'Backup Generator': Zap,
};

export default function VenueDetailPage() {
  const params = useParams();
  const venueId = params.id as string;
  const [venueData, setVenueData] = useState<VenueData | null>(null);
  const [resolvedVenueId, setResolvedVenueId] = useState<string | null>(null);
  const [childVenues, setChildVenues] = useState<VenueData[]>([]);
  const [similarVenues, setSimilarVenues] = useState<VenueData[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [newReview, setNewReview] = useState<{ rating: number; comment: string }>({ rating: 0, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);

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

  const fetchSimilarVenues = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const city = venueData?.address.city;
      const response = await fetch(`${apiUrl}/api/venues?city=${city || ''}&limit=8`);
      const data = await response.json();
      if (data.success) {
        const filtered = data.data.venues
          .filter((v: VenueData) => v._id !== venueId)
          .slice(0, 8);
        setSimilarVenues(filtered);
      }
    } catch (error) {
      console.error('Error fetching similar venues:', error);
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
        body: JSON.stringify({ 
          rating: newReview.rating, 
          comment: newReview.comment,
          userName: user?.name || user?.email || 'Anonymous'
        })
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
  }, [venueId]);

  useEffect(() => {
    if (venueData) {
      fetchSimilarVenues();
    }
  }, [venueData]);

  useEffect(() => {
    if (venueData && resolvedVenueId && venueData.managedByVenueId == null) {
      fetchChildVenues();
    } else {
      setChildVenues([]);
    }
  }, [venueData, resolvedVenueId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading venue...</p>
        </div>
      </div>
    );
  }

  if (!loading && !venueData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Venue Not Found</h2>
          <p className="text-gray-600 mb-6">
            The venue you're looking for doesn't exist or has been removed.
          </p>
          <Button
            onClick={() => router.push('/allVenues')}
            className="bg-red-600 hover:bg-red-700"
          >
            Browse All Venues
          </Button>
        </div>
      </div>
    );
  }

  const displayImages = extractVenueImages(venueData);
  const startingPrice = venueData?.pricing.basePrice || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Hero Image */}
        {displayImages.length > 0 ? (
          <HeroCarousel images={displayImages} venueName={venueData?.name || ''} />
        ) : (
          <div className="relative w-full aspect-[16/9] md:aspect-[21/9] overflow-hidden rounded-2xl bg-gray-200 flex flex-col items-center justify-center">
            <ImageIcon className="h-16 w-16 text-gray-400 mb-2" />
            <p className="text-gray-500">No images available</p>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="mt-6 lg:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Venue Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Venue Header */}
            <div >
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                {venueData?.name}
              </h1>

              <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold text-gray-900">
                    {(venueData?.rating.average ?? 0).toFixed(1)}
                  </span>
                  <span>({venueData?.rating.count ?? 0})</span>
                </div>
                <span className="text-gray-400">•</span>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{venueData?.address.city}, {venueData?.address.state}</span>
                </div>
              </div>

              {/* Quick Info Cards */}
              {/* Quick Info Cards */}
              <div className="flex gap-3 overflow-x-auto scrollbar-hide py-1 -mx-1 px-1">

                {/* Capacity */}
                <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-card border border-surface-border min-w-fit shadow-sm">
                  <div className="w-9 h-9 rounded-lg  flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      Upto {venueData?.capacity}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Guests
                    </p>
                  </div>
                </div>

                {/* Type */}
                <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-card border border-surface-border min-w-fit shadow-sm">
                  <div className="w-9 h-9 rounded-lg  flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {venueData?.venueClassification?.indoorOutdoor || "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Type
                    </p>
                  </div>
                </div>

                {/* Starting Price */}
                <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-card border border-surface-border min-w-fit shadow-sm">
                  <div className="w-9 h-9 rounded-lg  flex items-center justify-center flex-shrink-0">
                    <Award className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      ${startingPrice.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Starting
                    </p>
                  </div>
                </div>

                {/* Parking */}
                <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-card border border-surface-border min-w-fit shadow-sm">
                  <div className="w-9 h-9 rounded-lg  flex items-center justify-center flex-shrink-0">
                    <Car className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {venueData?.parking ? "Available" : "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Parking
                    </p>
                  </div>
                </div>

                {/* Accessibility */}
                <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-card border border-surface-border min-w-fit shadow-sm">
                  <div className="w-9 h-9 rounded-lg  flex items-center justify-center flex-shrink-0">
                    <Accessibility className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {venueData?.accessibility?.wheelchairAccess ? "Accessible" : "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Access
                    </p>
                  </div>
                </div>

              </div>

            </div>

            {/* About This Venue */}
            <div className="bg-card rounded-xl border border-surface-border p-6 shadow-sm animate-fade-in">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                About this venue
              </h2>

              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {venueData?.description ||
                  "This beautiful venue offers a perfect setting for your special events."}
              </p>

              {/* Contact Info */}
              <div className="space-y-3.5">
                {/* Address */}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${venueData?.address.street}, ${venueData?.address.city}, ${venueData?.address.state} ${venueData?.address.pincode}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 text-sm text-foreground hover:text-primary transition-colors group"
                >
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
                  <span>
                    {venueData?.address.street}, {venueData?.address.city},{" "}
                    {venueData?.address.state} {venueData?.address.pincode}
                  </span>
                </a>

                {/* Phone */}
                {venueData?.contactInfo.phone && (
                  <a
                    href={`tel:${venueData.contactInfo.phone}`}
                    className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors"
                  >
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{venueData.contactInfo.phone}</span>
                  </a>
                )}

                {/* Email */}
                {venueData?.contactInfo.email && (
                  <a
                    href={`mailto:${venueData.contactInfo.email}`}
                    className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors"
                  >
                    <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{venueData.contactInfo.email}</span>
                  </a>
                )}

                {/* Website */}
                {venueData?.contactInfo.website && (
                  <a
                    href={venueData.contactInfo.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors"
                  >
                    <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{venueData.contactInfo.website}</span>
                  </a>
                )}
              </div>
            </div>


            {/* Amenities & Facilities */}
            <div className="bg-card rounded-xl border border-surface-border p-6 shadow-sm animate-fade-in">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Amenities & Facilities
              </h2>

              <div className="flex flex-wrap gap-2">
                {/* Amenities */}
                {venueData?.amenities &&
                  Object.entries(venueData.amenities)
                    .filter(([_, value]) => value.available)
                    .map(([key]) => {
                      const formattedKey = key.replace(/([A-Z])/g, " $1").trim();
                      const IconComponent = facilityIcons[key] || Check;

                      return (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-secondary text-sm text-secondary-foreground font-medium"
                        >
                          <IconComponent className="w-3.5 h-3.5" />
                          {formattedKey}
                        </span>
                      );
                    })}

                {/* Facilities */}
                {venueData?.facilities &&
                  Object.entries(venueData.facilities)
                    .filter(([_, value]) => value)
                    .map(([key]) => {
                      const formattedKey = key.replace(/([A-Z])/g, " $1").trim();
                      const IconComponent = facilityIcons[key] || Check;

                      return (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-secondary text-sm text-secondary-foreground font-medium"
                        >
                          <IconComponent className="w-3.5 h-3.5" />
                          {formattedKey}
                        </span>
                      );
                    })}
              </div>
            </div>


            {/* Pricing Section */}
            <div className="bg-card rounded-xl border border-surface-border p-6 shadow-sm animate-fade-in">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Pricing
              </h2>

              {/* Base Price Highlight */}
              <div className="mb-5">
                <span className="text-3xl font-bold text-primary">
                  ${venueData?.pricing.basePrice.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground ml-1.5">
                  base price
                </span>
              </div>

              {/* Pricing Rows */}
              <div className="space-y-3 mb-5">
                {venueData?.pricing.hourlyRate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Hourly Rate</span>
                    <span className="font-medium text-foreground">
                      ${venueData.pricing.hourlyRate}
                    </span>
                  </div>
                )}

                {venueData?.pricing.halfDayRate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Half Day</span>
                    <span className="font-medium text-foreground">
                      ${venueData.pricing.halfDayRate}
                    </span>
                  </div>
                )}

                {venueData?.pricing.fullDayRate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Full Day</span>
                    <span className="font-medium text-foreground">
                      ${venueData.pricing.fullDayRate}
                    </span>
                  </div>
                )}

                {venueData?.pricing.cleaningFee !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cleaning Fee</span>
                    <span className="font-medium text-foreground">
                      ${venueData.pricing.cleaningFee.toLocaleString()}
                    </span>
                  </div>
                )}

                {venueData?.pricing.securityDeposit && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Security Deposit</span>
                    <span className="font-medium text-foreground">
                      ${venueData.pricing.securityDeposit.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Cancellation Policy */}
              {venueData?.pricing.cancellationPolicy && (
                <div className="pt-4 border-t border-surface-border">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {venueData.pricing.cancellationPolicy.refundable
                        ? `Free cancellation up to ${venueData.pricing.cancellationPolicy.timeFrame || "14 days"
                        } before the event. ${venueData.pricing.cancellationPolicy.deductionPercentage
                          ? `${venueData.pricing.cancellationPolicy.deductionPercentage}% deduction`
                          : "50% refund"
                        } for cancellations 7–14 days prior. No refunds within 7 days.`
                        : "Non-refundable booking"}
                    </p>
                  </div>
                </div>
              )}
            </div>


            {/* Reviews Section */}
            <div className="animate-fade-in">

              {/* Header */}
              <div className="flex items-baseline gap-2 mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Reviews
                </h2>

                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                  <span className="font-medium text-foreground">
                    {(venueData?.rating.average ?? 0).toFixed(1)}
                  </span>
                  <span>· {venueData?.rating.count ?? 0} reviews</span>
                </div>
              </div>

              {/* Review Cards */}
              <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
                {venueData?.reviews && venueData.reviews.length > 0 ? (
                  venueData.reviews.map((review, index) => {
                    const userName =
                      (review as any).userName ||
                      review.user?.name ||
                      "Anonymous";

                    const initials = userName
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("");

                    return (
                      <div
                        key={index}
                        className="min-w-[280px] max-w-[320px] bg-card rounded-xl border border-surface-border p-5 shadow-sm flex-shrink-0"
                      >
                        {/* User + Stars */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                              <span className="text-xs font-semibold text-primary-foreground">
                                {initials}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {userName}
                            </span>
                          </div>

                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${i < review.rating
                                    ? "fill-primary text-primary"
                                    : "text-border"
                                  }`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Comment */}
                        {review.comment && (
                          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                            {review.comment}
                          </p>
                        )}

                        {/* Date */}
                        <p className="text-xs text-muted-foreground/60 mt-3">
                          {new Date(review.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full flex flex-col items-center justify-center py-12 text-center">
                    <MessageCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No reviews yet. Be the first to review!
                    </p>
                  </div>
                )}
              </div>

              {/* Write Review */}
              {user && (
                <div className="mt-8 pt-6 border-t border-surface-border">
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Write a review
                  </h3>

                  {/* Star Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() =>
                          setNewReview({ ...newReview, rating: star })
                        }
                      >
                        <Star
                          className={`h-5 w-5 cursor-pointer transition ${newReview.rating >= star
                              ? "text-primary fill-primary"
                              : "text-border"
                            }`}
                        />
                      </button>
                    ))}
                  </div>

                  <Textarea
                    placeholder="Share your experience..."
                    value={newReview.comment}
                    onChange={(e) =>
                      setNewReview({ ...newReview, comment: e.target.value })
                    }
                    rows={3}
                    className="mb-3"
                  />

                  <Button
                    onClick={handleSubmitReview}
                    disabled={submittingReview}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {submittingReview && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Submit Review
                  </Button>
                </div>
              )}
            </div>


            {/* FAQs */}
            {venueData?.faqs && venueData.faqs.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
                <Accordion type="multiple" className="w-full">
                  {venueData.faqs
                    .filter((f) => f.isActive !== false)
                    .slice()
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((f, idx) => (
                      <AccordionItem key={f._id || idx} value={(f._id || String(idx)) as string}>
                        <AccordionTrigger className="text-left font-medium">
                          {f.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-700">
                          {f.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                </Accordion>
              </div>
            )}
          </div>

          {/* Right Column - Booking Card (Sticky) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-lg sticky top-20">
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-gray-900">
                    ${startingPrice.toLocaleString()}
                  </span>
                  <span className="text-gray-600">starting</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold">{(venueData?.rating.average ?? 0).toFixed(1)}</span>
                  <span className="text-gray-500">· {venueData?.rating.count ?? 0} reviews</span>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-600 text-xs mb-1">Capacity</p>
                    <p className="font-semibold text-gray-900">Up to {venueData?.capacity}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-600 text-xs mb-1">Cleaning Fee</p>
                    <p className="font-semibold text-gray-900">
                      ${venueData?.pricing.cleaningFee !== undefined ? venueData.pricing.cleaningFee.toLocaleString() : "NA"}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => router.push(`/allVenues/${venueId}/checkout`)}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-6 text-lg"
              >
                Book Now
              </Button>

              <p className="text-center text-xs text-gray-500 mt-4">
                You won't be charged yet
              </p>
            </div>
          </div>
        </div>

        {/* Similar Venues */}
        {similarVenues.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Similar venues in {venueData?.address.city}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {similarVenues.map((venue) => {
                const venueImage = getPrimaryVenueImage(venue);
                return (
                  <div
                    key={venue._id}
                    className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/allVenues/${venue._id}`)}
                  >
                    <div className="relative h-48 overflow-hidden">
                      {venueImage ? (
                        <img src={venueImage} alt={venue.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <ImageIcon className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-medium">{venue.rating?.average?.toFixed(1) || '5.0'}</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-1 truncate">{venue.name}</h3>
                      <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{venue.address.city}</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold text-gray-900">
                          ${(venue.pricing.hourlyRate || venue.pricing.basePrice || 0).toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-500">starting</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-50">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-gray-900">${startingPrice.toLocaleString()}</span>
              <span className="text-sm text-gray-600">starting</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              <span>{(venueData?.rating.average ?? 0).toFixed(1)} ({venueData?.rating.count})</span>
            </div>
          </div>
          <Button
            onClick={() => router.push(`/allVenues/${venueId}/checkout`)}
            className="bg-red-600 hover:bg-red-700 px-8 py-5 text-base font-semibold"
          >
            Book Now
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
}