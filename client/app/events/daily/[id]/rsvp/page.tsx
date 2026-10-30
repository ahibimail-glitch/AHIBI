"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";

interface DailyEvent {
  _id: string;
  title: string;
  banner: string;
  bookingType?: "ticketed" | "rsvp" | "call_to_book";
  activeDates: string[];
  location?: { city?: string; address?: string };
}

interface DateOption {
  value: string;
  label: string;
}

interface DailyEventRsvpPageProps {
  params: { id: string };
}

function isRsvpBookingType(bookingType?: DailyEvent["bookingType"]) {
  return bookingType === "rsvp" || bookingType === "call_to_book";
}

function getDateOptions(activeDates: string[] = []): DateOption[] {
  const uniqueDates = new Set<string>();

  return activeDates.flatMap((activeDate) => {
    const parsedDate = new Date(activeDate);
    if (Number.isNaN(parsedDate.getTime())) return [];

    const value = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(parsedDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || uniqueDates.has(value)) return [];
    uniqueDates.add(value);

    return [{
      value,
      label: new Intl.DateTimeFormat("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }).format(parsedDate),
    }];
  });
}

export default function DailyEventRsvpPage({ params }: DailyEventRsvpPageProps) {
  const router = useRouter();
  const [event, setEvent] = useState<DailyEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    partySize: "1",
    requestedDate: "",
    address: "",
  });

  const dateOptions = useMemo(() => getDateOptions(event?.activeDates), [event?.activeDates]);

  useEffect(() => {
    let active = true;

    const fetchEvent = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/daily-events/${encodeURIComponent(params.id)}`, {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "This daily event is not available.");
        if (!isRsvpBookingType(data.bookingType)) {
          router.replace(`/events/daily/${params.id}`);
          return;
        }
        if (active) setEvent(data);
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : "Unable to load this event.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchEvent();
    return () => { active = false; };
  }, [params.id, router]);

  useEffect(() => {
    if (dateOptions.length > 0) {
      setForm((current) => current.requestedDate ? current : { ...current, requestedDate: dateOptions[0].value });
    }
  }, [dateOptions]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    if (!event || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/daily-events/${encodeURIComponent(params.id)}/rsvps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          partySize: Number(form.partySize),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to send your RSVP request. Please try again.");
      }
      setForm({ name: "", email: "", phone: "", partySize: "1", requestedDate: "", address: "" });
      setIsSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to send your RSVP request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pt-10 pb-28 sm:px-6 sm:pb-14 lg:pt-14">
        <Link
          href={`/events/daily/${params.id}`}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to event
        </Link>

        {isLoading ? (
          <div className="flex min-h-72 items-center justify-center rounded-2xl bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" aria-label="Loading event" />
          </div>
        ) : loadError ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-white p-8 text-center text-red-700">
            {loadError}
          </div>
        ) : isSubmitted ? (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-10">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
            <h1 className="mt-4 text-2xl font-bold text-gray-900">RSVP request sent</h1>
            <p className="mx-auto mt-3 max-w-xl text-gray-600">
              Your request for <span className="font-semibold text-gray-900">{event?.title}</span> is not booked yet. The organizer will call you using the phone number you provided and confirm with you.
            </p>
            <Link href={`/events/daily/${params.id}`} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800">
              Return to event
            </Link>
          </section>
        ) : event ? (
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-6 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-red-600">RSVP request</p>
              <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">Request to book</h1>
              <p className="mt-2 text-gray-600">{event.title}</p>
              {event.location?.city && <p className="mt-1 text-sm text-gray-500">{event.location.city}</p>}
              <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                This is a request, not a confirmed booking. The organizer will call you to discuss availability and confirm if you both agree.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6 sm:p-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-medium text-gray-900">
                  Full name <span className="text-red-600">*</span>
                  <input
                    required
                    autoComplete="name"
                    maxLength={120}
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    className="mt-2 min-h-11 w-full rounded-lg border border-gray-300 px-3 text-base outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />
                </label>
                <label className="block text-sm font-medium text-gray-900">
                  Email address <span className="text-red-600">*</span>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    className="mt-2 min-h-11 w-full rounded-lg border border-gray-300 px-3 text-base outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />
                </label>
                <label className="block text-sm font-medium text-gray-900">
                  Phone number <span className="text-red-600">*</span>
                  <input
                    required
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength={30}
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    className="mt-2 min-h-11 w-full rounded-lg border border-gray-300 px-3 text-base outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />
                </label>
                <label className="block text-sm font-medium text-gray-900">
                  Number of people <span className="text-red-600">*</span>
                  <input
                    required
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    value={form.partySize}
                    onChange={(event) => updateField("partySize", event.target.value)}
                    className="mt-2 min-h-11 w-full rounded-lg border border-gray-300 px-3 text-base outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-gray-900">
                Requested event date <span className="text-red-600">*</span>
                <span className="relative mt-2 block">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <select
                    required
                    value={form.requestedDate}
                    onChange={(event) => updateField("requestedDate", event.target.value)}
                    className="min-h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-base outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  >
                    {dateOptions.map((date) => <option key={date.value} value={date.value}>{date.label}</option>)}
                  </select>
                </span>
              </label>

              <label className="block text-sm font-medium text-gray-900">
                Address <span className="text-red-600">*</span>
                <textarea
                  required
                  autoComplete="street-address"
                  maxLength={250}
                  rows={3}
                  value={form.address}
                  onChange={(event) => updateField("address", event.target.value)}
                  className="mt-2 w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </label>

              <p className="text-sm leading-6 text-gray-500">
                Your details will be shared with this event&apos;s organizer so they can follow up on your request.
              </p>
              {submitError && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</p>}

              <button
                type="submit"
                disabled={isSubmitting || dateOptions.length === 0}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? "Sending request…" : "Send RSVP request"}
              </button>
              {dateOptions.length === 0 && <p role="alert" className="text-sm text-red-700">No event dates are currently available for RSVP.</p>}
            </form>
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
