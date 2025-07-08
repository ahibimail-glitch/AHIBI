"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, MapPin, Users, Filter, Search, Heart } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import Navbar from "../Navbar"
import Footer from "../Footer"

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCity, setSelectedCity] = useState("all")
  const [selectedGenre, setSelectedGenre] = useState("all")
  const [selectedDate, setSelectedDate] = useState("all")

  const events = [
    {
      id: 1,
      title: "Summer Music Festival 2024",
      description: "The biggest music festival of the year featuring top artists",
      date: "July 15, 2024",
      time: "6:00 PM",
      venue: "Central Park Arena",
      location: "Mumbai, India",
      price: "₹1,500",
      originalPrice: "₹2,000",
      image: "/placeholder.svg?height=200&width=300",
      tags: ["Music", "Festival", "Outdoor"],
      organizer: "MusicEvents Pro",
      attendees: 450,
      capacity: 500,
      featured: true,
    },
    {
      id: 2,
      title: "Stand-up Comedy Night",
      description: "Laugh out loud with the best comedians in town",
      date: "July 20, 2024",
      time: "8:00 PM",
      venue: "Comedy Club Downtown",
      location: "Delhi, India",
      price: "₹800",
      originalPrice: "₹1,000",
      image: "/placeholder.svg?height=200&width=300",
      tags: ["Comedy", "Indoor", "Entertainment"],
      organizer: "Laugh Factory",
      attendees: 85,
      capacity: 150,
      featured: false,
    },
    {
      id: 3,
      title: "Tech Conference 2024",
      description: "Latest trends and innovations in technology",
      date: "July 25, 2024",
      time: "9:00 AM",
      venue: "Convention Center",
      location: "Bangalore, India",
      price: "₹2,500",
      originalPrice: "₹3,000",
      image: "/placeholder.svg?height=200&width=300",
      tags: ["Technology", "Conference", "Networking"],
      organizer: "TechCorp Events",
      attendees: 200,
      capacity: 300,
      featured: true,
    },
    {
      id: 4,
      title: "Food & Wine Festival",
      description: "Culinary delights and fine wines from around the world",
      date: "August 5, 2024",
      time: "12:00 PM",
      venue: "Riverside Gardens",
      location: "Pune, India",
      price: "₹1,200",
      originalPrice: "₹1,500",
      image: "/placeholder.svg?height=200&width=300",
      tags: ["Food", "Wine", "Festival"],
      organizer: "Gourmet Events",
      attendees: 120,
      capacity: 200,
      featured: false,
    },
    {
      id: 5,
      title: "Art Exhibition Opening",
      description: "Contemporary art showcase by emerging artists",
      date: "August 10, 2024",
      time: "7:00 PM",
      venue: "Modern Art Gallery",
      location: "Chennai, India",
      price: "₹500",
      originalPrice: "₹700",
      image: "/placeholder.svg?height=200&width=300",
      tags: ["Art", "Exhibition", "Culture"],
      organizer: "Art Collective",
      attendees: 45,
      capacity: 100,
      featured: false,
    },
    {
      id: 6,
      title: "Dance Workshop Series",
      description: "Learn various dance forms from professional instructors",
      date: "August 15, 2024",
      time: "4:00 PM",
      venue: "Dance Studio Central",
      location: "Hyderabad, India",
      price: "₹1,000",
      originalPrice: "₹1,200",
      image: "/placeholder.svg?height=200&width=300",
      tags: ["Dance", "Workshop", "Learning"],
      organizer: "Dance Academy",
      attendees: 30,
      capacity: 50,
      featured: false,
    },
  ]

  const cities = ["Mumbai", "Delhi", "Bangalore", "Pune", "Chennai", "Hyderabad"]
  const genres = ["Music", "Comedy", "Technology", "Food", "Art", "Dance"]

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCity = selectedCity === "all" || event.location.includes(selectedCity)
    const matchesGenre =
      selectedGenre === "all" || event.tags.some((tag) => tag.toLowerCase().includes(selectedGenre.toLowerCase()))

    return matchesSearch && matchesCity && matchesGenre
  })

  const featuredEvents = filteredEvents.filter((event) => event.featured)
  const regularEvents = filteredEvents.filter((event) => !event.featured)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
      <Navbar/>
        <div className="container mx-auto px-4 py-4">
          {/* <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Discover Events</h1>
            <Button variant="outline" asChild>
              <Link href="/">← Back to Home</Link>
            </Button>
          </div> */}

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="City" />
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

              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genres</SelectItem>
                  {genres.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Date</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Featured Events */}
        {featuredEvents.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Featured Events</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredEvents.map((event) => (
                <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                  <div className="relative">
                    <Image
                      src={event.image || "/placeholder.svg"}
                      alt={event.title}
                      width={300}
                      height={200}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-gradient-to-r from-primary to-secondary text-white">Featured</Badge>
                    </div>
                    <div className="absolute top-4 right-4">
                      <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="absolute bottom-4 right-4">
                      <div className="bg-white/90 backdrop-blur rounded-lg px-3 py-1">
                        <span className="text-lg font-bold text-primary">{event.price}</span>
                        {event.originalPrice && (
                          <span className="text-sm text-muted-foreground line-through ml-2">{event.originalPrice}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{event.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-2" />
                        {event.date} at {event.time}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2" />
                        {event.venue}, {event.location}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="h-4 w-4 mr-2" />
                        {event.attendees}/{event.capacity} attending
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {event.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">by {event.organizer}</span>
                      <Button asChild>
                        <Link href={`/events/${event.id}`}>Book Now</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* All Events */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{featuredEvents.length > 0 ? "More Events" : "All Events"}</h2>
            <div className="flex items-center text-sm text-muted-foreground">
              <Filter className="h-4 w-4 mr-1" />
              {filteredEvents.length} events found
            </div>
          </div>

          {regularEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularEvents.map((event) => (
                <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                  <div className="relative">
                    <Image
                      src={event.image || "/placeholder.svg"}
                      alt={event.title}
                      width={300}
                      height={200}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-4 right-4">
                      <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="absolute bottom-4 right-4">
                      <div className="bg-white/90 backdrop-blur rounded-lg px-3 py-1">
                        <span className="text-lg font-bold text-primary">{event.price}</span>
                        {event.originalPrice && (
                          <span className="text-sm text-muted-foreground line-through ml-2">{event.originalPrice}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{event.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-2" />
                        {event.date} at {event.time}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2" />
                        {event.venue}, {event.location}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="h-4 w-4 mr-2" />
                        {event.attendees}/{event.capacity} attending
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {event.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">by {event.organizer}</span>
                      <Button asChild>
                        <Link href={`/events/${event.id}`}>Book Now</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No events found</p>
                <p className="text-sm">Try adjusting your search filters</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedCity("all")
                  setSelectedGenre("all")
                  setSelectedDate("all")
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </section>
      </div>
      <Footer/>
    </div>
  )
}
