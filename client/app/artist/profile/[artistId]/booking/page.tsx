"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createRoleAuthRedirectUrl } from "@/utils/redirectUtils";
import { Calendar, ChevronLeft, MapPin, Sparkles, Star } from "lucide-react";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";
import PublicBookingCalendar from "@/components/artist/PublicBookingCalendar";

interface Artist {
  _id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  bio: string;
  genres: string[];
  languages: string[];
  type: string;
  basePrice: number;
  profilePic?: string;
  gallery?: {
    photos: Array<{ url: string; caption: string; isProfileImage: boolean; isCoverImage: boolean }>;
    videos: Array<{ url: string; thumbnail: string; caption: string; platform: string }>;
  };
  rating?: { average: number; count: number };
  totalBookings?: number;
}

function Stars({ score }: { score: number }) {
  const rating = Math.round(score);
  return (
    <span className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill={i <= rating ? "#f59e0b" : "none"}
          stroke={i <= rating ? "#f59e0b" : "#cbd5e1"}
          strokeWidth="1.7"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  );
}

export default function ArtistBookingPage() {
  const params = useParams();
  const router = useRouter();
  const artistId = params.artistId as string;

  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isOrg = !!localStorage.getItem("organizer_token");
      if (!isOrg) {
        const bookingPath = `/artist/profile/${artistId}/booking`;
        window.location.href = createRoleAuthRedirectUrl("organizer", bookingPath);
        return;
      }
    }

    const fetchArtist = async () => {
      try {
        const res = await fetch(`/api/artist/public/${artistId}`);
        if (!res.ok) throw new Error("not found");
        const data = await res.json();
        setArtist(data.data.artist);
      } catch {
        setError("Artist not found or unavailable");
      } finally {
        setLoading(false);
      }
    };

    fetchArtist();
  }, [artistId]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-b from-[#fbfdff] via-[#f7f8fc] to-[#f5f7ff] font-sans antialiased text-slate-900">
          <div className="relative overflow-hidden bg-slate-900 min-h-[82vh] max-h-[920px]">
            <div className="absolute inset-0 w-full h-full bg-slate-800 animate-pulse" />
          </div>
          <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
            <div className="-mt-[34px] md:-mt-[58px] relative z-10">
              <div className="bg-white/90 border border-white/90 rounded-[28px] shadow-[0_20px_60px_rgba(15,23,42,0.08)] p-4 md:p-5 backdrop-blur-md">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-[18px] lg:gap-5 items-center">
                  <div className="flex gap-4 items-start min-w-0">
                    <div className="relative shrink-0 -mt-[52px] md:-mt-[66px]">
                      <div className="w-24 h-24 md:w-[124px] md:h-[124px] rounded-[28px] bg-slate-200 animate-pulse border-[5px] border-white/95" />
                    </div>
                    <div className="w-full pt-1 space-y-3">
                      <div className="h-2.5 w-20 bg-slate-200 rounded-full animate-pulse" />
                      <div className="h-10 w-[60%] bg-slate-200 rounded-xl animate-pulse" />
                      <div className="h-4 w-[72%] bg-slate-200 rounded-xl animate-pulse" />
                    </div>
                  </div>
                  <div className="h-[170px] flex-1 min-w-[220px] lg:min-w-[250px] bg-slate-200 animate-pulse rounded-[22px]" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-[18px] lg:gap-6 mt-[18px] lg:mt-6 pb-[120px] lg:pb-[70px]">
              <div className="flex flex-col gap-[18px]">
                <div className="h-[280px] bg-slate-200 animate-pulse rounded-[28px]" />
              </div>
              <div className="hidden lg:block">
                <div className="h-[360px] bg-slate-200 animate-pulse rounded-[28px]" />
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </>
    );
  }

  if (error || !artist) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-b from-[#fbfdff] via-[#f7f8fc] to-[#f5f7ff] font-sans antialiased text-slate-900">
          <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 flex items-center justify-center min-h-[60vh] py-12">
            <div className="max-w-[460px] w-full text-center bg-white/94 border border-slate-900/10 rounded-[28px] shadow-[0_20px_60px_rgba(15,23,42,0.08)] p-7">
              <div className="w-[76px] h-[76px] rounded-full mx-auto mb-4 bg-[#5b6cff]/10 flex items-center justify-center text-[#5b6cff]">
                <Sparkles size={28} />
              </div>
              <h1 className="font-['Cormorant_Garamond',_serif] text-[34px] font-bold leading-[1.1] text-slate-900">
                Artist not found
              </h1>
              <p className="mt-2.5 text-[15px] leading-[1.75] text-slate-600 font-medium">
                {error || "This artist doesn't exist or has been removed from the platform."}
              </p>
              <div className="mt-6 flex justify-center">
                <button
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-br from-[#5b6cff] to-[#7c3aed] text-white rounded-2xl px-[18px] py-[13px] text-sm font-bold shadow-[0_12px_26px_rgba(91,108,255,0.25)] hover:shadow-[0_16px_30px_rgba(91,108,255,0.30)] transition-all hover:-translate-y-[1px]"
                  onClick={() => router.back()}
                >
                  <ChevronLeft size={16} />
                  Go back
                </button>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </>
    );
  }

  const coverImg = artist.gallery?.photos?.find((p) => p.isCoverImage)?.url || "/images/carausel1.jpg";
  const profileImg = artist.gallery?.photos?.find((p) => p.isProfileImage)?.url || artist.profilePic;
  const price = Number(artist.basePrice);
  const hasPrice = Number.isFinite(price) && price > 0;
  const priceLabel = hasPrice ? `₹${price.toLocaleString()}` : "On request";
  const artistBook = { ...artist, basePrice: hasPrice ? price : 0 };

  const nameParts = artist.name?.trim().split(/\s+/) || [];
  const firstName = nameParts[0] || "";
  const restName = nameParts.slice(1).join(" ");

  return (
    <>
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@500;600;700&display=swap');`}
      </style>
      <Navbar />
      
      <div className="min-h-screen bg-gradient-to-b from-[#fbfdff] via-[#f7f8fc] to-[#f5f7ff] font-sans antialiased text-slate-900">
        
        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-slate-900 min-h-[82vh] max-h-[920px] animate-[fadeIn_0.5s_ease_forwards]">
          <img
            src={coverImg}
            alt={artist.name}
            className="absolute inset-0 w-full h-full object-cover object-[center_18%] scale-[1.01] saturate-[1.02] contrast-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/10 via-slate-900/20 to-slate-900/90" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#5b6cff]/20 via-transparent to-[#7c3aed]/20" />
          <div className="absolute w-[560px] h-[560px] rounded-full blur-[72px] bg-[#5b6cff]/20 -top-[140px] -right-[120px] pointer-events-none" />

          {/* Top Actions */}
          <div className="absolute top-0 inset-x-0 z-20 py-4 md:py-6">
            <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
              <button
                className="w-11 h-11 rounded-full border border-white/20 bg-white/10 text-white flex items-center justify-center cursor-pointer backdrop-blur-md transition-all hover:-translate-y-[1px] hover:bg-white/20 hover:border-white/30"
                onClick={() => router.back()}
                aria-label="Go back"
              >
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>

          {/* Hero Content (Overlapping bottom of hero) */}
          <div className="absolute bottom-0 inset-x-0 z-20 pb-[26px] md:pb-10">
            <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_minmax(320px,380px)] gap-[18px] lg:gap-7 items-end">
                <div>
                 

                 

                  <div className="mt-4 flex flex-wrap gap-2.5">
                    {artist.rating && artist.rating.count > 0 && (
                      <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-2.5 bg-amber-500/15 border border-amber-500/25 text-white/90 backdrop-blur-md text-[13px] leading-none">
                        <Stars score={artist.rating.average} />
                        <strong className="font-extrabold">{artist.rating.average.toFixed(1)}</strong>
                        <span>({artist.rating.count})</span>
                      </span>
                    )}

                    {(artist.totalBookings ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-2.5 bg-green-500/15 border border-green-500/25 text-white/90 backdrop-blur-md text-[13px] leading-none">
                        <Sparkles size={12} />
                        <strong className="font-extrabold">{artist.totalBookings}+</strong>
                        <span>bookings</span>
                      </span>
                    )}

                 
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN CONTAINER */}
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
          
          {/* IDENTITY CARD */}
          <div className="-mt-[34px] md:-mt-[58px] relative z-10">
            <div className="bg-white/90 border border-white/90 rounded-[28px] shadow-[0_20px_60px_rgba(15,23,42,0.08)] p-4 md:p-5 backdrop-blur-md">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-[18px] lg:gap-5 items-center">
                
                {/* Left Side: Avatar & Info */}
                <div className="flex gap-4 items-start min-w-0">
                  <div className="relative shrink-0 -mt-[52px] md:-mt-[66px]">
                    <div className="w-24 h-24 md:w-[124px] md:h-[124px] rounded-[28px] overflow-hidden border-[5px] border-white/95 bg-gray-200 shadow-[0_12px_30px_rgba(15,23,42,0.14)]">
                      {profileImg ? (
                        <img src={profileImg} alt={artist.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-indigo-600 text-white text-[42px] font-['Cormorant_Garamond',_serif] font-bold">
                          {artist.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 pt-1">
                    <div className="text-[#5b6cff] tracking-[.18em] uppercase text-[11px] font-extrabold">
                      {artist.type}
                    </div>
                    <div className="mt-1.5 font-['Cormorant_Garamond',_serif] text-[clamp(26px,3.7vw,42px)] leading-[1.04] font-bold text-slate-900 tracking-[-0.03em]">
                      {artist.name}
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-2.5 text-slate-600 text-sm leading-[1.5]">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={13} color="#5b6cff" />
                        {artist.city}
                      </span>
                      {artist.rating && artist.rating.count > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                          <Star size={13} fill="#f59e0b" color="#f59e0b" />
                          {artist.rating.average.toFixed(1)} · {artist.rating.count} reviews
                        </span>
                      )}
                    </div>

                    <div className="mt-3.5 flex flex-wrap gap-2">
                      {artist.genres?.map((g) => (
                        <span key={g} className="border border-[#5b6cff]/20 bg-[#5b6cff]/10 text-[#3346d6] rounded-full px-3 py-1.5 text-xs font-semibold leading-none">
                          {g}
                        </span>
                      ))}
                      {artist.languages?.map((l) => (
                        <span key={l} className="border border-slate-900/10 bg-slate-50 text-slate-700 rounded-full px-3 py-1.5 text-xs font-semibold leading-none">
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Side: Price & CTAs */}
                <div className="flex flex-wrap lg:flex-nowrap items-center justify-between lg:justify-end gap-3">
                  <div className="flex-1 min-w-[220px] lg:min-w-[250px] bg-gradient-to-b from-white to-[#f9fbff] border border-slate-900/10 rounded-[22px] p-[18px]">
                    <div className="text-[11px] font-extrabold tracking-[.18em] uppercase text-slate-500">
                      Starting from
                    </div>
                    <div className="mt-2 font-['Cormorant_Garamond',_serif] text-[38px] leading-none font-bold text-slate-900">
                      {priceLabel}
                    </div>
                    <div className="mt-1.5 text-slate-500 text-[13px]">
                      Transparent pricing for events, performances, and bookings.
                    </div>
                  </div>

                  <div className="flex flex-wrap lg:flex-nowrap gap-2.5 justify-start lg:justify-end">
                    <button
                      className="inline-flex items-center justify-center gap-2 border border-slate-900/10 rounded-2xl px-[18px] py-[13px] cursor-pointer text-sm font-bold leading-none transition-all whitespace-nowrap bg-white text-slate-900 hover:-translate-y-[1px] hover:bg-[#f8faff] hover:border-[#5b6cff]/20"
                      onClick={() => router.push(`/artist/profile/${artistId}`)}
                    >
                      <ChevronLeft size={14} />
                      Back to profile
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-[18px] lg:gap-6 mt-[18px] lg:mt-6 pb-[120px] lg:pb-[70px]">
            <main className="flex flex-col gap-[18px]">
              
              {/* BOOKING CALENDAR SECTION */}
              <section className="bg-white/90 border border-slate-900/10 rounded-[28px] shadow-[0_10px_30px_rgba(15,23,42,0.04)] overflow-hidden">
                <div className="p-[18px] md:p-6">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#5b6cff] to-[#7c3aed] ring-[6px] ring-[#5b6cff]/10" />
                    <div className="text-[11px] tracking-[.20em] uppercase font-extrabold text-[#5b6cff]">
                      Booking
                    </div>
                  </div>
                  <h2 className="font-['Cormorant_Garamond',_serif] text-[clamp(24px,3vw,34px)] leading-[1.1] font-bold text-slate-900 tracking-[-0.03em]">
                    Select date & time
                  </h2>
                  <p className="mt-2 text-[15px] leading-[1.8] text-slate-600 max-w-[72ch] mb-4">
                    Choose a slot and submit your booking request.
                  </p>
                  
                  {/* Calendar Component */}
                  <PublicBookingCalendar artistId={artist._id} artist={artistBook} />
                </div>
              </section>

            </main>

            {/* RIGHT SIDEBAR (Desktop Only) */}
            <aside className="hidden lg:block">
              <div className="sticky top-[100px] flex flex-col gap-4">
                <div className="bg-white/95 border border-slate-900/10 rounded-[28px] shadow-[0_10px_30px_rgba(15,23,42,0.04)] p-[18px]">
                  <div className="text-[11px] font-extrabold tracking-[.18em] uppercase text-slate-500">
                    Starting from
                  </div>
                  <div className="mt-2 font-['Cormorant_Garamond',_serif] text-[42px] leading-none font-bold text-slate-900">
                    {priceLabel}
                  </div>
                  <div className="mt-2.5 text-sm leading-[1.7] text-slate-600">
                    Secure booking, verified profile, and lightweight navigation for mobile users.
                  </div>

                  <div className="mt-[18px] flex flex-col gap-2.5">
                    <button
                      className="inline-flex w-full items-center justify-center gap-2 border border-slate-900/10 bg-white text-slate-900 rounded-2xl px-[18px] py-[13px] text-sm font-bold transition-all hover:bg-[#f8faff] hover:border-[#5b6cff]/20 hover:-translate-y-[1px]"
                      onClick={() => router.push(`/artist/profile/${artistId}`)}
                    >
                      <ChevronLeft size={14} />
                      Back to profile
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* MOBILE STICKY BOTTOM BAR */}
        <div className="fixed inset-x-0 bottom-0 z-50 bg-white/90 border-t border-slate-900/10 shadow-[0_-10px_40px_rgba(15,23,42,0.08)] p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
          <div className="w-full max-w-[1400px] mx-auto px-1 flex items-center gap-2.5">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-extrabold tracking-[.18em] uppercase text-slate-500">
                Starting from
              </div>
              <div className="mt-1 font-['Cormorant_Garamond',_serif] text-[28px] font-bold leading-none text-slate-900 truncate">
                {priceLabel}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                className="inline-flex items-center justify-center gap-2 border border-slate-900/10 rounded-xl px-4 py-3 text-sm font-bold transition-all bg-white text-slate-900 hover:bg-slate-50"
                onClick={() => router.push(`/artist/profile/${artistId}`)}
                aria-label="Back to profile"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            </div>
          </div>
        </div>

        {/* Space behind fixed mobile bar */}
        <div className="h-24 lg:hidden" />

        <Footer />
      </div>
    </>
  );
}