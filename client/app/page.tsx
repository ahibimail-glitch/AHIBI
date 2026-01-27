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
    <div className="min-h-screen bg-white">
      <Navbar />



      <section className="relative py-10 bg-white overflow-hidden">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-10">
          <div className="w-full md:w-1/2 text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-extrabold text-[#121212] leading-tight">
              Book <span className="text-[#ff0e0e]">Events.</span>
              <br /> Experience <span className="text-[#ff0e0e]">Life.</span>
            </h1>

            <p className="text-lg md:text-2xl text-[#4A4A4A] mt-4 font-medium max-w-xl">
              Trusted event bookings across Nagaland. Discover concerts, festivals, workshops and more — all in one place.
            </p>

            <div className="flex gap-4 justify-center md:justify-start mt-8">
              <Button asChild className="bg-[#ff0e0e] hover:bg-[#e60000] text-white px-7 py-3 rounded-full font-semibold text-lg shadow-lg shadow-red-500/20">
                <Link href="/events">Explore Events</Link>
              </Button>
              <Button variant="outline" asChild className="border border-gray-300 text-[#121212] px-7 py-3 rounded-full font-semibold text-lg hover:bg-gray-100 hover:text-[#ff0e0e]">
                <Link href="/auth">Sign In</Link>
              </Button>
            </div>

            <div className="mt-6 text-sm text-gray-500">No booking fees • Easy refunds • Secure payments</div>
          </div>

          <div className="w-full md:w-1/2">
            <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200">
              {loadingHeroImages ? (
                <div className="w-full h-64 md:h-80 lg:h-96 bg-gray-100" />
              ) : (
                <div className="relative w-full h-64 md:h-80 lg:h-96">
                  <Image
                    src={backgroundImages[currentBgSlide]?.mobileUrl || backgroundImages[currentBgSlide]?.url || "/images/carausel2.jpg"}
                    alt={`Hero ${currentBgSlide + 1}`}
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-black/10" />
                </div>
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

      <section className="px-4 mt-6">
        <div className="text-left mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">What We Offer</h2>
          <p className="text-sm text-gray-500">Discover everything Ahibi has for you</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {offeringTiles.map((item) => (
            <Link key={item.label} href={item.href}>
              <Card className="relative h-32 md:h-40 lg:h-48 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
                <Image src={item.image} alt={item.label} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute bottom-3 left-3 text-white">
                  <div className="font-bold text-base md:text-lg">{item.label}</div>
                  {item.count !== null && item.count > 0 && (
                    <div className="text-xs opacity-90">{item.count} available</div>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <Section title="Explore Venues" subtitle="Popular venues & landmarks" href="/allVenues/list">
        {(venues.length > 0 ? venues.slice(0, 10) : Array.from({ length: 6 })).map((venue: any, idx: number) => {
          const placeName = venue?.name || venue?.address?.city || `Place ${idx + 1}`
          const img = getVenueImage(venue || ({} as PublicVenue), idx)
          return (
            <Card key={venue?._id || idx} className="relative min-w-[160px] md:min-w-[200px] lg:min-w-[240px] h-44 md:h-52 lg:h-60 rounded-xl overflow-hidden">
              <Image src={img} alt={placeName} fill className="object-cover" />
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute bottom-2 left-2 text-white font-semibold">{placeName}</div>
            </Card>
          )
        })}
      </Section>

      <Section
        title="Explore Artists"
        subtitle="Performers & creators"
        href="/allArtists/list"
      >
        {artists.length > 0 ? (
          artists.slice(0, 10).map((artist: any) => (
            <Link
              key={artist._id}
              href={`/allArtistS/list/${artist._id}`}
              className="flex flex-col items-center 
          min-w-[120px] md:min-w-[160px] lg:min-w-[220px]
          hover:scale-105 transition-transform duration-300"
            >
              <div
                className="relative 
            h-28 w-28 
            md:h-36 md:w-36 
            lg:h-56 lg:w-56 
            rounded-full overflow-hidden 
            border-2 border-gray-200"
              >
                <Image
                  src={getArtistImage(artist)}
                  alt={artist.name || 'Artist'}
                  fill
                  className="object-cover"
                />
              </div>

              <p className="text-sm md:text-base mt-3 text-center font-medium line-clamp-2">
                {artist.name || 'Artist'}
              </p>
            </Link>
          ))
        ) : (
          [
            {
              type: 'Singer',
              img: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=200&q=80',
            },
            {
              type: 'Band',
              img: 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=200&q=80',
            },
            {
              type: 'Comedian',
              img: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=200&q=80',
            },
            {
              type: 'Dancer',
              img: 'https://images.unsplash.com/photo-1547153760-18fc86324498?w=200&q=80',
            },
            {
              type: 'Musician',
              img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&q=80',
            },
            {
              type: 'Host',
              img: 'https://images.unsplash.com/photo-1559523161-0fc0d8b38a7a?w=200&q=80',
            },
            {
              type: 'Performer',
              img: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&q=80',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center 
          min-w-[120px] md:min-w-[160px] lg:min-w-[220px]"
            >
              <div
                className="relative 
            h-24 w-24 
            md:h-32 md:w-32 
            lg:h-40 lg:w-40 
            rounded-full overflow-hidden 
            border-2 border-gray-200"
              >
                <Image
                  src={item.img}
                  alt={item.type}
                  fill
                  className="object-cover"
                />
              </div>

              <p className="text-sm mt-3 text-center font-medium">
                {item.type}
              </p>
            </div>
          ))
        )}
      </Section>


  

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