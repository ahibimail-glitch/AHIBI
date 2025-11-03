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
} from "lucide-react";
import Image from "next/image";
import Navbar from "../../Navbar";
import Footer from "../../Footer";
import { toast } from "sonner";

interface Venue {
  _id: string;
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  capacity: number;
  pricing: {
    basePrice: number;
    hourlyRate?: number;
  };
  facilities: {
    [key: string]: boolean;
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

  useEffect(() => {
    fetchVenues();
  }, []);

  useEffect(() => {
    filterVenues();
  }, [searchQuery, selectedCity, minCapacity, venues]);

  const fetchVenues = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/venue`);
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
        <Navbar />
      {/* <div className="bg-transparent fixed w-full z-50">
      </div> */}

      {/* Hero Section */}
      {/* <div className="pt-20 pb-12 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4">
            Find Your Perfect Venue
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Discover and book amazing venues for your events
          </p>
        </div>
      </div> */}

      {/* Filters Section */}
      <div className="container mx-auto px-4 mb-8">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
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

      {/* Venues Grid */}
      <div className="container mx-auto px-4 pb-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {filteredVenues.length} Venue{filteredVenues.length !== 1 ? 's' : ''} Available
          </h2>
        </div>

        {filteredVenues.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="p-12 text-center">
              <p className="text-gray-600 text-lg">No venues found matching your criteria</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVenues.map((venue) => (
              <Card
                key={venue._id}
                className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden group"
                onClick={() => handleVenueClick(venue._id)}
              >
                {/* Venue Image */}
                <div className="relative h-48 overflow-hidden">
                  {venue.gallery && venue.gallery.length > 0 ? (
                    <Image
                      src={venue.gallery[0].url}
                      alt={venue.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
                      <MapPin className="h-16 w-16 text-white/50" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-semibold text-sm">{venue.rating.average || 0}</span>
                  </div>
                </div>

                <CardHeader>
                  <CardTitle className="text-xl">{venue.name}</CardTitle>
                  <CardDescription className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-1" />
                    {venue.address.city}, {venue.address.state}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600 line-clamp-2">{venue.description}</p>

                  {/* Venue Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      <Users className="h-4 w-4 mr-1" />
                      <span>Up to {venue.capacity}</span>
                    </div>
                    <div className="font-semibold text-purple-600">
                      ₹{venue.pricing.hourlyRate || venue.pricing.basePrice}/hr
                    </div>
                  </div>

                  {/* Facilities */}
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(venue.facilities)
                      .filter(([_, value]) => value)
                      .slice(0, 4)
                      .map(([key]) => {
                        const Icon = facilityIcons[key] || Star;
                        return (
                          <Badge key={key} variant="secondary" className="text-xs">
                            <Icon className="h-3 w-3 mr-1" />
                            {key}
                          </Badge>
                        );
                      })}
                  </div>

                  <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
