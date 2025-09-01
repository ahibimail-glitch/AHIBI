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

export const useAuth = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');

        if (!token) {
          setIsAuthenticated(false);
          setUser(null);
          setLoading(false);
          // Optionally redirect here if needed, e.g., router.replace('/login');
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
          localStorage.removeItem('token'); // Invalid token, remove it
          setIsAuthenticated(false);
          setUser(null);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUser();
  }, [router]);

  return { user, isAuthenticated, loading };
};
