'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getApiUrl } from '@/config';
import Link from 'next/link';
import Navbar from '@/app/Navbar';
import Footer from '@/app/Footer';
import MuxPlayer from "@mux/mux-player-react";
import LiveChat from '@/components/livestream/LiveChat';

const HEARTBEAT_INTERVAL_MS = 25_000;

// Event name to image mapping
const EVENT_IMAGES: Record<string, string> = {
  "1st NWA Provisional Championship & 1st NWA Under 15 Championship cum 1st Wrestling Festival": "https://res.cloudinary.com/dovc3lfgz/image/upload/v1771518218/ahibi/ttof83dmfocmdqovcb3v.jpg",
  "30th NWA Naga Traditional Wrestling Championship cum 1st Wrestling Festival": "https://res.cloudinary.com/dovc3lfgz/image/upload/v1771517850/ahibi/xy6prc6usk8fxgocy4ay.jpg"
};
interface StreamInfo {
  _id: string;
  title: string;
  description?: string;
  status: 'idle' | 'active' | 'disabled' | 'ended';
  muxStatus: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  thumbnailUrl?: string;
  posterUrl?: string;
  accessType: string;
  price: number;
  eventId?: { _id: string; title: string };
  sportsEventId?: { _id: string; name: string };
  muxPlaybackId?: string;
  embedUrl?: string;
}

interface AccessCheck {
  hasAccess: boolean;
  reason: string;
  message?: string;
}

export default function LiveStreamPage() {
  const params = useParams();
  const router = useRouter();
  const streamId = params?.id as string;
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessCheck, setAccessCheck] = useState<AccessCheck | null>(null);

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionBlocked, setSessionBlocked] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionLastSeen, setSessionLastSeen] = useState<string | null>(null);
  const [contentObscured, setContentObscured] = useState(false);
  const [obscureReason, setObscureReason] = useState<string | null>(null);
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  const joinSession = async (force = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSessionLoading(true);
    try {
      const res = await fetch(getApiUrl(`livestream/streams/${streamId}/join`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setSessionBlocked(true);
        setSessionLastSeen(data.lastSeen ? new Date(data.lastSeen).toLocaleTimeString() : null);
        return;
      }
      if (data.success) {
        setSessionToken(data.sessionToken);
        sessionTokenRef.current = data.sessionToken;
        setSessionBlocked(false);
        startHeartbeat(data.sessionToken);
      }
    } catch (e) {
      console.error('Session join error:', e);
    } finally {
      setSessionLoading(false);
    }
  };

  const startHeartbeat = (token: string) => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(async () => {
      const authToken = localStorage.getItem('token');
      if (!authToken || !token) return;
      try {
        const res = await fetch(getApiUrl(`livestream/streams/${streamId}/heartbeat`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
          body: JSON.stringify({ sessionToken: token }),
        });
        const data = await res.json();
        if (!data.success && data.code === 'SESSION_EXPIRED') {
          clearInterval(heartbeatRef.current!);
          setSessionBlocked(true);
        }
      } catch (e) {
        console.error('Heartbeat error:', e);
      }
    }, HEARTBEAT_INTERVAL_MS);
  };

  const leaveSession = () => {
    const token = localStorage.getItem('token');
    const sToken = sessionTokenRef.current;
    if (!token || !sToken) return;
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    fetch(getApiUrl(`livestream/streams/${streamId}/leave`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ sessionToken: sToken }),
      keepalive: true,
    }).catch(() => {});
  };

  useEffect(() => {
    if (accessCheck?.hasAccess && isAuthenticated && !sessionToken && !sessionBlocked) {
      joinSession();
    }
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [accessCheck, isAuthenticated]);

  
  useEffect(() => {
    window.addEventListener('beforeunload', leaveSession);
    return () => {
      window.removeEventListener('beforeunload', leaveSession);
      leaveSession();
    };
  }, [streamId]);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'PrintScreen' ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
        (e.ctrlKey && e.key === 'u')
      ) {
        e.preventDefault();
        return false;
      }
    };

    const handleCopy = (e: Event) => {
      e.preventDefault();
    };

    const handleCut = (e: Event) => {
      e.preventDefault();
    };

    const handleDragStart = (e: Event) => {
      e.preventDefault();
    };

    const obscureContent = (reason: string) => {
      setContentObscured(true);
      setObscureReason(reason);
    };

    const revealContent = () => {
      setContentObscured(false);
      setObscureReason(null);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        obscureContent('visibility');
      } else {
        revealContent();
      }
    };

    const handleWindowBlur = () => {
      obscureContent('blur');
    };

    const handleWindowFocus = () => {
      if (!document.hidden) revealContent();
    };

    const detectDevTools = () => {
      const threshold = 160;
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        obscureContent('devtools');
      }
    };

    const preventScreenSharing = () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
        navigator.mediaDevices.getDisplayMedia = function(options: any) {
          return Promise.reject(new Error('Screen sharing is not allowed on this page'));
        };
      }
    };

    const preventScreenCapture = () => {
      // Add CSS to prevent screen capture
      const style = document.createElement('style');
      style.textContent = `
        * {
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          -khtml-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
        }
        
        body {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        @media print {
          body * {
            visibility: hidden !important;
          }
          body::before {
            content: "Screen capture is not allowed" !important;
            visibility: visible !important;
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            font-size: 24px !important;
            color: red !important;
          }
        }
        
        video {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
        }
      `;
      document.head.appendChild(style);

      document.addEventListener('copy', handleCopy);
      document.addEventListener('cut', handleCut);
      document.addEventListener('dragstart', handleDragStart);

      // Detect and block screen recording software
      const detectScreenRecording = () => {
        // Check for common screen recording indicators
        if (window.outerHeight <= 1 || window.outerWidth <= 1) {
          obscureContent('recording');
        }
        
        // Check if page is in an iframe (common for screen recording)
        if (window.top !== window.self) {
          window.top.location.href = window.location.href;
        }
      };

      const recordingInterval = setInterval(detectScreenRecording, 500);

      return () => {
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
        document.removeEventListener('copy', handleCopy);
        document.removeEventListener('cut', handleCut);
        document.removeEventListener('dragstart', handleDragStart);
        clearInterval(recordingInterval);
      };
    };

    const disablePictureInPicture = () => {
      const container = playerContainerRef.current;
      if (!container) return;

      let cleanupListener: (() => void) | null = null;
      let pollInterval: ReturnType<typeof setInterval> | null = null;

      const attemptDisable = () => {
        const video = container.querySelector('video') as HTMLVideoElement | null;
        if (!video) return false;

        try {
          (video as any).disablePictureInPicture = true;
        } catch {}

        const handleEnterPiP = (e: Event) => {
          e.preventDefault();
          try {
            if (document.pictureInPictureElement) {
              document.exitPictureInPicture().catch(() => {});
            }
          } catch {}
        };

        video.addEventListener('enterpictureinpicture', handleEnterPiP);
        return () => video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      };

      const initialCleanup = attemptDisable();
      if (typeof initialCleanup === 'function') {
        cleanupListener = initialCleanup;
      } else {
        pollInterval = setInterval(() => {
          if (cleanupListener) return;
          const result = attemptDisable();
          if (typeof result === 'function') {
            cleanupListener = result;
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
          }
        }, 500);
      }

      return () => {
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        if (cleanupListener) {
          cleanupListener();
          cleanupListener = null;
        }
      };
    };

    const interval = setInterval(detectDevTools, 1000);

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    
    preventScreenSharing();
    const cleanupCapture = preventScreenCapture();
    const cleanupPiP = disablePictureInPicture();
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      clearInterval(interval);
      cleanupCapture();
      if (cleanupPiP) cleanupPiP();
    };
  }, []);

  const handlePurchaseLivestream = async () => {
    if (!user || !streamInfo) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push(`/auth?redirect=/livestream/${streamId}`);
        return;
      }

      // Create Razorpay order for livestream purchase
      const response = await fetch(getApiUrl('livestream/purchase/create-order'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          livestreamId: streamInfo._id,
          amount: streamInfo.price
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to create payment order');
      }

      // Initialize Razorpay payment
      const Razorpay = (window as any).Razorpay;
      const razorpay = new Razorpay({
        key_id: data.data.keyId,
        key_secret: data.data.keySecret,
        amount: data.data.amount,
        currency: data.data.currency || 'INR',
        name: 'AHIBI',
        description: `Access to ${streamInfo.title}`,
        order_id: data.data.orderId,
        handler: async (response: any) => {
          // Verify payment and grant access
          try {
            const verifyResponse = await fetch(getApiUrl('livestream/purchase/verify'), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                livestreamId: streamInfo._id
              })
            });

            const verifyData = await verifyResponse.json();
            if (verifyData.success) {
              // Refresh access check
              const access = await checkStreamAccess(streamInfo);
              setAccessCheck(access);

              // Show success message
              alert('Payment successful! You now have access to this livestream.');
            } else {
              throw new Error(verifyData.message || 'Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone
        },
        theme: {
          color: '#3B82F6'
        }
      });

      razorpay.open();
    } catch (error) {
      console.error('Purchase error:', error);
      alert(error instanceof Error ? error.message : 'Failed to initiate payment. Please try again.');
    }
  };

  const checkStreamAccess = async (stream: StreamInfo) => {
    // Public streams are accessible to all authenticated users
    if (stream.accessType === 'public') {
      return { hasAccess: true, reason: 'public' };
    }

    // Private streams require admin access
    if (stream.accessType === 'private') {
      if (user?.role === 'admin') {
        return { hasAccess: true, reason: 'admin' };
      }
      return {
        hasAccess: false,
        reason: 'private',
        message: 'This stream is private. Only administrators can access it.'
      };
    }

    // Paid streams require payment (with name-based logic)
    if (stream.accessType === 'paid') {
      // Check if user has purchased access via API
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          return {
            hasAccess: false,
            reason: 'auth_required',
            message: 'Please login to purchase access to this stream.'
          };
        }

        const response = await fetch(getApiUrl(`livestream/streams/${stream._id}/check-access`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();
        if (data.success && data.data.hasAccess) {
          let message = data.data.message || 'Access granted';
          
          // Special message for name-based access
          if (data.data.reason === 'paid_access_name_based') {
            message = `Access granted - you have purchased access to "${stream.title}" livestream`;
          }
          
          return {
            hasAccess: true,
            reason: data.data.reason,
            message
          };
        }

        return {
          hasAccess: false,
          reason: 'payment_required',
          message: data.data.message || `This is a paid stream. Please purchase a ticket for ₹${stream.price} to access.`
        };
      } catch (error) {
        console.error('Error checking paid access:', error);
        // Fallback: allow admin access
        if (user?.role === 'admin') {
          return { hasAccess: true, reason: 'admin' };
        }
        return {
          hasAccess: false,
          reason: 'payment_required',
          message: `This is a paid stream. Please purchase a ticket for ₹${stream.price} to access.`
        };
      }
    }

    // Ticket holders need valid booking (with name-based logic)
    if (stream.accessType === 'ticket_holders') {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          return {
            hasAccess: false,
            reason: 'auth_required',
            message: 'Please login to check your ticket access.'
          };
        }

        const response = await fetch(getApiUrl(`livestream/streams/${stream._id}/check-access`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();
        if (data.success && data.data.hasAccess) {
          let message = data.data.message || 'Access granted with valid ticket';
          
          // Special message for name-based access
          if (data.data.reason === 'ticket_holder' && !data.data.message.includes('specific')) {
            message = `Access granted - you have a ticket for "${stream.title}" event`;
          }
          
          return {
            hasAccess: true,
            reason: 'ticket_holder',
            message
          };
        }

        return {
          hasAccess: false,
          reason: 'no_ticket',
          message: data.data.message || 'You need a valid ticket to access this stream.'
        };
      } catch (error) {
        console.error('Error checking ticket access:', error);
        return {
          hasAccess: false,
          reason: 'check_failed',
          message: 'Unable to verify ticket access. Please try again.'
        };
      }
    }

    // Subscribers only
    if (stream.accessType === 'subscribers') {
      if (user?.role === 'admin' || user?.role === 'subscriber') {
        return { hasAccess: true, reason: 'subscriber' };
      }
      return {
        hasAccess: false,
        reason: 'subscription_required',
        message: 'This stream is available to subscribers only.'
      };
    }

    // Default: deny access
    return {
      hasAccess: false,
      reason: 'unknown',
      message: 'Access denied. Please contact support.'
    };
  };

  useEffect(() => {
    const fetchStreamInfo = async () => {
      // Wait for auth to complete
      if (authLoading) return;

      try {
        const response = await fetch(getApiUrl(`livestream/streams/${streamId}`));
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'Stream not found');
        }

        const stream = data.data;
        setStreamInfo(stream);

        // Check access permissions
        const access = await checkStreamAccess(stream);
        setAccessCheck(access);

      } catch (err: any) {
        setError(err.message || 'Failed to load stream');
      } finally {
        setLoading(false);
      }
    };

    if (streamId && !authLoading) {
      fetchStreamInfo();
    }
  }, [streamId, authLoading, user]);

  if (authLoading || loading) {
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

  // Check if user is authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center p-8">
          <svg className="w-20 h-20 mx-auto text-yellow-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h1 className="text-2xl font-bold text-white mb-2">Authentication Required</h1>
          <p className="text-gray-400 mb-6">Please login to access this livestream.</p>
          <Link
            href={`/auth?redirect=/livestream/${streamId}`}
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Login to Continue
          </Link>
        </div>
      </div>
    );
  }

  // Check if user has access
  if (accessCheck && !accessCheck.hasAccess) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <svg className="w-20 h-20 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">{accessCheck.message || 'You do not have permission to access this stream.'}</p>

          {/* Show specific action buttons based on access type */}
          <div className="space-y-3">
            {accessCheck.reason === 'payment_required' && (
              <Link
                href="/livestream"
                className="block w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Buy Access
              </Link>
            )}
            {accessCheck.reason === 'auth_required' && (
              <Link
                href={`/auth?redirect=/livestream/${streamId}`}
                className="block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Login to Purchase Access
              </Link>
            )}
            {accessCheck.reason === 'subscription_required' && (
              <Link
                href="/subscribe"
                className="block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Subscribe Now
              </Link>
            )}
            <Link
              href="/"
              className="block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }



  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Establishing secure session...</p>
        </div>
      </div>
    );
  }

  if (sessionBlocked) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-orange-500/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2M12 3v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Already Watching</h1>
          <p className="text-gray-400 mb-2">
            This stream is currently active on another device, browser, or tab.
          </p>
          {sessionLastSeen && (
            <p className="text-gray-500 text-sm mb-6">
              Last seen on other device at <span className="text-gray-300">{sessionLastSeen}</span>
            </p>
          )}
          <p className="text-gray-500 text-sm mb-8">
            Only one simultaneous stream session is allowed per account.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => joinSession(true)}
              className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Watch Here Instead
            </button>
            <p className="text-gray-600 text-xs">
              This will end the session on the other device.
            </p>
            <Link
              href="/"
              className="block px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-8">
            <div ref={playerContainerRef} className="relative">
              <MuxPlayer
                playbackId={streamInfo?.embedUrl || streamInfo?.muxPlaybackId || streamId}
                streamType={streamInfo?.status === "active" ? "live" : "on-demand"}

                // UI / styling
                className="w-full aspect-video rounded-2xl overflow-hidden shadow-lg"

              
                autoPlay={false}
                muted={false}
                loop={false}

                // Live-specific
                preferPlayback="mse"
                metadata={{
                  video_id: streamId,
                  video_title: streamInfo?.title || "Live Stream",
                }}

                // Poster thumbnail - use specific event image if available
                poster={EVENT_IMAGES[streamInfo?.title || ''] || streamInfo?.thumbnailUrl}

                // Optional features
                primaryColor="#ffffff"
                secondaryColor="#000000"

               
                // Show loading indicator properly
                style={{
                  width: "100%",
                  aspectRatio: "16/9",
                  borderRadius: "16px",
                }}
              />

              
              {contentObscured && (
                <div className="absolute inset-0 z-50 rounded-2xl bg-black/90 backdrop-blur-md flex items-center justify-center">
                  <div className="text-center px-6">
                    <p className="text-white text-lg font-semibold">Secure content hidden</p>
                    <p className="text-gray-300 text-sm mt-2">
                      Switch back to this tab/window to continue watching.
                    </p>
                    {obscureReason && (
                      <p className="text-gray-500 text-xs mt-3">Reason: {obscureReason}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Chat Button - Only visible on mobile */}
            <button
              onClick={() => {
                const chatSection = document.getElementById('live-chat-section');
                if (chatSection) {
                  chatSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="lg:hidden mt-4 w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Join Live Chat
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Stream Info */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{streamInfo.title}</h2>
              
              {streamInfo.description && (
                <p className="text-gray-600 leading-relaxed">{streamInfo.description}</p>
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
                      {new Date(streamInfo.scheduledStartTime).toLocaleString('en-IN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Asia/Kolkata',
                        timeZoneName: 'short'
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Live Chat */}
          <div id="live-chat-section" className="lg:col-span-4">
            <div className="sticky top-4" style={{ height: 'calc(100vh - 120px)' }}>
              <LiveChat
                streamId={streamId}
                userId={user?.id || ''}
                userName={user?.name || 'Anonymous'}
                userEmail={user?.email || ''}
                isAdmin={user?.role === 'admin'}
              />
            </div>
          </div>
        </div>

        {/* Additional Info Section */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stream Info - Now Below Video */}
          <div className="lg:col-span-2">
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
      <Footer />
    </div>
  );
}
