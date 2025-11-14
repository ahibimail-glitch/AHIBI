"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Users,
  Star,
  Search,
  Filter,
  Car,
  Snowflake,
  Wifi,
  Music,
  Zap,
  Shield,
  UtensilsCrossed,
  Loader2,
  Grid3x3,
  List,
  Bookmark,
  Building2,
  Home,
  Heart,
  Share2,
  ArrowRight,
  Sparkles,
  Check,
} from "lucide-react";
import Image from "next/image";
import Navbar from "../../Navbar";
import Footer from "../../Footer";
import { toast } from "sonner";

interface Venue {
  _id: string;
  name: string;
  description: string;
  ownerDetails?: {
    businessName: string;
    fullName: string;
    email: string;
    primaryContact: string;
  };
  venueClassification?: {
    venueTypes: string[];
    indoorOutdoor: string;
    operationMode: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
    googleMapsLink?: string;
  };
  capacity: number;
  capacityDetails?: {
    standingCapacity: number;
    seatingCapacity: {
      theatreStyle?: number;
      roundTable?: number;
    };
    minimumBookingCapacity?: number;
    multipleEventsPerDay: boolean;
    timeSlots: string[];
    advanceBookingDays: number;
  };
  parking?: {
    carCapacity: number;
    twoWheelerAvailable: boolean;
  };
  accessibility?: {
    wheelchairAccess: boolean;
    liftElevator: boolean;
    nearbyTransport: {
      airport: boolean;
      railwayStation: boolean;
      taxiService: boolean;
    };
  };
  pricing: {
    basePrice: number;
    hourlyRate?: number;
    rentalIncludes?: string[];
    securityDepositRequired?: boolean;
    paymentModes?: string[];
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
  policies?: {
    operatingHours: {
      startTime: string;
      endTime: string;
    };
    smokingPolicy: string;
    alcoholServingPermission: boolean;
  };
  addOnServices?: {
    [key: string]: {
      available: boolean;
      description?: string;
    };
  };
  gallery: Array<{
    url: string;
    caption?: string;
    isMain?: boolean;
  }>;
  documents?: {
    venueImages: Array<{
      url: string;
      caption: string;
      isMain: boolean;
    }>;
  };
  rating: {
    average: number;
    count: number;
  };
  totalBookings: number;
  approvalStatus: string;
  isPopular?: boolean;
  isVerified?: boolean;
}

const facilityIcons: { [key: string]: any } = {
  parking: Car,
  ac: Snowflake,
  wifi: Wifi,
  soundSystem: Music,
  lighting: Zap,
  security: Shield,
  catering: UtensilsCrossed,
};

export default function AllVenuesPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [minCapacity, setMinCapacity] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [liked, setLiked] = useState<{ [key: string]: boolean }>({});
  const [bookmarked, setBookmarked] = useState<{ [key: string]: boolean }>({});

  // Helper function to count facilities
  const getFacilityCount = (facilities: { [key: string]: boolean }) => {
    return Object.values(facilities).filter(Boolean).length;
  };

  // Toggle like function
  const toggleLike = (e: React.MouseEvent, venueId: string) => {
    e.stopPropagation();
    setLiked(prev => ({
      ...prev,
      [venueId]: !prev[venueId]
    }));
  };

  // Toggle bookmark function
  const toggleBookmark = (e: React.MouseEvent, venueId: string) => {
    e.stopPropagation();
    setBookmarked(prev => ({
      ...prev,
      [venueId]: !prev[venueId]
    }));
  };

  // Handle share function
  const handleShare = (e: React.MouseEvent, venue: Venue) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: venue.name,
        text: venue.description,
        url: window.location.origin + `/allVenues/${venue._id}`,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.origin + `/allVenues/${venue._id}`);
      toast.success('Venue link copied to clipboard!');
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  useEffect(() => {
    filterVenues();
  }, [searchQuery, selectedCity, minCapacity, venues]);

  const fetchVenues = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue/`);
      const data = await response.json();
      
      if (data.success) {
        setVenues(data.data.venues);
        setFilteredVenues(data.data.venues);
        
        // Extract unique cities
        const uniqueCities = Array.from(
          new Set(data.data.venues.map((v: Venue) => v.address.city))
        ) as string[];
        setCities(uniqueCities);
      } else {
        toast.error('Failed to load venues');
      }
    } catch (error) {
      console.error('Error fetching venues:', error);
      toast.error('Failed to load venues');
    } finally {
      setLoading(false);
    }
  };

  const filterVenues = () => {
    let filtered = [...venues];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (venue) =>
          venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          venue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          venue.address.city.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // City filter
    if (selectedCity !== "all") {
      filtered = filtered.filter((venue) => venue.address.city === selectedCity);
    }

    // Capacity filter
    if (minCapacity) {
      filtered = filtered.filter((venue) => venue.capacity >= parseInt(minCapacity));
    }

    setFilteredVenues(filtered);
  };

  const handleVenueClick = (venueId: string) => {
    router.push(`/allVenues/${venueId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Header Section */}
      {/* <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Wedding Venues in Bangalore
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Showing {filteredVenues.length} results as per your search criteria
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Need Help?</span>
                <span className="text-pink-600 font-semibold">WMG Genie</span>
                <span className="text-gray-600">can help out!</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="gap-2"
                >
                  <List className="h-4 w-4" />
                  List
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="gap-2"
                >
                  <Grid3x3 className="h-4 w-4" />
                  Grid
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div> */}

      {/* Filters Section */}
      <div className="container mx-auto px-4 py-6">
        <Card className="border shadow-m">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search venues..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* City Filter */}
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Capacity Filter */}
              <div className="space-y-2">
                <Label htmlFor="capacity">Min Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  placeholder="e.g., 100"
                  value={minCapacity}
                  onChange={(e) => setMinCapacity(e.target.value)}
                />
              </div>

              {/* Clear Filters */}
              <div className="space-y-2 flex items-end">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCity("all");
                    setMinCapacity("");
                  }}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Venues Grid/List */}
 <div className="container mx-auto px-4 pb-12">
        {filteredVenues.length === 0 ? (
          <div className="max-w-md mx-auto">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600 text-lg font-medium">No venues found</p>
              <p className="text-gray-500 text-sm mt-2">Try adjusting your search criteria</p>
            </div>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-8"}>
            {filteredVenues.map((venue) => {
              const galleryImages = venue.gallery || [];
              const venueImages = venue.documents?.venueImages || [];
              const allImages = [...galleryImages, ...venueImages];
              const imageUrl = allImages.length > 0 
                ? (allImages.find(img => img.isMain)?.url || allImages[0].url)
                : "https://images.unsplash.com/photo-1519167758481-83f550bb49b3";
              
              const facilityCount = getFacilityCount(venue.facilities);

              return (
                <div
                  key={venue._id}
                  className="group relative bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-500 cursor-pointer border border-gray-100/50 hover:border-pink-100"
                  onClick={() => handleVenueClick(venue._id)}
                >
                  {/* Premium Badge */}
                  {venue.isPopular && (
                    <div className="absolute top-4 left-4 z-20 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" />
                      Popular
                    </div>
                  )}

                  {/* Verified Badge */}
                  {venue.isVerified && (
                    <div className="absolute top-4 left-4 z-20 bg-blue-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1.5">
                      <Check className="h-3 w-3" />
                      Verified
                    </div>
                  )}

                  {/* Image Container */}
                  <div className="relative h-72 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50">
                    <img
                      src={imageUrl}
                      alt={venue.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "https://images.unsplash.com/photo-1519167758481-83f550bb49b3";
                      }}
                    />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 flex gap-2 z-10">
                      <button 
                        onClick={(e) => toggleLike(e, venue._id)}
                        className="bg-white/95 backdrop-blur-md p-2.5 rounded-full hover:bg-white transition-all duration-300 shadow-lg hover:scale-110 active:scale-95"
                      >
                        <Heart 
                          className={`h-5 w-5 transition-colors ${liked[venue._id] ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} 
                        />
                      </button>
                      <button 
                        onClick={(e) => toggleBookmark(e, venue._id)}
                        className="bg-white/95 backdrop-blur-md p-2.5 rounded-full hover:bg-white transition-all duration-300 shadow-lg hover:scale-110 active:scale-95"
                      >
                        <Bookmark 
                          className={`h-5 w-5 transition-colors ${bookmarked[venue._id] ? 'fill-pink-600 text-pink-600' : 'text-gray-700'}`} 
                        />
                      </button>
                      <button 
                        onClick={(e) => handleShare(e, venue)}
                        className="bg-white/95 backdrop-blur-md p-2.5 rounded-full hover:bg-white transition-all duration-300 shadow-lg hover:scale-110 active:scale-95"
                      >
                        <Share2 className="h-5 w-5 text-gray-700" />
                      </button>
                    </div>

                    {/* Quick View Button - Appears on Hover */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
                      <button className="bg-white text-gray-900 px-6 py-2.5 rounded-full font-semibold text-sm shadow-xl hover:bg-gray-50 transition-colors flex items-center gap-2">
                        Quick View
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {/* Venue Name & Rating */}
                    <div className="mb-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-pink-600 transition-colors">
                          {venue.name}
                        </h3>
                        <div className="flex items-center gap-1 bg-gradient-to-r from-amber-50 to-orange-50 px-2.5 py-1 rounded-lg border border-amber-100 flex-shrink-0">
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          <span className="font-bold text-sm text-gray-900">{venue.rating.average}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{venue.rating.count} reviews</span>
                        <span>•</span>
                        <span className="capitalize">
                          {venue.venueClassification?.indoorOutdoor?.replace('_', '/')}
                        </span>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-start gap-2 mb-4 group/location">
                      <MapPin className="h-4 w-4 text-pink-500 mt-0.5 flex-shrink-0 group-hover/location:scale-110 transition-transform" />
                      <span className="text-sm text-gray-600 leading-relaxed">
                        {venue.address.street}, <span className="font-medium text-gray-900">{venue.address.city}</span>
                      </span>
                    </div>

                    {/* Venue Type Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {venue.venueClassification?.venueTypes?.slice(0, 2).map((type, idx) => (
                        <span 
                          key={idx}
                          className="px-3 py-1 bg-gradient-to-r from-pink-50 to-purple-50 text-pink-700 text-xs font-medium rounded-full border border-pink-100"
                        >
                          {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      ))}
                    </div>

                    {/* Key Features */}
                    <div className="grid grid-cols-2 gap-3 mb-5 pb-5 border-b border-gray-100">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-9 h-9 bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg flex items-center justify-center">
                          <Users className="h-4 w-4 text-pink-600" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Capacity</div>
                          <div className="font-semibold text-gray-900">
                            {venue.capacityDetails?.standingCapacity || venue.capacity}
                          </div>
                        </div>
                      </div>

                      {venue.parking && venue.parking.carCapacity > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-9 h-9 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg flex items-center justify-center">
                            <Car className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Parking</div>
                            <div className="font-semibold text-gray-900">{venue.parking.carCapacity} cars</div>
                          </div>
                        </div>
                      )}

                      {facilityCount > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-9 h-9 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Facilities</div>
                            <div className="font-semibold text-gray-900">{facilityCount} available</div>
                          </div>
                        </div>
                      )}

                      {venue.accessibility?.wheelchairAccess && (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-9 h-9 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg flex items-center justify-center">
                            <span className="text-base">♿</span>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Access</div>
                            <div className="font-semibold text-gray-900">Wheelchair</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Pricing */}
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                            ₹{venue.pricing?.basePrice ? venue.pricing.basePrice.toLocaleString('en-IN') : 'POA'}
                          </span>
                          {venue.pricing?.hourlyRate && (
                            <span className="text-xs text-gray-500">
                              +₹{venue.pricing.hourlyRate.toLocaleString('en-IN')}/hr
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">Base price</div>
                        {venue.pricing?.securityDepositRequired && (
                          <div className="mt-1 inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                            Deposit required
                          </div>
                        )}
                      </div>
                      
                      <button className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:shadow-lg hover:scale-105 transition-all duration-300 active:scale-95">
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
