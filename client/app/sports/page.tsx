'use client';

import { useState, useEffect } from 'react';
import { sportsApi } from '@/lib/api/sports';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '../Navbar';
import Footer from '../Footer';
// Recommended: npm install lucide-react
import { MapPin, Star, Trophy, Search, Filter, X, ChevronRight } from 'lucide-react';

const SPORTS = [
  { id: 'cricket', name: 'Cricket', icon: '🏏' },
  { id: 'football', name: 'Football', icon: '⚽' },
  { id: 'basketball', name: 'Basketball', icon: '🏀' },
  { id: 'badminton', name: 'Badminton', icon: '🏸' },
  { id: 'tennis', name: 'Tennis', icon: '🎾' },
  { id: 'volleyball', name: 'Volleyball', icon: '🏐' },
  { id: 'table_tennis', name: 'Table Tennis', icon: '🏓' },
  { id: 'swimming', name: 'Swimming', icon: '🏊' },
];

export default function SportsVenueDiscovery() {
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filters, setFilters] = useState({
    sport: '',
    city: '',
    minPrice: '',
    maxPrice: '',
    rating: '',
    sortBy: 'rating',
  });

  useEffect(() => {
    fetchVenues();
  }, [filters]);

  const fetchVenues = async () => {
    setLoading(true);
    try {
      const params: any = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      const response = await sportsApi.searchVenues(params);
      setVenues(response.data.data.venues);
    } catch (err) {
      console.error('Failed to fetch venues:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <Navbar />

      {/* Hero Section - Light Professional Tier */}
      <section className="relative min-h-[40vh] md:min-h-[50vh] flex items-center bg-white overflow-hidden">


        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 w-full py-10 md:py-12">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">

            {/* Left Column */}
            <div className="text-left space-y-6 md:space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 border border-orange-200 text-orange-600 text-xs font-bold uppercase tracking-widest">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </span>
                Live Booking Available
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight">
                Elite Spaces for <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700">
                  Elite Athletes.
                </span>
              </h1>

              <p className="text-slate-600 text-base sm:text-lg md:text-xl max-w-lg leading-relaxed font-medium">
                Discover and book the highest-rated sports facilities. From local turf to Olympic-sized pools, find your next arena in seconds.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 pt-4">
                <Link href="/arena-partner/auth">
                <button className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg shadow-orange-500/30 transition-all">
                  Sign Up
                </button>
                </Link>
                <Link href="/arena-partner/auth">
                <button className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-all">
                  Login
                </button>
                </Link>
              </div>

              {/* Quick Stats */}
              <div className="flex gap-6 md:gap-8 pt-4 md:pt-6">
                <div>
                  <p className="text-2xl font-bold text-slate-900">500+</p>
                  <p className="text-slate-500 text-sm font-semibold uppercase tracking-tight">Venues</p>
                </div>
                <div className="w-px h-10 bg-slate-200" />
                <div>
                  <p className="text-2xl font-bold text-slate-900">12k+</p>
                  <p className="text-slate-500 text-sm font-semibold uppercase tracking-tight">Bookings</p>
                </div>
                <div className="w-px h-10 bg-slate-200" />
                <div>
                  <p className="text-2xl font-bold text-slate-900">4.9/5</p>
                  <p className="text-slate-500 text-sm font-semibold uppercase tracking-tight">Rating</p>
                </div>
              </div>
            </div>

            {/* Right Column - Search Card */}
            <div className="relative">
              <div className="bg-white border border-slate-200 rounded-3xl md:rounded-[36px] p-6 md:p-8 shadow-2xl">
                <h3 className="text-slate-900 text-lg md:text-xl font-bold mb-4 md:mb-6">
                  Search Facilities
                </h3>

                <div className="space-y-4">
                  {/* Sports Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {SPORTS.slice(0, 8).map((sport) => (
                      <button
                        key={sport.id}
                        onClick={() => setFilters({ ...filters, sport: sport.id })}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all border
                  ${filters.sport === sport.id
                            ? "bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-500/20"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-orange-50 hover:border-orange-300"
                          }`}
                      >
                        <span className="text-xl md:text-2xl mb-1">{sport.icon}</span>
                        <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-tight">
                          {sport.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Location + Search */}
                  <div className="space-y-3 pt-4">
                    <div className="relative group">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                      <input
                        type="text"
                        placeholder="Where do you want to play?"
                        value={filters.city}
                        onChange={(e) =>
                          setFilters({ ...filters, city: e.target.value })
                        }
                        className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 md:py-4 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all"
                      />
                    </div>

                    <button
                      onClick={fetchVenues}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3.5 md:py-4 rounded-2xl shadow-xl shadow-orange-500/30 transition-all flex items-center justify-center gap-2 group"
                    >
                      <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      Explore Venues
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="lg:hidden flex justify-end mb-4">
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold shadow-sm"
          >
            {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

          {/* Enhanced Filters Sidebar */}
          <aside className={`${showMobileFilters ? 'block' : 'hidden'} lg:block lg:w-80 flex-shrink-0`}>
            <div className="bg-white border border-slate-200 rounded-3xl p-8 sticky top-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Filter className="w-5 h-5 text-orange-500" /> Filters
                </h2>
                {Object.values(filters).some(x => x !== '' && x !== 'rating') && (
                  <button
                    onClick={() => setFilters({ sport: '', city: '', minPrice: '', maxPrice: '', rating: '', sortBy: 'rating' })}
                    className="text-xs font-bold text-orange-600 hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="space-y-8">
                {/* City Input */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 block">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      value={filters.city}
                      onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                      placeholder="e.g. Mumbai"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 block">Budget (₹/hr)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-orange-500 transition-all"
                    />
                    <span className="text-slate-300">—</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-orange-500 transition-all"
                    />
                  </div>
                </div>

                {/* Rating Select */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 block">Customer Rating</label>
                  <select
                    value={filters.rating}
                    onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-orange-500 appearance-none cursor-pointer"
                  >
                    <option value="">Any Rating</option>
                    <option value="4">⭐⭐⭐⭐ & Up</option>
                    <option value="3">⭐⭐⭐ & Up</option>
                  </select>
                </div>
              </div>
            </div>
          </aside>

          {/* Venue Grid */}
          <main className="flex-1">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-900">
                  {loading ? 'Finding venues...' : `${venues.length} Spaces Available`}
                </h2>
                <p className="text-slate-500 font-medium">Top rated facilities in your area</p>
              </div>

              <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 ml-3 uppercase tracking-tighter">Sort By:</span>
                <select
                  className="text-sm font-bold bg-transparent outline-none pr-4 cursor-pointer"
                  value={filters.sortBy}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                >
                  <option value="rating">Highest Rated</option>
                  <option value="popular">Most Popular</option>
                  <option value="distance">Nearest to Me</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-3xl p-4 space-y-4 animate-pulse border border-slate-100">
                    <div className="h-64 bg-slate-100 rounded-2xl" />
                    <div className="h-6 bg-slate-100 rounded w-2/3" />
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : venues.length === 0 ? (
              <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 py-24 text-center">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">No matches found</h3>
                <p className="text-slate-500 mt-2">Try broadening your filters or searching a different city.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {venues.map((venue) => (
                  <Link
                    key={venue._id}
                    href={`/sports/venues/${venue._id}`}
                    className="group bg-white rounded-[32px] border border-slate-200 p-3 hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-1 transition-all duration-500"
                  >
                    <div className="relative h-64 rounded-[24px] overflow-hidden">
                      {venue.gallery?.images?.[0]?.url ? (
                        <Image
                          src={venue.gallery.images[0].url}
                          alt={venue.venueName}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <Image
                          src="/images/sports-venue.jpg"
                          alt={venue.venueName}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      )}

                      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                        <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
                          <p className="text-[10px] text-white/80 font-bold uppercase tracking-tighter">Starting from</p>
                          <p className="text-white font-black">₹{venue.minCourtPrice ?? venue.pricing?.basePrice ?? 'N/A'}<span className="text-xs font-normal opacity-80">/hr</span></p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-black text-slate-900 group-hover:text-orange-600 transition-colors">
                          {venue.venueName}
                        </h3>
                        <div className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-lg">
                          <Star className="w-4 h-4 fill-orange-500 text-orange-500" />
                          <span className="font-bold text-orange-700 text-sm">
                            {venue.rating?.overall?.toFixed(1) || 'New'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-500 text-sm mb-6 font-medium">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {venue.address?.city}, {venue.address?.state}
                      </div>

                      <div className="flex items-center justify-between py-4 border-t border-slate-100">
                        <div className="flex -space-x-2">
                          {venue.sportsSupported?.slice(0, 3).map((s: string, i: number) => (
                            <div key={s} className="w-8 h-8 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-xs shadow-sm" title={s}>
                              ⚽
                            </div>
                          ))}
                          {venue.sportsSupported?.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">
                              +{venue.sportsSupported.length - 3}
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-bold text-orange-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                          Book Now <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </main>
        </div>
      </section>

      <Footer />
    </div>
  );
}