'use client';

import React, { useState, useEffect } from 'react';
import { getApiUrl } from '@/config';
import { Search, Users, Video, DollarSign, Calendar, Trash2, Plus, User, Clock, CheckCircle, XCircle, AlertCircle, Download } from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  profilePic?: string;
  createdAt: string;
}

interface LiveStream {
  _id: string;
  title: string;
  price: number;
  status: string;
  scheduledStartTime?: string;
  thumbnailUrl?: string;
}

interface LivestreamPurchase {
  _id: string;
  user: User;
  livestream: LiveStream;
  amount: number;
  status: string;
  paymentDate: string;
  accessGranted: boolean;
  adminPurchase?: boolean;
  notes?: string;
  createdAt: string;
}

interface ManualPurchaseForm {
  userId: string;
  livestreamId: string;
  notes: string;
}

export default function LivestreamUserManagement() {
  const [activeTab, setActiveTab] = useState<'search' | 'purchases' | 'manual'>('search');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Purchases states
  const [purchases, setPurchases] = useState<LivestreamPurchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Manual purchase states
  const [livestreams, setLivestreams] = useState<LiveStream[]>([]);
  const [manualForm, setManualForm] = useState<ManualPurchaseForm>({
    userId: '',
    livestreamId: '',
    notes: ''
  });
  const [creatingPurchase, setCreatingPurchase] = useState(false);

  const getToken = () => localStorage.getItem('admin_token');

  // Clear messages
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Search users
  const searchUsers = async () => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(getApiUrl(`livestream/admin/users/search?query=${encodeURIComponent(searchQuery)}`), {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.message);

      setSearchResults(data.data);
    } catch (err: any) {
      setError(err.message);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = (filename: string, rows: Record<string, any>[]) => {
    const escapeCell = (value: any) => {
      if (value === null || value === undefined) return '';
      const s = String(value);
      if (/[\n\r",]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    if (!rows.length) {
      setError('No data to export');
      return;
    }

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.map(escapeCell).join(','),
      ...rows.map((r) => headers.map((h) => escapeCell(r[h])).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPurchases = () => {
    const rows = purchases.map((p) => ({
      PurchaseId: p._id,
      UserName: p.user?.name || '',
      UserEmail: p.user?.email || '',
      UserPhone: p.user?.phone || '',
      LivestreamTitle: p.livestream?.title || '',
      LivestreamPrice: p.livestream?.price ?? '',
      AmountPaid: p.amount,
      Status: p.adminPurchase ? 'admin' : p.status,
      AccessGranted: p.accessGranted ? 'yes' : 'no',
      PurchaseDate: p.createdAt ? new Date(p.createdAt).toISOString() : ''
    }));

    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`livestream-purchases-page-${pagination.page}-${stamp}.csv`, rows);
  };

  // Get all purchases
  const fetchPurchases = async (page = 1) => {
    setPurchasesLoading(true);
    try {
      const response = await fetch(getApiUrl(`livestream/admin/purchases?page=${page}&limit=${pagination.limit}`), {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.message);

      setPurchases(data.data);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPurchasesLoading(false);
    }
  };

  // Get livestreams for manual purchase
  const fetchLivestreams = async () => {
    try {
      console.log('Fetching livestreams from frontend...');
      const response = await fetch(getApiUrl('livestream/admin/streams/list'), {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response text:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Received data:', data);
      
      if (!data.success) throw new Error(data.message);

      setLivestreams(data.data);
    } catch (err: any) {
      console.error('Frontend fetch error:', err);
      setError(err.message);
    }
  };

  // Test endpoint
  const testConnection = async () => {
    try {
      console.log('Testing admin connection...');
      const response = await fetch(getApiUrl('livestream/admin/test'), {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      console.log('Test response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Test error response:', errorText);
        throw new Error(`Test failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Test response data:', data);
      setSuccess('Connection test successful!');
    } catch (err: any) {
      console.error('Test connection error:', err);
      setError(`Connection test failed: ${err.message}`);
    }
  };

  // Test public endpoint
  const testPublicConnection = async () => {
    try {
      console.log('Testing public connection...');
      const response = await fetch(getApiUrl('livestream/public-test'));

      console.log('Public test response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Public test error response:', errorText);
        throw new Error(`Public test failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Public test response data:', data);
      setSuccess('Public connection test successful!');
    } catch (err: any) {
      console.error('Public test connection error:', err);
      setError(`Public connection test failed: ${err.message}`);
    }
  };

  // Create manual purchase
  const createManualPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.userId || !manualForm.livestreamId) {
      setError('Please select both user and livestream');
      return;
    }

    setCreatingPurchase(true);
    try {
      const response = await fetch(getApiUrl('livestream/admin/manual-purchase'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(manualForm)
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.message);

      setSuccess('Manual purchase created successfully!');
      setManualForm({ userId: '', livestreamId: '', notes: '' });
      
      // Refresh purchases if on purchases tab
      if (activeTab === 'purchases') {
        fetchPurchases();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingPurchase(false);
    }
  };

  // Delete purchase
  const deletePurchase = async (purchaseId: string) => {
    if (!confirm('Are you sure you want to delete this purchase? This will revoke the user\'s access to the livestream.')) {
      return;
    }

    try {
      const response = await fetch(getApiUrl(`livestream/admin/purchases/${purchaseId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.message);

      setSuccess('Purchase deleted successfully');
      fetchPurchases(); // Refresh list
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Get user purchase history
  const getUserPurchases = async (userId: string) => {
    try {
      const response = await fetch(getApiUrl(`livestream/admin/users/${userId}/purchases`), {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.message);

      // Switch to purchases tab and show user's purchases
      setActiveTab('purchases');
      setPurchases(data.data.purchases);
      setPagination(data.data.pagination);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Effects
  useEffect(() => {
    if (activeTab === 'purchases') {
      fetchPurchases();
    } else if (activeTab === 'manual') {
      fetchLivestreams();
    }
  }, [activeTab]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchUsers();
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const getStatusBadge = (status: string, adminPurchase?: boolean) => {
    if (adminPurchase) {
      return <span className="px-2 py-1 bg-purple-600 text-white rounded text-xs font-semibold">ADMIN</span>;
    }
    
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 bg-green-600 text-white rounded text-xs font-semibold">COMPLETED</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-600 text-white rounded text-xs font-semibold">PENDING</span>;
      case 'failed':
        return <span className="px-2 py-1 bg-red-600 text-white rounded text-xs font-semibold">FAILED</span>;
      default:
        return <span className="px-2 py-1 bg-gray-600 text-white rounded text-xs font-semibold">{status.toUpperCase()}</span>;
    }
  };

  return (
    <div className="p-6 bg-gray-900 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="w-6 h-6" />
          Livestream User Management
        </h2>
        <div className="flex gap-2">
          <button
            onClick={testPublicConnection}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            Test Public
          </button>
          <button
            onClick={testConnection}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Test Admin
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-400 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-900/50 border border-green-700 rounded-lg text-green-400 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'search'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Search className="w-4 h-4 inline mr-2" />
          Search Users
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'purchases'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4 inline mr-2" />
          All Purchases
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'manual'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Manual Purchase
        </button>
      </div>

      {/* Search Users Tab */}
      {activeTab === 'search' && (
        <div>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search users by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              {loading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Search Results</h3>
              {searchResults.map((user) => (
                <div key={user._id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{user.name || 'No name'}</p>
                      <p className="text-gray-400 text-sm">{user.email || 'No email'}</p>
                      <p className="text-gray-400 text-sm">{user.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => getUserPurchases(user._id)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      View Purchases
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setManualForm({ ...manualForm, userId: user._id });
                        setActiveTab('manual');
                      }}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Purchase for User
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Purchases Tab */}
      {activeTab === 'purchases' && (
        <div>
          <div className="flex items-center justify-end mb-4">
            <button
              type="button"
              onClick={handleDownloadPurchases}
              disabled={purchasesLoading || purchases.length === 0}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
              title="Download purchases as Excel-compatible CSV"
            >
              <Download className="w-4 h-4" />
              Download Excel
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">User</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Livestream</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Amount</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Purchase Date</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchasesLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </td>
                  </tr>
                ) : purchases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      No purchases found
                    </td>
                  </tr>
                ) : (
                  purchases.map((purchase) => (
                    <tr key={purchase._id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-white font-medium">{purchase.user.name || 'No name'}</p>
                          <p className="text-gray-400 text-sm">{purchase.user.email || 'No email'}</p>
                          <p className="text-gray-400 text-sm">{purchase.user.phone}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-white font-medium">{purchase.livestream.title}</p>
                          <p className="text-gray-400 text-sm">₹{purchase.livestream.price}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-white font-medium">
                          {purchase.amount === 0 ? 'FREE' : `₹${purchase.amount}`}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(purchase.status, purchase.adminPurchase)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-300">
                          <p>{new Date(purchase.createdAt).toLocaleDateString()}</p>
                          <p className="text-sm text-gray-400">{new Date(purchase.createdAt).toLocaleTimeString()}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => deletePurchase(purchase._id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded transition-colors"
                          title="Delete Purchase"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <button
                onClick={() => fetchPurchases(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-gray-300">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => fetchPurchases(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Manual Purchase Tab */}
      {activeTab === 'manual' && (
        <div>
          <form onSubmit={createManualPurchase} className="space-y-6">
            <div>
              <label className="block text-gray-300 mb-2">Select User *</label>
              <select
                value={manualForm.userId}
                onChange={(e) => setManualForm({ ...manualForm, userId: e.target.value })}
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Choose a user...</option>
                {selectedUser && (
                  <option value={selectedUser._id}>
                    {selectedUser.name || selectedUser.email || selectedUser.phone}
                  </option>
                )}
              </select>
              {selectedUser && (
                <div className="mt-2 p-3 bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-300">
                    <strong>Selected:</strong> {selectedUser.name || 'No name'} ({selectedUser.email || selectedUser.phone})
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Select Livestream *</label>
              <select
                value={manualForm.livestreamId}
                onChange={(e) => setManualForm({ ...manualForm, livestreamId: e.target.value })}
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Choose a livestream...</option>
                {livestreams.map((stream) => (
                  <option key={stream._id} value={stream._id}>
                    {stream.title} - ₹{stream.price}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Notes (Optional)</label>
              <textarea
                value={manualForm.notes}
                onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Add any notes about this manual purchase..."
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => {
                  setManualForm({ userId: '', livestreamId: '', notes: '' });
                  setSelectedUser(null);
                }}
                className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={creatingPurchase || !manualForm.userId || !manualForm.livestreamId}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {creatingPurchase ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Manual Purchase
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
