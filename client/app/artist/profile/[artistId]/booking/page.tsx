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

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@500;600;700&display=swap');

:root{
  --bg:#f7f8fc;
  --bg2:#eef2ff;
  --card:#ffffff;
  --card2:#fbfcff;
  --text:#111827;
  --text2:#4b5563;
  --text3:#6b7280;
  --line:rgba(15, 23, 42, 0.08);
  --line2:rgba(15, 23, 42, 0.12);
  --shadow:0 20px 60px rgba(15, 23, 42, 0.08);
  --shadow2:0 12px 30px rgba(15, 23, 42, 0.10);
  --accent:#5b6cff;
  --accent2:#7c3aed;
  --accentSoft:rgba(91,108,255,0.10);
  --success:#16a34a;
  --successSoft:rgba(22,163,74,0.10);
  --warn:#f59e0b;
  --warnSoft:rgba(245,158,11,0.12);
  --radius-xl:28px;
  --radius-lg:22px;
  --radius-md:16px;
  --radius-sm:12px;
}

.pap {
  background:
    radial-gradient(circle at top left, rgba(91,108,255,0.10), transparent 30%),
    radial-gradient(circle at top right, rgba(124,58,237,0.08), transparent 26%),
    linear-gradient(180deg, #fbfdff 0%, var(--bg) 42%, #f5f7ff 100%);
  color: var(--text);
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

@keyframes papFadeUp {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes papFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes papShimmer {
  0% { background-position: -900px 0; }
  100% { background-position: 900px 0; }
}

.pap .fade-up-1 { animation: papFadeUp .65s cubic-bezier(.2,.8,.2,1) both; }
.pap .fade-up-2 { animation: papFadeUp .65s .08s cubic-bezier(.2,.8,.2,1) both; }
.pap .fade-up-3 { animation: papFadeUp .65s .16s cubic-bezier(.2,.8,.2,1) both; }
.pap .fade-in { animation: papFadeIn .5s ease both; }

.pap .shell{
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 16px;
}
@media (min-width: 768px){
  .pap .shell{ padding: 0 24px; }
}
@media (min-width: 1024px){
  .pap .shell{ padding: 0 32px; }
}

.pap .hero{
  position: relative;
  min-height: 82vh;
  max-height: 920px;
  overflow: hidden;
  background: #0f172a;
}
.pap .hero-media{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit:cover;
  object-position:center 18%;
  transform: scale(1.01);
  filter: saturate(1.02) contrast(1.02);
}
.pap .hero-overlay{
  position:absolute;
  inset:0;
  background:
    linear-gradient(180deg, rgba(15,23,42,0.12) 0%, rgba(15,23,42,0.22) 28%, rgba(15,23,42,0.72) 78%, rgba(15,23,42,0.92) 100%),
    linear-gradient(90deg, rgba(91,108,255,0.22), transparent 36%, rgba(124,58,237,0.20));
}
.pap .hero-glow{
  position:absolute;
  width: 560px;
  height: 560px;
  border-radius: 999px;
  filter: blur(72px);
  background: rgba(91,108,255,0.18);
  top: -140px;
  right: -120px;
  pointer-events:none;
}

.pap .hero-top{
  position:absolute;
  inset:0 0 auto 0;
  z-index:20;
  padding: 16px 0;
}
@media (min-width: 768px){
  .pap .hero-top{ padding: 24px 0; }
}
.pap .hero-top-inner{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
}
.pap .icon-btn{
  width:44px;
  height:44px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.10);
  color:#fff;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  transition: transform .18s ease, background .18s ease, border-color .18s ease;
}
.pap .icon-btn:hover{
  transform: translateY(-1px);
  background: rgba(255,255,255,0.16);
  border-color: rgba(255,255,255,0.26);
}
.pap .hero-actions{
  display:flex;
  gap:10px;
}

.pap .hero-content{
  position:absolute;
  left:0;
  right:0;
  bottom:0;
  z-index:20;
  padding: 0 0 26px 0;
}
@media (min-width: 768px){
  .pap .hero-content{ padding-bottom: 40px; }
}
.pap .hero-grid{
  display:grid;
  grid-template-columns: 1fr;
  gap: 18px;
  align-items:end;
}
@media (min-width: 1024px){
  .pap .hero-grid{
    grid-template-columns: minmax(0, 1.3fr) minmax(320px, 380px);
    gap: 28px;
  }
}

.pap .hero-badge{
  display:inline-flex;
  align-items:center;
  gap:10px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.92);
  border:1px solid rgba(255,255,255,0.16);
  width: fit-content;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
.pap .hero-badge-text{
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .18em;
  text-transform: uppercase;
}
.pap .hero-title{
  margin-top: 14px;
  font-family: 'Cormorant Garamond', serif;
  color:#fff;
  font-size: clamp(42px, 8vw, 92px);
  line-height: .92;
  letter-spacing: -0.04em;
  font-weight: 700;
  text-wrap: balance;
}
.pap .hero-title em{
  font-style: italic;
  font-weight: 500;
  opacity: .78;
}
.pap .hero-meta{
  margin-top: 16px;
  display:flex;
  flex-wrap: wrap;
  gap: 10px;
}
.pap .pill{
  display:inline-flex;
  align-items:center;
  gap:8px;
  border-radius: 999px;
  padding: 10px 14px;
  background: rgba(255,255,255,0.10);
  border:1px solid rgba(255,255,255,0.14);
  color: rgba(255,255,255,0.92);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  font-size: 13px;
  line-height: 1;
}
.pap .pill strong{ font-weight: 800; }
.pap .pill--star{
  background: rgba(245,158,11,0.16);
  border-color: rgba(245,158,11,0.25);
}
.pap .pill--success{
  background: rgba(34,197,94,0.14);
  border-color: rgba(34,197,94,0.24);
}

.pap .identity{
  margin-top: -34px;
  position: relative;
  z-index: 10;
}
@media (min-width: 768px){
  .pap .identity{ margin-top: -58px; }
}
.pap .identity-card{
  background: rgba(255,255,255,0.92);
  border:1px solid rgba(255,255,255,0.9);
  border-radius: 28px;
  box-shadow: var(--shadow);
  padding: 16px;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
@media (min-width: 768px){
  .pap .identity-card{ padding: 20px; }
}
.pap .identity-grid{
  display:grid;
  grid-template-columns: 1fr;
  gap: 18px;
  align-items:center;
}
@media (min-width: 1024px){
  .pap .identity-grid{
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 20px;
  }
}
.pap .identity-left{
  display:flex;
  gap: 16px;
  align-items:flex-start;
  min-width:0;
}
.pap .avatar-wrap{
  position:relative;
  flex-shrink:0;
  margin-top: -52px;
}
@media (min-width: 768px){
  .pap .avatar-wrap{ margin-top: -66px; }
}
.pap .avatar{
  width: 96px;
  height: 96px;
  border-radius: 28px;
  overflow:hidden;
  border: 5px solid rgba(255,255,255,0.96);
  background:#e5e7eb;
  box-shadow: 0 12px 30px rgba(15,23,42,0.14);
}
@media (min-width: 768px){
  .pap .avatar{ width: 124px; height: 124px; }
}
.pap .avatar img{
  width:100%;
  height:100%;
  object-fit:cover;
}
.pap .avatar-fallback{
  width:100%;
  height:100%;
  display:flex;
  align-items:center;
  justify-content:center;
  background: linear-gradient(135deg, #1f2937, #4f46e5);
  color:#fff;
  font-size: 42px;
  font-family:'Cormorant Garamond', serif;
  font-weight:700;
}
.pap .verified{
  position:absolute;
  right: 4px;
  bottom: 4px;
  width: 28px;
  height: 28px;
  border-radius:999px;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  display:flex;
  align-items:center;
  justify-content:center;
  color:#fff;
  border: 3px solid #fff;
}
.pap .identity-copy{ min-width:0; padding-top: 4px; }
.pap .identity-type{
  color: var(--accent);
  letter-spacing: .18em;
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 800;
}
.pap .identity-name{
  margin-top: 6px;
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(26px, 3.7vw, 42px);
  line-height: 1.04;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.03em;
}
.pap .identity-sub{
  margin-top: 10px;
  display:flex;
  flex-wrap:wrap;
  gap: 10px 16px;
  color: var(--text2);
  font-size: 14px;
  line-height: 1.5;
}
.pap .sub-item{
  display:inline-flex;
  align-items:center;
  gap: 6px;
}
.pap .tag-row{
  display:flex;
  flex-wrap:wrap;
  gap: 8px;
  margin-top: 14px;
}
.pap .tag{
  border:1px solid rgba(15,23,42,0.10);
  background: #f8fafc;
  color: #334155;
  border-radius:999px;
  padding: 7px 11px;
  font-size: 12px;
  font-weight: 600;
  line-height:1;
}
.pap .tag--accent{
  background: var(--accentSoft);
  color: #3346d6;
  border-color: rgba(91,108,255,0.18);
}
.pap .identity-right{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 12px;
  flex-wrap: wrap;
}
@media (min-width: 1024px){
  .pap .identity-right{
    justify-content:flex-end;
    flex-wrap: nowrap;
    gap: 14px;
  }
}
.pap .price-card{
  flex: 1;
  min-width: 220px;
  background: linear-gradient(180deg, #ffffff, #f9fbff);
  border:1px solid var(--line);
  border-radius: 22px;
  padding: 18px;
}
@media (min-width: 1024px){
  .pap .price-card{
    min-width: 250px;
  }
}
.pap .price-label{
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--text3);
}
.pap .price-value{
  margin-top: 8px;
  font-family:'Cormorant Garamond', serif;
  font-size: 38px;
  line-height:1;
  font-weight:700;
  color: var(--text);
}
.pap .price-note{
  margin-top: 6px;
  color: var(--text3);
  font-size: 13px;
}
.pap .action-stack{
  display:flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-start;
}
@media (min-width: 1024px){
  .pap .action-stack{
    justify-content:flex-end;
  }
}

.pap .btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap: 8px;
  border:none;
  border-radius: 16px;
  padding: 13px 18px;
  cursor:pointer;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  transition: transform .18s ease, box-shadow .18s ease, background .18s ease, border-color .18s ease;
  white-space: nowrap;
}
.pap .btn:hover{
  transform: translateY(-1px);
}
.pap .btn-primary{
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color:#fff;
  box-shadow: 0 12px 26px rgba(91,108,255,0.25);
}
.pap .btn-primary:hover{
  box-shadow: 0 16px 30px rgba(91,108,255,0.30);
}
.pap .btn-secondary{
  background:#fff;
  color: var(--text);
  border:1px solid var(--line2);
}
.pap .btn-secondary:hover{
  border-color: rgba(91,108,255,0.22);
  background:#f8faff;
}
.pap .btn-soft{
  background: var(--accentSoft);
  color: #3346d6;
  border:1px solid rgba(91,108,255,0.12);
}
.pap .btn-soft:hover{
  background: rgba(91,108,255,0.14);
}

.pap .layout{
  display:grid;
  grid-template-columns: 1fr;
  gap: 18px;
  margin-top: 18px;
  padding-bottom: 120px;
}
@media (min-width: 1024px){
  .pap .layout{
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 24px;
    margin-top: 24px;
    padding-bottom: 70px;
  }
}
.pap .main{
  display:flex;
  flex-direction:column;
  gap: 18px;
}
.pap .side{
  display:none;
}
@media (min-width: 1024px){
  .pap .side{
    display:block;
  }
}
.pap .sticky{
  position: sticky;
  top: 100px;
  display:flex;
  flex-direction:column;
  gap: 16px;
}

.pap .section{
  background: rgba(255,255,255,0.90);
  border:1px solid var(--line);
  border-radius: 28px;
  box-shadow: 0 10px 30px rgba(15,23,42,0.04);
  overflow:hidden;
}
.pap .section-inner{
  padding: 18px;
}
@media (min-width: 768px){
  .pap .section-inner{
    padding: 24px;
  }
}
.pap .section-head{
  display:flex;
  align-items:center;
  gap: 10px;
  margin-bottom: 16px;
}
.pap .section-dot{
  width: 10px;
  height: 10px;
  border-radius:999px;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  box-shadow: 0 0 0 6px rgba(91,108,255,0.09);
}
.pap .section-kicker{
  font-size: 11px;
  letter-spacing: .20em;
  text-transform: uppercase;
  font-weight: 800;
  color: var(--accent);
}
.pap .section-title{
  font-family:'Cormorant Garamond', serif;
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1.1;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.03em;
}
.pap .section-sub{
  margin-top: 8px;
  color: var(--text2);
  font-size: 15px;
  line-height: 1.8;
  max-width: 72ch;
}

.pap .sidebar-card{
  background: rgba(255,255,255,0.94);
  border:1px solid var(--line);
  border-radius: 28px;
  box-shadow: 0 10px 30px rgba(15,23,42,0.04);
  padding: 18px;
}
.pap .sidebar-heading{
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--text3);
}
.pap .sidebar-price{
  margin-top: 8px;
  font-family:'Cormorant Garamond', serif;
  font-size: 42px;
  line-height: 1;
  font-weight: 700;
  color: var(--text);
}
.pap .sidebar-note{
  margin-top: 10px;
  color: var(--text2);
  font-size: 14px;
  line-height: 1.7;
}
.pap .sidebar-actions{
  margin-top: 18px;
  display:flex;
  flex-direction:column;
  gap: 10px;
}
.pap .guarantees{
  margin-top: 18px;
  display:flex;
  flex-direction:column;
  gap: 10px;
}
.pap .guarantee{
  display:flex;
  align-items:flex-start;
  gap: 10px;
  color: var(--text2);
  font-size: 14px;
  line-height: 1.6;
}
.pap .guarantee-badge{
  width: 22px;
  height: 22px;
  border-radius:999px;
  background: var(--successSoft);
  color: var(--success);
  display:flex;
  align-items:center;
  justify-content:center;
  flex-shrink:0;
  margin-top: 1px;
}

.pap .mobile-bar{
  position:fixed;
  left:0;
  right:0;
  bottom:0;
  z-index: 80;
  background: rgba(255,255,255,0.90);
  border-top:1px solid var(--line);
  box-shadow: 0 -10px 40px rgba(15,23,42,0.08);
  padding: 12px 14px max(12px, env(safe-area-inset-bottom)) 14px;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
@media (min-width: 1024px){
  .pap .mobile-bar{ display:none; }
}
.pap .mobile-bar-inner{
  display:flex;
  gap: 10px;
  align-items:center;
}
.pap .mobile-price{
  flex: 1;
  min-width: 0;
}
.pap .mobile-label{
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--text3);
}
.pap .mobile-amount{
  margin-top: 4px;
  font-family:'Cormorant Garamond', serif;
  font-size: 28px;
  font-weight:700;
  color: var(--text);
  line-height:1;
}
.pap .mobile-actions{
  display:flex;
  gap: 8px;
  flex-shrink:0;
}
.pap .mobile-actions .btn{
  padding: 12px 14px;
  border-radius: 14px;
}

.pap .skeleton{
  background: linear-gradient(90deg, #eef2ff 25%, #f8fafc 50%, #eef2ff 75%);
  background-size: 900px 100%;
  animation: papShimmer 1.4s infinite linear;
  border-radius: 20px;
}

.pap .error-wrap{
  min-height: 60vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding: 48px 0;
}
.pap .error-card{
  max-width: 460px;
  width: 100%;
  text-align:center;
  background: rgba(255,255,255,0.94);
  border:1px solid var(--line);
  border-radius: 28px;
  box-shadow: var(--shadow);
  padding: 28px;
}
.pap .error-icon{
  width: 76px;
  height: 76px;
  border-radius: 999px;
  margin: 0 auto 18px;
  background: var(--accentSoft);
  display:flex;
  align-items:center;
  justify-content:center;
  color: var(--accent);
}
.pap .error-title{
  font-family:'Cormorant Garamond', serif;
  font-size: 34px;
  font-weight:700;
  line-height:1.1;
  color: var(--text);
}
.pap .error-sub{
  margin-top: 10px;
  font-size: 15px;
  line-height: 1.75;
  color: var(--text2);
  font-weight: 500;
}
`;

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
    const isOrg = !!localStorage.getItem("organizer_token");
    if (!isOrg) {
      const bookingPath = `/artist/profile/${artistId}/booking`;
      window.location.href = createRoleAuthRedirectUrl("organizer", bookingPath);
      return;
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
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />
        <div className="pap">
          <div className="hero">
            <div className="skeleton w-full h-full" />
          </div>
          <div className="shell">
            <div className="identity">
              <div className="identity-card">
                <div className="identity-grid">
                  <div className="identity-left">
                    <div className="avatar-wrap">
                      <div className="avatar skeleton" />
                    </div>
                    <div className="identity-copy" style={{ width: "100%" }}>
                      <div className="skeleton" style={{ height: 10, width: 82, borderRadius: 999 }} />
                      <div className="skeleton" style={{ height: 40, width: "60%", marginTop: 10, borderRadius: 12 }} />
                      <div className="skeleton" style={{ height: 18, width: "72%", marginTop: 12, borderRadius: 12 }} />
                      <div className="skeleton" style={{ height: 32, width: "82%", marginTop: 14, borderRadius: 999 }} />
                    </div>
                  </div>
                  <div className="price-card skeleton" style={{ minHeight: 170 }} />
                </div>
              </div>
            </div>
            <div className="layout">
              <div className="main">
                <div className="skeleton" style={{ height: 280, borderRadius: 28 }} />
              </div>
              <div className="side">
                <div className="skeleton" style={{ height: 360, borderRadius: 28 }} />
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
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />
        <div className="pap">
          <div className="shell error-wrap">
            <div className="error-card">
              <div className="error-icon">
                <Sparkles size={28} />
              </div>
              <h1 className="error-title">Artist not found</h1>
              <p className="error-sub">
                {error || "This artist doesn't exist or has been removed from the platform."}
              </p>
              <div style={{ marginTop: 22, display: "flex", justifyContent: "center" }}>
                <button className="btn btn-primary" onClick={() => router.back()}>
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
      <Navbar />
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="pap">

        <section className="hero fade-in">
          <img src={coverImg} alt={artist.name} className="hero-media" />
          <div className="hero-overlay" />
          <div className="hero-glow" />

          <div className="hero-top">
            <div className="shell">
              <div className="hero-top-inner">
                <button className="icon-btn" onClick={() => router.back()} aria-label="Go back">
                  <ChevronLeft size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="hero-content">
            <div className="shell">
              <div className="hero-grid">
                <div>
                  <div className="hero-badge fade-up-1">
                    <Sparkles size={14} />
                    <span className="hero-badge-text">
                      {artist.type} · {artist.city}
                    </span>
                  </div>

                  <h1 className="hero-title fade-up-2">
                    Book {firstName}
                    <br />
                    {restName ? <em>{restName}</em> : null}
                  </h1>

                  <div className="hero-meta fade-up-3">
                    {artist.rating && artist.rating.count > 0 ? (
                      <span className="pill pill--star">
                        <Stars score={artist.rating.average} />
                        <strong>{artist.rating.average.toFixed(1)}</strong>
                        <span>({artist.rating.count})</span>
                      </span>
                    ) : null}

                    {(artist.totalBookings ?? 0) > 0 ? (
                      <span className="pill pill--success">
                        <Sparkles size={12} />
                        <strong>{artist.totalBookings}+</strong>
                        <span>bookings</span>
                      </span>
                    ) : null}

                    <span className="pill">
                      <MapPin size={12} />
                      {artist.city}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="shell">
          <div className="identity">
            <div className="identity-card fade-up-1">
              <div className="identity-grid">
                <div className="identity-left">
                  <div className="avatar-wrap">
                    <div className="avatar">
                      {profileImg ? (
                        <img src={profileImg} alt={artist.name} />
                      ) : (
                        <div className="avatar-fallback">{artist.name.charAt(0)}</div>
                      )}
                    </div>
                  </div>

                  <div className="identity-copy">
                    <div className="identity-type">{artist.type}</div>
                    <div className="identity-name">{artist.name}</div>
                    <div className="identity-sub">
                      <span className="sub-item">
                        <MapPin size={13} color="#5b6cff" />
                        {artist.city}
                      </span>
                      {artist.rating && artist.rating.count > 0 ? (
                        <span className="sub-item">
                          <Star size={13} fill="#f59e0b" color="#f59e0b" />
                          {artist.rating.average.toFixed(1)} · {artist.rating.count} reviews
                        </span>
                      ) : null}
                    </div>

                    <div className="tag-row">
                      {artist.genres?.map((g) => (
                        <span key={g} className="tag tag--accent">
                          {g}
                        </span>
                      ))}
                      {artist.languages?.map((l) => (
                        <span key={l} className="tag">
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="identity-right">
                  <div className="price-card">
                    <div className="price-label">Starting from</div>
                    <div className="price-value">{priceLabel}</div>
                    <div className="price-note">
                      Transparent pricing for events, performances, and bookings.
                    </div>
                  </div>

                  <div className="action-stack">
                    <button className="btn btn-secondary" onClick={() => router.push(`/artist/profile/${artistId}`)}>
                      <ChevronLeft size={14} />
                      Back to profile
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="layout">
            <main className="main">
              <section className="section fade-up-1">
                <div className="section-inner">
                  <div className="section-head">
                    <div className="section-dot" />
                    <div className="section-kicker">Booking</div>
                  </div>
                  <h2 className="section-title">Select date & time</h2>
                  <p className="section-sub">Choose a slot and submit your booking request.</p>
                  <PublicBookingCalendar artistId={artist._id} artist={artistBook} />
                </div>
              </section>
            </main>

            <aside className="side">
              <div className="sticky">
                <div className="sidebar-card">
                  <div className="sidebar-heading">Starting from</div>
                  <div className="sidebar-price">{priceLabel}</div>
                  <div className="sidebar-note">
                    Secure booking, verified profile, and lightweight navigation for mobile users.
                  </div>

                  <div className="sidebar-actions">
                    <button className="btn btn-secondary" onClick={() => router.push(`/artist/profile/${artistId}`)}>
                      <ChevronLeft size={14} />
                      Back to profile
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="mobile-bar">
          <div className="shell">
            <div className="mobile-bar-inner">
              <div className="mobile-price">
                <div className="mobile-label">Starting from</div>
                <div className="mobile-amount">{priceLabel}</div>
              </div>
              <div className="mobile-actions">
                <button className="btn btn-secondary" onClick={() => router.push(`/artist/profile/${artistId}`)}>
                  <ChevronLeft size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 96 }} />

        <Footer />
      </div>
    </>
  );
}
