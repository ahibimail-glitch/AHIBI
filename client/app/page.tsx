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
    { number: "15+", label: "Events Hosted", icon: Calendar, gradient: "from-blue-500 to-cyan-500" },
    { number: "35,000+", label: "Tickets Sold", icon: Users, gradient: "from-purple-500 to-pink-500" },
    { number: "10,000+", label: "Happy Users", icon: Star, gradient: "from-orange-500 to-red-500" },
  ]

  const roles = [
    {
      title: "Event Organizer",
      description: "Plan, promote, and manage your event from one dashboard.",
      icon: Calendar,
      href: "/organizer",
      gradient: "from-blue-500 to-cyan-500",
      features: ["Event Dashboard", "Analytics", "Ticket Management"],
    },
    {
      title: "Artist",
      description: "Get discovered, manage gigs, and grow your brand.",
      icon: Music,
      href: "/artist",
      gradient: "from-purple-500 to-pink-500",
      features: ["Profile Management", "Gig Calendar", "Fan Analytics"],
    },
    {
      title: "Venue Owner",
      description: "List your space, set your schedule, and accept bookings seamlessly.",
      icon: Building2,
      href: "/venue",
      gradient: "from-green-500 to-emerald-500",
      features: ["Space Listing", "Booking System", "Revenue Tracking"],
    },
    {
      title: "Admin",
      description: "Access analytics, approve listings, and manage system-wide operations.",
      icon: Users,
      href: "/admin",
      gradient: "from-orange-500 to-red-500",
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
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50">
        <Navbar />
      </header>

      {/* Hero Section with Background Carousel */}
      <section className="relative py-20 md:py-32 overflow-hidden min-h-[90vh] flex items-center">
        {/* Background Image Carousel */}
        <div className="absolute inset-0 z-0">
          <div className="relative w-full h-full">
            {loadingHeroImages ? (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 flex items-center justify-center">
                <div className="relative">
                  <div className="animate-pulse rounded-full h-32 w-32 bg-gradient-to-br from-primary/20 to-secondary/20" />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent animate-ping" />
                </div>
              </div>
            ) : backgroundImages.length > 0 ? (
              backgroundImages.map((image, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-all duration-1500 ease-in-out ${index === currentBgSlide ? "opacity-100 scale-105" : "opacity-0 scale-100"
                    }`}
                >
                  <img
                    src={image || "/placeholder.svg"}
                    alt={`Background ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-1500"
                  />
                </div>
              ))
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900" />
            )}
          </div>
          {/* Enhanced Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-black/80" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-transparent to-secondary/30" />
        </div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-5">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/5 to-secondary/5 rounded-full blur-3xl animate-spin-slow" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4">
          <div className="text-center max-w-5xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8 animate-fade-in-up">
              <Sparkles className="h-4 w-4 mr-2 text-yellow-400" />
              <span className="text-sm text-white font-medium">The Future of Event Management</span>
            </div>

            <h1 className="text-5xl md:text-8xl lg:text-9xl font-black mb-8 leading-tight animate-fade-in-up delay-200">
              <span className="block bg-gradient-to-r from-white via-blue-200 to-emerald-300 bg-clip-text text-transparent">
                Click. Book.
              </span>
              <span className="block bg-gradient-to-r from-emerald-300 via-blue-200 to-purple-300 bg-clip-text text-transparent mt-2">
                Go!
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-200 mb-12 max-w-4xl mx-auto leading-relaxed animate-fade-in-up delay-400">
              Discover extraordinary events, connect with talented artists, and manage unforgettable experiences
              <span className="block mt-2 text-gradient font-semibold">— all in one powerful platform.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-fade-in-up delay-600">
              <Button
                size="lg"
                asChild
                className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 text-white shadow-2xl shadow-primary/25 px-8 py-4 text-lg font-semibold transform hover:scale-105 transition-all duration-300"
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
                className="border-2 border-white/30 text-white hover:bg-white hover:text-black bg-white/5 backdrop-blur-sm px-8 py-4 text-lg font-semibold transform hover:scale-105 transition-all duration-300"
              >
                <Link href="/auth" className="flex items-center">
                  <Play className="mr-2 h-5 w-5" />
                  Get Started
                </Link>
              </Button>
            </div>

            {/* Social Proof */}
            {/* <div className="mt-16 flex justify-center items-center space-x-8 text-white/70 animate-fade-in-up delay-800">
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-1">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full border-2 border-white" />
                  <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full border-2 border-white" />
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full border-2 border-white" />
                </div>
                <span className="text-sm">Join 10K+ users</span>
              </div>
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="ml-2 text-sm">4.9/5 rating</span>
              </div>
            </div> */}
          </div>
        </div>

        {/* Enhanced Background Carousel Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <div className="flex space-x-3">
            {backgroundImages.map((_, index) => (
              <button
                key={index}
                className={`h-2 rounded-full transition-all duration-500 backdrop-blur-sm ${index === currentBgSlide
                    ? "bg-white w-12 shadow-lg"
                    : "bg-white/40 hover:bg-white/60 w-2"
                  }`}
                onClick={() => setCurrentBgSlide(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Events Carousel - Enhanced */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-background to-gray-50/50">
        <div className="container mx-auto px-4">
          {/* Section Heading */}
          <div className="text-center mb-10 md:mb-16">
            <div className="inline-flex items-center px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 text-primary font-medium mb-3 md:mb-4 text-sm md:text-base">
              <TrendingUp className="h-4 w-4 mr-2" />
              Featured Events
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Discover What's Happening
            </h2>
            <p className="text-base md:text-xl text-muted-foreground max-w-xl md:max-w-2xl mx-auto px-2">
              From intimate concerts to grand festivals, find events that match your vibe and create memories that last a lifetime.
            </p>
          </div>

          {/* Carousel */}
          <div
            className="relative max-w-full md:max-w-6xl mx-auto"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
          >
            {isLoading ? (
              <div className="flex justify-center items-center h-[300px] md:h-[600px]">
                <Loader2 className="h-10 w-10 md:h-16 md:w-16 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="h-[300px] md:h-[600px] flex items-center justify-center text-red-500">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 md:p-8">
                  <p className="text-base md:text-lg font-medium">{error}</p>
                </div>
              </div>
            ) : featuredEvents.length === 0 ? (
              <div className="h-[300px] md:h-[600px] flex items-center justify-center text-muted-foreground">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 md:p-8">
                  <p className="text-base md:text-lg">No featured events available at the moment.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-xl md:rounded-2xl shadow-xl md:shadow-2xl">
                  <div
                    className="flex transition-transform duration-700 ease-out"
                    style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                  >
                    {featuredEvents.map((event, index) => (
                      <div key={event._id} className="w-full flex-shrink-0">
                        <Card className="relative mx-2 md:mx-4 overflow-hidden rounded-xl md:rounded-2xl border-0 shadow-xl md:shadow-2xl group">
                          <AspectRatio ratio={16 / 9} className="relative">
                            <Image
                              src={event.banner || "/placeholder.svg?height=600&width=800&query=event%20venue"}
                              alt={event.title}
                              fill
                              className="object-contain group-hover:scale-105 transition-transform duration-700"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                              priority={index === 0}
                            />

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-transparent to-secondary/30" />

                            {/* Badge */}
                            {/* <div className="absolute top-4 left-4 md:top-6 md:left-6">
                              <Badge variant="secondary" className="bg-white/95 text-black font-semibold backdrop-blur-sm text-xs md:text-sm">
                                {event.category}
                              </Badge>
                            </div> */}

                            {/* Content */}
                            <div className="absolute bottom-0 left-0 right-0 text-white p-4 md:p-8 space-y-3 md:space-y-4">
                              <h3 className="text-xl md:text-3xl font-bold mb-2 md:mb-4 group-hover:text-primary transition-colors duration-300 line-clamp-2">
                                {event.title}
                              </h3>

                              <div className="flex flex-col md:flex-row gap-2 md:gap-3 text-sm md:text-base text-gray-200 mb-4 md:mb-6">
                                <div className="flex items-center space-x-2 md:space-x-3">
                                  <Clock className="h-4 w-4" />
                                  <span className="font-medium">{new Date(event.startDate).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center space-x-2 md:space-x-3">
                                  <MapPin className="h-4 w-4" />
                                  <span className="font-medium truncate">{event.location.address}, {event.location.city}</span>
                                </div>
                              </div>

                              <Button
                                className="w-full md:w-auto bg-gradient-to-r from-white to-gray-100 text-black font-semibold hover:from-gray-100 hover:to-gray-200 transform hover:scale-105 transition-all duration-300 shadow-lg md:shadow-xl text-sm md:text-base"
                                asChild
                                size="lg"
                              >
                                <Link href={`/events`} className="flex items-center justify-center">
                                  Book Now
                                  <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                                </Link>
                              </Button>
                            </div>
                          </AspectRatio>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Indicators */}
                <div className="flex justify-center mt-6 md:mt-8 space-x-2 md:space-x-3">
                  {featuredEvents.map((_, index) => (
                    <button
                      key={index}
                      className={`h-2 md:h-3 rounded-full transition-all duration-300 ${index === currentSlide ? "bg-primary w-6 md:w-12 shadow-md" : "bg-gray-300 hover:bg-gray-400 w-2 md:w-3"
                        }`}
                      onClick={() => handleGoTo(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* View All Button */}
          <div className="text-center mt-8 md:mt-12">
            <Button
              variant="outline"
              asChild
              size="lg"
              className="hover:bg-primary hover:text-white transition-all duration-300"
            >
              <Link href="/events">
                View All Events
                <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>


      {/* Enhanced Stats Section */}
      <section className="py-20 md:py-24 bg-gradient-to-r from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              The Ahibi Impact
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Trusted by thousands of event organizers, artists, and venues worldwide
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center group hover:scale-105 transition-all duration-500"
              >
                <Card className="p-8 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-white to-gray-50/50 backdrop-blur-sm">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${stat.gradient} mb-6 shadow-lg`}>
                    <stat.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className={`text-5xl md:text-6xl font-black bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mb-4`}>
                    {stat.number}
                  </div>
                  <div className="text-xl font-semibold text-muted-foreground">{stat.label}</div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Roles Section */}
      {/* <section className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Choose Your Journey
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Whether you're organizing events, performing, or managing venues, we've got you covered
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {roles.map((role, index) => (
              <Card 
                key={index} 
                className="group hover:scale-105 transition-all duration-500 border-0 shadow-xl hover:shadow-2xl overflow-hidden bg-gradient-to-br from-white to-gray-50/50"
              >
                <div className="p-8 relative">
                  <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${role.gradient}`} />
                  
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${role.gradient} mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <role.icon className="h-8 w-8 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-4 group-hover:text-primary transition-colors duration-300">
                    {role.title}
                  </h3>
                  
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {role.description}
                  </p>
                  
                  <div className="space-y-2 mb-6">
                    {role.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center text-sm text-muted-foreground">
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${role.gradient} mr-3`} />
                        {feature}
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    asChild 
                    className="w-full group-hover:bg-primary group-hover:text-white transition-all duration-300"
                    variant="outline"
                  >
                    <Link href={role.href}>
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section> */}

      {/* Footer */}
      <Footer />
    </div>
  )
}