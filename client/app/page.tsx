"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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

  // Stats
  const stats = [
    { value: 30, suffix: "+", label: "Events Hosted", icon: Calendar },
    { value: 60000, suffix: "+", label: "Tickets Sold", icon: Users },
    { value: 50000, suffix: "+", label: "Happy Users", icon: Star },
  ]

  const statsRef = useRef<HTMLDivElement | null>(null)
  const [statsInView, setStatsInView] = useState(false)
  const [animatedStats, setAnimatedStats] = useState<number[]>(
    stats.map(() => 0)
  )

  useEffect(() => {
    const el = statsRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!statsInView) return

    const duration = 1500
    const start = performance.now()

    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)

      setAnimatedStats(
        stats.map((stat) => Math.floor(stat.value * progress))
      )

      if (progress < 1) requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
  }, [statsInView])
  // ==================================================================
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
            mobileUrl: image.mobileUrl,
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

        const currentDate = new Date()
        const upcomingEvents = (data.data.events || []).filter((event) => {
          const eventEndDate = new Date(event.endDate || event.startDate)
          const isUpcoming = eventEndDate >= currentDate
          const isNotExcluded = event._id !== "68dac96e8d5dd14f277d5b1a"
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
      const isSwipe = Math.abs(distance) > 50

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
      const isSwipe = Math.abs(distance) > 50

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
    <div className="min-h-screen overflow-hidden bg-white">
      {/* Navbar */}
      <div className="sticky top-0 z-30 bg-white shadow-sm">
        <Navbar />
      </div>

      {/* Hero Section - Clean Zomato/District style */}
      <section className="relative py-16 bg-white overflow-hidden">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-10">

          {/* Left Content */}
          <div className="w-full md:w-1/2 text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-extrabold text-[#121212] leading-tight">
              Book <span className="text-[#ff0e0e]">Events.</span>
              <br /> Experience  <span className="text-[#ff0e0e]">Life.</span>
            </h1>

            <p className="text-lg md:text-2xl text-[#4A4A4A] mt-4 font-medium max-w-xl">
              Trusted event bookings across Nagaland. Discover concerts, festivals,
              workshops and more — all in one place.
            </p>

            <div className="flex gap-4 justify-center md:justify-start mt-8">
              <Button
                asChild
                className="bg-[#ff0e0e] hover:bg-[#e60000] text-white px-7 py-3 rounded-full font-semibold text-lg shadow-lg shadow-red-500/20"
              >
                <Link href="/events">Explore Events</Link>
              </Button>

              <Button
                variant="outline"
                asChild
                className="border border-gray-300 text-[#121212] px-7 py-3 rounded-full font-semibold text-lg hover:bg-gray-100 hover:text-[#ff0e0e]"
              >
                <Link href="/auth">Sign In</Link>
              </Button>
            </div>

            <div className="mt-6 text-sm text-gray-500">
              No booking fees • Easy refunds • Secure payments
            </div>
          </div>

          {/* Right Image */}
          <div className="w-full md:w-1/2">
            <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200">
              {loadingHeroImages ? (
                <div className="w-full h-64 md:h-80 lg:h-96 bg-gray-100 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : backgroundImages.length > 0 ? (
                <div className="relative w-full h-64 md:h-80 lg:h-96">
                  <Image
                    src={backgroundImages[currentBgSlide].url}
                    alt={`Hero ${currentBgSlide + 1}`}
                    fill
                    className="object-cover"
                    priority
                  />
                  {/* Very subtle overlay */}
                  <div className="absolute inset-0 bg-black/10" />
                </div>
              ) : (
                <div className="w-full h-64 md:h-80 lg:h-96 bg-gray-100" />
              )}
            </div>
          </div>

        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="container mx-auto px-4 group">
          <div className="text-center mb-8">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-[#ff0e0e] font-medium mb-3 text-sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              Featured Events
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-[#1C1C1C] transition-transform duration-300 group-hover:scale-[1.02] group-hover:text-[#ff0e0e]">
              Discover What's Happening
            </h2>
            <div className="mx-auto mt-2 h-1 w-12 bg-[#ff0e0e] rounded-full transition-all duration-300 group-hover:w-24" />
            <p className="text-gray-500 max-w-2xl mx-auto mt-2 transition-colors duration-300 group-hover:text-gray-700">
              From intimate concerts to grand festivals, find events that match your vibe.
            </p>
          </div>
          <div
            className="relative w-full mx-auto touch-pan-x"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {isLoading ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <div className="h-48 flex items-center justify-center text-red-500">
                <div className="bg-red-50 border border-red-100 rounded-lg p-4">{error}</div>
              </div>
            ) : featuredEvents.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-600">
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">No featured events available at the moment.</div>
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-3xl">
                  <div
                    className="flex transition-transform duration-700 ease-out"
                    style={{ transform: `translateX(-${currentSlide * (100 / slidesPerView)}%)` }}
                  >
                    {featuredEvents.map((event, index) => (
                      <div key={event._id} className="flex-shrink-0 px-2 py-2" style={{ width: `${100 / slidesPerView}%` }}>
                        <Card className="relative h-full rounded-3xl overflow-hidden border border-gray-100 shadow-md hover:shadow-xl transition-all bg-white">
                          <div className="flex flex-col h-full">
                            <AspectRatio ratio={16 / 9} className="relative">
                              <Image
                                src={event.banner || "/placeholder.svg?height=600&width=800&query=event%20venue"}
                                alt={event.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-700"
                                sizes="(max-width: 640px) 100vw, (max-width: 768px) 90vw, (max-width: 1024px) 80vw, 1200px"
                                priority={index === 0}
                              />
                            </AspectRatio>
                            <div className="p-4 space-y-3 flex-1 flex flex-col">
                              <h3 className="text-lg md:text-xl font-bold text-[#1C1C1C] leading-tight line-clamp-2">{event.title}</h3>
                              <div className="flex items-center justify-between text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  <span>{new Date(event.startDate).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  <span className="truncate">{event.location.city}</span>
                                </div>
                              </div>
                              <div className="mt-auto">
                                <Button
                                  className="w-full bg-[#ff0e0e] hover:bg-[#e60000] text-white rounded-full font-semibold py-2 shadow"
                                  asChild
                                >
                                  <Link href={`/events/${event._id}`} className="flex items-center justify-center gap-2">
                                    <span>Book Now</span>
                                    <ArrowRight className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>

                {featuredEvents.length > slidesPerView && (
                  <div className="flex justify-center mt-4 gap-2">
                    {Array.from({ length: maxSlide + 1 }).map((_, index) => (
                      <button
                        key={index}
                        className={`h-2 w-2 rounded-full transition-all ${index === currentSlide ? "bg-[#ff0e0e] w-8" : "bg-gray-300"}`}
                        onClick={() => handleGoTo(index)}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="text-center mt-6">
            <Button
              variant="outline"
              asChild
              className="border border-gray-300 text-[#1C1C1C] hover:bg-[#ff0e0e] hover:text-white rounded-full px-6 py-2"
            >
              <Link href="/events">View All Events</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div ref={statsRef} className="container mx-auto px-4 group">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold transition-transform duration-300 group-hover:scale-[1.02] group-hover:text-[#ff0e0e]">
              The Ahibi Impact
            </h2>
            <div className="mx-auto mt-2 h-1 w-12 bg-[#ff0e0e] rounded-full transition-all duration-300 group-hover:w-24" />
            <p className="text-gray-600 mt-2 transition-colors duration-300 group-hover:text-gray-800">
              Trusted by thousands across Nagaland
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="p-7 bg-white rounded-2xl shadow hover:shadow-xl transition group">
                  <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-xl bg-gray-100">
                    <stat.icon className="h-6 w-6 text-gray-700 group-hover:text-[#ff0e0e]" />
                  </div>

                  <div className="text-4xl md:text-5xl font-black mt-4">
                    {animatedStats[index].toLocaleString("en-IN")}
                    {stat.suffix}
                  </div>

                  <div className="text-gray-600 mt-1">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}