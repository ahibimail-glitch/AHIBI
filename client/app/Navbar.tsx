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
  Menu,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
  const LOCAL_STORAGE_KEY = "ahibi:userLocation";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth({ redirectPath: null });
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
    city: string;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationSuccess, setLocationSuccess] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));
    const syncLogin = () => setIsLoggedIn(!!localStorage.getItem("token"));
    window.addEventListener("storage", syncLogin);
    return () => window.removeEventListener("storage", syncLogin);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileMenuOpen]);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobileMenuOpen]);

  const getAddressFromCoordinates = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      const data = await response.json();
      const city = data.city || data.locality || data.principalSubdivision || "Unknown City";
      const fullAddress = data.display_name || `${city}, ${data.countryName || ""}`;
      return { city, fullAddress };
    } catch (error) {
      console.error("Error getting address:", error);
      return { city: "Location Detected", fullAddress: "Location Detected" };
    }
  };

  const saveLocationToBackend = async (locationData: {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
  }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const response = await fetch("/api/auth/update-location", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(locationData),
      });
      if (!response.ok) console.error("Failed to save location:", response.statusText);
    } catch (error) {
      console.error("Error saving location:", error);
    }
  };

  const detectLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }
    setLocationLoading(true);
    setLocationError(null);
    setLocationSuccess(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const { city, fullAddress } = await getAddressFromCoordinates(latitude, longitude);
        const locationData = { latitude, longitude, address: fullAddress, city };
        setUserLocation(locationData);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(locationData));
        } catch (err) {
          console.error("Failed to cache location", err);
        }
        setLocationLoading(false);
        setLocationSuccess(true);
        if (isAuthenticated && user) await saveLocationToBackend(locationData);
        setTimeout(() => {
          setLocationDialogOpen(false);
          setLocationSuccess(false);
        }, 2000);
      },
      (error) => {
        setLocationLoading(false);
        setLocationSuccess(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location permission denied. Please enable location access in your browser settings.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information is unavailable. Please try again.");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out. Please try again.");
            break;
          default:
            setLocationError("An error occurred while detecting your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedLocation = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedLocation) {
      try {
        const parsed = JSON.parse(storedLocation);
        if (parsed?.latitude && parsed?.longitude && parsed?.address) setUserLocation(parsed);
      } catch (err) {
        console.warn("Invalid cached location", err);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.location?.coordinates?.length === 2) {
      const [longitude, latitude] = user.location.coordinates;
      const payload = {
        latitude,
        longitude,
        address: user.address || "Location saved",
        city: user.city || "Your City",
      };
      setUserLocation(payload);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
      } catch (err) {
        console.error("Failed to cache user location", err);
      }
    }
  }, [isAuthenticated, user]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    window.location.href = "/auth";
  };

  const isActive = (path: string) => pathname === path;

  const navLinks = [
    { href: "/events", label: "Events" },
    { href: "/sports", label: "Sports" },
    { href: "/allArtists", label: "Artists" },
    { href: "/allVenues", label: "Venues" },
    { href: "/allOrganizers", label: "Organizers" },
    { href: "/about", label: "About" },
    {href:"/sports/tournaments",label:"Tournament Registration"}
  ];

  const LocationButton = ({ isMobile = false }: { isMobile?: boolean }) => (
    <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
      <DialogTrigger asChild>
        <button
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all duration-200 active:scale-95 max-w-[180px] ${
            isMobile ? "w-full justify-between" : ""
          }`}
          aria-label="Select location"
        >
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-[#ff0e0e] flex-shrink-0" />
            <span className="text-sm font-medium text-gray-800 truncate max-w-[120px]">
              {userLocation?.city || "Location"}
            </span>
          </div>
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
                <div className="flex-1">
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
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Detecting Location...</span>
              </>
            ) : (
              <>
                <Navigation className="h-5 w-5" />
                <span>{userLocation ? "Update Location" : "Detect My Location"}</span>
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 text-center">
            Your browser will ask for permission to access your location
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      {/* ─── Unified Navbar (Desktop + Mobile) ─── */}
      <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 md:px-6 py-2 md:py-2">
          <div className="flex items-center justify-between gap-4">

            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <img
                src="/images/LogoB.png"
                alt="Ahibi logo"
                className="h-6 md:h-10 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity"
              />
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center space-x-7 text-[#1C1C1C] font-medium text-[15px]">
              {navLinks.map(({ href, label }) => (
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

            {/* Right Side Controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Location Button — all screen sizes */}
              <div className="flex-shrink-0">
                <LocationButton />
              </div>

              {/* Desktop Auth Buttons — lg and above only */}
              <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
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

              {/* Hamburger — visible below lg (mobile + tablet) */}
              <button
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                className="lg:hidden flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all duration-200 active:scale-95"
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5 text-gray-700" />
                ) : (
                  <Menu className="h-5 w-5 text-gray-700" />
                )}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* ─── Mobile Slide-down Menu ─── */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-all duration-300 ${
          isMobileMenuOpen ? "visible" : "invisible"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
            isMobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Drawer Panel */}
        <div
          ref={mobileMenuRef}
          className={`absolute top-0 right-0 h-full w-[280px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
              <img
                src="/images/LogoB.png"
                alt="Ahibi logo"
                className="h-6 w-auto object-contain"
              />
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Nav Links */}
          <div className="flex-1 overflow-y-auto py-3">
            <ul className="space-y-0.5 px-3">
              {navLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 rounded-lg text-[15px] font-medium transition-all duration-150 ${
                      isActive(href)
                        ? "bg-red-50 text-[#ff0e0e]"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {isActive(href) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ff0e0e] mr-2.5 flex-shrink-0" />
                    )}
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Divider */}
            <div className="mx-5 my-4 border-t border-gray-100" />

            {/* Auth Section */}
            <div className="px-4 space-y-2">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center w-full px-4 py-3 rounded-lg text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-all duration-150"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full px-4 py-3 bg-[#ff0e0e] hover:bg-[#e60000] text-white font-semibold rounded-xl transition-all duration-200 active:scale-95 shadow-md text-[15px]"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                  <button className="w-full px-4 py-3 bg-[#ff0e0e] hover:bg-[#e60000] text-white font-semibold rounded-xl transition-all duration-200 active:scale-95 shadow-md text-[15px]">
                    Login / Sign Up
                  </button>
                </Link>
              )}
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="px-5 py-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">© {new Date().getFullYear()} Ahibi</p>
          </div>
        </div>
      </div>
    </>
  );
}