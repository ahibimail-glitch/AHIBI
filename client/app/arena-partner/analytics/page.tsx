'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { arenaPartnerDashboard, arenaPartnerVenues } from '@/lib/api/sports';
import Link from 'next/link';
import KakiMarketingBanner from '@/components/KakiMarketingBanner';

interface RevenueData {
  _id: string;
  totalRevenue: number;
  arenaEarnings: number;
  platformCommission: number;
  bookingCount: number;
}

interface VenueRevenue {
  venueName: string;
  totalRevenue: number;
  arenaEarnings: number;
  bookingCount: number;
}

export default function ArenaPartnerAnalytics() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [venueRevenue, setVenueRevenue] = useState<VenueRevenue[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('arenaPartnerToken');
    if (!token) {
      router.push('/arena-partner/auth');
      return;
    }

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (venues.length > 0) {
      fetchAnalyticsData();
    }
  }, [selectedVenue, dateRange, venues]);

  const fetchInitialData = async () => {
    try {
      // Get venues for filter dropdown
      const venuesResponse = await arenaPartnerVenues.getAll('approved');
      setVenues(venuesResponse.data.data.venues || []);

      // Set default date range (last 30 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      setDateRange({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });

      // Get dashboard stats for summary cards
      const statsResponse = await arenaPartnerDashboard.getStats();
      setStats(statsResponse.data.data.stats);
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      const params: any = {};
      if (selectedVenue) params.venueId = selectedVenue;
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;

      const response = await arenaPartnerDashboard.getRevenueAnalytics(params);
      setRevenueData(response.data.data.revenueByDate || []);
      setVenueRevenue(response.data.data.revenueByVenue || []);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('arenaPartnerToken');
    router.push('/arena-partner/auth');
  };

  const getTotalRevenue = () => revenueData.reduce((sum, item) => sum + item.totalRevenue, 0);
  const getTotalEarnings = () => revenueData.reduce((sum, item) => sum + item.arenaEarnings, 0);
  const getTotalBookings = () => revenueData.reduce((sum, item) => sum + item.bookingCount, 0);
  const getTotalCommission = () => revenueData.reduce((sum, item) => sum + item.platformCommission, 0);

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Total Revenue', 'Arena Earnings', 'Platform Commission', 'Bookings'],
      ...revenueData.map(item => [
        item._id,
        item.totalRevenue.toString(),
        item.arenaEarnings.toString(),
        item.platformCommission.toString(),
        item.bookingCount.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-analytics-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Analytics Dashboard</h1>
              <p className="text-xs sm:text-sm text-orange-100">Revenue insights and performance metrics</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium backdrop-blur-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Kaki Marketing Banner */}
        <div className="mb-8">
          <KakiMarketingBanner platform="arenaPartner" />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 mb-6 sm:mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Venue</label>
              <select
                value={selectedVenue}
                onChange={(e) => setSelectedVenue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All Venues</option>
                {venues.map((venue) => (
                  <option key={venue._id} value={venue._id}>
                    {venue.venueName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">₹{getTotalRevenue().toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Your Earnings</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">₹{getTotalEarnings().toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Platform Commission</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">₹{getTotalCommission().toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Bookings</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{getTotalBookings()}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 sm:mb-8">
          <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Revenue Trend</h2>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Export to CSV
            </button>
          </div>
          <div className="p-4 sm:p-6">
            {revenueData.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-gray-500">No revenue data available for the selected period</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs sm:text-sm font-medium text-gray-600 pb-2 border-b">
                  <div>Date</div>
                  <div>Revenue</div>
                  <div>Earnings</div>
                  <div>Bookings</div>
                </div>
                {revenueData.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="font-medium text-gray-900">{new Date(item._id).toLocaleDateString()}</div>
                    <div className="text-gray-600">₹{item.totalRevenue.toLocaleString()}</div>
                    <div className="text-green-600 font-medium">₹{item.arenaEarnings.toLocaleString()}</div>
                    <div className="text-gray-600">{item.bookingCount}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Venue Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Venue Performance</h2>
          </div>
          <div className="p-4 sm:p-6">
            {venueRevenue.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-gray-500">No venue data available for the selected period</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs sm:text-sm font-medium text-gray-600 pb-2 border-b">
                  <div>Venue</div>
                  <div>Revenue</div>
                  <div>Earnings</div>
                  <div>Bookings</div>
                </div>
                {venueRevenue.map((venue, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="font-medium text-gray-900">{venue.venueName}</div>
                    <div className="text-gray-600">₹{venue.totalRevenue.toLocaleString()}</div>
                    <div className="text-green-600 font-medium">₹{venue.arenaEarnings.toLocaleString()}</div>
                    <div className="text-gray-600">{venue.bookingCount}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <div className="mt-6 sm:mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Link href="/arena-partner/dashboard" className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all hover:scale-105 active:scale-95 text-center">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-orange-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <p className="text-xs sm:text-sm font-medium text-gray-900">Dashboard</p>
          </Link>

          <Link href="/arena-partner/venues" className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all hover:scale-105 active:scale-95 text-center">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-xs sm:text-sm font-medium text-gray-900">Venues</p>
          </Link>

          <Link href="/arena-partner/bookings" className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all hover:scale-105 active:scale-95 text-center">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-green-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs sm:text-sm font-medium text-gray-900">Bookings</p>
          </Link>

          <Link href="/arena-partner/payouts" className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all hover:scale-105 active:scale-95 text-center">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-purple-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-xs sm:text-sm font-medium text-gray-900">Payouts</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
