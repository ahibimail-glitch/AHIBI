"use client";

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type ScannerStaff = {
  id: string;
  username: string;
  isActive: boolean;
  createdAt: string;
  eventAssignments: null | Array<{ event: string; canScan: boolean; canIssueWristbands: boolean; canSellOnsite: boolean; canViewCounts: boolean }>;
};
type EventOption = { _id: string; title: string; wristbandTrackingEnabled?: boolean };
type ActivityReport = {
  summary: { total: number; errors: number; averageDurationMs: number };
  byStaff: Array<{ username: string; total: number; errors: number }>;
  byEvent: Array<{ title: string; total: number; errors: number }>;
  recent: Array<{ id: string; username: string; eventTitle: string; action: string; outcome: 'success' | 'error'; statusCode: number; errorCode: string; durationMs: number; createdAt: string }>;
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
  const [events, setEvents] = useState<EventOption[]>([]);
  const [activity, setActivity] = useState<ActivityReport | null>(null);
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);

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

  const loadEvents = useCallback(async () => {
    const response = await fetch(`${apiUrl}/api/admin/events?status=approved`, { headers: headers() });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Unable to load events.');
    setEvents(result.data?.events || []);
  }, [headers]);

  const loadActivity = useCallback(async () => {
    const response = await fetch(`${apiUrl}/api/admin/scanner-staff/activity`, { headers: headers() });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Unable to load scanner activity.');
    setActivity(result.data);
    setSelectedActivityIds((selected) => selected.filter((id) => (result.data?.recent || []).some((item: ActivityReport['recent'][number]) => item.id === id)));
  }, [headers]);

  const deleteSelectedActivity = async () => {
    if (!selectedActivityIds.length) return;
    const confirmed = window.confirm(`Permanently delete ${selectedActivityIds.length} selected scanner activity record(s)? This only deletes the selected log rows; bookings, tickets, and scanner accounts are not affected.`);
    if (!confirmed) return;

    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${apiUrl}/api/admin/scanner-staff/activity`, {
        method: 'DELETE',
        headers: headers(),
        body: JSON.stringify({ ids: selectedActivityIds }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to delete selected activity records.');
      setSelectedActivityIds([]);
      setNotice(`${result.data?.deletedCount ?? 0} selected activity record(s) deleted.`);
      await loadActivity();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete selected activity records.');
    } finally {
      setBusy(false);
    }
  };

  const toggleActivitySelection = (id: string) => {
    setSelectedActivityIds((selected) => selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  };

  const allRecentSelected = Boolean(activity?.recent.length) && activity!.recent.every((item) => selectedActivityIds.includes(item.id));
  const toggleAllRecent = () => {
    if (!activity) return;
    setSelectedActivityIds(allRecentSelected ? [] : activity.recent.map((item) => item.id));
  };

  useEffect(() => {
    void loadStaff().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load scanner accounts.'));
    void loadEvents().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load events.'));
    void loadActivity().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load scanner activity.'));
  }, [loadStaff, loadEvents, loadActivity]);

  const saveAssignment = async (account: ScannerStaff, eventId: string, enabled: boolean) => {
    const current = account.eventAssignments || events.map((event) => ({ event: event._id, canScan: true, canIssueWristbands: false, canSellOnsite: false, canViewCounts: false }));
    const assignment = current.find((row) => String(row.event) === eventId);
    const next = current.filter((row) => String(row.event) !== eventId);
    if (enabled) next.push(assignment || { event: eventId, canScan: true, canIssueWristbands: true, canSellOnsite: false, canViewCounts: false });
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`${apiUrl}/api/admin/scanner-staff/${account.id}/assignments`, {
        method: 'PUT', headers: headers(), body: JSON.stringify({ eventAssignments: next }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to save event assignment.');
      setNotice(`Event access updated for ${account.username}.`);
      await loadStaff();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save event assignment.');
    } finally { setBusy(false); }
  };

  const setPermission = async (account: ScannerStaff, eventId: string, permission: 'canScan' | 'canIssueWristbands' | 'canSellOnsite' | 'canViewCounts', value: boolean) => {
    const current = account.eventAssignments || events.map((event) => ({ event: event._id, canScan: true, canIssueWristbands: false, canSellOnsite: false, canViewCounts: false }));
    const found = current.find((row) => String(row.event) === eventId);
    const next = current.filter((row) => String(row.event) !== eventId);
    next.push({ ...(found || { event: eventId, canScan: false, canIssueWristbands: false, canSellOnsite: false, canViewCounts: false }), [permission]: value });
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`${apiUrl}/api/admin/scanner-staff/${account.id}/assignments`, { method: 'PUT', headers: headers(), body: JSON.stringify({ eventAssignments: next }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to save permission.');
      setNotice(`Permissions updated for ${account.username}.`); await loadStaff();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to save permission.'); }
    finally { setBusy(false); }
  };

  const copyStaffLink = async (account: ScannerStaff, event: EventOption, mode: 'scan' | 'box-office') => {
    const link = new URL('/scanner/login', window.location.origin);
    link.searchParams.set('username', account.username);
    link.searchParams.set('event', event._id);
    link.searchParams.set('mode', mode);
    try {
      await navigator.clipboard.writeText(link.toString());
      setError('');
      setNotice(`${mode === 'scan' ? 'Scanner' : 'Box-office'} link for ${event.title} copied. Share the password separately.`);
    } catch {
      setError('Could not copy the link. Check browser clipboard permission and try again.');
    }
  };

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
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">These accounts cannot open the admin dashboard. Assign each person only the events and actions they need, then copy an event-specific sign-in link. Share the password separately. Box-office sellers also need wristband issuance permission for tracked events.</p>
      </header>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold text-slate-900">Scanner operations · last 7 days</h2><p className="mt-1 text-sm text-slate-500">Check-ins, box-office activity, access errors, and response times.</p></div>
          <button type="button" onClick={() => void loadActivity().catch((e) => setError(e instanceof Error ? e.message : 'Unable to refresh activity.'))} className="rounded-md border px-3 py-2 text-sm font-medium text-slate-700">Refresh activity</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[["Operations", activity?.summary.total ?? '—'], ['Errors', activity?.summary.errors ?? '—'], ['Average response', activity ? `${activity.summary.averageDurationMs} ms` : '—']].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-slate-50 p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p></div>)}
        </div>
        {activity && <div className="grid gap-4 md:grid-cols-2">
          <div><h3 className="text-sm font-semibold text-slate-800">By staff member</h3>{activity.byStaff.length ? <ul className="mt-2 divide-y rounded-lg border">{activity.byStaff.map((item) => <li key={item.username} className="flex justify-between gap-3 px-3 py-2 text-sm"><span>{item.username}</span><span className="text-slate-500">{item.total} actions · {item.errors} errors</span></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No activity recorded yet.</p>}</div>
          <div><h3 className="text-sm font-semibold text-slate-800">By event</h3>{activity.byEvent.length ? <ul className="mt-2 divide-y rounded-lg border">{activity.byEvent.map((item) => <li key={item.title} className="flex justify-between gap-3 px-3 py-2 text-sm"><span className="truncate">{item.title}</span><span className="shrink-0 text-slate-500">{item.total} actions · {item.errors} errors</span></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No event activity recorded yet.</p>}</div>
        </div>}
        {activity && <div className="overflow-x-auto">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800">Recent activity and errors</h3>
            <div className="flex items-center gap-2">
              {activity.recent.length > 0 && <button type="button" disabled={busy} onClick={toggleAllRecent} className="rounded-md border px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50">{allRecentSelected ? 'Clear selection' : 'Select all shown'}</button>}
              <button type="button" disabled={busy || selectedActivityIds.length === 0} onClick={() => void deleteSelectedActivity()} className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Delete selected{selectedActivityIds.length ? ` (${selectedActivityIds.length})` : ''}</button>
            </div>
          </div>
          <p className="mb-2 text-xs text-slate-500">Select log rows to remove test activity. This does not delete bookings, tickets, scanner accounts, or wristband records.</p>
          {activity.recent.length ? <table className="w-full min-w-[800px] text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr><th className="w-9 px-3 py-2"><input aria-label="Select all shown activity records" type="checkbox" checked={allRecentSelected} onChange={toggleAllRecent} disabled={busy} /></th>{['Time', 'Staff', 'Event', 'Action', 'Result', 'Error / status', 'Duration'].map((item) => <th key={item} className="px-3 py-2 font-medium">{item}</th>)}</tr></thead><tbody className="divide-y">{activity.recent.map((item) => <tr key={item.id}><td className="px-3 py-2"><input aria-label={`Select activity from ${item.username} at ${new Date(item.createdAt).toLocaleString()}`} type="checkbox" checked={selectedActivityIds.includes(item.id)} onChange={() => toggleActivitySelection(item.id)} disabled={busy} /></td><td className="px-3 py-2">{new Date(item.createdAt).toLocaleString()}</td><td className="px-3 py-2">{item.username}</td><td className="px-3 py-2">{item.eventTitle}</td><td className="px-3 py-2 font-mono">{item.action}</td><td className={`px-3 py-2 font-semibold ${item.outcome === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{item.outcome}</td><td className="px-3 py-2">{item.errorCode || item.statusCode}</td><td className="px-3 py-2">{item.durationMs} ms</td></tr>)}</tbody></table> : <p className="rounded-lg border p-4 text-sm text-slate-500">No scanner activity yet. New staff actions and API errors will appear here.</p>}
        </div>}
      </section>

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
                  <div className="mt-3 flex flex-wrap gap-2">
                    {events.map((event) => {
                      const checked = account.eventAssignments == null || account.eventAssignments.some((item) => String(item.event) === event._id);
                      const assignment = account.eventAssignments?.find((item) => String(item.event) === event._id);
                      return <div key={event._id} className="rounded-md border px-2 py-2 text-xs text-slate-700">
                        <label className="flex items-center gap-1.5 font-medium"><input type="checkbox" checked={checked} disabled={busy} onChange={(e) => void saveAssignment(account, event._id, e.target.checked)} />{event.title}</label>
                        {checked && <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 pl-5 text-slate-600">{([['canScan', 'Scan'], ['canIssueWristbands', 'Issue bands'], ['canSellOnsite', 'Box office'], ['canViewCounts', 'View counts']] as const).map(([key, title]) => <label key={key} className="flex items-center gap-1"><input type="checkbox" disabled={busy} checked={account.eventAssignments == null ? key === 'canScan' : Boolean(assignment?.[key])} onChange={(e) => void setPermission(account, event._id, key, e.target.checked)} />{title}</label>)}</div>}
                        {checked && <div className="mt-2 flex flex-wrap gap-2 pl-5">
                          {(account.eventAssignments == null
                            ? !event.wristbandTrackingEnabled
                            : Boolean(assignment?.canScan && (!event.wristbandTrackingEnabled || assignment.canIssueWristbands))) && <button type="button" disabled={busy} onClick={() => void copyStaffLink(account, event, 'scan')} className="rounded border px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Copy scanner link</button>}
                          {Boolean(assignment?.canSellOnsite && (!event.wristbandTrackingEnabled || assignment.canIssueWristbands)) && <button type="button" disabled={busy} onClick={() => void copyStaffLink(account, event, 'box-office')} className="rounded border px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Copy box-office link</button>}
                        </div>}
                      </div>;
                    })}
                  </div>
                  {account.eventAssignments == null && <p className="mt-1 text-xs text-amber-700">Legacy access: this account can scan all events until you change its assignments.</p>}
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
      <p className="text-sm text-slate-500">Staff sign in at <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">/scanner/login</code>. Event links prefill the account and event; passwords are never included in links.</p>
    </section>
  );
}
