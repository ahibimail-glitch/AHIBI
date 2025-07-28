"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Calendar,
  Building2,
  Music,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import Navbar from "./Navbar"
import Footer from "./Footer"
import type { EventsResponse, Event } from "@/types/event"

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Background carousel state
  const [currentBgSlide, setCurrentBgSlide] = useState(0)
  const [isBgAutoPlaying, setIsBgAutoPlaying] = useState(true)

  // Background images for the hero carousel
  const backgroundImages = [
    "/images/carausel1.jpg",
    "/images/carausel2.jpg",
    "/images/carausel3.jpg",
    "/images/carausel2.jpg",
    "/images/carausel1.jpg",
    "/images/carausel2.jpg",
  ]

  const stats = [
    { number: "15+", label: "Events Hosted" },
    { number: "35,000+", label: "Tickets Sold" },
    { number: "10,000+", label: "Happy Users" },
  ]

  const roles = [
    {
      title: "Event Organizer",
      description: "Plan, promote, and manage your event from one dashboard.",
      icon: Calendar,
      href: "/organizer",
    },
    {
      title: "Artist",
      description: "Get discovered, manage gigs, and grow your brand.",
      icon: Music,
      href: "/artist",
    },
    {
      title: "Venue Owner",
      description: "List your space, set your schedule, and accept bookings seamlessly.",
      icon: Building2,
      href: "/venue",
    },
    {
      title: "Admin",
      description: "Access analytics, approve listings, and manage system-wide operations.",
      icon: Users,
      href: "/admin",
    },
  ]

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events?isFeatured=true&limit=5`)
        if (!response.ok) {
          throw new Error("Failed to fetch featured events")
        }
        const data: EventsResponse = await response.json()
        setFeaturedEvents(data.data.events || [])
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load events"
        console.error("Error fetching events:", errorMessage)
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [])

  // Background carousel logic
  const nextBgSlide = useCallback(() => {
    setCurrentBgSlide((prev) => (prev + 1) % backgroundImages.length)
  }, [backgroundImages.length])

  useEffect(() => {
    if (!isBgAutoPlaying) return

    const interval = setInterval(nextBgSlide, 4000) // Change every 4 seconds

    return () => clearInterval(interval)
  }, [isBgAutoPlaying, nextBgSlide])

  // Featured events carousel logic
  const nextSlide = useCallback(() => {
    if (featuredEvents.length === 0) return
    setCurrentSlide((prev) => (prev + 1) % featuredEvents.length)
  }, [featuredEvents.length])

  const prevSlide = () => {
    if (featuredEvents.length === 0) return
    setCurrentSlide((prev) => (prev - 1 + featuredEvents.length) % featuredEvents.length)
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  const handleNext = () => {
    nextSlide()
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const handlePrev = () => {
    prevSlide()
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const handleGoTo = (index: number) => {
    goToSlide(index)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  useEffect(() => {
    if (!isAutoPlaying || featuredEvents.length === 0) return

    const interval = setInterval(nextSlide, 5000)

    return () => clearInterval(interval)
  }, [isAutoPlaying, featuredEvents.length, nextSlide])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50">
        <Navbar />
      </header>

      {/* Hero Section with Background Carousel */}
      <section className="relative py-12 md:py-20 overflow-hidden">
        {/* Background Image Carousel */}
        <div className="absolute inset-0 z-0">
          <div className="relative w-full h-full">
            {backgroundImages.map((image, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  index === currentBgSlide ? "opacity-100" : "opacity-0"
                }`}
              >
                <img
                  src={image || "/placeholder.svg"}
                  alt={`Background ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70" />
          {/* Additional overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-secondary/20" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-8xl font-bold bg-gradient-to-r from-white via-blue-200 to-emerald-200 bg-clip-text text-transparent mb-6">
            Click. Book. Go!
          </h1>

          <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto">
            Discover top events, book artists, list venues, and manage every detail
            <br />— all in one powerful platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90">
              <Link href="/events">
                Explore Events <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-white/30 text-white hover:bg-white/10 bg-transparent"
            >
              <Link href="/auth">Get Started</Link>
            </Button>
          </div>
        </div>

        {/* Background Carousel Indicators */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="flex space-x-2">
            {backgroundImages.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentBgSlide ? "bg-white w-8" : "bg-white/50 hover:bg-white/70"
                }`}
                onClick={() => setCurrentBgSlide(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Events Carousel */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Featured Events</h2>
            <p className="text-lg text-muted-foreground">Discover what's happening near you or nationwide.</p>
          </div>

          <div
            className="relative max-w-6xl mx-auto"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
          >
            {isLoading ? (
              <div className="flex justify-center items-center h-[500px]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center text-red-500 h-[500px] flex items-center justify-center">
                <p>{error}</p>
              </div>
            ) : featuredEvents.length === 0 ? (
              <div className="text-center text-muted-foreground h-[500px] flex items-center justify-center">
                <p>No featured events available at the moment.</p>
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-lg">
                  <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                  >
                    {featuredEvents.map((event) => (
                      <div key={event._id} className="w-full flex-shrink-0">
                        <Card className="relative mx-2 h-[500px] md:h-[600px] overflow-hidden rounded-lg">
                          <img
                            src={event.banner || "/placeholder.svg?height=600&width=800&query=event venue"}
                            alt={event.title}
                            className="absolute inset-0 w-full h-full object-cover z-0"
                          />
                          <div className="absolute inset-0 bg-black/40 z-0" />

                          <div className="absolute top-4 left-4 z-10">
                            <Badge variant="secondary" className="bg-white/90 text-black">
                              {event.category}
                            </Badge>
                          </div>
                          <div className="absolute top-4 right-4 z-10">
                            <Badge variant="default" className="bg-primary text-white">
                              {`Starts @ ₹${event.ticketTypes?.[0]?.price || "N/A"}`}
                            </Badge>
                          </div>

                          <div className="absolute bottom-0 left-0 right-0 z-10 text-white p-6 rounded-b-lg">
                            <h3 className="text-2xl font-bold mb-2">{event.title}</h3>
                            <div className="space-y-2 mb-4 text-sm text-gray-200">
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2" />
                                <span>{new Date(event.startDate).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-2" />
                                <span>
                                  {event.location.address}, {event.location.city}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <Users className="h-4 w-4 mr-2" />
                                <span>{event.attendees || 0} attendees</span>
                              </div>
                            </div>
                            <Button className="w-full" asChild>
                              <Link href={`/events/${event._id}`}>Book Now</Link>
                            </Button>
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
                  onClick={handlePrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <div className="flex justify-center mt-6 space-x-2">
                  {featuredEvents.map((_, index) => (
                    <button
                      key={index}
                      className={`w-3 h-3 rounded-full transition-colors ${index === currentSlide ? "bg-primary" : "bg-gray-300"}`}
                      onClick={() => handleGoTo(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="text-center mt-8">
            <Button variant="outline" asChild>
              <Link href="/events">View All Events</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* The Ahibi Impact */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">The Ahibi Impact</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index}>
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">{stat.number}</div>
                <div className="text-lg text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
