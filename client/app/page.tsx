"use client"

import { useEffect, useMemo, useState, useRef, type ReactNode, type TouchEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Building2, Calendar, ChevronRight, Clock, Loader2, MapPin, Star, TrendingUp, Trophy, Users } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import Navbar from "./Navbar"
import Footer from "./Footer"
import EventsPreviewPage from "./events-preview/page"
import type { EventsResponse, Event } from "@/types/event"
import StickyHeroCards from "@/components/StickyHeroCards"
import { format } from "date-fns"
import { getNextNuscMatchDate } from "@/lib/nuscHomeMatches"

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
  images?: Array<{
    public_id?: string;
    url: string;
    width?: number;
    height?: number;
    format?: string;
    size?: number;
    created_at?: string;
  }>;
  coverImage?: string;
}

type DailyEvent = {
  _id: string;
  title: string;
  description: string;
  banner: string;
  category: string;
  periodStartDate: string;
  periodEndDate: string;
  startTime: string;
  duration: {
    hours: number;
    minutes: number;
  };
  activeDates: string[];
  excludedDates: string[];
  location: {
    address: string;
    city: string;
    state?: string;
  };
  ticketTypes: any[];
  isFreeEvent: boolean;
  slug: string;
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
  // Check venue.images first (new Cloudinary images field)
  const venueImages = Array.isArray(venue.images) ? venue.images : [];

  // If cover image is set, find it in the images array
  if (venue.coverImage && venueImages.length > 0) {
    const coverImage = venueImages.find(img => img.public_id === venue.coverImage);
    if (coverImage?.url) {
      return resolveImageUrl(coverImage.url, "venue");
    }
  }

  // Fallback to first image if no cover image is set or not found
  if (venueImages.length > 0) {
    const firstImage = venueImages[0].url;
    if (firstImage) return resolveImageUrl(firstImage, "venue");
  }

  // Fallback to legacy fields
  const main = venue.documents?.venueImages?.find((i) => i?.isMain)?.url
  const anyDoc = venue.documents?.venueImages?.[0]?.url
  const anyGallery = venue.gallery?.[0]?.url
  const chosen = main || anyDoc || anyGallery
  if (chosen) return resolveImageUrl(chosen, "venue")
  if (typeof idx === "number" && VENUE_FALLBACKS.length > 0) return VENUE_FALLBACKS[idx % VENUE_FALLBACKS.length]
  return FALLBACK_IMAGES.venue
}

const getEventImage = (event?: Event) => resolveImageUrl(event?.banner, "event")

const formatDayDate = (dateString?: string | Date) => {
  if (!dateString) return ""
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ""
  const dayDate = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
  return `${dayDate} • ${time}`
}

const getLowestPrice = (ticketTypes: { price: number }[] = []): string => {
  if (!ticketTypes || ticketTypes.length === 0) return 'Free';
  const prices = ticketTypes.map(t => t.price);
  const minPrice = Math.min(...prices);
  return minPrice === 0 ? 'Free' : `₹${minPrice.toFixed(2)}`;
};

const RSVP_WORKSHOP_EVENT_ID = "6ac644e31e7f6f9476b839c0";
const HORNBILL_SHOWCASE_EVENT_ID = "6ab402a990e6bc7f24d420a2";
const NUSC_HOME_MATCH_SERIES_ID = "nusc-home-match-series";

const NUSC_HOME_MATCH_SERIES: Event = {
  _id: NUSC_HOME_MATCH_SERIES_ID,
  title: "Indian Football League: NUSC Home Matches",
  description: "Follow NUSC's home fixtures at Chümoukedima Football Stadium.",
  banner: "/images/match-1.jpeg",
  category: "Sports",
  startDate: `${getNextNuscMatchDate()}T18:30:00+05:30`,
  endDate: `${getNextNuscMatchDate()}T18:30:00+05:30`,
  location: { address: "Chümoukedima Football Stadium", city: "" },
  ticketTypes: [],
  status: "published",
  isFeatured: true,
  slug: "nusc-home-matches",
};

const getEventHref = (event: { _id: string; slug?: string; externalBookingUrl?: string }) => {
  if (String(event._id) === NUSC_HOME_MATCH_SERIES_ID) return "/nusc-home-matches";
  if (String(event._id) === RSVP_WORKSHOP_EVENT_ID) return "/events/workshop-rsvp";
  if (
    String(event._id) === HORNBILL_SHOWCASE_EVENT_ID ||
    String(event.slug || "") === "ticket-to-hornbill-showcase-day1" ||
    String(event.externalBookingUrl || "").includes("/ticket-to-hornbill")
  ) {
    return "/ticket-to-hornbill";
  }
  return `/events/${event._id}`;
};

const DailyEventCard = ({ event }: { event: DailyEvent }) => {
  const title = String(event.title || "").replace(/GE Blaster/gi, "GEL Blaster");
  return (
    <Card className="group overflow-hidden rounded-lg bg-white border border-gray-200 transition-shadow hover:shadow-lg">
      {/* POSTER — match regular event card 2:3 ratio */}
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        <Image
          src={event.banner || "/placeholder.svg"}
          alt={title}
          fill
          sizes="(max-width: 639px) 43vw, 20vw"
          className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-black/90 py-1 px-2">
          <p className="text-[10px] text-white text-center font-medium truncate">
            {event.startTime} • {event.duration.hours}h {event.duration.minutes}m
          </p>
        </div>
        <div className="absolute top-2 right-2">
          <Badge className="bg-blue-600 text-white text-[10px]">Daily</Badge>
        </div>
      </div>

      {/* TEXT */}
      <div className="px-2 pt-2 pb-1.5">
        <h3 className="font-medium text-[12px] sm:text-xs md:text-sm line-clamp-1 text-gray-900">
          {title}
        </h3>
        <p className="text-[11px] sm:text-[10px] md:text-xs text-gray-500 mt-0.5">
          {event.category || "Event"}{event.location?.city ? ` | ${event.location.city}` : ""}
        </p>
        <p className="text-[11px] text-gray-400 mt-1">
          {event.periodStartDate && event.periodEndDate ? (
            <>
              {format(new Date(event.periodStartDate), "MMM dd")} - {format(new Date(event.periodEndDate), "MMM dd, yyyy")}
            </>
          ) : (
            "Date TBA"
          )}
        </p>
      </div>
    </Card>
  );
};

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

function LegacyHomePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([])
  const [dailyEvents, setDailyEvents] = useState<DailyEvent[]>([])
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
  const heroMobileTrackRef = useRef<HTMLDivElement | null>(null)
  const heroSlideRefs = useRef<Array<HTMLDivElement | null>>([])
  const [heroMobileHeight, setHeroMobileHeight] = useState<number | null>(null)

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true)
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
        const [eventsRes, venuesRes, artistsRes, dailyEventsRes] = await Promise.all([
          // Higher limit: API sorts by startDate ascending, so a small limit only returns old/past events.
          fetch(`${apiUrl}/api/events?limit=1000`),
          fetch(`${apiUrl}/api/venue`),
          fetch(`${apiUrl}/api/artist/public?limit=12`),
          fetch(`${apiUrl}/api/daily-events?limit=10`)
        ])

        if (eventsRes.ok) {
          const data: EventsResponse = await eventsRes.json()
          const currentDate = new Date()
          const normalized = (data.data?.events || [])
            .filter((event) => {
              const eventEndDate = new Date(event.endDate || event.startDate)
              const isUpcoming = eventEndDate >= currentDate
              const isNotExcluded = event._id !== "68dac96e8d5dd14f277d5b1a"
              return isUpcoming && isNotExcluded
            })
            .sort(
              (a, b) =>
                new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
            )
          setEvents(normalized)
        }

        if (dailyEventsRes.ok) {
          const data = await dailyEventsRes.json()
          setDailyEvents(data.data?.dailyEvents || [])
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
        setError("Failed to load home data")
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
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
        const response = await fetch(`${apiUrl}/api/hero-images?active=true`)
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
    if (!isMobileViewport) return

    const activeSlide = heroSlideRefs.current[currentBgSlide]
    if (!activeSlide) return

    const updateHeight = () => {
      const nextHeight = activeSlide.getBoundingClientRect().height
      if (nextHeight > 0) setHeroMobileHeight(Math.ceil(nextHeight))
    }

    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(activeSlide)
    return () => observer.disconnect()
  }, [backgroundImages, currentBgSlide, isMobileViewport])

  // useEffect(() => {
  //   if (backgroundImages.length <= 1) return
  //   const interval = setInterval(() => {
  //     setCurrentBgSlide((prev) => (prev + 1) % backgroundImages.length)
  //   }, 5000)
  //   return () => clearInterval(interval)
  // }, [backgroundImages.length])

  useEffect(() => {
    const fetchFeatured = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
        const response = await fetch(`${apiUrl}/api/events?isFeatured=true&limit=100`)
        if (!response.ok) {
          setFeaturedEvents([NUSC_HOME_MATCH_SERIES])
          return
        }
        const data: EventsResponse = await response.json()
        const currentDate = new Date()
        const normalized = (data.data?.events || [])
          .filter((event) => {
            const eventEndDate = new Date(event.endDate || event.startDate)
            const isUpcoming = eventEndDate >= currentDate
            const isNotExcluded = event._id !== "68dac96e8d5dd14f277d5b1a"
            return isUpcoming && isNotExcluded
          })
          .sort(
            (a, b) =>
              new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          )
        setFeaturedEvents(
          [...normalized, NUSC_HOME_MATCH_SERIES].sort(
            (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          )
        )
      } catch {
        setFeaturedEvents([NUSC_HOME_MATCH_SERIES])
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
      // {
      //   label: "Sports",
      //   href: "/sports",
      //   image:
      //     "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80",
      //   count: events.filter((e) =>
      //     (e.category || "").toLowerCase().includes("sport")
      //   ).length,
      // },
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
  const musicEvents = useMemo(
    () => (events ?? []).filter((e) => String(e?.category ?? "").toLowerCase().includes("music")).slice(0, 8),
    [events]
  )
  const comedyEvents = useMemo(
    () => (events ?? []).filter((e) => String(e?.category ?? "").toLowerCase().includes("comedy")).slice(0, 8),
    [events]
  )
  const sportsEvents = useMemo(
    () => (events ?? []).filter((e) => String(e?.category ?? "").toLowerCase().includes("sport")).slice(0, 8),
    [events]
  )


  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />

      {/* Hero Carousel Banner */}
      <section className="relative w-full bg-white overflow-hidden">
        {loadingHeroImages ? (
          <div className="w-full aspect-[2560/900] bg-gray-200 animate-pulse" />
        ) : (
          <div
            ref={heroMobileTrackRef}
            className="relative flex w-full items-start snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth scrollbar-hide sm:block sm:overflow-visible sm:snap-none"
            style={isMobileViewport && heroMobileHeight ? { height: `${heroMobileHeight}px` } : undefined}
            role="region"
            aria-label="Hero banners"
            tabIndex={0}
            onScroll={(event) => {
              const track = event.currentTarget
              const nextSlide = Math.round(track.scrollLeft / track.clientWidth)
              setCurrentBgSlide((current) => current === nextSlide ? current : nextSlide)
            }}
          >
            {backgroundImages.map((image, index) => {
              const src =
                (isMobileViewport && image.mobileUrl ? image.mobileUrl : image.url) ||
                "/images/carausel1.jpg"
              const isActive = index === currentBgSlide

              return (
                <div
                  key={index}
                  ref={(element) => { heroSlideRefs.current[index] = element }}
                  className={`relative w-full shrink-0 snap-start transition-opacity duration-700 ${
                    isActive
                      ? "sm:relative sm:opacity-100 sm:z-10"
                      : "sm:absolute sm:inset-x-0 sm:top-0 sm:opacity-0 sm:pointer-events-none"
                  }`}
                  aria-hidden={!isActive}
                >
                  <Image
                    src={src}
                    alt={`Banner ${index + 1}`}
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="w-full h-auto block"
                    priority={index === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
                </div>
              )
            })}

            {/* LEFT BUTTON */}
            {backgroundImages.length > 1 && (
              <button
                onClick={() =>
                  setCurrentBgSlide(
                    (prev) =>
                      (prev - 1 + backgroundImages.length) %
                      backgroundImages.length
                  )
                }
                className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20
                     bg-black/40 hover:bg-black/60 text-white
                     w-9 h-9 rounded-full items-center justify-center
                     backdrop-blur-sm transition"
                aria-label="Previous slide"
              >
                ‹
              </button>
            )}

            {/* RIGHT BUTTON */}
            {backgroundImages.length > 1 && (
              <button
                onClick={() =>
                  setCurrentBgSlide(
                    (prev) => (prev + 1) % backgroundImages.length
                  )
                }
                className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20
                     bg-black/40 hover:bg-black/60 text-white
                     w-9 h-9 rounded-full items-center justify-center
                     backdrop-blur-sm transition"
                aria-label="Next slide"
              >
                ›
              </button>
            )}

            {/* INDICATORS */}
            {backgroundImages.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {backgroundImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentBgSlide(index)
                      const track = heroMobileTrackRef.current
                      if (isMobileViewport && track) {
                        track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" })
                      }
                    }}
                    className={`h-1 rounded-full transition-all ${index === currentBgSlide
                      ? "bg-white w-6"
                      : "bg-white/50 w-1"
                      }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>


    


      <section className=" bg-white">
        <div className="container mx-auto px-3 sm:px-4">

          {/* HERO CARD */}





          {/* Featured Events Section */}
          <section className="py-4 sm:py-6 md:py-8 ">
            <div className="container mx-auto px-3 sm:px-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#1C1C1C]">
                  Recommended Events
                </h2>
                <Link
                  href="/events"
                  className="text-[#ff0e0e] hover:underline text-xs sm:text-sm font-medium flex items-center gap-0.5"
                >
                  See All <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Link>
              </div>

              {isLoading ? (
                /* SKELETONS */
                <>
                  <div className="sm:hidden -mx-3 overflow-x-auto overscroll-x-contain scroll-smooth scrollbar-hide snap-x snap-mandatory scroll-pl-3">
                    <div className="flex w-max gap-3 px-3 pb-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="w-[43vw] min-w-[138px] max-w-[220px] shrink-0 snap-start rounded-xl aspect-[2/3] bg-gray-200 animate-pulse"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="hidden sm:grid grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="bg-gray-200 rounded-lg aspect-[2560/460] animate-pulse"
                      />
                    ))}
                  </div>
                </>
              ) : error ? (
                <div className="text-center py-6 text-red-500 text-sm">{error}</div>
              ) : featuredEvents.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                  No featured events available
                </div>
              ) : (
                /* EVENTS GRID */
                <>
                  <div
                    className="sm:hidden -mx-3 overflow-x-auto overscroll-x-contain scroll-smooth scrollbar-hide snap-x snap-mandatory scroll-pl-3"
                    role="region"
                    aria-label="Recommended events"
                    tabIndex={0}
                  >
                    <div className="flex w-max gap-3 px-3 pb-1">
                      {featuredEvents.slice(0, 10).map((event) => (
                        <Link
                          key={event._id}
                          href={getEventHref(event)}
                          className="w-[43vw] min-w-[138px] max-w-[220px] shrink-0 snap-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                        >
                          <Card className="h-full overflow-hidden rounded-xl border border-gray-200 bg-white">
                            <div className="relative aspect-[2/3] w-full overflow-hidden">
                              <Image
                                src={event.banner || "/placeholder.svg"}
                                alt={event.title}
                                fill
                                sizes="(max-width: 639px) 43vw, 20vw"
                                className="object-cover object-center"
                              />
                              {!!formatDayDate((event as any)?.startDate) && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/90 py-1 px-2">
                                  <p className="text-[10px] text-white text-center font-medium truncate">
                                    {formatDayDate((event as any)?.startDate)}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="px-2 pt-2 pb-2">
                              <h3 className="text-[13px] font-semibold line-clamp-1 text-gray-900">
                                {event.title}
                              </h3>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                {event.category}
                              </p>
                            </div>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="hidden sm:grid grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {featuredEvents.slice(0, 10).map((event) => (
                      <Link key={event._id} href={getEventHref(event)}>
                        <Card className="group overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-lg">
                          {/* POSTER */}
                          <div className="relative aspect-[2/3] w-full overflow-hidden">
                            <Image
                              src={event.banner || "/placeholder.svg"}
                              alt={event.title}
                              fill
                              sizes="20vw"
                              className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
                            />
                            {!!formatDayDate((event as any)?.startDate) && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black/90 py-1 px-2">
                                <p className="text-[10px] text-white text-center font-medium truncate">
                                  {formatDayDate((event as any)?.startDate)}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* TEXT */}
                          <div className="px-2 pt-2 pb-1.5">
                            <h3 className="font-medium text-[12px] sm:text-xs md:text-sm line-clamp-1 text-gray-900">
                              {event.title}
                            </h3>
                            <p className="text-[11px] sm:text-[10px] md:text-xs text-gray-500 mt-0.5">
                              {event.category}
                            </p>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </section>
      <section className="py-4 sm:py-6 md:py-8 bg-white">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#1C1C1C]">
              Daily Events
            </h2>
            <Link
              href="/events/daily"
              className="text-[#ff0e0e] hover:underline text-xs sm:text-sm font-medium flex items-center gap-0.5"
            >
              See All <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Link>
          </div>

          <div
            className="sm:hidden -mx-3 overflow-x-auto overscroll-x-contain scroll-smooth scrollbar-hide snap-x snap-mandatory scroll-pl-3"
            role="region"
            aria-label="Daily events"
            tabIndex={0}
          >
            <div className="flex w-max gap-3 px-3 pb-1">
              {dailyEvents.slice(0, 10).map((event) => (
                <Link
                  key={event._id}
                  href={`/events/daily/${event._id}`}
                  className="w-[43vw] min-w-[138px] max-w-[220px] shrink-0 snap-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                >
                  <DailyEventCard event={event} />
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden sm:grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {dailyEvents.slice(0, 10).map((event) => (
              <Link key={event._id} href={`/events/daily/${event._id}`}>
                <DailyEventCard event={event} />
              </Link>
            ))}
          </div>
        </div>
      </section>
      <StickyHeroCards />
      {/* Music Events Section */}
      {musicEvents.length > 0 && (
        <section className="py-4 sm:py-6 md:py-8 bg-[#f5f5f5]">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#1C1C1C]">
                Music Events
              </h2>
              <Link
                href="/events"
                className="text-[#ff0e0e] hover:underline text-xs sm:text-sm font-medium flex items-center gap-0.5"
              >
                See All <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Link>
            </div>

            <div
              className="sm:hidden -mx-3 overflow-x-auto overscroll-x-contain scroll-smooth scrollbar-hide snap-x snap-mandatory scroll-pl-3"
              role="region"
              aria-label="Music events"
              tabIndex={0}
            >
              <div className="flex w-max gap-3 px-3 pb-1">
                {musicEvents.map((event) => (
                  <Link
                    key={event._id}
                    href={getEventHref(event)}
                    className="w-[43vw] min-w-[138px] max-w-[220px] shrink-0 snap-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                  >
                    <Card className="group h-full overflow-hidden rounded-lg bg-white border border-gray-200 transition-shadow hover:shadow-lg">
                      <div className="relative aspect-[2/3] w-full overflow-hidden">
                        <Image
                          src={event.banner || "/placeholder.svg"}
                          alt={event.title}
                          fill
                          sizes="(max-width: 639px) 43vw, 20vw"
                          className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
                        />
                        {!!formatDayDate((event as any)?.startDate) && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/90 py-1 px-2">
                            <p className="text-[10px] text-white text-center font-medium truncate">
                              {formatDayDate((event as any)?.startDate)}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="px-2 pt-2 pb-1.5">
                        <h3 className="font-medium text-[12px] sm:text-xs md:text-sm line-clamp-1 text-gray-900">
                          {event.title}
                        </h3>
                        <p className="text-[11px] sm:text-[10px] md:text-xs text-gray-500 mt-0.5">
                          {event.location?.city}
                        </p>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>

            <div className="hidden sm:grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {musicEvents.map((event) => (
                <Link key={event._id} href={getEventHref(event)}>
                  <Card className="group overflow-hidden rounded-lg bg-white border border-gray-200 transition-shadow hover:shadow-lg">
                    <div className="relative aspect-[2/3] w-full overflow-hidden">
                      <Image
                        src={event.banner || "/placeholder.svg"}
                        alt={event.title}
                        fill
                        sizes="20vw"
                        className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
                      />
                      {!!formatDayDate((event as any)?.startDate) && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/90 py-1 px-2">
                          <p className="text-[10px] text-white text-center font-medium truncate">
                            {formatDayDate((event as any)?.startDate)}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="px-2 pt-2 pb-1.5">
                      <h3 className="font-medium text-[12px] sm:text-xs md:text-sm line-clamp-1 text-gray-900">
                        {event.title}
                      </h3>
                      <p className="text-[11px] sm:text-[10px] md:text-xs text-gray-500 mt-0.5">
                        {event.location?.city}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sports Events Section — hidden while /sports is disabled */}
      {false && sportsEvents.length > 0 && (
        <section className="py-8 sm:py-12 md:py-16 bg-gradient-to-br from-green-900 via-blue-900 to-indigo-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(34,197,94,0.1),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(59,130,246,0.1),transparent_50%)]" />
          <div className="relative container mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2">
                  Sports Events
                </h2>
                <p className="text-green-200 text-sm sm:text-base">Push your limits, achieve greatness</p>
              </div>
              <Link
                href="/sports"
                className="group text-white hover:text-green-200 text-sm sm:text-base font-medium flex items-center gap-2 transition-colors"
              >
                See All <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {/* Futsal Tournament Registration Card */}
              <Link href="/futsal-tournament">
                <Card className="group overflow-hidden rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 border-2 border-green-400 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/50">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-t-xl flex flex-col items-center justify-center p-4 text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3">
                      <Trophy className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-bold text-lg text-white mb-1">Turf Titans T3</h3>
                    <p className="text-xs text-green-100 mb-2">Futsal Tournament</p>
                    <Badge className="bg-white text-green-700 hover:bg-green-50">
                      Register Now
                    </Badge>
                    <div className="mt-3 text-xs text-green-100 space-y-1">
                      <p>📅 21-23 May 2026</p>
                      <p>🏆 ₹2 Lakh Prize Pool</p>
                      <p>💰 ₹3,500 Registration</p>
                    </div>
                  </div>
                </Card>
              </Link>
              {sportsEvents.map((event) => (
                <Link key={event._id} href={getEventHref(event)}>
                  <Card className="group overflow-hidden rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 transition-all duration-300 hover:scale-105 hover:bg-white/15 hover:shadow-2xl hover:shadow-green-500/25">
                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-t-xl">
                      <Image
                        src={event.banner || "/placeholder.svg"}
                        alt={event.title}
                        fill
                        sizes="20vw"
                        className="object-cover object-center transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <div className="px-3 pt-3 pb-4">
                      <h3 className="font-semibold text-sm sm:text-base line-clamp-2 text-white mb-1">
                        {event.title}
                      </h3>
                      <p className="text-xs text-green-200">
                        {event.location?.city}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
      {/* Comedy Events Section */}
      {comedyEvents.length > 0 && (
        <section className="py-8 sm:py-12 md:py-16 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_60%,rgba(251,191,36,0.2),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,rgba(249,115,22,0.2),transparent_50%)]" />
          <div className="relative container mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2">
                  Laughter Therapy
                </h2>
                <p className="text-yellow-100 text-sm sm:text-base">Laugh out loud, live it up</p>
              </div>
              <Link
                href="/events?category=comedy"
                className="group text-white hover:text-yellow-100 text-sm sm:text-base font-medium flex items-center gap-2 transition-colors"
              >
                See All <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {comedyEvents.map((event) => (
                <Link key={event._id} href={getEventHref(event)}>
                  <Card className="group overflow-hidden rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 transition-all duration-300 hover:scale-105 hover:bg-white/15 hover:shadow-2xl hover:shadow-yellow-500/25">
                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-t-xl">
                      <Image
                        src={event.banner || "/placeholder.svg"}
                        alt={event.title}
                        fill
                        sizes="20vw"
                        className="object-cover object-center transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <div className="px-3 pt-3 pb-4">
                      <h3 className="font-semibold text-sm sm:text-base line-clamp-2 text-white mb-1">
                        {event.title}
                      </h3>
                      <p className="text-xs text-yellow-100">
                        {event.location?.city}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular Venues Section */}
      {venues.length > 0 && (
        <section className="mt-6 py-6 sm:mt-40 sm:py-10 bg-[#f8fafc]">
          <div className="container mx-auto px-4">

            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Popular Venues
              </h2>
              <Link
                href="/allVenues/list"
                className="text-pink-600 hover:underline text-sm font-medium flex items-center gap-1"
              >
                See All <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

              {venues.slice(0, 2).map((venue: any, idx: number) => {
                const name = venue?.businessName || venue?.name || `Venue ${idx + 1}`;
                const image = getVenueImage(venue, idx);
                const rating = venue?.rating?.average || 0;
                const reviews = venue?.rating?.count || 0;
                const location =
                  [venue?.address?.city, venue?.address?.state]
                    .filter(Boolean)
                    .join(", ") || "Location not specified";

                const capacity =
                  venue?.capacityDetails?.standingCapacity ||
                  venue?.capacityDetails?.seatingCapacity;

                return (
                  <Link
                    key={venue?._id || idx}
                    href={`/allVenues/${venue._id}`}
                    className="group block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300"
                  >
                    {/* Image */}
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <Image
                        src={image}
                        alt={name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Rating Badge */}
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-gray-800 flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        {rating.toFixed(1)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-3">

                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                          {venue?.type || "Event Venue"}
                        </p>
                        <h3 className="text-lg font-semibold text-gray-900 leading-tight line-clamp-2">
                          {name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="truncate">{location}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {capacity ? `${capacity} guests` : "Capacity on request"}
                        </span>
                        <span>{reviews} reviews</span>
                      </div>

                    </div>
                  </Link>
                );
              })}

              {/* View All Card */}
              <Link
                href="/allVenues/list"
                className="group block bg-gradient-to-br from-pink-600 via-purple-600 to-indigo-700 rounded-2xl text-white p-6 flex flex-col justify-between min-h-[340px] relative overflow-hidden"
              >
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
                    backgroundSize: "18px 18px",
                  }}
                />

                <div className="relative space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Building2 className="h-7 w-7" />
                  </div>

                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-white/80">
                      Discover
                    </p>
                    <h3 className="text-2xl font-bold leading-tight">
                      View all verified venues
                    </h3>
                  </div>

                  <p className="text-white/85 text-sm max-w-sm">
                    Explore the entire catalogue, filter by city, capacity, pricing,
                    and book instantly.
                  </p>
                </div>

                <Button className="relative w-full mt-6 bg-white text-pink-700 hover:bg-white/90 font-semibold">
                  Explore venues
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>

            </div>
          </div>
        </section>
      )}






      {/* Artists Section */}
      {artists.length > 0 && (
        <section className="py-6 sm:py-8 md:py-10 bg-white">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#1C1C1C]">Featured Artists</h2>
              <Link href="/allArtists/list" className="text-[#ff0e0e] hover:underline text-xs sm:text-sm font-medium flex items-center gap-0.5">
                See All <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Link>
            </div>

            <div className="flex gap-4 sm:gap-6 md:gap-8 overflow-x-auto pb-3 scrollbar-hide">
              {artists.slice(0, 10).map((artist: any) => (
                <Link
                  key={artist._id}
                  href={`/artist/profile/${artist._id}`}
                  className="flex flex-col items-center min-w-[140px] sm:min-w-[160px] md:min-w-[200px] hover:scale-105 transition-transform duration-300 flex-shrink-0"
                >
                  <div className="relative h-36 w-36 sm:h-44 sm:w-44 md:h-56 md:w-56 rounded-full overflow-hidden border-2 border-gray-200 ring-2 ring-white shadow-sm">
                    <Image
                      src={getArtistImage(artist)}
                      alt={artist.name || 'Artist'}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <p className="text-[11px] sm:text-xs md:text-sm mt-2 text-center font-medium line-clamp-2 w-full">
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

export default function HomePageRouter() {
  const [showNewHome, setShowNewHome] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const forcedLegacy = params.get("home") === "legacy"
    const forcedNew = params.get("home") === "new"
    setShowNewHome((process.env.NEXT_PUBLIC_EVENT_HOME_V2 === "true" || forcedNew) && !forcedLegacy)
  }, [])

  if (showNewHome) return <EventsPreviewPage />
  return <LegacyHomePage />
}
