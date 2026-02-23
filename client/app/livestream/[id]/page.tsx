'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveStreamPlayer } from '@/components/livestream';
import { getApiUrl } from '@/config';
import Link from 'next/link';

interface StreamInfo {
  _id: string;
  title: string;
  description?: string;
  status: 'idle' | 'active' | 'disabled' | 'ended';
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  thumbnailUrl?: string;
  posterUrl?: string;
  accessType: string;
  price: number;
  eventId?: { _id: string; title: string };
  sportsEventId?: { _id: string; name: string };
}

export default function LiveStreamPage() {
  const params = useParams();
  const router = useRouter();
  const streamId = params.id as string;

  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStreamInfo = async () => {
      try {
        const response = await fetch(getApiUrl(`livestream/streams/${streamId}`));
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'Stream not found');
        }

        setStreamInfo(data.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load stream');
      } finally {
        setLoading(false);
      }
    };

    if (streamId) {
      fetchStreamInfo();
    }
  }, [streamId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading stream...</p>
        </div>
      </div>
    );
  }

  if (error || !streamInfo) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center p-8">
          <svg className="w-20 h-20 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-2xl font-bold text-white mb-2">Stream Not Found</h1>
          <p className="text-gray-400 mb-6">{error || 'The stream you are looking for does not exist.'}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (streamInfo.status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-full text-sm font-semibold">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            LIVE NOW
          </span>
        );
      case 'idle':
        if (streamInfo.scheduledStartTime && new Date(streamInfo.scheduledStartTime) > new Date()) {
          return (
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-semibold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              UPCOMING
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-gray-600 text-white rounded-full text-sm font-semibold">
            OFFLINE
          </span>
        );
      case 'ended':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-600 text-white rounded-full text-sm font-semibold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
            REPLAY AVAILABLE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-gray-600 text-white rounded-full text-sm font-semibold">
            OFFLINE
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              AHIBI
            </Link>
            <nav className="flex items-center gap-4">
              <Link href="/events" className="text-gray-600 hover:text-gray-900 transition-colors">
                Events
              </Link>
              <Link href="/sports" className="text-gray-600 hover:text-gray-900 transition-colors">
                Sports
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <LiveStreamPlayer streamId={streamId} className="w-full" />
            
            {/* Stream Info */}
            <div className="mt-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{streamInfo.title}</h1>
                  {getStatusBadge()}
                </div>
              </div>

              {streamInfo.description && (
                <p className="text-gray-600 mt-4 leading-relaxed">{streamInfo.description}</p>
              )}

              {/* Schedule Info */}
              {streamInfo.scheduledStartTime && (
                <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                  <h3 className="text-gray-900 font-semibold mb-2">Schedule</h3>
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>
                      {new Date(streamInfo.scheduledStartTime).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Event Info */}
            {(streamInfo.eventId || streamInfo.sportsEventId) && (
              <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
                <h3 className="text-gray-900 font-semibold mb-4">Related Event</h3>
                {streamInfo.eventId && (
                  <Link
                    href={`/events/${streamInfo.eventId._id}`}
                    className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <p className="text-gray-900 font-medium">{streamInfo.eventId.title}</p>
                    <p className="text-gray-600 text-sm mt-1">View Event Details →</p>
                  </Link>
                )}
                {streamInfo.sportsEventId && (
                  <Link
                    href={`/sports/${streamInfo.sportsEventId._id}`}
                    className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <p className="text-gray-900 font-medium">{streamInfo.sportsEventId.name}</p>
                    <p className="text-gray-600 text-sm mt-1">View Sports Event →</p>
                  </Link>
                )}
              </div>
            )}

            {/* Access Info */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-gray-900 font-semibold mb-4">Access Information</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Access Type</span>
                  <span className="text-gray-900 capitalize">{streamInfo.accessType.replace('_', ' ')}</span>
                </div>
                {streamInfo.price > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Price</span>
                    <span className="text-gray-900">₹{streamInfo.price}</span>
                  </div>
                )}
              </div>

              {streamInfo.accessType === 'ticket_holders' && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-700 text-sm">
                    This stream is available to ticket holders only. Purchase a ticket to the related event to gain access.
                  </p>
                </div>
              )}
            </div>

            {/* Help */}
            <div className="bg-white rounded-lg p-6 mt-6 shadow-sm">
              <h3 className="text-gray-900 font-semibold mb-4">Having Issues?</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>• Ensure you have a stable internet connection</li>
                <li>• Try refreshing the page</li>
                <li>• Check if you&apos;re logged in with the correct account</li>
                <li>• Contact support if issues persist</li>
              </ul>
              <Link
                href="/support"
                className="inline-block mt-4 text-blue-600 hover:text-blue-700 text-sm"
              >
                Contact Support →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
