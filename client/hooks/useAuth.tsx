"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AuthProps {
  tokenName: string;
  redirectPath: string;
}

export const useAuth = ({ tokenName, redirectPath }: AuthProps) => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for token in localStorage only on the client side
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(tokenName);

      if (!token) {
        router.replace(redirectPath);
      } else {
        setIsAuthenticated(true);
      }
      setLoading(false);
    }
  }, [router, tokenName, redirectPath]);

  return { isAuthenticated, loading };
};
