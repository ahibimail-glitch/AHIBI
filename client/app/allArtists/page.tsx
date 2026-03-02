"use client";
import React, { useState, useEffect, useRef } from "react";
import Footer from "../Footer";
import Navbar from "../Navbar";
import { toast } from "sonner";

// ─── Google Fonts ──────────────────────────────────────────────────────────
const FONT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Mono:wght@400;500&display=swap');

@keyframes ticker {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
`;

const FontLoader = () => <style dangerouslySetInnerHTML={{ __html: FONT_CSS }} />;

// ─── Icons (inline SVG) ───────────────────────────────────────────────────
const IconArrow = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const IconStar = ({ filled }: { filled: boolean }) => (
  <svg width="13" height="13" fill={filled ? "#F59E0B" : "none"} stroke="#F59E0B" strokeWidth="2" viewBox="0 0 24 24">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const IconSearch = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);
const IconCheck = () => (
  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconPlus = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const IconMic = () => <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>;
const IconMusic = () => <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>;
const IconUsers = () => <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const IconSparkle = () => <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
const IconCamera = () => <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>;
const IconTrophy = () => <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><polyline points="8 21 12 17 16 21" /><line x1="12" y1="17" x2="12" y2="11" /><path d="M18 2H6l1.5 9A5 5 0 0 0 12 16a5 5 0 0 0 4.5-5L18 2z" /><path d="M2 7h4" /><path d="M18 7h4" /></svg>;
const IconTrend = () => <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>;
const IconDollar = () => <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
const IconShield = () => <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
const IconChart = () => <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;

// ─── Data ─────────────────────────────────────────────────────────────────
const FEATURED_ARTISTS = [
  {
    id: 1, name: "Asha Sharma", category: "Singer", rating: 4.9, bookings: 156,
    image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 2, name: "DJ Rohan", category: "DJ", rating: 4.8, bookings: 234,
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 3, name: "Maya Kumar", category: "Performer", rating: 4.7, bookings: 189,
    image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80"
  },
];

const ALL_ARTISTS = [
  {
    id: 1, name: "Asha Sharma", category: "Singer", rating: 4.9, bookings: 156, price: "₹25,000", verified: true,
    image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 2, name: "DJ Rohan", category: "DJ", rating: 4.8, bookings: 234, price: "₹35,000", verified: true,
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80", featured: true
  },
  {
    id: 3, name: "Maya Kumar", category: "Dancer", rating: 4.7, bookings: 189, price: "₹18,000", verified: false,
    image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 4, name: "Ravi Mehta", category: "Comedian", rating: 4.6, bookings: 98, price: "₹20,000", verified: true,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 5, name: "Priya Nair", category: "Singer", rating: 4.9, bookings: 312, price: "₹45,000", verified: true,
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80", featured: true
  },
  {
    id: 6, name: "Arjun Band", category: "Band", rating: 4.7, bookings: 145, price: "₹80,000", verified: true,
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 7, name: "Zara Kapoor", category: "Anchor/MC", rating: 4.8, bookings: 201, price: "₹22,000", verified: false,
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 8, name: "Kiran Desai", category: "Magician", rating: 4.5, bookings: 67, price: "₹30,000", verified: true,
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80"
  },
];

const CATEGORIES = ["All", "Singer", "DJ", "Band", "Dancer", "Comedian", "Magician", "Anchor/MC"];
const WHY_JOIN = [
  { icon: IconTrend, title: "Grow Your Career", desc: "Reach thousands of event organizers. Get discovered and booked nationwide.", stat: "10,000+ monthly bookings", num: "01" },
  { icon: IconDollar, title: "Earn More Money", desc: "Set your own rates, keep 85–95% of your earnings. Transparent, direct payments.", stat: "₹50,000 avg. monthly", num: "02" },
  { icon: IconShield, title: "Secure & Safe", desc: "Protected payments, verified bookings, and contract management handled for you.", stat: "100% payment guarantee", num: "03" },
  { icon: IconChart, title: "Manage Your Brand", desc: "Pro profile, portfolio showcase, calendar management, and detailed analytics.", stat: "Complete toolkit", num: "04" },
];
const HOW_TO_JOIN = [
  { step: "01", title: "Create Your Profile", desc: "Sign up and create your artist profile in minutes. Add basic info, category, and contact details.", duration: "3 min", icon: IconUsers },
  { step: "02", title: "Build Your Portfolio", desc: "Upload photos, videos, performance samples. Add rates, availability, and services.", duration: "20 min", icon: IconCamera },
  { step: "03", title: "Get Verified", desc: "Our team reviews your profile. Once verified, you appear in search and can receive bookings.", duration: "24–48 hrs", icon: IconTrophy },
  { step: "04", title: "Start Performing", desc: "Receive booking requests, manage your schedule, and get paid. Build your reputation with reviews.", duration: "Ongoing", icon: IconSparkle },
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
  "Free to create profile", "Instant booking notifications", "Secure payment processing",
  "Calendar & schedule management", "Portfolio & media showcase", "Direct client communication",
  "Review & rating system", "Marketing & promotion", "24/7 support assistance", "Analytics dashboard",
];
const FAQS = [
  { q: "Who can join as an artist on AHiBi?", a: "Any performing artist can join! Singers, musicians, DJs, dancers, bands, comedians, magicians, anchors/MCs, and celebrities. If you entertain at events, you're welcome." },
  { q: "How much does it cost to join?", a: "Creating your profile is completely FREE. We charge a small commission (5–15%) only when you complete a booking. No monthly fees, no hidden charges." },
  { q: "How do I get paid?", a: "Payments are processed via Razorpay. When a booking is confirmed and completed, funds transfer to your bank account within 3–5 business days. Track all earnings in your dashboard." },
  { q: "Can I set my own pricing?", a: "Yes! Full control over your rates. Set different prices for different event types, durations, and services. Offer packages and custom quotes too." },
  { q: "How does the booking process work?", a: "Organizers search artists, view your profile, and send requests. You get instant notifications, can accept/decline, and communicate directly through our platform." },
  { q: "What if I need to cancel a booking?", a: "While we encourage honoring bookings, emergencies happen. Cancel through your dashboard. Policies vary by plan and timing — check your artist agreement." },
];
const TICKER_ITEMS = ["Join Free", "10,000+ Artists", "Secure Payments", "Set Your Rates", "Verified Profiles", "24/7 Support", "Nationwide Bookings", "Free to Join"];

// ─── Landing Page ─────────────────────────────────────────────────────────
function LandingPage({ onViewList }: { onViewList: () => void }) {
  const [openFaq, setOpenFaq] = useState(null);
  const [topArtists, setTopArtists] = useState<any[]>([]);

  useEffect(() => {
    const fetchTopArtists = async () => {
      try {
        const params = new URLSearchParams();
        params.append("sortBy", "rating.average");
        params.append("limit", "3");
        const res = await fetch(`/api/artist/public?${params.toString()}`);
        const data = await res.json();
        if (data?.success && Array.isArray(data?.data?.artists)) {
          setTopArtists(data.data.artists);
        }
      } catch {
        setTopArtists([]);
      }
    };

    fetchTopArtists();
  }, []);

  const featuredTopArtists = (topArtists?.length ? topArtists : FEATURED_ARTISTS).slice(0, 3);

  const shareArtist = async (artist: { _id?: string; id?: string | number; name?: string }) => {
    const id = artist?._id || artist?.id;
    if (!id) return;
    const url = `${window.location.origin}/artist/profile/${id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: artist?.name || "Artist", text: `Check out ${artist?.name || "this artist"} on AHiBi`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't share");
    }
  };

  return (
    <div className="bg-[#FAF7F2] text-[#1A1714] font-sans">
      {/* Hero */}
      <div className="relative flex min-h-[75vh] flex-col justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#1A1714_0%,#2D2520_40%,#1A1714_100%)]" />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600&h=900&fit=crop')",
          }}
        />
        <div className="relative z-[1] mx-auto w-full max-w-[1280px] px-6 py-8 md:px-10 lg:px-[60px]">
          <h1 className="font-['Playfair_Display'] text-[clamp(48px,7vw,100px)] font-black leading-[0.92] tracking-[-2px] text-white">
            Showcase Your <em className="italic">Talent,</em>
            <br />
            Grow Your Career.
          </h1>

          <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row">
            <button
              className="inline-flex items-center gap-2 bg-[#E31837] px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.8px] text-white transition hover:bg-[#FF1F3D]"
              onClick={() => (window.location.href = "/artist/auth/login")}
            >
              Join as Artist <IconArrow />
            </button>
            <button
              className="inline-flex items-center gap-2 border border-white/20 bg-transparent px-8 py-4 text-[13px] font-medium uppercase tracking-[0.8px] text-white/70 transition hover:border-white/60 hover:text-white"
              onClick={() => (window.location.href = "/allArtists/list")}
            >
              Browse Artists
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-8 border-t border-white/10 pt-4">
            {[["10K+", "Artists"], ["50K+", "Events/Year"], ["₹50K", "Avg. Monthly"], ["48hr", "Go Live"]].map(
              ([n, l]) => (
                <div key={l}>
                  <div className="font-['Playfair_Display'] text-4xl font-bold leading-none text-white">{n}</div>
                  <div className="mt-1.5 text-[11px] uppercase tracking-[1px] text-white/40">{l}</div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Ticker */}
      <div className="overflow-hidden bg-[#1A1714] py-2.5 text-[#FAF7F2]">
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-10 lg:px-[60px]">
          <div className="whitespace-nowrap">
            <div className="flex w-max animate-[ticker_28s_linear_infinite]">
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-3 px-8 py-1 text-[11px] font-medium uppercase tracking-[1.5px]"
                >
                  <span className="h-1 w-1 shrink-0 rounded-full bg-[#E31837]" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Featured Artists */}
      <section className="bg-[#FAF7F2] py-20 md:py-28">
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-10 lg:px-[60px]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-5 inline-flex items-center gap-2.5">
                <span className="font-['DM_Mono'] text-[11px] font-medium tracking-[1px] text-[#C8102E]">01</span>
                <span className="text-[11px] font-medium uppercase tracking-[2px] text-[#6B6259]">Featured Artists</span>
              </div>
              <h2 className="font-['Playfair_Display'] text-[clamp(32px,4vw,56px)] font-bold leading-[1.08] tracking-[-1px] text-[#1A1714]">
                Top Performing <em className="italic text-[#C8102E]">Artists</em>
              </h2>
            </div>
            <button
              className="mt-8 inline-flex items-center gap-2 p-0 text-[12px] font-semibold uppercase tracking-[1px] text-[#1A1714] transition hover:gap-4"
              onClick={onViewList}
            >
              View All Artists <IconArrow />
            </button>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredTopArtists.map((a: any) => {
              const key = a?._id || a?.id || a?.name;
              const name = a?.name || "Artist";
              const category = a?.type || a?.category || "Artist";
              const rating = a?.rating?.average ?? a?.rating ?? "-";
              const bookings = a?.totalBookings ?? a?.bookings ?? 0;
              const basePrice = Number.isFinite(a?.basePrice) && a.basePrice > 0 ? a.basePrice : null;
              const priceLbl = basePrice ? `₹${basePrice.toLocaleString()}` : "Custom";
              const image =
                a?.image ||
                a?.gallery?.photos?.find?.((p: any) => p?.isProfileImage)?.url ||
                a?.gallery?.photos?.[0]?.url ||
                "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80";

              return (
                <div
                  className="group relative flex cursor-pointer flex-col overflow-hidden border border-[#DDD8CF] bg-white transition hover:-translate-y-0.5 hover:border-[#1A1714] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                  key={key}
                  onClick={() => (window.location.href = `/artist/profile/${a?._id || ""}`)}
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-[#F3EFE8]">
                    <img
                      src={image}
                      alt={name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[rgba(20,15,10,0.88)] via-[rgba(20,15,10,0.1)] to-transparent" />

                    <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
                      <span
                        className={`px-[9px] py-[3px] text-[9px] font-bold uppercase tracking-[1.5px] text-white ${
                          bookings > 50 ? "bg-[#E31837]" : "bg-[#1A1714]"
                        }`}
                      >
                        {bookings > 50 ? "Top Artist" : category}
                      </span>

                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center border border-white/20 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          shareArtist(a);
                        }}
                        aria-label="Share"
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                          <path d="M16 6l-4-4-4 4" />
                          <path d="M12 2v13" />
                        </svg>
                      </button>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[1.5px] text-[#E31837]">{category}</div>
                      <div className="font-['Playfair_Display'] text-xl font-bold leading-[1.15] text-white">{name}</div>
                      <div className="mt-1 flex items-center gap-2.5 text-[11px] text-white/55">
                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#F59E0B]">
                          <IconStar filled /> {rating}
                        </span>
                        <span>{bookings}+ bookings</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-4 p-5">
                    <div className="mt-auto flex items-center justify-between border-t border-[#DDD8CF] py-4">
                      <div>
                        <div className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[#6B6259]">Starting from</div>
                        <div className="font-['Playfair_Display'] text-xl font-bold text-[#1A1714]">{priceLbl}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex">
                    <button
                      className="flex-1 items-center justify-center gap-2 bg-[#1A1714] px-3.5 py-3.5 text-[11px] font-semibold uppercase tracking-[1px] text-white transition hover:bg-[#E31837]"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/artist/profile/${a?._id || ""}`;
                      }}
                    >
                      View Profile <IconArrow />
                    </button>
                    <button
                      className="items-center gap-1.5 border-l border-[#DDD8CF] px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[1px] text-[#1A1714] transition hover:bg-[#F3EFE8]"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/artist/profile/${a?._id || ""}?book=true`;
                      }}
                    >
                      Book
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <hr className="m-0 h-px border-0 bg-[#DDD8CF]" />

      {/* Why Join */}
      <section className="bg-[#FAF7F2] py-20 md:py-28">
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-10 lg:px-[60px]">
          <div className="mb-5 inline-flex items-center gap-2.5">
            <span className="font-['DM_Mono'] text-[11px] font-medium tracking-[1px] text-[#C8102E]">02</span>
            <span className="text-[11px] font-medium uppercase tracking-[2px] text-[#6B6259]">Why Join</span>
          </div>

          <h2 className="font-['Playfair_Display'] text-[clamp(32px,4vw,56px)] font-bold leading-[1.08] tracking-[-1px] text-[#1A1714]">
            Why Artists <em className="italic text-[#C8102E]">Choose</em> Ahibi
          </h2>
          <p className="mt-4 max-w-[520px] text-base leading-relaxed text-[#6B6259]">
            Join thousands of artists growing their careers and earning more with our platform.
          </p>

          <div className="mt-14 grid grid-cols-1 border border-[#DDD8CF] sm:grid-cols-2 lg:grid-cols-4">
            {WHY_JOIN.map((w) => (
              <div
                className="group relative overflow-hidden border-b border-r border-[#DDD8CF] bg-transparent p-10 transition hover:bg-[#F3EFE8]"
                key={w.num}
              >
                <div className="mb-5 font-['DM_Mono'] text-[11px] font-medium tracking-[1px] text-[#C8102E]">{w.num}</div>
                <div className="mb-5 text-[#3D3730] [&>svg]:h-10 [&>svg]:w-10">{React.createElement(w.icon)}</div>
                <div className="mb-3 font-['Playfair_Display'] text-xl font-bold leading-snug text-[#1A1714]">{w.title}</div>
                <div className="mb-5 text-sm leading-relaxed text-[#6B6259]">{w.desc}</div>
                <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[#C8102E]">{w.stat}</div>
                <div className="absolute bottom-0 left-0 h-[3px] w-full origin-left scale-x-0 bg-[#E31837] transition-transform duration-300 group-hover:scale-x-100" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="m-0 h-px border-0 bg-[#DDD8CF]" />

      {/* How to Join */}
      <section className="bg-[#F3EFE8] py-20 md:py-28">
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-10 lg:px-[60px]">
          <div className="mb-5 inline-flex items-center gap-2.5">
            <span className="font-['DM_Mono'] text-[11px] font-medium tracking-[1px] text-[#C8102E]">03</span>
            <span className="text-[11px] font-medium uppercase tracking-[2px] text-[#6B6259]">Process</span>
          </div>

          <h2 className="font-['Playfair_Display'] text-[clamp(32px,4vw,56px)] font-bold leading-[1.08] tracking-[-1px] text-[#1A1714]">
            How to Join
            <br />
            <em className="italic text-[#C8102E]">AHiBi</em>
          </h2>
          <p className="mt-4 max-w-[520px] text-base leading-relaxed text-[#6B6259]">
            Get your artist profile live and start receiving bookings in just 4 easy steps.
          </p>

          <div className="mt-14">
            {HOW_TO_JOIN.map((s, idx) => (
              <div
                className={`group flex gap-6 border-b border-[#DDD8CF] py-10 transition hover:pl-3 ${
                  idx === 0 ? "border-t" : ""
                }`}
                key={s.step}
              >
                <div className="w-[72px] shrink-0 font-['Playfair_Display'] text-5xl font-black leading-none text-[#EDE8DF] transition group-hover:text-[#E31837]/25">
                  {s.step}
                </div>
                <div className="flex-1">
                  <div className="mb-3 inline-flex items-center gap-2 bg-[#FAF7F2] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[1.5px] text-[#6B6259]">
                    <span className="text-[#6B6259] [&>svg]:h-5 [&>svg]:w-5">{React.createElement(s.icon)}</span>
                    {s.duration}
                  </div>
                  <div className="font-['Playfair_Display'] text-2xl font-bold text-[#1A1714]">{s.title}</div>
                  <div className="mt-2 max-w-[520px] text-sm leading-relaxed text-[#6B6259]">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <button
              className="inline-flex items-center gap-2 bg-[#E31837] px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.8px] text-white transition hover:bg-[#FF1F3D]"
              onClick={() => (window.location.href = "/artist/auth/login")}
            >
              Start Your Journey — It's Free <IconArrow />
            </button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-[#FAF7F2] py-20 md:py-28">
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-10 lg:px-[60px]">
          <div className="mb-5 inline-flex items-center gap-2.5">
            <span className="font-['DM_Mono'] text-[11px] font-medium tracking-[1px] text-[#C8102E]">04</span>
            <span className="text-[11px] font-medium uppercase tracking-[2px] text-[#6B6259]">Categories</span>
          </div>
          <h2 className="font-['Playfair_Display'] text-[clamp(32px,4vw,56px)] font-bold leading-[1.08] tracking-[-1px] text-[#1A1714]">
            All Artist <em className="italic text-[#C8102E]">Categories</em>
          </h2>
          <p className="mt-4 max-w-[520px] text-base leading-relaxed text-[#6B6259]">
            Whatever your talent, there's demand for it on AHiBi.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-0.5 sm:grid-cols-4">
            {CATS.map((c) => (
              <div
                className="group cursor-pointer border border-transparent bg-[#F3EFE8] px-6 py-8 text-center transition hover:border-[#1A1714] hover:bg-[#1A1714]"
                key={c.title}
              >
                <div className="mx-auto mb-4 text-[#C8102E] transition group-hover:text-white [&>svg]:h-10 [&>svg]:w-10">
                  {React.createElement(c.icon)}
                </div>
                <div className="mb-1 font-['Playfair_Display'] text-lg font-bold text-[#1A1714] transition group-hover:text-white">{c.title}</div>
                <div className="text-[11px] font-medium uppercase tracking-[1px] text-[#C8102E] transition group-hover:text-white/50">
                  {c.count} artists
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Band */}
      <div className="bg-[#1A1714] py-20">
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-10 lg:px-[60px]">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
            <div>
              <div className="mb-5 inline-flex items-center gap-2.5">
                <span className="text-[11px] font-medium uppercase tracking-[2px] text-white/30">05 — Benefits</span>
              </div>
              <h2 className="font-['Playfair_Display'] text-[clamp(32px,4vw,52px)] font-bold leading-tight tracking-[-1px] text-white">
                Everything
                <br />
                You Need to <em className="italic text-[#E31837]">Succeed</em>
              </h2>
              <p className="mt-4 mb-8 text-[15px] leading-relaxed text-white/45">
                We've built the complete toolkit for artist success on our platform.
              </p>
              <button
                className="inline-flex items-center gap-2 bg-[#E31837] px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.8px] text-white transition hover:bg-[#FF1F3D]"
                onClick={() => (window.location.href = "/artist/auth/login")}
              >
                Join Now <IconArrow />
              </button>
            </div>
            <div className="flex flex-col">
              {BENEFITS.map((b) => (
                <div
                  className="group flex items-center gap-4 border-b border-white/10 py-[18px] transition hover:pl-2"
                  key={b}
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center bg-[#E31837] text-[11px] font-bold text-white">
                    <IconCheck />
                  </div>
                  <span className="text-sm font-normal text-white/70">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <section className="bg-[#FAF7F2] py-20 md:py-28">
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-10 lg:px-[60px]">
          <div className="flex flex-wrap items-start justify-between gap-10">
            <div className="w-full max-w-[320px]">
              <div className="mb-5 inline-flex items-center gap-2.5">
                <span className="font-['DM_Mono'] text-[11px] font-medium tracking-[1px] text-[#C8102E]">06</span>
                <span className="text-[11px] font-medium uppercase tracking-[2px] text-[#6B6259]">FAQ</span>
              </div>
              <h2 className="font-['Playfair_Display'] text-[clamp(32px,4vw,56px)] font-bold leading-[1.08] tracking-[-1px] text-[#1A1714]">
                Common <em className="italic text-[#C8102E]">Questions</em>
              </h2>
              <p className="mt-3 max-w-[520px] text-base leading-relaxed text-[#6B6259]">
                Everything you need to know about joining as an artist.
              </p>
            </div>

            <div className="w-full flex-1 basis-[480px]">
              {FAQS.map((f, i) => {
                const isOpen = openFaq === i;
                return (
                  <div className="border-b border-[#DDD8CF]" key={i}>
                    <button
                      className="flex w-full items-center justify-between gap-4 py-6 text-left"
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      type="button"
                    >
                      <span className="font-['Playfair_Display'] text-lg font-semibold leading-snug text-[#1A1714]">{f.q}</span>
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center text-[#6B6259] transition-transform ${
                          isOpen ? "rotate-45 text-[#C8102E]" : "rotate-0"
                        }`}
                      >
                        <IconPlus />
                      </span>
                    </button>

                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div
                        className={`min-h-0 overflow-hidden text-sm leading-relaxed text-[#6B6259] transition-[opacity,transform,padding] duration-300 ease-in-out ${
                          isOpen ? "pb-6 opacity-100 translate-y-0" : "pb-0 opacity-0 -translate-y-1"
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
      <div className="bg-[#E31837] py-24">
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-10 lg:px-[60px]">
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="max-w-[600px]">
              <div className="mb-6 inline-flex items-center gap-2.5">
                <div className="h-px w-8 bg-white/40" />
                <span className="text-[11px] font-medium uppercase tracking-[2px] text-white/50">Get Started Today</span>
              </div>
              <h2 className="font-['Playfair_Display'] text-[clamp(36px,5vw,72px)] font-black leading-[1.05] tracking-[-2px] text-white">
                Ready to Launch
                <br />
                Your <em className="italic">Artist</em> Career?
              </h2>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <button
                  className="inline-flex items-center gap-2 bg-white px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.8px] text-[#E31837] transition hover:bg-[#F3EFE8]"
                  onClick={() => (window.location.href = "/artist/auth/login")}
                >
                  Join as Artist — Free <IconArrow />
                </button>
                <button
                  className="inline-flex items-center gap-2 border border-white/40 bg-transparent px-8 py-4 text-[13px] font-medium uppercase tracking-[0.8px] text-white/80 transition hover:border-white hover:text-white"
                  onClick={() => (window.location.href = "/allArtists/list")}
                >
                  Browse Artists
                </button>
              </div>
            </div>

            <div className="relative overflow-hidden border border-white/20 bg-white/10 p-8 text-white backdrop-blur-sm">
              <div className="text-[11px] font-medium uppercase tracking-[2px] text-white/70">What you get</div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {["Verified profile badge", "Direct booking requests", "Secure payouts", "Portfolio showcase"].map((t) => (
                  <div key={t} className="flex items-start gap-3">
                    <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center bg-white/15">
                      <IconCheck />
                    </div>
                    <div className="text-sm leading-relaxed text-white/90">{t}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 border-t border-white/15 pt-6">
                <div className="font-['Playfair_Display'] text-3xl font-bold leading-tight">
                  Start in minutes.
                  <br />
                  Go live fast.
                </div>
                <div className="mt-3 text-sm leading-relaxed text-white/75">
                  Create your profile, upload your best work, and start receiving requests from organizers.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



// ─── App Root ─────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("landing"); // "landing" | "list"

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  return (
    <>
      <FontLoader />

      {/* Navbar */}
      <Navbar />





      <LandingPage onViewList={() => window.location.href = '/allArtists/list'} />
      <Footer />
    </>
  );
}