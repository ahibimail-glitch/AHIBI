"use client";

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type ScannerStaff = {
  id: string;
  username: string;
  isActive: boolean;
  createdAt: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ScannerStaffManagement() {
  const router = useRouter();
  const [staff, setStaff] = useState<ScannerStaff[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const headers = useCallback(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.replace('/admin/login');
      throw new Error('Admin sign-in is required.');
    }
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }, [router]);

  const loadStaff = useCallback(async () => {
    const response = await fetch(`${apiUrl}/api/admin/scanner-staff`, { headers: headers() });
    const result = await response.json();
    if (response.status === 401 || response.status === 403) {
      router.replace('/admin/login');
      throw new Error('Admin sign-in is required.');
    }
    if (!response.ok) throw new Error(result.message || 'Unable to load scanner accounts.');
    setStaff(result.data || []);
  }, [headers, router]);

  useEffect(() => {
    void loadStaff().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load scanner accounts.'));
  }, [loadStaff]);

  const createStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${apiUrl}/api/admin/scanner-staff`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to create scanner account.');
      setUsername('');
      setPassword('');
      setNotice(`Scanner account “${result.data.username}” is ready. Share the password securely with the assigned staff member.`);
      await loadStaff();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create scanner account.');
    } finally {
      setBusy(false);
    }
  };

  const setActive = async (account: ScannerStaff, isActive: boolean) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${apiUrl}/api/admin/scanner-staff/${account.id}/active`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ isActive }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to update scanner account.');
      setNotice(`${account.username} ${isActive ? 'enabled' : 'disabled'}. Existing scanner sessions have been revoked.`);
      await loadStaff();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update scanner account.');
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (account: ScannerStaff) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${apiUrl}/api/admin/scanner-staff/${account.id}/password`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ password: resetPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to reset scanner password.');
      setResetId(null);
      setResetPassword('');
      setNotice(`Password reset for ${account.username}. Existing scanner sessions have been revoked.`);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Unable to reset scanner password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">Access management</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950">Scanning team accounts</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">These accounts can verify tickets and record entry in the separate scanner portal. They cannot open the admin dashboard or manage bookings.</p>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</p>}

      <form onSubmit={createStaff} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="block text-sm font-medium text-slate-800">Username
          <input required minLength={3} maxLength={40} pattern="[A-Za-z0-9._-]{3,40}" autoComplete="off" value={username} onChange={(event) => setUsername(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
        </label>
        <label className="block text-sm font-medium text-slate-800">Initial password <span className="font-normal text-slate-500">(12+ characters)</span>
          <input required minLength={12} maxLength={72} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
        </label>
        <button type="submit" disabled={busy} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Create scanner account</button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Accounts</h2>
          <p className="mt-1 text-sm text-slate-600">Disabled accounts lose access immediately. Password resets revoke existing sessions.</p>
        </div>
        {staff.length === 0 ? <p className="px-5 py-8 text-sm text-slate-500">No scanner accounts have been created.</p> : (
          <ul className="divide-y divide-slate-100">
            {staff.map((account) => (
              <li key={account.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{account.username}</p>
                  <p className="mt-1 text-xs text-slate-500">Created {new Date(account.createdAt).toLocaleDateString()} · {account.isActive ? 'Active' : 'Disabled'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" disabled={busy} onClick={() => { setResetId(resetId === account.id ? null : account.id); setResetPassword(''); }} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Reset password</button>
                  <button type="button" disabled={busy} onClick={() => void setActive(account, !account.isActive)} className={`rounded-md px-3 py-2 text-xs font-semibold disabled:opacity-50 ${account.isActive ? 'border border-red-200 text-red-700' : 'bg-emerald-700 text-white'}`}>{account.isActive ? 'Disable' : 'Enable'}</button>
                </div>
                {resetId === account.id && <div className="flex w-full flex-col gap-2 md:max-w-md md:flex-row">
                  <input aria-label={`New password for ${account.username}`} type="password" minLength={12} maxLength={72} value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} placeholder="New password (12+ characters)" className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  <button type="button" disabled={busy || resetPassword.length < 12} onClick={() => void savePassword(account)} className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Save password</button>
                </div>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-sm text-slate-500">Scanner sign-in: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">/scanner/login</code></p>
    </section>
  );
}
