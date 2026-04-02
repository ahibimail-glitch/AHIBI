"use client"

import { useState, useEffect } from "react"
import {
  Search, MapPin, Heart, Share2, Ticket, X
} from "lucide-react"
import Link from "next/link"
import Navbar from "../../Navbar"
import Footer from "../../Footer"
import { toast } from "sonner"

/* ─── Types ───────────────── */
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

/* ─── Constants ───────────── */
const CATEGORIES = ["All","DJ","Singer","Band","Dancer","Comedian","Magician","Anchor/MC"]
const DEMO_IMAGES = [
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=900&q=80"
]

/* ─── UI Small Components ─── */
const Star = () => (
  <span className="text-[#F59E0B] text-sm font-semibold">★</span>
)

/* ─── Main ───────────────── */
export default function ArtistsListPage() {

  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  useEffect(() => { fetchArtists() }, [activeCategory])

  const fetchArtists = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (activeCategory !== "All") params.append("genre", activeCategory)

      const res = await fetch(`/api/artist/public?${params}`)
      const data = await res.json()
      if (data.success) setArtists(data.data.artists)
    } catch {
      toast.error("Failed to load artists")
    } finally {
      setLoading(false)
    }
  }

  const toggleFav = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = artists.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const shareArtist = async (artist: Artist) => {
    const url = `${window.location.origin}/artist/profile/${artist._id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied")
    } catch {
      toast.error("Error")
    }
  }

  return (
    <div className="bg-[#FAF8F5] text-[#191513] font-[Inter]">
      <Navbar />

      {/* ─── HERO SEARCH ─── */}
      <section className="border-b border-[#E9E4DB] bg-white py-10">
        <div className="mx-auto max-w-[1280px] px-6">
          <h1 className="font-['Playfair_Display'] text-4xl font-bold">
            Discover Artists
          </h1>

          <div className="mt-6 flex gap-3">
            <div className="flex flex-1 items-center gap-3 rounded-2xl border border-[#E9E4DB] bg-[#F8F4EF] px-4 py-3">
              <Search size={18} />
              <input
                placeholder="Search artists..."
                value={searchQuery}
                onChange={(e)=>setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none"
              />
            </div>
          </div>

          {/* Category pills */}
          <div className="mt-5 flex flex-wrap gap-2">
            {CATEGORIES.map(cat=>(
              <button
                key={cat}
                onClick={()=>setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  activeCategory===cat
                    ? "bg-[#191513] text-white"
                    : "border border-[#E9E4DB]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── GRID ─── */}
      <section className="mx-auto max-w-[1280px] px-6 py-10">

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array(8).fill(0).map((_,i)=>(
              <div key={i} className="h-80 bg-[#EEE] animate-pulse rounded-2xl"/>
            ))}
          </div>
        ) : (

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

            {filtered.map((artist, index)=>{
              const artistImg = artist.gallery?.photos?.find(p=>p.isProfileImage)?.url
              const fallbackImg = artist.gallery?.photos?.[0]?.url
              const demoImg = DEMO_IMAGES[index % DEMO_IMAGES.length]
              const img = artistImg || fallbackImg || demoImg
              const isSaved = favorites.has(artist._id)

              return (
                <div
                  key={artist._id}
                  className="group overflow-hidden rounded-2xl border bg-white shadow-sm hover:shadow-lg transition"
                >
                  {/* Image */}
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img src={img} className="w-full h-full object-cover group-hover:scale-105 transition"/>

                    <div className="absolute top-3 right-3 flex gap-2">
                      <button onClick={()=>toggleFav(artist._id)} className="bg-white p-2 rounded-full">
                        <Heart size={14} fill={isSaved?"#E31837":"none"}/>
                      </button>
                      <button onClick={()=>shareArtist(artist)} className="bg-white p-2 rounded-full">
                        <Share2 size={14}/>
                      </button>
                    </div>

                    <div className="absolute bottom-0 p-4 text-white bg-gradient-to-t from-black/80 to-transparent w-full">
                      <div className="text-sm">{artist.type}</div>
                      <div className="text-xl font-bold">{artist.name}</div>
                      <div className="flex gap-2 text-xs mt-1">
                        <Star/> {artist.rating.average}
                        <span className="flex items-center gap-1">
                          <MapPin size={12}/> {artist.city}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  {
                    artist.bio && (
                      <div className="p-4 flex flex-col gap-3">
                        <div className="text-sm text-[#6D645D] ">
                          {artist.bio}
                        </div>
                      </div>
                    )
                  }
                 

          

                  {/* Buttons */}
                  <div className="flex ">
                    <Link
                      href={`/artist/profile/${artist._id}`}
                      className="flex-1 text-center py-3 bg-[#191513] text-white text-sm font-semibold hover:bg-[#E31837]"
                    >
                      View
                    </Link>
                    <Link
                      href={`/artist/profile/${artist._id}?book=true`}
                      className="flex-1 text-center py-3 text-sm font-semibold hover:bg-[#F5F5F5]"
                    >
                      Book
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <Footer />
    </div>
  )
}