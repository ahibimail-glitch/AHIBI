'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminSportsApi } from '@/lib/api/sports';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

type Venue = {
  _id: string;
  venueName: string;
  description: string;
  tagline?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  isActive: boolean;
  isFeatured: boolean;
  address: {
    street: string;
    area?: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
  location: {
    coordinates: [number, number];
  };
  contactInfo: {
    primaryPhone: string;
    secondaryPhone?: string;
    email?: string;
    whatsappNumber?: string;
  };
  sportsSupported: string[];
  facilities: {
    parking?: { available: boolean; capacity?: number };
    washrooms?: { available: boolean; count?: number };
    changingRooms?: { available: boolean; count?: number };
    showers?: { available: boolean };
    drinkingWater?: { available: boolean };
    firstAid?: { available: boolean };
    cafeteria?: { available: boolean };
    wifi?: { available: boolean };
    floodlights?: { available: boolean };
    seating?: { available: boolean; capacity?: number };
    wheelchairAccess?: { available: boolean };
  };
  operatingHours: {
    [key: string]: { open: string; close: string; closed: boolean };
  };
  rules: {
    cancellationPolicy: string;
    refundPolicy: string;
    dresscode?: string;
    ageRestrictions?: string;
    additionalRules?: string;
  };
  arenaPartner: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    businessDetails?: { businessName?: string };
  };
  createdAt: string;
  totalBookings?: number;
  averageRating?: number;
  monthlyRevenue?: number;
};

type Court = {
  _id: string;
  courtName: string;
  sportType: string;
  pricing: {
    hourlyRate: number;
    peakHourRate?: number;
  };
  availability: {
    [key: string]: { [key: string]: boolean };
  };
  isActive: boolean;
  totalBookings?: number;
  monthlyRevenue?: number;
};

type Booking = {
  _id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  courtName: string;
  sportType: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded';
};

type Review = {
  _id: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  helpfulCount: number;
};

export default function VenueManagePage() {
  const params = useParams();
  const router = useRouter();
  
  if (!params?.venueId) {
    return <div>Loading...</div>;
  }
  
  const venueId = params.venueId as string;

  const [loading, setLoading] = useState(true);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'courts' | 'bookings' | 'reviews' | 'analytics' | 'settings'>('overview');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      toast.error('Admin authentication required');
      router.replace('/admin/login');
      return;
    }
    if (venueId) {
      fetchVenueData();
    }
  }, [venueId]);

  const fetchVenueData = async () => {
    setLoading(true);
    try {
      // Fetch venue details
      const venueRes = await adminSportsApi.getVenueById(venueId);
      setVenue(venueRes.data.data.venue);

      // Fetch venue courts
      const courtsRes = await adminSportsApi.getVenueCourts(venueId);
      setCourts(courtsRes.data.data.courts || []);

      // Fetch venue bookings
      const bookingsRes = await adminSportsApi.getVenueBookings(venueId);
      setBookings(bookingsRes.data.data.bookings || []);

      // Fetch venue reviews
      const reviewsRes = await adminSportsApi.getVenueReviews(venueId);
      setReviews(reviewsRes.data.data.reviews || []);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to load venue data';
      toast.error(msg);
      if (err?.response?.status === 404) {
        router.replace('/admin/sports/venues');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApproveVenue = async () => {
    setActionLoading('approve');
    try {
      await adminSportsApi.approveVenue(venueId);
      toast.success('Venue approved successfully');
      fetchVenueData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Approval failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectVenue = async () => {
    const reason = prompt('Reason for rejection?') || 'Not specified';
    setActionLoading('reject');
    try {
      await adminSportsApi.rejectVenue(venueId, reason);
      toast.success('Venue rejected successfully');
      fetchVenueData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Rejection failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async () => {
    setActionLoading('toggle-active');
    try {
      await adminSportsApi.toggleVenueActive(venueId);
      toast.success(`Venue ${venue?.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchVenueData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Operation failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleFeatured = async () => {
    setActionLoading('toggle-featured');
    try {
      await adminSportsApi.toggleFeatured(venueId);
      toast.success(`Venue ${venue?.isFeatured ? 'unfeatured' : 'featured'} successfully`);
      fetchVenueData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Operation failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    
    setActionLoading(`delete-review-${reviewId}`);
    try {
      await adminSportsApi.deleteReview(reviewId);
      toast.success('Review deleted successfully');
      fetchVenueData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete review');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading venue data...</div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Venue not found</div>
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
                href="/admin/sports/venues"
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back to Venues
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{venue.venueName}</h1>
                <p className="text-sm text-gray-500">{venue.address.city}, {venue.address.state}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                venue.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                venue.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {venue.approvalStatus}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                venue.isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {venue.isActive ? 'Active' : 'Inactive'}
              </span>
              {venue.isFeatured && (
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-700">
                  Featured
                </span>
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
              { id: 'courts', label: 'Manage Courts', icon: '🏟️' },
              { id: 'bookings', label: 'Bookings', icon: '📅' },
              { id: 'reviews', label: 'Reviews', icon: '⭐' },
              { id: 'analytics', label: 'Analytics', icon: '📈' },
              { id: 'settings', label: 'Settings', icon: '⚙️' },
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
                <div className="text-2xl font-bold text-gray-900">{courts.length}</div>
                <div className="text-sm text-gray-500">Total Courts</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-2xl font-bold text-gray-900">{bookings.length}</div>
                <div className="text-sm text-gray-500">Total Bookings</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-2xl font-bold text-gray-900">₹{venue.monthlyRevenue || 0}</div>
                <div className="text-sm text-gray-500">Monthly Revenue</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-2xl font-bold text-gray-900">{venue.averageRating || 0}</div>
                <div className="text-sm text-gray-500">Average Rating</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {venue.approvalStatus === 'pending' && (
                    <button
                      onClick={handleApproveVenue}
                      disabled={actionLoading === 'approve'}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
                    >
                      {actionLoading === 'approve' ? 'Approving...' : 'Approve Venue'}
                    </button>
                  )}
                  {venue.approvalStatus === 'approved' && (
                    <button
                      onClick={handleRejectVenue}
                      disabled={actionLoading === 'reject'}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
                    >
                      {actionLoading === 'reject' ? 'Rejecting...' : 'Reject Venue'}
                    </button>
                  )}
                  <button
                    onClick={handleToggleActive}
                    disabled={actionLoading === 'toggle-active'}
                    className={`px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-60 ${
                      venue.isActive ? 'bg-gray-600 text-white' : 'bg-blue-600 text-white'
                    }`}
                  >
                    {actionLoading === 'toggle-active' ? 'Updating...' : 
                     venue.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={handleToggleFeatured}
                    disabled={actionLoading === 'toggle-featured'}
                    className={`px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-60 ${
                      venue.isFeatured ? 'bg-gray-600 text-white' : 'bg-purple-600 text-white'
                    }`}
                  >
                    {actionLoading === 'toggle-featured' ? 'Updating...' : 
                     venue.isFeatured ? 'Unfeature' : 'Feature'}
                  </button>
                </div>
              </div>
            </div>

            {/* Venue Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <div><strong>Description:</strong> {venue.description}</div>
                    {venue.tagline && <div><strong>Tagline:</strong> {venue.tagline}</div>}
                    <div><strong>Sports:</strong> {venue.sportsSupported.join(', ')}</div>
                    <div><strong>Created:</strong> {new Date(venue.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Contact & Location</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <div><strong>Address:</strong> {venue.address.street}, {venue.address.city}, {venue.address.state} - {venue.address.pincode}</div>
                    <div><strong>Phone:</strong> {venue.contactInfo.primaryPhone}</div>
                    {venue.contactInfo.email && <div><strong>Email:</strong> {venue.contactInfo.email}</div>}
                    <div><strong>Partner:</strong> {venue.arenaPartner.name} ({venue.arenaPartner.businessDetails?.businessName})</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manage Courts Tab */}
        {activeTab === 'courts' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Venue Courts</h2>
              <Link
                href={`/admin/sports/venues/${venueId}/courts/create`}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Add New Court
              </Link>
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Court</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sport</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hourly Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {courts.map((court) => (
                    <tr key={court._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{court.courtName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded-full bg-orange-50 text-orange-700">
                          {court.sportType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{court.pricing.hourlyRate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {court.totalBookings || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{court.monthlyRevenue || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/admin/sports/venues/${venueId}/courts/${court._id}`}
                          className="text-orange-600 hover:text-orange-900"
                        >
                          Manage
                        </Link>
                      </td>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Court</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookings.slice(0, 20).map((booking) => (
                    <tr key={booking._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{booking.customerName}</div>
                        <div className="text-sm text-gray-500">{booking.customerEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {booking.courtName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(booking.bookingDate).toLocaleDateString()}<br/>
                        {booking.startTime} - {booking.endTime}
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

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Customer Reviews</h2>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review._id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="font-medium text-gray-900">{review.customerName}</div>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={`text-sm ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}>
                              ★
                            </span>
                          ))}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <p className="text-gray-700">{review.comment}</p>
                      <div className="mt-2 text-sm text-gray-500">
                        {review.helpfulCount} people found this helpful
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteReview(review._id)}
                      disabled={actionLoading === `delete-review-${review._id}`}
                      className="ml-4 px-3 py-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-60"
                    >
                      {actionLoading === `delete-review-${review._id}` ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Venue Analytics</h2>
            
            {/* Revenue Chart Placeholder */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Overview</h3>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-gray-500">Revenue chart will be displayed here</div>
              </div>
            </div>

            {/* Popular Sports */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Popular Sports</h3>
              <div className="space-y-3">
                {venue.sportsSupported.map((sport) => (
                  <div key={sport} className="flex justify-between items-center">
                    <span className="text-gray-700">{sport}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-orange-600 h-2 rounded-full" 
                          style={{ width: `${Math.random() * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-500">{Math.floor(Math.random() * 50 + 10)} bookings</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Venue Settings</h2>
            
            {/* Operating Hours */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Operating Hours</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(venue.operatingHours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between items-center">
                      <span className="font-medium capitalize">{day}</span>
                      <span className="text-gray-600">
                        {hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Facilities */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Facilities</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(venue.facilities).map(([facility, details]) => {
                    if (typeof details === 'object' && details !== null && 'available' in details) {
                      return (
                        <div key={facility} className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${details.available ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          <span className="capitalize">{facility.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>

            {/* Rules & Policies */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Rules & Policies</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Cancellation Policy</h4>
                  <p className="text-gray-600">{venue.rules.cancellationPolicy}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Refund Policy</h4>
                  <p className="text-gray-600">{venue.rules.refundPolicy}</p>
                </div>
                {venue.rules.dresscode && (
                  <div>
                    <h4 className="font-medium text-gray-900">Dress Code</h4>
                    <p className="text-gray-600">{venue.rules.dresscode}</p>
                  </div>
                )}
                {venue.rules.ageRestrictions && (
                  <div>
                    <h4 className="font-medium text-gray-900">Age Restrictions</h4>
                    <p className="text-gray-600">{venue.rules.ageRestrictions}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
