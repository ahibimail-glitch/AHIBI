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
  const [slidesPerView, setSlidesPerView] = useState(1)
  const [maxSlide, setMaxSlide] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // Background carousel state
  const [currentBgSlide, setCurrentBgSlide] = useState(0)
  const [isBgAutoPlaying, setIsBgAutoPlaying] = useState(true)
  const [backgroundImages, setBackgroundImages] = useState<{ url: string; mobileUrl?: string }[]>([])
  const [loadingHeroImages, setLoadingHeroImages] = useState(true)

  const stats = [
    { number: "30+", label: "Events Hosted", icon: Calendar, gradient: "from-blue-500 to-cyan-500" },
    { number: "60,000+", label: "Tickets Sold", icon: Users, gradient: "from-purple-500 to-pink-500" },
    { number: "50,000+", label: "Happy Users", icon: Star, gradient: "from-orange-500 to-red-500" },
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
          const images = data.data.map((image: any) => ({
            url: image.url,
            mobileUrl: image.mobileUrl
          }))
          setBackgroundImages(images)
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

        // Filter out past events (events where endDate has passed) and exclude specific event ID
        const currentDate = new Date()
        const upcomingEvents = (data.data.events || []).filter(event => {
          const eventEndDate = new Date(event.endDate || event.startDate)
          const isUpcoming = eventEndDate >= currentDate
          const isNotExcluded = event._id !== '68dac96e8d5dd14f277d5b1a'
          return isUpcoming && isNotExcluded
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

  // Set slides per view based on screen size and number of events
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        // Mobile view: always show 1 event
        setSlidesPerView(1)
      } else if (featuredEvents.length === 1) {
        setSlidesPerView(1)
      } else if (featuredEvents.length === 2) {
        setSlidesPerView(2)
      } else {
        let view = 1
        if (window.innerWidth >= 1280) view = Math.min(3, featuredEvents.length)
        else if (window.innerWidth >= 768) view = Math.min(2, featuredEvents.length)
        setSlidesPerView(view)
      }
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [featuredEvents.length])

  useEffect(() => {
    const newMaxSlide = Math.max(0, featuredEvents.length - slidesPerView)
    setMaxSlide(newMaxSlide)
    // Reset current slide if it exceeds new max
    setCurrentSlide((prev) => Math.min(prev, newMaxSlide))
  }, [slidesPerView, featuredEvents.length])

  // Background carousel logic
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

    const interval = setInterval(nextBgSlide, 4000)

    return () => clearInterval(interval)
  }, [isBgAutoPlaying, nextBgSlide, backgroundImages.length])

  // Featured events carousel logic
  const nextSlide = useCallback(() => {
    if (featuredEvents.length === 0) return
    setCurrentSlide((prev) => (prev >= maxSlide ? 0 : prev + 1))
  }, [featuredEvents.length, maxSlide])

  const prevSlide = () => {
    if (featuredEvents.length === 0) return
    setCurrentSlide((prev) => (prev <= 0 ? maxSlide : prev - 1))
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

  // Touch handling for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (touchStart !== null && touchEnd !== null) {
      const distance = touchStart - touchEnd
      const isSwipe = Math.abs(distance) > 50 // Minimum swipe distance

      if (isSwipe) {
        if (distance > 0) {
          handleNext()
        } else {
          handlePrev()
        }
      }
    }
    setTouchStart(null)
    setTouchEnd(null)
  }

  const handleBgTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleBgTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleBgTouchEnd = () => {
    if (touchStart !== null && touchEnd !== null) {
      const distance = touchStart - touchEnd
      const isSwipe = Math.abs(distance) > 50 // Minimum swipe distance

      if (isSwipe) {
        if (distance > 0) {
          handleBgNext()
        } else {
          handleBgPrev()
        }
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
    <div className="min-h-screen overflow-hidden bg-gray-900">
      {/* Hero Section with Background Carousel */}
      <section
        className="relative py-10 md:py-16 overflow-hidden min-h-[100vh] flex items-center bg-gradient-to-br from-gray-900 via-indigo-900 to-blue-900"
        onMouseEnter={() => setIsBgAutoPlaying(false)}
        onMouseLeave={() => setIsBgAutoPlaying(true)}
        onTouchStart={handleBgTouchStart}
        onTouchMove={handleBgTouchMove}
        onTouchEnd={handleBgTouchEnd}
      >
        {/* Background Image Carousel */}
        <div className="absolute top-0 left-0 right-0 z-20">
          <Navbar />
        </div>
        <div className="absolute inset-0 z-0">
          <div className="relative w-full h-full overflow-hidden">
            {loadingHeroImages ? (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-indigo-900 to-blue-900 flex items-center justify-center">
                <div className="relative">
                  <div className="animate-pulse rounded-full h-32 w-32 bg-gradient-to-br from-indigo-600/20 to-blue-600/20" />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent animate-ping" />
                </div>
              </div>
            ) : backgroundImages.length > 0 ? (
              backgroundImages.map((image, index) => (
                <div
                  key={index}
                  className="absolute inset-0 transition-transform duration-1000 ease-in-out will-change-transform"
                  style={{ transform: `translateX(${(index - currentBgSlide) * 100}%)` }}
                >
                  <picture>
                    <source media="(max-width: 768px)" srcSet={image.mobileUrl || image.url} />
                    <img
                      src={image.url || "/placeholder.svg"}
                      alt={`Background ${index + 1}`}
                      className="w-full h-full object-cover opacity-80 brightness-75"
                    />
                  </picture>
                </div>
              ))
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-indigo-900 to-blue-900" />
            )}
            {/* Overlay to enhance text visibility */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/30 to-gray-900/50" />
          </div>
        </div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-5">
          <div className="absolute top-20 left-20 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-indigo-600/5 to-blue-600/5 rounded-full blur-3xl animate-spin-slow" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4">
          <div className="text-center max-w-5xl mx-auto">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 leading-tight animate-fade-in-up delay-200">
              <span className="sm:mt-8 block bg-gradient-to-r from-white via-blue-200 to-cyan-300 bg-clip-text text-transparent">
                Click. Book.
              </span>
              <span className="block bg-gradient-to-r from-cyan-300 via-blue-200 to-indigo-300 bg-clip-text text-transparent mt-2">
                Go!
              </span>
            </h1>

            <p className="text-md md:text-2xl text-white mb-12 max-w-4xl mx-auto leading-relaxed animate-fade-in-up delay-400 drop-shadow-md">
              Discover extraordinary events, connect with talented artists, and manage unforgettable experiences
              <span className="block mt-2 font-semibold bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text text-transparent">— all in one powerful platform.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-fade-in-up delay-600">
              <Button
                size="lg"
                asChild
                className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-2xl shadow-indigo-600/25 
             px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 
             text-sm sm:text-base md:text-lg font-semibold 
             transform hover:scale-105 transition-all duration-300"
              >
                <Link href="/events" className="flex items-center">
                  Explore Events
                  <ArrowRight className="ml-2 h-4 sm:h-5 md:h-5 w-4 sm:w-5 md:w-5" />
                </Link>
              </Button>

              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-2 border-white/50 text-white hover:bg-white hover:text-indigo-900 bg-transparent 
             px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 
             text-sm sm:text-base md:text-lg font-semibold 
             transform hover:scale-105 transition-all duration-300"
              >
                <Link href="/auth" className="flex items-center">
                  <Play className="mr-2 h-4 sm:h-5 md:h-5 w-4 sm:w-5 md:w-5" />
                  Get Started
                </Link>
              </Button>

            </div>
          </div>
        </div>

        {/* Background Carousel Controls - Hidden on mobile */}
        <div className="absolute inset-y-0 left-0 right-0 z-20 pointer-events-none hidden md:flex items-center justify-between px-4">
          <button
            className="flex items-center justify-center bg-black/40 p-3 rounded-full text-white hover:bg-black/60 transition pointer-events-auto"
            onClick={handleBgPrev}
          >
            <ChevronLeft size={32} />
          </button>
          <button
            className="flex items-center justify-center bg-black/40 p-3 rounded-full text-white hover:bg-black/60 transition pointer-events-auto"
            onClick={handleBgNext}
          >
            <ChevronRight size={32} />
          </button>
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

      {/* Featured Events Carousel */}
      <section className="py-8 sm:py-12 md:py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          {/* Section Heading */}
          <div className="text-center mb-6 sm:mb-8 md:mb-12 lg:mb-16">
            <div className="inline-flex items-center px-2.5 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-full bg-indigo-100/50 text-indigo-600 font-medium mb-2 sm:mb-3 md:mb-4 text-xs sm:text-sm md:text-base border border-indigo-200/50">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Featured Events
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 md:mb-6 bg-gradient-to-r from-indigo-600 to-cyan-400 bg-clip-text text-transparent leading-tight">
              Discover What's Happening
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-sm sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-auto px-2 sm:px-0 leading-relaxed">
              From intimate concerts to grand festivals, find events that match your vibe and create memories that last a lifetime.
            </p>
          </div>

          {/* Carousel */}
          <div
            className="relative w-full max-w-xs sm:max-w-sm md:max-w-4xl lg:max-w-6xl mx-auto touch-pan-x"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {isLoading ? (
              <div className="flex justify-center items-center h-48 sm:h-64 md:h-80 lg:h-96 xl:h-[600px]">
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-16 lg:w-16 animate-spin text-indigo-400" />
              </div>
            ) : error ? (
              <div className="h-48 sm:h-64 md:h-80 lg:h-96 xl:h-[600px] flex items-center justify-center text-red-400 px-4">
                <div className="bg-red-50/50 border border-red-200/50 rounded-lg p-4 sm:p-6 md:p-8 backdrop-blur-sm max-w-full">
                  <p className="text-sm sm:text-base md:text-lg font-medium text-center">{error}</p>
                </div>
              </div>
            ) : featuredEvents.length === 0 ? (
              <div className="h-48 sm:h-64 md:h-80 lg:h-96 xl:h-[600px] flex items-center justify-center text-gray-600 px-4">
                <div className="bg-indigo-50/50 border border-indigo-200/50 rounded-lg p-4 sm:p-6 md:p-8 backdrop-blur-sm max-w-full">
                  <p className="text-sm sm:text-base md:text-lg text-center">No featured events available at the moment.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg sm:shadow-xl md:shadow-2xl">
                  <div
                    className="flex transition-transform duration-700 ease-out"
                    style={{ transform: `translateX(-${currentSlide * (100 / slidesPerView)}%)` }}
                  >
                    {featuredEvents.map((event, index) => (
                      <div
                        key={event._id}
                        className="flex-shrink-0 px-1 sm:px-2"
                        style={{ width: `${100 / slidesPerView}%` }}
                      >
                        <Card className="relative h-full overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl border-0 shadow-lg sm:shadow-xl md:shadow-2xl group bg-white backdrop-blur-sm border border-indigo-200/50">
                          <AspectRatio ratio={16 / 9} className="relative">
                            <Image
                              src={event.banner || "/placeholder.svg?height=600&width=800&query=event%20venue"}
                              alt={event.title}
                              fill
                              className="object-contain group-hover:scale-105 transition-transform duration-700"
                              sizes="(max-width: 640px) 100vw, (max-width: 768px) 90vw, (max-width: 1024px) 80vw, 1200px"
                              priority={index === 0}
                            />

                            {/* Enhanced Mobile Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/60 sm:via-gray-900/50 md:via-indigo-900/40 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/50 sm:from-indigo-900/40 via-transparent to-cyan-900/40 sm:to-cyan-900/30" />

                            {/* Content */}
                            <div className="absolute bottom-0 left-0 right-0 text-white p-2 sm:p-4 md:p-6 lg:p-8 space-y-1 sm:space-y-2 md:space-y-3">
                              <h3 className="text-sm sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold mb-1 sm:mb-2 md:mb-4 group-hover:text-indigo-300 transition-colors duration-300 line-clamp-1 leading-tight truncate">
                                {event.title}
                              </h3>

                              {/* Mobile: Single horizontal line with date and location */}
                              <div className="flex items-center justify-between text-xs sm:text-sm md:text-base text-indigo-100 mb-1 sm:mb-2 md:mb-4 lg:mb-6 gap-2">
                                <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
                                  <Clock className="h-2.5 w-2.5 sm:h-4 sm:w-4 flex-shrink-0" />
                                  <span className="font-medium text-xs sm:text-sm truncate">{new Date(event.startDate).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
                                  <MapPin className="h-2.5 w-2.5 sm:h-4 sm:w-4 flex-shrink-0" />
                                  <span className="font-medium text-xs sm:text-sm truncate">{event.location.city}</span>
                                </div>
                              </div>

                              <Button
                                className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white font-semibold transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-md sm:shadow-lg md:shadow-xl text-xs sm:text-sm md:text-base py-1.5 sm:py-2 md:py-3 px-3 sm:px-6 md:px-8"
                                asChild
                                size="sm"
                              >
                                <Link href={`/events/${event._id}`} className="flex items-center justify-center">
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

                {/* Enhanced Mobile Indicators */}
                {featuredEvents.length > slidesPerView && (
                  <div className="flex justify-center mt-4 sm:mt-6 md:mt-8 space-x-1.5 sm:space-x-2 md:space-x-3">
                    {Array.from({ length: maxSlide + 1 }).map((_, index) => (
                      <button
                        key={index}
                        className={`h-1.5 sm:h-2 md:h-3 rounded-full transition-all duration-300 ${index === currentSlide
                          ? "bg-indigo-400 w-4 sm:w-6 md:w-8 lg:w-12 shadow-sm sm:shadow-md"
                          : "bg-indigo-300/50 hover:bg-indigo-300/70 active:bg-indigo-300 w-1.5 sm:w-2 md:w-3"
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

          {/* View All Button */}
          <div className="text-center mt-6 sm:mt-8 md:mt-10 lg:mt-12">
            <Button
              variant="outline"
              asChild
              size="default"
              className="border-indigo-400/50 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all duration-300 backdrop-blur-sm text-sm sm:text-base md:text-lg px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3"
            >
              <Link href="/events" className="flex items-center">
                View All Events
                <ArrowRight className="ml-1.5 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* HELITAXI ADD */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-10 sm:py-14 md:py-20">

        <div className="absolute inset-0 opacity-20">
          <img
            src="/images/HeliTaxii/hero-helicopter.jpg"
            alt="Helicopter over hills"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-slate-900/80" />
        </div>

        <div className="relative container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="text-white">

              <div className="inline-flex items-center gap-2 bg-red-500/10 text-red-300 border border-red-400/30 rounded-full px-3 py-1 text-xs sm:text-sm mb-3">
                <span>Limited Period</span>
                <Badge variant="secondary" className="bg-red-500 text-white border-0 text-[10px]">20% OFF</Badge>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-3">
                Helicopter Rides & Shuttles
              </h2>
              <p className="text-slate-200/90 text-sm sm:text-base md:text-lg mb-6">
                Experience Hornbill from the sky. Joyrides, Dzükōu Valley aerial tours, and Kohima–Dimapur shuttles.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6 text-slate-200/90 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-cyan-300" />
                  <span>Fast transfers • 6–17 min flights</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-cyan-300" />
                  <span>Kohima • Kisama • Dzükōu</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-300" />
                  <span>5.0 rated experience</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-green-400/50 text-green-200 bg-green-900/20">Festival Special</Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="bg-red-500 hover:bg-red-600 text-white shadow-lg">
                  <Link href="/HeliTaxii">Book HeliTaxii</Link>
                </Button>
                <span className="text-slate-300 text-xs sm:text-sm">Starting at ₹3,840 per seat</span>
              </div>
            </div>

            <div className="w-full">
              <div>
                <Image
                  src="/images/HeliTaxii/heli-mobile.jpg"
                  alt="Mobile Banner"
                  width={500}
                  height={300}
                  className="block md:hidden w-full h-auto"
                />
                <Image
                  src="/images/HeliTaxii/heli-desktop.jpg"
                  alt="Desktop Banner"
                  width={1500}
                  height={500}
                  className="hidden md:block w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 md:py-24 bg-gradient-to-r from-gray-50 via-indigo-50 to-cyan-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-cyan-400 bg-clip-text text-transparent">
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
                <Card className="p-8 border border-indigo-200/50 shadow-xl hover:shadow-2xl transition-all duration-500 bg-white/80 backdrop-blur-sm hover:bg-white">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${stat.gradient} mb-6 shadow-lg`}>
                    <stat.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className={`text-5xl md:text-6xl font-black bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mb-4`}>
                    {stat.number}
                  </div>
                  <div className="text-xl font-semibold text-gray-600">{stat.label}</div>
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