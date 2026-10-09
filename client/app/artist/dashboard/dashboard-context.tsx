"use client";

import { createContext, useContext } from "react";
import { ArtistUser, ArtistProfile } from "./types";

export interface DashboardContextType {
  user: ArtistUser | null;
  profile: ArtistProfile | null;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  setSuccessMessage: (msg: string | null) => void;
  setError: (err: string | null) => void;
  fetchArtistProfile: () => Promise<void>;
  handleLogout: () => void;
}

export const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within DashboardLayout");
  }
  return context;
}
