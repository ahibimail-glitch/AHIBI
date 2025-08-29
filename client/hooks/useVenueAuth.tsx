"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Venue {
  _id: string;
  name: string;
  email: string;
  phone: string;
  venueName: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface VenueAuthContextType {
  isAuthenticated: boolean;
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
    const storedToken = localStorage.getItem('venue_token');
    const storedVenue = localStorage.getItem('venue_user');

    if (storedToken && storedVenue) {
      try {
        const venueData = JSON.parse(storedVenue);
        setToken(storedToken);
        setVenue(venueData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Failed to parse venue data from localStorage", error);
        localStorage.removeItem('venue_token');
        localStorage.removeItem('venue_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, venueData: Venue) => {
    localStorage.setItem('venue_token', newToken);
    localStorage.setItem('venue_user', JSON.stringify(venueData));
    setToken(newToken);
    setVenue(venueData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('venue_token');
    localStorage.removeItem('venue_user');
    setToken(null);
    setVenue(null);
    setIsAuthenticated(false);
  };

  return (
    <VenueAuthContext.Provider value={{ isAuthenticated, venue, token, loading, login, logout }}>
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
