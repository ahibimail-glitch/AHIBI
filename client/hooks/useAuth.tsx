"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  // Add other user properties as needed
}

interface UseAuthOptions {
  tokenName?: string;
  redirectPath?: string;
}

export const useAuth = (options?: UseAuthOptions) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Default options
  const tokenName = options?.tokenName || 'token';
  const redirectPath = options?.redirectPath || '/login';

  useEffect(() => {
    const fetchUser = async () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem(tokenName);

        if (!token) {
          setIsAuthenticated(false);
          setUser(null);
          setLoading(false);
          if (redirectPath) {
            router.replace(redirectPath);
          }
          return;
        }

        try {
          const res = await fetch('/api/auth/profile', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!res.ok) {
            throw new Error('Failed to fetch user profile');
          }

          const userData = await res.json();
          setUser(userData);
          setIsAuthenticated(true);
        } catch (error) {
          console.error(error);
          localStorage.removeItem(tokenName); // Invalid token, remove it
          setIsAuthenticated(false);
          setUser(null);
          if (redirectPath) {
            router.replace(redirectPath);
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
