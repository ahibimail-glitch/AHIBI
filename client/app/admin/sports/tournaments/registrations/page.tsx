'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { adminSportsApi } from '@/lib/api/sports';

type TournamentRegistration = {
  _id: string;
  tournamentName: string;
  registrationNumber?: string;
  invoiceNumber?: string;
  paymentStatus: 'pending' | 'confirmed' | 'failed';
  amount: number;
  currency: string;
  categories: string[];
  players: Array<{
    fullName: string;
    age: number;
    gender: 'male' | 'female';
    phone: string;
    email: string;
  }>;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  registrationDate?: string;
  createdAt?: string;
};

const categoryLabels: Record<string, string> = {
  mens_doubles: "Men's Doubles",
  womens_doubles: "Women's Doubles",
  mixed_doubles: 'Mixed Doubles',
  team_event: 'Team Event',
};

export default function SportsTournamentRegistrationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'pending' | 'confirmed' | 'failed'>('all');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    if (!token) {
      toast.error('Admin authentication required');
      router.replace('/admin/login');
      return;
    }
    fetchRegistrations();
  }, [status]);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (status !== 'all') params.status = status;
      if (query.trim()) params.search = query.trim();
      const res = await adminSportsApi.getTournamentRegistrations(params);
      setRegistrations(res.data.data.registrations || []);
    } catch (err: any) {
      const code = err?.response?.status;
      const msg = err?.response?.data?.message || 'Failed to load tournament registrations';
      toast.error(msg);
      if (code === 401 || code === 403 || msg.toLowerCase().includes('admin')) {
        router.replace('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!query) return registrations;
    const q = query.toLowerCase();
    return registrations.filter((registration) => {
      const playerValues = registration.players.flatMap((player) => [player.fullName, player.email, player.phone]);
      return [
        registration.registrationNumber,
        registration.invoiceNumber,
        registration.tournamentName,
        ...playerValues,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [registrations, query]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tournament Registrations</h1>
            <p className="text-sm text-gray-600">View and track paid and pending registrations for the sports tournament</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/sports/management" className="px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium">
              Sports Management
            </Link>
            <Link href="/admin" className="text-sm text-orange-600 hover:underline">Back to Admin</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Total Registrations</div>
            <div className="text-2xl font-bold text-gray-900">{registrations.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Confirmed</div>
            <div className="text-2xl font-bold text-green-600">{registrations.filter((item) => item.paymentStatus === 'confirmed').length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">{registrations.filter((item) => item.paymentStatus === 'pending').length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Revenue</div>
            <div className="text-2xl font-bold text-blue-600">
              ₹{registrations.filter((item) => item.paymentStatus === 'confirmed').reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <input
              placeholder="Search by registration ID, invoice, player name, email or phone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'all' | 'pending' | 'confirmed' | 'failed')}
              className="px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
            >
              <option value="all">All</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <button
              onClick={fetchRegistrations}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Registration</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Players</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Categories</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>Loading registrations...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>No registrations found</td>
                  </tr>
                ) : (
                  filtered.map((registration) => (
                    <tr key={registration._id} className="hover:bg-gray-50/60 align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{registration.registrationNumber || 'Pending Confirmation'}</div>
                        <div className="text-xs text-gray-500">Invoice: {registration.invoiceNumber || '—'}</div>
                        <div className="text-xs text-gray-500 mt-1">{registration.tournamentName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          {registration.players.map((player, index) => (
                            <div key={`${registration._id}-${index}`}>
                              <div className="text-sm font-medium text-gray-900">{player.fullName}</div>
                              <div className="text-xs text-gray-600">{player.email}</div>
                              <div className="text-xs text-gray-600">{player.phone}</div>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {registration.categories.map((category) => (
                            <span key={`${registration._id}-${category}`} className="px-2 py-1 text-xs rounded-full bg-orange-50 text-orange-700">
                              {categoryLabels[category] || category}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">₹{registration.amount?.toLocaleString('en-IN')}</div>
                        <div className="mt-1">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            registration.paymentStatus === 'confirmed'
                              ? 'bg-green-100 text-green-700'
                              : registration.paymentStatus === 'failed'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {registration.paymentStatus}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 break-all">{registration.razorpayPaymentId || registration.razorpayOrderId || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {registration.registrationDate
                          ? new Date(registration.registrationDate).toLocaleDateString('en-IN')
                          : registration.createdAt
                            ? new Date(registration.createdAt).toLocaleDateString('en-IN')
                            : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {registration.invoiceNumber ? (
                            <a
                              href={`/api/sports/tournaments/invoice/${registration.invoiceNumber}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700"
                            >
                              Download PDF
                            </a>
                          ) : (
                            <span className="px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-500">No PDF</span>
                          )}
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
