"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

  return (
    <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
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
        <div className="hidden md:flex items-center space-x-8 text-[#1C1C1C] font-medium">
          <Link href="/events" className="hover:text-[#EF4F5F] transition">Events</Link>
          <Link href="/HeliTaxii" className="hover:text-[#EF4F5F] transition">HeliTaxi</Link>
          <Link href="/allArtists" className="hover:text-[#EF4F5F] transition">Artists</Link>
          <Link href="/allVenues" className="hover:text-[#EF4F5F] transition">Venues</Link>
          <Link href="/allOrganizers" className="hover:text-[#EF4F5F] transition">Organizers</Link>
          <Link href="/about" className="hover:text-[#EF4F5F] transition">About</Link>
        </div>

        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center space-x-4">
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
              className="bg-[#EF4F5F] hover:bg-[#d43f4f] text-white px-6 py-2 rounded-full font-medium shadow"
            >
              Logout
            </button>
          ) : (
            <Link href="/auth">
              <button className="bg-[#EF4F5F] hover:bg-[#d43f4f] text-white px-6 py-2 rounded-full font-medium shadow">
                Login
              </button>
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-7 w-7 text-[#1C1C1C]" /> : <Menu className="h-7 w-7 text-[#1C1C1C]" />}
        </button>
      </nav>

      {/* Mobile Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-sm px-6 py-4 flex flex-col space-y-4">
          <Link href="/events" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#EF4F5F] transition">Events</Link>
          <Link href="/HeliTaxii" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#EF4F5F] transition">HeliTaxi</Link>
          <Link href="/allArtists" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#EF4F5F] transition">Artists</Link>
          <Link href="/allVenues" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#EF4F5F] transition">Venues</Link>
          <Link href="/allOrganizers" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#EF4F5F] transition">Organizers</Link>
          <Link href="/about" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#EF4F5F] transition">About</Link>

          <div className="pt-4 border-t border-gray-200 flex flex-col space-y-3">
            {isLoggedIn && (
              <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="rounded-full w-full bg-gray-100 hover:bg-gray-200 text-[#1C1C1C] font-medium border border-gray-300">
                  Dashboard
                </Button>
              </Link>
            )}

            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="bg-[#EF4F5F] hover:bg-[#d43f4f] w-full text-white px-6 py-2 rounded-full font-medium shadow"
              >
                Logout
              </button>
            ) : (
              <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                <button className="bg-[#EF4F5F] hover:bg-[#d43f4f] w-full text-white px-6 py-2 rounded-full font-medium shadow">
                  Login
                </button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
