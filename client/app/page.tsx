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
  Star,
  TrendingUp,
  Sparkles,
  Play,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import Navbar from "./Navbar"
import Footer from "./Footer"
import type { EventsResponse, Event } from "@/types/event"
import { AspectRatio } from "@/components/ui/aspect-ratio"

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Background carousel state
  const [currentBgSlide, setCurrentBgSlide] = useState(0)
  const [isBgAutoPlaying, setIsBgAutoPlaying] = useState(true)
  const [backgroundImages, setBackgroundImages] = useState<string[]>([])
  const [loadingHeroImages, setLoadingHeroImages] = useState(true)

  const stats = [
    { number: "15+", label: "Events Hosted", icon: Calendar, color: "bg-blue-50 text-blue-600 border-blue-200" },
    { number: "35,000+", label: "Tickets Sold", icon: Users, color: "bg-green-50 text-green-600 border-green-200" },
    { number: "10,000+", label: "Happy Users", icon: Star, color: "bg-orange-50 text-orange-600 border-orange-200" },
  ]

  const roles = [
    {
      title: "Event Organizer",
      description: "Plan, promote, and manage your event from one dashboard.",
      icon: Calendar,
      href: "/organizer",
      color: "bg-blue-50 text-blue-600 border-blue-200",
      features: ["Event Dashboard", "Analytics", "Ticket Management"],
    },
    {
      title: "Artist",
      description: "Get discovered, manage gigs, and grow your brand.",
      icon: Music,
      href: "/artist",
      color: "bg-purple-50 text-purple-600 border-purple-200",
      features: ["Profile Management", "Gig Calendar", "Fan Analytics"],
    },
    {
      title: "Venue Owner",
      description: "List your space, set your schedule, and accept bookings seamlessly.",
      icon: Building2,
      href: "/venue",
      color: "bg-green-50 text-green-600 border-green-200",
      features: ["Space Listing", "Booking System", "Revenue Tracking"],
    },
    {
      title: "Admin",
      description: "Access analytics, approve listings, and manage system-wide operations.",
      icon: Users,
      href: "/admin",
      color: "bg-orange-50 text-orange-600 border-orange-200",
      features: ["System Analytics", "User Management", "Content Moderation"],
    },
  ]

  // Fetch hero images from backend
  useEffect(() => {
    const fetchHeroImages = async () => {
      setLoadingHeroImages(true)
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hero-images?active=true`)
        if (!response.ok) {
          throw new Error("Failed to fetch hero images")
        }
        const data = await response.json()

        if (data.success && data.data && data.data.length > 0) {
          const imageUrls = data.data.map((image: any) => image.url)
          setBackgroundImages(imageUrls)
        } else {
          setBackgroundImages([
            "/images/carausel1.jpg",
            "/images/carausel2.jpg",
            "/images/carausel3.jpg",
          ])
        }
      } catch (err) {
        console.error("Error fetching hero images:", err)
        setBackgroundImages([
          "/images/carausel1.jpg",
          "/images/carausel2.jpg",
          "/images/carausel3.jpg",
        ])
      } finally {
        setLoadingHeroImages(false)
      }
    }

    fetchHeroImages()
  }, [])

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
        
        // Filter out past events (events where endDate has passed)
        const currentDate = new Date()
        const upcomingEvents = (data.data.events || []).filter(event => {
          const eventEndDate = new Date(event.endDate || event.startDate)
          return eventEndDate >= currentDate
        })
        
        setFeaturedEvents(upcomingEvents)
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
    if (backgroundImages.length === 0) return
    setCurrentBgSlide((prev) => (prev + 1) % backgroundImages.length)
  }, [backgroundImages.length])

  useEffect(() => {
    if (!isBgAutoPlaying || backgroundImages.length === 0) return

    const interval = setInterval(nextBgSlide, 4000)

    return () => clearInterval(interval)
  }, [isBgAutoPlaying, nextBgSlide, backgroundImages.length])

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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="relative z-20 bg-white shadow-sm">
        <Navbar />
      </div>

      {/* Hero Section with Background Carousel */}
      <section className="relative py-10 md:py-16 overflow-hidden min-h-[90vh] flex items-center bg-gray-50">
        {/* Background Image Carousel */}
        <div className="absolute inset-0 z-0">
          <div className="relative w-full h-full">
            {loadingHeroImages ? (
              <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                <div className="relative">
                  <div className="animate-pulse rounded-full h-32 w-32 bg-gray-200" />
                  <div className="absolute inset-0 rounded-full bg-gray-300/50 animate-ping" />
                </div>
              </div>
            ) : backgroundImages.length > 0 ? (
              backgroundImages.map((image, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-all blur-sm duration-1500 ease-in-out 
                    ${index === currentBgSlide ? "opacity-80 scale-105" : "opacity-0 scale-100"}
                  `}
                  
                >
                  <img
                    src={image || "/placeholder.svg"}
                    alt={`Background ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-1500"
                  />
                </div>
              ))
            ) : (
              <div className="absolute inset-0 bg-gray-50" />
            )}
          </div>
        </div>

        {/* Light Background Elements */}
        <div className="absolute inset-0 z-5">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-100/40 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-100/40 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-gray-100/30 to-blue-100/30 rounded-full blur-3xl" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4">
          <div className="text-center max-w-5xl mx-auto">
            <h1 className="text-5xl md:text-8xl lg:text-9xl font-black mb-8 leading-tight">
              <span className="block text-gray-900">
                Click. Book.
              </span>
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mt-2">
                Go!
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-white font-bold mb-12 max-w-4xl mx-auto leading-relaxed">
              Discover extraordinary events, connect with talented artists, and manage unforgettable experiences
              <span className="block mt-2 text-gray-800 font-semibold">— all in one powerful platform.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Button
                size="lg"
                asChild
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg px-8 py-4 text-lg font-semibold transform hover:scale-105 transition-all duration-300"
              >
                <Link href="/events" className="flex items-center">
                  Explore Events
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>

              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-2 border-gray-300 text-gray-800 hover:bg-gray-800 hover:text-white bg-white px-8 py-4 text-lg font-semibold transform hover:scale-105 transition-all duration-300"
              >
                <Link href="/auth" className="flex items-center">
                  <Play className="mr-2 h-5 w-5" />
                  Get Started
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Background Carousel Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <div className="flex space-x-3">
            {backgroundImages.map((_, index) => (
              <button
                key={index}
                className={`h-2 rounded-full transition-all duration-500 ${index === currentBgSlide
                  ? "bg-gray-800 w-12 shadow-md"
                  : "bg-gray-400 hover:bg-gray-600 w-2"
                  }`}
                onClick={() => setCurrentBgSlide(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Events Carousel - Light Theme */}
      <section className="py-8 sm:py-12 md:py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          {/* Section Heading */}
          <div className="text-center mb-6 sm:mb-8 md:mb-12 lg:mb-16">
            <div className="inline-flex items-center px-2.5 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-full bg-blue-50 text-blue-700 font-medium mb-2 sm:mb-3 md:mb-4 text-xs sm:text-sm md:text-base border border-blue-200">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Featured Events
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 md:mb-6 text-gray-900 leading-tight">
              Discover What's Happening
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-sm sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-auto px-2 sm:px-0 leading-relaxed">
              From intimate concerts to grand festivals, find events that match your vibe and create memories that last a lifetime.
            </p>
          </div>

          {/* Carousel */}
          <div
            className="relative w-full max-w-xs sm:max-w-sm md:max-w-4xl lg:max-w-6xl mx-auto"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
          >
            {isLoading ? (
              <div className="flex justify-center items-center h-48 sm:h-64 md:h-80 lg:h-96 xl:h-[600px]">
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-16 lg:w-16 animate-spin text-blue-600" />
              </div>
            ) : error ? (
              <div className="h-48 sm:h-64 md:h-80 lg:h-96 xl:h-[600px] flex items-center justify-center text-red-600 px-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6 md:p-8 max-w-full">
                  <p className="text-sm sm:text-base md:text-lg font-medium text-center">{error}</p>
                </div>
              </div>
            ) : featuredEvents.length === 0 ? (
              <div className="h-48 sm:h-64 md:h-80 lg:h-96 xl:h-[600px] flex items-center justify-center text-gray-600 px-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6 md:p-8 max-w-full">
                  <p className="text-sm sm:text-base md:text-lg text-center">No featured events available at the moment.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg sm:shadow-xl md:shadow-2xl">
                  <div
                    className="flex transition-transform duration-700 ease-out"
                    style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                  >
                    {featuredEvents.map((event, index) => (
                      <div key={event._id} className="w-full flex-shrink-0">
                        <Card className="relative mx-1 sm:mx-2 md:mx-4 overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl border shadow-lg sm:shadow-xl md:shadow-2xl group bg-white border-gray-200">
                          <AspectRatio ratio={16 / 9} className="relative">
                            <Image
                              src={event.banner || "/placeholder.svg?height=600&width=800&query=event%20venue"}
                              alt={event.title}
                              fill
                              className="object-contain group-hover:scale-105 transition-transform duration-700"
                              sizes="(max-width: 640px) 100vw, (max-width: 768px) 90vw, (max-width: 1024px) 80vw, 1200px"
                              priority={index === 0}
                            />

                            {/* Light Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                            {/* Content */}
                            <div className="absolute bottom-0 left-0 right-0 text-white p-2 sm:p-4 md:p-6 lg:p-8 space-y-1 sm:space-y-2 md:space-y-3">
                              <h3 className="text-sm sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold mb-1 sm:mb-2 md:mb-4 group-hover:text-blue-300 transition-colors duration-300 line-clamp-1 leading-tight truncate">
                                {event.title}
                              </h3>

                              {/* Mobile: Single horizontal line with date and location */}
                              <div className="flex items-center justify-between text-xs sm:text-sm md:text-base text-gray-200 mb-1 sm:mb-2 md:mb-4 lg:mb-6 gap-2">
                                <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3 min-w-0 flex-1">
                                  <Clock className="h-2.5 w-2.5 sm:h-4 sm:w-4 flex-shrink-0" />
                                  <span className="font-medium text-xs sm:text-sm truncate">{new Date(event.startDate).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3 min-w-0 flex-1">
                                  <MapPin className="h-2.5 w-2.5 sm:h-4 sm:w-4 flex-shrink-0" />
                                  <span className="font-medium text-xs sm:text-sm truncate">{event.location.city}</span>
                                </div>
                              </div>

                              <Button
                                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-md sm:shadow-lg md:shadow-xl text-xs sm:text-sm md:text-base py-1.5 sm:py-2 md:py-3 px-3 sm:px-6 md:px-8"
                                asChild
                                size="sm"
                              >
                                <Link href={`/events`} className="flex items-center justify-center">
                                  <span className="text-xs sm:text-sm md:text-base">Book Now</span>
                                  <ArrowRight className="ml-1 sm:ml-2 h-2.5 w-2.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                                </Link>
                              </Button>
                            </div>
                          </AspectRatio>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mobile Indicators */}
                <div className="flex justify-center mt-4 sm:mt-6 md:mt-8 space-x-1.5 sm:space-x-2 md:space-x-3">
                  {featuredEvents.map((_, index) => (
                    <button
                      key={index}
                      className={`h-1.5 sm:h-2 md:h-3 rounded-full transition-all duration-300 ${
                        index === currentSlide 
                          ? "bg-blue-600 w-4 sm:w-6 md:w-8 lg:w-12 shadow-sm sm:shadow-md" 
                          : "bg-gray-300 hover:bg-gray-400 active:bg-gray-500 w-1.5 sm:w-2 md:w-3"
                      }`}
                      onClick={() => handleGoTo(index)}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* View All Button */}
          <div className="text-center mt-6 sm:mt-8 md:mt-10 lg:mt-12">
            <Button
              variant="outline"
              asChild
              size="default"
              className="border-gray-300 text-gray-700 hover:bg-gray-800 hover:text-white hover:border-gray-800 transition-all duration-300 text-sm sm:text-base md:text-lg px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3"
            >
              <Link href="/events" className="flex items-center">
                View All Events
                <ArrowRight className="ml-1.5 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Enhanced Stats Section - Light Theme */}
      <section className="py-20 md:py-24 ">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              The Ahibi Impact
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Trusted by thousands of event organizers, artists, and venues worldwide
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center group hover:scale-105 transition-all duration-500"
              >
                <Card className={`p-8 border shadow-lg hover:shadow-xl transition-all duration-500 bg-white ${stat.color}`}>
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${stat.color} mb-6 shadow-md`}>
                    <stat.icon className="h-8 w-8" />
                  </div>
                  <div className="text-5xl md:text-6xl font-black text-gray-900 mb-4">
                    {stat.number}
                  </div>
                  <div className="text-xl font-semibold text-gray-700">{stat.label}</div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}