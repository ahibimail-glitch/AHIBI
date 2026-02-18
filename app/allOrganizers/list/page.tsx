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
  Calendar,
  Briefcase,
  Award,
  CheckCircle,
  Loader2,
  Building2,
  Mail,
  Phone,
} from "lucide-react";
import Image from "next/image";
import Navbar from "../../Navbar";
import Footer from "../../Footer";
import { toast } from "sonner";

interface Organizer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  bio?: string;
  location?: {
    city: string;
    state: string;
    country: string;
  };
  specialization?: string[];
  eventsOrganized?: number;
  rating?: {
    average: number;
    count: number;
  };
  verified?: boolean;
  profileImage?: string;
  createdAt?: string;
}

const specializationOptions = [
  "Weddings",
  "Corporate Events",
  "Concerts",
  "Festivals",
  "Conferences",
  "Private Parties",
  "Cultural Events",
  "Sports Events",
];

export default function AllOrganizersPage() {
  const router = useRouter();
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [filteredOrganizers, setFilteredOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedSpecialization, setSelectedSpecialization] = useState("all");
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    fetchOrganizers();
  }, []);

  useEffect(() => {
    filterOrganizers();
  }, [searchQuery, selectedCity, selectedSpecialization, organizers]);

  const fetchOrganizers = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/organizer`);
      const data = await response.json();
      
      if (data.success) {
        setOrganizers(data.data.organizers || data.data || []);
        setFilteredOrganizers(data.data.organizers || data.data || []);
        
        // Extract unique cities
        const uniqueCities = Array.from(
          new Set(
            (data.data.organizers || data.data || [])
              .filter((o: Organizer) => o.location?.city)
              .map((o: Organizer) => o.location!.city)
          )
        ) as string[];
        setCities(uniqueCities);
      } else {
        toast.error('Failed to load organizers');
      }
    } catch (error) {
      console.error('Error fetching organizers:', error);
      toast.error('Failed to load organizers');
    } finally {
      setLoading(false);
    }
  };

  const filterOrganizers = () => {
    let filtered = [...organizers];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (organizer) =>
          organizer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          organizer.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          organizer.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          organizer.location?.city?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // City filter
    if (selectedCity !== "all") {
      filtered = filtered.filter((organizer) => organizer.location?.city === selectedCity);
    }

    // Specialization filter
    if (selectedSpecialization !== "all") {
      filtered = filtered.filter((organizer) => 
        organizer.specialization?.includes(selectedSpecialization)
      );
    }

    setFilteredOrganizers(filtered);
  };

  const handleOrganizerClick = (organizerId: string) => {
    router.push(`/organizer/${organizerId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-100">
      <Navbar />

      {/* Hero Section */}
      

      {/* Filters Section */}
      <div className="container mx-auto px-4 mb-8">
        <Card className="bg-white/80 backdrop-blur-sm border-emerald-200/50 shadow-xl">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search organizers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-emerald-200 focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* City Filter */}
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger className="border-emerald-200">
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

              {/* Specialization Filter */}
              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Select value={selectedSpecialization} onValueChange={setSelectedSpecialization}>
                  <SelectTrigger className="border-emerald-200">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {specializationOptions.map((spec) => (
                      <SelectItem key={spec} value={spec}>
                        {spec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              <div className="space-y-2 flex items-end">
                <Button
                  variant="outline"
                  className="w-full border-emerald-200 hover:bg-emerald-50"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCity("all");
                    setSelectedSpecialization("all");
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

      {/* Organizers Grid */}
      <div className="container mx-auto px-4 pb-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {filteredOrganizers.length} Organizer{filteredOrganizers.length !== 1 ? 's' : ''} Available
          </h2>
        </div>

        {filteredOrganizers.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-emerald-200/50 shadow-xl">
            <CardContent className="p-12 text-center">
              <p className="text-gray-600 text-lg">No organizers found matching your criteria</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrganizers.map((organizer) => (
              <Card
                key={organizer._id}
                className="bg-white/80 backdrop-blur-sm border-emerald-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden group"
                onClick={() => handleOrganizerClick(organizer._id)}
              >
                {/* Profile Header */}
                <div className="relative h-32 bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-500">
                  <div className="absolute -bottom-12 left-6">
                    <div className="relative w-24 h-24 rounded-full border-4 border-white bg-white overflow-hidden">
                      {organizer.profileImage ? (
                        <Image
                          src={organizer.profileImage}
                          alt={organizer.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center">
                          <Users className="h-12 w-12 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                  {organizer.verified && (
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center space-x-1">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span className="font-semibold text-xs text-emerald-600">Verified</span>
                    </div>
                  )}
                </div>

                <CardHeader className="pt-14">
                  <CardTitle className="text-xl flex items-center gap-2">
                    {organizer.name}
                    {organizer.rating && organizer.rating.average > 0 && (
                      <div className="flex items-center space-x-1 text-sm font-normal">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span>{organizer.rating.average.toFixed(1)}</span>
                      </div>
                    )}
                  </CardTitle>
                  {organizer.companyName && (
                    <CardDescription className="flex items-center text-gray-600">
                      <Building2 className="h-4 w-4 mr-1" />
                      {organizer.companyName}
                    </CardDescription>
                  )}
                  {organizer.location && (
                    <CardDescription className="flex items-center text-gray-600">
                      <MapPin className="h-4 w-4 mr-1" />
                      {organizer.location.city}, {organizer.location.state}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  {organizer.bio && (
                    <p className="text-sm text-gray-600 line-clamp-2">{organizer.bio}</p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{organizer.eventsOrganized || 0} Events</span>
                    </div>
                    {organizer.rating && organizer.rating.count > 0 && (
                      <div className="text-gray-600">
                        {organizer.rating.count} Review{organizer.rating.count !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  {/* Specializations */}
                  {organizer.specialization && organizer.specialization.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {organizer.specialization.slice(0, 3).map((spec) => (
                        <Badge key={spec} variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                          <Award className="h-3 w-3 mr-1" />
                          {spec}
                        </Badge>
                      ))}
                      {organizer.specialization.length > 3 && (
                        <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                          +{organizer.specialization.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    {organizer.email && (
                      <div className="flex items-center text-xs text-gray-600">
                        <Mail className="h-3 w-3 mr-2" />
                        <span className="truncate">{organizer.email}</span>
                      </div>
                    )}
                    {organizer.phone && (
                      <div className="flex items-center text-xs text-gray-600">
                        <Phone className="h-3 w-3 mr-2" />
                        <span>{organizer.phone}</span>
                      </div>
                    )}
                  </div>

                  <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                    View Profile
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
