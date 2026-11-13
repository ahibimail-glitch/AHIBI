"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, QrCode } from 'lucide-react';
import QrScanner from '../admin/components/QrScanner';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ScannerPortalPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionRetry, setSessionRetry] = useState(0);

  const signOut = useCallback(() => {
    localStorage.removeItem('scanner_token');
    localStorage.removeItem('scanner_username');
    setToken('');
    router.replace('/scanner/login');
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const storedToken = localStorage.getItem('scanner_token') || '';
    const storedUsername = localStorage.getItem('scanner_username') || '';

    if (!storedToken) {
      router.replace('/scanner/login');
      return () => { cancelled = true; };
    }

    setToken(storedToken);
    setUsername(storedUsername);
    setChecking(true);
    setSessionError(null);

    const verifySession = async () => {
      timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(`${apiUrl}/api/scanner/session`, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (response.status === 401 || response.status === 403) {
          if (!cancelled) signOut();
          return;
        }
        if (!response.ok) throw new Error('Scanner service is temporarily unavailable.');
        const result = await response.json();
        if (!cancelled) setUsername(result.data.username);
      } catch {
        if (!cancelled) {
          setSessionError(controller.signal.aborted
            ? 'Scanner access check timed out. Check your connection and retry.'
            : 'Could not reach the scanner service. Check your connection and retry.');
        }
      } finally {
        if (timeout) clearTimeout(timeout);
        if (!cancelled) setChecking(false);
      }
    };

    void verifySession();

    return () => {
      cancelled = true;
      controller.abort();
      if (timeout) clearTimeout(timeout);
    };
  }, [router, signOut, sessionRetry]);

  if (checking || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-sm text-slate-300" style={{ minHeight: '100svh' }}>
        Checking scanner access…
      </main>
    );
  }

  if (sessionError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-slate-100" style={{ minHeight: '100svh' }}>
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 text-center">
          <p className="text-base font-semibold">Scanner connection unavailable</p>
          <p className="mt-2 text-sm leading-6 text-slate-300" role="alert">{sessionError}</p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setSessionRetry((retry) => retry + 1)}
              className="min-h-11 rounded-xl bg-white px-4 text-sm font-semibold text-slate-950"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={signOut}
              className="min-h-11 rounded-xl border border-white/15 px-4 text-sm font-semibold"
            >
              Sign out
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-950 text-white" style={{ minHeight: '100svh' }}>
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur sm:px-6">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-950">
              <QrCode aria-hidden="true" className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-300">Ahibi</p>
              <p className="truncate text-sm font-semibold text-white">Entry scanner</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden max-w-28 truncate text-xs text-slate-300 sm:block">{username}</span>
            <button
              type="button"
              onClick={signOut}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              <span className="sm:hidden">Exit</span>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pt-5">
        <QrScanner scannerMode scannerToken={token} onSessionExpired={signOut} />
        <p className="mt-3 text-center text-xs leading-5 text-slate-500 sm:mt-4">
          Scan the ticket QR, check the ticket result, then confirm entry.
        </p>
      </div>
    </main>
  );
}
