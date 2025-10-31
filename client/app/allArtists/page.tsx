"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  Star,
  Users,
  Music,
  Mic,
  Guitar,
  Headphones,
  Piano,
  Drum,
  Heart,
  Share2,
  Instagram,
  Youtube,
  Facebook,
  Ticket,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import Footer from "../Footer"
import Navbar from "../Navbar"
import CastSection from "@/components/ui/cast-carausel"
import CastCarousel from "@/components/ui/cast-carausel"
import ArtistCarousel from "@/components/ui/cast-carausel"
import { toast } from "sonner"

interface Artist {
  _id: string;
  name: string;
  bio: string;
  genres: string[];
  type: string;
  basePrice: number;
  city: string;
  rating: {
    average: number;
    count: number;
  };
  totalBookings: number;
  gallery: {
    photos: Array<{
      url: string;
      caption?: string;
      isProfileImage?: boolean;
    }>;
  };
  socialLinks: {
    instagram?: string;
    youtube?: string;
    spotify?: string;
    facebook?: string;
    twitter?: string;
    website?: string;
  };
  approvalStatus: string;
  status: string;
}

export default function ArtistsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGenre, setSelectedGenre] = useState("all")
  const [selectedLocation, setSelectedLocation] = useState("all")
  const [sortBy, setSortBy] = useState("rating")
  const [viewMode, setViewMode] = useState("grid")
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  })

  // Fetch artists from API
  useEffect(() => {
    fetchArtists();
  }, [selectedGenre, selectedLocation, sortBy]);

  const fetchArtists = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (selectedGenre !== 'all') params.append('genre', selectedGenre);
      if (selectedLocation !== 'all') params.append('city', selectedLocation);
      params.append('sortBy', sortBy === 'rating' ? 'rating.average' : sortBy);
      
      const response = await fetch(`/api/artist/public?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setArtists(data.data.artists);
        setPagination(data.data.pagination);
      } else {
        toast.error('Failed to load artists');
      }
    } catch (error) {
      console.error('Error fetching artists:', error);
      toast.error('Failed to load artists');
    } finally {
      setLoading(false);
    }
  };

  const genres = [
    "Electronic",
    "Bollywood",
    "Hip-Hop",
    "Indie",
    "Fusion",
    "Comedy",
    "Classical",
    "Rock",
    "Jazz",
    "Folk",
  ]
  const locations = ["Mumbai", "Delhi", "Bangalore", "Pune", "Chennai", "Hyderabad", "Kolkata", "Ahmedabad"]

  const getGenreIcon = (genre: string) => {
    switch (genre.toLowerCase()) {
      case "electronic":
      case "house":
      case "techno":
        return <Headphones className="h-4 w-4" />
      case "bollywood":
      case "classical":
        return <Music className="h-4 w-4" />
      case "hip-hop":
      case "rap":
        return <Mic className="h-4 w-4" />
      case "indie":
      case "folk":
      case "acoustic":
        return <Guitar className="h-4 w-4" />
      case "fusion":
      case "jazz":
        return <Piano className="h-4 w-4" />
      case "rock":
        return <Drum className="h-4 w-4" />
      default:
        return <Music className="h-4 w-4" />
    }
  }

  // Filter artists based on search query (client-side filtering for search)
  const filteredArtists = artists.filter((artist) => {
    if (!searchQuery) return true;
    
    const matchesSearch =
      artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artist.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artist.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artist.genres.some((g) => g.toLowerCase().includes(searchQuery.toLowerCase())) ||
      artist.type.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <Navbar/>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-600 via-pink-600 to-red-500 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">Discover Amazing Artists</h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8">Connect with talented performers for your next event</p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-white/90">
            <div className="flex items-center space-x-4 text-sm text-white/90">
              <Users className="h-5 w-5 mr-2" />
              {pagination.total}+ Verified Artists
            </div>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Live Performances Available
            </div>
            <div className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              {locations.length}+ Cities
            </div>
          </div>
        </div>
      </section>
      <ArtistCarousel/>

      {/* Search and Filters */}
      <section className="py-8 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search artists, genres, or locations..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Genre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genres</SelectItem>
                    {genres.map((genre) => (
                      <SelectItem key={genre} value={genre.toLowerCase()}>
                        {genre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location} value={location.toLowerCase()}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="bookings">Most Booked</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-muted-foreground">{filteredArtists.length} artists found</p>
          </div>
        </div>
      </section>

      {/* Artists Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="h-32 bg-muted animate-pulse" />
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                      <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                      <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {filteredArtists.map((artist) => (
              <Card key={artist._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Artist Header */}
                <div className="relative">
                  <Image
                    src={artist.gallery?.photos?.find(p => p.isProfileImage)?.url || "/placeholder.svg"}
                    alt={`${artist.name} cover`}
                    width={500}
                    height={200}
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-16 h-16 border-2 border-white">
                        <AvatarImage src={artist.gallery?.photos?.find(p => p.isProfileImage)?.url || "/placeholder.svg"} />
                        <AvatarFallback>
                          {artist.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-white font-bold text-lg">{artist.name}</h3>
                          {artist.approvalStatus === 'approved' && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                              Verified
                            </Badge>
                          )}
                        </div>
                        <p className="text-white/90 text-sm">{artist.type}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 backdrop-blur-sm">
                        <Heart className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 backdrop-blur-sm">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <CardContent className="p-6">
                  {/* Artist Info */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 mr-1 text-yellow-500 fill-yellow-500" />
                          {artist.rating?.average || 0} ({artist.totalBookings || 0} bookings)
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {artist.city}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Starting from</p>
                        <p className="font-bold text-lg">₹{artist.basePrice?.toLocaleString() || 'Contact for pricing'}</p>
                      </div>
                    </div>

                    <p className="text-muted-foreground text-sm mb-3">{artist.bio}</p>

                    {/* Genres */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {artist.genres?.map((genre) => (
                        <Badge key={genre} variant="outline" className="text-xs">
                          {getGenreIcon(genre)}
                          <span className="ml-1">{genre}</span>
                        </Badge>
                      )) || (
                        <Badge variant="outline" className="text-xs">
                          {getGenreIcon(artist.type)}
                          <span className="ml-1">{artist.type}</span>
                        </Badge>
                      )}
                    </div>

                    {/* Social Links */}
                    <div className="flex space-x-2 mb-4">
                      {artist.socialLinks?.instagram && (
                        <Button size="sm" variant="outline" className="p-2 bg-transparent" asChild>
                          <a href={artist.socialLinks.instagram} target="_blank" rel="noopener noreferrer">
                            <Instagram className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {artist.socialLinks?.youtube && (
                        <Button size="sm" variant="outline" className="p-2 bg-transparent" asChild>
                          <a href={artist.socialLinks.youtube} target="_blank" rel="noopener noreferrer">
                            <Youtube className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {artist.socialLinks?.facebook && (
                        <Button size="sm" variant="outline" className="p-2 bg-transparent" asChild>
                          <a href={artist.socialLinks.facebook} target="_blank" rel="noopener noreferrer">
                            <Facebook className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Artist Stats */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm">Artist Stats</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <div className="font-semibold text-lg">{artist.totalBookings || 0}</div>
                        <div className="text-xs text-muted-foreground">Total Bookings</div>
                      </div>
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <div className="font-semibold text-lg">{artist.rating?.average?.toFixed(1) || 'New'}</div>
                        <div className="text-xs text-muted-foreground">Rating</div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 mt-4">
                    <Button className="flex-1" asChild>
                      <Link href={`/artist/profile/${artist._id}`}>View Profile</Link>
                    </Button>
                    <Button variant="outline" className="flex-1 bg-transparent" asChild>
                      <Link href={`/artist/profile/${artist._id}?book=true`}>Book Now</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
          )}

          {!loading && filteredArtists.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎭</div>
              <h3 className="text-xl font-semibold mb-2">No artists found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your search criteria or filters</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedGenre("all")
                  setSelectedLocation("all")
                  fetchArtists()
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <Footer/>
    </div>
  )
}
