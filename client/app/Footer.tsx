"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white border-t py-8 mt-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">

          {/* Logo + Description */}
          <div>
            <Link href="/">
              <img
                src="/images/LogoB.png"
                alt="Ahibi logo"
                className="h-10 w-auto object-contain cursor-pointer mb-4"
              />
            </Link>
            <p className="text-gray-600 text-sm leading-relaxed">
              Your trusted platform for discovering, booking, and managing events across Nagaland.
            </p>
          </div>

          {/* For Users */}
          <div>
            <h3 className="text-[#1C1C1C] font-semibold mb-4 text-lg">For Users</h3>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li>
                <Link href="/events" className="hover:text-[#ff0e0e] transition">Browse Events</Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-[#ff0e0e] transition">My Tickets</Link>
              </li>
              <li>
                <Link href="mailto:connect@ahibi.in" className="hover:text-[#ff0e0e] transition">Support</Link>
              </li>
            </ul>
          </div>

          {/* Partners */}
          <div>
            <h3 className="text-[#1C1C1C] font-semibold mb-4 text-lg">For Partners</h3>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li><Link href="/allOrganizers" className="hover:text-[#ff0e0e] transition">Organizers</Link></li>
              <li><Link href="/allArtists" className="hover:text-[#ff0e0e] transition">Artists</Link></li>
              <li><Link href="/allVenues" className="hover:text-[#ff0e0e] transition">Venues</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-[#1C1C1C] font-semibold mb-4 text-lg">Company</h3>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li><Link href="/about" className="hover:text-[#ff0e0e] transition">About</Link></li>
              <li><Link href="mailto:connect@ahibi.in" className="hover:text-[#ff0e0e] transition">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-[#ff0e0e] transition">Privacy Policy</Link></li>
              {/* <li><Link href="/terms" className="hover:text-[#ff0e0e] transition">Terms & Conditions</Link></li> */}
              {/* <li><Link href="/shipping" className="hover:text-[#ff0e0e] transition">Shipping Policy</Link></li> */}
              <li><Link href="/refund" className="hover:text-[#ff0e0e] transition">Refund Policy</Link></li>
              <li><Link href="/accessibility" className="hover:text-[#ff0e0e] transition">Accessibility</Link></li>
              <li><Link href="/faq" className="hover:text-[#ff0e0e] transition">FAQs</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 mt-10 pt-5 text-center">
          <p className="text-gray-500 text-sm" suppressHydrationWarning>
            © {new Date().getFullYear()} Ahibi. All rights reserved.
          </p>
        </div>
      </div>
      {/* ── Spacer so page content isn't hidden behind bottom nav on mobile ── */}
      <div className="lg:hidden h-16" aria-hidden="true" />
    </footer>
  );
}
