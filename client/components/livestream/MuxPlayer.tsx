'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  const [qualityOptions, setQualityOptions] = useState<{ id: string; label: string; selected: boolean }[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string>('auto');
  const playerRef = useRef<any>(null);

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

  const syncQualities = useCallback(() => {
    const player = playerRef.current;
    if (!player || !player.qualities) {
      setQualityOptions([]);
      setSelectedQuality('auto');
      return;
    }

    const qualities = Array.from(player.qualities) as Array<{
      id: string;
      name?: string;
      height?: number;
      selected: boolean;
      enabled: boolean;
    }>;

    qualities.sort((a, b) => (b.height || 0) - (a.height || 0));

    setQualityOptions(
      qualities.map((quality) => ({
        id: quality.id,
        label: quality.name || `${quality.height || ''}p` || 'Quality',
        selected: quality.selected
      }))
    );

    const current = qualities.find((quality) => quality.selected);
    setSelectedQuality(current?.id || 'auto');
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handleLoadedData = () => {
      syncQualities();
    };

    player.addEventListener('loadeddata', handleLoadedData);
    player.addEventListener('progress', syncQualities);

    return () => {
      player.removeEventListener('loadeddata', handleLoadedData);
      player.removeEventListener('progress', syncQualities);
    };
  }, [syncQualities, playbackId]);

  const handleQualityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedQuality(value);

    const player = playerRef.current;
    if (!player || !player.qualities) return;

    const qualities = Array.from(player.qualities) as Array<{ id: string; enabled: boolean }>;

    if (value === 'auto') {
      qualities.forEach((quality) => {
        quality.enabled = true;
      });
      return;
    }

    qualities.forEach((quality) => {
      quality.enabled = quality.id === value;
    });
  };

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      <MuxPlayerElement
        ref={playerRef}
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

      {qualityOptions.length > 0 && (
        <div className="absolute top-4 right-4 bg-white/90 border border-white rounded-full shadow-xl px-4 py-2 flex items-center gap-2 text-xs text-gray-700">
          <span className="font-semibold text-gray-600">Quality</span>
          <select
            className="bg-transparent text-gray-900 font-medium focus:outline-none"
            value={selectedQuality}
            onChange={handleQualityChange}
          >
            <option value="auto">Auto</option>
            {qualityOptions.map((quality) => (
              <option key={quality.id} value={quality.id}>
                {quality.label || 'Quality'}
              </option>
            ))}
          </select>
        </div>
      )}

      {isLive && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          LIVE
        </div>
      )}
    </div>
  );
}
