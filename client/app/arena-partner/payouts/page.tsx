'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { arenaPartnerPayouts } from '@/lib/api/sports';
import Link from 'next/link';
import KakiMarketingBanner from '@/components/KakiMarketingBanner';

interface Payout {
  _id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  period: {
    startDate: string;
    endDate: string;
  };
  financials: {
    totalRevenue: number;
    netAmount: number;
    taxes?: {
      tds?: number;
      total?: number;
    };
  };
  transaction?: {
    transactionId?: string;
    utr?: string;
    processedAt?: string;
    completedAt?: string;
  };
  failure?: {
    reason?: string;
  };
  bookings: any[];
  invoiceNumber?: string;
  createdAt: string;
}

export default function ArenaPartnerPayouts() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('arenaPartnerToken');
    if (!token) {
      router.push('/arena-partner/auth');
      return;
    }

    fetchPayouts();
  }, [selectedStatus]);

  const fetchPayouts = async () => {
    try {
      const params = selectedStatus ? { status: selectedStatus } : {};
      const response = await arenaPartnerPayouts.getAll(selectedStatus || undefined);
      setPayouts(response.data.data.payouts || []);
    } catch (error) {
      console.error('Failed to fetch payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayoutDetails = async (payoutId: string) => {
    try {
      const response = await arenaPartnerPayouts.getById(payoutId);
      setSelectedPayout(response.data.data.payout);
      setShowDetails(true);
    } catch (error) {
      console.error('Failed to fetch payout details:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('arenaPartnerToken');
    router.push('/arena-partner/auth');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'processing':
        return 'bg-blue-100 text-blue-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTotalAmount = () => payouts.reduce((sum, payout) => sum + (payout.financials?.netAmount || 0), 0);
  const getCompletedAmount = () => payouts
    .filter(p => p.status === 'completed')
    .reduce((sum, payout) => sum + (payout.financials?.netAmount || 0), 0);
  const getPendingAmount = () => payouts
    .filter(p => p.status === 'pending' || p.status === 'processing')
    .reduce((sum, payout) => sum + (payout.financials?.netAmount || 0), 0);

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Period', 'Amount', 'Status', 'Transaction ID'],
      ...payouts.map(payout => [
        new Date(payout.createdAt).toLocaleDateString(),
        `${new Date(payout.period.startDate).toLocaleDateString()} - ${new Date(payout.period.endDate).toLocaleDateString()}`,
        (payout.financials?.netAmount || 0).toString(),
        payout.status,
        payout.transaction?.transactionId || 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payouts-${new Date().toISOString().split('T')[0]}.csv`;
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
              <h1 className="text-xl sm:text-2xl font-bold text-white">Payouts</h1>
              <p className="text-xs sm:text-sm text-orange-100">Track your earnings and payment history</p>
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Payouts</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">₹{getTotalAmount().toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">₹{getCompletedAmount().toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Pending</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600">₹{getPendingAmount().toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Payouts</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{payouts.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Export to CSV
            </button>
          </div>
        </div>

        {/* Payouts Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Payout History</h2>
          </div>
          <div className="overflow-x-auto">
            {payouts.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-gray-500">No payouts found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Transaction ID</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payouts.map((payout) => (
                    <tr key={payout._id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div>
                          <div>{new Date(payout.period.startDate).toLocaleDateString()}</div>
                          <div className="text-xs">to {new Date(payout.period.endDate).toLocaleDateString()}</div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ₹{(payout.financials?.netAmount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 text-xs rounded-full font-medium ${getStatusColor(payout.status)}`}>
                          {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden sm:table-cell">
                        {payout.transaction?.transactionId || '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => fetchPayoutDetails(payout._id)}
                          className="text-orange-600 hover:text-orange-700 font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Payout Details Modal */}
        {showDetails && selectedPayout && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Payout Details</h3>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Payout ID</p>
                    <p className="font-medium">{selectedPayout._id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Amount</p>
                    <p className="font-medium text-lg">₹{(selectedPayout.financials?.netAmount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`inline-block px-2.5 py-1 text-xs rounded-full font-medium ${getStatusColor(selectedPayout.status)}`}>
                      {selectedPayout.status.charAt(0).toUpperCase() + selectedPayout.status.slice(1)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Period</p>
                    <p className="font-medium">
                      {new Date(selectedPayout.period.startDate).toLocaleDateString()} - {new Date(selectedPayout.period.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedPayout.invoiceNumber && (
                    <div>
                      <p className="text-sm text-gray-600">Invoice Number</p>
                      <p className="font-medium">{selectedPayout.invoiceNumber}</p>
                    </div>
                  )}
                  {selectedPayout.transaction?.transactionId && (
                    <div>
                      <p className="text-sm text-gray-600">Transaction ID</p>
                      <p className="font-medium">{selectedPayout.transaction.transactionId}</p>
                    </div>
                  )}
                  {selectedPayout.transaction?.utr && (
                    <div>
                      <p className="text-sm text-gray-600">UTR</p>
                      <p className="font-medium">{selectedPayout.transaction.utr}</p>
                    </div>
                  )}
                  {selectedPayout.transaction?.processedAt && (
                    <div>
                      <p className="text-sm text-gray-600">Processed At</p>
                      <p className="font-medium">{new Date(selectedPayout.transaction.processedAt).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedPayout.transaction?.completedAt && (
                    <div>
                      <p className="text-sm text-gray-600">Completed At</p>
                      <p className="font-medium">{new Date(selectedPayout.transaction.completedAt).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedPayout.financials?.taxes?.tds != null && selectedPayout.financials.taxes.tds > 0 && (
                    <div>
                      <p className="text-sm text-gray-600">TDS Deducted</p>
                      <p className="font-medium text-red-600">₹{selectedPayout.financials.taxes.tds.toLocaleString()}</p>
                    </div>
                  )}
                  {selectedPayout.failure?.reason && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Failure Reason</p>
                      <p className="font-medium text-red-600">{selectedPayout.failure.reason}</p>
                    </div>
                  )}
                </div>
                
                {selectedPayout.bookings && selectedPayout.bookings.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Associated Bookings ({selectedPayout.bookings.length})</h4>
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Booking ID</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selectedPayout.bookings.map((booking) => (
                            <tr key={booking._id}>
                              <td className="px-3 py-2">{booking._id.slice(-8)}</td>
                              <td className="px-3 py-2">{new Date(booking.bookingDate).toLocaleDateString()}</td>
                              <td className="px-3 py-2">₹{(booking.pricing?.totalAmount || booking.pricing?.arenaEarnings || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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

          <Link href="/arena-partner/analytics" className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all hover:scale-105 active:scale-95 text-center">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-purple-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-xs sm:text-sm font-medium text-gray-900">Analytics</p>
          </Link>

          <Link href="/arena-partner/profile" className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all hover:scale-105 active:scale-95 text-center">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-green-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-xs sm:text-sm font-medium text-gray-900">Profile</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
