"use client";

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type EventItem = { _id: string; title: string; wristbandTrackingEnabled?: boolean; ticketTypes: Array<{ _id: string; name: string }> };
type Batch = { _id: string; ticketTypeName: string; color: string; prefix: string; startNumber: number; endNumber: number; nextNumber: number; active: boolean };
type Report = { ticketsSold: number; ticketsAwaitingBand: number; totalStock: number; bandsIssued: number; bandsRemaining: number; salesByChannel: Record<string, { bookings: number; tickets: number; bandsIssued: number }>; bandsByColorAndType: Array<{ _id: { channel: string; color: string; ticketType: string }; issued: number }> };
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function WristbandManagement() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventId, setEventId] = useState('');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [ticketTypeId, setTicketTypeId] = useState('');
  const [color, setColor] = useState('');
  const [prefix, setPrefix] = useState('');
  const [startNumber, setStartNumber] = useState('1');
  const [endNumber, setEndNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const headers = useCallback(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) { router.replace('/admin/login'); throw new Error('Admin sign-in is required.'); }
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }, [router]);
  const loadEvents = useCallback(async () => {
    const response = await fetch(`${apiUrl}/api/admin/events?status=approved`, { headers: headers() });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Unable to load events.');
    setEvents(result.data?.events || []);
  }, [headers]);
  const loadEvent = useCallback(async (id: string) => {
    if (!id) return;
    const [stockResponse, reportResponse] = await Promise.all([
      fetch(`${apiUrl}/api/admin/wristbands/${id}`, { headers: headers() }),
      fetch(`${apiUrl}/api/admin/wristbands/${id}/report`, { headers: headers() }),
    ]);
    const stock = await stockResponse.json(); const stats = await reportResponse.json();
    if (!stockResponse.ok) throw new Error(stock.message || 'Unable to load band stock.');
    if (!reportResponse.ok) throw new Error(stats.message || 'Unable to load band report.');
    setBatches(stock.data?.batches || []); setReport(stats.data);
  }, [headers]);
  useEffect(() => { void loadEvents().catch((e) => setError(e instanceof Error ? e.message : 'Unable to load events.')); }, [loadEvents]);
  useEffect(() => {
    const chosen = events.find((event) => event._id === eventId);
    setTicketTypeId(chosen?.ticketTypes?.[0]?._id || '');
    if (eventId) void loadEvent(eventId).catch((e) => setError(e instanceof Error ? e.message : 'Unable to load wristband data.'));
  }, [eventId, events, loadEvent]);
  const createBatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`${apiUrl}/api/admin/wristbands/${eventId}/batches`, { method: 'POST', headers: headers(), body: JSON.stringify({ ticketTypeId, color, prefix, startNumber: Number(startNumber), endNumber: Number(endNumber) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to add wristbands.');
      setNotice('Band range added. Wristband tracking is now enabled for this event.'); setColor(''); setPrefix(''); setEndNumber('');
      await loadEvent(eventId); await loadEvents();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to add wristbands.'); }
    finally { setBusy(false); }
  };
  const selectedEvent = events.find((event) => event._id === eventId);
  return <section className="mx-auto max-w-6xl space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-widest text-red-700">Venue operations</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Wristband inventory</h1><p className="mt-2 text-sm text-slate-600">Assign a numbered band when a ticket is checked in. Stock and issued counts include both online and box-office bookings.</p></header>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}{notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <label className="block max-w-xl text-sm font-medium text-slate-800">Event<select value={eventId} onChange={(e) => setEventId(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"><option value="">Select event</option>{events.map((event) => <option key={event._id} value={event._id}>{event.title}</option>)}</select></label>
    {eventId && <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[['Tickets sold', report?.ticketsSold ?? 0], ['Awaiting band', report?.ticketsAwaitingBand ?? 0], ['Stock received', report?.totalStock ?? 0], ['Bands issued', report?.bandsIssued ?? 0], ['Bands remaining', report?.bandsRemaining ?? 0]].map(([label, value]) => <div key={String(label)} className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p></div>)}</div>
      <div className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={createBatch} className="space-y-4 rounded-xl border bg-white p-5"><h2 className="font-semibold text-slate-900">Add band stock range</h2><label className="block text-sm">Ticket type<select required value={ticketTypeId} onChange={(e) => setTicketTypeId(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2">{(selectedEvent?.ticketTypes || []).map((ticket) => <option key={ticket._id} value={ticket._id}>{ticket.name}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="text-sm">Band color<input required maxLength={40} value={color} onChange={(e) => setColor(e.target.value)} placeholder="Red" className="mt-1 w-full rounded-lg border px-3 py-2" /></label><label className="text-sm">Prefix (optional)<input maxLength={24} value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="VIP-" className="mt-1 w-full rounded-lg border px-3 py-2" /></label><label className="text-sm">First serial<input required type="number" min="1" value={startNumber} onChange={(e) => setStartNumber(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label><label className="text-sm">Last serial<input required type="number" min={startNumber} value={endNumber} onChange={(e) => setEndNumber(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label></div><button disabled={busy || !ticketTypeId} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Add stock range</button></form>
        <div className="rounded-xl border bg-white p-5"><h2 className="font-semibold text-slate-900">Sales channel totals</h2><div className="mt-4 grid grid-cols-2 gap-3">{(['online', 'on-spot'] as const).map((channel) => <div key={channel} className="rounded-lg bg-slate-50 p-4"><h3 className="font-semibold capitalize">{channel === 'on-spot' ? 'Box office' : 'Online'}</h3><p className="mt-2 text-sm text-slate-600">{report?.salesByChannel?.[channel]?.bookings || 0} bookings - {report?.salesByChannel?.[channel]?.tickets || 0} tickets</p><p className="mt-1 text-sm text-slate-600">{report?.salesByChannel?.[channel]?.bandsIssued || 0} bands issued</p></div>)}</div></div>
      </div>
      <div className="overflow-hidden rounded-xl border bg-white"><h2 className="border-b px-5 py-4 font-semibold">Bands issued by color, ticket type and sales channel</h2>{!report?.bandsByColorAndType?.length ? <p className="p-5 text-sm text-slate-500">No bands have been issued yet.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr>{['Color', 'Ticket type', 'Sales channel', 'Bands issued'].map((item) => <th key={item} className="px-5 py-3 font-medium">{item}</th>)}</tr></thead><tbody className="divide-y">{report.bandsByColorAndType.map((row) => <tr key={`${row._id.channel}-${row._id.color}-${row._id.ticketType}`}><td className="px-5 py-3">{row._id.color}</td><td className="px-5 py-3">{row._id.ticketType}</td><td className="px-5 py-3">{row._id.channel === 'on-spot' ? 'Box office' : 'Online'}</td><td className="px-5 py-3 font-semibold">{row.issued}</td></tr>)}</tbody></table></div>}</div>
      <div className="overflow-hidden rounded-xl border bg-white"><h2 className="border-b px-5 py-4 font-semibold">Recorded stock ranges</h2>{batches.length === 0 ? <p className="p-5 text-sm text-slate-500">No stock ranges added yet.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr>{['Ticket type', 'Color', 'Range', 'Next serial', 'Status'].map((item) => <th key={item} className="px-5 py-3 font-medium">{item}</th>)}</tr></thead><tbody className="divide-y">{batches.map((batch) => <tr key={batch._id}><td className="px-5 py-3">{batch.ticketTypeName}</td><td className="px-5 py-3">{batch.color}</td><td className="px-5 py-3">{batch.prefix}{batch.startNumber}–{batch.prefix}{batch.endNumber}</td><td className="px-5 py-3">{batch.nextNumber <= batch.endNumber ? `${batch.prefix}${batch.nextNumber}` : 'Exhausted'}</td><td className="px-5 py-3">{batch.active ? 'Active' : 'Closed'}</td></tr>)}</tbody></table></div>}</div>
    </>}
  </section>;
}
