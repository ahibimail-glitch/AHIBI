"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAuthRedirectUrl } from '@/utils/redirectUtils';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role?: string;
  // Add other user properties as needed
}

interface UseAuthOptions {
  tokenName?: string;
  redirectPath?: string;
}

// Helper function to decode JWT token to get user role
const decodeToken = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// Helper function to get the correct profile endpoint based on role
const getProfileEndpoint = (role: string) => {
  switch (role) {
    case 'artist':
      return '/api/artist/profile';
    case 'organizer':
      return '/api/organizer/profile';
    case 'venue':
      return '/api/venue/profile';
    case 'admin':
      return '/api/admin/profile';
    default:
      return '/api/auth/profile';
  }
};

export const useAuth = (options?: UseAuthOptions) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Default options
  const tokenName = options?.tokenName || 'token';
  const redirectPath = options?.redirectPath || '/auth';

  useEffect(() => {
    const fetchUser = async () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem(tokenName);

        if (!token) {
          setIsAuthenticated(false);
          setUser(null);
          setLoading(false);
          if (redirectPath) {
            router.replace(createAuthRedirectUrl());
          }
          return;
        }

        try {
          // Decode token to get user role
          const decodedToken = decodeToken(token);
          const userRole = decodedToken?.role || 'user';
          
          // Get the correct profile endpoint based on role
          const profileEndpoint = getProfileEndpoint(userRole);
          
          const res = await fetch(profileEndpoint, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!res.ok) {
            throw new Error('Failed to fetch user profile');
          }

          const response = await res.json();
          // Handle different response structures
          const userData = response.data?.user || response.data || response;
          setUser(userData);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Error fetching user profile:', error);
          localStorage.removeItem(tokenName); // Invalid token, remove it
          setIsAuthenticated(false);
          setUser(null);
          if (redirectPath) {
            router.replace(createAuthRedirectUrl());
          }
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUser();
  }, [router, tokenName, redirectPath]);

  return { user, isAuthenticated, loading };
};
