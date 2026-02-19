"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarIcon,
  ArrowLeft,
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
  TreePine,
  Layers,
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
  Image as ImageIcon,
  Globe,
  Info,
  DoorOpen,
  Heart,
  XCircle,
  Speaker,
  Projector,
  Theater,
  Wine,
  Shirt,
  AirVent,
  Heater,
  Bath,
  ArrowUpFromLine,
  Truck,
  Zap as ZapIcon,
  Sparkles,
  Video,
  Monitor,
  Camera,
  Crown,
  Clock,
  Volume2,
  Lightbulb,
  Power,
  Eye,
  Lock,
  Car as CarIcon,
  Dog,
  ChefHat,
  Coffee,
  Tv,
  Radio,
  Film,
  Gamepad2,
  BedDouble,
  PaintBucket,
  Carrot,
  PartyPopper,
  Mic,
  Guitar,
  Piano,
  Drum,
  Headphones
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "../../../Navbar";
import Footer from "../../../Footer";

// Types
interface VenueData {
  _id: string;
  name: string;
  businessName?: string;
  email: string;
  phone: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  status: 'pending' | 'approved' | 'rejected';
  verificationDocuments?: string[];
  socialLinks?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

interface SpaceData {
  _id: string;
  name: string;
  description: string;
  tagline?: string;
  venueClassification: {
    venueTypes: string[];
    venueTypeOther?: string;
    indoorOutdoor: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
  capacity: number;
  capacityDetails: {
    standingCapacity: number;
    seatingCapacity?: {
      theatreStyle?: number;
      roundTable?: number;
    };
    minimumBookingCapacity?: number;
  };
  pricing: {
    basePrice: number;
    hourlyRate?: number;
    halfDayRate?: number;
    fullDayRate?: number;
    cleaningFee?: number;
    securityDeposit?: number;
  };
  gallery: Array<{
    url: string;
    caption?: string;
    isMain?: boolean;
  }>;
  totalBookings: number;
  totalEarnings: number;
  rating: {
    average: number;
    count: number;
  };
  createdAt: string;
  updatedAt: string;
  venueId: VenueData;
  amenities?: any;
  facilities?: any;
}

const facilityIcons: { [key: string]: typeof Check } = {
  wifi: Wifi,
  parking: Car,
  music: Music,
  power: Zap,
  airConditioning: Snowflake,
  catering: UtensilsCrossed,
  accessibility: Accessibility,
  security: Shield,
  gifts: Gift,
  cleaning: DoorOpen,
};

const isMongoObjectId = (id: string) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

const extractSpaceImages = (space: SpaceData | null) => {
  if (!space) return [];
  const gallery = Array.isArray(space.gallery) ? space.gallery : [];
  return gallery.map(img => img.url).filter(Boolean);
};

const getPrimarySpaceImage = (space: SpaceData) => {
  const gallery = Array.isArray(space.gallery) ? space.gallery : [];
  return gallery.find((img) => img?.isMain)?.url || gallery.find((img) => img?.url) || "";
};

const formatAmenityLabel = (key: string) => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
    .replace(/_/g, ' ');
};

// Facilities Section Component
const iconMap: Record<string, React.ElementType> = {
  // Facilities
  "Parking": Car,
  "Ac": Snowflake,
  "Pet Friendly": Dog,
  "Catering": UtensilsCrossed,
  "Accessible": Accessibility,
  "Wifi": Wifi,
  "Sound System": Speaker,
  "Lighting": Lightbulb,
  "Security": Shield,
  "Alcohol": Wine,
  
  // Amenities
  "Stage": Theater,
  "Air Conditioning": AirVent,
  "In House Catering": ChefHat,
  "Catering Flexibility": UtensilsCrossed,
  "Lighting System": Lightbulb,
  "Professional Sound System": Volume2,
  "Led Screen Projection": Monitor,
  "Wifi Availability": Wifi,
  "Dressing Rooms": Shirt,
  "Changing Rooms": DoorOpen,
  "Washrooms": Bath,
  "Power Backup": ZapIcon,
  "Security Cctv": Eye,
  "Alcohol Permission": Wine,
  "Live Music Permission": Mic,
  "Sports Equipment": Gamepad2,
  "Accommodation": BedDouble,
  "Decoration Services": PaintBucket,
  "Valet Service": CarIcon,
  
  // Fallback for any unmapped items (lowercase versions)
  "air conditioning": AirVent,
  "in house catering": ChefHat,
  "catering flexibility": UtensilsCrossed,
  "lighting system": Lightbulb,
  "professional sound system": Volume2,
  "led screen projection": Monitor,
  "wifi availability": Wifi,
  "dressing rooms": Shirt,
  "changing rooms": DoorOpen,
  "washrooms": Bath,
  "power backup": ZapIcon,
  "security cctv": Eye,
  "alcohol permission": Wine,
  "live music permission": Mic,
  "sports equipment": Gamepad2,
  "accommodation": BedDouble,
  "decoration services": PaintBucket,
  "valet service": CarIcon,
};

const FacilitiesSection = ({ amenities, facilities }: { amenities: any, facilities: any }) => {
  const allFeatures: string[] = [];

  // Process amenities object
  if (amenities && typeof amenities === 'object') {
    Object.entries(amenities).forEach(([key, value]: [string, any]) => {
      if (typeof value === 'object' && value.available) {
        // Convert key to readable format
        const label = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str) => str.toUpperCase())
          .trim();
        allFeatures.push(label);
      } else if (typeof value === 'boolean' && value) {
        // Handle simple boolean flags
        const label = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str) => str.toUpperCase())
          .trim();
        allFeatures.push(label);
      }
    });
  }

  // Process facilities object
  if (facilities && typeof facilities === 'object') {
    Object.entries(facilities).forEach(([key, value]: [string, any]) => {
      if (typeof value === 'boolean' && value) {
        // Convert key to readable format
        const label = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str) => str.toUpperCase())
          .trim();
        allFeatures.push(label);
      }
    });
  }

  if (allFeatures.length === 0) {
    return null;
  }

  return (
    <div className="bg-card rounded-xl border border-surface-border p-6 shadow-sm animate-fade-in">
      <h2 className="text-lg font-semibold text-foreground mb-4">Amenities & Facilities</h2>
      <div className="flex flex-wrap gap-2">
        {allFeatures.map((item) => {
          const Icon = iconMap[item] || Check;
          return (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gray-200 text-sm text-black font-medium"
            >
              <Icon className="w-3.5 h-3.5" />
              {item}
            </span>
          );
        })}
      </div>
    </div>
  );
};

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

export default function SpaceDetailPage() {
  const params = useParams();
  const venueId = decodeURIComponent((params.venueid as string) || "");
  const spaceId = decodeURIComponent((params.spaceid as string) || "");
  
  const [spaceData, setSpaceData] = useState<SpaceData | null>(null);
  const [venueData, setVenueData] = useState<VenueData | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchSpaceData = async () => {
      setLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        
        // Fetch space by ID
        const spaceResponse = await fetch(`${apiUrl}/api/venue/spaces/${spaceId}`);
        
        if (spaceResponse.ok) {
          const spaceDataResult = await spaceResponse.json();
          if (spaceDataResult.success && spaceDataResult.data.space) {
            const space = spaceDataResult.data.space;
            setSpaceData(space);
            
            // Fetch complete venue details
            if (space.venueId && typeof space.venueId === 'object') {
              // If venueId is populated, use its _id
              const venueId = space.venueId._id;
              const venueResponse = await fetch(`${apiUrl}/api/venue/${venueId}`);
              
              if (venueResponse.ok) {
                const venueDataResult = await venueResponse.json();
                if (venueDataResult.success && venueDataResult.data.venue) {
                  setVenueData(venueDataResult.data.venue);
                }
              }
            } else if (space.venueId) {
              // If venueId is just an ID string
              const venueResponse = await fetch(`${apiUrl}/api/venue/${space.venueId}`);
              
              if (venueResponse.ok) {
                const venueDataResult = await venueResponse.json();
                if (venueDataResult.success && venueDataResult.data.venue) {
                  setVenueData(venueDataResult.data.venue);
                }
              }
            }
            return;
          }
        }
        
        if (spaceResponse.status === 404) {
          toast.error('Space not found. Please check the URL.');
        } else {
          toast.error('Failed to load space data.');
        }
      } catch (error) {
        console.error('Fetch space error:', error);
        toast.error('An error occurred while fetching space data.');
      } finally {
        setLoading(false);
      }
    };

    if (spaceId) {
      fetchSpaceData();
    }
  }, [spaceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading space...</p>
        </div>
      </div>
    );
  }

  if (!loading && !spaceData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Space Not Found</h2>
          <p className="text-gray-600 mb-6">
            The space you're looking for doesn't exist or has been removed.
          </p>
          <Button
            onClick={() => router.push(`/allVenues/${venueId}`)}
            className="bg-red-600 hover:bg-red-700"
          >
            Back to Venue
          </Button>
        </div>
      </div>
    );
  }

  const displayImages = extractSpaceImages(spaceData);
  const startingPrice = spaceData?.pricing.basePrice || 0;
  const pricing = spaceData?.pricing;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Breadcrumb */}
        <div className="mb-4">
          <button
            onClick={() => router.push(`/allVenues/${venueId}`)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {venueData?.businessName || venueData?.name}
          </button>
        </div>

        {/* Hero Image */}
        {displayImages.length > 0 ? (
          <HeroCarousel images={displayImages} venueName={spaceData?.name || ''} />
        ) : (
          <div className="relative w-full aspect-[16/9] md:aspect-[21/9] overflow-hidden rounded-2xl bg-gray-200 flex flex-col items-center justify-center">
            <ImageIcon className="h-16 w-16 text-gray-400 mb-2" />
            <p className="text-gray-500">No images available</p>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="mt-6 lg:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                {spaceData?.name}
              </h1>

              <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold text-gray-900">
                    {(spaceData?.rating.average ?? 0).toFixed(1)}
                  </span>
                  <span>({spaceData?.rating.count ?? 0})</span>
                </div>
                <span className="text-gray-400">•</span>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{spaceData?.address.city}, {spaceData?.address.state}</span>
                </div>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-blue-600 font-medium">
                  Space at {venueData?.businessName || venueData?.name}
                </span>
              </div>

              {/* Quick Info Cards */}
              <div className="flex gap-3 overflow-x-auto scrollbar-hide py-1 -mx-1 px-1">
                {/* Capacity */}
                <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-card border border-surface-border min-w-fit shadow-sm">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      Upto {spaceData?.capacity}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Guests
                    </p>
                  </div>
                </div>

                {/* Type */}
                <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-card border border-surface-border min-w-fit shadow-sm">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {spaceData?.venueClassification?.indoorOutdoor || "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Space Type
                    </p>
                  </div>
                </div>

                {/* Starting Price */}
                <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-card border border-surface-border min-w-fit shadow-sm">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Award className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      ₹{startingPrice.toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Starting
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* About This Space */}
            <div className="bg-card rounded-xl border border-surface-border p-6 shadow-sm animate-fade-in">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                About this space
              </h2>

              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {spaceData?.description ||
                  "This beautiful space offers a perfect setting for your special events."}
              </p>

              {/* Contact Info */}
              <div className="space-y-3.5">
                {/* Address */}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${spaceData?.address.street}, ${spaceData?.address.city}, ${spaceData?.address.state} ${spaceData?.address.pincode}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 text-sm text-foreground hover:text-primary transition-colors group"
                >
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
                  <span>
                    {spaceData?.address.street}, {spaceData?.address.city},{" "}
                    {spaceData?.address.state} {spaceData?.address.pincode}
                  </span>
                </a>

                {/* Venue Phone */}
                {venueData?.phone && (
                  <a
                    href={`tel:${venueData.phone}`}
                    className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors"
                  >
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{venueData.phone}</span>
                  </a>
                )}

                {/* Venue Email */}
                {venueData?.email && (
                  <a
                    href={`mailto:${venueData.email}`}
                    className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors"
                  >
                    <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{venueData.email}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Facilities & Amenities */}
            {(spaceData?.amenities || spaceData?.facilities) && (
              <FacilitiesSection 
                amenities={spaceData.amenities} 
                facilities={spaceData.facilities} 
              />
            )}

            {/* Pricing Section */}
            <div className="bg-card rounded-xl border border-surface-border p-6 shadow-sm animate-fade-in">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Pricing
              </h2>

              {/* Base Price Highlight */}
              <div className="mb-5">
                {pricing?.basePrice !== undefined ? (
                  <>
                    <span className="text-3xl font-bold text-primary">
                      ₹{pricing.basePrice.toLocaleString("en-IN")}
                    </span>
                    <span className="text-sm text-muted-foreground ml-1.5">
                      base price
                    </span>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Contact the venue for base pricing details
                  </p>
                )}
              </div>

              {/* Pricing Rows */}
              <div className="space-y-3 mb-5">
                {pricing?.hourlyRate !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Hourly Rate</span>
                    <span className="font-medium text-foreground">
                      ₹{pricing.hourlyRate.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                {pricing?.halfDayRate !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Half Day</span>
                    <span className="font-medium text-foreground">
                      ₹{pricing.halfDayRate.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                {pricing?.fullDayRate !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Full Day</span>
                    <span className="font-medium text-foreground">
                      ₹{pricing.fullDayRate.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                {pricing?.cleaningFee !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cleaning Fee</span>
                    <span className="font-medium text-foreground">
                      ₹{pricing.cleaningFee.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                {pricing?.securityDeposit !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Security Deposit</span>
                    <span className="font-medium text-foreground">
                      ₹{pricing.securityDeposit.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column - Booking & Info */}
          <div className="space-y-6">
            {/* Booking Card */}
            <Card className="sticky top-20">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Book This Space</h3>
                    <p className="text-sm text-muted-foreground">
                      Check availability and book your event
                    </p>
                  </div>

                  <Button
                    onClick={() => router.push(`/allVenues/${venueId}/${spaceId}/checkout`)}
                    className="w-full"
                    size="lg"
                  >
                    Check Availability
                  </Button>

                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      No booking fees • Free cancellation
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

          
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}