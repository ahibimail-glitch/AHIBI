"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  X,
  MapPin,
  Navigation,
  Loader2,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  Trophy,
  Mic2,
  Building2,
  MoreHorizontal,
  Users,
  Info,
  ClipboardList,
  UserCircle2,
  LogOut,
  LogIn,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

// ─── Bottom nav primary tabs (5 max) ───────────────────────────────────────
const primaryNavLinks = [
  { href: "/events",    label: "Events",  Icon: CalendarDays },
  { href: "/sports",    label: "Sports",  Icon: Trophy       },
  { href: "/allArtists",label: "Artists", Icon: Mic2         },
  { href: "/allVenues", label: "Venues",  Icon: Building2    },
];

// ─── Overflow links shown in "More" drawer ─────────────────────────────────
const moreNavLinks = [
  { href: "/allOrganizers",        label: "Organizers",             Icon: Users        },
  { href: "/about",                label: "About",                  Icon: Info         },
  { href: "/sports/tournaments",   label: "Tournament Registration", Icon: ClipboardList },
];

export default function Navbar() {
  const LOCAL_STORAGE_KEY = "ahibi:userLocation";

  const [isMoreOpen,          setIsMoreOpen]          = useState(false);
  const [isLoggedIn,          setIsLoggedIn]          = useState(false);
  const [locationDialogOpen,  setLocationDialogOpen]  = useState(false);

  const pathname      = usePathname();
  const moreDrawerRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated } = useAuth({ redirectPath: null });

  const [userLocation, setUserLocation] = useState<{
    latitude: number; longitude: number; address: string; city: string;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError,   setLocationError]   = useState<string | null>(null);
  const [locationSuccess, setLocationSuccess] = useState(false);

  // ── Auth sync ────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));
    const syncLogin = () => setIsLoggedIn(!!localStorage.getItem("token"));
    window.addEventListener("storage", syncLogin);
    return () => window.removeEventListener("storage", syncLogin);
  }, []);

  // ── Close "More" drawer on route change ──────────────────────────────────
  useEffect(() => { setIsMoreOpen(false); }, [pathname]);

  // ── Close "More" drawer on outside click ─────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreDrawerRef.current && !moreDrawerRef.current.contains(e.target as Node))
        setIsMoreOpen(false);
    };
    if (isMoreOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isMoreOpen]);

  // ── Lock scroll when "More" drawer is open ───────────────────────────────
  useEffect(() => {
    document.body.style.overflow = isMoreOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMoreOpen]);

  // ── Geocoding ────────────────────────────────────────────────────────────
  const getAddressFromCoordinates = async (lat: number, lng: number) => {
    try {
      const res  = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      const data = await res.json();
      const city = data.city || data.locality || data.principalSubdivision || "Unknown City";
      return { city, fullAddress: data.display_name || `${city}, ${data.countryName || ""}` };
    } catch {
      return { city: "Location Detected", fullAddress: "Location Detected" };
    }
  };

  const saveLocationToBackend = async (locationData: {
    latitude: number; longitude: number; address: string; city: string;
  }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch("/api/auth/update-location", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(locationData),
      });
      if (!res.ok) console.error("Failed to save location:", res.statusText);
    } catch (err) { console.error("Error saving location:", err); }
  };

  const detectLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser"); return;
    }
    setLocationLoading(true); setLocationError(null); setLocationSuccess(false);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const { city, fullAddress }   = await getAddressFromCoordinates(latitude, longitude);
        const locationData            = { latitude, longitude, address: fullAddress, city };
        setUserLocation(locationData);
        try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(locationData)); } catch {}
        setLocationLoading(false); setLocationSuccess(true);
        if (isAuthenticated && user) await saveLocationToBackend(locationData);
        setTimeout(() => { setLocationDialogOpen(false); setLocationSuccess(false); }, 2000);
      },
      (error) => {
        setLocationLoading(false); setLocationSuccess(false);
        const msgs: Record<number, string> = {
          1: "Location permission denied. Please enable location access in your browser settings.",
          2: "Location information is unavailable. Please try again.",
          3: "Location request timed out. Please try again.",
        };
        setLocationError(msgs[error.code] || "An error occurred while detecting your location.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  // ── Restore cached location ───────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.latitude && parsed?.longitude && parsed?.address) setUserLocation(parsed);
      }
    } catch { localStorage.removeItem(LOCAL_STORAGE_KEY); }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.location?.coordinates?.length === 2) {
      const [longitude, latitude] = user.location.coordinates;
      const payload = { latitude, longitude, address: user.address || "Location saved", city: user.city || "Your City" };
      setUserLocation(payload);
      try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload)); } catch {}
    }
  }, [isAuthenticated, user]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    window.location.href = "/auth";
  };

  const isActive = (href: string) => pathname === href;

  // ── Helpers to determine if any overflow link is active ──────────────────
  const isMoreActive = moreNavLinks.some(({ href }) => isActive(href));

  // ─────────────────────────────────────────────────────────────────────────
  // Location Dialog (shared)
  // ─────────────────────────────────────────────────────────────────────────
  const LocationButton = () => (
    <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all duration-200 active:scale-95 max-w-[180px]"
          aria-label="Select location"
        >
          <MapPin className="h-4 w-4 text-[#ff0e0e] flex-shrink-0" />
          <span className="text-sm font-medium text-gray-800 truncate max-w-[110px]">
            {userLocation?.city || "Location"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MapPin className="h-5 w-5 text-[#ff0e0e]" />
            Set Your Location
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            We'll use your location to show events and venues near you
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {userLocation && !locationLoading && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-green-900 mb-1">Current Location</h4>
                  <p className="text-sm text-green-800 font-medium">{userLocation.city}</p>
                  <p className="text-xs text-green-700 mt-1">{userLocation.address}</p>
                </div>
              </div>
            </div>
          )}
          {locationError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-red-900 mb-1">Location Error</h4>
                  <p className="text-xs text-red-700">{locationError}</p>
                </div>
              </div>
            </div>
          )}
          {locationSuccess && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                <p className="text-sm font-medium text-blue-900">Location updated successfully!</p>
              </div>
            </div>
          )}
          <button
            onClick={detectLocation}
            disabled={locationLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-[#ff0e0e] hover:bg-[#e60000] text-white font-semibold rounded-lg transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed active:scale-95 shadow-md hover:shadow-lg"
          >
            {locationLoading ? (
              <><Loader2 className="h-5 w-5 animate-spin" /><span>Detecting Location...</span></>
            ) : (
              <><Navigation className="h-5 w-5" /><span>{userLocation ? "Update Location" : "Detect My Location"}</span></>
            )}
          </button>
          <p className="text-xs text-gray-500 text-center">
            Your browser will ask for permission to access your location
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════
          TOP HEADER — sticky, full-width
      ══════════════════════════════════════════════════════════════════ */}
      <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 md:px-6 py-2">
          <div className="flex items-center justify-between gap-4">

            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <img
                src="/images/LogoB.png"
                alt="Ahibi logo"
                className="h-8 md:h-10 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity"
              />
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center space-x-7 text-[#1C1C1C] font-medium text-[15px]">
              {[...primaryNavLinks, ...moreNavLinks].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`hover:text-[#ff0e0e] transition-colors duration-200 ${
                    isActive(href) ? "text-[#ff0e0e] font-semibold" : ""
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Location — all sizes */}
              <LocationButton />

              {/* Desktop auth — lg+ only */}
              <div className="hidden lg:flex items-center gap-2">
                {isLoggedIn && (
                  <Link href="/profile">
                    <Button className="rounded-full px-5 py-2 bg-gray-100 hover:bg-gray-200 text-[#1C1C1C] font-medium border border-gray-300 transition-all duration-200 text-sm">
                      Dashboard
                    </Button>
                  </Link>
                )}
                {isLoggedIn ? (
                  <button
                    onClick={handleLogout}
                    className="bg-[#ff0e0e] hover:bg-[#e60000] text-white px-5 py-2 rounded-full font-medium text-sm shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    Logout
                  </button>
                ) : (
                  <Link href="/auth">
                    <button className="bg-[#ff0e0e] hover:bg-[#e60000] text-white px-5 py-2 rounded-full font-medium text-sm shadow-md hover:shadow-lg transition-all duration-200">
                      Login
                    </button>
                  </Link>
                )}
              </div>

              {/* Mobile auth icon — visible below lg */}
              <div className="flex lg:hidden items-center">
                {isLoggedIn ? (
                  <Link href="/profile" aria-label="Dashboard">
                    <button className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all duration-200 active:scale-95">
                      <UserCircle2 className="h-5 w-5 text-gray-700" />
                    </button>
                  </Link>
                ) : (
                  <Link href="/auth" aria-label="Login">
                    <button className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#ff0e0e] hover:bg-[#e60000] text-white transition-all duration-200 active:scale-95 shadow-sm">
                      <LogIn className="h-4.5 w-4.5" />
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* ══════════════════════════════════════════════════════════════════
          MOBILE BOTTOM NAV BAR — fixed, visible below lg
      ══════════════════════════════════════════════════════════════════ */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        aria-label="Bottom navigation"
      >
        <ul className="flex items-stretch h-16">
          {/* Primary links */}
          {primaryNavLinks.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  className={`flex flex-col items-center justify-center h-full gap-0.5 transition-colors duration-150 ${
                    active ? "text-[#ff0e0e]" : "text-gray-500 hover:text-gray-800"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="relative">
                    <Icon
                      className={`h-5 w-5 transition-transform duration-200 ${active ? "scale-110" : ""}`}
                      strokeWidth={active ? 2.2 : 1.8}
                    />
                    {active && (
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#ff0e0e]" />
                    )}
                  </span>
                  <span className={`text-[10px] font-medium leading-none ${active ? "font-semibold" : ""}`}>
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}

          {/* "More" tab */}
          <li className="flex-1">
            <button
              onClick={() => setIsMoreOpen((v) => !v)}
              className={`flex flex-col items-center justify-center h-full w-full gap-0.5 transition-colors duration-150 ${
                isMoreActive || isMoreOpen ? "text-[#ff0e0e]" : "text-gray-500 hover:text-gray-800"
              }`}
              aria-label="More navigation options"
              aria-expanded={isMoreOpen}
            >
              <MoreHorizontal
                className={`h-5 w-5 transition-transform duration-200 ${isMoreOpen ? "rotate-90 scale-110" : ""}`}
                strokeWidth={isMoreActive || isMoreOpen ? 2.2 : 1.8}
              />
              <span className={`text-[10px] font-medium leading-none ${isMoreActive || isMoreOpen ? "font-semibold" : ""}`}>
                More
              </span>
            </button>
          </li>
        </ul>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════
          "More" BOTTOM SHEET — slides up from bottom nav bar
      ══════════════════════════════════════════════════════════════════ */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-all duration-300 ${
          isMoreOpen ? "visible" : "invisible"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
            isMoreOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsMoreOpen(false)}
        />

        {/* Sheet — slides up from above the bottom nav */}
        <div
          ref={moreDrawerRef}
          className={`absolute bottom-16 inset-x-0 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${
            isMoreOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <span className="w-10 h-1 rounded-full bg-gray-300" />
          </div>

          <div className="px-4 pt-2 pb-6 space-y-1">
            {/* Overflow nav links */}
            {moreNavLinks.map(({ href, label, Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMoreOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium transition-all duration-150 ${
                    active
                      ? "bg-red-50 text-[#ff0e0e]"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 flex-shrink-0 ${active ? "text-[#ff0e0e]" : "text-gray-400"}`}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  <span>{label}</span>
                  {active && <span className="ml-auto w-2 h-2 rounded-full bg-[#ff0e0e]" />}
                </Link>
              );
            })}

            {/* Divider */}
            <div className="border-t border-gray-100 my-2" />

            {/* Auth row */}
            {isLoggedIn ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setIsMoreOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-all duration-150"
                >
                  <UserCircle2 className="h-5 w-5 flex-shrink-0 text-gray-400" strokeWidth={1.8} />
                  <span>Dashboard</span>
                </Link>
                <button
                  onClick={() => { setIsMoreOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-semibold text-[#ff0e0e] hover:bg-red-50 transition-all duration-150"
                >
                  <LogOut className="h-5 w-5 flex-shrink-0" strokeWidth={1.8} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <Link href="/auth" onClick={() => setIsMoreOpen(false)}>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-[#ff0e0e] hover:bg-[#e60000] text-white font-semibold rounded-xl transition-all duration-200 active:scale-95 shadow-md text-[15px]">
                  <LogIn className="h-5 w-5" strokeWidth={1.8} />
                  <span>Login / Sign Up</span>
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Spacer so page content isn't hidden behind bottom nav on mobile ── */}
      <div className="lg:hidden h-16" aria-hidden="true" />
    </>
  );
}
