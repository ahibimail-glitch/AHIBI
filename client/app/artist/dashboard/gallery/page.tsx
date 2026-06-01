"use client";

import GalleryManager from "@/components/artist/GalleryManager";
import { useDashboard } from "../dashboard-context";

export default function GalleryPage() {
  const { profile, fetchArtistProfile } = useDashboard();

  return (
    <GalleryManager 
      photos={profile?.gallery?.photos || []}
      videos={profile?.gallery?.videos || []}
      onUpdate={() => {
        fetchArtistProfile();
      }}
    />
  );
}
