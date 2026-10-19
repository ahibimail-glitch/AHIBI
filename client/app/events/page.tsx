"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  MapPin,
  Search,
  Loader2,
  Filter,
  X,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "../Navbar";
import Footer from "../Footer";
import { Event, EventsResponse } from "@/types/event";
import {
  EVENTS_HERO_IMAGE_WIDTH,
  EVENTS_HERO_IMAGE_HEIGHT,
} from "@/lib/eventsHero";

// ─── Constants ────────────────────────────────────────────────────────────────

const CITIES = [
  "Mumbai", "Delhi", "New Delhi", "Bangalore", "Pune", "Chennai", "Hyderabad",
  "Dimapur", "Guwahati", "Kohima", "Shillong", "Silchar", "Tezpur",
];

const GENRES = [
  "Music", "Comedy", "Theatre", "Dance", "Food",
  "Art", "Sports", "Business", "Education", "Other",
];

const GENRE_ICONS: Record<string, string> = {
  Music: "🎵", Comedy: "😂", Theatre: "🎭", Dance: "💃",
  Food: "🍽️", Art: "🎨", Sports: "⚽", Business: "💼",
  Education: "📚", Other: "✨",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDayDate = (dateString: string | Date): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  return `${date.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  })} · ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
};

const getLowestPrice = (ticketTypes: { price: number }[] = []): string => {
  if (!ticketTypes?.length) return "Free";
  const min = Math.min(...ticketTypes.map((t) => t.price));
  return min === 0 ? "Free" : `₹${min.toLocaleString("en-IN")}`;
};

const RSVP_WORKSHOP_EVENT_ID = "6ac644e31e7f6f9476b839c0";
const HORNBILL_SHOWCASE_EVENT_ID = "6ab402a990e6bc7f24d420a2";

const getEventHref = (event: Event): string => {
  if (String(event._id) === RSVP_WORKSHOP_EVENT_ID) return "/events/workshop-rsvp";
  if (
    String(event._id) === HORNBILL_SHOWCASE_EVENT_ID ||
    String((event as any).slug || "") === "ticket-to-hornbill-showcase-day1" ||
    String((event as any).externalBookingUrl || "").includes("/ticket-to-hornbill")
  ) {
    return "/ticket-to-hornbill";
  }
  return `/events/${event._id}`;
};

// ─── Event Card ───────────────────────────────────────────────────────────────

interface EventCardProps {
  event: Event;
  index?: number;
}

const EventCard: React.FC<EventCardProps> = ({ event, index = 0 }) => {
  const isPast = new Date(event.endDate ?? event.startDate) < new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="group"
      role="article"
      aria-labelledby={`event-title-${event._id}`}
    >
      {/* Poster */}
      <div className="relative w-full overflow-hidden rounded-2xl bg-gray-100 shadow-sm">
        <Image
          src={event.banner || "/placeholder.svg"}
          alt={event.title}
          width={0}
          height={0}
          sizes="(max-width: 640px) 50vw, 20vw"
          priority={index < 8}
          className={`w-full h-auto block transition-transform duration-500 group-hover:scale-105 ${isPast ? "grayscale-[40%]" : ""}`}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Category pill */}
        {event.category && (
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/90 backdrop-blur-sm text-gray-800 shadow-sm">
              {GENRE_ICONS[event.category] ?? "✨"} {event.category}
            </span>
          </div>
        )}

        {isPast && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-gray-300 uppercase tracking-wider">
              Past
            </span>
          </div>
        )}

        {/* Date strip */}
        {formatDayDate(event.startDate) && (
          <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/90 to-transparent">
            <p className="text-[10px] text-white/90 font-medium truncate">
              {formatDayDate(event.startDate)}
            </p>
          </div>
        )}

        {/* Hover arrow */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-md">
            <ArrowRight className="w-3.5 h-3.5 text-gray-900" />
          </div>
        </div>
      </div>

      {/* Text */}
      <div className="pt-2.5 px-0.5">
        <h3
          id={`event-title-${event._id}`}
          className="text-[13px] sm:text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors duration-200"
        >
          {event.title}
        </h3>
        {event.location?.city && (
          <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{event.location.city}</span>
          </p>
        )}
      </div>
    </motion.div>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ title: string; count: number; dot?: string }> = ({
  title, count, dot = "bg-blue-500",
}) => (
  <div className="flex items-center gap-3 mb-5">
    <span className={`w-2.5 h-2.5 rounded-full ${dot} flex-shrink-0`} />
    <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">{title}</h2>
    <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
      {count}
    </span>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const [searchQuery, setSearchQuery]       = useState("");
  const [selectedCity, setSelectedCity]     = useState("all");
  const [selectedGenre, setSelectedGenre]   = useState("all");
  const [events, setEvents]                 = useState<Event[]>([]);
  const [dailyEvents, setDailyEvents]       = useState<any[]>([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen]     = useState(false);
  const [heroImages, setHeroImages]         = useState<Array<{ url: string }>>([]);
  const [loadingHero, setLoadingHero]       = useState(true);
  const [heroIdx, setHeroIdx]               = useState(0);

  const currentDate = new Date();

  // ── Fetch events ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events?limit=1000&includePast=true`);
        if (!res.ok) throw new Error("Failed to fetch events");
        const data: EventsResponse = await res.json();
        setEvents(data.data.events);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load events");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Fetch daily events ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/daily-events?limit=1000`);
        if (res.ok) {
          const data = await res.json();
          setDailyEvents(data.data?.dailyEvents || []);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // ── Hero images ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setLoadingHero(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hero-images?active=true`);
        if (res.ok) {
          const data = await res.json();
          let imgs = data.data.filter((i: any) =>
            i.title?.toLowerCase().includes("events") ||
            i.description?.toLowerCase().includes("events") ||
            i.type === "events"
          );
          if (!imgs.length) imgs = data.data;
          setHeroImages(imgs.map((i: any) => ({ url: i.url })));
        } else {
          setHeroImages([{ url: "/images/carausel1.jpg" }]);
        }
      } catch {
        setHeroImages([{ url: "/images/carausel1.jpg" }]);
      } finally {
        setLoadingHero(false);
      }
    })();
  }, []);

  // ── Filter helpers ─────────────────────────────────────────────────────────
  const resetFilters = () => {
    setSearchQuery(""); setSelectedCity("all"); setSelectedGenre("all");
    setIsFilterOpen(false);
  };
  const dailyToShow = (selectedGenre === "all" || selectedGenre === "Daily")
    ? dailyEvents.filter((d: any) => (d?.title || "").toLowerCase().includes(searchQuery.toLowerCase()))
    : [];
  const dailyHref = (d: any) => (d?.slug === "ge-blaster" ? "/ge-blaster" : `/events/daily/${d?._id}`);

  const hasActiveFilters = searchQuery !== "" || selectedCity !== "all" || selectedGenre !== "all";

  // ── Filtered & sorted events ───────────────────────────────────────────────
  const cityMatches = (eventCity: string | undefined, selected: string) => {
    if (selected === "all") return true;
    const city = (eventCity || "").toLowerCase().trim();
    const needle = selected.toLowerCase().trim();
    if (!city) return false;
    if (city === needle) return true;
    // Treat Delhi / New Delhi as the same market for filtering.
    if ((needle === "delhi" || needle === "new delhi") && (city === "delhi" || city === "new delhi")) {
      return true;
    }
    return city.includes(needle) || needle.includes(city);
  };

  const filtered = events.filter((e) =>
    (e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.description ?? "").toLowerCase().includes(searchQuery.toLowerCase())) &&
    cityMatches(e.location?.city, selectedCity) &&
    (selectedGenre === "all" || e.category?.toLowerCase() === selectedGenre.toLowerCase())
  );

  const upcomingSorted = filtered
    .filter((e) => new Date(e.startDate) > currentDate)
    .sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate));

  const currentSorted = filtered
    .filter((e) => {
      const s = new Date(e.startDate); const en = e.endDate ? new Date(e.endDate) : null;
      if (!en) {
        const sd = new Date(s); sd.setHours(0,0,0,0);
        const td = new Date(currentDate); td.setHours(0,0,0,0);
        return sd.getTime() === td.getTime();
      }
      return s <= currentDate && en >= currentDate;
    })
    .sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate));

  const pastSorted = filtered
    .filter((e) => {
      const en = e.endDate ? new Date(e.endDate) : null;
      if (en) return en < currentDate;
      const sd = new Date(new Date(e.startDate)); sd.setHours(0,0,0,0);
      const td = new Date(currentDate); td.setHours(0,0,0,0);
      return sd < td;
    })
    .sort((a, b) => +new Date(b.endDate ?? b.startDate) - +new Date(a.endDate ?? a.startDate));

  // ── Loading / error states ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-base font-semibold text-gray-700">Loading Events…</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center p-8 max-w-sm w-full bg-white rounded-2xl shadow-lg">
          <h2 className="text-xl font-bold text-red-600 mb-3">Something went wrong</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <Button onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6">
            Try Again
          </Button>
        </motion.div>
      </div>
    );
  }

  // ── Hero image URL ─────────────────────────────────────────────────────────
  const heroSrc = heroImages[heroIdx]?.url || "/images/carausel1.jpg";

  // ── Sidebar / filter panel content (shared) ────────────────────────────────
  const FilterContent = () => (
    <div className="space-y-4">
      {/* Search */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Search</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search events…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 bg-gray-50 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
            aria-label="Search events"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* City */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">City</p>
        <Select value={selectedCity} onValueChange={setSelectedCity}>
          <SelectTrigger className="bg-gray-50 border-gray-200 rounded-xl text-sm">
            <SelectValue placeholder="All Cities" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200 rounded-xl shadow-lg max-h-60">
            <SelectItem value="all">All Cities</SelectItem>
            {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Category */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Category</p>
        <Select value={selectedGenre} onValueChange={setSelectedGenre}>
          <SelectTrigger className="bg-gray-50 border-gray-200 rounded-xl text-sm">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200 rounded-xl shadow-lg max-h-60">
            <SelectItem value="all">All Categories</SelectItem>
            {GENRES.map((g) => <SelectItem key={g} value={g}>{GENRE_ICONS[g]} {g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <hr className="border-gray-100" />

      <Button asChild variant="outline"
        className="w-full rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 text-sm justify-start gap-2">
        <Link href="/allVenues"><MapPin className="h-4 w-4 text-gray-400" />Browse by Venues</Link>
      </Button>
      <Button asChild variant="outline"
        className="w-full rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 text-sm justify-start gap-2">
        <Link href="/events/daily"><Calendar className="h-4 w-4 text-gray-400" />Daily Events</Link>
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f8fa]">
      <Navbar />

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative w-full overflow-hidden bg-gray-900">
          {loadingHero ? (
            <div className="w-full aspect-[2560/460] bg-gray-800 animate-pulse" />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={heroIdx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="relative w-full"
              >
                <Image
                  src={heroSrc}
                  alt="Events"
                  width={EVENTS_HERO_IMAGE_WIDTH}
                  height={EVENTS_HERO_IMAGE_HEIGHT}
                  className="w-full h-auto block"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

                

                {/* Slideshow dots */}
                {heroImages.length > 1 && (
                  <div className="absolute bottom-3 right-4 flex gap-1.5">
                    {heroImages.map((_, i) => (
                      <button
                        key={i} onClick={() => setHeroIdx(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                          i === heroIdx ? "w-4 bg-white" : "bg-white/40"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </section>

        {/* ── Mobile quick-search bar ──────────────────────────────────────── */}
        <div className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
          <div className="flex gap-2 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search events…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-gray-50 border-gray-200 rounded-full text-sm h-9"
              />
            </div>
            <button
              onClick={() => setIsFilterOpen(true)}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-full text-sm font-medium border transition-all ${
                hasActiveFilters
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Filters</span>
              {hasActiveFilters && (
                <span className="w-4 h-4 flex items-center justify-center rounded-full bg-white/30 text-[10px] font-bold">
                  {[searchQuery, selectedCity !== "all", selectedGenre !== "all"].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Main layout ─────────────────────────────────────────────────── */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex gap-6 lg:gap-8 items-start">

            {/* ── Desktop Sidebar ────────────────────────────────────────── */}
            <aside className="hidden lg:block w-[260px] xl:w-[280px] flex-shrink-0 sticky top-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-gray-900 text-sm">Filters</h3>
                  {hasActiveFilters && (
                    <button onClick={resetFilters}
                      className="text-xs text-blue-600 font-medium hover:text-blue-700 transition-colors">
                      Clear all
                    </button>
                  )}
                </div>
                <FilterContent />
              </div>
            </aside>

            {/* ── Content ────────────────────────────────────────────────── */}
            <div className="flex-1 min-w-0">

              {/* Top bar: title + action buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                    {`Events in ${selectedCity === "all" ? "India" : selectedCity}`}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {upcomingSorted.length + currentSorted.length} upcoming
                    {pastSorted.length > 0 ? ` · ${pastSorted.length} past` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button asChild size="sm"
                    className="rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-4 shadow-sm">
                    <Link href="/events/daily">
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />Daily
                    </Link>
                  </Button>
                </div>
              </div>

              {/* ── Genre pill row ──────────────────────────────────────── */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-5 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
                <button
                  onClick={() => setSelectedGenre(selectedGenre === "Daily" ? "all" : "Daily")}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-all border ${
                    selectedGenre === "Daily"
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-200 hover:text-blue-600"
                  }`}
                >
                  <span>🗓️</span>
                  <span>Daily</span>
                </button>
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(selectedGenre === genre ? "all" : genre)}
                    className={`flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-all border ${
                      selectedGenre === genre
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-200 hover:text-blue-600"
                    }`}
                  >
                    <span>{GENRE_ICONS[genre]}</span>
                    <span>{genre}</span>
                  </button>
                ))}
              </div>

              {/* ── Events sections ─────────────────────────────────────── */}
              <div className="space-y-10">

                  {/* Daily Experiences */}
                  {dailyToShow.length > 0 && (
                    <section>
                      <SectionHeader title="Daily Experiences" count={dailyToShow.length} dot="bg-blue-500" />
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                        {dailyToShow.map((d: any) => (
                          <Link key={d._id} href={dailyHref(d)} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl">
                            <div className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                              <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={d.banner} alt={d.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                <span className="absolute left-2.5 top-2.5 rounded-lg bg-blue-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">Daily</span>
                              </div>
                              <div className="p-3">
                                <h3 className="line-clamp-2 text-sm font-bold text-gray-900">{d.title}</h3>
                                <p className="mt-1 text-xs font-medium text-blue-600">Book a slot →</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </section>
                  )}
                  

                  {/* Live */}
                  {currentSorted.length > 0 && (
                    <section>
                      <SectionHeader title="Live Now" count={currentSorted.length} dot="bg-red-500" />
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                        {currentSorted.map((event, i) => (
                          <Link key={event._id} href={getEventHref(event)} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl">
                            <EventCard event={event} index={i} />
                          </Link>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Upcoming */}
                  {upcomingSorted.length > 0 && (
                    <section>
                      <SectionHeader title="Upcoming Events" count={upcomingSorted.length} dot="bg-blue-500" />
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                        {upcomingSorted.map((event, i) => (
                          <Link key={event._id} href={getEventHref(event)} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl">
                            <EventCard event={event} index={i} />
                          </Link>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Past */}
                  {/* {pastSorted.length > 0 && (
                    <section>
                      <SectionHeader title="Past Events" count={pastSorted.length} dot="bg-gray-300" />
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                        {pastSorted.map((event, i) => (
                          <Link key={event._id} href={getEventHref(event)} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl">
                            <EventCard event={event} index={i} />
                          </Link>
                        ))}
                      </div>
                    </section>
                  )} */}

                  {/* Empty state */}
                  {!currentSorted.length && !upcomingSorted.length && !pastSorted.length && !dailyToShow.length && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="text-5xl mb-4">🔍</div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">No events found</h3>
                      <p className="text-gray-500 text-sm mb-6 max-w-xs">
                        Try adjusting your filters or searching for something different.
                      </p>
                      <Button onClick={resetFilters} variant="outline"
                        className="rounded-full border-gray-300 text-gray-700 hover:bg-gray-50">
                        Clear Filters
                      </Button>
                    </motion.div>
                  )}
                </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Mobile Filter Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center lg:hidden"
            onClick={(e) => { if (e.target === e.currentTarget) setIsFilterOpen(false); }}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto shadow-2xl"
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-gray-200" />
              </div>

              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-bold text-gray-900">Filter Events</h3>
                  <button onClick={() => setIsFilterOpen(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <FilterContent />

                <div className="flex gap-2.5 pt-5 mt-5 border-t border-gray-100">
                  <Button variant="outline" onClick={resetFilters}
                    className="flex-1 rounded-full border-gray-200 text-gray-700 text-sm h-10">
                    Clear All
                  </Button>
                  <Button onClick={() => setIsFilterOpen(false)}
                    className="flex-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm h-10 shadow-sm">
                    Apply Filters
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
