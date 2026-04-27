"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { createRoleAuthRedirectUrl } from "@/utils/redirectUtils";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";
import PublicBookingCalendar from "@/components/artist/PublicBookingCalendar";
import {
  Calendar,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Facebook,
  FileText,
  Globe,
  Heart,
  Instagram,
  Info,
  Mail,
  MapPin,
  Music,
  Phone,
  Play,
  Share2,
  ShoppingBag,
  Sparkles,
  Star,
  Twitter,
  Users,
  Volume2,
  Youtube,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TechRider {
  soundRequirements?: string;
  lightingRequirements?: string;
  powerRequirements?: string;
  specialNotes?: string;
  file?: {
    url: string;
    fileType: "pdf" | "image";
    uploadedAt: string;
  };
}

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
    photos: Array<{
      url: string;
      caption: string;
      isProfileImage: boolean;
      isCoverImage: boolean;
    }>;
    videos: Array<{
      url: string;
      thumbnail: string;
      caption: string;
      platform: string;
    }>;
  };
  accolades: Array<{
    title: string;
    description: string;
    year: number;
    organization: string;
    certificate?: string;
  }>;
  socialLinks?: {
    instagram?: string;
    youtube?: string;
    spotify?: string;
    facebook?: string;
    twitter?: string;
    website?: string;
  };
  rating?: {
    average: number;
    count: number;
  };
  totalBookings?: number;
  techRider?: TechRider;
}

const SOCIALS: Record<
  string,
  {
    icon: ReactNode;
    color: string;
  }
> = {
  instagram: { icon: <Instagram size={15} />, color: "#E1306C" },
  youtube: { icon: <Youtube size={15} />, color: "#FF0000" },
  facebook: { icon: <Facebook size={15} />, color: "#1877F2" },
  twitter: { icon: <Twitter size={15} />, color: "#1DA1F2" },
  spotify: { icon: <Music size={15} />, color: "#1DB954" },
  website: { icon: <Globe size={15} />, color: "#111827" },
};

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

function getVideoThumbnail(
  url: string,
  platform: string,
  existing?: string,
  profilePic?: string
): string {
  if (existing && !existing.includes("placeholder")) return existing;
  try {
    if (platform === "youtube") {
      const m = url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
      );
      if (m) return `https://img.youtube.com/vi/${m[1]}/maxresdefault.jpg`;
    }
    if (platform === "vimeo") {
      const m = url.match(/vimeo\.com\/(\d+)/);
      if (m) return `https://vumbnail.com/${m[1]}.jpg`;
    }
  } catch {
    // ignore
  }
  return profilePic || "/images/video-placeholder.jpg";
}

function SocialLinks({ artist }: { artist: Artist }) {
  const socials = Object.entries(artist.socialLinks || {}).filter(([, url]) => !!url);
  if (!socials.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {socials.map(([key, url]) => {
        const meta = SOCIALS[key];
        return (
          <a
            key={key}
            href={url as string}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-[14px] bg-white border border-slate-900/10 flex items-center justify-center transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(15,23,42,0.10)]"
            aria-label={key}
            style={{
              color: meta?.color || "#111827",
              backgroundColor: meta ? `${meta.color}12` : undefined,
            }}
          >
            {meta?.icon}
          </a>
        );
      })}
    </div>
  );
}

function ContactBlock({ artist }: { artist: Artist }) {
  return (
    <div className="flex flex-col gap-2.5">
      <a
        href={`tel:${artist.phone}`}
        className="flex items-center gap-3 text-slate-600 bg-white border border-slate-900/10 rounded-[18px] px-4 py-3.5 transition-all hover:-translate-y-[1px] hover:bg-[#f8fbff] hover:border-[#5b6cff]/20"
      >
        <div className="w-10 h-10 shrink-0 rounded-[14px] bg-slate-50 border border-slate-900/10 flex items-center justify-center text-[#5b6cff]">
          <Phone size={15} />
        </div>
        <span className="text-sm font-semibold truncate">{artist.phone}</span>
      </a>

      <a
        href={`mailto:${artist.email}`}
        className="flex items-center gap-3 text-slate-600 bg-white border border-slate-900/10 rounded-[18px] px-4 py-3.5 transition-all hover:-translate-y-[1px] hover:bg-[#f8fbff] hover:border-[#5b6cff]/20"
      >
        <div className="w-10 h-10 shrink-0 rounded-[14px] bg-slate-50 border border-slate-900/10 flex items-center justify-center text-[#5b6cff]">
          <Mail size={15} />
        </div>
        <span className="text-sm font-semibold truncate">{artist.email}</span>
      </a>

      <SocialLinks artist={artist} />
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="p-6 text-slate-500 bg-white border border-dashed border-slate-900/10 rounded-[22px] text-sm leading-[1.7]">
      {children}
    </div>
  );
}

function Section({
  kicker,
  title,
  subtitle,
  children,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-white/90 border border-slate-900/10 rounded-[28px] shadow-[0_10px_30px_rgba(15,23,42,0.04)] overflow-hidden animate-[fadeIn_0.5s_ease_forwards]">
      <div className="p-[18px] md:p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#5b6cff] to-[#7c3aed] ring-[6px] ring-[#5b6cff]/10" />
          <div className="text-[11px] tracking-[.20em] uppercase font-extrabold text-[#5b6cff]">
            {kicker}
          </div>
        </div>
        <h2 className="font-['Cormorant_Garamond',_serif] text-[clamp(24px,3vw,34px)] leading-[1.1] font-bold text-slate-900 tracking-[-0.03em]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-[15px] leading-[1.8] text-slate-500 max-w-[72ch]">
            {subtitle}
          </p>
        )}
        <div className="mt-4">{children}</div>
      </div>
    </section>
  );
}

function GuaranteeItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm leading-[1.6] text-slate-600">
      <div className="w-[22px] h-[22px] shrink-0 mt-[1px] rounded-full bg-green-600/10 text-green-600 flex items-center justify-center">
        <CheckCircle2 size={14} />
      </div>
      <span>{text}</span>
    </div>
  );
}

export default function PublicArtistProfile() {
  const params = useParams();
  const router = useRouter();
  const artistId = params.artistId as string;

  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOrg, setIsOrg] = useState(false);
  const [bioOpen, setBioOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showBook, setShowBook] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchArtist() {
      try {
        setLoading(true);
        const res = await fetch(`/api/artist/public/${artistId}`);
        if (!res.ok) throw new Error("Artist not found");
        const data = await res.json();
        if (mounted) setArtist(data?.data?.artist ?? null);
      } catch {
        if (mounted) setError("Artist not found or unavailable.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchArtist();

    if (typeof window !== "undefined") {
      setIsOrg(!!localStorage.getItem("organizer_token"));
      setSaved(localStorage.getItem(`saved-artist-${artistId}`) === "1");
    }

    return () => {
      mounted = false;
    };
  }, [artistId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (saved) localStorage.setItem(`saved-artist-${artistId}`, "1");
    else localStorage.removeItem(`saved-artist-${artistId}`);
  }, [saved, artistId]);

  const handleShare = useCallback(async () => {
    if (!artist || typeof window === "undefined") return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${artist.name} — AHiBi`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(window.location.href);
      } catch {
        // ignore
      }
    }
  }, [artist]);

  const handleBook = useCallback(() => {
    const bookingPath = `/artist/profile/${artistId}/booking`;
    if (isOrg) {
      router.push(bookingPath);
      return;
    }
    if (typeof window !== "undefined") {
      window.location.href = createRoleAuthRedirectUrl("organizer", bookingPath);
    }
  }, [artistId, isOrg, router]);

  const coverImg = useMemo(
    () =>
      artist?.gallery?.photos?.find((p) => p.isCoverImage)?.url ||
      "/images/carausel1.jpg",
    [artist]
  );

  const profileImg = useMemo(
    () =>
      artist?.gallery?.photos?.find((p) => p.isProfileImage)?.url ||
      artist?.profilePic,
    [artist]
  );

  const galleryPics = useMemo(
    () => artist?.gallery?.photos || [],
    [artist]
  );

  const videos = useMemo(() => artist?.gallery?.videos || [], [artist]);

  const price = Number(artist?.basePrice ?? 0);
  const hasPrice = Number.isFinite(price) && price > 0;
  const priceLabel = hasPrice ? `₹${price.toLocaleString()}` : "On request";
  const bio = artist?.bio || "";
  const longBio = bio.length > 260;
  const artistBook = useMemo(
    () => (artist ? { ...artist, basePrice: hasPrice ? price : 0 } : null),
    [artist, hasPrice, price]
  );

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
                <div className="h-[320px] bg-slate-200 animate-pulse rounded-[28px]" />
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
                <Users size={28} />
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

  return (
    <>
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@500;600;700&display=swap');`}
      </style>
      <Navbar />

      <div className="min-h-screen bg-gradient-to-b from-[#fbfdff] via-[#f7f8fc] to-[#f5f7ff] font-sans antialiased text-slate-900">
        
        {/* HERO SECTION */}
        {/* Strict size limits applied here as requested */}
        <section className="relative overflow-hidden bg-slate-900 min-h-[82vh] max-h-[920px]">
          <img
            src={coverImg}
            alt={artist.name}
            className="absolute inset-0 w-full h-full object-cover object-[center_18%] scale-[1.01] saturate-[1.02] contrast-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/10 via-slate-900/20 to-slate-900/90" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#5b6cff]/20 via-transparent to-[#7c3aed]/20" />
          <div className="absolute w-[560px] h-[560px] rounded-full blur-[72px] bg-[#5b6cff]/20 -top-[140px] -right-[120px] pointer-events-none" />

          <div className="absolute top-0 inset-x-0 z-20 py-4 md:py-6">
            <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
              <div className="flex items-center justify-between gap-3">
                <button
                  className="w-11 h-11 rounded-full border border-white/20 bg-white/10 text-white flex items-center justify-center cursor-pointer backdrop-blur-md transition-all hover:-translate-y-[1px] hover:bg-white/20 hover:border-white/30"
                  onClick={() => router.back()}
                  aria-label="Go back"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex gap-2.5">
                  <button
                    className="w-11 h-11 rounded-full border border-white/20 bg-white/10 text-white flex items-center justify-center cursor-pointer backdrop-blur-md transition-all hover:-translate-y-[1px] hover:bg-white/20 hover:border-white/30"
                    onClick={handleShare}
                    aria-label="Share profile"
                  >
                    <Share2 size={16} />
                  </button>
                  <button
                    className="w-11 h-11 rounded-full border border-white/20 bg-white/10 text-white flex items-center justify-center cursor-pointer backdrop-blur-md transition-all hover:-translate-y-[1px] hover:bg-white/20 hover:border-white/30"
                    onClick={() => setSaved((prev) => !prev)}
                    aria-label={saved ? "Unsave artist" : "Save artist"}
                    style={{
                      background: saved ? "rgba(91,108,255,0.22)" : undefined,
                      borderColor: saved ? "rgba(255,255,255,0.32)" : undefined,
                    }}
                  >
                    <Heart size={16} fill={saved ? "#fff" : "none"} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN CONTAINER */}
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
          
          {/* IDENTITY CARD */}
          <div className="-mt-[34px] md:-mt-[58px] relative z-10 animate-[fadeIn_0.5s_ease_forwards]">
            <div className="bg-white/90 border border-white/90 rounded-[28px] shadow-[0_20px_60px_rgba(15,23,42,0.08)] p-4 md:p-5 backdrop-blur-md">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-[18px] lg:gap-5 items-center">
                
                {/* Left Side: Avatar & Info */}
                <div className="flex gap-4 items-start min-w-0">
                  <div className="relative shrink-0 -mt-[52px] md:-mt-[66px]">
                    <div className="w-24 h-24 md:w-[124px] md:h-[124px] rounded-[28px] overflow-hidden border-[5px] border-white/95 bg-gray-200 shadow-[0_12px_30px_rgba(15,23,42,0.14)]">
                      {profileImg ? (
                        <img
                          src={profileImg}
                          alt={artist.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-indigo-600 text-white text-[42px] font-['Cormorant_Garamond',_serif] font-bold">
                          {artist.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    {artist.rating && artist.rating.average >= 4.5 && (
                      <div className="absolute right-1 bottom-1 w-7 h-7 rounded-full bg-gradient-to-br from-[#5b6cff] to-[#7c3aed] flex items-center justify-center text-white border-[3px] border-white">
                        <Sparkles size={12} />
                      </div>
                    )}
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
                      className="inline-flex items-center justify-center gap-2 border border-[#5b6cff]/10 rounded-2xl px-[18px] py-[13px] cursor-pointer text-sm font-bold leading-none transition-all whitespace-nowrap bg-[#5b6cff]/10 text-[#3346d6] hover:-translate-y-[1px] hover:bg-[#5b6cff]/15"
                      onClick={() => router.push(`/artist/profile/${artistId}/merch`)}
                    >
                      <ShoppingBag size={14} />
                      View merch
                    </button>
                    <button
                      className="inline-flex items-center justify-center gap-2 border-none rounded-2xl px-[18px] py-[13px] cursor-pointer text-sm font-bold leading-none transition-all whitespace-nowrap bg-gradient-to-br from-[#5b6cff] to-[#7c3aed] text-white shadow-[0_12px_26px_rgba(91,108,255,0.25)] hover:shadow-[0_16px_30px_rgba(91,108,255,0.30)] hover:-translate-y-[1px]"
                      onClick={handleBook}
                    >
                      <Calendar size={14} />
                      {isOrg ? "Book this artist" : "Login to book"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN LAYOUT (Left Content, Right Sidebar) */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-[18px] lg:gap-6 mt-[18px] lg:mt-6 pb-[120px] lg:pb-[70px]">
            <main className="flex flex-col gap-[18px]">
              
              {/* ABOUT SECTION */}
              <Section
                kicker="About"
                title="Artist overview"
                subtitle="A cleaner, lighter presentation with mobile-first spacing, readable typography, and stronger visual hierarchy."
              >
                {bio ? (
                  <>
                    <p className="mt-0 text-[15px] leading-[1.8] text-slate-600">
                      {bioOpen || !longBio ? bio : `${bio.slice(0, 260)}…`}
                    </p>
                    {longBio && (
                      <button
                        className="mt-2.5 inline-flex items-center gap-1.5 border-none bg-transparent p-0 text-[#5b6cff] font-bold cursor-pointer"
                        onClick={() => setBioOpen((v) => !v)}
                      >
                        {bioOpen ? "Read less" : "Read more"}
                        <ChevronRight
                          size={15}
                          className="transition-transform"
                          style={{ transform: bioOpen ? "rotate(90deg)" : undefined }}
                        />
                      </button>
                    )}
                  </>
                ) : (
                  <EmptyState>No biography is available for this artist yet.</EmptyState>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-[18px]">
                  <div className="bg-gradient-to-b from-white to-[#f8fbff] border border-slate-900/10 rounded-[20px] p-4">
                    <div className="text-[11px] font-extrabold tracking-[.16em] uppercase text-slate-500">
                      Specialisation
                    </div>
                    <div className="mt-2 font-['Cormorant_Garamond',_serif] text-[26px] leading-[1.1] font-bold text-slate-900">
                      {artist.type}
                    </div>
                  </div>
                  <div className="bg-gradient-to-b from-white to-[#f8fbff] border border-slate-900/10 rounded-[20px] p-4">
                    <div className="text-[11px] font-extrabold tracking-[.16em] uppercase text-slate-500">
                      Base price
                    </div>
                    <div className="mt-2 font-['Cormorant_Garamond',_serif] text-[26px] leading-[1.1] font-bold text-green-600">
                      {priceLabel}
                    </div>
                  </div>
                  <div className="bg-gradient-to-b from-white to-[#f8fbff] border border-slate-900/10 rounded-[20px] p-4">
                    <div className="text-[11px] font-extrabold tracking-[.16em] uppercase text-slate-500">
                      Based in
                    </div>
                    <div className="mt-2 font-['Cormorant_Garamond',_serif] text-[26px] leading-[1.1] font-bold text-slate-900">
                      {artist.city}
                    </div>
                  </div>
                </div>
              </Section>

              {/* GALLERY SECTION */}
              {(galleryPics.length > 0 || videos.length > 0) && (
                <Section
                  kicker="Gallery"
                  title="Photos and performance videos"
                  subtitle="Horizontal media lanes work better on mobile than dense grids, so the layout stays smooth and swipe-friendly."
                >
                  {galleryPics.length > 0 && (
                    <div className="flex gap-3 overflow-x-auto pb-2 snap-x touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {galleryPics.map((photo, index) => (
                        <button
                          key={`${photo.url}-${index}`}
                          className="shrink-0 w-[186px] h-[232px] sm:w-[208px] sm:h-[246px] rounded-[20px] overflow-hidden relative bg-gray-200 border border-slate-900/10 cursor-pointer snap-start group"
                          onClick={() => setLightbox(photo.url)}
                        >
                          <img
                            src={photo.url}
                            alt={photo.caption || `Photo ${index + 1}`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/40 flex items-end justify-between p-3">
                            <div className="text-white text-xs font-bold drop-shadow-md">
                              {photo.caption || `Photo ${index + 1}`}
                            </div>
                            <div className="w-[34px] h-[34px] rounded-full bg-white/95 text-slate-900 flex items-center justify-center">
                              <ExternalLink size={16} />
                            </div>
                          </div>
                          {photo.isProfileImage && (
                            <div className="absolute top-2 left-2 bg-amber-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-sm">
                              <Star size={12} /> Profile
                            </div>
                          )}
                          {photo.isCoverImage && (
                            <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-sm">
                              <Camera size={12} /> Cover
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {galleryPics.length > 0 && videos.length > 0 && (
                    <div className="h-px bg-slate-900/10 my-[18px]" />
                  )}

                  {videos.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {videos.map((video, index) => (
                        <a
                          key={`${video.url}-${index}`}
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative aspect-video rounded-[22px] overflow-hidden border border-slate-900/10 bg-slate-900 group block"
                        >
                          <img
                            src={getVideoThumbnail(
                              video.url,
                              video.platform || "other",
                              video.thumbnail,
                              profileImg
                            )}
                            alt={video.caption || `Video ${index + 1}`}
                            className="w-full h-full object-cover opacity-75 transition-all duration-500 group-hover:scale-105 group-hover:opacity-60"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-[58px] h-[58px] rounded-full bg-white/95 text-slate-900 flex items-center justify-center shadow-[0_14px_32px_rgba(0,0,0,0.22)]">
                              <Play size={20} fill="#111827" />
                            </div>
                          </div>
                          {video.caption && (
                            <div className="absolute inset-x-0 bottom-0 p-4 pt-8 bg-gradient-to-t from-slate-900/90 to-transparent text-white/95 text-[13px] font-semibold">
                              {video.caption}
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                </Section>
              )}

              {/* TECH RIDER SECTION */}
              {artist.techRider && (
                <Section
                  kicker="Tech rider"
                  title="Stage and event requirements"
                  subtitle="This section is organized for fast scanning on smaller screens with simple cards and readable blocks."
                >
                  {artist.techRider.soundRequirements ||
                  artist.techRider.lightingRequirements ||
                  artist.techRider.powerRequirements ||
                  artist.techRider.specialNotes ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {artist.techRider.soundRequirements && (
                        <div className="bg-white border border-slate-900/10 rounded-[22px] p-[18px]">
                          <div className="flex items-center gap-2 text-slate-500 uppercase tracking-[.16em] text-[11px] font-extrabold">
                            <Volume2 size={12} /> Sound
                          </div>
                          <div className="mt-2.5 text-slate-600 text-sm leading-[1.8]">
                            {artist.techRider.soundRequirements}
                          </div>
                        </div>
                      )}
                      {artist.techRider.lightingRequirements && (
                        <div className="bg-white border border-slate-900/10 rounded-[22px] p-[18px]">
                          <div className="flex items-center gap-2 text-slate-500 uppercase tracking-[.16em] text-[11px] font-extrabold">
                            <Sparkles size={12} /> Lighting
                          </div>
                          <div className="mt-2.5 text-slate-600 text-sm leading-[1.8]">
                            {artist.techRider.lightingRequirements}
                          </div>
                        </div>
                      )}
                      {artist.techRider.powerRequirements && (
                        <div className="bg-white border border-slate-900/10 rounded-[22px] p-[18px]">
                          <div className="flex items-center gap-2 text-slate-500 uppercase tracking-[.16em] text-[11px] font-extrabold">
                            <Zap size={12} /> Power
                          </div>
                          <div className="mt-2.5 text-slate-600 text-sm leading-[1.8]">
                            {artist.techRider.powerRequirements}
                          </div>
                        </div>
                      )}
                      {artist.techRider.specialNotes && (
                        <div className="bg-white border border-slate-900/10 rounded-[22px] p-[18px] md:col-span-2">
                          <div className="flex items-center gap-2 text-slate-500 uppercase tracking-[.16em] text-[11px] font-extrabold">
                            <Info size={12} /> Special notes
                          </div>
                          <div className="mt-2.5 text-slate-600 text-sm leading-[1.8]">
                            {artist.techRider.specialNotes}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptyState>No technical details were added to this profile.</EmptyState>
                  )}

                  {artist.techRider.file?.url && (
                    <div className="mt-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-gradient-to-b from-white to-[#f8fbff] border border-slate-900/10 rounded-[22px]">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 shrink-0 rounded-2xl bg-[#5b6cff]/10 text-[#5b6cff] flex items-center justify-center">
                          <FileText size={20} />
                        </div>
                        <div>
                          <div className="text-[15px] font-extrabold text-slate-900">
                            Tech rider / EPK document
                          </div>
                          <div className="mt-0.5 text-[13px] text-slate-500">
                            {artist.techRider.file.fileType === "pdf" ? "PDF document" : "Image file"}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2.5 justify-end">
                        <a
                          href={artist.techRider.file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 border border-slate-900/10 bg-white text-slate-900 rounded-2xl px-[18px] py-[13px] text-sm font-bold transition-all hover:bg-[#f8faff] hover:border-[#5b6cff]/20 hover:-translate-y-[1px]"
                        >
                          <ExternalLink size={14} />
                          View
                        </a>
                        <a
                          href={artist.techRider.file.url}
                          download="Tech-Rider-EPK"
                          className="inline-flex items-center justify-center gap-2 border-none bg-gradient-to-br from-[#5b6cff] to-[#7c3aed] text-white rounded-2xl px-[18px] py-[13px] text-sm font-bold shadow-[0_12px_26px_rgba(91,108,255,0.25)] hover:shadow-[0_16px_30px_rgba(91,108,255,0.30)] transition-all hover:-translate-y-[1px]"
                        >
                          <Download size={14} />
                          Download
                        </a>
                      </div>
                    </div>
                  )}
                </Section>
              )}

              {/* AWARDS SECTION */}
              {artist.accolades?.length > 0 && (
                <Section
                  kicker="Awards"
                  title="Recognition and achievements"
                  subtitle="A vertical timeline format keeps this readable and elegant on both desktop and mobile."
                >
                  <div className="flex flex-col">
                    {artist.accolades.map((award, index) => (
                      <div
                        className="grid grid-cols-[64px_1fr] gap-3.5 py-[18px] border-t border-slate-900/10 first:border-none first:pt-0"
                        key={`${award.title}-${index}`}
                      >
                        <div className="pt-1 font-sans text-[13px] font-extrabold tracking-[.12em] uppercase text-[#5b6cff]">
                          {award.year}
                        </div>
                        <div>
                          <div className="font-['Cormorant_Garamond',_serif] text-[28px] leading-[1.1] font-bold tracking-[-0.03em] text-slate-900">
                            {award.title}
                          </div>
                          <div className="mt-1.5 text-[11px] font-extrabold tracking-[.18em] uppercase text-slate-500">
                            {award.organization}
                          </div>
                          {award.description && (
                            <div className="mt-2 text-sm leading-[1.8] text-slate-600">
                              {award.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* CONTACT SECTION */}
              <Section
                kicker="Contact"
                title="Get in touch"
                subtitle="Quick contact options remain visible here and in the desktop sidebar for easy access."
              >
                <ContactBlock artist={artist} />
              </Section>
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
                      className="inline-flex items-center justify-center gap-2 border-none bg-gradient-to-br from-[#5b6cff] to-[#7c3aed] text-white rounded-2xl px-[18px] py-[13px] text-sm font-bold shadow-[0_12px_26px_rgba(91,108,255,0.25)] hover:shadow-[0_16px_30px_rgba(91,108,255,0.30)] transition-all hover:-translate-y-[1px]"
                      onClick={handleBook}
                    >
                      <Calendar size={14} />
                      {isOrg ? "Book artist" : "Login to book"}
                    </button>
                    <button
                      className="inline-flex items-center justify-center gap-2 border border-[#5b6cff]/10 rounded-2xl px-[18px] py-[13px] cursor-pointer text-sm font-bold leading-none transition-all whitespace-nowrap bg-[#5b6cff]/10 text-[#3346d6] hover:-translate-y-[1px] hover:bg-[#5b6cff]/15"
                      onClick={() => router.push(`/artist/profile/${artistId}/merch`)}
                    >
                      <ShoppingBag size={14} />
                      Explore merch
                    </button>
                  </div>

                  <div className="mt-[18px] flex flex-col gap-2.5">
                    <GuaranteeItem text="Free cancellation within 24 hours" />
                    <GuaranteeItem text="Secure booking process" />
                    <GuaranteeItem text="Verified artist profile" />
                  </div>
                </div>

                <div className="bg-white/95 border border-slate-900/10 rounded-[28px] shadow-[0_10px_30px_rgba(15,23,42,0.04)] p-[18px]">
                  <div className="text-[11px] font-extrabold tracking-[.18em] uppercase text-slate-500 mb-3">
                    Contact
                  </div>
                  <ContactBlock artist={artist} />
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
                className="inline-flex items-center justify-center gap-2 border border-[#5b6cff]/10 rounded-xl px-3.5 py-3 text-sm font-bold transition-all bg-[#5b6cff]/10 text-[#3346d6] hover:bg-[#5b6cff]/15"
                onClick={() => router.push(`/artist/profile/${artistId}/merch`)}
                aria-label="View merch"
              >
                <ShoppingBag size={14} />
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 border-none rounded-xl px-3.5 py-3 text-sm font-bold transition-all bg-gradient-to-br from-[#5b6cff] to-[#7c3aed] text-white shadow-[0_12px_26px_rgba(91,108,255,0.25)]"
                onClick={handleBook}
              >
                <Calendar size={14} />
                {isOrg ? "Book" : "Login"}
              </button>
            </div>
          </div>
        </div>

        {/* Space behind fixed mobile bar */}
        <div className="h-24 lg:hidden" />

        <Footer />

        {/* BOOKING MODAL */}
        <Dialog open={showBook} onOpenChange={setShowBook}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-4 md:p-6">
            <DialogHeader>
              <DialogTitle className="font-['Cormorant_Garamond',_serif] text-[30px] font-bold tracking-[-0.03em]">
                Book {artist.name}
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-sm leading-[1.7]">
                Choose a date and time to request this artist for your event.
              </DialogDescription>
            </DialogHeader>

            {artistBook && (
              <PublicBookingCalendar artistId={artist._id} artist={artistBook} />
            )}
          </DialogContent>
        </Dialog>

        {/* LIGHTBOX MODAL */}
        <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
          <DialogContent className="max-w-6xl border-0 bg-slate-950/95 p-3 md:p-4 rounded-[20px]">
            {lightbox && (
              <img
                src={lightbox}
                alt="Gallery preview"
                className="w-full max-h-[82vh] object-contain rounded-2xl"
              />
            )}
          </DialogContent>
        </Dialog>

      </div>
    </>
  );
}