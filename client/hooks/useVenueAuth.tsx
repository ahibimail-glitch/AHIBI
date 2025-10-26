"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Venue {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}

interface VenueAuthContextType {
  isAuthenticated: boolean;
  user: Venue | null;
  venue: Venue | null;
  token: string | null;
  loading: boolean;
  login: (token: string, venueData: Venue) => void;
  logout: () => void;
}

const VenueAuthContext = createContext<VenueAuthContextType | undefined>(undefined);

export const VenueAuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('venueToken');
    const storedVenue = localStorage.getItem('venueUser');

    if (storedToken && storedVenue) {
      try {
        const venueData = JSON.parse(storedVenue);
        setToken(storedToken);
        setVenue(venueData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Failed to parse venue data from localStorage", error);
        localStorage.removeItem('venueToken');
        localStorage.removeItem('venueUser');
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, venueData: Venue) => {
    localStorage.setItem('venueToken', newToken);
    localStorage.setItem('venueUser', JSON.stringify(venueData));
    setToken(newToken);
    setVenue(venueData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('venueToken');
    localStorage.removeItem('venueUser');
    setToken(null);
    setVenue(null);
    setIsAuthenticated(false);
  };

  return (
    <VenueAuthContext.Provider value={{ isAuthenticated, user: venue, venue, token, loading, login, logout }}>
      {children}
    </VenueAuthContext.Provider>
  );
};

export const useVenueAuth = () => {
  const context = useContext(VenueAuthContext);
  if (context === undefined) {
    throw new Error('useVenueAuth must be used within a VenueAuthProvider');
  }
  return context;
};
