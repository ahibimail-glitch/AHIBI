"use client";

import React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { User, Menu, X } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check login status on mount
  React.useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('token'));
    // Listen for login/logout changes across tabs
    const syncLogin = () => setIsLoggedIn(!!localStorage.getItem('token'));
    window.addEventListener('storage', syncLogin);
    return () => window.removeEventListener('storage', syncLogin);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    window.location.href = '/auth';
  };

  return (
    <div>
      {/* Header */}
      <header className="w-full py-4 flex justify-center bg-transparent">
        <nav className="flex items-center justify-between px-6 py-2 rounded-full bg-[#0F172A] w-full max-w-6xl shadow-md relative">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Link href="/">
              <img
                src="/images/Logo.png"
                alt="Ahibi logo"
                className="h-10 w-auto object-contain cursor-pointer"
              />
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex space-x-6 text-gray-300 font-medium">
            <Link href="/events" className="hover:text-white transition">
              Events
            </Link>

            <Link href="/allArtists" className="hover:text-white transition">
              Artists
            </Link>
            <Link href="/partners" className="hover:text-white transition">
              Partners
            </Link>
            <Link href="/about" className="hover:text-white transition">
              About
            </Link>
          </div>

          {/* Action Buttons */}
          <div className="hidden md:flex space-x-3">
            {isLoggedIn && (
              <Link href="/profile">
                <Button variant="outline" className="rounded-full h-10 w-10 p-0">
                  <User className="h-5 w-5 mx-auto" />
                </Button>
              </Link>
            )}
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full font-medium"
              >
                Logout
              </button>
            ) : (
              <Link href="/auth">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium">
                  Login
                </button>
              </Link>
            )}
          </div>

          {/* Hamburger Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-white" />
              ) : (
                <Menu className="h-6 w-6 text-white" />
              )}
            </Button>
          </div>

          {/* Mobile Navigation Dropdown */}
          {isMobileMenuOpen && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-[#0F172A] text-gray-200 px-6 py-4 rounded-b-lg shadow-lg flex flex-col space-y-4 md:hidden z-50">
              <Link
                href="/events"
                onClick={() => setIsMobileMenuOpen(false)}
                className="hover:text-white transition"
              >
                Events
              </Link>
              <Link
                href="/organizer"
                onClick={() => setIsMobileMenuOpen(false)}
                className="hover:text-white transition"
              >
                Organize
              </Link>
              <Link
                href="/artist"
                onClick={() => setIsMobileMenuOpen(false)}
                className="hover:text-white transition"
              >
                Artists
              </Link>
              <Link
                href="/venue"
                onClick={() => setIsMobileMenuOpen(false)}
                className="hover:text-white transition"
              >
                Venues
              </Link>
              <Link
                href="/about"
                onClick={() => setIsMobileMenuOpen(false)}
                className="hover:text-white transition"
              >
                About
              </Link>
              <div className="flex items-center space-x-3 pt-2 border-t border-gray-700 mt-2">
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Button
                    variant="outline"
                    className="rounded-full h-10 w-10 p-0"
                  >
                    <User className="h-5 w-5 mx-auto" />
                  </Button>
                </Link>
                <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium">
                    Login
                  </button>
                </Link>
              </div>
            </div>
          )}
        </nav>
      </header>
    </div>
  );
}
