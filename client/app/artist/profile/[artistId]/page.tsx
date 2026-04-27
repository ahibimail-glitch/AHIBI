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

@keyframes papPulse {
  0%,100% { transform: scale(1); }
  50% { transform: scale(1.02); }
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
.pap .hero-cta-card{
  display:none;
  background: rgba(255,255,255,0.12);
  border:1px solid rgba(255,255,255,0.18);
  border-radius: var(--radius-xl);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 18px;
  color:#fff;
  box-shadow: 0 20px 60px rgba(0,0,0,0.16);
}
@media (min-width: 1024px){
  .pap .hero-cta-card{
    display:block;
  }
}
.pap .hero-cta-label{
  font-size: 11px;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.72);
  font-weight: 700;
}
.pap .hero-cta-price{
  margin-top: 8px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 38px;
  line-height: 1;
  font-weight: 700;
}
.pap .hero-cta-sub{
  margin-top: 8px;
  color: rgba(255,255,255,0.82);
  font-size: 14px;
  line-height: 1.6;
}
.pap .hero-cta-row{
  display:flex;
  gap:10px;
  margin-top: 18px;
  flex-wrap: wrap;
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
.pap .read-more{
  margin-top: 10px;
  display:inline-flex;
  align-items:center;
  gap: 6px;
  border:none;
  background:none;
  padding:0;
  color: var(--accent);
  font-weight: 700;
  cursor:pointer;
}

.pap .mini-grid{
  display:grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-top: 18px;
}
@media (min-width: 640px){
  .pap .mini-grid{
    grid-template-columns: repeat(3, 1fr);
  }
}
.pap .mini-card{
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  border:1px solid var(--line);
  border-radius: 20px;
  padding: 16px;
}
.pap .mini-label{
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: var(--text3);
}
.pap .mini-value{
  margin-top: 8px;
  font-family:'Cormorant Garamond', serif;
  font-size: 26px;
  line-height:1.1;
  font-weight:700;
  color: var(--text);
}
.pap .mini-value.success{
  color: var(--success);
}

.pap .scroll-row{
  display:flex;
  gap: 12px;
  overflow-x:auto;
  padding-bottom: 8px;
  scrollbar-width:none;
  -webkit-overflow-scrolling: touch;
}
.pap .scroll-row::-webkit-scrollbar{ display:none; }
.pap .thumb{
  flex: 0 0 auto;
  width: 186px;
  height: 232px;
  border-radius: 20px;
  overflow:hidden;
  position:relative;
  background:#e5e7eb;
  border:1px solid var(--line);
  cursor:pointer;
}
@media (min-width: 640px){
  .pap .thumb{ width: 208px; height: 246px; }
}
.pap .thumb img{
  width:100%;
  height:100%;
  object-fit:cover;
  transition: transform .5s ease;
}
.pap .thumb:hover img{
  transform: scale(1.05);
}
.pap .thumb-overlay{
  position:absolute;
  inset:0;
  background: linear-gradient(180deg, rgba(15,23,42,0.0), rgba(15,23,42,0.18));
  display:flex;
  align-items:flex-end;
  justify-content:space-between;
  padding: 12px;
}
.pap .thumb-caption{
  color:#fff;
  font-size: 12px;
  font-weight: 700;
  text-shadow: 0 2px 12px rgba(0,0,0,0.4);
}
.pap .thumb-icon{
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: rgba(255,255,255,0.94);
  color: #111827;
  display:flex;
  align-items:center;
  justify-content:center;
}
.pap .video-grid{
  display:grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
@media (min-width: 640px){
  .pap .video-grid{
    grid-template-columns: repeat(2, 1fr);
  }
}
.pap .video{
  position:relative;
  aspect-ratio: 16 / 9;
  border-radius: 22px;
  overflow:hidden;
  border:1px solid var(--line);
  background:#111827;
  display:block;
  text-decoration:none;
}
.pap .video img{
  width:100%;
  height:100%;
  object-fit:cover;
  opacity:.72;
  transition: transform .45s ease, opacity .45s ease;
}
.pap .video:hover img{
  transform: scale(1.04);
  opacity:.60;
}
.pap .video-center{
  position:absolute;
  inset:0;
  display:flex;
  align-items:center;
  justify-content:center;
}
.pap .video-play{
  width:58px;
  height:58px;
  border-radius:999px;
  background: rgba(255,255,255,0.96);
  color:#111827;
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow: 0 14px 32px rgba(0,0,0,0.22);
}
.pap .video-caption{
  position:absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16px 14px 12px;
  background: linear-gradient(to top, rgba(15,23,42,.88), rgba(15,23,42,0));
  color: rgba(255,255,255,.94);
  font-size: 13px;
  font-weight: 600;
}
.pap .section-divider{
  height:1px;
  background: var(--line);
  margin: 18px 0;
}

.pap .rider-grid{
  display:grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
@media (min-width: 768px){
  .pap .rider-grid{
    grid-template-columns: repeat(2, 1fr);
  }
}
.pap .rider-card{
  background:#fff;
  border:1px solid var(--line);
  border-radius: 22px;
  padding: 18px;
}
.pap .rider-card.full{
  grid-column: 1 / -1;
}
.pap .rider-label{
  display:flex;
  align-items:center;
  gap: 8px;
  color: var(--text3);
  text-transform: uppercase;
  letter-spacing: .16em;
  font-size: 11px;
  font-weight: 800;
}
.pap .rider-text{
  margin-top: 10px;
  color: var(--text2);
  font-size: 14px;
  line-height: 1.8;
}
.pap .file-card{
  margin-top: 14px;
  display:flex;
  flex-direction:column;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  border:1px solid var(--line);
  border-radius: 22px;
}
@media (min-width: 768px){
  .pap .file-card{
    align-items:center;
    justify-content:space-between;
    flex-direction:row;
  }
}
.pap .file-left{
  display:flex;
  gap: 12px;
  align-items:center;
}
.pap .file-icon{
  width:48px;
  height:48px;
  border-radius: 16px;
  background: var(--accentSoft);
  color: var(--accent);
  display:flex;
  align-items:center;
  justify-content:center;
  flex-shrink:0;
}
.pap .file-name{
  font-size: 15px;
  font-weight: 800;
  color: var(--text);
}
.pap .file-type{
  margin-top: 2px;
  color: var(--text3);
  font-size: 13px;
}

.pap .award-list{
  display:flex;
  flex-direction:column;
  gap: 0;
}
.pap .award{
  display:grid;
  grid-template-columns: 64px 1fr;
  gap: 14px;
  padding: 18px 0;
  border-top: 1px solid var(--line);
}
.pap .award:first-child{
  border-top:none;
  padding-top: 0;
}
.pap .award-year{
  font-size: 13px;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--accent);
  font-family: 'Inter', sans-serif;
  padding-top: 3px;
}
.pap .award-title{
  font-family:'Cormorant Garamond', serif;
  font-size: 28px;
  line-height:1.1;
  font-weight:700;
  letter-spacing: -0.03em;
  color: var(--text);
}
.pap .award-org{
  margin-top: 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--text3);
}
.pap .award-desc{
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--text2);
}

.pap .contact-list{
  display:flex;
  flex-direction:column;
  gap: 10px;
}
.pap .contact-item{
  display:flex;
  align-items:center;
  gap: 12px;
  text-decoration:none;
  color: var(--text2);
  background: #fff;
  border:1px solid var(--line);
  border-radius: 18px;
  padding: 14px 16px;
  transition: transform .18s ease, background .18s ease, border-color .18s ease;
}
.pap .contact-item:hover{
  transform: translateY(-1px);
  background: #f8fbff;
  border-color: rgba(91,108,255,0.18);
}
.pap .contact-icon{
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: #f8fafc;
  border:1px solid var(--line);
  display:flex;
  align-items:center;
  justify-content:center;
  color: var(--accent);
  flex-shrink:0;
}
.pap .contact-text{
  font-size: 14px;
  font-weight: 600;
  color: var(--text2);
  overflow:hidden;
  text-overflow:ellipsis;
  white-space: nowrap;
}
.pap .social-row{
  display:flex;
  flex-wrap:wrap;
  gap: 8px;
  margin-top: 12px;
}
.pap .social{
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: #fff;
  border:1px solid var(--line);
  display:flex;
  align-items:center;
  justify-content:center;
  text-decoration:none;
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.pap .social:hover{
  transform: translateY(-2px);
  box-shadow: var(--shadow2);
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

.pap .empty{
  padding: 24px;
  color: var(--text3);
  background: #fff;
  border:1px dashed var(--line2);
  border-radius: 22px;
  font-size: 14px;
  line-height: 1.7;
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
.pap .lb-img{
  width:100%;
  max-height: 82vh;
  object-fit: contain;
  border-radius: 16px;
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
    <div className="social-row">
      {socials.map(([key, url]) => {
        const meta = SOCIALS[key];
        return (
          <a
            key={key}
            href={url as string}
            target="_blank"
            rel="noopener noreferrer"
            className="social"
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
    <div className="contact-list">
      <a href={`tel:${artist.phone}`} className="contact-item">
        <div className="contact-icon">
          <Phone size={15} />
        </div>
        <span className="contact-text">{artist.phone}</span>
      </a>

      <a href={`mailto:${artist.email}`} className="contact-item">
        <div className="contact-icon">
          <Mail size={15} />
        </div>
        <span className="contact-text">{artist.email}</span>
      </a>

      <SocialLinks artist={artist} />
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
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
    <section className="section fade-up-1">
      <div className="section-inner">
        <div className="section-head">
          <div className="section-dot" />
          <div className="section-kicker">{kicker}</div>
        </div>
        <h2 className="section-title">{title}</h2>
        {subtitle ? <p className="section-sub">{subtitle}</p> : null}
        {children}
      </div>
    </section>
  );
}

function GuaranteeItem({ text }: { text: string }) {
  return (
    <div className="guarantee">
      <div className="guarantee-badge">
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

  const nameParts = artist?.name?.trim().split(/\s+/) || [];
  const firstName = nameParts[0] || "";
  const restName = nameParts.slice(1).join(" ");

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
                <div className="skeleton" style={{ height: 320, borderRadius: 28 }} />
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
                <Users size={28} />
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
                <div className="hero-actions">
                  <button className="icon-btn" onClick={handleShare} aria-label="Share profile">
                    <Share2 size={16} />
                  </button>
                  <button
                    className="icon-btn"
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
                    {firstName}
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
                        <CheckCircle2 size={12} />
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
                    {artist.rating && artist.rating.average >= 4.5 ? (
                      <div className="verified">
                        <Sparkles size={12} />
                      </div>
                    ) : null}
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
                    <button className="btn btn-soft" onClick={() => router.push(`/artist/profile/${artistId}/merch`)}>
                      <ShoppingBag size={14} />
                      View merch
                    </button>
                    <button className="btn btn-primary" onClick={handleBook}>
                      <Calendar size={14} />
                      {isOrg ? "Book this artist" : "Login to book"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="layout">
            <main className="main">
              <Section
                kicker="About"
                title="Artist overview"
                subtitle="A cleaner, lighter presentation with mobile-first spacing, readable typography, and stronger visual hierarchy."
              >
                {bio ? (
                  <>
                    <p className="section-sub" style={{ marginTop: 0 }}>
                      {bioOpen || !longBio ? bio : `${bio.slice(0, 260)}…`}
                    </p>
                    {longBio ? (
                      <button className="read-more" onClick={() => setBioOpen((v) => !v)}>
                        {bioOpen ? "Read less" : "Read more"}
                        <ChevronRight size={15} style={{ transform: bioOpen ? "rotate(90deg)" : undefined }} />
                      </button>
                    ) : null}
                  </>
                ) : (
                  <EmptyState>No biography is available for this artist yet.</EmptyState>
                )}

                <div className="mini-grid">
                  <div className="mini-card">
                    <div className="mini-label">Specialisation</div>
                    <div className="mini-value">{artist.type}</div>
                  </div>
                  <div className="mini-card">
                    <div className="mini-label">Base price</div>
                    <div className="mini-value success">{priceLabel}</div>
                  </div>
                  <div className="mini-card">
                    <div className="mini-label">Based in</div>
                    <div className="mini-value">{artist.city}</div>
                  </div>
                </div>
              </Section>

              {(galleryPics.length > 0 || videos.length > 0) && (
                <Section
                  kicker="Gallery"
                  title="Photos and performance videos"
                  subtitle="Horizontal media lanes work better on mobile than dense grids, so the layout stays smooth and swipe-friendly."
                >
                  {galleryPics.length > 0 ? (
                    <div className="scroll-row">
                      {galleryPics.map((photo, index) => (
                        <button
                          key={`${photo.url}-${index}`}
                          className="thumb"
                          onClick={() => setLightbox(photo.url)}
                          style={{ padding: 0, border: "none", background: "transparent" }}
                        >
                          <img src={photo.url} alt={photo.caption || `Photo ${index + 1}`} />
                          <div className="thumb-overlay">
                            <div className="thumb-caption">{photo.caption || `Photo ${index + 1}`}</div>
                            <div className="thumb-icon">
                              <ExternalLink size={16} />
                            </div>
                          </div>
                          {photo.isProfileImage && (
                            <div className="absolute top-2 left-2 bg-amber-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                              <Star size={12} /> Profile
                            </div>
                          )}
                          {photo.isCoverImage && (
                            <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                              <Camera size={12} /> Cover
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {galleryPics.length > 0 && videos.length > 0 ? <div className="section-divider" /> : null}

                  {videos.length > 0 ? (
                    <div className="video-grid">
                      {videos.map((video, index) => (
                        <a
                          key={`${video.url}-${index}`}
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="video"
                        >
                          <img
                            src={getVideoThumbnail(
                              video.url,
                              video.platform || "other",
                              video.thumbnail,
                              profileImg
                            )}
                            alt={video.caption || `Video ${index + 1}`}
                          />
                          <div className="video-center">
                            <div className="video-play">
                              <Play size={20} fill="#111827" />
                            </div>
                          </div>
                          {video.caption ? (
                            <div className="video-caption">{video.caption}</div>
                          ) : null}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </Section>
              )}

              {artist.techRider ? (
                <Section
                  kicker="Tech rider"
                  title="Stage and event requirements"
                  subtitle="This section is organized for fast scanning on smaller screens with simple cards and readable blocks."
                >
                  {artist.techRider.soundRequirements ||
                  artist.techRider.lightingRequirements ||
                  artist.techRider.powerRequirements ||
                  artist.techRider.specialNotes ? (
                    <div className="rider-grid">
                      {artist.techRider.soundRequirements ? (
                        <div className="rider-card">
                          <div className="rider-label">
                            <Volume2 size={12} />
                            Sound
                          </div>
                          <div className="rider-text">{artist.techRider.soundRequirements}</div>
                        </div>
                      ) : null}
                      {artist.techRider.lightingRequirements ? (
                        <div className="rider-card">
                          <div className="rider-label">
                            <Sparkles size={12} />
                            Lighting
                          </div>
                          <div className="rider-text">{artist.techRider.lightingRequirements}</div>
                        </div>
                      ) : null}
                      {artist.techRider.powerRequirements ? (
                        <div className="rider-card">
                          <div className="rider-label">
                            <Zap size={12} />
                            Power
                          </div>
                          <div className="rider-text">{artist.techRider.powerRequirements}</div>
                        </div>
                      ) : null}
                      {artist.techRider.specialNotes ? (
                        <div className="rider-card full">
                          <div className="rider-label">
                            <Info size={12} />
                            Special notes
                          </div>
                          <div className="rider-text">{artist.techRider.specialNotes}</div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <EmptyState>No technical details were added to this profile.</EmptyState>
                  )}

                  {artist.techRider.file?.url ? (
                    <div className="file-card">
                      <div className="file-left">
                        <div className="file-icon">
                          <FileText size={20} />
                        </div>
                        <div>
                          <div className="file-name">Tech rider / EPK document</div>
                          <div className="file-type">
                            {artist.techRider.file.fileType === "pdf"
                              ? "PDF document"
                              : "Image file"}
                          </div>
                        </div>
                      </div>

                      <div className="action-stack" style={{ justifyContent: "flex-end" }}>
                        <a
                          href={artist.techRider.file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary"
                          style={{ textDecoration: "none" }}
                        >
                          <ExternalLink size={14} />
                          View
                        </a>
                        <a
                          href={artist.techRider.file.url}
                          download="Tech-Rider-EPK"
                          className="btn btn-primary"
                          style={{ textDecoration: "none" }}
                        >
                          <Download size={14} />
                          Download
                        </a>
                      </div>
                    </div>
                  ) : null}
                </Section>
              ) : null}

              {artist.accolades?.length > 0 ? (
                <Section
                  kicker="Awards"
                  title="Recognition and achievements"
                  subtitle="A vertical timeline format keeps this readable and elegant on both desktop and mobile."
                >
                  <div className="award-list">
                    {artist.accolades.map((award, index) => (
                      <div className="award" key={`${award.title}-${index}`}>
                        <div className="award-year">{award.year}</div>
                        <div>
                          <div className="award-title">{award.title}</div>
                          <div className="award-org">{award.organization}</div>
                          {award.description ? (
                            <div className="award-desc">{award.description}</div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              ) : null}

              <Section
                kicker="Contact"
                title="Get in touch"
                subtitle="Quick contact options remain visible here and in the desktop sidebar for easy access."
              >
                <ContactBlock artist={artist} />
              </Section>
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
                    <button className="btn btn-primary" onClick={handleBook}>
                      <Calendar size={14} />
                      {isOrg ? "Book artist" : "Login to book"}
                    </button>
                    <button
                      className="btn btn-soft"
                      onClick={() => router.push(`/artist/profile/${artistId}/merch`)}
                    >
                      <ShoppingBag size={14} />
                      Explore merch
                    </button>
                  </div>

                  <div className="guarantees">
                    <GuaranteeItem text="Free cancellation within 24 hours" />
                    <GuaranteeItem text="Secure booking process" />
                    <GuaranteeItem text="Verified artist profile" />
                  </div>
                </div>

                <div className="sidebar-card">
                  <div className="sidebar-heading">Contact</div>
                  <div style={{ marginTop: 12 }}>
                    <ContactBlock artist={artist} />
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
                <button
                  className="btn btn-soft"
                  onClick={() => router.push(`/artist/profile/${artistId}/merch`)}
                  aria-label="View merch"
                >
                  <ShoppingBag size={14} />
                </button>
                <button className="btn btn-primary" onClick={handleBook}>
                  <Calendar size={14} />
                  {isOrg ? "Book" : "Login"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 96 }} />

        <Footer />

        <Dialog open={showBook} onOpenChange={setShowBook}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-4 md:p-6">
            <DialogHeader>
              <DialogTitle
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 30,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                }}
              >
                Book {artist.name}
              </DialogTitle>
              <DialogDescription style={{ color: "#64748b", fontSize: 14, lineHeight: 1.7 }}>
                Choose a date and time to request this artist for your event.
              </DialogDescription>
            </DialogHeader>

            {artistBook ? (
              <PublicBookingCalendar artistId={artist._id} artist={artistBook} />
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
          <DialogContent className="max-w-6xl border-0 bg-slate-950/96 p-3 md:p-4 rounded-[20px]">
            {lightbox ? <img src={lightbox} alt="Gallery preview" className="lb-img" /> : null}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
