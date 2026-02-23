'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { getApiUrl } from '@/config';
import Navbar from '@/app/Navbar';
import Footer from '@/app/Footer';

interface LivestreamEvent {
  _id: string;
  title: string;
  description?: string;
  status: 'idle' | 'active' | 'disabled' | 'ended';
  scheduledStartTime?: string;
  thumbnailUrl?: string;
  posterUrl?: string;
  accessType: string;
  price: number;
  currency: string;
}

interface AccessCheck {
  hasAccess: boolean;
  reason: string;
  requiresPurchase: boolean;
  purchase?: {
    id: string;
    paymentDate: string;
    amount: number;
  };
}

export default function LivestreamListingPage() {
  const router = useRouter();
  const [events, setEvents] = useState<LivestreamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userAccess, setUserAccess] = useState<Record<string, AccessCheck>>({});
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch(getApiUrl('livestream/active'));
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch events');
      }

      setEvents(data.data);
      
      // Check access for paid events if user is logged in
      const token = localStorage.getItem('token');
      if (token) {
        checkAccessForEvents(data.data, token);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkAccessForEvents = async (events: LivestreamEvent[], token: string) => {
    const accessChecks: Record<string, AccessCheck> = {};
    
    for (const event of events) {
      if (event.accessType === 'paid') {
        try {
          const response = await fetch(getApiUrl(`livestream/purchase/check-access/${event._id}`), {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await response.json();
          if (data.success) {
            accessChecks[event._id] = data;
          }
        } catch (err) {
          console.error('Access check failed:', err);
        }
      }
    }
    
    setUserAccess(accessChecks);
  };

  const handlePurchaseAccess = async (eventId: string, price: number) => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth');
      return;
    }

    setProcessingPayment(eventId);

    try {
      // Create order
      const orderResponse = await fetch(getApiUrl('livestream/purchase/create-order'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ livestreamId: eventId })
      });

      const orderData = await orderResponse.json();
      if (!orderData.success) {
        throw new Error(orderData.message || 'Failed to create order');
      }

      // Initialize Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.data.amount,
        currency: orderData.data.currency,
        name: 'AHIBI Livestream',
        description: orderData.data.livestream.title,
        order_id: orderData.data.orderId,
        handler: async function (response: any) {
          // Verify payment
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
              purchase_id: orderData.data.purchaseId
            })
          });

          const verifyData = await verifyResponse.json();
          if (verifyData.success) {
            // Update access state
            setUserAccess(prev => ({
              ...prev,
              [eventId]: {
                hasAccess: true,
                reason: 'paid_access',
                requiresPurchase: false,
                purchase: {
                  id: verifyData.data.purchaseId,
                  paymentDate: new Date().toISOString(),
                  amount: price
                }
              }
            }));
            
            alert('Payment successful! You now have access to this livestream.');
          } else {
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          // You can prefill user details if available
        },
        theme: {
          color: '#3B82F6'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessingPayment(null);
    }
  };

  const getStatusBadge = (event: LivestreamEvent) => {
    switch (event.status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            LIVE NOW
          </span>
        );
      case 'idle':
        if (event.scheduledStartTime && new Date(event.scheduledStartTime) > new Date()) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
              UPCOMING
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
            OFFLINE
          </span>
        );
      case 'ended':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
            REPLAY
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
            OFFLINE
          </span>
        );
    }
  };

  const getAccessButton = (event: LivestreamEvent) => {
    const access = userAccess[event._id];
    
    if (event.accessType === 'public') {
      return (
        <Link
          href={`/livestream/${event._id}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Watch Now
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          </svg>
        </Link>
      );
    }

    if (access?.hasAccess) {
      return (
        <Link
          href={`/livestream/${event._id}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Access Granted
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </Link>
      );
    }

    return (
      <button
        onClick={() => handlePurchaseAccess(event._id, event.price)}
        disabled={processingPayment === event._id}
        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processingPayment === event._id ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Processing...
          </>
        ) : (
          <>
            Buy Access - ₹{event.price}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </>
        )}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      
      {/* Header */}
      <Navbar />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Live Wrestling Championships</h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-8">
            Watch the NWA Wrestling Championships live from anywhere
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              HD Quality Streaming
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Live & On-Demand
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Secure Payment
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {error && (
          <div className="mb-8 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {events.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-20 h-20 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Live Events Available</h2>
            <p className="text-gray-600">Check back later for upcoming wrestling championships</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => (
              <div key={event._id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                {/* Event Image/Thumbnail */}
                <div className="relative aspect-video bg-gray-900">
                  {event.thumbnailUrl || event.posterUrl ? (
                    <img
                      src={event.thumbnailUrl || event.posterUrl}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600">
                      <svg className="w-16 h-16 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    {getStatusBadge(event)}
                  </div>

                  {/* Live Indicator */}
                  {event.status === 'active' && (
                    <div className="absolute top-4 left-4">
                      <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        LIVE
                      </div>
                    </div>
                  )}
                </div>

                {/* Event Details */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{event.title}</h3>
                  
                  {event.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{event.description}</p>
                  )}

                  {/* Schedule */}
                  {event.scheduledStartTime && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(event.scheduledStartTime).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}

                  {/* Price and Access */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div>
                      {event.accessType === 'paid' ? (
                        <div>
                          <p className="text-2xl font-bold text-gray-900">₹{event.price}</p>
                          <p className="text-xs text-gray-500">One-time access</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-lg font-semibold text-green-600">FREE</p>
                          <p className="text-xs text-gray-500">Public access</p>
                        </div>
                      )}
                    </div>
                    
                    {getAccessButton(event)}
                  </div>

                  {/* Access Status */}
                  {userAccess[event._id]?.purchase && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700">
                        ✓ Purchased on {new Date(userAccess[event._id].purchase!.paymentDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
