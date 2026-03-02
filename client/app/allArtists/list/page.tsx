"use client"

import { useState, useEffect } from "react"
import {
  Search, MapPin, Star, Heart, Share2, Instagram,
  Youtube, Facebook, Ticket, CheckCircle, TrendingUp,
  ArrowRight, Music, Mic, Headphones, SlidersHorizontal,
  ChevronDown, X
} from "lucide-react"
import Link from "next/link"
import Navbar from "../../Navbar"
import Footer from "../../Footer"
import { toast } from "sonner"

/* ─── Types ─────────────────────────────────────────────────────────────── */
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
  gallery: { photos: Array<{ url: string; caption?: string; isProfileImage?: boolean }> }
  socialLinks: { instagram?: string; youtube?: string; spotify?: string; facebook?: string; twitter?: string; website?: string }
  approvalStatus: string
  status: string
}

/* ─── Constants ─────────────────────────────────────────────────────────── */
const GENRES = ["Electronic","Bollywood","Hip-Hop","Indie","Fusion","Comedy","Classical","Rock","Jazz","Folk"];
const LOCATIONS = ["Mumbai","Delhi","Bangalore","Pune","Chennai","Hyderabad","Kolkata","Ahmedabad"];
const CATEGORIES = ["All","DJ","Singer","Band","Dancer","Comedian","Magician","Anchor/MC"];
const SOC_COLOR: Record<string, string> = {
  instagram: "linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)",
  youtube: "#FF0000", facebook: "#1877F2",
};

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24"
      fill={filled ? "#F59E0B" : "none"} stroke="#F59E0B" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function ArtistsListPage() {
  const [searchQuery, setSearchQuery]       = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  const [selectedLocation, setSelectedLocation] = useState("all")
  const [sortBy, setSortBy]                 = useState("rating")
  const [artists, setArtists]               = useState<Artist[]>([])
  const [loading, setLoading]               = useState(true)
  const [favorites, setFavorites]           = useState<Set<string>>(new Set())

  useEffect(() => { fetchArtists(); }, [activeCategory, selectedLocation, sortBy]);

  const fetchArtists = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeCategory !== "All") params.append("genre", activeCategory);
      if (selectedLocation !== "all") params.append("city", selectedLocation);
      params.append("sortBy", sortBy === "rating" ? "rating.average" : sortBy);
      const res = await fetch(`/api/artist/public?${params}`);
      const data = await res.json();
      if (data.success) setArtists(data.data.artists);
      else toast.error("Failed to load artists");
    } catch { toast.error("Failed to load artists"); }
    finally { setLoading(false); }
  };

  const toggleFav = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast.success("Removed from saved"); }
      else { next.add(id); toast.success("Artist saved"); }
      return next;
    });
  };

  const filtered = artists.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.bio.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.genres.some(g => g.toLowerCase().includes(q)) ||
      a.type.toLowerCase().includes(q)
    );
  });

  const clearFilters = () => {
    setSearchQuery(""); setActiveCategory("All"); setSelectedLocation("all");
  };
  const hasFilters = searchQuery || activeCategory !== "All" || selectedLocation !== "all";

  const shareArtist = async (artist: Pick<Artist, "_id" | "name">) => {
    const url = `${window.location.origin}/artist/profile/${artist._id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: artist.name, text: `Check out ${artist.name} on AHiBi`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't share");
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[#FAF7F2] text-[#1A1714]">
        <Navbar />

        {/* ── Hero / Search ── */}
        <div className="bg-[#1A1714] py-14">
          <div className="mx-auto w-full max-w-[1280px] px-6 md:px-10 lg:px-[60px]">
            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-3 text-[11px] font-medium uppercase tracking-[2.5px] text-white/40">Browse Artists</div>
                <div className="font-['Playfair_Display'] text-[clamp(30px,5vw,58px)] font-black leading-[0.93] tracking-[-1.5px] text-white">
                  Find the perfect <em className="italic text-white/35">artist</em>
                </div>
                <div className="mt-3 max-w-[360px] text-[13px] leading-relaxed text-white/45">
                  Search and filter verified talent by category, city, rating, and bookings.
                </div>
              </div>

              <div className="w-full max-w-[420px]">
                <div className="flex items-center border border-white/15 bg-white/10">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search artists, genres, city..."
                    className="w-full bg-transparent px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/30"
                  />
                  <button
                    type="button"
                    className="bg-[#E31837] px-4 py-3.5 text-white transition hover:bg-[#FF1F3D]"
                    onClick={() => {}}
                    aria-label="Search"
                  >
                    <Search size={18} />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["DJ", "Singer", "Band", "Comedian"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setActiveCategory(t)}
                      className={`border px-3 py-1 text-[10px] font-semibold uppercase tracking-[1.2px] transition ${
                        activeCategory === t
                          ? "border-[#E31837] bg-[#E31837]/10 text-[#E31837]"
                          : "border-white/15 bg-white/10 text-white/50 hover:border-white/30"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="sticky top-[64px] z-40 border-b border-[#DDD8CF] bg-[#F3EFE8]">
          <div className="mx-auto w-full max-w-[1280px] px-6 md:px-10 lg:px-[60px]">
            <div className="flex items-center overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`shrink-0 border-b-2 px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.8px] transition ${
                    activeCategory === cat
                      ? "border-[#C8102E] text-[#C8102E]"
                      : "border-transparent text-[#6B6259] hover:text-[#1A1714]"
                  }`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}

              <div className="ml-auto flex shrink-0 items-center border-l border-[#DDD8CF]">
                <select
                  className="bg-transparent px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.5px] text-[#6B6259] outline-none"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="rating">Top Rated</option>
                  <option value="bookings">Most Booked</option>
                  <option value="price-low">Price ↑</option>
                  <option value="price-high">Price ↓</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-[#DDD8CF]">
            <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-6 py-2.5 text-xs text-[#6B6259] md:px-10 lg:px-[60px]">
              <span>
                Showing <span className="font-semibold text-[#1A1714]">{loading ? "…" : filtered.length}</span> artists
                {activeCategory !== "All" && (
                  <>
                    {" "}in <span className="font-semibold text-[#1A1714]">{activeCategory}</span>
                  </>
                )}
              </span>
              {hasFilters && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[1px] text-[#C8102E] hover:opacity-80"
                  onClick={clearFilters}
                >
                  <X size={12} /> Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Grid ── */}
        <div className="mx-auto w-full max-w-[1280px] px-6 py-10 md:px-10 lg:px-[60px]">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden border border-[#DDD8CF] bg-white">
                  <div className="aspect-[3/4] bg-[#F3EFE8]" />
                  <div className="p-5">
                    <div className="h-3 w-2/3 bg-[#F3EFE8]" />
                    <div className="mt-3 h-3 w-5/6 bg-[#F3EFE8]" />
                    <div className="mt-3 h-3 w-1/2 bg-[#F3EFE8]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="mx-auto max-w-[520px] py-20 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-[#F3EFE8]">
                <Search size={28} className="text-[#6B6259]" />
              </div>
              <div className="font-['Playfair_Display'] text-2xl font-bold text-[#1A1714]">No artists found</div>
              <p className="mt-3 text-sm leading-relaxed text-[#6B6259]">
                We couldn't find artists matching your criteria. Try adjusting filters or search terms.
              </p>
              <button
                type="button"
                className="mt-8 bg-[#1A1714] px-8 py-3.5 text-[12px] font-semibold uppercase tracking-[1px] text-white transition hover:bg-[#E31837]"
                onClick={clearFilters}
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((artist, idx) => {
                  const profileImg = artist.gallery?.photos?.find(p => p.isProfileImage)?.url || "/placeholder.svg";
                  const hasPrice   = Number.isFinite(artist.basePrice) && artist.basePrice > 0;
                  const priceLbl   = hasPrice ? `₹${artist.basePrice.toLocaleString()}` : "Custom";
                  const isSaved    = favorites.has(artist._id);

                  return (
                    <div
                      key={artist._id}
                      className="group relative flex flex-col overflow-hidden border border-[#DDD8CF] bg-white transition hover:-translate-y-0.5 hover:border-[#1A1714] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-[#F3EFE8]">
                        <img
                          src={profileImg}
                          alt={artist.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(20,15,10,0.88)] via-[rgba(20,15,10,0.1)] to-transparent" />

                        <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
                          <span
                            className={`px-[9px] py-[3px] text-[9px] font-bold uppercase tracking-[1.5px] text-white ${
                              artist.totalBookings > 50 ? "bg-[#E31837]" : "bg-[#1A1714]"
                            }`}
                          >
                            {artist.totalBookings > 50 ? "Top Artist" : artist.type}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className={`flex h-8 w-8 items-center justify-center border border-white/20 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 ${
                                isSaved ? "bg-[#E31837] border-[#E31837]" : ""
                              }`}
                              onClick={() => toggleFav(artist._id)}
                              aria-label="Save"
                            >
                              <Heart size={14} fill={isSaved ? "#fff" : "none"} />
                            </button>
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center border border-white/20 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
                              onClick={() => shareArtist({ _id: artist._id, name: artist.name })}
                              aria-label="Share"
                            >
                              <Share2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[1.5px] text-[#E31837]">{artist.type}</div>
                          <div className="font-['Playfair_Display'] text-xl font-bold leading-[1.15] text-white">{artist.name}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[11px] text-white/55">
                            {artist.rating?.count > 0 && (
                              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#F59E0B]">
                                <StarIcon filled />
                                {artist.rating.average.toFixed(1)}
                              </span>
                            )}
                            {artist.city && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin size={11} />
                                {artist.city}
                              </span>
                            )}
                            {artist.totalBookings > 0 && <span>{artist.totalBookings}+ bookings</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col gap-4 p-5">
                        {artist.bio && (
                          <p className="line-clamp-2 text-[13px] leading-relaxed text-[#6B6259]">{artist.bio}</p>
                        )}

                        <div className="flex flex-wrap gap-1">
                          {artist.genres?.slice(0, 3).map((g, i) => (
                            <span
                              key={i}
                              className="border border-[#DDD8CF] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[1px] text-[#C8102E]"
                            >
                              {g}
                            </span>
                          ))}
                          {(artist.genres?.length || 0) > 3 && (
                            <span className="border border-[#DDD8CF] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[1px] text-[#6B6259]">
                              +{artist.genres.length - 3}
                            </span>
                          )}
                        </div>

                        <div className="mt-auto flex items-center justify-between border-t border-[#DDD8CF] py-4">
                          <div>
                            <div className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[#6B6259]">Starting from</div>
                            <div className="font-['Playfair_Display'] text-xl font-bold text-[#1A1714]">{priceLbl}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex">
                        <Link
                          href={`/artist/profile/${artist._id}`}
                          className="flex flex-1 items-center justify-center gap-2 bg-[#1A1714] px-3.5 py-3.5 text-[11px] font-semibold uppercase tracking-[1px] text-white transition hover:bg-[#E31837]"
                        >
                          View Profile <ArrowIcon />
                        </Link>
                        <Link
                          href={`/artist/profile/${artist._id}?book=true`}
                          className="flex items-center gap-1.5 border-l border-[#DDD8CF] px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[1px] text-[#1A1714] transition hover:bg-[#F3EFE8]"
                        >
                          <Ticket size={13} /> Book
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-12 text-center">
                <button
                  type="button"
                  className="border border-[#1A1714] px-10 py-3.5 text-[11px] font-semibold uppercase tracking-[1.5px] text-[#1A1714] transition hover:bg-[#1A1714] hover:text-white"
                >
                  Load More Artists
                </button>
              </div>
            </>
          )}
        </div>

        <Footer />
      </div>
    </>
  );
}
