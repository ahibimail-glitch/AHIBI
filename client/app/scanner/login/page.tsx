"use client";

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, QrCode } from 'lucide-react';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ScannerLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('scanner_token')) router.replace('/scanner');
  }, [router]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/api/scanner/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
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
    <main
      className="flex min-h-screen flex-col bg-[#f3f2ef] px-4 pb-6 pt-5 text-slate-950 sm:justify-center sm:py-10"
      style={{ minHeight: '100svh', paddingTop: 'max(1.25rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto w-full max-w-md sm:my-auto">
        <header className="mb-5 flex items-center gap-3 px-1 sm:mb-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
            <QrCode aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-800">Ahibi Event Operations</p>
            <p className="mt-0.5 text-sm text-slate-600">Staff sign in</p>
          </div>
        </header>

        <section className="rounded-[1.65rem] border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Entry team</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Scanner sign in</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Sign in with the account provided by your administrator to verify tickets and record entry.
          </p>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            {error && (
              <p id="scanner-login-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-800">
                {error}
              </p>
            )}

            <label className="block text-sm font-semibold text-slate-800" htmlFor="scanner-username">
              Username
              <input
                id="scanner-username"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="mt-2 min-h-[52px] w-full rounded-xl border border-slate-300 bg-white px-4 text-base font-normal text-slate-950 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-800" htmlFor="scanner-password">
              Password
              <span className="relative mt-2 block">
                <input
                  id="scanner-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="min-h-[52px] w-full rounded-xl border border-slate-300 bg-white px-4 pr-14 text-base font-normal text-slate-950 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-1 right-1 flex w-11 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                >
                  {showPassword ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
                </button>
              </span>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="mt-2 flex min-h-[54px] w-full items-center justify-center rounded-xl bg-slate-950 px-5 text-base font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20 disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? 'Signing in…' : 'Open scanner'}
            </button>
          </form>
        </section>

        <p className="mt-4 px-2 text-center text-sm leading-5 text-slate-500">
          Need scanner access? Ask your event administrator to create or reset your account.
        </p>
      </div>
    </main>
  );
}
