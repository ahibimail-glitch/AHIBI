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
    { number: "30+", label: "Events Hosted", icon: Calendar },
    { number: "60,000+", label: "Tickets Sold", icon: Users },
    { number: "50,000+", label: "Happy Users", icon: Star },
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
      <section className="relative py-16 overflow-hidden">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-8">
          <div className="w-full md:w-1/2 text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-extrabold text-[#1C1C1C] leading-tight">
              Book Events.
              <br /> Experience Life.
            </h1>

            <p className="text-lg md:text-2xl text-[#3C3C3C] mt-4 font-medium max-w-xl">
              Trusted event bookings across Nagaland. Discover concerts, festivals, workshops and more — all in one place.
            </p>

            <div className="flex gap-4 justify-center md:justify-start mt-8">
              <Button
                asChild
                className="bg-[#EF4F5F] hover:bg-[#d43f4f] text-white px-6 py-3 rounded-full font-semibold text-lg shadow-md"
              >
                <Link href="/events">Explore Events</Link>
              </Button>

              <Button
                variant="outline"
                asChild
                className="border border-gray-300 text-[#1C1C1C] px-6 py-3 rounded-full font-semibold text-lg hover:bg-gray-50"
              >
                <Link href="/auth">Sign In</Link>
              </Button>
            </div>

            <div className="mt-6 text-sm text-gray-500">No booking fees • Easy refunds • Secure payments</div>
          </div>

          <div className="w-full md:w-1/2">
            <div className="rounded-2xl overflow-hidden shadow-md">
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
                  <div className="absolute inset-0 bg-black/20" />
                </div>
              ) : (
                <div className="w-full h-64 md:h-80 lg:h-96 bg-gray-100" />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events Carousel */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-[#EF4F5F] font-medium mb-3 text-sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              Featured Events
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-[#1C1C1C]">Discover What's Happening</h2>
            <p className="text-gray-500 max-w-2xl mx-auto mt-2">From intimate concerts to grand festivals, find events that match your vibe.</p>
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
                      <div key={event._id} className="flex-shrink-0 px-2" style={{ width: `${100 / slidesPerView}%` }}>
                        <Card className="relative h-full rounded-3xl overflow-hidden border border-gray-100 shadow-md hover:shadow-xl transition-all bg-white">
                          <AspectRatio ratio={16 / 9} className="relative">
                            <Image
                              src={event.banner || "/placeholder.svg?height=600&width=800&query=event%20venue"}
                              alt={event.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-700"
                              sizes="(max-width: 640px) 100vw, (max-width: 768px) 90vw, (max-width: 1024px) 80vw, 1200px"
                              priority={index === 0}
                            />

                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                            <div className="absolute bottom-0 left-0 right-0 text-white p-4 space-y-2">
                              <h3 className="text-lg md:text-xl font-bold text-white leading-tight line-clamp-1">{event.title}</h3>

                              <div className="flex items-center justify-between text-sm text-white/90">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  <span>{new Date(event.startDate).toLocaleDateString()}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  <span className="truncate">{event.location.city}</span>
                                </div>
                              </div>

                              <div className="mt-3">
                                <Button
                                  className="w-full bg-[#EF4F5F] hover:bg-[#d43f4f] text-white rounded-full font-semibold py-2 shadow"
                                  asChild
                                >
                                  <Link href={`/events/${event._id}`} className="flex items-center justify-center gap-2">
                                    <span>Book Now</span>
                                    <ArrowRight className="h-4 w-4" />
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

                {featuredEvents.length > slidesPerView && (
                  <div className="flex justify-center mt-4 gap-2">
                    {Array.from({ length: maxSlide + 1 }).map((_, index) => (
                      <button
                        key={index}
                        className={`h-2 w-2 rounded-full transition-all ${index === currentSlide ? "bg-[#EF4F5F] w-8" : "bg-gray-300"}`}
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
              className="border border-gray-300 text-[#1C1C1C] hover:bg-[#EF4F5F] hover:text-white rounded-full px-6 py-2"
            >
              <Link href="/events">View All Events</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* HELITAXI ADD - cleaned */}
      {/* <section className="relative overflow-hidden py-10 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 rounded-full px-3 py-1 text-sm mb-3">
                <span>Limited Period</span>
                <Badge variant="secondary" className="bg-red-500 text-white border-0 text-[10px]">20% OFF</Badge>
              </div>

              <h2 className="text-3xl md:text-4xl font-extrabold text-[#1C1C1C] mb-3">Helicopter Rides & Shuttles</h2>
              <p className="text-gray-600 mb-6">Experience Hornbill from the sky. Joyrides, Dzükōu Valley aerial tours, and Kohima–Dimapur shuttles.</p>

              <div className="flex items-center gap-4">
                <Button asChild size="lg" className="bg-[#EF4F5F] hover:bg-[#d43f4f] text-white rounded-full px-6 py-3 shadow">
                  <Link href="/HeliTaxii">Book HeliTaxii</Link>
                </Button>
                <span className="text-gray-500 text-sm">Starting at ₹3,840 per seat</span>
              </div>
            </div>

            <div className="w-full">
              <div className="rounded-2xl overflow-hidden shadow-md">
                <Image src="/images/HeliTaxii/heli-desktop.jpg" alt="Desktop Banner" width={1500} height={500} className="w-full h-auto object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section> */}

      {/* Stats Section */}
      <section className="py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4">

          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-[#1C1C1C] mb-4 tracking-tight">
              The Ahibi Impact
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Trusted by thousands of organizers, artists and venues across Nagaland
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div
                  className="
              relative p-10 rounded-3xl bg-white/70 backdrop-blur-md border border-gray-200 
              shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group
            "
                >
                  {/* Icon Circle */}
                  <div className="
              w-20 h-20 mx-auto rounded-2xl flex items-center justify-center 
              bg-gradient-to-br from-gray-100 to-gray-200 
              shadow-md group-hover:shadow-xl transition-all
            ">
                    <stat.icon className="h-8 w-8 text-gray-700 group-hover:text-[#EF4F5F] transition" />
                  </div>

                  {/* Number */}
                  <div className="
              text-5xl md:text-6xl font-black text-[#1C1C1C] mt-6 mb-2 
              tracking-tight group-hover:text-[#EF4F5F] transition
            ">
                    {stat.number}
                  </div>

                  {/* Label */}
                  <div className="text-lg text-gray-600 font-medium">
                    {stat.label}
                  </div>

                  {/* Glow Effect Behind Card */}
                  <div className="
              absolute inset-0 rounded-3xl bg-gradient-to-br 
              from-[#EF4F5F]/10 to-transparent opacity-0 
              group-hover:opacity-100 blur-2xl transition
            "></div>
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
