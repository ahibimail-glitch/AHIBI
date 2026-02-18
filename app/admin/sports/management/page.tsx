'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminSportsApi } from '@/lib/api/sports';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CourtDetailsModal from './CourtDetailsModal';

type Venue = {
  _id: string;
  venueName: string;
  address: {
    city: string;
    state: string;
  };
  sportsSupported: string[];
  approvalStatus: 'pending' | 'approved' | 'rejected';
  isActive: boolean;
  isFeatured: boolean;
  averageRating: number;
  totalBookings: number;
  arenaPartner: {
    name: string;
    businessDetails: { businessName?: string };
  };
  createdAt?: string;
};

type Court = {
  _id: string;
  courtName: string;
  sportType: string;
  pricing: {
    hourlyRate: number;
  };
  isActive: boolean;
  totalBookings: number;
  venue: {
    _id: string;
    venueName: string;
    address: {
      city: string;
      state: string;
    };
  };
  arenaPartner: {
    name: string;
    businessDetails?: { businessName?: string };
  };
  createdAt?: string;
};

export default function SportsAdminManagementPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'venues' | 'courts'>('venues');
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sport, setSport] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    if (!token) {
      toast.error('Admin authentication required');
      router.replace('/admin/login');
      return;
    }
    if (activeTab === 'venues') {
      fetchVenues();
    } else {
      fetchCourts();
    }
  }, [activeTab, status, sport]);

  const fetchVenues = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (status !== 'all') params.status = status;
      if (sport !== 'all') params.sport = sport;
      if (query) params.search = query;
      
      const res = await adminSportsApi.getAllVenues(params);
      setVenues(res.data.data.venues || []);
    } catch (err: any) {
      const code = err?.response?.status;
      const msg = err?.response?.data?.message || 'Failed to load venues';
      toast.error(msg);
      if (code === 401 || code === 403 || msg.toLowerCase().includes('admin')) {
        router.replace('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCourts = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (status !== 'all') params.status = status;
      if (sport !== 'all') params.sport = sport;
      if (query) params.search = query;
      
      const res = await adminSportsApi.getAllCourts(params);
      setCourts(res.data.data.courts || []);
    } catch (err: any) {
      const code = err?.response?.status;
      const msg = err?.response?.data?.message || 'Failed to load courts';
      toast.error(msg);
      if (code === 401 || code === 403 || msg.toLowerCase().includes('admin')) {
        router.replace('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const approveVenue = async (id: string) => {
    setActionLoading(id + ':approve');
    try {
      await adminSportsApi.approveVenue(id);
      toast.success('Venue approved');
      await fetchVenues();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Approval failed');
    } finally {
      setActionLoading(null);
    }
  };

  const rejectVenue = async (id: string) => {
    const reason = prompt('Reason for rejection?') || 'Not specified';
    setActionLoading(id + ':reject');
    try {
      await adminSportsApi.rejectVenue(id, reason);
      toast.success('Venue rejected');
      await fetchVenues();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Rejection failed');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleFeatured = async (id: string) => {
    setActionLoading(id + ':featured');
    try {
      await adminSportsApi.toggleFeatured(id);
      toast.success('Featured status updated');
      await fetchVenues();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleVenueActive = async (id: string) => {
    setActionLoading(id + ':toggle');
    try {
      await adminSportsApi.toggleVenueActive(id);
      toast.success('Venue status updated');
      await fetchVenues();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleCourtActive = async (id: string) => {
    setActionLoading(id + ':toggle');
    try {
      await adminSportsApi.toggleCourtActive(id);
      toast.success('Court status updated');
      await fetchCourts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setActionLoading(null);
    }
  };

  const updateCourtPricing = async (id: string) => {
    const rateStr = prompt('Enter new hourly rate (₹):');
    if (!rateStr) return;
    
    const rate = Number(rateStr);
    if (Number.isNaN(rate) || rate < 0) {
      toast.error('Please enter a valid rate');
      return;
    }
    
    setActionLoading(id + ':pricing');
    try {
      await adminSportsApi.updateCourtPricing(id, rate);
      toast.success('Court pricing updated');
      await fetchCourts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setActionLoading(null);
    }
  };

  const viewCourtDetails = (id: string) => {
    setSelectedCourtId(id);
    setIsModalOpen(true);
  };

  const filteredVenues = useMemo(() => {
    if (!query) return venues;
    const q = query.toLowerCase();
    return venues.filter((v) =>
      [v.venueName, v.address.city, v.address.state, v.arenaPartner.name]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q))
    );
  }, [venues, query]);

  const filteredCourts = useMemo(() => {
    if (!query) return courts;
    const q = query.toLowerCase();
    return courts.filter((c) =>
      [c.courtName, c.sportType, c.venue.venueName, c.venue.address.city]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q))
    );
  }, [courts, query]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sports Management</h1>
            <p className="text-sm text-gray-600">Manage all venues and courts in one place</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/sports/partners" className="text-sm text-orange-600 hover:underline">
              Back to Partners
            </Link>
            <Link href="/admin" className="text-sm text-orange-600 hover:underline">
              Admin Dashboard
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 mb-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('venues')}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition ${
                activeTab === 'venues'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Manage Venues ({venues.length})
            </button>
            <button
              onClick={() => setActiveTab('courts')}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition ${
                activeTab === 'courts'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Manage Courts ({courts.length})
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <input
              placeholder={`Search ${activeTab === 'venues' ? 'venues' : 'courts'}...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              {activeTab === 'courts' && (
                <>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </>
              )}
            </select>
            {activeTab === 'courts' && (
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
              >
                <option value="all">All Sports</option>
                <option value="football">Football</option>
                <option value="badminton">Badminton</option>
                <option value="tennis">Tennis</option>
                <option value="basketball">Basketball</option>
                <option value="cricket">Cricket</option>
                <option value="volleyball">Volleyball</option>
                <option value="table_tennis">Table Tennis</option>
                <option value="swimming">Swimming</option>
                <option value="pickleball">Pickleball</option>
              </select>
            )}
            <button
              onClick={activeTab === 'venues' ? fetchVenues : fetchCourts}
              className="px-4 py-2.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            {activeTab === 'venues' ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Venue</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Partner</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Sports</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>Loading venues...</td>
                    </tr>
                  ) : filteredVenues.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>No venues found</td>
                    </tr>
                  ) : (
                    filteredVenues.map((venue) => (
                      <tr key={venue._id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{venue.venueName}</div>
                          <div className="text-xs text-gray-500">ID: {venue._id.slice(-8)}</div>
                          {venue.isFeatured && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">Featured</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{venue.address.city}</div>
                          <div className="text-sm text-gray-600">{venue.address.state}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{venue.arenaPartner.name}</div>
                          <div className="text-xs text-gray-500">{venue.arenaPartner.businessDetails?.businessName || '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {venue.sportsSupported.slice(0, 3).map((sport, idx) => (
                              <span key={idx} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                {sport}
                              </span>
                            ))}
                            {venue.sportsSupported.length > 3 && (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                +{venue.sportsSupported.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              venue.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                              venue.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {venue.approvalStatus}
                            </span>
                            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              venue.isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {venue.isActive ? 'Active' : 'Inactive'}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2 flex-wrap">
                            <button
                              onClick={() => approveVenue(venue._id)}
                              disabled={actionLoading === venue._id + ':approve'}
                              className="px-3 py-2 text-sm rounded-lg bg-green-600 text-white disabled:opacity-60"
                            >
                              {actionLoading === venue._id + ':approve' ? 'Approving...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => rejectVenue(venue._id)}
                              disabled={actionLoading === venue._id + ':reject'}
                              className="px-3 py-2 text-sm rounded-lg bg-red-600 text-white disabled:opacity-60"
                            >
                              {actionLoading === venue._id + ':reject' ? 'Rejecting...' : 'Reject'}
                            </button>
                            <button
                              onClick={() => toggleFeatured(venue._id)}
                              disabled={actionLoading === venue._id + ':featured'}
                              className="px-3 py-2 text-sm rounded-lg bg-yellow-600 text-white disabled:opacity-60"
                            >
                              {actionLoading === venue._id + ':featured' ? 'Updating...' : (venue.isFeatured ? 'Unfeature' : 'Feature')}
                            </button>
                            <button
                              onClick={() => toggleVenueActive(venue._id)}
                              disabled={actionLoading === venue._id + ':toggle'}
                              className="px-3 py-2 text-sm rounded-lg bg-purple-600 text-white disabled:opacity-60"
                            >
                              {actionLoading === venue._id + ':toggle' ? 'Updating...' : (venue.isActive ? 'Deactivate' : 'Activate')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Court</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Sport</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Venue</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Partner</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Price/Hour</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>Loading courts...</td>
                    </tr>
                  ) : filteredCourts.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>No courts found</td>
                    </tr>
                  ) : (
                    filteredCourts.map((court) => (
                      <tr key={court._id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{court.courtName}</div>
                          <div className="text-xs text-gray-500">ID: {court._id.slice(-8)}</div>
                          <div className="text-xs text-gray-500">{court.totalBookings} bookings</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">
                            {court.sportType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{court.venue.venueName}</div>
                          <div className="text-xs text-gray-500">{court.venue.address.city}, {court.venue.address.state}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{court.arenaPartner.name}</div>
                          <div className="text-xs text-gray-500">{court.arenaPartner.businessDetails?.businessName || '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">₹{court.pricing.hourlyRate}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            court.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {court.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2 flex-wrap">
                            <button
                              onClick={() => viewCourtDetails(court._id)}
                              className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            >
                              Details
                            </button>
                            <button
                              onClick={() => updateCourtPricing(court._id)}
                              disabled={actionLoading === court._id + ':pricing'}
                              className="px-3 py-2 text-sm rounded-lg bg-green-600 text-white disabled:opacity-60"
                            >
                              {actionLoading === court._id + ':pricing' ? 'Updating...' : 'Edit Price'}
                            </button>
                            <button
                              onClick={() => toggleCourtActive(court._id)}
                              disabled={actionLoading === court._id + ':toggle'}
                              className={`px-3 py-2 text-sm rounded-lg disabled:opacity-60 ${
                                court.isActive ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                              }`}
                            >
                              {actionLoading === court._id + ':toggle' ? 'Updating...' : (court.isActive ? 'Deactivate' : 'Activate')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
        
        {/* Court Details Modal */}
        <CourtDetailsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedCourtId(null);
          }}
          courtId={selectedCourtId}
        />
      </div>
    </div>
  );
}
