"use client";

import AvailabilityCalendar from "@/components/artist/AvailabilityCalendar";
import { useDashboard } from "../layout";

export default function CalendarPage() {
  const { fetchArtistProfile } = useDashboard();

  return (
    <AvailabilityCalendar 
      onUpdate={() => {
        fetchArtistProfile();
      }}
    />
  );
}
