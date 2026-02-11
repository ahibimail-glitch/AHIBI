"use client";

import { useState, useEffect, useCallback } from "react";
import { Phone, X, MessageCircle, ChevronRight, Sparkles } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface KakiMarketingBranding {
  enabled: boolean;
  message: string;
  contactPhone: string;
}

interface KakiMarketingBannerProps {
  platform: "arenaPartner" | "organizer" | "venue" | "artist";
  className?: string;
  variant?: "default" | "compact" | "minimal";
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

function useBranding(platform: KakiMarketingBannerProps["platform"]) {
  const [branding, setBranding] = useState<KakiMarketingBranding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    fetch(`${apiUrl}/api/system/branding`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success && data.data.enabled && data.data.visibility[platform]) {
          setBranding({
            enabled: true,
            message: data.data.message,
            contactPhone: data.data.contactPhone,
          });
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [platform]);

  return { branding, loading };
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const phoneHref = (p: string) => `tel:${p.replace(/\D/g, "")}`;
const waHref = (p: string) => `https://wa.me/${p.replace(/\D/g, "")}`;

// ─────────────────────────────────────────────────────────────
// Logo
// ─────────────────────────────────────────────────────────────

function Logo({ size = 36 }: { size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="inline-flex items-center justify-center rounded-xl
        bg-gradient-to-br from-orange-500 to-rose-500 shadow-md shrink-0"
    >
      <span
        style={{ fontSize: size * 0.38 }}
        className="font-black text-white leading-none select-none"
      >
        KM
      </span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// CTA Buttons (improved for mobile)
// ─────────────────────────────────────────────────────────────

function CallBtn({
  phone,
  small,
}: {
  phone: string;
  small?: boolean;
}) {
  // w-full on small screens, auto on >= sm
  const base = `flex items-center gap-2 rounded-xl font-semibold
    bg-gradient-to-br from-orange-500 to-rose-500 text-white
    shadow-lg shadow-orange-500/30 hover:-translate-y-0.5
    active:scale-95 transition-all`;
  const size = small ? "text-xs px-3 py-2" : "text-sm px-4 py-2.5";
  return (
    <a
      href={phoneHref(phone)}
      className={`${base} ${size} w-full sm:w-auto justify-center sm:justify-center`}
      aria-label={`Call ${phone}`}
    >
      <Phone className={small ? "w-3.5 h-3.5" : "w-4 h-4"} />
      Call
    </a>
  );
}

function WhatsAppBtn({
  phone,
  small,
}: {
  phone: string;
  small?: boolean;
}) {
  const base = `flex items-center gap-2 rounded-xl font-semibold
    bg-emerald-50 text-emerald-700 border border-emerald-200
    hover:-translate-y-0.5 active:scale-95 transition-all`;
  const size = small ? "text-xs px-3 py-2" : "text-sm px-4 py-2.5";
  return (
    <a
      href={waHref(phone)}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} ${size} w-full sm:w-auto justify-center sm:justify-center`}
      aria-label={`Message ${phone} on WhatsApp`}
    >
      <MessageCircle className={small ? "w-3.5 h-3.5" : "w-4 h-4"} />
      WhatsApp
    </a>
  );
}

// ─────────────────────────────────────────────────────────────
// Default Banner (FIXED)
// ─────────────────────────────────────────────────────────────

export default function KakiMarketingBanner({
  platform,
  className = "",
  variant = "default",
}: KakiMarketingBannerProps) {
  const { branding, loading } = useBranding(platform);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!loading && branding) requestAnimationFrame(() => setVisible(true));
  }, [loading, branding]);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => setDismissed(true), 250);
  }, []);

  if (loading || dismissed || !branding?.enabled) return null;

  if (variant === "compact")
    return <KakiMarketingCompact platform={platform} className={className} />;
  if (variant === "minimal")
    return <KakiMarketingMinimal platform={platform} className={className} />;

  return (
    <div
      className={`relative rounded-2xl border border-orange-100
        bg-gradient-to-br from-white via-orange-50 to-amber-50
        shadow-xl shadow-orange-100/60 transition-all duration-300
        max-w-full
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}
        ${className}`}
      role="region"
      aria-label="Marketing Partner banner"
    >
      <div className="flex flex-col sm:flex-row gap-4 p-4 sm:p-5">
        {/* Left: logo + text */}
        <div className="flex gap-3 flex-1 min-w-0">
          <Logo size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500">
                Marketing Partner
              </span>
              <Sparkles className="w-3 h-3 text-amber-400" />
            </div>

            {/* Better mobile clamp: allow 3 lines on very small screens, 2 on sm+ */}
            <p
              className="text-sm text-gray-800 leading-relaxed
                line-clamp-3 sm:line-clamp-2 min-w-0 break-words"
            >
              {branding.message}
            </p>

            {/* mobile-visible phone */}
            <a
              href={phoneHref(branding.contactPhone)}
              className="mt-2 inline-flex items-center gap-1 text-sm
                font-semibold text-orange-500 sm:hidden"
              aria-label={`Call ${branding.contactPhone}`}
            >
              <Phone className="w-4 h-4" />
              {branding.contactPhone}
            </a>
          </div>
        </div>

        {/* Right: CTAs — on mobile these stack and are full width */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:ml-auto w-full sm:w-auto">
          {/* phone label shown on sm+ (desktop/tablet) */}
          <span className="hidden sm:flex text-xs text-gray-400 gap-1 items-center mr-2">
            <Phone className="w-3.5 h-3.5 text-orange-400" />
            {branding.contactPhone}
          </span>

          {/* Buttons container: mobile => full width buttons stacked; sm => inline */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <CallBtn phone={branding.contactPhone} />
            <WhatsAppBtn phone={branding.contactPhone} />
          </div>
        </div>
      </div>

      <button
        onClick={dismiss}
        className="absolute top-1 right-1 p-5.5 rounded-lg
          text-gray-400 hover:text-gray-600 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-orange-200"
        aria-label="Dismiss marketing banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Compact (FIXED) — improved mobile layout
// ─────────────────────────────────────────────────────────────

export function KakiMarketingCompact({
  platform,
  className = "",
}: KakiMarketingBannerProps) {
  const { branding, loading } = useBranding(platform);
  const [dismissed, setDismissed] = useState(false);

  if (loading || dismissed || !branding?.enabled) return null;

  return (
    <div>
      <div
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5
        bg-orange-50 border border-orange-200 ${className}`}
      >
        <Logo size={30} />

        {/* message truncates on wider screens; on very small screens it wraps cleanly */}
        <p className="text-xs text-gray-700 flex-1 min-w-0 sm:truncate">
          {branding.message}
        </p>

        <button
          onClick={() => setDismissed(true)}
          className="p-2 text-gray-400"
          aria-label="Dismiss compact marketing"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* stacked full-width CTAs for compact usage on mobile */}
      <div className="mt-2 flex flex-col gap-2">
        <CallBtn phone={branding.contactPhone} small />
        <WhatsAppBtn phone={branding.contactPhone} small />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Minimal (FIXED) — keep compact touch targets on mobile
// ─────────────────────────────────────────────────────────────

export function KakiMarketingMinimal({
  platform,
  className = "",
}: KakiMarketingBannerProps) {
  const { branding, loading } = useBranding(platform);

  if (loading || !branding?.enabled) return null;

  return (
    <div
      className={`flex items-center justify-between gap-3
      px-4 py-2.5 rounded-xl bg-white border shadow-sm ${className}`}
      role="region"
      aria-label="Minimal marketing"
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <Logo size={26} />
        <p className="text-xs text-gray-600 line-clamp-2 min-w-0">
          {branding.message}
        </p>
      </div>

      <a
        href={phoneHref(branding.contactPhone)}
        className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-orange-500"
        aria-label={`Call ${branding.contactPhone}`}
      >
        <Phone className="w-3.5 h-3.5" />
        {branding.contactPhone}
        <ChevronRight className="w-3 h-3" />
      </a>

      {/* For mobile show a tappable button instead */}
      <div className="sm:hidden w-1/3">
        <CallBtn phone={branding.contactPhone} small />
      </div>
    </div>
  );
}
