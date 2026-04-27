"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Search, MapPin, Heart, Share2, Star, CalendarDays, Wallet } from "lucide-react"
import Link from "next/link"
import Navbar from "../../Navbar"
import Footer from "../../Footer"
import { toast } from "sonner"

interface Artist {
  _id: string
  name: string
  bio: string
  genres: string[]
  type: string
  basePrice: number
  city: string
  rating: { average: number; count: number }
  totalBookings: number
  gallery: { photos: Array<{ url: string; isProfileImage?: boolean }> }
}

const CATEGORIES = ["All", "DJ", "Singer", "Band", "Dancer", "Comedian", "Magician"]

const DEMO_IMAGES = [
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80",
]

export default function ArtistsListPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  const fetchArtists = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (activeCategory !== "All") params.append("genre", activeCategory)

      const res = await fetch(`/api/artist/public?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        setArtists(data.data.artists || [])
      } else {
        setArtists([])
      }
    } catch {
      toast.error("Failed to load artists")
    } finally {
      setLoading(false)
    }
  }, [activeCategory])

  useEffect(() => {
    fetchArtists()
  }, [fetchArtists])

  const toggleFav = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return artists
    return artists.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q)
    )
  }, [artists, searchQuery])

  const shareArtist = async (artist: Artist) => {
    const url = `${window.location.origin}/artist/profile/${artist._id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied to clipboard")
    } catch {
      toast.error("Could not copy link")
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 font-sans antialiased selection:bg-indigo-500/30">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-950 py-16 sm:py-20 lg:py-24 border-b border-slate-800 bg-[radial-gradient(circle_at_15%_50%,rgba(79,70,229,0.15),transparent_25%),radial-gradient(circle_at_85%_30%,rgba(225,29,72,0.15),transparent_25%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            

            <div className="relative w-full max-w-2xl mx-auto mt-2">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/50" size={20} />
              <input
                type="text"
                placeholder="Search by artist name, category, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 pl-14 pr-6 rounded-full bg-white/5 border border-white/10 text-white text-lg backdrop-blur-md transition-all placeholder:text-white/50 focus:outline-none focus:bg-white/10 focus:border-white/30 focus:ring-4 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2.5 rounded-full border text-sm font-medium transition-all backdrop-blur-md ${
                    activeCategory === cat
                      ? "bg-white text-slate-950 border-white font-semibold"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white hover:-translate-y-0.5"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-8 animate-in fade-in duration-700 delay-150 fill-mode-both">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Featured Artists</h2>
              <p className="text-sm text-slate-500">
                {loading
                  ? "Curating the best talent for you..."
                  : `Showing ${filtered.length} world-class professional${filtered.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading ? (
              // Skeleton Loaders
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-pulse">
                  <div className="aspect-[4/5] bg-slate-200" />
                  <div className="p-5">
                    <div className="h-6 w-3/4 bg-slate-200 rounded mb-4" />
                    <div className="h-4 w-1/2 bg-slate-200 rounded mb-8" />
                    <div className="flex gap-3 mt-4">
                      <div className="h-11 flex-1 bg-slate-200 rounded-xl" />
                      <div className="h-11 flex-1 bg-slate-200 rounded-xl" />
                    </div>
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              // Empty State
              <div className="col-span-full text-center py-20 px-4 bg-white rounded-2xl border border-dashed border-slate-300">
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No artists found</h3>
                <p className="text-slate-500">
                  We couldn't find any artists matching your current filters. Try adjusting your search.
                </p>
              </div>
            ) : (
              // Artist Cards
              filtered.map((artist, index) => {
                const artistImg = artist.gallery?.photos?.find((p) => p.isProfileImage)?.url
                const fallbackImg = artist.gallery?.photos?.[0]?.url
                const demoImg = DEMO_IMAGES[index % DEMO_IMAGES.length]
                const img = artistImg || fallbackImg || demoImg
                const isSaved = favorites.has(artist._id)

                return (
                  <div
                    key={artist._id}
                    className="group flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
                      <img
                        src={img}
                        alt={artist.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent pointer-events-none" />
                      
                      <span className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider uppercase">
                        {artist.type}
                      </span>

                      <div className="absolute top-4 right-4 flex gap-2">
                        <button
                          onClick={() => toggleFav(artist._id)}
                          className="w-9 h-9 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-sm hover:bg-white hover:scale-110 transition-all"
                          aria-label={isSaved ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Heart
                            size={18}
                            fill={isSaved ? "#E11D48" : "none"}
                            stroke={isSaved ? "#E11D48" : "currentColor"}
                          />
                        </button>
                        <button
                          onClick={() => shareArtist(artist)}
                          className="w-9 h-9 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-sm hover:bg-white hover:scale-110 transition-all"
                          aria-label="Share profile"
                        >
                          <Share2 size={18} />
                        </button>
                      </div>

                      <div className="absolute bottom-4 left-4 bg-white/95 px-2.5 py-1 rounded-lg flex items-center gap-1 text-sm font-bold text-slate-900 shadow-sm">
                        <Star size={14} className="fill-amber-500 stroke-amber-500" />
                        {artist.rating?.average?.toFixed(1) || "New"}
                      </div>
                    </div>

                    <div className="p-5 flex flex-col flex-grow">
                      <h3 className="font-['Cormorant_Garamond',serif] text-2xl font-bold text-slate-900 mb-3 leading-tight">
                        {artist.name}
                      </h3>

                      

                      <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-100 font-semibold text-slate-900">
                        <Wallet size={16} className="text-slate-400" />
                        <span className="text-slate-500 text-sm font-medium">Starts at</span>
                        <span className="text-xl text-indigo-600">
                          {artist.basePrice ? formatPrice(artist.basePrice) : "Custom"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 px-5 pb-5">
                      <Link
                        href={`/artist/profile/${artist._id}`}
                        className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-900 bg-transparent border border-slate-200 hover:bg-slate-50 hover:border-slate-400 transition-all"
                      >
                        View Profile
                      </Link>
                      <Link
                        href={`/artist/profile/${artist._id}?book=true`}
                        className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-indigo-600 shadow-sm transition-all"
                      >
                        Book Now
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}