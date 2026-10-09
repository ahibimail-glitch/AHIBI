"use client";

import AvailabilityCalendar from "@/components/artist/AvailabilityCalendar";
import { useDashboard } from "../dashboard-context";

export default function CalendarPage() {
  const { fetchArtistProfile } = useDashboard();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Your availability, event bookings, and teaching sessions in one place.
        </p>
      </div>
      <AvailabilityCalendar
        onUpdate={() => {
          fetchArtistProfile();
        }}
      />
    </div>
  );
}
