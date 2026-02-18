'use client';

import { useEffect, useState } from 'react';

interface CourtDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courtId: string | null;
}

interface CourtDetails {
  court: {
    _id: string;
    courtName: string;
    sportType: string;
    pricing: {
      hourlyRate: number;
    };
    isActive: boolean;
    totalBookings: number;
    venue: {
      venueName: string;
      address: {
        city: string;
        state: string;
      };
    };
    arenaPartner: {
      name: string;
      businessDetails?: {
        businessName?: string;
      };
      email?: string;
      phone?: string;
    };
  };
  recentBookings: Array<{
    _id: string;
    user?: {
      name: string;
      email: string;
      phone: string;
    };
    bookingDate: string;
    status: string;
    pricing: {
      totalAmount: number;
    };
  }>;
  statistics: {
    totalBookings: number;
    confirmedBookings: number;
    revenue: number;
  };
}

export default function CourtDetailsModal({ isOpen, onClose, courtId }: CourtDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [courtDetails, setCourtDetails] = useState<CourtDetails | null>(null);

  useEffect(() => {
    if (isOpen && courtId) {
      fetchCourtDetails();
    }
  }, [isOpen, courtId]);

  const fetchCourtDetails = async () => {
    if (!courtId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/sports/courts/${courtId}/details`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch court details');
      }

      const data = await response.json();
      setCourtDetails(data.data);
    } catch (error) {
      console.error('Error fetching court details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Court Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading court details...</div>
            </div>
          ) : courtDetails ? (
            <div className="space-y-6">
              {/* Court Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Court Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Court Name</div>
                    <div className="font-medium text-gray-900">{courtDetails.court.courtName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Sport Type</div>
                    <div className="font-medium text-gray-900">{courtDetails.court.sportType}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Hourly Rate</div>
                    <div className="font-medium text-gray-900">₹{courtDetails.court.pricing.hourlyRate}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Status</div>
                    <div className="font-medium">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        courtDetails.court.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {courtDetails.court.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Venue Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Venue Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Venue Name</div>
                    <div className="font-medium text-gray-900">{courtDetails.court.venue.venueName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Location</div>
                    <div className="font-medium text-gray-900">
                      {courtDetails.court.venue.address.city}, {courtDetails.court.venue.address.state}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Partner Name</div>
                    <div className="font-medium text-gray-900">{courtDetails.court.arenaPartner.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Business Name</div>
                    <div className="font-medium text-gray-900">
                      {courtDetails.court.arenaPartner.businessDetails?.businessName || '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">{courtDetails.statistics.totalBookings}</div>
                    <div className="text-sm text-gray-600">Total Bookings</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{courtDetails.statistics.confirmedBookings}</div>
                    <div className="text-sm text-gray-600">Confirmed Bookings</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">₹{courtDetails.statistics.revenue}</div>
                    <div className="text-sm text-gray-600">Estimated Revenue</div>
                  </div>
                </div>
              </div>

              {/* Recent Bookings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Bookings</h3>
                {courtDetails.recentBookings.length > 0 ? (
                  <div className="space-y-2">
                    {courtDetails.recentBookings.map((booking) => (
                      <div key={booking._id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">
                              {booking.user?.name || 'Unknown User'}
                            </div>
                            <div className="text-sm text-gray-600">
                              {booking.user?.email || 'No email'} • {booking.user?.phone || 'No phone'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900">₹{booking.pricing.totalAmount}</div>
                            <div className="text-sm text-gray-600">
                              {new Date(booking.bookingDate).toLocaleDateString()}
                            </div>
                            <div className="text-xs">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {booking.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No recent bookings found
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-red-500">Failed to load court details</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
