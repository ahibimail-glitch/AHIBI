'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowLeft, Download } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { createAuthRedirectUrl } from '@/utils/redirectUtils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ModernBookingTicket from '@/app/events/[id]/bookings/booking-invoice';

interface Booking {
  _id: string;
  event: any;
  user: any;
  ticketType: string;
  quantity: number;
  price: number;
  total: number;
  status: string;
  bookedAt: string;
  totalTickets?: number; // Added for parent booking
  relatedBookings?: any[]; // Added for related bookings
}

export default function BookingSuccessPage() {
  const router = useRouter();
  const params = useParams();
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoDownloaded, setAutoDownloaded] = useState(false);

  useEffect(() => {
    const fetchBookingData = async () => {
      // Get event ID from URL params
      const eventId = params?.id as string;
      
      let bookingIdToUse = eventId;
      
      // If we have an event ID from URL params, use it
      if (!bookingIdToUse) {
        // Fallback to localStorage for backward compatibility
        const lastBookingId = localStorage.getItem('lastBookingId');
        if (!lastBookingId) {
          // Redirect to home if no ID is available
          router.push('/');
          return;
        }
        bookingIdToUse = lastBookingId;
      }

      setBookingId(bookingIdToUse);

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push(createAuthRedirectUrl());
          return;
        }

        // Fetch booking details
        const bookingRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bookings/${bookingIdToUse}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          }
        });

        if (!bookingRes.ok) {
          throw new Error('Failed to fetch booking details.');
        }

        const bookingData = await bookingRes.json();
        const booking = bookingData.data;
        
        // Check if this is a parent booking (has related tickets)
        if (booking.totalTickets > 1) {
          // Fetch all related bookings
          try {
            const relatedBookingsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bookings/related/${bookingIdToUse}`, {
              headers: {
                "Authorization": `Bearer ${token}`,
              }
            });

            if (relatedBookingsRes.ok) {
              const relatedBookingsData = await relatedBookingsRes.json();
              setBooking({
                ...booking,
                relatedBookings: relatedBookingsData.data
              });
            } else {
              // If related bookings endpoint doesn't exist, use the current booking
              console.log('Related bookings endpoint not available, using current booking');
              setBooking(booking);
            }
          } catch (error) {
            console.log('Error fetching related bookings, using current booking:', error);
            setBooking(booking);
          }
        } else {
          setBooking(booking);
        }
      } catch (error) {
        console.error('Error fetching booking:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookingData();
  }, [router, params]);

  useEffect(() => {
    // After booking is loaded, auto-click the first ticket's Download button once
    if (!loading && booking && !autoDownloaded) {
      let attempts = 0;
      const maxAttempts = 20; // ~10s with 500ms interval

      const tryClick = () => {
        attempts += 1;
        try {
          const tickets = document.querySelectorAll('#booking-ticket');
          const firstTicket = tickets && tickets.length > 0 ? (tickets[0] as HTMLElement) : null;
          if (!firstTicket) return false;

          const buttons = firstTicket.querySelectorAll('button');
          for (const btn of Array.from(buttons)) {
            const text = (btn as HTMLButtonElement).textContent?.toLowerCase() || '';
            if (text.includes('download')) {
              (btn as HTMLButtonElement).click();
              setAutoDownloaded(true);
              return true;
            }
          }
          return false;
        } catch {
          return false;
        }
      };

      if (tryClick()) return;

      const interval = setInterval(() => {
        if (tryClick() || attempts >= maxAttempts) {
          clearInterval(interval);
          if (observer) observer.disconnect();
        }
      }, 500);

      const observer = new MutationObserver(() => {
        if (tryClick()) {
          clearInterval(interval);
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      return () => {
        clearInterval(interval);
        observer.disconnect();
      };
    }
  }, [loading, booking, autoDownloaded]);

  // Fire Meta Pixel Purchase for Nasquerade on success page
  useEffect(() => {
    if (loading || !booking) return;
    try {
      const ev = booking.event;
      const evId = typeof ev === 'string' ? ev : ev?._id;
      if (evId === '69303656ca38d79b1c9e4202' && typeof window !== 'undefined' && (window as any).fbq) {
        const value = (booking as any).total || (booking as any).price || 0;
        (window as any).fbq('track', 'Purchase', {
          value,
          currency: 'INR',
        });
      }
    } catch {}
  }, [loading, booking]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!bookingId || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Booking Not Found</h2>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Generate multiple tickets based on quantity
  const generateTickets = () => {
    const quantity = booking.quantity || booking.totalTickets || 1;
    const tickets = [];
    
    // If we have related bookings, use those
    if (booking.relatedBookings && booking.relatedBookings.length > 0) {
      for (let i = 0; i < booking.relatedBookings.length; i++) {
        const relatedBooking = booking.relatedBookings[i];
        tickets.push(
          <div key={relatedBooking._id} className="mb-8">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700">
                Ticket {relatedBooking.ticketIndex || i + 1} of {quantity}
              </h3>
            </div>
            <ModernBookingTicket 
              bookingId={relatedBooking._id} 
              ticketIndex={relatedBooking.ticketIndex || i + 1}
              totalTickets={quantity}
            />
          </div>
        );
      }
    } else {
      // Fallback to generating tickets based on quantity (for backward compatibility)
      for (let i = 0; i < quantity; i++) {
        tickets.push(
          <div key={i} className="mb-8">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700">
                Ticket {i + 1} of {quantity}
              </h3>
            </div>
            <ModernBookingTicket 
              bookingId={bookingId} 
              ticketIndex={i + 1}
              totalTickets={quantity}
            />
          </div>
        );
      }
    }
    return tickets;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Meta Pixel for Nasquerade */}
      <Script id="meta-pixel-base-success" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '844675348311797');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        <img height="1" width="1" style={{ display: 'none' }} src="https://www.facebook.com/tr?id=844675348311797&ev=PageView&noscript=1" alt="" />
      </noscript>
      <div className="container mx-auto px-4 max-w-4xl">
        <Card className="w-full p-8 mb-8">
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="inline-flex rounded-full p-4 bg-green-100 text-green-600 mb-4"
            >
              <CheckCircle className="w-12 h-12" />
            </motion.div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Booking Confirmed!
            </h1>
            <p className="text-gray-600 mb-4">
              Your booking has been confirmed for {booking.quantity || 1} ticket{(booking.quantity || 1) > 1 ? 's' : ''}.
            </p>
            {(booking.quantity || 1) > 1 && (
              <p className="text-sm text-gray-500 mb-8">
                Below are your {booking.quantity || 1} individual tickets. Each ticket has its own QR code for entry.
              </p>
            )}
          </div>
        </Card>

        {/* Multiple Tickets */}
        <div className="space-y-8">
          {generateTickets()}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            className="w-full sm:w-auto"
            onClick={() => router.push('/profile')}
          >
            View My Bookings
          </Button>

          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
} 