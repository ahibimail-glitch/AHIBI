"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QrScanner from '../admin/components/QrScanner';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ScannerPortalPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(true);

  const signOut = () => {
    localStorage.removeItem('scanner_token');
    localStorage.removeItem('scanner_username');
    setToken('');
    router.replace('/scanner/login');
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('scanner_token') || '';
    const storedUsername = localStorage.getItem('scanner_username') || '';
    if (!storedToken) {
      router.replace('/scanner/login');
      return;
    }
    setToken(storedToken);
    setUsername(storedUsername);
    fetch(`${apiUrl}/api/scanner/session`, { headers: { Authorization: `Bearer ${storedToken}` } })
      .then((response) => {
        if (!response.ok) throw new Error('Scanner session expired.');
        return response.json();
      })
      .then((result) => setUsername(result.data.username))
      .catch(() => signOut())
      .finally(() => setChecking(false));
  }, [router]);

  if (checking || !token) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">Loading scanner…</main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 sm:px-6">
      <header className="mx-auto mb-5 flex max-w-6xl items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-red-700">Ahibi scanner</p>
          <p className="mt-0.5 text-sm text-slate-700">Signed in as <span className="font-semibold">{username}</span></p>
        </div>
        <button type="button" onClick={signOut} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Sign out</button>
      </header>
      <div className="mx-auto max-w-6xl">
        <QrScanner scannerMode scannerToken={token} onSessionExpired={signOut} />
      </div>
    </main>
  );
}
