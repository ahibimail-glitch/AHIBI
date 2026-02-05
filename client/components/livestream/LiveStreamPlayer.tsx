'use client';

import React, { useEffect, useState, useCallback } from 'react';
import MuxPlayer from './MuxPlayer';
import { getApiUrl } from '@/config';

interface StreamInfo {
  id: string;
  title: string;
  description?: string;
  status: 'idle' | 'active' | 'disabled' | 'ended';
  scheduledStartTime?: string;
  thumbnailUrl?: string;
  posterUrl?: string;
  accessType: string;
  price: number;
}

interface PlaybackData {
  playbackId: string;
  token: string;
  streamUrl: string;
  thumbnailUrl: string;
  posterUrl: string;
  isVod: boolean;
  streamStatus: string;
  expiresIn: number;
}

interface LiveStreamPlayerProps {
  streamId: string;
  className?: string;
}

type PlayerState = 'loading' | 'offline' | 'scheduled' | 'live' | 'vod' | 'error' | 'unauthorized';

export default function LiveStreamPlayer({ streamId, className = '' }: LiveStreamPlayerProps) {
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [playbackData, setPlaybackData] = useState<PlaybackData | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [tokenRefreshTimer, setTokenRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  // Fetch stream info (public)
  const fetchStreamInfo = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl(`livestream/streams/${streamId}`));
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch stream info');
      }

      setStreamInfo(data.data);
      return data.data;
    } catch (err) {
      console.error('Fetch stream info error:', err);
      setError('Failed to load stream information');
      setPlayerState('error');
      return null;
    }
  }, [streamId]);

  // Fetch playback token (authenticated)
  const fetchPlaybackToken = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setPlayerState('unauthorized');
        setError('Please log in to watch this stream');
        return null;
      }

      const response = await fetch(getApiUrl(`livestream/streams/${streamId}/playback-token`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!data.success) {
        if (response.status === 403) {
          setPlayerState('unauthorized');
          setError(data.message || 'You do not have access to this stream');
        } else {
          throw new Error(data.message || 'Failed to get playback token');
        }
        return null;
      }

      setPlaybackData(data.data);
      return data.data;
    } catch (err) {
      console.error('Fetch playback token error:', err);
      setError('Failed to initialize video player');
      setPlayerState('error');
      return null;
    }
  }, [streamId]);

  // Determine player state based on stream info
  const determinePlayerState = useCallback((info: StreamInfo, playback: PlaybackData | null) => {
    if (!info) {
      setPlayerState('error');
      return;
    }

    switch (info.status) {
      case 'active':
        if (playback) {
          setPlayerState('live');
        }
        break;
      case 'idle':
        if (info.scheduledStartTime && new Date(info.scheduledStartTime) > new Date()) {
          setPlayerState('scheduled');
        } else {
          setPlayerState('offline');
        }
        break;
      case 'ended':
        if (playback?.isVod) {
          setPlayerState('vod');
        } else {
          setPlayerState('offline');
        }
        break;
      case 'disabled':
        setPlayerState('offline');
        break;
      default:
        setPlayerState('offline');
    }
  }, []);

  // Initialize player
  useEffect(() => {
    const initPlayer = async () => {
      setPlayerState('loading');
      
      const info = await fetchStreamInfo();
      if (!info) return;

      // Only fetch playback token if stream is active or has VOD
      if (info.status === 'active' || info.status === 'ended') {
        const playback = await fetchPlaybackToken();
        determinePlayerState(info, playback);
      } else {
        determinePlayerState(info, null);
      }
    };

    initPlayer();

    // Cleanup
    return () => {
      if (tokenRefreshTimer) {
        clearTimeout(tokenRefreshTimer);
      }
    };
  }, [streamId, fetchStreamInfo, fetchPlaybackToken, determinePlayerState, tokenRefreshTimer]);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (playbackData?.expiresIn && (playerState === 'live' || playerState === 'vod')) {
      // Refresh 5 minutes before expiry
      const refreshTime = (playbackData.expiresIn - 300) * 1000;
      
      const timer = setTimeout(async () => {
        console.log('Refreshing playback token...');
        await fetchPlaybackToken();
      }, refreshTime);

      setTokenRefreshTimer(timer);

      return () => clearTimeout(timer);
    }
  }, [playbackData?.expiresIn, playerState, fetchPlaybackToken]);

  // Poll for stream status when scheduled or offline
  useEffect(() => {
    if (playerState === 'scheduled' || playerState === 'offline') {
      const pollInterval = setInterval(async () => {
        const info = await fetchStreamInfo();
        if (info?.status === 'active') {
          const playback = await fetchPlaybackToken();
          determinePlayerState(info, playback);
        }
      }, 30000); // Poll every 30 seconds

      return () => clearInterval(pollInterval);
    }
  }, [playerState, fetchStreamInfo, fetchPlaybackToken, determinePlayerState]);

  // Render loading state
  if (playerState === 'loading') {
    return (
      <div className={`flex items-center justify-center bg-gray-900 rounded-lg ${className}`} style={{ aspectRatio: '16/9' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading stream...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (playerState === 'error') {
    return (
      <div className={`flex items-center justify-center bg-gray-900 rounded-lg ${className}`} style={{ aspectRatio: '16/9' }}>
        <div className="text-center p-8">
          <svg className="w-16 h-16 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-white text-lg mb-2">Something went wrong</p>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render unauthorized state
  if (playerState === 'unauthorized') {
    return (
      <div className={`flex items-center justify-center bg-gray-900 rounded-lg ${className}`} style={{ aspectRatio: '16/9' }}>
        <div className="text-center p-8">
          <svg className="w-16 h-16 mx-auto text-yellow-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-white text-lg mb-2">Access Required</p>
          <p className="text-gray-400 mb-4">{error || 'You need a valid ticket to watch this stream'}</p>
          <a
            href="/auth"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Log In
          </a>
        </div>
      </div>
    );
  }

  // Render scheduled state
  if (playerState === 'scheduled' && streamInfo) {
    const scheduledDate = streamInfo.scheduledStartTime ? new Date(streamInfo.scheduledStartTime) : null;
    
    return (
      <div 
        className={`flex items-center justify-center bg-gray-900 rounded-lg ${className}`} 
        style={{ 
          aspectRatio: '16/9',
          backgroundImage: streamInfo.posterUrl ? `url(${streamInfo.posterUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="bg-black/70 p-8 rounded-lg text-center backdrop-blur-sm">
          <svg className="w-16 h-16 mx-auto text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-white text-xl font-bold mb-2">{streamInfo.title}</h3>
          <p className="text-gray-300 mb-4">Stream starts soon</p>
          {scheduledDate && (
            <div className="text-blue-400 font-semibold">
              {scheduledDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render offline state
  if (playerState === 'offline') {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-900 rounded-lg ${className}`} 
        style={{ 
          aspectRatio: '16/9',
          backgroundImage: streamInfo?.posterUrl ? `url(${streamInfo.posterUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="bg-black/70 p-8 rounded-lg text-center backdrop-blur-sm">
          <svg className="w-16 h-16 mx-auto text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="text-white text-xl font-bold mb-2">{streamInfo?.title || 'Stream'}</h3>
          <p className="text-gray-400">Stream is currently offline</p>
        </div>
      </div>
    );
  }

  // Render live or VOD player
  if ((playerState === 'live' || playerState === 'vod') && playbackData) {
    return (
      <div className={className}>
        <MuxPlayer
          playbackId={playbackData.playbackId}
          token={playbackData.token}
          streamUrl={playbackData.streamUrl}
          posterUrl={playbackData.posterUrl || streamInfo?.posterUrl}
          title={streamInfo?.title}
          isLive={playerState === 'live'}
          autoPlay={playerState === 'live'}
          muted={playerState === 'live'}
        />
        {playerState === 'vod' && (
          <div className="mt-2 flex items-center gap-2 text-gray-400 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Replay</span>
          </div>
        )}
      </div>
    );
  }

  return null;
}
