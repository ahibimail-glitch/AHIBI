'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminSportsApi } from '@/lib/api/sports';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Partner = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  businessDetails?: { businessName?: string };
  createdAt?: string;
};

export default function SportsAdminPartnersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [commissionEdit, setCommissionEdit] = useState<Record<string, string>>({});

  useEffect(() => {
    // Guard: ensure admin token exists
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    if (!token) {
      toast.error('Admin authentication required');
      router.replace('/admin/login');
      return;
    }
    fetchPartners();
  }, [status]);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (status !== 'all') params.status = status;
      const res = await adminSportsApi.getAllPartners(params);
      setPartners(res.data.data.partners || []);
    } catch (err: any) {
      const code = err?.response?.status;
      const msg = err?.response?.data?.message || 'Failed to load arena partners';
      toast.error(msg);
      if (code === 401 || code === 403 || msg.toLowerCase().includes('admin')) {
        router.replace('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!query) return partners;
    const q = query.toLowerCase();
    return partners.filter((p) =>
      [p.name, p.email, p.phone, p.businessDetails?.businessName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [partners, query]);

  const approve = async (id: string) => {
    setActionLoading(id + ':approve');
    try {
      await adminSportsApi.approvePartner(id);
      toast.success('Partner approved');
      await fetchPartners();
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
      await adminSportsApi.rejectPartner(id, reason);
      toast.success('Partner rejected');
      await fetchPartners();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Rejection failed');
    } finally {
      setActionLoading(null);
    }
  };

  const suspend = async (id: string) => {
    const reason = prompt('Reason for suspension?') || 'Not specified';
    setActionLoading(id + ':suspend');
    try {
      await adminSportsApi.suspendPartner(id, reason);
      toast.success('Partner suspended');
      await fetchPartners();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Suspension failed');
    } finally {
      setActionLoading(null);
    }
  };

  const updateCommission = async (id: string) => {
    const valueStr = commissionEdit[id];
    const value = Number(valueStr);
    if (Number.isNaN(value) || value < 0 || value > 100) {
      toast.error('Enter a valid commission (0-100)');
      return;
    }
    setActionLoading(id + ':commission');
    try {
      await adminSportsApi.updateCommission(id, value);
      toast.success('Commission updated');
      await fetchPartners();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update commission');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Arena Partners</h1>
            <p className="text-sm text-gray-600">Approve or manage arena partner onboarding</p>
          </div>
          <Link href="/admin" className="text-sm text-orange-600 hover:underline">Back to Admin</Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <input
              placeholder="Search by name, email, phone, business"
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
              onClick={fetchPartners}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Partner</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Business</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Commission</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>Loading partners...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>No partners found</td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{p.name || '—'}</div>
                        <div className="text-xs text-gray-500">ID: {p._id.slice(-8)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{p.email || '—'}</div>
                        <div className="text-sm text-gray-600">{p.phone || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{p.businessDetails?.businessName || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          p.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                          p.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {p.approvalStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="%"
                            value={commissionEdit[p._id] ?? ''}
                            onChange={(e) => setCommissionEdit((s) => ({ ...s, [p._id]: e.target.value }))}
                            className="w-24 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                          />
                          <button
                            onClick={() => updateCommission(p._id)}
                            disabled={actionLoading === p._id + ':commission'}
                            className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white disabled:opacity-60"
                          >
                            {actionLoading === p._id + ':commission' ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/sports/partners/${p._id}/manage`}
                            className="px-3 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700"
                          >
                            Manage Partner
                          </Link>
                          <button
                            onClick={() => approve(p._id)}
                            disabled={actionLoading === p._id + ':approve'}
                            className="px-3 py-2 text-sm rounded-lg bg-green-600 text-white disabled:opacity-60"
                          >
                            {actionLoading === p._id + ':approve' ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => reject(p._id)}
                            disabled={actionLoading === p._id + ':reject'}
                            className="px-3 py-2 text-sm rounded-lg bg-red-600 text-white disabled:opacity-60"
                          >
                            {actionLoading === p._id + ':reject' ? 'Rejecting...' : 'Reject'}
                          </button>
                          <button
                            onClick={() => suspend(p._id)}
                            disabled={actionLoading === p._id + ':suspend'}
                            className="px-3 py-2 text-sm rounded-lg bg-yellow-600 text-white disabled:opacity-60"
                          >
                            {actionLoading === p._id + ':suspend' ? 'Suspending...' : 'Suspend'}
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
