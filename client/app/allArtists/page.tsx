"use client"

import { useState } from "react"
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

export default function ArtistsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGenre, setSelectedGenre] = useState("all")
  const [selectedLocation, setSelectedLocation] = useState("all")
  const [sortBy, setSortBy] = useState("rating")
  const [viewMode, setViewMode] = useState("grid")

  const artists = [
    {
      id: 1,
      name: "DJ Rhythm",
      stageName: "DJ Rhythm",
      bio: "Professional DJ with 10+ years of experience in electronic music and live performances.",
      avatar: "/placeholder.svg?height=150&width=150",
      coverImage: "/placeholder.svg?height=300&width=500",
      genre: ["Electronic", "House", "Techno"],
      location: "Mumbai, India",
      rating: 4.8,
      totalBookings: 156,
      basePrice: "₹25,000",
      verified: true,
      languages: ["Hindi", "English"],
      socialLinks: {
        instagram: "@djrhythm",
        youtube: "DJRhythmOfficial",
        facebook: "djrhythm.music",
      },
      upcomingEvents: [
        {
          id: 1,
          title: "Summer Music Festival",
          date: "July 25, 2024",
          venue: "Central Park Arena",
          location: "Mumbai",
          price: "₹35,000",
          status: "confirmed",
        },
        {
          id: 2,
          title: "Corporate Party",
          date: "August 5, 2024",
          venue: "Hotel Taj",
          location: "Delhi",
          price: "₹45,000",
          status: "confirmed",
        },
      ],
    },
    {
      id: 2,
      name: "Priya Sharma",
      stageName: "Priya Live",
      bio: "Bollywood playback singer and live performer with soulful voice and stage presence.",
      avatar: "/placeholder.svg?height=150&width=150",
      coverImage: "/placeholder.svg?height=300&width=500",
      genre: ["Bollywood", "Classical", "Folk"],
      location: "Delhi, India",
      rating: 4.9,
      totalBookings: 89,
      basePrice: "₹40,000",
      verified: true,
      languages: ["Hindi", "Punjabi", "English"],
      socialLinks: {
        instagram: "@priyalive",
        youtube: "PriyaSharmaMusic",
      },
      upcomingEvents: [
        {
          id: 3,
          title: "Wedding Sangam",
          date: "July 30, 2024",
          venue: "Grand Palace",
          location: "Delhi",
          price: "₹50,000",
          status: "confirmed",
        },
      ],
    },
    {
      id: 3,
      name: "Arjun Beats",
      stageName: "Arjun Beats",
      bio: "Hip-hop artist and music producer creating fresh beats and memorable performances.",
      avatar: "/placeholder.svg?height=150&width=150",
      coverImage: "/placeholder.svg?height=300&width=500",
      genre: ["Hip-Hop", "Rap", "R&B"],
      location: "Bangalore, India",
      rating: 4.6,
      totalBookings: 67,
      basePrice: "₹20,000",
      verified: true,
      languages: ["English", "Hindi", "Kannada"],
      socialLinks: {
        instagram: "@arjunbeats",
        youtube: "ArjunBeatsOfficial",
      },
      upcomingEvents: [
        {
          id: 4,
          title: "Youth Music Fest",
          date: "August 12, 2024",
          venue: "Tech Park Amphitheater",
          location: "Bangalore",
          price: "₹25,000",
          status: "confirmed",
        },
        {
          id: 5,
          title: "College Festival",
          date: "August 20, 2024",
          venue: "University Grounds",
          location: "Pune",
          price: "₹22,000",
          status: "pending",
        },
      ],
    },
    {
      id: 4,
      name: "Kavya Acoustic",
      stageName: "Kavya",
      bio: "Indie folk singer-songwriter with acoustic guitar and heartfelt original compositions.",
      avatar: "/placeholder.svg?height=150&width=150",
      coverImage: "/placeholder.svg?height=300&width=500",
      genre: ["Indie", "Folk", "Acoustic"],
      location: "Pune, India",
      rating: 4.7,
      totalBookings: 45,
      basePrice: "₹15,000",
      verified: false,
      languages: ["English", "Hindi", "Marathi"],
      socialLinks: {
        instagram: "@kavyaacoustic",
        youtube: "KavyaMusic",
      },
      upcomingEvents: [
        {
          id: 6,
          title: "Cafe Sessions",
          date: "July 28, 2024",
          venue: "Blue Tokai Coffee",
          location: "Pune",
          price: "₹18,000",
          status: "confirmed",
        },
      ],
    },
    {
      id: 5,
      name: "The Fusion Band",
      stageName: "Fusion Collective",
      bio: "5-piece band blending Indian classical with contemporary rock and jazz elements.",
      avatar: "/placeholder.svg?height=150&width=150",
      coverImage: "/placeholder.svg?height=300&width=500",
      genre: ["Fusion", "Rock", "Jazz"],
      location: "Chennai, India",
      rating: 4.8,
      totalBookings: 78,
      basePrice: "₹60,000",
      verified: true,
      languages: ["Tamil", "English", "Hindi"],
      socialLinks: {
        instagram: "@fusioncollective",
        youtube: "FusionCollectiveBand",
        facebook: "fusioncollective.music",
      },
      upcomingEvents: [
        {
          id: 7,
          title: "Music Festival Chennai",
          date: "August 15, 2024",
          venue: "Music Academy",
          location: "Chennai",
          price: "₹75,000",
          status: "confirmed",
        },
      ],
    },
    {
      id: 6,
      name: "Rohit Comedy",
      stageName: "Rohit Laughs",
      bio: "Stand-up comedian with observational humor and crowd interaction expertise.",
      avatar: "/placeholder.svg?height=150&width=150",
      coverImage: "/placeholder.svg?height=300&width=500",
      genre: ["Comedy", "Stand-up"],
      location: "Mumbai, India",
      rating: 4.5,
      totalBookings: 134,
      basePrice: "₹12,000",
      verified: true,
      languages: ["Hindi", "English", "Marathi"],
      socialLinks: {
        instagram: "@rohitlaughs",
        youtube: "RohitComedyOfficial",
      },
      upcomingEvents: [
        {
          id: 8,
          title: "Comedy Night Live",
          date: "July 26, 2024",
          venue: "Comedy Store",
          location: "Mumbai",
          price: "₹15,000",
          status: "confirmed",
        },
        {
          id: 9,
          title: "Corporate Event",
          date: "August 8, 2024",
          venue: "Business Hotel",
          location: "Gurgaon",
          price: "₹18,000",
          status: "confirmed",
        },
      ],
    },
  ]

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

  const filteredArtists = artists.filter((artist) => {
    const matchesSearch =
      artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artist.stageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artist.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artist.genre.some((g) => g.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesGenre =
      selectedGenre === "all" || artist.genre.some((g) => g.toLowerCase().includes(selectedGenre.toLowerCase()))

    const matchesLocation =
      selectedLocation === "all" || artist.location.toLowerCase().includes(selectedLocation.toLowerCase())

    return matchesSearch && matchesGenre && matchesLocation
  })

  const sortedArtists = [...filteredArtists].sort((a, b) => {
    switch (sortBy) {
      case "rating":
        return b.rating - a.rating
      case "bookings":
        return b.totalBookings - a.totalBookings
      case "price-low":
        return Number.parseInt(a.basePrice.replace(/[₹,]/g, "")) - Number.parseInt(b.basePrice.replace(/[₹,]/g, ""))
      case "price-high":
        return Number.parseInt(b.basePrice.replace(/[₹,]/g, "")) - Number.parseInt(a.basePrice.replace(/[₹,]/g, ""))
      case "name":
        return a.name.localeCompare(b.name)
      default:
        return 0
    }
  })

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
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              {artists.length}+ Verified Artists
            </div>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              {artists.reduce((sum, artist) => sum + artist.upcomingEvents.length, 0)} Upcoming Events
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
            <p className="text-muted-foreground">{sortedArtists.length} artists found</p>
          </div>
        </div>
      </section>

      {/* Artists Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {sortedArtists.map((artist) => (
              <Card key={artist.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Artist Header */}
                <div className="relative">
                  <Image
                    src={artist.coverImage || "/placeholder.svg"}
                    alt={`${artist.name} cover`}
                    width={500}
                    height={200}
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-16 h-16 border-2 border-white">
                        <AvatarImage src={artist.avatar || "/placeholder.svg"} />
                        <AvatarFallback>
                          {artist.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-white font-bold text-lg">{artist.stageName}</h3>
                          {artist.verified && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                              Verified
                            </Badge>
                          )}
                        </div>
                        <p className="text-white/90 text-sm">{artist.name}</p>
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
                          {artist.rating} ({artist.totalBookings} bookings)
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {artist.location}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Starting from</p>
                        <p className="font-bold text-lg">{artist.basePrice}</p>
                      </div>
                    </div>

                    <p className="text-muted-foreground text-sm mb-3">{artist.bio}</p>

                    {/* Genres */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {artist.genre.map((genre) => (
                        <Badge key={genre} variant="outline" className="text-xs">
                          {getGenreIcon(genre)}
                          <span className="ml-1">{genre}</span>
                        </Badge>
                      ))}
                    </div>

                    {/* Languages */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {artist.languages.map((lang) => (
                        <Badge key={lang} variant="secondary" className="text-xs">
                          {lang}
                        </Badge>
                      ))}
                    </div>

                    {/* Social Links */}
                    <div className="flex space-x-2 mb-4">
                      {artist.socialLinks.instagram && (
                        <Button size="sm" variant="outline" className="p-2 bg-transparent">
                          <Instagram className="h-4 w-4" />
                        </Button>
                      )}
                      {artist.socialLinks.youtube && (
                        <Button size="sm" variant="outline" className="p-2 bg-transparent">
                          <Youtube className="h-4 w-4" />
                        </Button>
                      )}
                      {artist.socialLinks.facebook && (
                        <Button size="sm" variant="outline" className="p-2 bg-transparent">
                          <Facebook className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Upcoming Events */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm">Upcoming Events</h4>
                      <Badge variant="outline" className="text-xs">
                        {artist.upcomingEvents.length} events
                      </Badge>
                    </div>

                    {artist.upcomingEvents.length > 0 ? (
                      <div className="space-y-2">
                        {artist.upcomingEvents.slice(0, 2).map((event) => (
                          <div key={event.id} className="p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <h5 className="font-medium text-sm">{event.title}</h5>
                              <Badge
                                variant={event.status === "confirmed" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {event.status}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center space-x-3">
                                <span className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {event.date}
                                </span>
                                <span className="flex items-center">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {event.venue}, {event.location}
                                </span>
                              </div>
                              <span className="font-medium text-green-600">{event.price}</span>
                            </div>
                          </div>
                        ))}
                        {artist.upcomingEvents.length > 2 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{artist.upcomingEvents.length - 2} more events
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No upcoming events scheduled</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 mt-4">
                    <Button className="flex-1" asChild>
                      <Link href={`/profile/artist?id=${artist.id}`}>View Profile</Link>
                    </Button>
                    <Button variant="outline" className="flex-1 bg-transparent">
                      Book Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {sortedArtists.length === 0 && (
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
