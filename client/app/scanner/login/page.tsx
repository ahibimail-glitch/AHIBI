"use client";

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ScannerLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('scanner_token');
    if (token) router.replace('/scanner');
  }, [router]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${apiUrl}/api/scanner/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to sign in.');
      localStorage.setItem('scanner_token', result.data.token);
      localStorage.setItem('scanner_username', result.data.user.username);
      router.replace('/scanner');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-7 shadow-2xl sm:p-9">
        <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
          <span aria-hidden="true" className="text-xl">▦</span>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">Ahibi event operations</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Scanner sign in</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Sign in with the account provided by your administrator to verify tickets and record entry.</p>
        <form className="mt-7 space-y-4" onSubmit={submit}>
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
          <label className="block text-sm font-medium text-slate-800">
            Username
            <input autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-200" />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            Password
            <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-200" />
          </label>
          <button type="submit" disabled={busy} className="flex w-full items-center justify-center rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60">
            {busy ? 'Signing in…' : 'Open scanner'}
          </button>
        </form>
      </div>
    </main>
  );
}
