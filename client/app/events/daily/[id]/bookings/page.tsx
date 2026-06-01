"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { createAuthRedirectUrl } from "@/utils/redirectUtils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ModernBookingTicket from "@/app/events/[id]/bookings/booking-invoice";
import { trackTicketGenerated } from "@/lib/analytics/google-analytics";

interface DailyBooking {
  _id: string;
  dailyEvent?: {
    _id: string;
    title?: string;
  };
  quantity?: number;
}

export default function DailyEventBookingsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id as string;

  const [booking, setBooking] = useState<DailyBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const trackedTicketGeneratedBookingId = useRef<string | null>(null);

  useEffect(() => {
    const fetchDailyEventBooking = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push(createAuthRedirectUrl());
          return;
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/bookings/daily-event/${eventId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error("Failed to fetch daily bookings.");
        }

        const data = await res.json();
        const bookings: DailyBooking[] = data?.data?.bookings || [];
        const filtered = bookings.filter((b) => b?.dailyEvent?._id === eventId);

        // Keep one booking for this daily event page, matching existing expectation.
        setBooking(filtered.length > 0 ? filtered[0] : null);
      } catch (error) {
        console.error("Error fetching daily event booking:", error);
        setBooking(null);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchDailyEventBooking();
    } else {
      setLoading(false);
    }
  }, [eventId, router]);

  useEffect(() => {
    if (loading || !booking?._id || trackedTicketGeneratedBookingId.current === booking._id) return;
    if (!booking.dailyEvent?._id || !booking.dailyEvent?.title) return;

    trackedTicketGeneratedBookingId.current = booking._id;
    trackTicketGenerated({
      event_id: booking.dailyEvent._id,
      event_name: booking.dailyEvent.title,
      ticket_count: booking.quantity || 1,
    });
  }, [loading, booking]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!booking?._id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Booking Not Found</h2>
          <Button onClick={() => router.push(`/events/daily/${eventId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Event
          </Button>
        </div>
      </div>
    );
  }

  const ticketCount = booking.quantity || 1;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
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
              Your booking has been confirmed for {ticketCount} ticket
              {ticketCount > 1 ? "s" : ""}.
            </p>
          </div>
        </Card>

        <div className="space-y-8">
          <ModernBookingTicket
            bookingId={booking._id}
            ticketIndex={1}
            totalTickets={ticketCount}
          />
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button className="w-full sm:w-auto" onClick={() => router.push("/profile")}>
            View My Bookings
          </Button>

          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => router.push(`/events/daily/${eventId}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Event
          </Button>
        </div>
      </div>
    </div>
  );
}
