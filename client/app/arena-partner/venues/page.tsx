'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { arenaPartnerVenues } from '@/lib/api/sports';
import Link from 'next/link';

export default function MyVenuesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('arenaPartnerToken');
    if (!token) {
      router.replace('/arena-partner/auth');
      return;
    }
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    setLoading(true);
    try {
      const res = await arenaPartnerVenues.getAll();
      setVenues(res.data.data.venues || []);
    } catch (e) {
      // noop
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Venues</h1>
            <p className="text-sm text-gray-600">Manage your sports venues</p>
          </div>
          <Link href="/arena-partner/venues/create" className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700">
            Add New Venue
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          {loading ? (
            <div className="text-center text-gray-500 py-12">Loading...</div>
          ) : venues.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No venues yet</p>
              <Link href="/arena-partner/venues/create" className="text-orange-600 font-medium hover:underline">
                Create your first venue
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {venues.map((v) => (
                <div key={v._id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-48 bg-gray-100 relative">
                    {v.gallery?.images?.[0]?.url ? (
                      <img 
                        src={v.gallery.images[0].url} 
                        alt={v.venueName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        v.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                        v.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {v.approvalStatus}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{v.venueName}</h3>
                        <p className="text-sm text-gray-600">{v.address?.city}, {v.address?.state}</p>
                      </div>
                    </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold text-gray-900">{v.statistics?.totalCourts || 0}</span> Courts
                    </div>
                    <div className="flex items-center gap-2">
                      <Link 
                        href={`/arena-partner/venues/${v._id}/edit`}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Edit
                      </Link>
                      <Link 
                        href={`/arena-partner/courts?venueId=${v._id}`}
                        className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                      >
                        Manage Courts →
                      </Link>
                    </div>
                  </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
