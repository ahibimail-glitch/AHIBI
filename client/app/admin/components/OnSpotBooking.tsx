"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, LoaderCircle, Ticket } from "lucide-react";

interface OnSpotTicketType {
  _id: string;
  name: string;
  price: number;
  available: number;
}

interface OnSpotEvent {
  _id: string;
  title: string;
  startDate: string;
  endDate: string;
  location?: { address?: string; city?: string };
  ticketTypes: OnSpotTicketType[];
}

interface RecordedBooking {
  _id: string;
  ticketType: string;
  quantity: number;
  price: number;
  total: number;
}

interface BookingResult {
  event: { title: string };
  customer: { name: string; phone: string; email: string };
  modeOfPayment: string;
  total: number;
  booking: RecordedBooking;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function getAdminToken() {
  return localStorage.getItem("admin_token");
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}

export default function OnSpotBooking() {
  const [events, setEvents] = useState<OnSpotEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [eventId, setEventId] = useState("");
  const [ticketTypeId, setTicketTypeId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [modeOfPayment, setModeOfPayment] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  const selectedEvent = useMemo(
    () => events.find((event) => event._id === eventId) || null,
    [events, eventId]
  );
  const selectedTicketType = useMemo(
    () => selectedEvent?.ticketTypes.find((ticket) => ticket._id === ticketTypeId) || null,
    [selectedEvent, ticketTypeId]
  );
  const total = (selectedTicketType?.price || 0) * quantity;
  const canSubmit = Boolean(
    selectedEvent && selectedTicketType && selectedTicketType.available >= quantity &&
    customerName.trim() && customerPhone.trim() && modeOfPayment && paymentConfirmed
  );

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = getAdminToken();
        if (!token) throw new Error("Your admin session has expired. Sign in again to continue.");
        const response = await axios.get<{ events: OnSpotEvent[] }>(
          `${API_URL}/api/admin/bookings/on-spot/events`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEvents(response.data.events || []);
      } catch (error: any) {
        setLoadError(error.response?.data?.message || error.message || "Could not load events.");
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchEvents();
  }, []);

  const resetPaymentConfirmation = () => {
    setPaymentConfirmed(false);
    setRequestId("");
  };

  const handleCreateBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");
    if (!canSubmit) return;

    try {
      setIsSubmitting(true);
      const token = getAdminToken();
      if (!token) throw new Error("Your admin session has expired. Sign in again to continue.");
      const currentRequestId = requestId || crypto.randomUUID();
      setRequestId(currentRequestId);

      const response = await axios.post<BookingResult>(
        `${API_URL}/api/admin/bookings/on-spot`,
        {
          eventId,
          ticketTypeId,
          quantity,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          ...(customerEmail.trim() ? { customerEmail: customerEmail.trim() } : {}),
          modeOfPayment,
        },
        { headers: { Authorization: `Bearer ${token}`, "Idempotency-Key": currentRequestId } }
      );
      setBookingResult(response.data);
    } catch (error: any) {
      setSubmitError(error.response?.data?.message || error.message || "Could not create this booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startAnotherBooking = () => {
    setBookingResult(null);
    setEventId("");
    setTicketTypeId("");
    setQuantity(1);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setModeOfPayment("");
    setPaymentConfirmed(false);
    setRequestId("");
    setSubmitError("");
  };

  if (bookingResult) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <Badge className="mb-3 border-green-200 bg-green-50 text-green-800 hover:bg-green-50">
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Paid booking recorded
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Physical ticket sale recorded</h1>
          <p className="mt-1 text-sm text-slate-600">
            {bookingResult.event.title} · {bookingResult.booking.quantity} physical ticket(s) · {bookingResult.modeOfPayment}
          </p>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-start gap-3 p-5 sm:p-6">
            <span className="mt-0.5 rounded-lg bg-indigo-50 p-2 text-indigo-700"><Ticket className="h-4 w-4" /></span>
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{bookingResult.booking.ticketType} × {bookingResult.booking.quantity}</p>
              <p className="mt-1 text-sm text-slate-600">{bookingResult.customer.name} · {bookingResult.customer.phone}</p>
              {bookingResult.customer.email && <p className="mt-0.5 text-sm text-slate-600">{bookingResult.customer.email}</p>}
              <p className="mt-2 truncate text-xs text-slate-500">Booking ID {bookingResult.booking._id}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Collected by {bookingResult.modeOfPayment}</p>
            <p className="text-lg font-semibold text-slate-950">Total {formatCurrency(bookingResult.total)}</p>
            <p className="mt-1 text-sm text-slate-600">Hand over {bookingResult.booking.quantity} physical ticket(s) from the event stock.</p>
          </div>
          <Button type="button" onClick={startAnotherBooking}>Record another sale</Button>
        </div>
        {submitError && <p role="alert" className="text-sm text-red-700">{submitError}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <Badge variant="outline" className="mb-3 border-indigo-200 bg-indigo-50 text-indigo-800">Event day sales</Badge>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">On spot booking</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Record customer details and payment for printed physical tickets already held at the event. This form does not create a digital ticket.
        </p>
        <p className="mt-2 text-xs text-slate-500">NUSC home-match fixtures use separate ticket inventory and are not listed in this form.</p>
      </div>

      {loadError ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div><p className="font-medium">Events could not be loaded</p><p className="mt-1">{loadError}</p></div>
        </div>
      ) : isLoadingEvents ? (
        <div className="flex items-center gap-2 py-10 text-sm text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading events…</div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">There are no approved events currently open for on-spot sales.</div>
      ) : (
        <form onSubmit={handleCreateBooking}>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 pb-5">
                <CardTitle className="text-lg">Customer and ticket details</CardTitle>
                <CardDescription>Name and phone are required. Email is optional.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-7 pt-6">
                <section className="space-y-4">
                  <h2 className="text-sm font-semibold text-slate-900">Ticket selection</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="on-spot-event">Event</Label>
                      <Select value={eventId} onValueChange={(value) => {
                        setEventId(value);
                        setTicketTypeId("");
                        setQuantity(1);
                        resetPaymentConfirmation();
                      }}>
                        <SelectTrigger id="on-spot-event"><SelectValue placeholder="Choose an event" /></SelectTrigger>
                        <SelectContent>
                          {events.map((event) => (
                            <SelectItem key={event._id} value={event._id}>{event.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="on-spot-ticket-type">Ticket type</Label>
                      <Select value={ticketTypeId} onValueChange={(value) => {
                        setTicketTypeId(value);
                        setQuantity(1);
                        resetPaymentConfirmation();
                      }} disabled={!selectedEvent}>
                        <SelectTrigger id="on-spot-ticket-type"><SelectValue placeholder="Choose a ticket type" /></SelectTrigger>
                        <SelectContent>
                          {(selectedEvent?.ticketTypes || []).map((ticket) => (
                            <SelectItem key={ticket._id} value={ticket._id} disabled={ticket.available < 1}>
                              {ticket.name} · {formatCurrency(ticket.price)}{ticket.available < 1 ? " · Sold out" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:max-w-48">
                      <Label htmlFor="on-spot-quantity">Quantity</Label>
                      <Input
                        id="on-spot-quantity"
                        type="number"
                        min={1}
                        max={selectedTicketType?.available || 1}
                        step={1}
                        value={quantity}
                        onChange={(event) => {
                          const nextQuantity = Number.parseInt(event.target.value, 10);
                          setQuantity(Number.isFinite(nextQuantity) ? Math.max(1, Math.min(nextQuantity, selectedTicketType?.available || 1)) : 1);
                          resetPaymentConfirmation();
                        }}
                        disabled={!selectedTicketType || selectedTicketType.available < 1}
                      />
                      {selectedTicketType && <p className="text-xs text-slate-500">{selectedTicketType.available} available</p>}
                    </div>
                  </div>
                </section>

                <section className="space-y-4 border-t border-slate-100 pt-6">
                  <h2 className="text-sm font-semibold text-slate-900">Customer</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="on-spot-name">Full name</Label>
                      <Input id="on-spot-name" autoComplete="name" maxLength={100} value={customerName} onChange={(event) => { setCustomerName(event.target.value); resetPaymentConfirmation(); }} placeholder="Customer name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="on-spot-phone">Phone number</Label>
                      <Input id="on-spot-phone" type="tel" inputMode="tel" autoComplete="tel" value={customerPhone} onChange={(event) => { setCustomerPhone(event.target.value); resetPaymentConfirmation(); }} placeholder="Phone number" required />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="on-spot-email">Email <span className="font-normal text-slate-500">(optional)</span></Label>
                      <Input id="on-spot-email" type="email" autoComplete="email" maxLength={254} value={customerEmail} onChange={(event) => { setCustomerEmail(event.target.value); resetPaymentConfirmation(); }} placeholder="name@example.com" />
                    </div>
                  </div>
                </section>

                <section className="space-y-4 border-t border-slate-100 pt-6">
                  <h2 className="text-sm font-semibold text-slate-900">Payment collected</h2>
                  <div className="space-y-2">
                    <Label htmlFor="on-spot-payment">Payment method</Label>
                    <Select value={modeOfPayment} onValueChange={(value) => { setModeOfPayment(value); resetPaymentConfirmation(); }}>
                      <SelectTrigger id="on-spot-payment"><SelectValue placeholder="Choose how payment was collected" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </section>
              </CardContent>
            </Card>

            <aside className="h-fit rounded-xl border border-slate-200 bg-slate-50 p-5 lg:sticky lg:top-6">
              <h2 className="text-sm font-semibold text-slate-900">Booking summary</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4"><span className="text-slate-500">Event</span><span className="text-right font-medium text-slate-800">{selectedEvent?.title || "Select an event"}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">Ticket</span><span className="text-right font-medium text-slate-800">{selectedTicketType?.name || "Select a ticket"}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">Price × quantity</span><span className="text-right text-slate-700">{selectedTicketType ? `${formatCurrency(selectedTicketType.price)} × ${quantity}` : "—"}</span></div>
                <div className="flex justify-between gap-4 border-t border-slate-200 pt-3"><span className="font-medium text-slate-700">Total collected</span><span className="text-lg font-semibold text-slate-950">{formatCurrency(total)}</span></div>
              </div>

              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3.5">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-indigo-600 focus:ring-indigo-500"
                  checked={paymentConfirmed}
                  onChange={(event) => setPaymentConfirmed(event.target.checked)}
                />
                <span className="text-sm leading-5 text-slate-700">I confirm this payment has been received for the physical ticket sale.</span>
              </label>

              {submitError && <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{submitError}</div>}

              <Button type="submit" className="mt-5 w-full" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                {isSubmitting ? "Recording payment…" : "Mark paid and record sale"}
              </Button>
              <p className="mt-3 text-xs leading-5 text-slate-500">The event price is applied automatically. After saving, hand over the physical tickets from the event stock.</p>
            </aside>
          </div>
        </form>
      )}
    </div>
  );
}
