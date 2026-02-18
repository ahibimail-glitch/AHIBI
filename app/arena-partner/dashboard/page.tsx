"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { arenaPartnerDashboard, arenaPartnerVenues } from '@/lib/api/sports';
import Link from 'next/link';
import KakiMarketingBanner from '@/components/KakiMarketingBanner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ArenaPartnerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [showVenueSelector, setShowVenueSelector] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [shouldWarnOnExit, setShouldWarnOnExit] = useState(true);
  const [showExitDialog, setShowExitDialog] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('arenaPartnerToken');
    if (!token) {
      router.push('/arena-partner/auth');
      return;
    }

    fetchDashboardData();
  }, []);

  // Custom back-button confirmation to leave Arena Partner dashboard
  useEffect(() => {
    if (!shouldWarnOnExit || typeof window === "undefined") return;

    // Push a history state so the first back press stays on this page
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      setShowExitDialog(true);
      // Immediately push state again so further back presses stay here until the user confirms
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [shouldWarnOnExit]);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, venuesResponse] = await Promise.all([
        arenaPartnerDashboard.getStats(),
        arenaPartnerVenues.getAll()
      ]);
      setStats(statsResponse.data.data.stats);
      setUpcomingBookings(statsResponse.data.data.upcomingBookings || []);
      setVenues(venuesResponse.data.data.venues || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // Allow intentional logout without showing the leave-dashboard dialog
    setShouldWarnOnExit(false);
    localStorage.removeItem('arenaPartnerToken');
    router.push('/arena-partner/auth');
  };

  const handleAddCourt = () => {
    if (venues.length === 0) {
      alert('Please create a venue first before adding courts.');
      router.push('/arena-partner/venues/create');
      return;
    }
    
    if (venues.length === 1) {
      // Single venue - go directly to create court page
      router.push(`/arena-partner/courts/create?venueId=${venues[0]._id}`);
    } else {
      // Multiple venues - show selector
      setShowVenueSelector(true);
    }
  };

  const handleVenueSelect = () => {
    if (!selectedVenue) {
      alert('Please select a venue');
      return;
    }
    router.push(`/arena-partner/courts/create?venueId=${selectedVenue}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-600 to-orange-500 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white">Arena Partner</h1>
              <p className="text-xs sm:text-sm text-orange-100">Manage your sports venues</p>
            </div>
            <button
              onClick={handleLogout}
              className="shrink-0 px-3 sm:px-4 py-2 text-xs sm:text-sm text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium backdrop-blur-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        {/* Kaki Marketing Banner */}
        <div className="mb-6 sm:mb-8 ">
          <KakiMarketingBanner platform="arenaPartner" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Venues</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats?.totalVenues || 0}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Courts</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats?.totalCourts || 0}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Today's Bookings</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats?.todayBookings || 0}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-4 sm:p-6 border border-purple-200 hover:shadow-xl transition-shadow col-span-2 sm:col-span-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-purple-100 mb-1">Advance % by AHIBI.in</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{stats?.advancePaymentPercent || 10}%</p>
                <p className="text-xs text-purple-200 mt-1">Booking-time payment</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 hover:shadow-md transition-shadow col-span-2 sm:col-span-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Monthly Earnings</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">₹{stats?.monthlyEarnings?.toLocaleString() || 0}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Link href="/arena-partner/venues/create" className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 sm:p-6 text-white hover:shadow-lg transition-all hover:scale-105 active:scale-95">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold mb-1 truncate">Add New Venue</h3>
                <p className="text-orange-100 text-xs sm:text-sm truncate">Create a new sports venue</p>
              </div>
              <svg className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </Link>

          <button onClick={handleAddCourt} className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 sm:p-6 text-white hover:shadow-lg transition-all hover:scale-105 active:scale-95 text-left">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold mb-1 truncate">Add Court</h3>
                <p className="text-green-100 text-xs sm:text-sm truncate">Add a court to your venue</p>
              </div>
              <svg className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </button>

          <button
            type="button"
            disabled
            className="bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl p-4 sm:p-6 text-white opacity-75 cursor-not-allowed text-left"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-semibold truncate">Create Tournament</h3>
                </div>
                  <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] sm:text-xs font-semibold">
                    Coming Soon
                  </span>
                <p className="text-white/80 text-xs sm:text-sm mt-1 truncate">Host tournaments & events</p>
              </div>
              <svg className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21h8m-4-4v4m6-18H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2z" />
              </svg>
            </div>
          </button>

          <Link href="/arena-partner/bookings" className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 sm:p-6 text-white hover:shadow-lg transition-all hover:scale-105 active:scale-95">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold mb-1 truncate">View Bookings</h3>
                <p className="text-blue-100 text-xs sm:text-sm truncate">Manage all bookings</p>
              </div>
              <svg className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </Link>

          <Link href="/arena-partner/analytics" className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 sm:p-6 text-white hover:shadow-lg transition-all hover:scale-105 active:scale-95">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold mb-1 truncate">Analytics</h3>
                <p className="text-purple-100 text-xs sm:text-sm truncate">View revenue insights</p>
              </div>
              <svg className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Venue Selection Dialog */}
        {showVenueSelector && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Select Venue</h3>
                <button
                  onClick={() => setShowVenueSelector(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">Choose which venue you want to add a court to:</p>
              <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
                {venues.map((venue) => (
                  <label
                    key={venue._id}
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="radio"
                      name="venue"
                      value={venue._id}
                      checked={selectedVenue === venue._id}
                      onChange={(e) => setSelectedVenue(e.target.value)}
                      className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                    />
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{venue.venueName}</p>
                      <p className="text-sm text-gray-600 truncate">{venue.address?.city}, {venue.address?.state}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowVenueSelector(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVenueSelect}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Bookings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Upcoming Bookings</h2>
          </div>
          <div className="p-4 sm:p-6">
            {upcomingBookings.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500">No upcoming bookings</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {upcomingBookings.map((booking) => (
                  <div key={booking._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{booking.venue?.venueName}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">{booking.court?.courtName} - {booking.court?.sportType}</p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {new Date(booking.bookingDate).toLocaleDateString()} at {booking.startTime}
                      </p>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:text-right">
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">₹{booking.pricing?.totalAmount}</p>
                      <span className={`inline-block px-2.5 sm:px-3 py-1 text-xs rounded-full ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        booking.status === 'checked_in' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <div className="mt-6 sm:mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Link href="/arena-partner/venues" className="p-3 sm:p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all hover:scale-105 active:scale-95 text-center">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-orange-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-xs sm:text-sm font-medium text-gray-900">My Venues</p>
          </Link>

          <Link href="/arena-partner/courts" className="p-3 sm:p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all hover:scale-105 active:scale-95 text-center">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-xs sm:text-sm font-medium text-gray-900">Courts</p>
          </Link>

          <Link href="/arena-partner/payouts" className="p-3 sm:p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all hover:scale-105 active:scale-95 text-center">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-green-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs sm:text-sm font-medium text-gray-900">Payouts</p>
          </Link>

          <Link href="/arena-partner/profile" className="p-3 sm:p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all hover:scale-105 active:scale-95 text-center">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-purple-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-xs sm:text-sm font-medium text-gray-900">Profile</p>
          </Link>
        </div>
      </div>

      {/* Leave dashboard confirmation dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Leave arena partner dashboard?</DialogTitle>
            <DialogDescription>
              If you go back now, you may lose your current view or any unsaved changes. Do you really want to close the dashboard?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowExitDialog(false)}
            >
              Stay on dashboard
            </Button>
            <Button
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white"
              onClick={() => {
                setShowExitDialog(false);
                setShouldWarnOnExit(false);
                router.push("/");
              }}
            >
              Leave dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
