'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { arenaPartnerVenues, arenaPartnerCourts } from '@/lib/api/sports';
import Link from 'next/link';
import { Plus, Edit, Trash2, MapPin, Activity } from 'lucide-react';

export default function CourtsManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const venueIdParam = searchParams.get('venueId');
  
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState<any[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [courts, setCourts] = useState<any[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('arenaPartnerToken');
    if (!token) {
      router.replace('/arena-partner/auth');
      return;
    }
    fetchVenues();
  }, []);

  useEffect(() => {
    if (selectedVenue) {
      fetchCourts(selectedVenue);
    }
  }, [selectedVenue]);

  const fetchVenues = async () => {
    setLoading(true);
    try {
      const res = await arenaPartnerVenues.getAll();
      const venuesList = res.data.data.venues || [];
      setVenues(venuesList);
      if (venueIdParam && venuesList.some((v: any) => v._id === venueIdParam)) {
        setSelectedVenue(venueIdParam);
      } else if (venuesList.length > 0) {
        setSelectedVenue(venuesList[0]._id);
      }
    } catch (e) {
      console.error('Failed to fetch venues:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourts = async (venueId: string) => {
    setLoadingCourts(true);
    try {
      const res = await arenaPartnerCourts.getAll(venueId);
      setCourts(res.data.data.courts || []);
    } catch (e) {
      console.error('Failed to fetch courts:', e);
    } finally {
      setLoadingCourts(false);
    }
  };

  const handleDeleteCourt = async (courtId: string) => {
    if (!confirm('Are you sure you want to delete this court?')) return;
    
    try {
      await arenaPartnerCourts.delete(courtId);
      fetchCourts(selectedVenue);
    } catch (e) {
      console.error('Failed to delete court:', e);
      alert('Failed to delete court. It may have active bookings.');
    }
  };

  const getSportIcon = (sportType: string) => {
    const icons: any = {
      cricket: '🏏',
      football: '⚽',
      basketball: '🏀',
      badminton: '🏸',
      tennis: '🎾',
      volleyball: '🏐',
      table_tennis: '🏓',
      swimming: '🏊',
      gym: '💪',
      yoga: '🧘',
    };
    return icons[sportType] || '🏟️';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (venues.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Venues Found</h2>
          <p className="text-gray-600 mb-6">Create a venue first to add courts</p>
          <Link
            href="/arena-partner/venues/create"
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Create Venue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Court Management</h1>
              <p className="text-sm text-gray-600">Manage courts for your venues</p>
            </div>
            <Link
              href="/arena-partner/dashboard"
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Venue Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Select Venue
          </label>
          <div className="flex gap-4 items-center">
            <select
              value={selectedVenue}
              onChange={(e) => setSelectedVenue(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
            >
              {venues.map((venue) => (
                <option key={venue._id} value={venue._id}>
                  {venue.venueName} - {venue.address?.city}
                </option>
              ))}
            </select>
            <Link
              href={`/arena-partner/courts/create?venueId=${selectedVenue}`}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Add Court
            </Link>
          </div>
        </div>

        {/* Courts List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              Courts ({courts.length})
            </h2>
          </div>

          <div className="p-6">
            {loadingCourts ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mx-auto"></div>
              </div>
            ) : courts.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No courts added yet</p>
                <Link
                  href={`/arena-partner/courts/create?venueId=${selectedVenue}`}
                  className="inline-flex items-center gap-2 text-orange-600 font-medium hover:underline"
                >
                  <Plus className="w-4 h-4" />
                  Add your first court
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courts.map((court) => (
                  <div
                    key={court._id}
                    className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {/* Court Image */}
                    <div className="h-48 bg-gray-100 relative">
                      {(() => {
                        const coverImage = court.images?.find((img: any) => img.isMain) || court.images?.[0];
                        return coverImage?.url ? (
                          <img 
                            src={coverImage.url} 
                            alt={court.courtName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <div className="text-center">
                              <div className="text-4xl mb-2">{getSportIcon(court.sportType)}</div>
                              <p className="text-sm">No Image</p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{getSportIcon(court.sportType)}</div>
                        <div>
                          <h3 className="font-bold text-gray-900">{court.courtName}</h3>
                          {court.courtNumber && (
                            <p className="text-xs text-gray-500">Court #{court.courtNumber}</p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          court.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : court.status === 'maintenance'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {court.status}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Sport Type</span>
                        <span className="font-semibold text-gray-900 capitalize">
                          {court.sportType.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Capacity</span>
                        <span className="font-semibold text-gray-900">
                          {court.capacity?.players || 'N/A'} players
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Weekday Price</span>
                        <span className="font-semibold text-orange-600">
                          ₹{court.pricing?.weekday?.offPeak?.pricePerHour || 'N/A'}/hr
                        </span>
                      </div>
                      {court.specifications?.indoor !== undefined && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Type</span>
                          <span className="font-semibold text-gray-900">
                            {court.specifications.indoor ? 'Indoor' : 'Outdoor'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                      <Link
                        href={`/arena-partner/courts/edit/${court._id}`}
                        className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteCourt(court._id)}
                        className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
