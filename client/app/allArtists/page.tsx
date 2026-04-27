"use client";

import React, { useEffect, useMemo, useState } from "react";
import Footer from "../Footer";
import Navbar from "../Navbar";
import { toast } from "sonner";
import { Wallet } from "lucide-react";

const FONT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@500;600;700&display=swap');

@keyframes ticker {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

@keyframes floaty {
  0%,100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}
`;

const FontLoader = () => <style dangerouslySetInnerHTML={{ __html: FONT_CSS }} />;

/* ───────────────────────── Icons ───────────────────────── */

const IconArrow = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const IconStar = ({ filled }: { filled: boolean }) => (
  <svg
    width="14"
    height="14"
    fill={filled ? "#f59e0b" : "none"}
    stroke={filled ? "#f59e0b" : "#cbd5e1"}
    strokeWidth="1.7"
    viewBox="0 0 24 24"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IconCheck = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconPlus = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const IconMic = () => (
  <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const IconMusic = () => (
  <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const IconUsers = () => (
  <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconSparkle = () => (
  <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IconCamera = () => (
  <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const IconTrophy = () => (
  <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <polyline points="8 21 12 17 16 21" />
    <line x1="12" y1="17" x2="12" y2="11" />
    <path d="M18 2H6l1.5 9A5 5 0 0 0 12 16a5 5 0 0 0 4.5-5L18 2z" />
    <path d="M2 7h4" />
    <path d="M18 7h4" />
  </svg>
);

const IconTrend = () => (
  <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const IconDollar = () => (
  <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const IconShield = () => (
  <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconChart = () => (
  <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

/* ───────────────────────── Data ───────────────────────── */

const FEATURED_ARTISTS = [
  {
    id: 1,
    name: "Asha Sharma",
    category: "Singer",
    rating: 4.9,
    bookings: 156,
    price: "₹25,000",
    verified: true,
    image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 2,
    name: "DJ Rohan",
    category: "DJ",
    rating: 4.8,
    bookings: 234,
    price: "₹35,000",
    verified: true,
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 3,
    name: "Maya Kumar",
    category: "Dancer",
    rating: 4.7,
    bookings: 189,
    price: "₹18,000",
    verified: false,
    image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 4,
    name: "Ravi Mehta",
    category: "Comedian",
    rating: 4.6,
    bookings: 98,
    price: "₹20,000",
    verified: true,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 5,
    name: "Priya Nair",
    category: "Singer",
    rating: 4.9,
    bookings: 312,
    price: "₹45,000",
    verified: true,
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 6,
    name: "Arjun Band",
    category: "Band",
    rating: 4.7,
    bookings: 145,
    price: "₹80,000",
    verified: true,
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 7,
    name: "Zara Kapoor",
    category: "Anchor/MC",
    rating: 4.8,
    bookings: 201,
    price: "₹22,000",
    verified: false,
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 8,
    name: "Kiran Desai",
    category: "Magician",
    rating: 4.5,
    bookings: 67,
    price: "₹30,000",
    verified: true,
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
  },
];

const CATEGORIES = ["All", "Singer", "DJ", "Band", "Dancer", "Comedian", "Magician", "Anchor/MC"];

const WHY_JOIN = [
  {
    icon: IconTrend,
    title: "Grow Your Career",
    desc: "Reach event organizers across the country and get discovered by the right audience.",
    stat: "10,000+ monthly bookings",
    num: "01",
  },
  {
    icon: IconDollar,
    title: "Earn More Money",
    desc: "Set your own rates, offer custom packages, and keep control over your earnings.",
    stat: "₹50,000 avg. monthly",
    num: "02",
  },
  {
    icon: IconShield,
    title: "Secure & Safe",
    desc: "Protected bookings, verified requests, and smoother payment handling.",
    stat: "100% payment guarantee",
    num: "03",
  },
  {
    icon: IconChart,
    title: "Manage Your Brand",
    desc: "Show your portfolio, calendar, ratings, and performance stats in one place.",
    stat: "Complete toolkit",
    num: "04",
  },
];

const HOW_TO_JOIN = [
  {
    step: "01",
    title: "Create Your Profile",
    desc: "Sign up and add your artist details in minutes.",
    duration: "3 min",
    icon: IconUsers,
  },
  {
    step: "02",
    title: "Build Your Portfolio",
    desc: "Upload photos, videos, rates, and performance samples.",
    duration: "20 min",
    icon: IconCamera,
  },
  {
    step: "03",
    title: "Get Verified",
    desc: "Once approved, your profile appears in search and booking feeds.",
    duration: "24–48 hrs",
    icon: IconTrophy,
  },
  {
    step: "04",
    title: "Start Performing",
    desc: "Receive requests, manage your schedule, and get booked.",
    duration: "Ongoing",
    icon: IconSparkle,
  },
];

const CATS = [
  { icon: IconMic, title: "DJ", count: "500+" },
  { icon: IconMusic, title: "Singer", count: "400+" },
  { icon: IconUsers, title: "Band", count: "300+" },
  { icon: IconSparkle, title: "Dancer", count: "350+" },
  { icon: IconCamera, title: "Anchor/MC", count: "250+" },
  { icon: IconTrophy, title: "Comedian", count: "150+" },
  { icon: IconChart, title: "Magician", count: "100+" },
  { icon: IconTrend, title: "Celebrity", count: "80+" },
];

const BENEFITS = [
  "Free to create profile",
  "Instant booking notifications",
  "Secure payment processing",
  "Calendar & schedule management",
  "Portfolio & media showcase",
  "Direct client communication",
  "Review & rating system",
  "Marketing & promotion",
  "24/7 support assistance",
  "Analytics dashboard",
];

const FAQS = [
  {
    q: "Who can join as an artist on Ahibi?",
    a: "Any performing artist can join: singers, musicians, DJs, dancers, bands, comedians, magicians, anchors/MCs, and more.",
  },
  {
    q: "How much does it cost to join?",
    a: "Creating your profile is free. A small commission applies only after a successful booking.",
  },
  {
    q: "How do I get paid?",
    a: "Payments are processed securely and transferred after booking completion as per your payout timeline.",
  },
  {
    q: "Can I set my own pricing?",
    a: "Yes. You can set different prices for events, durations, packages, and custom quotes.",
  },
  {
    q: "How does the booking process work?",
    a: "Organizers search artists, open profiles, and send booking requests. You can accept or decline directly.",
  },
  {
    q: "What if I need to cancel a booking?",
    a: "You can manage cancellations from your dashboard based on the platform policy and timing.",
  },
];

const TICKER_ITEMS = [
  "Join Free",
  "10,000+ Artists",
  "Secure Payments",
  "Set Your Rates",
  "Verified Profiles",
  "24/7 Support",
  "Nationwide Bookings",
  "Free to Join",
];

/* ───────────────────────── UI Bits ───────────────────────── */

function SectionHeading({
  number,
  label,
  title,
  highlight,
  desc,
}: {
  number: string;
  label: string;
  title: string;
  highlight?: string;
  desc?: string;
}) {
  return (
    <div className="max-w-3xl fade-up-1">
      <div className="mb-4 inline-flex items-center gap-2.5">
        <span className="font-[Inter] text-[11px] font-extrabold tracking-[.20em] text-[#5b6cff]">{number}</span>
        <span className="text-[11px] font-extrabold uppercase tracking-[.18em] text-[#6b7280]">{label}</span>
      </div>
      <h2 className="font-['Cormorant_Garamond',_serif] text-[clamp(32px,4vw,52px)] font-bold leading-[1.04] tracking-[-0.03em] text-[#111827]">
        {title}{" "}
        {highlight ? <em className="italic font-medium opacity-90 text-[#5b6cff]">{highlight}</em> : null}
      </h2>
      {desc ? <p className="mt-4 max-w-2xl text-[15px] leading-[1.8] text-[#4b5563]">{desc}</p> : null}
    </div>
  );
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-gradient-to-b from-[#ffffff] to-[#f8fbff] px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div className="font-['Cormorant_Garamond',_serif] text-[32px] font-bold leading-none text-[#111827]">{value}</div>
      <div className="mt-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-[#6b7280]">{label}</div>
    </div>
  );
}

function ArtistCard({
  artist,
  onShare,
}: {
  artist: any;
  onShare: (artist: any) => void;
}) {
  const name = artist?.name || "Artist";
  const category = artist?.type || artist?.category || "Artist";
  const rating = artist?.rating?.average ?? artist?.rating ?? "-";
  const bookings = artist?.totalBookings ?? artist?.bookings ?? 0;
  const basePrice = Number.isFinite(artist?.basePrice) && artist.basePrice > 0 ? artist.basePrice : null;
  const priceLbl = basePrice ? `₹${basePrice.toLocaleString()}` : artist?.price || "Custom";
  const image =
    artist?.image ||
    artist?.gallery?.photos?.find?.((p: any) => p?.isProfileImage)?.url ||
    artist?.gallery?.photos?.[0]?.url ||
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=900&q=80";

  const id = artist?._id || artist?.id || "";

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
      <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
        <img
          src={image}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />

        <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-lg bg-black/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md">
              {category}
            </span>
            {artist?.verified ? (
              <span className="rounded-lg bg-gradient-to-r from-[#5b6cff] to-[#7c3aed] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white shadow-md">
                Verified
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShare(artist);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-sm transition-all hover:scale-110 hover:bg-white"
            aria-label="Share artist"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
              <path d="M16 6l-4-4-4 4" />
              <path d="M12 2v13" />
            </svg>
          </button>
        </div>

        <div className="absolute bottom-4 left-4 rounded-lg bg-white/95 px-2.5 py-1 text-sm font-bold text-slate-900 shadow-sm">
          <span className="inline-flex items-center gap-1 text-[#f59e0b]">
            <IconStar filled /> {rating}
          </span>
        </div>
      </div>

      <div className="flex flex-grow flex-col p-5">
        <div className="font-['Cormorant_Garamond',_serif] text-2xl font-bold leading-tight text-slate-900">{name}</div>

        <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-4 font-semibold text-slate-900">
          <Wallet size={16} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-500">Starts at</span>
          <span className="text-xl text-indigo-600">{priceLbl}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 pb-5">
        <button
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm font-semibold text-slate-900 transition-all hover:border-slate-400 hover:bg-slate-50"
          onClick={() => (window.location.href = `/artist/profile/${id}`)}
        >
          View Profile
        </button>
        <button
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-600"
          onClick={() => (window.location.href = `/artist/profile/${id}?book=true`)}
        >
          Book Now
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── Landing ───────────────────────── */

function LandingPage({ onViewList }: { onViewList: () => void }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchTopArtists = async () => {
      try {
        const params = new URLSearchParams();
        params.append("sortBy", "rating.average");
        params.append("limit", "8");
        const res = await fetch(`/api/artist/public?${params.toString()}`);
        const data = await res.json();
        if (data?.success && Array.isArray(data?.data?.artists)) {
          setTopArtists(data.data.artists);
          return;
        }
      } catch {
        // fallback below
      }
      setTopArtists([]);
    };

    fetchTopArtists();
  }, []);

  const artistsSource = (topArtists?.length ? topArtists : FEATURED_ARTISTS) as any[];

  const filteredArtists = useMemo(() => {
    const q = search.trim().toLowerCase();

    return artistsSource.filter((artist) => {
      const name = String(artist?.name || "").toLowerCase();
      const category = String(artist?.type || artist?.category || "").toLowerCase();

      const matchesCategory =
        activeCategory === "All" ||
        category === activeCategory.toLowerCase() ||
        String(artist?.type || artist?.category || "") === activeCategory;

      const matchesSearch = !q || name.includes(q) || category.includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [artistsSource, activeCategory, search]);

  const shareArtist = async (artist: { _id?: string; id?: string | number; name?: string }) => {
    const id = artist?._id || artist?.id;
    if (!id) return;

    const url = `${window.location.origin}/artist/profile/${id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: artist?.name || "Artist",
          text: `Check out ${artist?.name || "this artist"} on Ahibi`,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't share");
    }
  };

  return (
    <div className="bg-[#f7f8fc] text-[#111827] font-[Inter]">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(91,108,255,0.10),transparent_30%),radial-gradient(circle_at_top_right,rgba(124,58,237,0.08),transparent_26%),linear-gradient(180deg,#fbfdff_0%,#f7f8fc_42%,#f5f7ff_100%)]" />

        <div className="relative mx-auto grid w-full max-w-[1280px] items-center gap-12 px-4 py-10 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:py-6">
          <div>
            <h1 className="max-w-3xl font-['Cormorant_Garamond',_serif] text-[clamp(42px,6.5vw,86px)] font-bold leading-[0.92] tracking-[-0.03em] text-[#111827]">
              Discover
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5b6cff] to-[#7c3aed]">Book</span>
              <br />
              Celebrate
            </h1>

            <p className="mt-6 max-w-2xl text-[15px] leading-[1.8] text-[#4b5563] sm:text-[18px]">
              A premium artist marketplace inspired by the best event discovery experiences.
              Find singers, DJs, bands, dancers, anchors, and more in one clean, fast interface.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {["Wedding", "College fest", "Corporate", "Birthday", "Concert", "Club night"].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[rgba(15,23,42,0.08)] bg-white/80 backdrop-blur-md px-5 py-2.5 text-[12px] font-semibold text-[#4b5563] shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[#5b6cff]/30 hover:text-[#5b6cff]"
                >
                  {item}
                </span>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                className="inline-flex items-center gap-2 rounded-[16px] bg-gradient-to-br from-[#5b6cff] to-[#7c3aed] px-8 py-3.5 text-sm font-bold text-white shadow-[0_12px_26px_rgba(91,108,255,0.25)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(91,108,255,0.30)]"
                onClick={() => (window.location.href = "/allArtists/list")}
              >
                Explore Artists <IconArrow />
              </button>

              <button
                className="inline-flex items-center gap-2 rounded-[16px] border border-[rgba(15,23,42,0.12)] bg-white px-8 py-3.5 text-sm font-bold text-[#111827] shadow-[0_10px_20px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-1 hover:border-[#5b6cff]/20 hover:bg-[#f8faff] hover:text-[#5b6cff]"
                onClick={() => (window.location.href = "/artist/auth/login")}
              >
                List Your Profile
              </button>
            </div>
          </div>

          <div className="relative w-full max-w-4xl mx-auto">
            {/* Background Blur Accents */}
            <div className="absolute -right-4 -top-4 h-32 w-32 sm:h-48 sm:w-48 rounded-full bg-[#5b6cff]/15 blur-3xl" />
            <div className="absolute -left-6 bottom-10 h-32 w-32 sm:h-48 sm:w-48 rounded-full bg-[#7c3aed]/15 blur-3xl" />

            {/* Main Wrapper */}
            <div className="relative overflow-hidden rounded-[24px] sm:rounded-[34px] border border-white bg-white/60 p-3 sm:p-4 backdrop-blur-xl shadow-[0_25px_60px_rgba(15,23,42,0.08)]">
              <div className="grid gap-4 md:grid-cols-2">

                {/* TOP CARD - PRIYA NAIR */}
                <div className="md:col-span-2 overflow-hidden rounded-[20px] sm:rounded-[28px] bg-[#0f172a] p-5 sm:p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.2)] transition hover:shadow-[0_25px_70px_rgba(0,0,0,0.3)]">

                  {/* TOP BADGES */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[.18em] text-white/80 backdrop-blur-md">
                      Featured pick
                    </span>
                    <span className="rounded-full bg-gradient-to-r from-[#5b6cff] to-[#7c3aed] px-3 py-1.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[.18em] text-white shadow-md">
                      Trending now
                    </span>
                  </div>

                  {/* MAIN CONTENT */}
                  <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row items-start justify-between gap-5 sm:gap-6">

                    {/* LEFT: INFO */}
                    <div className="w-full sm:w-auto">
                      <div className="font-['Cormorant_Garamond',_serif] text-2xl sm:text-3xl font-bold leading-tight">
                        Priya Nair
                      </div>
                      <div className="mt-1 text-xs sm:text-sm text-white/60">
                        Singer • Mumbai
                      </div>

                      {/* STATS */}
                      <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2 sm:gap-4 text-[12px] sm:text-[13px] text-white/80">
                        <span className="inline-flex items-center gap-1 font-semibold text-[#f59e0b]">
                          {/* Assuming you have an IconStar component */}
                          <IconStar filled /> 4.9
                        </span>
                        <span>312 bookings</span>
                        <span className="hidden sm:inline text-white/30">•</span>
                        <span className="text-[#16a34a] font-semibold">Verified</span>
                      </div>
                    </div>

                    {/* RIGHT CTA BUTTONS */}
                    <div className="mt-2 flex w-full flex-row sm:mt-0 sm:w-auto sm:flex-col items-center sm:items-end gap-3">
                      <button className="w-full sm:w-auto flex-1 rounded-2xl bg-white px-4 sm:px-5 py-2.5 text-xs font-bold text-[#111827] transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(255,255,255,0.15)]">
                        Book now
                      </button>
                      <button className="w-full sm:w-auto flex-1 rounded-2xl border border-white/15 bg-transparent px-4 sm:px-5 py-2.5 text-xs font-bold text-white transition hover:bg-white/10">
                        View profile
                      </button>
                    </div>
                  </div>
                </div>

                {/* BOTTOM CARD 1 - DJ */}
                <div className="overflow-hidden rounded-[20px] sm:rounded-[26px] border border-white bg-gradient-to-b from-[#ffffff] to-[#f8fbff] p-3 sm:p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <img
                    src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80"
                    alt="DJ"
                    className="h-40 sm:h-52 w-full rounded-[16px] sm:rounded-[20px] object-cover"
                  />
                  <div className="mt-3 sm:mt-4 text-center sm:text-left">
                    <div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[.18em] text-[#5b6cff]">
                      DJ
                    </div>
                    <div className="mt-1 text-sm sm:text-base font-bold text-[#111827]">
                      Book instantly
                    </div>
                  </div>
                </div>

                {/* BOTTOM CARD 2 - LIVE PERFORMANCE */}
                <div className="overflow-hidden rounded-[20px] sm:rounded-[26px] border border-white bg-gradient-to-b from-[#ffffff] to-[#f8fbff] p-3 sm:p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <img
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80"
                    alt="Artist"
                    className="h-40 sm:h-52 w-full rounded-[16px] sm:rounded-[20px] object-cover"
                  />
                  <div className="mt-3 sm:mt-4 text-center sm:text-left">
                    <div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[.18em] text-[#7c3aed]">
                      Live performance
                    </div>
                    <div className="mt-1 text-sm sm:text-base font-bold text-[#111827]">
                      For premium events
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM FEATURE TAGS */}
              <div className="mt-4 grid grid-cols-1 gap-2 min-[450px]:grid-cols-3 sm:gap-3">
                {["Fast booking", "Verified artists", "Secure payouts"].map((item) => (
                  <div
                    key={item}
                    className="rounded-[14px] sm:rounded-[18px] border border-white/60 bg-white/40 px-3 py-2.5 sm:py-3 text-center backdrop-blur-sm text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[.14em] text-[#4b5563]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ticker */}
      <div className="overflow-hidden border-y border-[rgba(15,23,42,0.08)] bg-white/80 py-3 backdrop-blur-md">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <div className="whitespace-nowrap">
            <div className="flex w-max animate-[ticker_28s_linear_infinite]">
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-3 px-8 py-1 text-[11px] font-extrabold uppercase tracking-[.18em] text-[#6b7280]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#5b6cff]" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trending Artists */}
      <section className="py-18 sm:py-24">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              number="01"
              label="Top picks"
              title="Trending artists"
              highlight="this week"
              desc="Browse the most booked artists with a clean card layout, quick preview, and instant action buttons."
            />

            <button
              className="inline-flex items-center gap-2 self-start rounded-[16px] border border-[rgba(15,23,42,0.12)] bg-white px-5 py-3 text-sm font-bold text-[#111827] transition hover:border-[#5b6cff]/20 hover:bg-[#f8faff] hover:text-[#5b6cff]"
              onClick={onViewList}
            >
              View all artists <IconArrow />
            </button>
          </div>

          <div className="mt-8 flex gap-2 sm:flex-wrap overflow-x-auto pb-2 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 sm:px-5 sm:py-2.5 text-sm font-medium transition-all duration-200 active:scale-95 ${activeCategory === cat
                    ? "bg-gradient-to-br from-[#eef2ff] to-[#e0e7ff] text-[#3346d6] border border-[#5b6cff]/30 shadow-md ring-1 ring-[#5b6cff]/10"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="mt-8 grid  gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
            {filteredArtists.slice(0, 3).map((artist) => (
              <ArtistCard key={artist?._id || artist?.id || artist?.name} artist={artist} onShare={shareArtist} />
            ))}

            {/* Explore All Artists Card */}
            <div className="group overflow-hidden rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-gradient-to-br from-[#5b6cff] to-[#7c3aed] shadow-[0_12px_30px_rgba(91,108,255,0.20)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(91,108,255,0.30)]">
              <div className="relative aspect-[3/4] overflow-hidden flex flex-col items-center justify-center text-white p-4">
                <div className="mb-4 rounded-full bg-white/20 p-3 backdrop-blur-md">
                  <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>

                <div className="font-['Cormorant_Garamond',_serif] text-[28px] font-bold leading-[1.1] text-center text-white mb-2">
                  Explore All
                  <br />
                  Artists
                </div>

                <div className="text-sm font-medium text-white/80 text-center mb-6">
                  Discover {filteredArtists.length}+ artists
                </div>

                <button
                  onClick={onViewList}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-xs font-bold text-[#5b6cff] shadow-lg transition hover:scale-105"
                >
                  Browse All <IconArrow />
                </button>
              </div>

              <div className="border-t border-white/20 p-4 bg-white/10 backdrop-blur-md">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[9px] font-extrabold uppercase tracking-[.18em] text-white/80">All categories</div>
                    <div className="mt-1 font-['Cormorant_Garamond',_serif] text-base font-bold text-white">
                      {filteredArtists.length}+ Artists
                    </div>
                  </div>
                  <div className="rounded-full bg-white/20 px-3 py-1 text-[9px] font-extrabold uppercase tracking-[.14em] text-white">
                    View all
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why join */}
      <section className="border-y border-[rgba(15,23,42,0.08)] bg-white py-18 sm:py-24">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <SectionHeading
            number="02"
            label="For artists"
            title="Why artists choose"
            highlight="Ahibi"
            desc="A strong creator-first platform with booking, branding, payouts, and visibility built in."
          />

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {WHY_JOIN.map((w) => (
              <div
                key={w.num}
                className="group relative overflow-hidden rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-[#fbfcff] p-8 shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#5b6cff]/20 hover:shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
              >
                <div className="mb-6 flex items-center justify-between">
                  <span className="font-[Inter] text-[11px] font-extrabold tracking-[.18em] text-[#7c3aed]">{w.num}</span>
                  <div className="text-[#5b6cff] bg-[rgba(91,108,255,0.1)] rounded-[18px] p-2.5 [&>svg]:h-7 [&>svg]:w-7 transition group-hover:scale-110 group-hover:bg-[#5b6cff] group-hover:text-white">
                    {React.createElement(w.icon)}
                  </div>
                </div>
                <div className="font-['Cormorant_Garamond',_serif] text-[26px] font-bold leading-tight text-[#111827]">{w.title}</div>
                <p className="mt-3 text-[14px] leading-[1.8] text-[#4b5563]">{w.desc}</p>
                <div className="mt-6 text-[11px] font-extrabold uppercase tracking-[.18em] text-[#5b6cff]">{w.stat}</div>
                <div className="absolute bottom-0 left-0 h-1 w-full origin-left scale-x-0 bg-gradient-to-r from-[#5b6cff] to-[#7c3aed] transition duration-300 group-hover:scale-x-100" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 sm:py-24 bg-[#f7f8fc]">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">

          <SectionHeading
            number="03"
            label="Onboarding"
            title="How to join"
            highlight="in 4 steps"
            desc="A short, clear flow that makes the artist sign-up journey feel easy and premium."
          />

          <div className="relative mt-16">

            {/* vertical line */}
            <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-[rgba(15,23,42,0.10)] md:block" />

            <div className="space-y-14">
              {HOW_TO_JOIN.map((s, idx) => {
                const isLeft = idx % 2 === 0;

                return (
                  <div
                    key={s.step}
                    className={`relative flex flex-col md:flex-row items-center ${isLeft ? "md:justify-start" : "md:justify-end"
                      }`}
                  >

                    {/* content card */}
                    <div
                      className={`group relative w-full md:w-[46%] rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-white p-7 shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#5b6cff]/20 hover:shadow-[0_20px_60px_rgba(15,23,42,0.08)] ${isLeft ? "md:mr-auto" : "md:ml-auto"
                        }`}
                    >
                      {/* step number badge */}
                      <div className="absolute -top-6 left-6 flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#5b6cff] to-[#7c3aed] text-white shadow-[0_10px_20px_rgba(91,108,255,0.3)]">
                        <span className="font-['Cormorant_Garamond',_serif] text-2xl font-bold">
                          {s.step}
                        </span>
                      </div>

                      <div className="mt-6">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(15,23,42,0.06)] bg-[#f8faff] px-4 py-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#3346d6]">
                          <span className="[&>svg]:h-4 [&>svg]:w-4">
                            {React.createElement(s.icon)}
                          </span>
                          {s.duration}
                        </div>

                        <div className="font-['Cormorant_Garamond',_serif] text-[28px] font-bold text-[#111827]">
                          {s.title}
                        </div>

                        <div className="mt-3 text-[15px] leading-[1.8] text-[#4b5563]">
                          {s.desc}
                        </div>
                      </div>
                    </div>

                    {/* center dot */}
                    <div className="absolute left-1/2 top-1/2 hidden h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[4px] border-[#f7f8fc] bg-[#5b6cff] md:block shadow-sm transition duration-300 group-hover:scale-125 group-hover:bg-[#7c3aed]" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-20 text-center">
            <button
              className="inline-flex items-center gap-2 rounded-[16px] bg-gradient-to-r from-[#5b6cff] to-[#7c3aed] px-8 py-4 text-sm font-bold text-white shadow-[0_12px_26px_rgba(91,108,255,0.25)] transition hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(91,108,255,0.30)]"
              onClick={() => (window.location.href = "/artist/auth/login")}
            >
              Start your journey <IconArrow />
            </button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-y border-[rgba(15,23,42,0.08)] bg-white py-18 sm:py-24">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <SectionHeading
            number="04"
            label="Browse"
            title="All artist"
            highlight="categories"
            desc="A clean grid for quick discovery, similar to how users browse on event platforms."
          />

          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
            {CATS.map((c) => (
              <div
                key={c.title}
                className="group cursor-pointer rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-gradient-to-b from-[#ffffff] to-[#f8fbff] px-4 py-8 text-center shadow-[0_10px_30px_rgba(15,23,42,0.03)] transition duration-300 hover:-translate-y-1 hover:border-[#5b6cff]/30 hover:shadow-[0_16px_40px_rgba(91,108,255,0.12)]"
              >
                <div className="mx-auto mb-5 text-[#5b6cff] transition group-hover:scale-110 [&>svg]:h-10 [&>svg]:w-10">
                  {React.createElement(c.icon)}
                </div>
                <div className="font-['Cormorant_Garamond',_serif] text-[20px] font-bold text-[#111827]">{c.title}</div>
                <div className="mt-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#6b7280]">
                  {c.count} artists
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits band */}

      <section className="relative overflow-hidden bg-[#0f172a] py-18 sm:py-24">
        <div className="absolute -left-40 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-[#5b6cff]/20 blur-[100px]" />

        <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
                <span className="text-[11px] font-extrabold uppercase tracking-[.18em] text-white/70">05 — Benefits</span>
              </div>
              <h2 className="font-['Cormorant_Garamond',_serif] text-[clamp(34px,5vw,56px)] font-bold leading-[1.04] tracking-[-0.03em] text-white">
                Everything you need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5b6cff] to-[#7c3aed]">succeed</span>
              </h2>
              <p className="mt-5 max-w-xl text-[15px] leading-[1.8] text-white/70">
                Built for artists who want a premium profile, smoother bookings, and a better brand presence.
              </p>

              <button
                className="mt-10 inline-flex items-center gap-2 rounded-[16px] bg-gradient-to-r from-[#5b6cff] to-[#7c3aed] px-8 py-4 text-sm font-bold text-white shadow-[0_12px_26px_rgba(91,108,255,0.25)] transition hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(91,108,255,0.30)]"
                onClick={() => (window.location.href = "/artist/auth/login")}
              >
                Join now <IconArrow />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {BENEFITS.map((b) => (
                <div
                  key={b}
                  className="flex items-start gap-3 rounded-[22px] border border-white/10 bg-white/5 px-5 py-5 backdrop-blur-sm transition hover:bg-white/10"
                >
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] bg-[rgba(91,108,255,0.2)] text-[#5b6cff]">
                    <IconCheck />
                  </div>
                  <span className="text-[14px] leading-relaxed text-white/90">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-18 sm:py-24 bg-[#f7f8fc]">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <SectionHeading
              number="06"
              label="Support"
              title="Common"
              highlight="questions"
              desc="Everything artists usually ask before joining."
            />

            <div className="rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-white p-3 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
              {FAQS.map((f, i) => {
                const isOpen = openFaq === i;
                return (
                  <div className="border-b border-[rgba(15,23,42,0.06)] last:border-b-0" key={i}>
                    <button
                      className="flex w-full items-center justify-between gap-4 px-6 py-6 text-left transition hover:bg-[#f8faff] rounded-[20px]"
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      type="button"
                    >
                      <span className="text-[16px] font-semibold leading-snug text-[#111827]">{f.q}</span>
                      <span className={`shrink-0 transition-transform duration-300 ${isOpen ? "rotate-45 text-[#5b6cff]" : "text-[#6b7280]"}`}>
                        <IconPlus />
                      </span>
                    </button>

                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                        }`}
                    >
                      <div
                        className={`min-h-0 overflow-hidden px-6 text-[15px] leading-[1.8] text-[#4b5563] transition-all duration-300 ${isOpen ? "pb-6 opacity-100" : "pb-0 opacity-0"
                          }`}
                      >
                        {f.a}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#5b6cff] to-[#7c3aed] py-18 sm:py-24">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-3">
                <div className="h-px w-10 bg-white/40" />
                <span className="text-[11px] font-extrabold uppercase tracking-[.18em] text-white/80">
                  Get started today
                </span>
              </div>

              <h2 className="font-['Cormorant_Garamond',_serif] text-[clamp(38px,5vw,72px)] font-bold leading-[1.02] tracking-[-0.03em] text-white">
                Ready to launch
                <br />
                your artist career?
              </h2>

              <p className="mt-5 max-w-xl text-[16px] leading-[1.8] text-white/90">
                Create your profile, upload your best work, and start getting discovered by organizers.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-white px-8 py-4 text-sm font-bold text-[#5b6cff] shadow-lg transition hover:scale-105"
                  onClick={() => (window.location.href = "/artist/auth/login")}
                >
                  Join as artist — free <IconArrow />
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-white/30 px-8 py-4 text-sm font-bold text-white transition hover:border-white hover:bg-white/10"
                  onClick={onViewList}
                >
                  Browse artists
                </button>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/20 bg-white/10 p-8 text-white backdrop-blur-md shadow-xl">
              <div className="text-[11px] font-extrabold uppercase tracking-[.18em] text-white/70">What you get</div>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {["Verified badge", "Direct requests", "Secure payouts", "Portfolio showcase"].map((t) => (
                  <div key={t} className="flex items-start gap-3 rounded-[20px] border border-white/15 bg-white/10 p-4 transition hover:bg-white/20">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] bg-white/20 text-white">
                      <IconCheck />
                    </div>
                    <div className="text-[14px] font-medium leading-relaxed text-white/95">{t}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 border-t border-white/15 pt-8">
                <div className="font-['Cormorant_Garamond',_serif] text-[32px] font-bold leading-tight">
                  Start in minutes.
                  <br />
                  Go live fast.
                </div>
                <div className="mt-3 text-[15px] leading-[1.8] text-white/80">
                  A clean, premium experience for artists and organizers alike.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ───────────────────────── App Root ───────────────────────── */

export default function App() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <>
      <FontLoader />
      <Navbar />
      <LandingPage onViewList={() => (window.location.href = "/allArtists/list")} />
      <Footer />
    </>
  );
}