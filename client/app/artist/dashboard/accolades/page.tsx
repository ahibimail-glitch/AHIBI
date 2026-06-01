"use client";

import AccoladesManager from "@/components/artist/AccoladesManager";
import { useDashboard } from "../dashboard-context";

export default function AccoladesPage() {
  const { profile, fetchArtistProfile } = useDashboard();

  return (
    <AccoladesManager 
      accolades={profile?.accolades || []}
      onUpdate={() => {
        fetchArtistProfile();
      }}
    />
  );
}
