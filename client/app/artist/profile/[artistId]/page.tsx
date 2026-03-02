"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createRoleAuthRedirectUrl } from "@/utils/redirectUtils";
import {
  Star, MapPin, Phone, Mail, Instagram, Youtube,
  Calendar, Award, Play, Music, Users, ChevronLeft,
  Share2, Heart, CheckCircle, Sparkles, Globe, Facebook, Twitter
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";
import PublicBookingCalendar from "@/components/artist/PublicBookingCalendar";

/* ─── Types ────────────────────────────────────────────────────────────── */
interface Artist {
  _id: string; name: string; email: string; phone: string; city: string;
  bio: string; genres: string[]; languages: string[]; type: string;
  basePrice: number; profilePic?: string;
  gallery?: {
    photos: Array<{ url: string; caption: string; isProfileImage: boolean; isCoverImage: boolean }>;
    videos: Array<{ url: string; thumbnail: string; caption: string; platform: string }>;
  };
  accolades: Array<{ title: string; description: string; year: number; organization: string; certificate?: string }>;
  socialLinks?: { instagram?: string; youtube?: string; spotify?: string; facebook?: string; twitter?: string; website?: string };
  rating?: { average: number; count: number };
  totalBookings?: number;
}

/* ─── Shared font + CSS ─────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Mono:wght@400;500&display=swap');

  .ap {
    --cream:#FAF7F2; --cream2:#F3EFE8; --cream3:#EDE8DF;
    --ink:#1A1714; --ink2:#3D3730; --ink3:#6B6259;
    --red:#C8102E; --red2:#E31837; --gold:#B5892A; --border:#DDD8CF;
    font-family:'DM Sans',sans-serif;
    background:var(--cream); color:var(--ink);
    -webkit-font-smoothing:antialiased;
  }

  @keyframes apFadeUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
  @keyframes apFadeIn { from{opacity:0} to{opacity:1} }
  @keyframes apShimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }

  .ap .fu0{animation:apFadeUp .65s .00s ease both}
  .ap .fu1{animation:apFadeUp .65s .12s ease both}
  .ap .fu2{animation:apFadeUp .65s .24s ease both}
  .ap .fu3{animation:apFadeUp .65s .36s ease both}
  .ap .fi {animation:apFadeIn  .9s .05s ease both}

  /* skeleton */
  .ap .skel{background:linear-gradient(90deg,var(--cream2) 25%,var(--cream3) 50%,var(--cream2) 75%);background-size:800px 100%;animation:apShimmer 1.6s infinite linear}

  /* HERO */
  .ap .hero{position:relative;height:340px;overflow:hidden}
  @media(min-width:768px){.ap .hero{height:440px}}
  @media(min-width:1024px){.ap .hero{height:520px}}
  .ap .hero-img{width:100%;height:100%;object-fit:cover;transition:transform 8s ease}
  .ap .hero:hover .hero-img{transform:scale(1.04)}
  .ap .hero-ov{position:absolute;inset:0;background:linear-gradient(to top,rgba(20,15,10,.88) 0%,rgba(20,15,10,.28) 55%,rgba(0,0,0,.12) 100%)}
  .ap .hero-grain{position:absolute;inset:0;pointer-events:none;opacity:.03;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
  .ap .hero-bar{position:absolute;top:0;left:0;right:0;z-index:20;display:flex;justify-content:space-between;align-items:center;padding:16px 20px}
  @media(min-width:1024px){.ap .hero-bar{padding:24px 48px}}
  .ap .icon-btn{width:40px;height:40px;background:rgba(255,255,255,.12);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;color:#fff;flex-shrink:0}
  .ap .icon-btn:hover{background:rgba(255,255,255,.22)}
  .ap .icon-btn.saved{background:var(--red2);border-color:var(--red2)}
  .ap .hero-acts{display:flex;gap:8px}
  .ap .hero-bot{position:absolute;bottom:0;left:0;right:0;z-index:10;padding:0 20px 28px}
  @media(min-width:1024px){.ap .hero-bot{padding:0 48px 44px}}
  .ap .hero-eyebrow{display:inline-flex;align-items:center;gap:8px;margin-bottom:10px}
  .ap .hero-eyebrow-line{width:24px;height:1px;background:rgba(255,255,255,.35)}
  .ap .hero-eyebrow-txt{font-size:10px;font-weight:500;letter-spacing:2.5px;text-transform:uppercase;color:rgba(255,255,255,.45)}
  .ap .hero-name{font-family:'Playfair Display',serif;font-size:clamp(36px,6vw,80px);font-weight:900;line-height:.93;color:#fff;letter-spacing:-2px;margin-bottom:18px}
  .ap .hero-name em{font-style:italic;color:rgba(255,255,255,.4)}
  .ap .hero-meta{display:flex;flex-wrap:wrap;gap:14px;align-items:center}
  .ap .hero-meta-item{display:flex;align-items:center;gap:5px;font-size:12px;color:rgba(255,255,255,.6)}
  .ap .hero-meta-item strong{color:#fff;font-weight:600}

  /* PROFILE STRIP */
  .ap .strip{background:var(--cream);border-bottom:1px solid var(--border);position:relative;z-index:30}
  .ap .strip-in{max-width:1280px;margin:0 auto;padding:0 20px;display:flex;align-items:flex-end;gap:20px}
  @media(min-width:1024px){.ap .strip-in{padding:0 48px}}
  .ap .av-wrap{flex-shrink:0;margin-top:-52px;position:relative}
  @media(min-width:768px){.ap .av-wrap{margin-top:-68px}}
  .ap .av{width:88px;height:88px;border:3px solid var(--cream);overflow:hidden;background:var(--cream2);box-shadow:0 8px 28px rgba(0,0,0,.18)}
  @media(min-width:768px){.ap .av{width:112px;height:112px}}
  .ap .av img{width:100%;height:100%;object-fit:cover}
  .ap .av-fallback{width:100%;height:100%;background:linear-gradient(135deg,var(--ink) 0%,var(--ink2) 100%);display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-size:34px;font-weight:700;color:#fff}
  .ap .av-badge{position:absolute;top:-5px;right:-5px;width:20px;height:20px;background:var(--red2);display:flex;align-items:center;justify-content:center}
  .ap .strip-info{flex:1;padding:14px 0 18px}
  .ap .strip-type{font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--red);margin-bottom:3px}
  .ap .strip-name{font-family:'Playfair Display',serif;font-size:clamp(18px,2.8vw,28px);font-weight:700;color:var(--ink);letter-spacing:-.5px;line-height:1.1}
  .ap .strip-meta{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:6px}
  .ap .strip-meta-item{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--ink3)}
  .ap .tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
  .ap .tag{padding:2px 9px;font-size:9px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;border:1px solid var(--border);color:var(--ink3)}
  .ap .tag.g{border-color:var(--red);color:var(--red);background:rgba(200,16,46,.04)}
  .ap .strip-cta{display:none;padding:14px 0 18px;flex-direction:column;align-items:flex-end;flex-shrink:0;gap:8px}
  @media(min-width:1024px){.ap .strip-cta{display:flex}}
  .ap .price-lbl{font-size:9px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--ink3)}
  .ap .price-amt{font-family:'Playfair Display',serif;font-size:26px;font-weight:900;color:var(--ink);line-height:1.1;text-align:right}
  .ap .btn-ink{display:inline-flex;align-items:center;gap:9px;background:var(--ink);color:#fff;border:none;padding:13px 26px;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;cursor:pointer;transition:all .25s;font-family:'DM Sans',sans-serif}
  .ap .btn-ink:hover{background:var(--red2);transform:translateY(-1px);box-shadow:0 6px 20px rgba(227,24,55,.25)}

  /* LAYOUT */
  .ap .layout{max-width:1280px;margin:0 auto;padding:32px 20px 110px;display:grid;grid-template-columns:1fr;gap:2px}
  @media(min-width:1024px){.ap .layout{grid-template-columns:1fr 332px;gap:28px;padding:36px 48px 60px;align-items:start}}
  .ap .col-main{display:flex;flex-direction:column;gap:2px}
  .ap .col-side{display:none}
  @media(min-width:1024px){.ap .col-side{display:block}}
  .ap .side-sticky{position:sticky;top:80px;display:flex;flex-direction:column;gap:2px}

  /* CARDS */
  .ap .card{background:#fff;padding:28px;border:1px solid var(--border)}
  @media(max-width:767px){.ap .card{padding:20px 18px}}
  .ap .card-title{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:var(--ink);margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:9px}
  .ap .card-title-icon{color:var(--red);flex-shrink:0}

  /* BIO */
  .ap .bio-txt{font-size:14px;line-height:1.85;color:var(--ink3)}
  .ap .bio-more{display:inline-flex;align-items:center;gap:5px;margin-top:10px;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--red);background:none;border:none;cursor:pointer;padding:0;font-family:'DM Sans',sans-serif}
  .ap .highlights{display:grid;grid-template-columns:repeat(3,1fr);margin-top:20px;padding-top:20px;border-top:1px solid var(--border)}
  @media(max-width:639px){.ap .highlights{grid-template-columns:repeat(2,1fr)}}
  .ap .hl{padding:14px;border-right:1px solid var(--border)}
  .ap .hl:last-child{border-right:none}
  .ap .hl-lbl{font-size:9px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--ink3);margin-bottom:5px}
  .ap .hl-val{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:var(--ink)}
  .ap .hl-val.green{color:#1A8A4A}

  /* GALLERY */
  .ap .gal-scroll{display:flex;gap:2px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch;scrollbar-width:none;margin:0 -20px;padding-left:20px}
  .ap .gal-scroll::-webkit-scrollbar{display:none}
  .ap .gal-item{flex-shrink:0;width:152px;height:152px;overflow:hidden;cursor:pointer;background:var(--cream2)}
  .ap .gal-item img{width:100%;height:100%;object-fit:cover;transition:transform .45s}
  .ap .gal-item:hover img{transform:scale(1.07)}
  .ap .videos{display:grid;grid-template-columns:1fr;gap:2px;margin-top:2px}
  @media(min-width:640px){.ap .videos{grid-template-columns:repeat(2,1fr)}}
  .ap .vid-item{position:relative;aspect-ratio:16/9;overflow:hidden;cursor:pointer;background:var(--ink);text-decoration:none;display:block}
  .ap .vid-item img{width:100%;height:100%;object-fit:cover;transition:transform .5s;opacity:.72}
  .ap .vid-item:hover img{transform:scale(1.06);opacity:.5}
  .ap .vid-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
  .ap .vid-play-btn{width:48px;height:48px;background:rgba(255,255,255,.9);display:flex;align-items:center;justify-content:center;transition:all .2s}
  .ap .vid-item:hover .vid-play-btn{background:#fff;transform:scale(1.1)}
  .ap .vid-cap{position:absolute;bottom:0;left:0;right:0;padding:10px 14px;background:linear-gradient(to top,rgba(0,0,0,.7),transparent);font-size:11px;color:rgba(255,255,255,.85);font-weight:500}
  .ap .vid-divider{height:2px;background:var(--border);margin:22px -28px}
  .ap .vid-section-label{display:flex;align-items:center;gap:9px;margin-bottom:14px;font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink3)}

  /* ACCOLADES */
  .ap .accolade{display:flex;gap:18px;align-items:flex-start;padding:22px 0;border-bottom:1px solid var(--border);transition:padding-left .3s}
  .ap .accolade:first-child{padding-top:0}
  .ap .accolade:last-child{border-bottom:none;padding-bottom:0}
  .ap .accolade:hover{padding-left:8px}
  .ap .acc-year{font-family:'DM Mono',monospace;font-size:11px;color:var(--red);font-weight:500;letter-spacing:1px;flex-shrink:0;padding-top:2px;width:40px}
  .ap .acc-title{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:var(--ink);margin-bottom:3px}
  .ap .acc-org{font-size:11px;font-weight:500;letter-spacing:1px;text-transform:uppercase;color:var(--ink3);margin-bottom:5px}
  .ap .acc-desc{font-size:12px;color:var(--ink3);line-height:1.65}

  /* CONTACT */
  .ap .contact-list{display:flex;flex-direction:column;gap:2px}
  .ap .contact-item{display:flex;align-items:center;gap:13px;padding:14px;background:var(--cream2);transition:background .2s;text-decoration:none;color:var(--ink)}
  .ap .contact-item:hover{background:var(--cream3)}
  .ap .contact-icon{width:34px;height:34px;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .ap .contact-txt{font-size:13px;color:var(--ink2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .ap .social-row{display:flex;flex-wrap:wrap;gap:5px;margin-top:14px;padding-top:14px;border-top:1px solid var(--border)}
  .ap .soc-btn{width:38px;height:38px;display:flex;align-items:center;justify-content:center;text-decoration:none;transition:all .2s;border:1px solid rgba(0,0,0,.08)}
  .ap .soc-btn:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,.14);border-color:transparent}

  /* SIDEBAR */
  .ap .booking-card{background:#fff;padding:28px;border:1px solid var(--border)}
  .ap .bp-row{padding-bottom:22px;margin-bottom:22px;border-bottom:1px solid var(--border)}
  .ap .bp-lbl{font-size:9px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--ink3);margin-bottom:5px}
  .ap .bp-amt{font-family:'Playfair Display',serif;font-size:38px;font-weight:900;color:var(--ink);line-height:1}
  .ap .book-note{font-size:11px;color:var(--ink3);margin-top:10px;text-align:center}
  .ap .guarantees{margin-top:22px;padding-top:22px;border-top:1px solid var(--border)}
  .ap .guar-item{display:flex;align-items:center;gap:11px;padding:9px 0;border-bottom:1px solid var(--border);font-size:12px;color:var(--ink3)}
  .ap .guar-item:last-child{border-bottom:none}
  .ap .guar-dot{width:5px;height:5px;background:var(--red2);flex-shrink:0}

  /* MOBILE CTA */
  .ap .mob-cta{display:flex;position:fixed;bottom:0;left:0;right:0;z-index:100;background:#fff;border-top:1px solid var(--border);padding:12px 18px;gap:14px;align-items:center}
  @media(min-width:1024px){.ap .mob-cta{display:none}}
  .ap .mob-cta-lbl{font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink3)}
  .ap .mob-cta-amt{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:var(--ink)}

  /* ERROR */
  .ap .err-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px 20px}
  .ap .err-box{text-align:center;max-width:380px}
  .ap .err-icon{width:68px;height:68px;background:var(--cream2);display:flex;align-items:center;justify-content:center;margin:0 auto 22px}
  .ap .err-title{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;color:var(--ink);margin-bottom:10px}
  .ap .err-sub{font-size:14px;color:var(--ink3);margin-bottom:28px;line-height:1.65}

  /* MISC */
  .ap .flex-between{display:flex;justify-content:space-between;align-items:center}
  .ap .see-all{font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--red);background:none;border:none;cursor:pointer;padding:0;font-family:'DM Sans',sans-serif}
  .ap .lbox-img{width:100%;max-height:80vh;object-fit:contain}
  .ap .stars{display:flex;gap:2px}
`;

/* ─── Social map ──────────────────────────────────────────────────────────── */
const SOC_COLOR: Record<string, string> = {
  instagram: "linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)",
  youtube: "#FF0000", facebook: "#1877F2", twitter: "#1DA1F2",
  spotify: "#1DB954", website: "#1A1714",
};
const SOC_ICON: Record<string, React.ReactNode> = {
  instagram: <Instagram size={15} />, youtube: <Youtube size={15} />,
  facebook: <Facebook size={15} />, twitter: <Twitter size={15} />,
  spotify: <Music size={15} />, website: <Globe size={15} />,
};

/* ─── StarRow ─────────────────────────────────────────────────────────────── */
function Stars({ score }: { score: number }) {
  return (
    <span className="stars">
      {[1,2,3,4,5].map(i => (
        <svg key={i} width="12" height="12" viewBox="0 0 24 24"
          fill={i <= Math.round(score) ? "#F59E0B" : "none"}
          stroke="#F59E0B" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </span>
  );
}

/* ─── ContactBlock ────────────────────────────────────────────────────────── */
function ContactBlock({ artist }: { artist: Artist }) {
  const socials = Object.entries(artist.socialLinks || {}).filter(([, v]) => !!v);
  return (
    <>
      <div className="contact-list">
        <a href={`tel:${artist.phone}`} className="contact-item">
          <div className="contact-icon"><Phone size={14} /></div>
          <span className="contact-txt">{artist.phone}</span>
        </a>
        <a href={`mailto:${artist.email}`} className="contact-item">
          <div className="contact-icon"><Mail size={14} /></div>
          <span className="contact-txt">{artist.email}</span>
        </a>
      </div>
      {socials.length > 0 && (
        <div className="social-row">
          {socials.map(([k, url]) => (
            <a key={k} href={url as string} target="_blank" rel="noopener noreferrer"
              className="soc-btn" style={{ background: SOC_COLOR[k] || "#1A1714", color: "#fff" }}
              aria-label={k}>
              {SOC_ICON[k]}
            </a>
          ))}
        </div>
      )}
    </>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */
export default function PublicArtistProfile() {
  const params = useParams();
  const router = useRouter();
  const artistId = params.artistId as string;

  const [artist, setArtist]         = useState<Artist | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [isOrg, setIsOrg]           = useState(false);
  const [showBook, setShowBook]     = useState(false);
  const [bioOpen, setBioOpen]       = useState(false);
  const [lightbox, setLightbox]     = useState<string | null>(null);
  const [saved, setSaved]           = useState(false);

  useEffect(() => { fetchArtist(); checkOrg(); }, [artistId]);

  const fetchArtist = async () => {
    try {
      const res = await fetch(`/api/artist/public/${artistId}`);
      if (!res.ok) throw new Error("not found");
      const data = await res.json();
      setArtist(data.data.artist);
    } catch { setError("Artist not found or unavailable"); }
    finally   { setLoading(false); }
  };

  const checkOrg = () => setIsOrg(!!localStorage.getItem("organizer_token"));

  const handleShare = useCallback(async () => {
    if (navigator.share && artist) {
      try { await navigator.share({ title: `${artist.name} – AHiBi`, url: window.location.href }); }
      catch { navigator.clipboard.writeText(window.location.href); }
    } else { navigator.clipboard.writeText(window.location.href); }
  }, [artist]);

  const handleBook = () => {
    const bookingPath = `/artist/profile/${artistId}/booking`;
    if (isOrg) router.push(bookingPath);
    else window.location.href = createRoleAuthRedirectUrl("organizer", bookingPath);
  };

  /* ── LOADING ── */
  if (loading) return (
    <>
      <style>{STYLES}</style>
      <div className="ap">
        <Navbar />
        <div className="skel" style={{ height: 400 }} />
        <div style={{ background: "#fff", borderBottom: "1px solid #DDD8CF", padding: "0 20px" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end", paddingBottom: 18 }}>
            <div className="skel" style={{ width: 88, height: 88, marginTop: -44, flexShrink: 0 }} />
            <div style={{ flex: 1, paddingBottom: 8 }}>
              <div className="skel" style={{ height: 12, width: 60, marginBottom: 10 }} />
              <div className="skel" style={{ height: 24, width: 180, marginBottom: 8 }} />
              <div className="skel" style={{ height: 11, width: 140 }} />
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 20px", display: "grid", gridTemplateColumns: "1fr", gap: 2 }}>
          {[180, 140, 120].map((h, i) => <div key={i} className="skel" style={{ height: h }} />)}
        </div>
        <Footer />
      </div>
    </>
  );

  /* ── ERROR ── */
  if (error || !artist) return (
    <>
      <style>{STYLES}</style>
      <div className="ap err-wrap">
        <div className="err-box">
          <div className="err-icon"><Users size={30} color="#6B6259" /></div>
          <h1 className="err-title">Artist Not Found</h1>
          <p className="err-sub">{error || "This artist doesn't exist or has been removed."}</p>
          <button className="btn-ink" onClick={() => router.back()}>
            <ChevronLeft size={15} /> Go Back
          </button>
        </div>
      </div>
    </>
  );

  /* ── DERIVED ── */
  const coverImg     = artist.gallery?.photos?.find(p => p.isCoverImage)?.url  || "/images/carausel1.jpg";
  const profileImg   = artist.gallery?.photos?.find(p => p.isProfileImage)?.url || artist.profilePic;
  const galleryPics  = artist.gallery?.photos?.filter(p => !p.isProfileImage && !p.isCoverImage) || [];
  const videos       = artist.gallery?.videos || [];
  const hasGallery   = galleryPics.length > 0 || videos.length > 0;
  const price        = Number(artist.basePrice);
  const hasPrice     = Number.isFinite(price) && price > 0;
  const priceLbl     = hasPrice ? `\u20B9${price.toLocaleString()}` : "On request";
  const BIO_MAX      = 240;
  const longBio      = artist.bio && artist.bio.length > BIO_MAX;
  const artistBook   = { ...artist, basePrice: hasPrice ? price : 0 };

  return (
    <>
      <style>{STYLES}</style>
      <div className="ap">
        <Navbar />

        {/* ── Hero ── */}
        <section className="hero fi">
          <img src={coverImg} alt={artist.name} className="hero-img" />
          <div className="hero-ov" />
          <div className="hero-grain" />

          <div className="hero-bar">
            <button className="icon-btn" onClick={() => router.back()} aria-label="Back">
              <ChevronLeft size={17} />
            </button>
            <div className="hero-acts">
              <button className="icon-btn" onClick={handleShare} aria-label="Share"><Share2 size={15} /></button>
              <button className={`icon-btn${saved ? " saved" : ""}`} onClick={() => setSaved(!saved)} aria-label="Save">
                <Heart size={15} fill={saved ? "#fff" : "none"} />
              </button>
            </div>
          </div>

          <div className="hero-bot fu0">
            <div className="hero-eyebrow">
              <div className="hero-eyebrow-line" />
              <span className="hero-eyebrow-txt">{artist.type}&nbsp;·&nbsp;{artist.city}</span>
            </div>
            <h1 className="hero-name">
              {artist.name.split(" ")[0]}<br />
              <em>{artist.name.split(" ").slice(1).join(" ") || "\u00A0"}</em>
            </h1>
            <div className="hero-meta">
              {artist.rating && artist.rating.count > 0 && (
                <span className="hero-meta-item">
                  <Stars score={artist.rating.average} />
                  <strong>{artist.rating.average.toFixed(1)}</strong>
                  <span>({artist.rating.count})</span>
                </span>
              )}
              {(artist.totalBookings ?? 0) > 0 && (
                <span className="hero-meta-item">
                  <CheckCircle size={13} />
                  <strong>{artist.totalBookings}+</strong>&nbsp;bookings
                </span>
              )}
              <span className="hero-meta-item"><MapPin size={13} />{artist.city}</span>
            </div>
          </div>
        </section>

        {/* ── Profile Strip ── */}
        <div className="strip fu1">
          <div className="strip-in">
            <div className="av-wrap">
              <div className="av">
                {profileImg
                  ? <img src={profileImg} alt={artist.name} />
                  : <div className="av-fallback">{artist.name.charAt(0)}</div>}
              </div>
              {artist.rating && artist.rating.average >= 4.5 && (
                <div className="av-badge"><Sparkles size={10} color="#fff" /></div>
              )}
            </div>

            <div className="strip-info">
              <div className="strip-type">{artist.type}</div>
              <div className="strip-name">{artist.name}</div>
              <div className="strip-meta">
                <span className="strip-meta-item"><MapPin size={11} color="var(--red)" />{artist.city}</span>
                {artist.rating && artist.rating.count > 0 && (
                  <span className="strip-meta-item">
                    <Star size={11} fill="#F59E0B" color="#F59E0B" />
                    {artist.rating.average.toFixed(1)}&nbsp;·&nbsp;{artist.rating.count} reviews
                  </span>
                )}
              </div>
              <div className="tags">
                {artist.genres?.map(g => <span key={g} className="tag g">{g}</span>)}
                {artist.languages?.map(l => <span key={l} className="tag">{l}</span>)}
              </div>
            </div>

            <div className="strip-cta">
              <div>
                <div className="price-lbl">Starting from</div>
                <div className="price-amt">{priceLbl}</div>
              </div>
              <button className="btn-ink" onClick={handleBook}>
                <Calendar size={14} />{isOrg ? "Book This Artist" : "Login to Book"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Main layout ── */}
        <div className="layout">

          {/* Left column */}
          <main className="col-main fu2">

            {/* About */}
            <div className="card">
              <div className="card-title">About</div>
              {artist.bio ? (
                <>
                  <p className="bio-txt">
                    {bioOpen || !longBio ? artist.bio : `${artist.bio.slice(0, BIO_MAX)}\u2026`}
                  </p>
                  {longBio && (
                    <button className="bio-more" onClick={() => setBioOpen(!bioOpen)}>
                      {bioOpen ? "— Read less" : "+ Read more"}
                    </button>
                  )}
                </>
              ) : <p className="bio-txt" style={{ opacity: 0.45, fontStyle: "italic" }}>No biography available.</p>}

              <div className="highlights">
                <div className="hl">
                  <div className="hl-lbl">Specialisation</div>
                  <div className="hl-val">{artist.type}</div>
                </div>
                <div className="hl">
                  <div className="hl-lbl">Base Price</div>
                  <div className="hl-val green">{priceLbl}</div>
                </div>
                <div className="hl">
                  <div className="hl-lbl">Location</div>
                  <div className="hl-val">{artist.city}</div>
                </div>
              </div>
            </div>

            {/* Gallery */}
            {hasGallery && (
              <div className="card">
                <div className="card-title flex-between">
                  <span>Gallery</span>
                  {galleryPics.length > 5 && (
                    <button className="see-all">See all ({galleryPics.length})</button>
                  )}
                </div>

                {galleryPics.length > 0 && (
                  <div className="gal-scroll">
                    {galleryPics.map((p, i) => (
                      <div key={i} className="gal-item" onClick={() => setLightbox(p.url)}>
                        <img src={p.url} alt={p.caption || `Photo ${i+1}`} />
                      </div>
                    ))}
                  </div>
                )}

                {videos.length > 0 && (
                  <>
                    <div className="vid-divider" />
                    <div className="vid-section-label">
                      <Play size={13} color="var(--red)" /> Performance Videos
                    </div>
                    <div className="videos">
                      {videos.map((v, i) => (
                        <a key={i} href={v.url} target="_blank" rel="noopener noreferrer" className="vid-item">
                          <img src={v.thumbnail} alt={v.caption || `Video ${i+1}`} />
                          <div className="vid-play">
                            <div className="vid-play-btn">
                              <Play size={18} color="var(--ink)" fill="var(--ink)" />
                            </div>
                          </div>
                          {v.caption && <div className="vid-cap">{v.caption}</div>}
                        </a>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Accolades */}
            {artist.accolades?.length > 0 && (
              <div className="card">
                <div className="card-title">
                  <Award size={17} className="card-title-icon" />
                  <span>Awards & Recognition</span>
                </div>
                {artist.accolades.map((a, i) => (
                  <div key={i} className="accolade">
                    <div className="acc-year">{a.year}</div>
                    <div>
                      <div className="acc-title">{a.title}</div>
                      <div className="acc-org">{a.organization}</div>
                      {a.description && <div className="acc-desc">{a.description}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Contact — mobile/tablet only (sidebar hidden on mobile) */}
            <div className="card" style={{ display: "block" }}>
              <div className="card-title">Contact</div>
              <ContactBlock artist={artist} />
            </div>
          </main>

          {/* Right sidebar */}
          <aside className="col-side fu3">
            <div className="side-sticky">

              {/* Booking card */}
              <div className="booking-card">
                <div className="bp-row">
                  <div className="bp-lbl">Starting from</div>
                  <div className="bp-amt">{priceLbl}</div>
                </div>
                <button className="btn-ink" style={{ width: "100%", justifyContent: "center" }} onClick={handleBook}>
                  <Calendar size={14} />{isOrg ? "Book This Artist" : "Login to Book"}
                </button>
                <p className="book-note">You won't be charged yet</p>
                <div className="guarantees">
                  {["Free cancellation within 24 hrs","Secure booking process","Verified artist profile"].map(g => (
                    <div key={g} className="guar-item">
                      <div className="guar-dot" />{g}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar contact */}
              <div className="card">
                <div className="card-title" style={{ fontSize: 14, marginBottom: 14, paddingBottom: 12 }}>Contact</div>
                <ContactBlock artist={artist} />
              </div>
            </div>
          </aside>
        </div>

        {/* Mobile CTA */}
        <div className="mob-cta">
          <div style={{ flex: 1 }}>
            <div className="mob-cta-lbl">Starting from</div>
            <div className="mob-cta-amt">{priceLbl}</div>
          </div>
          <button className="btn-ink" onClick={handleBook} style={{ flexShrink: 0, padding: "13px 22px" }}>
            <Calendar size={14} />{isOrg ? "Book Now" : "Login to Book"}
          </button>
        </div>

        <div style={{ height: 70 }} />
        <Footer />

        {/* Booking dialog */}
        <Dialog open={showBook} onOpenChange={setShowBook}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" style={{ borderRadius: 0, fontFamily: "'DM Sans',sans-serif" }}>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700 }}>
                Book {artist.name}
              </DialogTitle>
              <DialogDescription style={{ fontSize: 13, color: "#6B6259" }}>
                Select a date and time to book this artist for your event.
              </DialogDescription>
            </DialogHeader>
            <PublicBookingCalendar artistId={artist._id} artist={artistBook} />
          </DialogContent>
        </Dialog>

        {/* Lightbox */}
        <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
          <DialogContent className="max-w-5xl p-0 border-0" style={{ background: "rgba(20,15,10,.97)" }}>
            {lightbox && <img src={lightbox} alt="Gallery" className="lbox-img" />}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}