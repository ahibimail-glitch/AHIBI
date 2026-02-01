'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MapPin, Star, ChevronRight, Search } from 'lucide-react';
import Navbar from '../../Navbar';
import Footer from '../../Footer';
import { sportsApi } from '@/lib/api/sports';

const SPORTS = [
  'Cricket',
  'Football',
  'Basketball',
  'Badminton',
  'Tennis',
  'Swimming',
];

export default function SportsDiscoveryPage() {
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    sport: '',
    city: '',
    minPrice: '',
    maxPrice: '',
    rating: '',
  });

  useEffect(() => {
    fetchVenues();
  }, [filters]);

  async function fetchVenues() {
    setLoading(true);
    try {
      const params: any = {};
      Object.entries(filters).forEach(([k, v]) => v && (params[k] = v));
      const res = await sportsApi.searchVenues(params);
      setVenues(res.data.data.venues);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const scrollToExplore = () => {
    const el = document.getElementById('explore');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-white text-slate-900">
      <Navbar />

      {/* ================= HERO ================= */}
      <section className="relative h-[100vh] w-full">
        <Image
          src="https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?q=80&w=2400&auto=format&fit=crop"
          alt="Sports"
          fill
          priority
          className="object-cover"
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Content */}
        <div className="absolute bottom-24 left-6 md:left-20 max-w-3xl">
          <h1 className="text-white text-4xl sm:text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight">
            SPORTS FOR <br /> EVERY PASSION
          </h1>

          <p className="text-white/80 mt-6 max-w-md text-base md:text-lg">
            Discover top-notch sports facilities designed to support every passion and lifestyle.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex items-center gap-4">
            <Link href="/arena-partner/auth">
              <button className="px-6 py-3 rounded-full bg-white text-black font-semibold hover:scale-105 transition">
                Sign up
              </button>
            </Link>

            {/* <Link href="/arena-partner/auth">
              <button className="px-6 py-3 rounded-full border border-white/60 text-white font-semibold hover:bg-white hover:text-black transition">
                Login
              </button>
            </Link> */}

            <button onClick={scrollToExplore} className="px-6 py-3 rounded-full border border-white/60 text-white font-semibold hover:bg-white hover:text-black transition">
              Explore
            </button>
          </div>
        </div>
      </section>


      {/* ================= FILTER BAR ================= */}
      <section id="explore" className="sticky top-[60px] z-40 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex gap-3 overflow-x-auto">
          <select
            className="filter-pill"
            value={filters.sport}
            onChange={(e) => setFilters({ ...filters, sport: e.target.value })}
          >
            <option value="">All Sports</option>
            {SPORTS.map((s) => (
              <option key={s} value={s.toLowerCase()}>
                {s}
              </option>
            ))}
          </select>

          <input
            className="filter-pill"
            placeholder="Location"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          />

          {/* <input
            type="number"
            className="filter-pill w-24"
            placeholder="Min ₹"
            value={filters.minPrice}
            onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
          />

          <input
            type="number"
            className="filter-pill w-24"
            placeholder="Max ₹"
            value={filters.maxPrice}
            onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
          /> */}

          <select
            className="filter-pill"
            value={filters.rating}
            onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
          >
            <option value="">Any Rating</option>
            <option value="4">4★ & above</option>
            <option value="3">3★ & above</option>
          </select>

          <button
            onClick={fetchVenues}
            className="ml-auto px-6 py-2 rounded-full bg-black text-white flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
        </div>
      </section>

      {/* ================= RESULTS ================= */}
      <section className="max-w-7xl mx-auto px-4 py-4">


        {loading ? (
          <div className="grid md:grid-cols-3 gap-10">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-80 rounded-2xl bg-slate-100 animate-pulse"
              />
            ))}
          </div>
        ) : venues.length === 0 ? (
          <div className="text-center py-32 border border-dashed rounded-2xl">
            <Search className="mx-auto w-10 h-10 text-slate-300 mb-4" />
            <p className="text-slate-600 font-semibold">No venues found</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-10">
            {venues.map((venue) => (
              <Link
                key={venue._id}
                href={`/sports/venues/${venue._id}`}
                className="group block border border-black/10 rounded-2xl p-3 hover:border-black/20 transition"
              >

                <div className="relative h-72 rounded-2xl overflow-hidden">
                  <Image
                    src={
                      venue.gallery?.images?.[0]?.url ||
                      '/images/sports-venue.jpg'
                    }
                    alt={venue.venueName}
                    fill
                    className="object-cover group-hover:scale-105 transition"
                  />
                </div>

                <div className="mt-4 space-y-2">
                  <h3 className="text-xl font-semibold">
                    {venue.venueName}
                  </h3>

                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {venue.address?.city}, {venue.address?.state}
                  </p>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      <Star className="w-4 h-4 text-black fill-black" />
                      {venue.rating?.overall?.toFixed(1) || 'New'}
                      {typeof venue.rating?.totalReviews === 'number' && venue.rating.totalReviews > 0 && (
                        <span className="text-slate-500 font-medium">({venue.rating.totalReviews})</span>
                      )}
                    </div>

                    <span className="text-sm font-semibold flex items-center gap-1">
                      View Details <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Footer />

      {/* ================= STYLES ================= */}
      <style jsx global>{`
        .filter-pill {
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          border: 1px solid #d1d5db;
          font-size: 0.875rem;
          background: white;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
