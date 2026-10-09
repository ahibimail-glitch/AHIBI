"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, CalendarDays, ChevronRight, Heart, MapPin, Search, SlidersHorizontal } from "lucide-react"
import type { Event, EventsResponse } from "@/types/event"
import "./events-preview.css"

const FALLBACK_EVENT_IMAGE = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=85"

const LOCAL_PREVIEW_EVENTS: Event[] = [
  {
    _id: "preview-luna-ray",
    title: "Luna Ray Live",
    description: "An intimate live music experience.",
    banner: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&q=85",
    category: "Music",
    startDate: "2026-05-17T19:30:00.000Z",
    endDate: "2026-05-17T22:00:00.000Z",
    location: { address: "Ahibi Arena", city: "Dimapur" },
    ticketTypes: [{ name: "General", price: 799, quantity: 100 }],
    status: "published",
    isFeatured: true,
    isFreeEvent: false,
    slug: "luna-ray-live",
  },
  {
    _id: "preview-better-days",
    title: "Better Days Tour",
    description: "A night of live music and stories.",
    banner: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=900&q=85",
    category: "Music",
    startDate: "2026-05-24T19:00:00.000Z",
    endDate: "2026-05-24T22:00:00.000Z",
    location: { address: "City Hall", city: "Kohima" },
    ticketTypes: [{ name: "General", price: 599, quantity: 100 }],
    status: "published",
    isFeatured: true,
    isFreeEvent: false,
    slug: "better-days-tour",
  },
  {
    _id: "preview-hollow-years",
    title: "The Hollow Years",
    description: "A full-band live performance.",
    banner: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=900&q=85",
    category: "Music",
    startDate: "2026-06-01T18:30:00.000Z",
    endDate: "2026-06-01T21:30:00.000Z",
    location: { address: "The Courtyard", city: "Mokokchung" },
    ticketTypes: [{ name: "General", price: 899, quantity: 100 }],
    status: "published",
    isFeatured: true,
    isFreeEvent: false,
    slug: "the-hollow-years",
  },
  {
    _id: "preview-indie-nights",
    title: "Indie Nights",
    description: "New voices, one unforgettable evening.",
    banner: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=85",
    category: "Music",
    startDate: "2026-06-03T19:00:00.000Z",
    endDate: "2026-06-03T21:30:00.000Z",
    location: { address: "Elsewhere", city: "Dimapur" },
    ticketTypes: [{ name: "General", price: 499, quantity: 100 }],
    status: "published",
    isFeatured: false,
    isFreeEvent: false,
    slug: "indie-nights",
  },
]

const formatDate = (value?: string | Date) => {
  if (!value) return { month: "TBA", day: "--", full: "Date TBA" }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { month: "TBA", day: "--", full: "Date TBA" }
  return {
    month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: date.toLocaleDateString("en-US", { day: "2-digit" }),
    full: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  }
}

const lowestPrice = (event: Event) => {
  if (event.isFreeEvent) return "Free"
  const prices = (event.ticketTypes || []).map((ticket) => Number(ticket.price)).filter(Number.isFinite)
  if (!prices.length) return "Tickets available"
  return `From ₹${Math.min(...prices).toLocaleString("en-IN")}`
}

const imageFor = (event: Event) => event.banner || event.coverImage || event.gallery?.[0]?.url || FALLBACK_EVENT_IMAGE

export default function EventsPreviewPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [query, setQuery] = useState("")
  const [location, setLocation] = useState("Your city")
  const [dataSource, setDataSource] = useState<"live" | "preview">("live")

  useEffect(() => {
    const loadEvents = async () => {
      try {
        // Use the app's API route so Vercel can apply its configured backend
        // rewrite. Calling localhost here made the preview silently fall back
        // to sample cards in production.
        const response = await fetch(`/api/events?limit=1000`, { cache: "no-store" })
        if (!response.ok) throw new Error("Preview API unavailable")
        const data: EventsResponse = await response.json()
        const apiEvents = Array.isArray(data?.events) ? data.events : (data?.data?.events || [])
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const upcoming = apiEvents.filter((event) => {
          const end = new Date(event.endDate || event.startDate)
          return end >= today && event._id !== "68dac96e8d5dd14f277d5b1a"
        })
        if (upcoming.length) {
          setEvents(upcoming)
          setDataSource("live")
        } else if (window.location.hostname === "localhost") {
          setEvents(LOCAL_PREVIEW_EVENTS)
          setDataSource("preview")
        } else {
          setEvents([])
        }
      } catch {
        if (window.location.hostname === "localhost") {
          setEvents(LOCAL_PREVIEW_EVENTS)
          setDataSource("preview")
        } else {
          setEvents([])
        }
      } finally {
        setLoading(false)
      }
    }
    loadEvents()
  }, [])

  useEffect(() => {
    const saved = window.localStorage.getItem("ahibi:userLocation")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed?.city) setLocation(parsed.city)
      } catch {
        // Ignore malformed legacy location data.
      }
    }
  }, [])

  const categories = useMemo(() => {
    const values = events.map((event) => event.category).filter(Boolean)
    return ["All", ...Array.from(new Set(values)).slice(0, 5)]
  }, [events])

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return events.filter((event) => {
      const categoryMatch = selectedCategory === "All" || event.category === selectedCategory
      const queryMatch = !normalizedQuery || [event.title, event.category, event.location?.city].some((value) => String(value || "").toLowerCase().includes(normalizedQuery))
      return categoryMatch && queryMatch
    })
  }, [events, query, selectedCategory])

  const featured = filteredEvents.filter((event) => event.isFeatured)
  const heroEvent = featured[0] || filteredEvents[0]
  const cardEvents = (featured.length ? featured : filteredEvents).slice(0, 3)
  const weekEvents = filteredEvents.slice(3, 7)

  return (
    <main className="event-preview min-h-screen bg-white text-[#111111]">
      <header className="sticky top-0 z-40 border-b border-black/[0.07] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center gap-8 px-5 lg:px-8">
          <Link href="/" className="shrink-0 text-[25px] font-black tracking-[-0.08em]" aria-label="Ahibi home">
            A<span className="text-[#f04438]">h</span>ibi
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-black/60 md:flex">
            <Link href="/events" className="relative text-black after:absolute after:-bottom-7 after:left-0 after:h-0.5 after:w-full after:bg-[#f04438]">Explore Events</Link>
            <Link href="/allArtists" className="transition-colors hover:text-black">Artists</Link>
            <Link href="/allVenues" className="transition-colors hover:text-black">Venues</Link>
            <Link href="/allOrganizers" className="transition-colors hover:text-black">Organizers</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <label className="hidden h-10 w-[270px] items-center gap-2 rounded-full bg-[#f6f4f1] px-4 text-sm text-black/45 lg:flex">
              <Search className="h-4 w-4" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent outline-none placeholder:text-black/40" placeholder="Search events" aria-label="Search events" />
            </label>
            <button className="hidden items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-medium sm:flex" type="button" onClick={() => setLocation("Your city")}>
              <MapPin className="h-4 w-4 text-[#f04438]" /> {location} <ChevronRight className="h-3.5 w-3.5 rotate-90" />
            </button>
            <Link href="/login" className="rounded-full bg-[#111111] px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5">Log in</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1280px] px-5 pb-12 pt-6 lg:px-8 lg:pt-8">
        <div className="relative min-h-[500px] overflow-hidden rounded-[30px] bg-[#111111] shadow-[0_30px_80px_rgba(17,17,17,0.16)] lg:min-h-[560px]">
          {heroEvent ? (
            <Image src={imageFor(heroEvent)} alt={heroEvent.title} fill priority unoptimized className="object-cover opacity-75 transition-transform duration-[1600ms] hover:scale-105" />
          ) : <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,#e94d3d,transparent_34%),linear-gradient(120deg,#111,#4b1714)]" />}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" />
          <div className="relative flex min-h-[500px] max-w-[650px] flex-col justify-end p-7 pb-28 text-white sm:p-12 sm:pb-28 lg:min-h-[560px] lg:p-16 lg:pb-32">
            <span className="mb-5 w-fit rounded-full bg-[#f04438] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em]">Live experiences</span>
            <h1 className="max-w-[600px] text-5xl font-semibold leading-[0.98] tracking-[-0.06em] sm:text-6xl lg:text-7xl">Find your next unforgettable night</h1>
            <p className="mt-5 max-w-[430px] text-base leading-7 text-white/72 sm:text-lg">Discover the people, places, and moments worth showing up for.</p>
            <Link href="/events" className="mt-7 flex w-fit items-center gap-3 rounded-full bg-[#f04438] px-5 py-3 text-sm font-semibold transition-transform hover:-translate-y-1">Explore events <ArrowRight className="h-4 w-4" /></Link>
            {heroEvent && <div className="mt-6 flex items-center gap-3 text-xs text-white/75 md:hidden"><span>{formatDate(heroEvent.startDate).full}</span><span className="h-1 w-1 rounded-full bg-white/50" /><span>{heroEvent.location?.city || "Your city"}</span><span className="h-1 w-1 rounded-full bg-white/50" /><span>{lowestPrice(heroEvent)}</span></div>}
          </div>
          <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white p-2 shadow-2xl sm:bottom-7 sm:left-10 sm:right-10 lg:left-16 lg:right-16">
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
              <label className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-black/55"><Search className="h-4 w-4 text-[#f04438]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search events" className="w-full outline-none" aria-label="Search events" /></label>
              <div className="hidden items-center gap-3 border-l border-black/10 px-4 py-3 text-sm text-black/60 sm:flex"><MapPin className="h-4 w-4 text-[#f04438]" />{location}</div>
              <div className="hidden items-center gap-3 border-l border-black/10 px-4 py-3 text-sm text-black/60 sm:flex"><CalendarDays className="h-4 w-4 text-[#f04438]" />Any date</div>
              <button type="button" className="flex items-center justify-center gap-2 rounded-xl bg-[#f04438] px-5 py-3 text-sm font-semibold text-white"><SlidersHorizontal className="h-4 w-4" /> Filters</button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 pb-10 lg:px-8">
        <div className="mb-6 flex items-end justify-between"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#f04438]">Everything happening around you</p><h2 className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">What are you looking for?</h2></div><span className="hidden text-sm text-black/45 sm:block">One platform, every experience</span></div>
        <div className="hidden grid-cols-2 gap-4 sm:grid lg:grid-cols-4">
          <ServiceCard title="Event tickets" description="Find your next live experience." href="/events" image="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=700&q=85" />
          <ServiceCard title="Book an artist" description="Bring the right talent to your event." href="/allArtists" image="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=700&q=85" />
          <ServiceCard title="Find a venue" description="Spaces made for memorable moments." href="/allVenues" image="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=700&q=85" />
          <ServiceCard title="Connect with organizers" description="Discover trusted event creators." href="/allOrganizers" image="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=700&q=85" />
        </div>
        <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:hidden">
          {[
            ["Events", "Browse live experiences", "/events", "🎟️"],
            ["Artists", "Book the right talent", "/allArtists", "🎤"],
            ["Venues", "Find your perfect space", "/allVenues", "📍"],
            ["Organizers", "Meet event creators", "/allOrganizers", "✨"],
          ].map(([title, description, href, icon]) => <Link key={title} href={href} className="min-w-[74vw] snap-start rounded-2xl border border-black/10 bg-[#f7f5f2] p-4 transition-transform active:scale-[.98]"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">{icon}</span><h3 className="mt-5 text-lg font-semibold">{title}</h3><p className="mt-1 text-sm text-black/55">{description}</p><span className="mt-4 flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-[#f04438]">Open <ArrowRight className="h-3.5 w-3.5" /></span></Link>)}
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 pb-4 lg:px-8">
        <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((category) => <button key={category} type="button" onClick={() => setSelectedCategory(category)} className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${selectedCategory === category ? "bg-[#f04438] text-white shadow-lg shadow-red-500/20" : "bg-[#f6f4f1] text-black/70 hover:bg-black/10"}`}>{category}</button>)}
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 py-12 lg:px-8">
        <div className="mb-6 flex items-end justify-between"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#f04438]">{dataSource === "live" ? "Live from Ahibi" : "Preview mode"}</p><h2 className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">For you</h2></div><Link href="/events" className="hidden items-center gap-1 text-sm font-semibold text-[#f04438] sm:flex">See all events <ArrowRight className="h-4 w-4" /></Link></div>
        {loading ? <div className="grid gap-5 md:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-[330px] animate-pulse rounded-2xl bg-[#f6f4f1]" />)}</div> : cardEvents.length ? <div className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0">{cardEvents.map((event, index) => <EventCard key={event._id} event={event} featured={index === 0} />)}</div> : <EmptyState />}
      </section>

      <section className="mx-auto max-w-[1280px] px-5 pb-20 lg:px-8">
        <div className="mb-6 flex items-end justify-between"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#f04438]">Plan your week</p><h2 className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">This week in your city</h2></div><Link href="/events" className="hidden items-center gap-1 text-sm font-semibold text-[#f04438] sm:flex">View all <ArrowRight className="h-4 w-4" /></Link></div>
        <div className="divide-y divide-black/10 rounded-2xl border border-black/10 bg-white">{weekEvents.length ? weekEvents.map((event) => <TimelineEvent key={event._id} event={event} />) : <div className="p-8 text-sm text-black/50">More events are coming soon.</div>}</div>
      </section>

      <footer className="border-t border-black/10 bg-[#f6f4f1] px-5 py-7 text-center text-sm text-black/50">Events preview • Ahibi booking experience</footer>
      <nav className="fixed inset-x-4 bottom-4 z-50 grid grid-cols-4 rounded-2xl border border-black/10 bg-white/95 p-2 shadow-2xl backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
        {[["Home", "/"], ["Explore", "/events"], ["Bookings", "/profile"], ["Profile", "/profile"]].map(([label, href], index) => <Link key={label} href={href} className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold ${index === 0 ? "text-[#f04438]" : "text-black/50"}`}><span className="text-base">{index === 0 ? "⌂" : index === 1 ? "⌕" : index === 2 ? "♧" : "○"}</span>{label}</Link>)}
      </nav>
    </main>
  )
}

function EventCard({ event, featured }: { event: Event; featured?: boolean }) {
  const date = formatDate(event.startDate)
  return <Link href={`/events/${event._id}`} className={`event-reveal group relative min-w-[82vw] snap-start overflow-hidden rounded-2xl border border-black/10 bg-white transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl md:min-w-0 ${featured ? "md:col-span-1" : ""}`}><div className="relative aspect-[1.45] overflow-hidden bg-[#f6f4f1]"><Image src={imageFor(event)} alt={event.title} fill unoptimized className="object-cover transition-transform duration-700 group-hover:scale-105" /><div className="absolute left-3 top-3 rounded-xl bg-white px-2.5 py-2 text-center shadow-sm"><div className="text-[10px] font-bold tracking-wider text-[#f04438]">{date.month}</div><div className="text-xl font-semibold leading-none">{date.day}</div></div><button type="button" aria-label={`Save ${event.title}`} onClick={(click) => click.preventDefault()} className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-black/70 backdrop-blur transition-colors hover:text-[#f04438]"><Heart className="h-4 w-4" /></button></div><div className="p-4"><div className="mb-2 flex items-center justify-between gap-3 text-xs text-black/50"><span>{event.category || "Event"}</span><span>{lowestPrice(event)}</span></div><h3 className="line-clamp-2 text-lg font-semibold tracking-[-0.03em]">{event.title}</h3><p className="mt-2 flex items-center gap-1 text-sm text-black/50"><MapPin className="h-3.5 w-3.5 text-[#f04438]" />{event.location?.city || "Location TBA"}</p></div></Link>
}

function TimelineEvent({ event }: { event: Event }) {
  const date = formatDate(event.startDate)
  return <Link href={`/events/${event._id}`} className="group grid grid-cols-[54px_1fr_auto] items-center gap-4 px-4 py-4 transition-colors hover:bg-[#f6f4f1] sm:grid-cols-[100px_1fr_auto] sm:px-6"><div className="text-center sm:text-left"><div className="text-[10px] font-bold uppercase tracking-widest text-[#f04438]">{date.month}</div><div className="text-2xl font-semibold">{date.day}</div></div><div className="flex min-w-0 items-center gap-4"><div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-[#f6f4f1]"><Image src={imageFor(event)} alt="" fill unoptimized className="object-cover" /></div><div className="min-w-0"><h3 className="truncate font-semibold">{event.title}</h3><p className="truncate text-sm text-black/50">{event.location?.city || "Location TBA"} · {event.category || "Event"}</p></div></div><div className="hidden items-center gap-4 sm:flex"><span className="text-sm font-medium text-black/65">{lowestPrice(event)}</span><span className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold transition-colors group-hover:border-[#f04438] group-hover:text-[#f04438]">View</span></div><ChevronRight className="h-5 w-5 text-black/35 sm:hidden" /></Link>
}

function EmptyState() { return <div className="rounded-2xl border border-dashed border-black/15 bg-[#f6f4f1] p-10 text-center text-black/55">No upcoming events match this search.</div> }

function ServiceCard({ title, description, href, image }: { title: string; description: string; href: string; image: string }) {
  return <Link href={href} className="group relative min-h-[220px] overflow-hidden rounded-2xl bg-[#111111] p-5 text-white transition-transform duration-500 hover:-translate-y-1"><Image src={image} alt="" fill unoptimized className="object-cover opacity-45 transition-transform duration-700 group-hover:scale-110" /><div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" /><div className="relative flex h-full min-h-[180px] flex-col justify-end"><h3 className="text-xl font-semibold tracking-[-0.03em]">{title}</h3><p className="mt-1 max-w-[190px] text-sm leading-5 text-white/70">{description}</p><span className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#ff8178]">Explore <ArrowRight className="h-3.5 w-3.5" /></span></div></Link>
}
