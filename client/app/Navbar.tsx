import { Button } from "@/components/ui/button";

import { User } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  return (
    <div>
      {/* Header */}
      <header className="w-full py-4 flex justify-center bg-transparent ">
        <nav className="flex items-center justify-between px-6 py-2 rounded-full bg-[#0F172A] w-full max-w-6xl shadow-md">
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

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-6 text-gray-300 font-medium">
            <Link href="/events" className="hover:text-white transition">
              Events
            </Link>
            <Link href="/organizer" className="hover:text-white transition">
              Organize
            </Link>
            <Link href="/artist" className="hover:text-white transition">
              Artists
            </Link>
            <Link href="/venue" className="hover:text-white transition">
              Venues
            </Link>
            <Link href="/about" className="hover:text-white transition">
              About
            </Link>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Link href="/profile">
              <Button variant="outline" className="rounded-full h-10 w-10 p-0">
                <User className="h-5 w-5 mx-auto" />
              </Button>
            </Link>
            <Link href="/auth">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium">
                Login
              </button>
            </Link>
          </div>
        </nav>
      </header>
    </div>
  );
}
