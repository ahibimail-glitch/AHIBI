"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Home, Film, Ticket, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));

    const syncLogin = () => setIsLoggedIn(!!localStorage.getItem("token"));
    window.addEventListener("storage", syncLogin);
    return () => window.removeEventListener("storage", syncLogin);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    window.location.href = "/auth";
  };

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* Desktop Navbar - Top */}
      <header className="hidden md:block w-full bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <img
              src="/images/LogoB.png"
              alt="Ahibi logo"
              className="h-9 w-auto object-contain cursor-pointer"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="flex items-center space-x-8 text-[#1C1C1C] font-medium">
            <Link href="/events" className="hover:text-[#ff0e0e] transition">Events</Link>
            <Link href="/sports" className="hover:text-[#ff0e0e] transition">Sports</Link>
            <Link href="/allArtists" className="hover:text-[#ff0e0e] transition">Artists</Link>
            <Link href="/allVenues" className="hover:text-[#ff0e0e] transition">Venues</Link>
            <Link href="/allOrganizers" className="hover:text-[#ff0e0e] transition">Organizers</Link>
            <Link href="/about" className="hover:text-[#ff0e0e] transition">About</Link>
          </div>

          {/* Desktop Buttons */}
          <div className="flex items-center space-x-4">
            {isLoggedIn && (
              <Link href="/profile">
                <Button className="rounded-full px-5 bg-gray-100 hover:bg-gray-200 text-[#1C1C1C] font-medium border border-gray-300">
                  Dashboard
                </Button>
              </Link>
            )}

            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="bg-[#ff0e0e] hover:bg-[#e60000] text-white px-6 py-2 rounded-full font-medium shadow"
              >
                Logout
              </button>
            ) : (
              <Link href="/auth">
                <button className="bg-[#ff0e0e] hover:bg-[#e60000] text-white px-6 py-2 rounded-full font-medium shadow">
                  Login
                </button>
              </Link>
            )}
          </div>
        </nav>
      </header>

      {/* Mobile Navbar - Top (Logo only) */}
      <header className="md:hidden w-full sticky top-0 z-50 border-b border-white/20
  bg-white/70 backdrop-blur-md shadow-sm">
        <nav className="px-4 py-3 flex items-center justify-center">
          <Link href="/">
            <img
              src="/images/LogoB.png"
              alt="Ahibi logo"
              className="h-8 w-auto object-contain cursor-pointer"
            />
          </Link>
        </nav>
      </header>


      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg">
        <div className="grid grid-cols-4 h-16">
          {/* Home */}
          <Link
            href="/"
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${isActive("/") ? "text-[#ff0e0e]" : "text-gray-600"
              }`}
          >
            <Home className="h-6 w-6" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>

          {/* Events (Movies) */}
          <Link
            href="/events"
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${isActive("/events") || pathname?.startsWith("/events") ? "text-[#ff0e0e]" : "text-gray-600"
              }`}
          >
            <Film className="h-6 w-6" />
            <span className="text-[10px] font-medium">Events</span>
          </Link>

          {/* Live Events (Sports) */}
          <Link
            href="/sports"
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${isActive("/sports") || pathname?.startsWith("/sports") ? "text-[#ff0e0e]" : "text-gray-600"
              }`}
          >
            <Ticket className="h-6 w-6" />
            <span className="text-[10px] font-medium">Sports</span>
          </Link>

          {/* Profile */}
          <Link
            href={isLoggedIn ? "/profile" : "/auth"}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${isActive("/profile") || isActive("/auth") || pathname?.startsWith("/profile") ? "text-[#ff0e0e]" : "text-gray-600"
              }`}
          >
            <User className="h-6 w-6" />
            <span className="text-[10px] font-medium">Profile</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
