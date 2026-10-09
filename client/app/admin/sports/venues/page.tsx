'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminSportsApi } from '@/lib/api/sports';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Venue = {
  _id: string;
  venueName: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  isActive?: boolean;
  address?: { city?: string; state?: string };
  sportsSupported?: string[];
  isFeatured?: boolean;
};

export default function SportsAdminVenuesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    if (!token) {
      toast.error('Admin authentication required');
      router.replace('/admin/login');
      return;
    }
    fetchVenues();
  }, [status]);

  const fetchVenues = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (status !== 'all') params.status = status;
      const res = await adminSportsApi.getAllVenues(params);
      setVenues(res.data.data.venues || []);
    } catch (err: any) {
      const code = err?.response?.status;
      const msg = err?.response?.data?.message || 'Failed to load venues';
      toast.error(msg);
      if (code === 401 || code === 403) router.replace('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!query) return venues;
    const q = query.toLowerCase();
    return venues.filter((v) =>
      [v.venueName, v.address?.city, v.address?.state]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q))
    );
  }, [venues, query]);

  const approve = async (id: string) => {
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

  const reject = async (id: string) => {
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
      toast.success('Toggled featured');
      await fetchVenues();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Operation failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sports Venues</h1>
            <p className="text-sm text-gray-600">Approve or manage venues for public listing</p>
          </div>
          <Link href="/admin" className="text-sm text-orange-600 hover:underline">Back to Admin</Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <input
              placeholder="Search by venue or city/state"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              onClick={fetchVenues}
              className="px-4 py-2.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Venue</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Sports</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>Loading venues...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>No venues found</td>
                  </tr>
                ) : (
                  filtered.map((v) => (
                    <tr key={v._id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{v.venueName}</div>
                        <div className="text-xs text-gray-500">ID: {v._id.slice(-8)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{v.address?.city || '—'}</div>
                        <div className="text-sm text-gray-600">{v.address?.state || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {v.sportsSupported?.slice(0,3).map((s) => (
                            <span key={s} className="px-2 py-1 text-xs rounded-full bg-orange-50 text-orange-700">{s}</span>
                          ))}
                          {v.sportsSupported && v.sportsSupported.length > 3 && (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">+{v.sportsSupported.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          v.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                          v.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {v.approvalStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/sports/venues/${v._id}/manage`}
                            className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Manage
                          </Link>
                          <button
                            onClick={() => toggleFeatured(v._id)}
                            disabled={actionLoading === v._id + ':featured'}
                            className="px-3 py-2 text-sm rounded-lg bg-purple-600 text-white disabled:opacity-60"
                          >
                            {v.isFeatured ? 'Unfeature' : 'Feature'}
                          </button>
                          <button
                            onClick={() => approve(v._id)}
                            disabled={actionLoading === v._id + ':approve'}
                            className="px-3 py-2 text-sm rounded-lg bg-green-600 text-white disabled:opacity-60"
                          >
                            {actionLoading === v._id + ':approve' ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => reject(v._id)}
                            disabled={actionLoading === v._id + ':reject'}
                            className="px-3 py-2 text-sm rounded-lg bg-red-600 text-white disabled:opacity-60"
                          >
                            {actionLoading === v._id + ':reject' ? 'Rejecting...' : 'Reject'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
