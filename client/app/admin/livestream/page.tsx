'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/config';

interface LiveStream {
  _id: string;
  title: string;
  description?: string;
  status: 'idle' | 'active' | 'disabled' | 'ended';
  muxStatus: string;
  scheduledStartTime?: string;
  accessType: string;
  price: number;
  totalViews: number;
  peakViewers: number;
  createdAt: string;
  eventId?: { _id: string; title: string };
  sportsEventId?: { _id: string; name: string };
  embedUrl?: string | null;
}

interface OBSConfig {
  rtmpUrl: string;
  streamKey: string;
  fullUrl: string;
}

interface CreateStreamForm {
  eventTitle: string;
  description: string;
  eventId: string;
  sportsEventId: string;
  accessType: string;
  price: number;
  scheduledStartTime: string;
  latencyMode: string;
  embedUrl: string;
}

const LIVESTREAM_EVENTS = [
  "1st NWA Provisional Championship & 1st NWA Under 15 Championship cum 1st Wrestling Festival",
  "30th NWA Naga Traditional Wrestling Championship cum 1st Wrestling Festival"
];

export default function AdminLivestreamPage() {
  const router = useRouter();
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOBSModal, setShowOBSModal] = useState(false);
  const [selectedOBSConfig, setSelectedOBSConfig] = useState<OBSConfig | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  const [embedUrlInput, setEmbedUrlInput] = useState('');
  const [savingEmbed, setSavingEmbed] = useState(false);

  const [formData, setFormData] = useState<CreateStreamForm>({
    eventTitle: '',
    description: '',
    eventId: '',
    sportsEventId: '',
    accessType: 'paid',
    price: 0,
    scheduledStartTime: '',
    latencyMode: 'low',
    embedUrl: ''
  });

  const getToken = () => localStorage.getItem('admin_token');

  const fetchStreams = async () => {
    try {
      const response = await fetch(getApiUrl('livestream/admin/streams'), {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch streams');
      }

      setStreams(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openEmbedModal = (stream: LiveStream) => {
    setSelectedStream(stream);
    setEmbedUrlInput(stream.embedUrl || '');
    setShowEmbedModal(true);
  };

  const handleSaveEmbedUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStream) return;

    setSavingEmbed(true);
    try {
      const response = await fetch(getApiUrl(`livestream/admin/streams/${selectedStream._id}/embed-url`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ embedUrl: embedUrlInput })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to update embed URL');
      }

      setStreams((prev) => prev.map(stream => stream._id === selectedStream._id ? { ...stream, embedUrl: data.data.embedUrl } : stream));

      setShowEmbedModal(false);
      setSelectedStream(null);
      setEmbedUrlInput('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingEmbed(false);
    }
  };

  useEffect(() => {
    fetchStreams();
  }, []);

  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch(getApiUrl('livestream/admin/create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to create stream');
      }

      // Show OBS config
      setSelectedOBSConfig(data.data.obsConfig);
      setShowCreateModal(false);
      setShowOBSModal(true);

      // Reset form
      setFormData({
        eventTitle: '',
        description: '',
        eventId: '',
        sportsEventId: '',
        accessType: 'paid',
        price: 0,
        scheduledStartTime: '',
        latencyMode: 'low',
        embedUrl: ''
      });

      // Refresh list
      fetchStreams();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleEnableStream = async (streamId: string) => {
    setActionLoading(streamId);
    try {
      const response = await fetch(getApiUrl(`livestream/admin/streams/${streamId}/enable`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      fetchStreams();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisableStream = async (streamId: string) => {
    if (!confirm('Are you sure you want to disable this stream?')) return;
    
    setActionLoading(streamId);
    try {
      const response = await fetch(getApiUrl(`livestream/admin/streams/${streamId}/disable`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      fetchStreams();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteStream = async (streamId: string) => {
    if (!confirm('Are you sure you want to delete this stream? This action cannot be undone.')) return;
    
    setActionLoading(streamId);
    try {
      const response = await fetch(getApiUrl(`livestream/admin/streams/${streamId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      fetchStreams();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewOBSConfig = async (streamId: string) => {
    setActionLoading(streamId);
    try {
      const response = await fetch(getApiUrl(`livestream/admin/streams/${streamId}`), {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      setSelectedOBSConfig(data.data.obsConfig);
      setShowOBSModal(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const getStatusBadge = (status: string, muxStatus: string) => {
    if (status === 'active' || muxStatus === 'active') {
      return <span className="px-2 py-1 bg-red-600 text-white rounded text-xs font-semibold">LIVE</span>;
    }
    switch (status) {
      case 'idle':
        return <span className="px-2 py-1 bg-yellow-600 text-white rounded text-xs font-semibold">IDLE</span>;
      case 'disabled':
        return <span className="px-2 py-1 bg-gray-600 text-white rounded text-xs font-semibold">DISABLED</span>;
      case 'ended':
        return <span className="px-2 py-1 bg-purple-600 text-white rounded text-xs font-semibold">ENDED</span>;
      default:
        return <span className="px-2 py-1 bg-gray-600 text-white rounded text-xs font-semibold">{status.toUpperCase()}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Live Streams</h1>
            <p className="text-gray-400 mt-1">Manage live streaming for events</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Stream
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Streams Table */}
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Stream</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Access</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Views</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Scheduled</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {streams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No live streams created yet. Click &quot;Create Stream&quot; to get started.
                  </td>
                </tr>
              ) : (
                streams.map((stream) => (
                  <tr key={stream._id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{stream.title}</p>
                        {stream.eventId && (
                          <p className="text-gray-400 text-sm">Event: {stream.eventId.title}</p>
                        )}
                        {stream.sportsEventId && (
                          <p className="text-gray-400 text-sm">Sports: {stream.sportsEventId.name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(stream.status, stream.muxStatus)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-300 capitalize">{stream.accessType.replace('_', ' ')}</span>
                      {stream.price > 0 && (
                        <span className="text-gray-400 text-sm block">₹{stream.price}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-300">
                        <p>{stream.totalViews} total</p>
                        <p className="text-gray-400 text-sm">{stream.peakViewers} peak</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {stream.scheduledStartTime
                        ? new Date(stream.scheduledStartTime).toLocaleString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewOBSConfig(stream._id)}
                          disabled={actionLoading === stream._id}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                          title="View OBS Config"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {stream.status === 'disabled' ? (
                          <button
                            onClick={() => handleEnableStream(stream._id)}
                            disabled={actionLoading === stream._id}
                            className="p-2 text-green-400 hover:text-green-300 hover:bg-gray-700 rounded transition-colors"
                            title="Enable Stream"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDisableStream(stream._id)}
                            disabled={actionLoading === stream._id || stream.status === 'ended'}
                            className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                            title="Disable Stream"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteStream(stream._id)}
                          disabled={actionLoading === stream._id}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded transition-colors"
                          title="Delete Stream"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openEmbedModal(stream)}
                          className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-gray-700 rounded transition-colors"
                          title="Set Custom Stream ID"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L18 9.828m1.414-4.242a2 2 0 00-2.828 0L9 12.172V15h2.828l7.586-7.586a2 2 0 000-2.828z" />
                          </svg>
                        </button>
                        <a
                          href={`/livestream/${stream._id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded transition-colors"
                          title="View Stream Page"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Create Stream Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-800">
                <h2 className="text-xl font-bold text-white">Create Live Stream</h2>
              </div>
              <form onSubmit={handleCreateStream} className="p-6 space-y-6">
                <div>
                  <label className="block text-gray-300 mb-2">Event *</label>
                  <select
                    value={formData.eventTitle}
                    onChange={(e) => setFormData({ ...formData, eventTitle: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select an event</option>
                    {LIVESTREAM_EVENTS.map((event) => (
                      <option key={event} value={event}>
                        {event}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Live coverage of the championship..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Access Type</label>
                    <select
                      value={formData.accessType}
                      onChange={(e) => setFormData({ ...formData, accessType: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="paid">Paid Access</option>
                      <option value="public">Public</option>
                      <option value="ticket_holders">Ticket Holders Only</option>
                      <option value="subscribers">Subscribers Only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">Price (₹) *</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="1"
                      required
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      placeholder="299"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Latency Mode</label>
                  <select
                    value={formData.latencyMode}
                    onChange={(e) => setFormData({ ...formData, latencyMode: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="low">Low Latency (~5s)</option>
                    <option value="reduced">Reduced Latency (~10s)</option>
                    <option value="standard">Standard (~30s)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Scheduled Start Time</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledStartTime}
                    onChange={(e) => setFormData({ ...formData, scheduledStartTime: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Custom Stream Embed URL</label>
                  <input
                    type="url"
                    value={formData.embedUrl}
                    onChange={(e) => setFormData({ ...formData, embedUrl: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="https://player.mux.com/your-embed-id"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Optional: Provide a direct player URL (e.g., Mux or YouTube embed). If left blank, the default configured player will be used.
                  </p>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Stream'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* OBS Config Modal */}
        {showOBSModal && selectedOBSConfig && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg max-w-2xl w-full">
              <div className="p-6 border-b border-gray-800">
                <h2 className="text-xl font-bold text-white">OBS Studio Configuration</h2>
                <p className="text-gray-400 mt-1">Use these settings to configure your streaming software</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ Keep your stream key secret! Never share it publicly.
                  </p>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Server URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={selectedOBSConfig.rtmpUrl}
                      readOnly
                      className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(selectedOBSConfig.rtmpUrl)}
                      className="px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Stream Key</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={selectedOBSConfig.streamKey}
                      readOnly
                      className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(selectedOBSConfig.streamKey)}
                      className="px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-3">Recommended OBS Settings</h3>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li><strong>Encoder:</strong> x264 or NVENC (if available)</li>
                    <li><strong>Bitrate:</strong> 4000-6000 kbps</li>
                    <li><strong>Resolution:</strong> 1920x1080 (1080p)</li>
                    <li><strong>Framerate:</strong> 30 fps</li>
                    <li><strong>Keyframe Interval:</strong> 2 seconds</li>
                    <li><strong>Profile:</strong> high</li>
                    <li><strong>Tune:</strong> zerolatency (for low latency)</li>
                  </ul>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowOBSModal(false);
                      setSelectedOBSConfig(null);
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Embed URL Modal */}
        {showEmbedModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg max-w-lg w-full">
              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Custom Stream ID</h2>
                  <p className="text-gray-400 text-sm">Set a custom Mux stream ID for this livestream.</p>
                </div>
                <button onClick={() => setShowEmbedModal(false)} className="text-gray-500 hover:text-gray-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSaveEmbedUrl} className="p-6 space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">Mux Stream ID</label>
                  <input
                    type="text"
                    value={embedUrlInput}
                    onChange={(e) => setEmbedUrlInput(e.target.value)}
                    placeholder="b4ZwgkvTF7QtgUUDi57g5dgeZ9Wlbm7xnBLDC5MTeqI"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="mt-2 text-sm text-gray-500">Leave blank to use the default stream ID. Enter a Mux playback ID to use a different stream.</p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEmbedModal(false)}
                    className="px-5 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEmbed}
                    className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
                  >
                    {savingEmbed ? 'Saving...' : 'Save ID'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
