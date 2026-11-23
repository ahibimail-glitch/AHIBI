"use client";

import { FormEvent, useEffect, useRef, useState } from 'react';

type TicketType = { _id: string; name: string; price: number; zones?: { name: string; onlineAvailable?: number; onlineSoldOut?: boolean }[] };
type EventItem = { _id: string; title: string; wristbandTrackingEnabled?: boolean; ticketTypes: TicketType[] };
type SoldBooking = { _id: string; ticketType: string; quantity: number; total: number };
type Wristband = { bandCode: string; color: string; ticketType: string; ticketUnitIndex: number };

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ScannerBoxOffice({ token, initialEventId = '' }: { token: string; initialEventId?: string }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventId, setEventId] = useState('');
  const [ticketTypeId, setTicketTypeId] = useState('');
  const [zone, setZone] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [payment, setPayment] = useState('Cash');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState<SoldBooking | null>(null);
  const [bands, setBands] = useState<Wristband[]>([]);
  const [saleOutcomeUnknown, setSaleOutcomeUnknown] = useState(false);
  const saleRequestId = useRef('');
  const selectedEvent = events.find((item) => item._id === eventId);
  const selectedTicket = selectedEvent?.ticketTypes.find((item) => item._id === ticketTypeId);
  const requiresZone = (selectedTicket?.zones?.length || 0) > 0;

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiUrl}/api/scanner/on-spot/events`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Could not load box-office events.');
        return result.events || [];
      })
      .then((loadedEvents) => {
        if (cancelled) return;
        setEvents(loadedEvents);
        const initialEvent = initialEventId ? loadedEvents.find((item: EventItem) => item._id === initialEventId) : null;
        const chosenEvent = initialEventId ? initialEvent : loadedEvents[0];
        setEventId(chosenEvent?._id || '');
        setTicketTypeId(chosenEvent?.ticketTypes?.[0]?._id || '');
        setZone('');
        if (initialEventId && !initialEvent) setError('This event is not assigned to your box-office account. Ask an administrator to update your access.');
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Could not load events.');
      });
    return () => { cancelled = true; };
  }, [token, initialEventId]);

  const sell = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    let responseReceived = false;
    let uncertain = false;
    try {
      if (!saleRequestId.current) saleRequestId.current = crypto.randomUUID();
      const response = await fetch(`${apiUrl}/api/scanner/on-spot`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': saleRequestId.current,
        },
        body: JSON.stringify({
          eventId, ticketTypeId, customerName: name, customerPhone: phone,
          quantity, modeOfPayment: payment, ...(zone ? { zone } : {}),
        }),
      });
      responseReceived = true;
      uncertain = response.status >= 500 || response.ok;
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to record box-office sale.');
      const tracksWristbands = selectedEvent?.wristbandTrackingEnabled === true;
      if (!result.booking?._id || (tracksWristbands && (!Array.isArray(result.wristbands) || result.wristbands.length < quantity))) {
        throw new Error('The sale response was incomplete. Retry the same sale request or ask a supervisor to verify it.');
      }
      setBooking(result.booking);
      setBands(result.wristbands || []);
      saleRequestId.current = '';
      setSaleOutcomeUnknown(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to record sale.');
      if (!responseReceived || uncertain) setSaleOutcomeUnknown(true);
    } finally {
      setBusy(false);
    }
  };

  const startAnotherSale = () => {
    setBooking(null);
    setBands([]);
    setName('');
    setPhone('');
    setQuantity(1);
    setError('');
    setSaleOutcomeUnknown(false);
    saleRequestId.current = '';
  };

  return (
    <section className="mx-auto w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900 p-5 text-white shadow-xl">
      <h2 className="text-xl font-bold">Box office sale</h2>
      <p className="mt-1 text-sm text-slate-400">Record cash, UPI or card sales.{selectedEvent?.wristbandTrackingEnabled ? ' Numbered wristbands are reserved with the sale.' : ''}</p>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-950 p-3 text-sm text-red-200">{error}</p>}

      {!booking ? events.length === 0 ? (
        <p className="mt-5 rounded-lg border border-white/10 p-4 text-sm text-slate-300">No active events are assigned for box-office sales. Ask an administrator to assign access{events.length === 0 ? ' and wristband issuance for tracked events' : ''}.</p>
      ) : (
        <form onSubmit={sell} className="mt-5 space-y-3">
          <label className="block text-sm">Event
            <select required disabled={busy || saleOutcomeUnknown} value={eventId} onChange={(e) => {
              const nextEvent = events.find((item) => item._id === e.target.value);
              setEventId(e.target.value);
              setTicketTypeId(nextEvent?.ticketTypes?.[0]?._id || '');
              setZone('');
            }} className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-slate-950 px-3">
              {events.map((item) => <option key={item._id} value={item._id}>{item.title}</option>)}
            </select>
          </label>
          <label className="block text-sm">Ticket type
            <select required disabled={busy || saleOutcomeUnknown} value={ticketTypeId} onChange={(e) => { setTicketTypeId(e.target.value); setZone(''); }} className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-slate-950 px-3">
              {(selectedEvent?.ticketTypes || []).map((item) => <option key={item._id} value={item._id}>{item.name} - INR {item.price}</option>)}
            </select>
          </label>
          {requiresZone && <label className="block text-sm">General seating zone
            <select required disabled={busy || saleOutcomeUnknown} value={zone} onChange={(e) => setZone(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-slate-950 px-3">
              <option value="">Choose a zone</option>
              {selectedTicket?.zones?.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
          </label>}
          <label className="block text-sm">Attendee name
            <input required disabled={busy || saleOutcomeUnknown} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-slate-950 px-3" />
          </label>
          <label className="block text-sm">Phone number
            <input required disabled={busy || saleOutcomeUnknown} maxLength={25} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-slate-950 px-3" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">Quantity
              <input required disabled={busy || saleOutcomeUnknown} type="number" min={1} max={20} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-slate-950 px-3" />
            </label>
            <label className="block text-sm">Payment
              <select disabled={busy || saleOutcomeUnknown} value={payment} onChange={(e) => setPayment(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-slate-950 px-3">
                <option>Cash</option><option>UPI</option><option>Card</option>
              </select>
            </label>
          </div>
          <p className="text-sm text-slate-300">Total: INR {(selectedTicket?.price || 0) * quantity}</p>
          <button disabled={busy || !eventId || !ticketTypeId || (requiresZone && !zone)} className="min-h-12 w-full rounded-xl bg-white font-semibold text-slate-950 disabled:opacity-50">
            {busy ? 'Recording sale...' : saleOutcomeUnknown ? 'Retry same sale' : 'Record box-office sale'}
          </button>
        </form>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl bg-slate-950 p-4">
            <p className="font-semibold">Sale recorded</p>
            <p className="mt-1 text-sm text-slate-300">{booking.ticketType} - {booking.quantity} ticket(s) - INR {booking.total}</p>
            <p className="mt-1 break-all font-mono text-xs text-slate-500">Booking {booking._id}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4">
            {bands.length > 0 && <><p className="font-semibold text-emerald-200">Wristbands reserved - hand these to the attendee</p>
            {bands.map((band) => <p key={band.bandCode} className="mt-2 font-mono text-lg font-bold">{band.bandCode} <span className="text-sm font-normal text-emerald-200">({band.color}, attendee {band.ticketUnitIndex})</span></p>)}</>}
          </div>
          <button onClick={startAnotherSale} className="min-h-11 w-full rounded-xl border border-white/15">New sale</button>
        </div>
      )}
    </section>
  );
}
