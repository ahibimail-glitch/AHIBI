"use client"

import { useEffect, useMemo, useState, useRef, type ReactNode, type TouchEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowRight, Calendar, ChevronRight, Clock, Loader2, MapPin, Star, TrendingUp, Users } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import Navbar from "./Navbar"
import Footer from "./Footer"
import type { EventsResponse, Event } from "@/types/event"
import { AspectRatio } from "@/components/ui/aspect-ratio"

type PublicArtist = {
  _id: string
  name?: string
  city?: string
  gallery?: { photos?: Array<{ url?: string; isProfileImage?: boolean }> }
  profilePic?: string
}

type PublicVenue = {
  _id: string
  name?: string
  address?: { city?: string; state?: string }
  documents?: { venueImages?: Array<{ url?: string; isMain?: boolean }> }
  gallery?: Array<{ url?: string }>
}

const FALLBACK_IMAGES = {
  event: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
  artist: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
  venue: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
  sports: "https://images.unsplash.com/photo-1461896836934-fb8d8f0b8c58?w=800&q=80",
  organizer: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80",
  default: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80",
}

const VENUE_FALLBACKS = [
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80",
  "https://images.unsplash.com/photo-1515169067868-5387ec356754?w=800&q=80",
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80",
  "https://images.unsplash.com/photo-1496307653780-42ee777d4833?w=800&q=80",
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80",
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80",
]

const resolveImageUrl = (url?: string, fallbackType: keyof typeof FALLBACK_IMAGES = "default") => {
  if (!url) return FALLBACK_IMAGES[fallbackType]
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  const base = process.env.NEXT_PUBLIC_API_URL || ""
  if (!base) return url
  if (url.startsWith("/")) return `${base}${url}`
  return `${base}/${url}`
}

const getArtistImage = (artist: PublicArtist) => {
  const profilePhoto = artist.gallery?.photos?.find((p) => p?.isProfileImage)?.url
  const anyPhoto = artist.gallery?.photos?.[0]?.url
  return resolveImageUrl(profilePhoto || anyPhoto || artist.profilePic, "artist")
}

const getVenueImage = (venue: PublicVenue, idx?: number) => {
  const main = venue.documents?.venueImages?.find((i) => i?.isMain)?.url
  const anyDoc = venue.documents?.venueImages?.[0]?.url
  const anyGallery = venue.gallery?.[0]?.url
  const chosen = main || anyDoc || anyGallery
  if (chosen) return resolveImageUrl(chosen, "venue")
  if (typeof idx === "number" && VENUE_FALLBACKS.length > 0) return VENUE_FALLBACKS[idx % VENUE_FALLBACKS.length]
  return FALLBACK_IMAGES.venue
}

const getEventImage = (event?: Event) => resolveImageUrl(event?.banner, "event")

const Section = ({
  title,
  subtitle,
  children,
  href,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  href?: string
}) => (
  <section className="mt-8">
    <div className="flex items-center justify-between px-4 mb-3">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="flex items-center text-sm text-red-500 font-medium">
          See all <ChevronRight className="h-4 w-4 ml-1" />
        </Link>
      )}
    </div>
    <div className="flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide">{children}</div>
  </section>
)

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([])
  const [venues, setVenues] = useState<PublicVenue[]>([])
  const [artists, setArtists] = useState<PublicArtist[]>([])
  const [loading, setLoading] = useState(true)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slidesPerView, setSlidesPerView] = useState(1)
  const touchStartXRef = useRef<number | null>(null)
  const touchDeltaXRef = useRef(0)

  const stats = useMemo(
    () => [
      { value: 60, suffix: "+", label: "Events Hosted", icon: Calendar },
      { value: 200000, suffix: "+", label: "Tickets Sold", icon: Users },
      { value: 80000, suffix: "+", label: "Happy Users", icon: Star },
    ],
    []
  )
  const statsRef = useRef<HTMLDivElement | null>(null)
  const [statsInView, setStatsInView] = useState(false)
  const [animatedStats, setAnimatedStats] = useState<number[]>(() => stats.map(() => 0))

  useEffect(() => {
    const el = statsRef.current
    if (!el) return
    if (statsInView) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          setStatsInView(true)
        }
      },
      { threshold: 0.35 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [statsInView])

  useEffect(() => {
    if (!statsInView) return

    const targets = stats.map((s) => s.value)
    const durationMs = 1200
    const start = performance.now()

    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setAnimatedStats(targets.map((v) => Math.round(v * eased)))
      if (t < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [statsInView, stats])

  const [currentBgSlide, setCurrentBgSlide] = useState(0)
  const [backgroundImages, setBackgroundImages] = useState<Array<{ url: string; mobileUrl?: string }>>([])
  const [loadingHeroImages, setLoadingHeroImages] = useState(true)
  const [isMobileViewport, setIsMobileViewport] = useState(false)

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true)
      try {
        const [eventsRes, venuesRes, artistsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events?limit=30`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/venue`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/artist/public?limit=12`),
        ])

        if (eventsRes.ok) {
          const data: EventsResponse = await eventsRes.json()
          const currentDate = new Date()
          const normalized = (data.data?.events || []).filter((event) => {
            const eventEndDate = new Date(event.endDate || event.startDate)
            const isUpcoming = eventEndDate >= currentDate
            const isNotExcluded = event._id !== "68dac96e8d5dd14f277d5b1a"
            return isUpcoming && isNotExcluded
          })
          setEvents(normalized)
        }

        if (venuesRes.ok) {
          const data = await venuesRes.json()
          setVenues(data?.data?.venues || [])
        }

        if (artistsRes.ok) {
          const data = await artistsRes.json()
          setArtists(data?.data?.artists || [])
        }
      } catch {
        setEvents([])
        setVenues([])
        setArtists([])
      } finally {
        setLoading(false)
      }
    }

    fetchHomeData()
  }, [])

  useEffect(() => {
    const updateViewport = () => {
      setIsMobileViewport(window.innerWidth < 640)
    }
    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  useEffect(() => {
    const fetchHeroImages = async () => {
      setLoadingHeroImages(true)
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hero-images?active=true`)
        if (!response.ok) throw new Error("Failed to fetch hero images")
        const data = await response.json()

        if (data?.success && Array.isArray(data?.data) && data.data.length > 0) {
          const images = data.data.map((img: any) => ({
            url: resolveImageUrl(img?.url),
            mobileUrl: img?.mobileUrl ? resolveImageUrl(img.mobileUrl) : undefined,
          }))
          setBackgroundImages(images)
        } else {
          setBackgroundImages([{ url: "/images/carausel1.jpg" }, { url: "/images/carausel2.jpg" }, { url: "/images/carausel3.jpg" }])
        }
      } catch {
        setBackgroundImages([{ url: "/images/carausel1.jpg" }, { url: "/images/carausel2.jpg" }, { url: "/images/carausel3.jpg" }])
      } finally {
        setLoadingHeroImages(false)
      }
    }

    fetchHeroImages()
  }, [])

  useEffect(() => {
    if (backgroundImages.length <= 1) return
    const interval = setInterval(() => {
      setCurrentBgSlide((prev) => (prev + 1) % backgroundImages.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [backgroundImages.length])

  useEffect(() => {
    const fetchFeatured = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events?isFeatured=true&limit=10`)
        if (!response.ok) {
          setFeaturedEvents([])
          setError("Failed to fetch featured events")
          return
        }
        const data: EventsResponse = await response.json()
        const currentDate = new Date()
        const normalized = (data.data?.events || []).filter((event) => {
          const eventEndDate = new Date(event.endDate || event.startDate)
          const isUpcoming = eventEndDate >= currentDate
          const isNotExcluded = event._id !== "68dac96e8d5dd14f277d5b1a"
          return isUpcoming && isNotExcluded
        })
        setFeaturedEvents(normalized)
      } catch {
        setFeaturedEvents([])
        setError("Failed to fetch featured events")
      } finally {
        setIsLoading(false)
      }
    }
    fetchFeatured()
  }, [])

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w >= 1024) setSlidesPerView(3)
      else if (w >= 768) setSlidesPerView(2)
      else setSlidesPerView(1)
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const maxSlide = useMemo(() => {
    if (featuredEvents.length <= slidesPerView) return 0
    return Math.max(0, featuredEvents.length - slidesPerView)
  }, [featuredEvents.length, slidesPerView])

  useEffect(() => {
    if (!isAutoPlaying) return
    if (featuredEvents.length <= slidesPerView) return
    const id = window.setInterval(() => {
      setCurrentSlide((prev) => (prev >= maxSlide ? 0 : prev + 1))
    }, 5000)
    return () => window.clearInterval(id)
  }, [isAutoPlaying, featuredEvents.length, slidesPerView, maxSlide])

  useEffect(() => {
    setCurrentSlide((prev) => Math.min(prev, maxSlide))
  }, [maxSlide])

  const handleGoTo = (idx: number) => {
    const next = Math.min(Math.max(0, idx), maxSlide)
    setCurrentSlide(next)
  }

  const handleTouchStart = (e: TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null
    touchDeltaXRef.current = 0
  }

  const handleTouchMove = (e: TouchEvent) => {
    const startX = touchStartXRef.current
    const currentX = e.touches[0]?.clientX
    if (startX == null || currentX == null) return
    touchDeltaXRef.current = currentX - startX
  }

  const handleTouchEnd = () => {
    const dx = touchDeltaXRef.current
    const threshold = 40
    if (dx > threshold) {
      handleGoTo(currentSlide - 1)
    } else if (dx < -threshold) {
      handleGoTo(currentSlide + 1)
    }
    touchStartXRef.current = null
    touchDeltaXRef.current = 0
  }

  const offeringTiles = useMemo(() => {
  return [
    {
      label: "Events",
      href: "/events",
      image:
        "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80",
      count: events.length,
    },
    {
      label: "Sports",
      href: "/sports",
      image:
        "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80",
      count: events.filter((e) =>
        (e.category || "").toLowerCase().includes("sport")
      ).length,
    },
    {
      label: "Artists",
      href: "/allArtists",
      image:
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80",
      count: artists.length,
    },
    {
      label: "Venues",
      href: "/allVenues",
      image:
        "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=80",
      count: venues.length,
    },
    {
      label: "Organizers",
      href: "/allOrganizers",
      image:
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80",
      count: null,
    },
  ]
}, [events, artists, venues])


  const topEvents = useMemo(() => events.slice(0, 8), [events])
  const comedyEvents = useMemo(
    () => events.filter((e) => (e.category || "").toLowerCase().includes("comedy")).slice(0, 8),
    [events]
  )
  const sportsEvents = useMemo(
    () => events.filter((e) => (e.category || "").toLowerCase().includes("sport")).slice(0, 8),
    [events]
  )


  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />

      {/* Hero Carousel Banner */}
      <section className="relative w-full bg-white ">
        {loadingHeroImages ? (
          <div className="w-full h-[180px] sm:h-[250px] md:h-[350px] lg:h-[450px] bg-gray-200 animate-pulse" />
        ) : (
          <div className="relative w-full h-[180px] sm:h-[250px] md:h-[350px] lg:h-[450px] overflow-hidden">
            {backgroundImages.map((image, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  index === currentBgSlide ? "opacity-100" : "opacity-0"
                }`}
              >
                <Image
                  src={(isMobileViewport && image.mobileUrl ? image.mobileUrl : image.url) || "/images/carausel1.jpg"}
                  alt={`Banner ${index + 1}`}
                  fill
                  className="object-cover"
                  priority={index === 0}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              </div>
            ))}
            
            {/* Carousel Indicators */}
            {backgroundImages.length > 1 && (
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-10">
                {backgroundImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentBgSlide(index)}
                    className={`h-1 rounded-full transition-all ${
                      index === currentBgSlide ? "bg-white w-6" : "bg-white/50 w-1"
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Featured Events Section */}
      <section className="py-4 sm:py-6 md:py-8 bg-white">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#1C1C1C]">Recommended Events</h2>
            <Link href="/events" className="text-[#ff0e0e] hover:underline text-xs sm:text-sm font-medium flex items-center gap-0.5">
              See All <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-md h-48 sm:h-64 md:h-72 lg:h-80 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-6 text-red-500 text-sm">{error}</div>
          ) : featuredEvents.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">No featured events available</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
              {featuredEvents.slice(0, 10).map((event) => (
                <Link key={event._id} href={`/events/${event._id}`}>
                  <Card className="group overflow-hidden rounded-md border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer">
                    <div className="relative aspect-[2/3]">
                      <Image
                        src={event.banner || "/placeholder.svg"}
                        alt={event.title}
                        fill
                        className="object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-1.5 sm:p-2 md:p-3 bg-white">
                      <h3 className="font-semibold text-[10px] sm:text-xs md:text-sm line-clamp-1 text-gray-900">{event.title}</h3>
                      <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-500 mt-0.5">{event.category}</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Top Events Section */}
      <section className="py-4 sm:py-6 md:py-8 bg-[#2b3148]">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white">The Best Of Live Events</h2>
            <Link href="/events" className="text-[#ff0e0e] hover:underline text-xs sm:text-sm font-medium flex items-center gap-0.5">
              See All <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-700 rounded-md h-48 sm:h-64 md:h-72 lg:h-80 animate-pulse" />
              ))}
            </div>
          ) : topEvents.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">No events available</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
              {topEvents.map((event) => (
                <Link key={event._id} href={`/events/${event._id}`}>
                  <Card className="group overflow-hidden rounded-md border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer">
                    <div className="relative aspect-[2/3]">
                      <Image
                        src={event.banner || "/placeholder.svg"}
                        alt={event.title}
                        fill
                        className="object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-1.5 sm:p-2 md:p-3 bg-white">
                      <h3 className="font-semibold text-[10px] sm:text-xs md:text-sm line-clamp-1 text-gray-900">{event.title}</h3>
                      <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-500 mt-0.5">{event.location.city}</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Comedy Events Section */}
      {comedyEvents.length > 0 && (
        <section className="py-4 sm:py-6 md:py-8 bg-white">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#1C1C1C]">Laughter Therapy</h2>
              <Link href="/events?category=comedy" className="text-[#ff0e0e] hover:underline text-xs sm:text-sm font-medium flex items-center gap-0.5">
                See All <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
              {comedyEvents.map((event) => (
                <Link key={event._id} href={`/events/${event._id}`}>
                  <Card className="group overflow-hidden rounded-md border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer">
                    <div className="relative aspect-[2/3]">
                      <Image
                        src={event.banner || "/placeholder.svg"}
                        alt={event.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-1.5 sm:p-2 md:p-3 bg-white">
                      <h3 className="font-semibold text-[10px] sm:text-xs md:text-sm line-clamp-1 text-gray-900">{event.title}</h3>
                      <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-500 mt-0.5">{event.location.city}</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sports Events Section */}
      {sportsEvents.length > 0 && (
        <section className="py-4 sm:py-6 md:py-8 bg-[#2b3148]">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white">Sports Events</h2>
              <Link href="/sports" className="text-[#ff0e0e] hover:underline text-xs sm:text-sm font-medium flex items-center gap-0.5">
                See All <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
              {sportsEvents.map((event) => (
                <Link key={event._id} href={`/events/${event._id}`}>
                  <Card className="group overflow-hidden rounded-md border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer">
                    <div className="relative aspect-[2/3]">
                      <Image
                        src={event.banner || "/placeholder.svg"}
                        alt={event.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-1.5 sm:p-2 md:p-3 bg-white">
                      <h3 className="font-semibold text-[10px] sm:text-xs md:text-sm line-clamp-1 text-gray-900">{event.title}</h3>
                      <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-500 mt-0.5">{event.location.city}</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Explore Categories */}
      <section className="py-4 sm:py-6 md:py-8 bg-white">
        <div className="container mx-auto px-3 sm:px-4">
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#1C1C1C] mb-3 sm:mb-4">Explore More</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
            {offeringTiles.map((item) => (
              <Link key={item.label} href={item.href}>
                <Card className="relative h-24 sm:h-32 md:h-36 lg:h-40 rounded-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow border-0">
                  <Image src={item.image} alt={item.label} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  <div className="absolute bottom-2 left-2 text-white">
                    <div className="font-bold text-xs sm:text-sm md:text-base">{item.label}</div>
                    {item.count !== null && item.count > 0 && (
                      <div className="text-[9px] sm:text-[10px] md:text-xs opacity-90">{item.count} available</div>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Venues Section */}
      {venues.length > 0 && (
        <section className="py-4 sm:py-6 md:py-8 bg-[#f5f5f5]">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#1C1C1C]">Popular Venues</h2>
              <Link href="/allVenues/list" className="text-[#ff0e0e] hover:underline text-xs sm:text-sm font-medium flex items-center gap-0.5">
                See All <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Link>
            </div>
            <div className="flex gap-2 sm:gap-3 md:gap-4 overflow-x-auto pb-3 scrollbar-hide">
              {venues.slice(0, 10).map((venue: any, idx: number) => {
                const placeName = venue?.name || venue?.address?.city || `Place ${idx + 1}`
                const img = getVenueImage(venue, idx)
                return (
                  <Card key={venue?._id || idx} className="relative min-w-[140px] sm:min-w-[180px] md:min-w-[200px] h-32 sm:h-40 md:h-48 rounded-md overflow-hidden border-0 shadow-sm hover:shadow-lg transition-shadow cursor-pointer flex-shrink-0">
                    <Image src={img} alt={placeName} fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 left-2 text-white font-semibold text-xs sm:text-sm">{placeName}</div>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Artists Section */}
      {artists.length > 0 && (
        <section className="py-4 sm:py-6 md:py-8 bg-white">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#1C1C1C]">Featured Artists</h2>
              <Link href="/allArtists/list" className="text-[#ff0e0e] hover:underline text-xs sm:text-sm font-medium flex items-center gap-0.5">
                See All <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Link>
            </div>
            <div className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto pb-3 scrollbar-hide">
              {artists.slice(0, 10).map((artist: any) => (
                <Link
                  key={artist._id}
                  href={`/allArtistS/list/${artist._id}`}
                  className="flex flex-col items-center min-w-[90px] sm:min-w-[110px] md:min-w-[140px] hover:scale-105 transition-transform duration-300 flex-shrink-0"
                >
                  <div className="relative h-20 w-20 sm:h-24 sm:w-24 md:h-32 md:w-32 rounded-full overflow-hidden border-2 border-gray-200">
                    <Image
                      src={getArtistImage(artist)}
                      alt={artist.name || 'Artist'}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <p className="text-[10px] sm:text-xs md:text-sm mt-2 text-center font-medium line-clamp-2 w-full">
                    {artist.name || 'Artist'}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
      <Footer />
    </div>
  )
}