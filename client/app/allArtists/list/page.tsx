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
  CheckCircle,
  TrendingUp,
  Award,
  Sparkles,
  ArrowRight
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import Footer from "../../Footer"
import Navbar from "../../Navbar"
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

export default function ArtistsListPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGenre, setSelectedGenre] = useState("all")
  const [selectedLocation, setSelectedLocation] = useState("all")
  const [sortBy, setSortBy] = useState("rating")
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  })

  const normalizeImageUrl = (url?: string) => {
    if (!url) return url;
    const trimmed = url.trim();

    const driveMatch = trimmed.match(/https?:\/\/drive\.google\.com\/file\/d\/([^/]+)\//i);
    if (driveMatch?.[1]) {
      return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
    }

    const driveOpenMatch = trimmed.match(/https?:\/\/drive\.google\.com\/open\?id=([^&]+)/i);
    if (driveOpenMatch?.[1]) {
      return `https://drive.google.com/uc?export=view&id=${driveOpenMatch[1]}`;
    }

    return trimmed;
  };

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
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!baseUrl) {
        toast.error('Missing NEXT_PUBLIC_API_URL');
        setArtists([]);
        setPagination({ current: 1, pages: 1, total: 0 });
        return;
      }

      const response = await fetch(`${baseUrl}/api/artist/public?${params}`);
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
        return <Headphones className="h-3.5 w-3.5" />
      case "bollywood":
      case "classical":
        return <Music className="h-3.5 w-3.5" />
      case "hip-hop":
      case "rap":
        return <Mic className="h-3.5 w-3.5" />
      case "indie":
      case "folk":
      case "acoustic":
        return <Guitar className="h-3.5 w-3.5" />
      case "fusion":
      case "jazz":
        return <Piano className="h-3.5 w-3.5" />
      case "rock":
        return <Drum className="h-3.5 w-3.5" />
      default:
        return <Music className="h-3.5 w-3.5" />
    }
  }

  const toggleFavorite = (artistId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(artistId)) {
        newFavorites.delete(artistId);
        toast.success('Removed from favorites');
      } else {
        newFavorites.add(artistId);
        toast.success('Added to favorites');
      }
      return newFavorites;
    });
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50 shadow-sm">
        <Navbar/>
      </header>

      

      {/* Enhanced Search and Filters */}
      <section className="py-6 sticky top-16 z-40 bg-white/95 backdrop-blur-xl border-b shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-3 items-center">
            {/* Search with better styling */}
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                type="text"
                placeholder="Search by name, genre, or city..."
                className="pl-12 h-12 border-2 focus:border-purple-400 rounded-xl shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Compact Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger className="w-36 h-12 rounded-xl border-2">
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

              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-36 h-12 rounded-xl border-2">
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
                <SelectTrigger className="w-40 h-12 rounded-xl border-2">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Top Rated</SelectItem>
                  <SelectItem value="bookings">Most Popular</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* <div className="flex items-center justify-between mt-3">
            <p className="text-sm text-muted-foreground font-medium">
              {filteredArtists.length} {filteredArtists.length === 1 ? 'artist' : 'artists'} available
            </p>
          </div> */}
        </div>
      </section>

      {/* Enhanced Artists Grid */}
      <section className="py-8 pb-16">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden border-2">
                  <div className="h-48 bg-gradient-to-br from-purple-100 to-pink-100 animate-pulse" />
                  <CardContent className="p-5">
                    <div className="space-y-3">
                      <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4" />
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredArtists.map((artist) => (
                <Card 
                  key={artist._id} 
                  className="group overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 hover:border-purple-200 rounded-2xl bg-white"
                >
                  {/* Enhanced Image Header */}
                  <div className="relative overflow-hidden h-48">
                    <Image
                      src={normalizeImageUrl(artist.gallery?.photos?.find(p => p.isProfileImage)?.url) || "/placeholder.svg"}
                      alt={`${artist.name}`}
                      width={600}
                      height={300}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {/* Floating Action Buttons */}
                    <div className="absolute top-3 right-3 flex gap-2">
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="h-9 w-9 p-0 rounded-full bg-white/90 hover:bg-white backdrop-blur-sm shadow-lg transition-all hover:scale-110"
                        onClick={() => toggleFavorite(artist._id)}
                      >
                        <Heart className={`h-4 w-4 ${favorites.has(artist._id) ? 'fill-red-500 text-red-500' : ''}`} />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="h-9 w-9 p-0 rounded-full bg-white/90 hover:bg-white backdrop-blur-sm shadow-lg transition-all hover:scale-110"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Top Performer Badge */}
                    {artist.totalBookings > 50 && (
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 shadow-lg">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Top Performer
                        </Badge>
                      </div>
                    )}
                    
                    {/* Artist Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-14 h-14 border-3 border-white shadow-xl ring-2 ring-purple-400/50">
                          <AvatarImage src={normalizeImageUrl(artist.gallery?.photos?.find(p => p.isProfileImage)?.url) || "/placeholder.svg"} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold">
                            {artist.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-bold text-lg truncate">{artist.name}</h3>
                            {artist.approvalStatus === 'approved' && (
                              <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-white/90 text-sm font-medium">{artist.type}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-5">
                    {/* Rating and Location */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-yellow-50 px-2.5 py-1 rounded-full">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-bold text-sm">{artist.rating?.average?.toFixed(1) || 'New'}</span>
                          <span className="text-xs text-muted-foreground">({artist.rating?.count || 0})</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="text-sm">{artist.city}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bio */}
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                      {artist.bio}
                    </p>

                    {/* Genres - Improved styling */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {(artist.genres?.slice(0, 3) || [artist.type]).map((genre, idx) => (
                        <Badge 
                          key={idx} 
                          variant="secondary" 
                          className="text-xs font-medium bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border border-purple-200/50 text-purple-700"
                        >
                          {getGenreIcon(genre)}
                          <span className="ml-1">{genre}</span>
                        </Badge>
                      ))}
                      {artist.genres?.length > 3 && (
                        <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                          +{artist.genres.length - 3}
                        </Badge>
                      )}
                    </div>

                    {/* Stats Row - Redesigned */}
                    {/* <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                      <div className="text-center">
                        <div className="font-bold text-lg text-purple-700">{artist.totalBookings || 0}</div>
                        <div className="text-xs text-muted-foreground font-medium">Bookings</div>
                      </div>
                      <div className="text-center border-l border-purple-200">
                        <div className="font-bold text-lg text-pink-700">
                          {artist.socialLinks?.instagram || artist.socialLinks?.youtube ? 'Active' : 'New'}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium">Status</div>
                      </div>
                    </div> */}

                    {/* Price Tag - Enhanced */}
                    <div className="flex items-center justify-between mb-4 p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-0.5">Starting from</p>
                        <p className="font-bold text-xl text-orange-700">
                          ₹{artist.basePrice?.toLocaleString() || 'Custom'}
                        </p>
                      </div>
                      {artist.socialLinks && (
                        <div className="flex gap-1.5">
                          {artist.socialLinks.instagram && (
                            <a 
                              href={artist.socialLinks.instagram} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="h-8 w-8 rounded-full bg-white flex items-center justify-center hover:bg-pink-50 transition-colors border border-pink-200"
                            >
                              <Instagram className="h-4 w-4 text-pink-600" />
                            </a>
                          )}
                          {artist.socialLinks.youtube && (
                            <a 
                              href={artist.socialLinks.youtube} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="h-8 w-8 rounded-full bg-white flex items-center justify-center hover:bg-red-50 transition-colors border border-red-200"
                            >
                              <Youtube className="h-4 w-4 text-red-600" />
                            </a>
                          )}
                          {artist.socialLinks.facebook && (
                            <a 
                              href={artist.socialLinks.facebook} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="h-8 w-8 rounded-full bg-white flex items-center justify-center hover:bg-blue-50 transition-colors border border-blue-200"
                            >
                              <Facebook className="h-4 w-4 text-blue-600" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons - Improved */}
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all group/btn" 
                        asChild
                      >
                        <Link href={`/artist/profile/${artist._id}`}>
                          View Profile
                          <ArrowRight className="h-4 w-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 rounded-xl border-2 border-purple-200 hover:bg-purple-50 hover:border-purple-300 font-semibold transition-all" 
                        asChild
                      >
                        <Link href={`/artist/profile/${artist._id}?book=true`}>
                          <Ticket className="h-4 w-4 mr-1" />
                          Book
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State - Enhanced */}
          {!loading && filteredArtists.length === 0 && (
            <div className="text-center py-16">
              <div className="mb-6 relative inline-block">
                <div className="text-8xl">🎭</div>
                <div className="absolute -bottom-2 -right-2 bg-purple-100 rounded-full p-2">
                  <Search className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2">No artists found</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                We couldn't find any artists matching your criteria. Try adjusting your filters or search terms.
              </p>
              <Button
                size="lg"
                className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedGenre("all")
                  setSelectedLocation("all")
                  fetchArtists()
                }}
              >
                Clear All Filters
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