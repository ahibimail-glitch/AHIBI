"use client"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Calendar,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Loader2,
  Star,
  TrendingUp,
  Sparkles,
  Zap,
  Award,
  Music,
  Theater,
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
  const [slidesPerView, setSlidesPerView] = useState(1)
  const [maxSlide, setMaxSlide] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [currentBgSlide, setCurrentBgSlide] = useState(0)
  const [isBgAutoPlaying, setIsBgAutoPlaying] = useState(true)
  const [backgroundImages, setBackgroundImages] = useState<{ url: string; mobileUrl?: string }[]>([])
  const [loadingHeroImages, setLoadingHeroImages] = useState(true)

  const stats = [
    {
      number: "30+",
      label: "Events Hosted",
      icon: Calendar,
      gradient: "from-blue-500 via-blue-600 to-indigo-600",
      description: "Curated experiences"
    },
    {
      number: "60,000+",
      label: "Tickets Sold",
      icon: Users,
      gradient: "from-violet-500 via-purple-600 to-indigo-600",
      description: "Happy attendees"
    },
    {
      number: "50,000+",
      label: "Community Members",
      icon: Star,
      gradient: "from-cyan-500 via-blue-600 to-indigo-600",
      description: "Growing daily"
    },
  ]

  const features = [
    {
      icon: Zap,
      title: "Instant Booking",
      description: "Secure your spot in seconds with our lightning-fast checkout"
    },
    {
      icon: Award,
      title: "Premium Events",
      description: "Curated selection of the finest experiences in your area"
    },
    {
      icon: Music,
      title: "Live Entertainment",
      description: "Connect with artists and performers you love"
    },
    {
      icon: Theater,
      title: "Diverse Venues",
      description: "From intimate spaces to grand theaters"
    }
  ]

  // Fetch hero images
  useEffect(() => {
    const fetchHeroImages = async () => {
      setLoadingHeroImages(true)
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hero-images?active=true`)
        if (!response.ok) throw new Error("Failed to fetch hero images")
        const data = await response.json()

        if (data.success && data.data && data.data.length > 0) {
          setBackgroundImages(data.data.map((img: any) => ({ url: img.url, mobileUrl: img.mobileUrl })))
        } else {
          setBackgroundImages([
            { url: "/images/carausel1.jpg" },
            { url: "/images/carausel2.jpg" },
            { url: "/images/carausel3.jpg" },
          ])
        }
      } catch (err) {
        console.error("Error fetching hero images:", err)
        setBackgroundImages([
          { url: "/images/carausel1.jpg" },
          { url: "/images/carausel2.jpg" },
          { url: "/images/carausel3.jpg" },
        ])
      } finally {
        setLoadingHeroImages(false)
      }
    }
    fetchHeroImages()
  }, [])

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events?isFeatured=true&limit=5`)
        if (!response.ok) throw new Error("Failed to fetch featured events")
        const data: EventsResponse = await response.json()
        const currentDate = new Date()
        const upcomingEvents = (data.data.events || []).filter(event => {
          const eventEndDate = new Date(event.endDate || event.startDate)
          return eventEndDate >= currentDate && event._id !== '68dac96e8d5dd14f277d5b1a'
        })
        setFeaturedEvents(upcomingEvents)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load events")
      } finally {
        setIsLoading(false)
      }
    }
    fetchEvents()
  }, [])

  // Responsive slides per view
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSlidesPerView(1)
      } else if (featuredEvents.length === 1) {
        setSlidesPerView(1)
      } else if (featuredEvents.length === 2) {
        setSlidesPerView(2)
      } else {
        setSlidesPerView(window.innerWidth >= 1280 ? Math.min(3, featuredEvents.length) : Math.min(2, featuredEvents.length))
      }
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [featuredEvents.length])

  useEffect(() => {
    const newMaxSlide = Math.max(0, featuredEvents.length - slidesPerView)
    setMaxSlide(newMaxSlide)
    setCurrentSlide((prev) => Math.min(prev, newMaxSlide))
  }, [slidesPerView, featuredEvents.length])

  // Background carousel navigation
  const nextBgSlide = useCallback(() => {
    if (backgroundImages.length === 0) return
    setCurrentBgSlide((prev) => (prev + 1) % backgroundImages.length)
  }, [backgroundImages.length])

  const prevBgSlide = useCallback(() => {
    if (backgroundImages.length === 0) return
    setCurrentBgSlide((prev) => (prev - 1 + backgroundImages.length) % backgroundImages.length)
  }, [backgroundImages.length])

  useEffect(() => {
    if (!isBgAutoPlaying || backgroundImages.length === 0) return
    const interval = setInterval(nextBgSlide, 5000)
    return () => clearInterval(interval)
  }, [isBgAutoPlaying, nextBgSlide, backgroundImages.length])

  // Events carousel navigation
  const nextSlide = useCallback(() => {
    if (featuredEvents.length === 0) return
    setCurrentSlide((prev) => (prev >= maxSlide ? 0 : prev + 1))
  }, [featuredEvents.length, maxSlide])

  const prevSlide = () => {
    if (featuredEvents.length === 0) return
    setCurrentSlide((prev) => (prev <= 0 ? maxSlide : prev - 1))
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
    setCurrentSlide(index)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const handleBgNext = () => {
    nextBgSlide()
    setIsBgAutoPlaying(false)
    setTimeout(() => setIsBgAutoPlaying(true), 10000)
  }

  const handleBgPrev = () => {
    prevBgSlide()
    setIsBgAutoPlaying(false)
    setTimeout(() => setIsBgAutoPlaying(true), 10000)
  }

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX)
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX)
  const handleTouchEnd = () => {
    if (touchStart !== null && touchEnd !== null) {
      const distance = touchStart - touchEnd
      if (Math.abs(distance) > 50) {
        distance > 0 ? handleNext() : handlePrev()
      }
    }
    setTouchStart(null)
    setTouchEnd(null)
  }

  const handleBgTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX)
  const handleBgTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX)
  const handleBgTouchEnd = () => {
    if (touchStart !== null && touchEnd !== null) {
      const distance = touchStart - touchEnd
      if (Math.abs(distance) > 50) {
        distance > 0 ? handleBgNext() : handleBgPrev()
      }
    }
    setTouchStart(null)
    setTouchEnd(null)
  }

  useEffect(() => {
    if (!isAutoPlaying || featuredEvents.length === 0) return
    const interval = setInterval(nextSlide, 5000)
    return () => clearInterval(interval)
  }, [isAutoPlaying, featuredEvents.length, nextSlide])

  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-b from-white via-gray-50 to-white">
      {/* Hero Section */}
      <section
        className="relative overflow-hidden min-h-[95vh] flex items-center"
        onMouseEnter={() => setIsBgAutoPlaying(false)}
        onMouseLeave={() => setIsBgAutoPlaying(true)}
        onTouchStart={handleBgTouchStart}
        onTouchMove={handleBgTouchMove}
        onTouchEnd={handleBgTouchEnd}
      >
        {/* Navbar */}
        <div className="absolute top-0 left-0 right-0 z-30">
          <Navbar />
        </div>

        {/* Animated Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" />

          {/* Background Images */}
          <div className="relative w-full h-full overflow-hidden">
            {loadingHeroImages ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <Loader2 className="h-20 w-20 animate-spin text-blue-600" />
                  <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping" />
                </div>
              </div>
            ) : backgroundImages.length > 0 ? (
              backgroundImages.map((image, index) => (
                <div
                  key={index}
                  className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
                  style={{
                    opacity: index === currentBgSlide ? 0.4 : 0,
                    transitionDelay: index === currentBgSlide ? '200ms' : '0ms'
                  }}
                >
                  <picture>
                    <source media="(max-width: 768px)" srcSet={image.mobileUrl || image.url} />
                    <img
                      src={image.url || "/placeholder.svg"}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </picture>
                </div>
              ))
            ) : null}
          </div>

          {/* Gradient Mesh Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-100/40 via-transparent to-transparent" />

          {/* Animated Orbs */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: '5s', animationDelay: '1s' }} />
        </div>

        {/* Hero Content */}
        <div className="relative z-20 container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              {/* Premium Badge */}
              <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-xl border border-blue-200/50 rounded-full px-6 py-3 mb-8 shadow-lg shadow-blue-500/10">
                <Sparkles className="h-5 w-5 text-blue-600 animate-pulse" />
                <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Premium Event Platform
                </span>
              </div>

              {/* Main Heading */}
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-8 leading-[1.1] tracking-tight">
                <span className="block text-gray-900">
                  Your Next
                </span>
                <span className="block mt-2">
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Unforgettable
                  </span>
                </span>
                <span className="block mt-2 text-gray-900">
                  Experience
                </span>
              </h1>

              {/* Subheading */}
              <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
                Discover extraordinary events and create memories that last forever
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                <Button
                  size="lg"
                  asChild
                  className="group relative w-full sm:w-auto bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-xl shadow-blue-500/25 px-10 py-7 text-lg font-semibold rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/30 hover:scale-105"
                >
                  <Link href="/events" className="flex items-center justify-center relative z-10">
                    Explore Events
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="group w-full sm:w-auto border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white bg-transparent px-10 py-7 text-lg font-semibold rounded-2xl transition-all duration-300 hover:scale-105"
                >
                  <Link href="/auth" className="flex items-center justify-center">
                    Get Started
                    <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 border-2 border-white" />
                    ))}
                  </div>
                  <span className="font-medium">50,000+ users</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex text-yellow-400">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <span className="font-medium">5.0 rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Verified platform</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Controls */}
        {backgroundImages.length > 1 && (
          <>
            <div className="absolute inset-y-0 left-0 right-0 z-20 pointer-events-none hidden md:flex items-center justify-between px-8">
              <button
                className="pointer-events-auto flex items-center justify-center w-14 h-14 bg-white/95 backdrop-blur-xl rounded-full text-gray-900 hover:bg-white shadow-xl transition-all duration-300 hover:scale-110 border border-gray-200/50"
                onClick={handleBgPrev}
                aria-label="Previous"
              >
                <ChevronLeft size={24} strokeWidth={2.5} />
              </button>
              <button
                className="pointer-events-auto flex items-center justify-center w-14 h-14 bg-white/95 backdrop-blur-xl rounded-full text-gray-900 hover:bg-white shadow-xl transition-all duration-300 hover:scale-110 border border-gray-200/50"
                onClick={handleBgNext}
                aria-label="Next"
              >
                <ChevronRight size={24} strokeWidth={2.5} />
              </button>
            </div>

            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
              <div className="flex items-center gap-2 bg-white/90 backdrop-blur-xl rounded-full px-4 py-3 shadow-lg border border-gray-200/50">
                {backgroundImages.map((_, index) => (
                  <button
                    key={index}
                    className={`transition-all duration-300 rounded-full ${index === currentBgSlide
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 w-8 h-2.5"
                        : "bg-gray-300 hover:bg-gray-400 w-2.5 h-2.5"
                      }`}
                    onClick={() => setCurrentBgSlide(index)}
                    aria-label={`Slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-50/50 via-transparent to-transparent" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group relative"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="relative h-full bg-white rounded-3xl p-8 border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-6 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className="h-8 w-8 text-white" strokeWidth={2} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-white via-gray-50 to-white relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-purple-200/30 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-blue-200/30 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            {/* Section Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-full px-6 py-3 mb-6">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-semibold text-blue-900">Featured Events</span>
            </div>

            {/* Section Heading */}
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 text-gray-900 tracking-tight">
              Discover What's{" "}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Trending
              </span>
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              From intimate concerts to grand festivals, find the perfect event that matches your vibe
            </p>
          </div>

          {/* Events Carousel */}
          <div
            className="relative max-w-7xl mx-auto"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {isLoading ? (
              <div className="flex justify-center items-center h-[500px]">
                <div className="relative">
                  <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
                  <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping" />
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-[500px] px-4">
                <Card className="max-w-md w-full bg-red-50 border-red-200 p-8 rounded-3xl">
                  <p className="text-red-600 text-center font-medium">{error}</p>
                </Card>
              </div>
            ) : featuredEvents.length === 0 ? (
              <div className="flex items-center justify-center h-[500px] px-4">
                <Card className="max-w-md w-full bg-blue-50 border-blue-200 p-8 rounded-3xl">
                  <p className="text-gray-700 text-center font-medium">No featured events available at the moment.</p>
                </Card>
              </div>
            ) : (
              <>
                {/* Carousel Container */}
                <div className="overflow-hidden rounded-3xl">
                  <div
                    className="flex transition-transform duration-700 ease-out"
                    style={{ transform: `translateX(-${currentSlide * (100 / slidesPerView)}%)` }}
                  >
                    {featuredEvents.map((event, index) => (
                      <div
                        key={event._id}
                        className="flex-shrink-0 px-3 md:px-4"
                        style={{ width: `${100 / slidesPerView}%` }}
                      >
                        <Card className="group relative h-full overflow-hidden rounded-3xl border-2 border-gray-200 bg-white hover:border-blue-300 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                          <AspectRatio ratio={16 / 9} className="relative bg-gradient-to-br from-gray-100 to-gray-200">
                            <Image
                              src={event.banner || "/placeholder.svg?height=600&width=800"}
                              alt={event.title}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-700"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              priority={index === 0}
                            />

                            {/* Gradient Overlays */}
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent opacity-90" />
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 mix-blend-overlay" />

                            {/* Content */}
                            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 text-white">
                              {/* Event Badge */}
                              <Badge className="absolute top-6 right-6 bg-white/95 text-blue-600 border-0 px-4 py-1.5 font-semibold shadow-lg backdrop-blur-sm">
                                Featured
                              </Badge>

                              <div className="space-y-4">
                                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold line-clamp-2 leading-tight drop-shadow-lg">
                                  {event.title}
                                </h3>

                                <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                                    <Clock className="h-4 w-4" />
                                    <span>{new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                  </div>
                                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                                    <MapPin className="h-4 w-4" />
                                    <span className="truncate">{event.location.city}</span>
                                  </div>
                                </div>

                                <Button
                                  asChild
                                  size="lg"
                                  className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-105 py-6"
                                >
                                  <Link href={`/events/${event._id}`} className="flex items-center justify-center">
                                    Book Tickets
                                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </AspectRatio>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Navigation Dots */}
                {featuredEvents.length > slidesPerView && (
                  <div className="flex justify-center mt-10 gap-2">
                    {Array.from({ length: maxSlide + 1 }).map((_, index) => (
                      <button
                        key={index}
                        className={`transition-all duration-300 rounded-full ${index === currentSlide
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 w-10 h-3"
                            : "bg-gray-300 hover:bg-gray-400 w-3 h-3"
                          }`}
                        onClick={() => handleGoTo(index)}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* View All CTA */}
          <div className="text-center mt-16">
            <Button
              asChild
              size="lg"
              variant="outline"
              className="group border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-semibold px-10 py-6 rounded-2xl transition-all duration-300 hover:scale-105 shadow-lg"
            >
              <Link href="/events" className="flex items-center">
                Explore All Events
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* HeliTaxii Section */}
      <section className="relative py-20 md:py-32 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 opacity-20">
          <img src="/images/HeliTaxii/hero-helicopter.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-900/90" />
        </div>

        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Content */}
              <div className="text-white space-y-8">
                <div className="inline-flex items-center gap-3 bg-red-500/20 border border-red-400/30 rounded-full px-5 py-2.5">
                  <Sparkles className="h-5 w-5 text-red-400" />
                  <span className="text-sm font-semibold text-red-300">Limited Time Offer</span>
                  <Badge className="bg-red-500 text-white border-0 font-bold px-3">20% OFF</Badge>
                </div>

                <div>
                  <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 leading-tight">
                    Helicopter Rides <br />
                    <span className="bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
                      & Shuttles
                    </span>
                  </h2>
                  <p className="text-xl text-gray-300 leading-relaxed">
                    Experience Hornbill from the sky. Scenic joyrides, Dzükōu Valley aerial tours, and premium Kohima–Dimapur shuttles.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: Clock, text: "6–17 min flights" },
                    { icon: MapPin, text: "Multiple routes" },
                    { icon: Star, text: "5.0 rated" },
                    { icon: Award, text: "Festival special" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                      <item.icon className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                      <span className="text-sm font-medium">{item.text}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-4">
                  <Button
                    asChild
                    size="lg"
                    className="group bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold px-10 py-7 rounded-2xl shadow-2xl shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-300 hover:scale-105"
                  >
                    <Link href="/HeliTaxii" className="flex items-center">
                      Book HeliTaxii
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                  <div className="text-sm">
                    <div className="text-gray-400 mb-1">Starting from</div>
                    <div className="text-2xl font-bold">₹3,840 <span className="text-base text-gray-400 font-normal">per seat</span></div>
                  </div>
                </div>
              </div>

              {/* Image */}
              <div className="relative">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10">
                  <Image
                    src="/images/HeliTaxii/heli-mobile.jpg"
                    alt="HeliTaxii"
                    width={600}
                    height={400}
                    className="block lg:hidden w-full h-auto"
                  />
                  <Image
                    src="/images/HeliTaxii/heli-desktop.jpg"
                    alt="HeliTaxii"
                    width={800}
                    height={500}
                    className="hidden lg:block w-full h-auto"
                  />
                </div>
                {/* Decorative Elements */}
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-br from-red-500/30 to-orange-500/30 rounded-full blur-2xl" />
                <div className="absolute -top-6 -left-6 w-32 h-32 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-full blur-2xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 md:py-32 bg-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 text-gray-900">
              The Ahibi{" "}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Impact
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Trusted by thousands of event organizers, artists, and venues worldwide
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="group relative"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <Card className="relative h-full bg-white rounded-3xl p-10 border-2 border-gray-200 hover:border-blue-300 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 overflow-hidden">
                  {/* Background Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                  <div className="relative z-10 text-center space-y-6">
                    {/* Icon */}
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${stat.gradient} shadow-xl group-hover:scale-110 transition-transform duration-500`}>
                      <stat.icon className="h-10 w-10 text-white" strokeWidth={2} />
                    </div>

                    {/* Number */}
                    <div>
                      <div className="text-5xl md:text-6xl font-black text-gray-900 mb-2">
                        {stat.number}
                      </div>
                      <div className="text-lg font-bold text-gray-900 mb-1">
                        {stat.label}
                      </div>
                      <div className="text-sm text-gray-500">
                        {stat.description}
                      </div>
                    </div>
                  </div>
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
