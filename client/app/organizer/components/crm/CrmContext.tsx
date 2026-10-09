"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { createAuthRedirectUrl } from "@/utils/redirectUtils";

export interface EventDetails {
  _id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  location: {
    address: string;
    city: string;
    state: string;
  };
  ticketsSold: number;
  totalTickets: number;
  totalRevenue: number;
}

export interface Booking {
  _id: string;
  user?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  quantity: number;
  total: number;
  status: string;
  paymentStatus: string;
  ticketType: string;
  bookedAt: string;
}

interface CrmContextValue {
  eventId: string;
  event: EventDetails | null;
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  uniqueAttendees: Booking[];
  totalTicketsSold: number;
  totalRevenue: number;
  mode: "organizer" | "team";
}

const CrmContext = createContext<CrmContextValue | null>(null);

interface CrmProviderProps {
  children: React.ReactNode;
  mode?: "organizer" | "team";
}

export function CrmProvider({ children, mode = "organizer" }: CrmProviderProps) {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const isTeam = mode === "team";
  const tokenName = isTeam ? "token" : "organizer_token";
  const loginPath = isTeam ? createAuthRedirectUrl("/manageEvent") : "/organizer/auth/login";

  const { isAuthenticated, loading: authLoading } = useAuth({
    tokenName,
    redirectPath: loginPath,
  });

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    const fetchCrmData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem(tokenName);
        if (!token) {
          router.push(loginPath);
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        if (isTeam) {
          const eventRes = await fetch(`${apiUrl}/api/event-team/events/${eventId}`, { headers });
          if (!eventRes.ok) {
            const errData = await eventRes.json().catch(() => ({}));
            throw new Error(errData.message || "You do not have access to this event");
          }
          const eventData = await eventRes.json();
          const eventDetails = eventData.data?.event;
          if (!eventDetails) throw new Error("Event not found");
          setEvent({
            ...eventDetails,
            ticketsSold: 0,
            totalTickets: 0,
            totalRevenue: 0,
          });
          setBookings([]);
          return;
        }

        const [eventRes, bookingsRes] = await Promise.all([
          fetch(`${apiUrl}/api/organizer/events/${eventId}`, { headers }),
          fetch("/api/bookings/organizer-bookings", { headers }),
        ]);

        if (!eventRes.ok) {
          throw new Error("Failed to load event details");
        }

        const eventData = await eventRes.json();
        const eventDetails = eventData.data?.event || eventData.event || eventData.data;
        if (!eventDetails) {
          throw new Error("Event not found");
        }

        if (eventDetails.status !== "approved" && eventDetails.status !== "active") {
          throw new Error("CRM is only available for approved events");
        }

        setEvent(eventDetails);

        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          const eventBookings = (bookingsData.bookings || []).filter(
            (booking: Booking & { event?: { _id: string } | string }) => {
              const bookingEventId =
                typeof booking.event === "string" ? booking.event : booking.event?._id;
              return bookingEventId === eventId;
            }
          );
          setBookings(eventBookings);
        }
      } catch (err) {
        console.error("Error loading CRM data:", err);
        setError(err instanceof Error ? err.message : "Failed to load CRM data");
      } finally {
        setLoading(false);
      }
    };

    fetchCrmData();
  }, [isAuthenticated, authLoading, eventId, router, isTeam, tokenName, loginPath]);

  const uniqueAttendees = useMemo(() => {
    const seen = new Set<string>();
    return bookings.filter((booking) => {
      const userId = booking.user?._id;
      if (!userId || seen.has(userId)) return false;
      seen.add(userId);
      return true;
    });
  }, [bookings]);

  const totalTicketsSold = useMemo(
    () => bookings.reduce((sum, booking) => sum + (booking.quantity || 0), 0),
    [bookings]
  );

  const totalRevenue = useMemo(
    () => bookings.reduce((sum, booking) => sum + (booking.total || 0), 0),
    [bookings]
  );

  const value: CrmContextValue = {
    eventId,
    event,
    bookings,
    loading: authLoading || loading,
    error,
    uniqueAttendees,
    totalTicketsSold,
    totalRevenue,
    mode,
  };

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm() {
  const context = useContext(CrmContext);
  if (!context) {
    throw new Error("useCrm must be used within CrmProvider");
  }
  return context;
}
