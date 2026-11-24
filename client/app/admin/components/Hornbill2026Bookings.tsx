"use client";

import { useEffect, useState } from "react";
import EventTicketBookings from "./EventTicketBookings";

type EventRecord = { _id: string; title?: string; slug?: string; startDate?: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function Hornbill2026Bookings({ kind }: { kind: "day" | "music" }) {
  const [eventIds, setEventIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/events?limit=1000&includePast=true`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        const events: EventRecord[] = Array.isArray(payload?.data?.events) ? payload.data.events : [];
        const matches = events.filter((event) => {
          const label = `${event.title || ""} ${event.slug || ""}`.toLowerCase();
          const year2026 = label.includes("2026") || String(event.startDate || "").startsWith("2026-");
          const legacy = label.includes("ticket-to-hornbill-showcase") || label.includes("showcase day1");
          const festival = label.includes("festival");
          return !legacy && year2026 && label.includes("hornbill") && festival &&
            (kind === "music" ? label.includes("music") : !label.includes("music"));
        }).map((event) => event._id);
        if (active) setEventIds([...new Set(matches)]);
      })
      .catch((_error: unknown): void => {});
    return () => { active = false; };
  }, [kind]);

  return <EventTicketBookings title={kind === "music" ? "Hornbill Music Festival 2026 Tickets" : "Hornbill Festival 2026 Tickets"} eventIds={eventIds} />;
}
