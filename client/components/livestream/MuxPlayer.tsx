'use client';

import React, { useEffect, useState, useCallback } from 'react';
import MuxPlayerElement from '@mux/mux-player-react';

interface MuxPlayerProps {
  playbackId: string;
  token: string;
  streamUrl?: string;
  posterUrl?: string;
  title?: string;
  isLive?: boolean;
  onError?: (error: Error) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
}

export default function MuxPlayer({
  playbackId,
  token,
  streamUrl,
  posterUrl,
  title,
  isLive = false,
  onError,
  onPlay,
  onPause,
  onEnded,
  autoPlay = false,
  muted = false,
  className = ''
}: MuxPlayerProps) {
  const [playerError, setPlayerError] = useState<string | null>(null);

  const handleError = useCallback((event: Event) => {
    const error = new Error('Playback error occurred');
    setPlayerError('Failed to load video. Please try again.');
    onError?.(error);
    console.error('Mux Player error:', event);
  }, [onError]);

  if (playerError) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 rounded-lg ${className}`} style={{ aspectRatio: '16/9' }}>
        <div className="text-center p-8">
          <svg className="w-16 h-16 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-white text-lg mb-4">{playerError}</p>
          <button
            onClick={() => setPlayerError(null)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      <MuxPlayerElement
        playbackId={playbackId}
        tokens={{ playback: token }}
        streamType={isLive ? 'live' : 'on-demand'}
        poster={posterUrl}
        title={title}
        autoPlay={autoPlay}
        muted={muted}
        preload="auto"
        primaryColor="#3b82f6"
        secondaryColor="#1e40af"
        accentColor="#60a5fa"
        onError={handleError}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        style={{ width: '100%', aspectRatio: '16/9' }}
        metadata={{
          video_title: title || 'Live Stream',
          viewer_user_id: 'anonymous'
        }}
      />
      
      {isLive && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          LIVE
        </div>
      )}
    </div>
  );
}
