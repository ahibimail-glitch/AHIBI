"use client";

import React, { useEffect, useMemo, useState } from "react";
import Footer from "../Footer";
import Navbar from "../Navbar";
import { toast } from "sonner";

const FONT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@600;700;800;900&display=swap');

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
    fill={filled ? "#F59E0B" : "none"}
    stroke="#F59E0B"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IconSearch = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
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
    <div className="max-w-3xl">
      <div className="mb-4 inline-flex items-center gap-2.5">
        <span className="font-[Inter] text-[11px] font-semibold tracking-[1.5px] text-[#E31837]">{number}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[2px] text-[#7A6F66]">{label}</span>
      </div>
      <h2 className="font-['Playfair_Display'] text-[clamp(32px,4vw,58px)] font-bold leading-[1.02] tracking-[-1px] text-[#191513]">
        {title}{" "}
        {highlight ? <em className="italic text-[#E31837]">{highlight}</em> : null}
      </h2>
      {desc ? <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#6D645D]">{desc}</p> : null}
    </div>
  );
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[#E9E4DB] bg-white px-4 py-3 shadow-[0_10px_30px_rgba(17,17,17,0.05)]">
      <div className="font-['Playfair_Display'] text-2xl font-bold leading-none text-[#191513]">{value}</div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-[1.4px] text-[#7A6F66]">{label}</div>
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
    <div className="group overflow-hidden rounded-[18px] border border-[#E9E4DB] bg-white shadow-[0_12px_36px_rgba(17,17,17,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(17,17,17,0.10)]">
      <div className="relative aspect-[3/4] overflow-hidden bg-[#F6F1EB]">
        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.07]"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(10,10,10,0.88)] via-[rgba(10,10,10,0.12)] to-transparent" />

        <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[1.4px] text-[#191513]">
              {category}
            </span>
            {artist?.verified ? (
              <span className="rounded-full bg-[#E31837] px-3 py-1 text-[10px] font-bold uppercase tracking-[1.4px] text-white">
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
            className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-white/12 text-white backdrop-blur-md transition hover:bg-white/20"
            aria-label="Share artist"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
              <path d="M16 6l-4-4-4 4" />
              <path d="M12 2v13" />
            </svg>
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="font-['Playfair_Display'] text-2xl font-bold leading-tight text-white">{name}</div>
          <div className="mt-2 flex items-center gap-3 text-[12px] text-white/70">
            <span className="inline-flex items-center gap-1 font-semibold text-[#FBBF24]">
              <IconStar filled /> {rating}
            </span>
            <span>{bookings}+ bookings</span>
          </div>
        </div>
      </div>



      <div className="grid grid-cols-2  border-[#E9E4DB]">
        <button
          className="inline-flex items-center justify-center gap-2 bg-[#191513] px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-white transition hover:bg-[#E31837]"
          onClick={() => (window.location.href = `/artist/profile/${id}`)}
        >
          View Profile <IconArrow />
        </button>
        <button
          className="border-l border-[#E9E4DB] bg-white px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-[#191513] transition hover:bg-[#FFF7F8]"
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
    <div className="bg-[#FAF8F5] text-[#191513] font-[Inter]">
      {/* Hero */}
      <section className="relative overflow-hidden ">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(227,24,55,0.12),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(17,24,39,0.06),transparent_28%)]" />
        <div className="absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-[#FFF8F9] via-[#FAF8F5] to-[#FAF8F5]" />

        <div className="relative mx-auto grid w-full max-w-[1280px] items-center gap-12 px-4 py-10 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:py-6">
          <div>
            {/* <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#F2D8DC] bg-white px-4 py-2 shadow-[0_10px_28px_rgba(17,17,17,0.05)]">
              <span className="h-2 w-2 rounded-full bg-[#E31837]" />
              <span className="text-[11px] font-semibold uppercase tracking-[1.6px] text-[#7A6F66]">
                Book artists for your next event
              </span>
            </div> */}

            <h1 className="max-w-3xl font-['Playfair_Display'] text-[clamp(42px,6.5vw,86px)] font-black leading-[0.95] tracking-[-2px] text-[#191513]">
              Discover
              <br />
              <span className="text-[#E31837]">Book</span>
              <br />
              Celebrate
            </h1>

            <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-[#6D645D] sm:text-[18px]">
              A premium artist marketplace inspired by the best event discovery experiences.
              Find singers, DJs, bands, dancers, anchors, and more in one clean, fast interface.
            </p>

            {/* <div className="mt-8 rounded-[28px] border border-[#E9E4DB] bg-white p-3 shadow-[0_18px_45px_rgba(17,17,17,0.08)]">
              <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.7fr_auto]">
                <div className="flex items-center gap-3 rounded-2xl bg-[#F8F4EF] px-4 py-3">
                  <IconSearch />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search artists, categories, or style"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-[#9B9087]"
                  />
                </div>

                <button className="rounded-2xl border border-[#E9E4DB] px-4 py-3 text-left text-sm font-medium text-[#191513] hover:bg-[#FFF7F8]">
                  All cities
                </button>

                <button className="rounded-2xl border border-[#E9E4DB] px-4 py-3 text-left text-sm font-medium text-[#191513] hover:bg-[#FFF7F8]">
                  Event type
                </button>

                <button
                  onClick={onViewList}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#E31837] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#C8102E]"
                >
                  Explore Now <IconArrow />
                </button>
              </div>
            </div> */}

            <div className="mt-6 flex flex-wrap gap-3">
              {["Wedding", "College fest", "Corporate", "Birthday", "Concert", "Club night"].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[#E9E4DB] bg-white px-4 py-2 text-[12px] font-semibold text-[#5F564F] shadow-[0_10px_30px_rgba(17,17,17,0.04)]"
                >
                  {item}
                </span>
              ))}
            </div>


          </div>

          <div className="relative">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[#E31837]/10 blur-2xl" />
            <div className="absolute -left-6 bottom-10 h-28 w-28 rounded-full bg-[#111827]/8 blur-2xl" />

            <div className="relative overflow-hidden rounded-[34px] border border-[#E9E4DB] bg-white p-4 shadow-[0_25px_60px_rgba(17,17,17,0.10)]">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 overflow-hidden rounded-[28px] bg-[#191513] p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition hover:shadow-[0_25px_70px_rgba(0,0,0,0.45)]">

                  {/* TOP BADGES */}
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[1.4px] text-white/70 backdrop-blur">
                      Featured pick
                    </span>
                    <span className="rounded-full bg-[#E31837] px-3 py-1 text-[10px] font-semibold uppercase tracking-[1.4px] text-white shadow-md">
                      Trending now
                    </span>
                  </div>

                  {/* MAIN CONTENT */}
                  <div className="mt-6 flex items-start justify-between gap-6">

                    {/* LEFT */}
                    <div>
                      <div className="font-['Playfair_Display'] text-3xl font-bold leading-tight">
                        Priya Nair
                      </div>
                      <div className="mt-1 text-sm text-white/60">
                        Singer • Mumbai
                      </div>

                      {/* STATS */}
                      <div className="mt-4 flex items-center gap-4 text-sm text-white/75">
                        <span className="inline-flex items-center gap-1 font-semibold text-[#FBBF24]">
                          <IconStar filled /> 4.9
                        </span>
                        <span>312 bookings</span>
                        <span className="text-white/40">•</span>
                        <span className="text-green-400 font-medium">Verified</span>
                      </div>
                    </div>

                    {/* RIGHT CTA */}
                    <div className="flex flex-col items-end gap-3">
                      <button className="rounded-full bg-[#E31837] px-5 py-2.5 text-xs font-semibold text-white transition hover:scale-105 hover:bg-[#FF2A48]">
                        Book now
                      </button>

                      <button className="rounded-full border border-white/15 px-5 py-2.5 text-xs font-semibold text-white/80 transition hover:bg-white/10">
                        View profile
                      </button>
                    </div>

                  </div>

                 
                </div>

                <div className="overflow-hidden rounded-[26px] border border-[#E9E4DB] bg-[#FFF7F8] p-4">
                  <img
                    src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80"
                    alt="DJ"
                    className="h-52 w-full rounded-[22px] object-cover"
                  />
                  <div className="mt-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[1.4px] text-[#E31837]">DJ</div>
                    <div className="mt-1 font-semibold text-[#191513]">Book instantly</div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[26px] border border-[#E9E4DB] bg-[#F8F4EF] p-4">
                  <img
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80"
                    alt="Artist"
                    className="h-52 w-full rounded-[22px] object-cover"
                  />
                  <div className="mt-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[1.4px] text-[#E31837]">Live performance</div>
                    <div className="mt-1 font-semibold text-[#191513]">For premium events</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {["Fast booking", "Verified artists", "Secure payouts"].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-[#E9E4DB] bg-[#FAF8F5] px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-[1.2px] text-[#5F564F]"
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
      <div className="overflow-hidden border-y border-[#E9E4DB] bg-white py-3">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <div className="whitespace-nowrap">
            <div className="flex w-max animate-[ticker_28s_linear_infinite]">
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-3 px-8 py-1 text-[11px] font-semibold uppercase tracking-[1.5px] text-[#5F564F]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#E31837]" />
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
              className="inline-flex items-center gap-2 self-start rounded-full border border-[#E9E4DB] bg-white px-5 py-3 text-sm font-semibold text-[#191513] transition hover:bg-[#FFF7F8]"
              onClick={onViewList}
            >
              View all artists <IconArrow />
            </button>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeCategory === cat
                    ? "bg-[#191513] text-white shadow-[0_10px_24px_rgba(17,17,17,0.16)]"
                    : "border border-[#E9E4DB] bg-white text-[#5F564F] hover:bg-[#FFF7F8]"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredArtists.slice(0, 4).map((artist) => (
              <ArtistCard key={artist?._id || artist?.id || artist?.name} artist={artist} onShare={shareArtist} />
            ))}

            {/* Explore All Artists Card */}
            <div className="group overflow-hidden rounded-[20px] border border-[#E9E4DB] bg-gradient-to-br from-[#E31837] to-[#C8102E] shadow-[0_8px_24px_rgba(227,24,55,0.15)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(227,24,55,0.25)]">
              <div className="relative aspect-[3/4] overflow-hidden flex flex-col items-center justify-center text-white p-4">
                <div className="mb-4 rounded-full bg-white/20 p-3 backdrop-blur-sm">
                  <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>

                <div className="font-['Playfair_Display'] text-lg font-bold leading-tight text-center text-white mb-2">
                  Explore All
                  <br />
                  Artists
                </div>

                <div className="text-xs text-white/80 text-center mb-4">
                  Discover {filteredArtists.length}+ artists
                </div>

                <button
                  onClick={onViewList}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#E31837] transition hover:bg-[#F7F2F2]"
                >
                  Browse All <IconArrow />
                </button>
              </div>

              <div className="border-t border-white/20 p-3 bg-white/10 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[8px] font-semibold uppercase tracking-[1.2px] text-white/80">All categories</div>
                    <div className="mt-0.5 font-['Playfair_Display'] text-sm font-bold text-white">
                      {filteredArtists.length}+ Artists
                    </div>
                  </div>
                  <div className="rounded-full bg-white/20 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[1px] text-white">
                    View all
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why join */}
      <section className="border-y border-[#E9E4DB] bg-[#FFFDFC] py-18 sm:py-24">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <SectionHeading
            number="02"
            label="For artists"
            title="Why artists choose"
            highlight="Ahibi"
            desc="A strong creator-first platform with booking, branding, payouts, and visibility built in."
          />

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {WHY_JOIN.map((w) => (
              <div
                key={w.num}
                className="group relative overflow-hidden rounded-[28px] border border-[#E9E4DB] bg-white p-7 shadow-[0_10px_30px_rgba(17,17,17,0.05)] transition hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(17,17,17,0.09)]"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="font-[Inter] text-[11px] font-semibold tracking-[1.6px] text-[#E31837]">{w.num}</span>
                  <div className="text-[#191513] [&>svg]:h-9 [&>svg]:w-9">{React.createElement(w.icon)}</div>
                </div>
                <div className="font-['Playfair_Display'] text-2xl font-bold leading-tight text-[#191513]">{w.title}</div>
                <p className="mt-3 text-sm leading-relaxed text-[#6D645D]">{w.desc}</p>
                <div className="mt-5 text-[11px] font-semibold uppercase tracking-[1.4px] text-[#E31837]">{w.stat}</div>
                <div className="absolute bottom-0 left-0 h-1 w-full origin-left scale-x-0 bg-[#E31837] transition duration-300 group-hover:scale-x-100" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 sm:py-24 bg-[#FAF8F5]">
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
            <div className="absolute left-1/2 top-0 hidden h-full w-[2px] -translate-x-1/2 bg-[#E9E4DB] md:block" />

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
                      className={`group relative w-full md:w-[46%] rounded-[28px] border border-[#E9E4DB] bg-white p-6 shadow-[0_10px_30px_rgba(17,17,17,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(17,17,17,0.08)] ${isLeft ? "md:mr-auto" : "md:ml-auto"
                        }`}
                    >
                      {/* step number badge */}
                      <div className="absolute -top-6 left-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#E31837] text-white shadow-md">
                        <span className="font-['Playfair_Display'] text-xl font-bold">
                          {s.step}
                        </span>
                      </div>

                      <div className="mt-4">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#E9E4DB] bg-[#FAF8F5] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[1.4px] text-[#5F564F]">
                          <span className="[&>svg]:h-4 [&>svg]:w-4">
                            {React.createElement(s.icon)}
                          </span>
                          {s.duration}
                        </div>

                        <div className="font-['Playfair_Display'] text-2xl font-bold text-[#191513]">
                          {s.title}
                        </div>

                        <div className="mt-2 text-sm leading-relaxed text-[#6D645D]">
                          {s.desc}
                        </div>
                      </div>
                    </div>

                    {/* center dot */}
                    <div className="absolute left-1/2 top-1/2 hidden h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-[#E31837] md:block shadow-md" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <button
              className="inline-flex items-center gap-2 rounded-full bg-[#E31837] px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:scale-105 hover:bg-[#C8102E]"
              onClick={() => (window.location.href = "/artist/auth/login")}
            >
              Start your journey <IconArrow />
            </button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-y border-[#E9E4DB] bg-[#FFFDFC] py-18 sm:py-24">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <SectionHeading
            number="04"
            label="Browse"
            title="All artist"
            highlight="categories"
            desc="A clean grid for quick discovery, similar to how users browse on event platforms."
          />

          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
            {CATS.map((c) => (
              <div
                key={c.title}
                className="group cursor-pointer rounded-[24px] border border-[#E9E4DB] bg-white px-4 py-6 text-center shadow-[0_10px_30px_rgba(17,17,17,0.04)] transition hover:-translate-y-1 hover:border-[#E31837] hover:shadow-[0_14px_36px_rgba(17,17,17,0.08)]"
              >
                <div className="mx-auto mb-4 text-[#E31837] transition group-hover:scale-105 [&>svg]:h-10 [&>svg]:w-10">
                  {React.createElement(c.icon)}
                </div>
                <div className="font-['Playfair_Display'] text-lg font-bold text-[#191513]">{c.title}</div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-[1.2px] text-[#E31837]">
                  {c.count} artists
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits band */}

      <section className="bg-[#191513] py-18 sm:py-24">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-white/60">05 — Benefits</span>
              </div>
              <h2 className="font-['Playfair_Display'] text-[clamp(34px,5vw,56px)] font-bold leading-[1.02] tracking-[-1px] text-white">
                Everything you need to <span className="text-[#E31837]">succeed</span>
              </h2>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/65">
                Built for artists who want a premium profile, smoother bookings, and a better brand presence.
              </p>

              <button
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#E31837] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#FF2A48]"
                onClick={() => (window.location.href = "/artist/auth/login")}
              >
                Join now <IconArrow />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {BENEFITS.map((b) => (
                <div
                  key={b}
                  className="flex items-start gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-4"
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E31837] text-white">
                    <IconCheck />
                  </div>
                  <span className="text-sm leading-relaxed text-white/85">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-18 sm:py-24">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <SectionHeading
              number="06"
              label="Support"
              title="Common"
              highlight="questions"
              desc="Everything artists usually ask before joining."
            />

            <div className="rounded-[28px] border border-[#E9E4DB] bg-white p-2 shadow-[0_12px_36px_rgba(17,17,17,0.06)]">
              {FAQS.map((f, i) => {
                const isOpen = openFaq === i;
                return (
                  <div className="border-b border-[#F0EBE4] last:border-b-0" key={i}>
                    <button
                      className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      type="button"
                    >
                      <span className="font-semibold leading-snug text-[#191513]">{f.q}</span>
                      <span className={`shrink-0 transition-transform ${isOpen ? "rotate-45 text-[#E31837]" : "text-[#7A6F66]"}`}>
                        <IconPlus />
                      </span>
                    </button>

                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                        }`}
                    >
                      <div
                        className={`min-h-0 overflow-hidden px-5 text-sm leading-relaxed text-[#6D645D] transition-all duration-300 ${isOpen ? "pb-5 opacity-100" : "pb-0 opacity-0"
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
      <section className="bg-[#E31837] py-18 sm:py-24">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-3">
                <div className="h-px w-10 bg-white/40" />
                <span className="text-[11px] font-semibold uppercase tracking-[2px] text-white/65">
                  Get started today
                </span>
              </div>

              <h2 className="font-['Playfair_Display'] text-[clamp(38px,5vw,72px)] font-black leading-[1.02] tracking-[-2px] text-white">
                Ready to launch
                <br />
                your artist career?
              </h2>

              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/80">
                Create your profile, upload your best work, and start getting discovered by organizers.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-[#E31837] transition hover:bg-[#F7F2F2]"
                  onClick={() => (window.location.href = "/artist/auth/login")}
                >
                  Join as artist — free <IconArrow />
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
                  onClick={onViewList}
                >
                  Browse artists
                </button>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/15 bg-white/10 p-6 text-white backdrop-blur-md">
              <div className="text-[11px] font-semibold uppercase tracking-[2px] text-white/65">What you get</div>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {["Verified badge", "Direct requests", "Secure payouts", "Portfolio showcase"].map((t) => (
                  <div key={t} className="flex items-start gap-3 rounded-[20px] border border-white/10 bg-white/10 p-4">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                      <IconCheck />
                    </div>
                    <div className="text-sm leading-relaxed text-white/90">{t}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-white/10 pt-6">
                <div className="font-['Playfair_Display'] text-3xl font-bold leading-tight">
                  Start in minutes.
                  <br />
                  Go live fast.
                </div>
                <div className="mt-3 text-sm leading-relaxed text-white/75">
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