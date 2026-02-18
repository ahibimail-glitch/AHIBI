'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminSportsApi } from '@/lib/api/sports';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

type Partner = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  businessDetails?: {
    businessName?: string;
    businessType?: string;
    registrationNumber?: string;
    gstNumber?: string;
  };
  bankDetails?: {
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
    accountHolderName?: string;
  };
  kycDocuments?: Record<string, { url: string; verified?: boolean }>;
  commission?: number;
  createdAt?: string;
  totalRevenue?: number;
  totalBookings?: number;
  activeVenues?: number;
};

type Venue = {
  _id: string;
  venueName: string;
  address: { city: string; state: string };
  approvalStatus: 'pending' | 'approved' | 'rejected';
  isActive: boolean;
  averageRating?: number;
  totalBookings?: number;
  monthlyRevenue?: number;
};

type Booking = {
  _id: string;
  venueName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  bookingDate: string;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  disputeStatus?: 'none' | 'raised' | 'investigating' | 'resolved';
};

type Dispute = {
  _id: string;
  bookingId: string;
  customerName: string;
  venueName: string;
  issue: string;
  status: 'raised' | 'investigating' | 'resolved';
  createdAt: string;
  description: string;
};

export default function PartnerManagePage() {
  const params = useParams();
  const router = useRouter();
  const partnerId = params.partnerId as string;

  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'venues' | 'bookings' | 'financial' | 'disputes' | 'moderation'>('overview');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      toast.error('Admin authentication required');
      router.replace('/admin/login');
      return;
    }
    if (partnerId) {
      fetchPartnerData();
    }
  }, [partnerId]);

  const fetchPartnerData = async () => {
    setLoading(true);
    try {
      // Fetch partner details
      const partnerRes = await adminSportsApi.getPartnerById(partnerId);
      setPartner(partnerRes.data.data.partner);

      // Fetch partner venues
      const venuesRes = await adminSportsApi.getPartnerVenues(partnerId);
      setVenues(venuesRes.data.data.venues || []);

      // Fetch partner bookings
      const bookingsRes = await adminSportsApi.getPartnerBookings(partnerId);
      setBookings(bookingsRes.data.data.bookings || []);

      // Fetch partner disputes
      const disputesRes = await adminSportsApi.getPartnerDisputes(partnerId);
      setDisputes(disputesRes.data.data.disputes || []);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to load partner data';
      toast.error(msg);
      if (err?.response?.status === 404) {
        router.replace('/admin/sports/partners');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePartner = async () => {
    setActionLoading('approve');
    try {
      await adminSportsApi.approvePartner(partnerId);
      toast.success('Partner approved successfully');
      fetchPartnerData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Approval failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspendPartner = async () => {
    const reason = prompt('Reason for suspension?') || 'Not specified';
    setActionLoading('suspend');
    try {
      await adminSportsApi.suspendPartner(partnerId, reason);
      toast.success('Partner suspended successfully');
      fetchPartnerData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Suspension failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateCommission = async (commission: number) => {
    setActionLoading('commission');
    try {
      await adminSportsApi.updatePartnerCommission(partnerId, commission);
      toast.success('Commission updated successfully');
      fetchPartnerData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update commission');
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyKyc = async (documentType: string) => {
    setActionLoading(`kyc-${documentType}`);
    try {
      await adminSportsApi.verifyKycDocument(partnerId, documentType);
      toast.success('KYC document verified');
      fetchPartnerData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'KYC verification failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveDispute = async (disputeId: string, resolution: string) => {
    setActionLoading(`dispute-${disputeId}`);
    try {
      await adminSportsApi.resolveDispute(disputeId, resolution);
      toast.success('Dispute resolved successfully');
      fetchPartnerData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to resolve dispute');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading partner data...</div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Partner not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/sports/partners"
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back to Partners
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{partner.name}</h1>
                <p className="text-sm text-gray-500">{partner.businessDetails?.businessName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                partner.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                partner.approvalStatus === 'suspended' ? 'bg-red-100 text-red-700' :
                partner.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {partner.approvalStatus}
              </span>
              {partner.approvalStatus === 'pending' && (
                <button
                  onClick={handleApprovePartner}
                  disabled={actionLoading === 'approve'}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
                >
                  {actionLoading === 'approve' ? 'Approving...' : 'Approve Partner'}
                </button>
              )}
              {partner.approvalStatus === 'approved' && (
                <button
                  onClick={handleSuspendPartner}
                  disabled={actionLoading === 'suspend'}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
                >
                  {actionLoading === 'suspend' ? 'Suspending...' : 'Suspend Partner'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'venues', label: 'Manage Venues', icon: '🏟️' },
              { id: 'bookings', label: 'Bookings', icon: '📅' },
              { id: 'financial', label: 'Financial Control', icon: '💰' },
              { id: 'disputes', label: 'Dispute Resolution', icon: '⚖️' },
              { id: 'moderation', label: 'Moderation', icon: '🔒' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-2xl font-bold text-gray-900">{venues.length}</div>
                <div className="text-sm text-gray-500">Total Venues</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-2xl font-bold text-gray-900">{bookings.length}</div>
                <div className="text-sm text-gray-500">Total Bookings</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-2xl font-bold text-gray-900">₹{partner.totalRevenue || 0}</div>
                <div className="text-sm text-gray-500">Total Revenue</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-2xl font-bold text-gray-900">{partner.commission || 0}%</div>
                <div className="text-sm text-gray-500">Commission Rate</div>
              </div>
            </div>

            {/* Partner Details */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Partner Details</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h4>
                    <div className="space-y-2">
                      <div><strong>Email:</strong> {partner.email}</div>
                      <div><strong>Phone:</strong> {partner.phone}</div>
                      <div><strong>Member Since:</strong> {new Date(partner.createdAt || '').toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Business Information</h4>
                    <div className="space-y-2">
                      <div><strong>Business Name:</strong> {partner.businessDetails?.businessName || '—'}</div>
                      <div><strong>Business Type:</strong> {partner.businessDetails?.businessType || '—'}</div>
                      <div><strong>GST Number:</strong> {partner.businessDetails?.gstNumber || '—'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manage Venues Tab */}
        {activeTab === 'venues' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Partner Venues</h2>
              <h3>Click on view All Venues to manage all venues</h3>
              <Link
                href={`/admin/sports/venues?partner=${partnerId}`}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                View All Venues
              </Link>
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Venue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th> */}
                    {/* <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th> */}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {venues.map((venue) => (
                    <tr key={venue._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{venue.venueName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{venue.address.city}, {venue.address.state}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          venue.approvalStatus === 'approved' && venue.isActive ? 'bg-green-100 text-green-800' :
                          venue.approvalStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {venue.approvalStatus} {venue.isActive ? '(Active)' : '(Inactive)'}
                        </span>
                      </td>
                      {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {venue.totalBookings || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{venue.monthlyRevenue || 0}
                      </td> */}
                      {/* <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/admin/sports/venues/${venue._id}`}
                          className="text-orange-600 hover:text-orange-900"
                        >
                          Manage
                        </Link>
                      </td> */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Recent Bookings</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Venue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookings.slice(0, 10).map((booking) => (
                    <tr key={booking._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{booking.customerName}</div>
                        <div className="text-sm text-gray-500">{booking.customerEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {booking.venueName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(booking.bookingDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{booking.totalAmount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                          booking.paymentStatus === 'refunded' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Financial Control Tab */}
        {activeTab === 'financial' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Commission Management */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Commission Management</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Commission Rate
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          defaultValue={partner.commission || 0}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          id="commission-input"
                        />
                        <span className="text-gray-500">%</span>
                        <button
                          onClick={() => {
                            const input = document.getElementById('commission-input') as HTMLInputElement;
                            handleUpdateCommission(parseFloat(input.value));
                          }}
                          disabled={actionLoading === 'commission'}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                        >
                          {actionLoading === 'commission' ? 'Updating...' : 'Update'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Bank Details</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-2">
                    <div><strong>Account Holder:</strong> {partner.bankDetails?.accountHolderName || '—'}</div>
                    <div><strong>Bank Name:</strong> {partner.bankDetails?.bankName || '—'}</div>
                    <div><strong>Account Number:</strong> {partner.bankDetails?.accountNumber || '—'}</div>
                    <div><strong>IFSC Code:</strong> {partner.bankDetails?.ifscCode || '—'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Summary */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Revenue Summary</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">₹{partner.totalRevenue || 0}</div>
                    <div className="text-sm text-gray-500">Total Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">₹{Math.floor((partner.totalRevenue || 0) * (partner.commission || 0) / 100)}</div>
                    <div className="text-sm text-gray-500">Platform Commission</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">₹{Math.floor((partner.totalRevenue || 0) * (100 - (partner.commission || 0)) / 100)}</div>
                    <div className="text-sm text-gray-500">Partner Earnings</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dispute Resolution Tab */}
        {activeTab === 'disputes' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Dispute Management</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Venue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {disputes.map((dispute) => (
                    <tr key={dispute._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{dispute.customerName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {dispute.venueName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="max-w-xs truncate">{dispute.issue}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          dispute.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          dispute.status === 'investigating' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {dispute.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(dispute.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {dispute.status !== 'resolved' && (
                          <button
                            onClick={() => {
                              const resolution = prompt('Enter resolution details:');
                              if (resolution) {
                                handleResolveDispute(dispute._id, resolution);
                              }
                            }}
                            disabled={actionLoading === `dispute-${dispute._id}`}
                            className="text-green-600 hover:text-green-900 disabled:opacity-60"
                          >
                            {actionLoading === `dispute-${dispute._id}` ? 'Resolving...' : 'Resolve'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Moderation Tab */}
        {activeTab === 'moderation' && (
          <div className="space-y-6">
            {/* KYC Documents */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">KYC Document Verification</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(partner.kycDocuments || {}).map(([docType, doc]) => (
                    <div key={docType} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900 capitalize">{docType.replace(/([A-Z])/g, ' $1').trim()}</h4>
                          <div className="mt-2">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              View Document
                            </a>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.verified ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Verified
                            </span>
                          ) : (
                            <button
                              onClick={() => handleVerifyKyc(docType)}
                              disabled={actionLoading === `kyc-${docType}`}
                              className="px-3 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                              {actionLoading === `kyc-${docType}` ? 'Verifying...' : 'Verify'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Partner Actions */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Partner Actions</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Suspend Partner</h4>
                      <p className="text-sm text-gray-500">Temporarily suspend partner account due to violations</p>
                    </div>
                    <button
                      onClick={handleSuspendPartner}
                      disabled={actionLoading === 'suspend' || partner.approvalStatus !== 'approved'}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
                    >
                      {actionLoading === 'suspend' ? 'Suspending...' : 'Suspend'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
