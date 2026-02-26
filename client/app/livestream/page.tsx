'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { getApiUrl } from '@/config';
import Navbar from '@/app/Navbar';
import Footer from '@/app/Footer';

// ─── Google Fonts ───────────────────────────────────────────────────────────
// Add to your globals.css or _document.tsx:
// @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

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
  purchase?: { id: string; paymentDate: string; amount: number };
}

const EVENT_IMAGES: Record<string, string> = {
  "1st NWA Provisional Championship & 1st NWA Under 15 Championship cum 1st Wrestling Festival":
    "https://res.cloudinary.com/dovc3lfgz/image/upload/v1771518218/ahibi/ttof83dmfocmdqovcb3v.jpg",
  "30th NWA Naga Traditional Wrestling Championship cum 1st Wrestling Festival":
    "https://res.cloudinary.com/dovc3lfgz/image/upload/v1771517850/ahibi/xy6prc6usk8fxgocy4ay.jpg",
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

  :root {
    --red: #E8271A;
    --red-dark: #C01E13;
    --ink: #0F0F0F;
    --ink-soft: #3A3A3A;
    --ink-muted: #7A7A7A;
    --paper: #FAFAF7;
    --paper-warm: #F3F2EE;
    --paper-card: #FFFFFF;
    --border: #E2E0DA;
    --green: #1A8A4A;
    --orange: #D95F0C;
    --shadow-card: 0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
    --shadow-hover: 0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06);
  }

  .ls-page { font-family: 'DM Sans', sans-serif; background: var(--paper); min-height: 70vh; color: var(--ink); }

  /* ─── HERO ─────────────────────────────────────── */
  .ls-hero {
    background: var(--ink);
    color: white;
    padding: 32px 24px 24px;
    position: relative;
    overflow: hidden;
  }
  .ls-hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background: 
      repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(255,255,255,0.015) 60px, rgba(255,255,255,0.015) 61px),
      repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(255,255,255,0.015) 60px, rgba(255,255,255,0.015) 61px);
    pointer-events: none;
  }
  .ls-hero-inner { max-width: 1200px; margin: 0 auto; position: relative; }
  .ls-hero-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--red); color: white;
    font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;
    padding: 6px 12px; border-radius: 4px; margin-bottom: 20px;
  }
  .ls-hero-eyebrow-dot { width: 7px; height: 7px; background: white; border-radius: 50%; animation: pulse 1.4s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(.85)} }

  .ls-hero-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(48px, 8vw, 96px);
    line-height: 0.95;
    letter-spacing: 0.01em;
    color: white;
    margin: 0 0 16px;
  }
  .ls-hero-title span { color: var(--red); }
  .ls-hero-sub {
    font-size: clamp(15px, 2vw, 18px);
    color: rgba(255,255,255,0.55);
    font-weight: 300;
    max-width: 480px;
    margin: 0 0 36px;
    line-height: 1.6;
  }
  .ls-hero-pills { display: flex; flex-wrap: wrap; gap: 10px; }
  .ls-hero-pill {
    display: flex; align-items: center; gap: 8px;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.75);
    padding: 8px 16px; border-radius: 100px;
    font-size: 13px; font-weight: 400; letter-spacing: 0.01em;
    backdrop-filter: blur(8px);
  }
  .ls-hero-pill svg { width: 15px; height: 15px; opacity: .75; }

  /* ─── MAIN ─────────────────────────────────────── */
  .ls-main { max-width: 1200px; margin: 0 auto; padding: 56px 24px; }
  .ls-section-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 32px; }
  .ls-section-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(28px, 4vw, 40px);
    letter-spacing: 0.03em;
    color: var(--ink);
  }
  .ls-section-count {
    font-size: 13px; color: var(--ink-muted); font-weight: 400;
  }

  /* ─── GRID ─────────────────────────────────────── */
  .ls-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 28px; }
  @media(max-width: 768px) { .ls-grid { grid-template-columns: 1fr; gap: 20px; } }

  /* ─── CARD ─────────────────────────────────────── */
  .ls-card {
    background: var(--paper-card);
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid var(--border);
    box-shadow: var(--shadow-card);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    display: flex; flex-direction: column;
  }
  .ls-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-hover); }

  /* Thumbnail */
  .ls-card-thumb { position: relative; aspect-ratio: 16/9; overflow: hidden; background: #1a1a1a; }
  .ls-card-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; }
  .ls-card:hover .ls-card-thumb img { transform: scale(1.04); }
  .ls-thumb-placeholder {
    width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  }
  .ls-thumb-placeholder svg { width: 48px; height: 48px; color: rgba(255,255,255,0.2); }

  /* Status badges */
  .ls-badge {
    position: absolute; top: 14px; left: 14px;
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 10px; border-radius: 6px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  }
  .ls-badge-live { background: var(--red); color: white; }
  .ls-badge-live-dot { width: 6px; height: 6px; background: white; border-radius: 50%; animation: pulse 1.2s ease-in-out infinite; }
  .ls-badge-upcoming { background: rgba(0,0,0,0.65); color: rgba(255,255,255,0.9); backdrop-filter: blur(6px); }

  /* Access pill on thumb */
  .ls-thumb-price {
    position: absolute; top: 14px; right: 14px;
    background: rgba(0,0,0,0.72); color: white;
    padding: 5px 10px; border-radius: 6px;
    font-size: 12px; font-weight: 600; letter-spacing: 0.02em;
    backdrop-filter: blur(6px);
  }
  .ls-thumb-price.free { background: rgba(26, 138, 74, 0.88); }

  /* Card body */
  .ls-card-body { padding: 22px 22px 20px; display: flex; flex-direction: column; flex: 1; }
  .ls-card-title {
    font-family: 'DM Sans', sans-serif;
    font-size: 16px; font-weight: 600;
    color: var(--ink); line-height: 1.4;
    margin: 0 0 8px;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .ls-card-desc {
    font-size: 13.5px; color: var(--ink-muted); line-height: 1.55;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    margin: 0 0 14px; flex: 1;
  }
  .ls-card-meta {
    display: flex; align-items: center; gap: 6px;
    font-size: 12.5px; color: var(--ink-muted);
    margin-bottom: 18px; padding-bottom: 18px;
    border-bottom: 1px solid var(--border);
  }
  .ls-card-meta svg { width: 14px; height: 14px; flex-shrink: 0; }

  /* Card footer */
  .ls-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .ls-price-block {}
  .ls-price-amount { font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 0.02em; color: var(--ink); line-height: 1; }
  .ls-price-amount.free { color: var(--green); font-size: 22px; }
  .ls-price-label { font-size: 11px; color: var(--ink-muted); margin-top: 2px; letter-spacing: 0.04em; text-transform: uppercase; }

  /* Buttons */
  .ls-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 18px; border-radius: 10px;
    font-family: 'DM Sans', sans-serif; font-size: 13.5px; font-weight: 600;
    cursor: pointer; transition: all 0.2s ease; border: none; text-decoration: none;
    white-space: nowrap; flex-shrink: 0;
  }
  .ls-btn svg { width: 15px; height: 15px; }
  .ls-btn-watch { background: var(--ink); color: white; }
  .ls-btn-watch:hover { background: var(--ink-soft); transform: scale(1.02); }
  .ls-btn-granted { background: var(--green); color: white; }
  .ls-btn-granted:hover { filter: brightness(1.1); transform: scale(1.02); }
  .ls-btn-buy { background: var(--red); color: white; }
  .ls-btn-buy:hover { background: var(--red-dark); transform: scale(1.02); }
  .ls-btn-buy:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
  .ls-btn-spinner { width: 14px; height: 14px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ─── EMPTY STATE ───────────────────────────────── */
  .ls-empty {
    text-align: center; padding: 80px 24px;
    background: var(--paper-card); border-radius: 20px;
    border: 1px dashed var(--border);
  }
  .ls-empty-icon { width: 72px; height: 72px; margin: 0 auto 20px; color: var(--border); }
  .ls-empty-title { font-family: 'Bebas Neue', sans-serif; font-size: 32px; color: var(--ink); margin: 0 0 8px; letter-spacing: 0.04em; }
  .ls-empty-sub { font-size: 15px; color: var(--ink-muted); }

  /* ─── ERROR ─────────────────────────────────────── */
  .ls-error {
    margin-bottom: 32px; padding: 16px 20px;
    background: #FEF2F0; border: 1px solid #F5C5BF; border-radius: 12px;
    color: #9B1C12; font-size: 14px; display: flex; align-items: center; gap: 10px;
  }
  .ls-error svg { width: 18px; height: 18px; flex-shrink: 0; }

  /* ─── LOADING ────────────────────────────────────── */
  .ls-loading { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--paper); }
  .ls-loading-inner { text-align: center; }
  .ls-loading-ring { width: 44px; height: 44px; border: 3px solid var(--border); border-top-color: var(--red); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
  .ls-loading-text { font-size: 14px; color: var(--ink-muted); }
`;

export default function LivestreamListingPage() {
  const router = useRouter();
  const [events, setEvents] = useState<LivestreamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userAccess, setUserAccess] = useState<Record<string, AccessCheck>>({});
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch(getApiUrl('livestream/active'));
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to fetch events');
      setEvents(data.data);
      const token = localStorage.getItem('token');
      if (token) checkAccessForEvents(data.data, token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkAccessForEvents = async (events: LivestreamEvent[], token: string) => {
    const accessChecks: Record<string, AccessCheck> = {};
    for (const event of events) {
      if (event.accessType === 'paid' || event.accessType === 'ticket_holders') {
        try {
          const response = await fetch(getApiUrl(`livestream/purchase/check-access/${event._id}`), {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          if (data.success) {
            accessChecks[event._id] = {
              hasAccess: data.hasAccess, reason: data.reason,
              requiresPurchase: data.requiresPurchase, purchase: data.purchase
            };
          }
        } catch {}
      }
    }
    setUserAccess(accessChecks);
  };

  const handlePurchaseAccess = async (eventId: string, price: number) => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/auth?redirect=/livestream'); return; }
    setProcessingPayment(eventId);
    try {
      const orderResponse = await fetch(getApiUrl('livestream/purchase/create-order'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ livestreamId: eventId })
      });
      const orderData = await orderResponse.json();
      if (!orderData.success) throw new Error(orderData.message || 'Failed to create order');
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.data.amount, currency: orderData.data.currency,
        name: 'AHIBI Livestream', description: orderData.data.livestream.title,
        order_id: orderData.data.orderId,
        handler: async function (response: any) {
          const verifyResponse = await fetch(getApiUrl('livestream/purchase/verify'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              purchase_id: orderData.data.purchaseId
            })
          });
          const verifyData = await verifyResponse.json();
          if (verifyData.success) {
            setUserAccess(prev => ({
              ...prev, [eventId]: {
                hasAccess: true, reason: 'paid_access', requiresPurchase: false,
                purchase: { id: verifyData.data.purchaseId, paymentDate: new Date().toISOString(), amount: price }
              }
            }));
            
            // Redirect to payment success page with payment details
            const paymentParams = new URLSearchParams({
              amount: price.toString(),
              payment_id: response.razorpay_payment_id,
              order_id: response.razorpay_order_id,
              type: 'livestream',
              item_name: orderData.data.livestream.title
            });
            
            router.push(`/payment-success?${paymentParams.toString()}`);
          } else {
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {},
        theme: { color: '#E8271A' }
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessingPayment(null);
    }
  };

  const getAccessButton = (event: LivestreamEvent) => {
    const access = userAccess[event._id];

    if (event.accessType === 'public') {
      return (
        <Link href={`/livestream/${event._id}`} className="ls-btn ls-btn-watch">
          Watch Now
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          </svg>
        </Link>
      );
    }

    if (access?.hasAccess) {
      return (
        <Link href={`/livestream/${event._id}`} className="ls-btn ls-btn-granted">
          Access Granted
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </Link>
      );
    }

    return (
      <button
        onClick={() => handlePurchaseAccess(event._id, event.price)}
        disabled={processingPayment === event._id}
        className="ls-btn ls-btn-buy"
      >
        {processingPayment === event._id ? (
          <><div className="ls-btn-spinner" /> Processing...</>
        ) : (
          <>
            Buy — ₹{event.price}
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </>
        )}
      </button>
    );
  };

  const getThumbImage = (event: LivestreamEvent) => {
    const specific = EVENT_IMAGES[event.title];
    if (specific) return specific;
    if (event.thumbnailUrl || event.posterUrl) return event.thumbnailUrl || event.posterUrl;
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading Livestreams</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />

      <div className="ls-page">
        <Navbar />

        {/* ── HERO ── */}
        <section className="ls-hero">
          <div className="ls-hero-inner">
            <div className="ls-hero-eyebrow">
              <span className="ls-hero-eyebrow-dot" />
              Live Streaming
            </div>
            <h1 className="ls-hero-title">
              NWA 
              <span>  Wrestling  </span>
              Championships
            </h1>
           
            <div className="ls-hero-pills">
              <div className="ls-hero-pill">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                HD Quality
              </div>
              <div className="ls-hero-pill">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Live & On-Demand
              </div>
              <div className="ls-hero-pill">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Secure Payment
              </div>
            </div>
          </div>
        </section>

        {/* ── MAIN ── */}
        <main className="ls-main">
          {error && (
            <div className="ls-error">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          {events.length === 0 ? (
            <div className="ls-empty">
              <svg className="ls-empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <h2 className="ls-empty-title">No Live Events Available</h2>
              <p className="ls-empty-sub">Check back soon for upcoming wrestling championships.</p>
            </div>
          ) : (
            <>
              <div className="ls-section-header">
                <h2 className="ls-section-title">Upcoming & Live Events</h2>
                {/* <span className="ls-section-count">{events.length} event{events.length !== 1 ? 's' : ''}</span> */}
              </div>

              <div className="ls-grid">
                {events.map((event) => {
                  const thumb = getThumbImage(event);
                  return (
                    <div key={event._id} className="ls-card">
                      {/* Thumbnail */}
                      <div className="ls-card-thumb">
                        {thumb ? (
                          <img src={thumb} alt={event.title} />
                        ) : (
                          <div className="ls-thumb-placeholder">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}

                        {/* Live badge */}
                        {event.status === 'active' && (
                          <div className="ls-badge ls-badge-live">
                            <span className="ls-badge-live-dot" />
                            LIVE
                          </div>
                        )}
                        {event.status === 'idle' && (
                          <div className="ls-badge ls-badge-upcoming">Upcoming</div>
                        )}

                        {/* Price overlay */}
                        <div className={`ls-thumb-price${event.accessType === 'public' ? ' free' : ''}`}>
                          {event.accessType === 'public' ? 'Free' : `₹${event.price}`}
                        </div>
                      </div>

                      {/* Body */}
                      <div className="ls-card-body">
                        <h3 className="ls-card-title">{event.title}</h3>
                        {event.description && (
                          <p className="ls-card-desc">{event.description}</p>
                        )}

                        {event.scheduledStartTime && (
                          <div className="ls-card-meta">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(event.scheduledStartTime).toLocaleDateString('en-IN', {
                              weekday: 'short', month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="ls-card-footer">
                          <div className="ls-price-block">
                            {event.accessType === 'paid' ? (
                              <>
                                <div className="ls-price-amount">₹{event.price}</div>
                                <div className="ls-price-label">One-time access</div>
                              </>
                            ) : (
                              <>
                                <div className="ls-price-amount free">Free</div>
                                <div className="ls-price-label">Public access</div>
                              </>
                            )}
                          </div>
                          {getAccessButton(event)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
}