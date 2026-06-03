'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { createAuthRedirectUrl } from '@/utils/redirectUtils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ModernBookingTicket from '@/app/events/[id]/bookings/booking-invoice';
import { trackTicketGenerated } from '@/lib/analytics/google-analytics';

const SERIAL_NUMBER_EVENT_ID = '6a17f0cfcea3b566702e86a9';

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
  const trackedTicketGeneratedBookingId = useRef<string | null>(null);

  useEffect(() => {
    const fetchBookingData = async () => {
      const eventId = params?.id as string;
      const bookingIdFromUrl =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('bookingId')
          : null;

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push(createAuthRedirectUrl());
          return;
        }

        const resolveBookingById = async (id: string) => {
          const bookingRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bookings/${id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!bookingRes.ok) return null;

          const bookingData = await bookingRes.json();
          const booking = bookingData.data;
          const bookingEventId =
            typeof booking.event === 'string' ? booking.event : booking.event?._id;

          if (bookingEventId !== eventId) return null;

          setBookingId(id);

          if (booking.totalTickets > 1) {
            try {
              const relatedBookingsRes = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/bookings/related/${id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );

              if (relatedBookingsRes.ok) {
                const relatedBookingsData = await relatedBookingsRes.json();
                setBooking({
                  ...booking,
                  relatedBookings: relatedBookingsData.data,
                });
              } else {
                setBooking(booking);
              }
            } catch {
              setBooking(booking);
            }
          } else {
            setBooking(booking);
          }

          return booking;
        };

        if (bookingIdFromUrl) {
          const resolved = await resolveBookingById(bookingIdFromUrl);
          if (resolved) {
            setLoading(false);
            return;
          }
        }

        // Try to get the last booking ID from localStorage first
        const lastBookingId = localStorage.getItem('lastBookingId');
        
        if (lastBookingId) {
          const resolved = await resolveBookingById(lastBookingId);
          if (resolved) {
            setLoading(false);
            return;
          }
        }

        // Fallback: match by event and prefer the parent booking for multi-ticket orders.
        const myBookingsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bookings/my-bookings`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!myBookingsRes.ok) {
          throw new Error('Failed to fetch bookings.');
        }

        const myBookingsData = await myBookingsRes.json();
        const allBookings = myBookingsData?.bookings || [];
        const eventBookings = allBookings.filter((b: any) => {
          const bEventId = typeof b?.event === 'string' ? b.event : b?.event?._id;
          return bEventId === eventId;
        });

        const matchedBooking =
          eventBookings.find((b: any) => !b.parentBookingId) || eventBookings[0];

        if (!matchedBooking?._id) {
          setBooking(null);
          setBookingId(null);
          return;
        }

        await resolveBookingById(matchedBooking._id as string);
      } catch (error) {
        console.error('Error fetching booking:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookingData();
  }, [router, params]);

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

  useEffect(() => {
    if (loading || !booking?._id || trackedTicketGeneratedBookingId.current === booking._id) return;

    const ev = booking.event;
    const eventId = typeof ev === 'string' ? ev : ev?._id;
    const eventName = typeof ev === 'string' ? null : ev?.title;

    if (!eventId || !eventName) return;

    trackedTicketGeneratedBookingId.current = booking._id;
    trackTicketGenerated({
      event_id: eventId,
      event_name: eventName,
      ticket_count: booking.relatedBookings?.length || booking.totalTickets || booking.quantity || 1,
    });
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

  const bookingEventId =
    typeof booking.event === 'string' ? booking.event : booking.event?._id;
  const useEventSerial = String(bookingEventId) === SERIAL_NUMBER_EVENT_ID;

  const ticketCount = booking.totalTickets || booking.quantity || 1;

  // Generate multiple tickets based on quantity
  const generateTickets = () => {
    const quantity = ticketCount;
    const tickets = [];
    
    // If we have related bookings, use those
    if (booking.relatedBookings && booking.relatedBookings.length > 0) {
      for (let i = 0; i < booking.relatedBookings.length; i++) {
        const relatedBooking = booking.relatedBookings[i];
        tickets.push(
          <div key={relatedBooking._id} className="mb-8">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700">
                {useEventSerial && typeof relatedBooking.ticketSerialNumber === 'number'
                  ? `Serial No. ${relatedBooking.ticketSerialNumber}`
                  : `Ticket ${relatedBooking.ticketIndex || i + 1} of ${quantity}`}
              </h3>
            </div>
            <ModernBookingTicket 
              bookingId={relatedBooking._id} 
              ticketIndex={relatedBooking.ticketIndex || i + 1}
              totalTickets={quantity}
              autoDownload={i === 0}
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
              autoDownload={i === 0}
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
              Your booking has been confirmed for {ticketCount} ticket{ticketCount > 1 ? 's' : ''}.
            </p>
            {ticketCount > 1 && (
              <p className="text-sm text-gray-500 mb-8">
                Below are your {ticketCount} individual tickets. Each ticket has its own QR code for entry.
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