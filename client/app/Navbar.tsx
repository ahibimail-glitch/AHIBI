"use client";

import React, { useState, useEffect } from "react";
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
  Menu,
  X,
  Home,
  Film,
  Ticket,
  User,
  Building,
  MapPin,
  Navigation,
  Loader2,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
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
  const { user, isAuthenticated } = useAuth();

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

  const getAddressFromCoordinates = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      const data = await response.json();
      const city = data.city || data.locality || data.principalSubdivision || "Unknown City";
      const fullAddress = data.display_name || `${city}, ${data.countryName || ""}`;
      
      return {
        city,
        fullAddress,
      };
    } catch (error) {
      console.error("Error getting address:", error);
      return {
        city: "Location Detected",
        fullAddress: "Location Detected",
      };
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

      if (!response.ok) {
        console.error("Failed to save location:", response.statusText);
      }
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

        const locationData = {
          latitude,
          longitude,
          address: fullAddress,
          city,
        };

        setUserLocation(locationData);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(locationData));
        } catch (err) {
          console.error("Failed to cache location", err);
        }
        setLocationLoading(false);
        setLocationSuccess(true);

        if (isAuthenticated && user) {
          await saveLocationToBackend(locationData);
        }

        // Auto-close dialog after 2 seconds on success
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
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedLocation = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedLocation) {
      try {
        const parsed = JSON.parse(storedLocation);
        if (parsed?.latitude && parsed?.longitude && parsed?.address) {
          setUserLocation(parsed);
        }
      } catch (err) {
        console.warn("Invalid cached location", err);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.location?.coordinates?.length === 2) {
      const [longitude, latitude] = user.location.coordinates;
      setUserLocation({
        latitude,
        longitude,
        address: user.address || "Location saved",
        city: user.city || "Your City",
      });
      const payload = {
        latitude,
        longitude,
        address: user.address || "Location saved",
        city: user.city || "Your City",
      };
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

  // Location Button Component
  const LocationButton = ({ isMobile = false }: { isMobile?: boolean }) => (
    <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
      <DialogTrigger asChild>
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-all duration-200 active:scale-95 ${
            isMobile ? "w-full justify-between" : ""
          }`}
          aria-label="Select location"
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#ff0e0e]" />
            <span className="text-sm font-medium text-gray-900">
              {userLocation?.city || "Select Location"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-600" />
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
          {/* Current Location Display */}
          {userLocation && !locationLoading && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-green-900 mb-1">
                    Current Location
                  </h4>
                  <p className="text-sm text-green-800 font-medium">{userLocation.city}</p>
                  <p className="text-xs text-green-700 mt-1">{userLocation.address}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {locationError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-900 mb-1">
                    Location Error
                  </h4>
                  <p className="text-xs text-red-700">{locationError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {locationSuccess && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                <p className="text-sm font-medium text-blue-900">
                  Location updated successfully!
                </p>
              </div>
            </div>
          )}

          {/* Detect Location Button */}
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

          {/* Info Text */}
          <p className="text-xs text-gray-500 text-center">
            Your browser will ask for permission to access your location
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      {/* Desktop Navbar - Top */}
      <header className="hidden md:block w-full bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <nav className="max-w-7xl mx-auto px-6 py-2">
          <div className="flex items-center justify-between gap-8">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <img
                src="/images/LogoB.png"
                alt="Ahibi logo"
                className="h-10 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity"
              />
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center space-x-8 text-[#1C1C1C] font-medium text-[15px]">
              <Link href="/events" className="hover:text-[#ff0e0e] transition-colors duration-200">
                Events
              </Link>
              <Link href="/sports" className="hover:text-[#ff0e0e] transition-colors duration-200">
                Sports
              </Link>
              <Link href="/allArtists" className="hover:text-[#ff0e0e] transition-colors duration-200">
                Artists
              </Link>
              <Link href="/allVenues" className="hover:text-[#ff0e0e] transition-colors duration-200">
                Venues
              </Link>
              <Link href="/allOrganizers" className="hover:text-[#ff0e0e] transition-colors duration-200">
                Organizers
              </Link>
              <Link href="/about" className="hover:text-[#ff0e0e] transition-colors duration-200">
                About
              </Link>
            </div>

            {/* Location Button - Desktop */}
            <div className="flex-shrink-0">
              <LocationButton />
            </div>

            {/* Desktop Buttons */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              {isLoggedIn && (
                <Link href="/profile">
                  <Button className="rounded-full px-6 py-2 bg-gray-100 hover:bg-gray-200 text-[#1C1C1C] font-medium border border-gray-300 transition-all duration-200">
                    Dashboard
                  </Button>
                </Link>
              )}

              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="bg-[#ff0e0e] hover:bg-[#e60000] text-white px-6 py-2 rounded-full font-medium shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Logout
                </button>
              ) : (
                <Link href="/auth">
                  <button className="bg-[#ff0e0e] hover:bg-[#e60000] text-white px-6 py-2 rounded-full font-medium shadow-md hover:shadow-lg transition-all duration-200">
                    Login
                  </button>
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Header - Top */}
      <header className="md:hidden w-full sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        {/* Logo and Location Row */}
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex-shrink-0">
            <img
              src="/images/LogoB.png"
              alt="Ahibi logo"
              className="h-8 w-auto object-contain cursor-pointer"
            />
          </Link>

          {/* Location Button - Mobile */}
          <div className="flex-1 max-w-[200px]">
            <LocationButton isMobile />
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg safe-area-bottom">
        <div className="grid grid-cols-5 h-16">
          {/* Home */}
          <Link
            href="/"
            className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95 ${
              isActive("/") ? "text-[#ff0e0e]" : "text-gray-600"
            }`}
          >
            <Home className={`h-6 w-6 ${isActive("/") ? "stroke-[2.5]" : "stroke-2"}`} />
            <span className={`text-[10px] font-medium ${isActive("/") ? "font-semibold" : ""}`}>
              Home
            </span>
          </Link>

          {/* Events */}
          <Link
            href="/events"
            className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95 ${
              isActive("/events") || pathname?.startsWith("/events")
                ? "text-[#ff0e0e]"
                : "text-gray-600"
            }`}
          >
            <Film
              className={`h-6 w-6 ${
                isActive("/events") || pathname?.startsWith("/events") ? "stroke-[2.5]" : "stroke-2"
              }`}
            />
            <span
              className={`text-[10px] font-medium ${
                isActive("/events") || pathname?.startsWith("/events") ? "font-semibold" : ""
              }`}
            >
              Events
            </span>
          </Link>

          {/* Venues */}
          <Link
            href="/allVenues"
            className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95 ${
              isActive("/allVenues") || pathname?.startsWith("/allVenues")
                ? "text-[#ff0e0e]"
                : "text-gray-600"
            }`}
          >
            <Building
              className={`h-6 w-6 ${
                isActive("/allVenues") || pathname?.startsWith("/allVenues")
                  ? "stroke-[2.5]"
                  : "stroke-2"
              }`}
            />
            <span
              className={`text-[10px] font-medium ${
                isActive("/allVenues") || pathname?.startsWith("/allVenues") ? "font-semibold" : ""
              }`}
            >
              Venues
            </span>
          </Link>

          {/* Sports */}
          <Link
            href="/sports"
            className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95 ${
              isActive("/sports") || pathname?.startsWith("/sports")
                ? "text-[#ff0e0e]"
                : "text-gray-600"
            }`}
          >
            <Ticket
              className={`h-6 w-6 ${
                isActive("/sports") || pathname?.startsWith("/sports") ? "stroke-[2.5]" : "stroke-2"
              }`}
            />
            <span
              className={`text-[10px] font-medium ${
                isActive("/sports") || pathname?.startsWith("/sports") ? "font-semibold" : ""
              }`}
            >
              Sports
            </span>
          </Link>

          {/* Profile */}
          <Link
            href={isLoggedIn ? "/profile" : "/auth"}
            className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95 ${
              isActive("/profile") || isActive("/auth") || pathname?.startsWith("/profile")
                ? "text-[#ff0e0e]"
                : "text-gray-600"
            }`}
          >
            <User
              className={`h-6 w-6 ${
                isActive("/profile") || isActive("/auth") || pathname?.startsWith("/profile")
                  ? "stroke-[2.5]"
                  : "stroke-2"
              }`}
            />
            <span
              className={`text-[10px] font-medium ${
                isActive("/profile") || isActive("/auth") || pathname?.startsWith("/profile")
                  ? "font-semibold"
                  : ""
              }`}
            >
              Profile
            </span>
          </Link>
        </div>
      </nav>

      {/* Add padding to bottom of page on mobile to account for fixed navbar */}
      <style jsx global>{`
        @media (max-width: 768px) {
          body {
            padding-bottom: 64px;
          }
        }
      `}</style>
    </>
  );
}