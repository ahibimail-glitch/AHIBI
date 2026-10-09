"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CalendarDays,
  Clock,
  Users,
  Minus,
  Plus,
  CheckCircle2,
  Check,
  ArrowRight,
  Phone,
  User as UserIcon,
  ShieldCheck,
  Target,
  Zap,
  Ban,
} from "lucide-react";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";
import { runAfterRazorpay, setRazorpayCheckoutActive } from "@/lib/razorpayUi";

type Slot = { id: string; name: string; price: number; status?: "available" | "booked" | "closed" };
type GalleryItem = { url: string; caption?: string };

type Config = {
  eventId: string;
  title: string;
  description: string;
  banner: string;
  gallery: GalleryItem[];
  pricePerPlayer: number;
  minPlayers: number;
  maxPlayers: number;
  startTime: string;
  specialBulletsContact: string;
  slots: Slot[];
  activeDates: string[];
  excludedDates: string[];
};

type Confirmed = {
  reference: string;
  date: string;
  slot: string;
  players: number;
  total: number;
  qrCode?: string;
};

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

const API = (path: string) => `/api/${path.replace(/^\/+/, "")}`;

function prettyDate(iso: string) {
  try {
    const d = new Date(`${iso}T12:00:00+05:30`);
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return iso;
  }
}

export default function GeBlasterPage() {
  const router = useRouter();

  const [config, setConfig] = useState<Config | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [players, setPlayers] = useState(2);

  const [form, setForm] = useState({ name: "", phone: "" });
  const [needSpecialBullets, setNeedSpecialBullets] = useState(false);
  const [consent, setConsent] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);

  // Auth gate
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace(`/auth?redirect=${encodeURIComponent("/ge-blaster")}`);
      return;
    }
    setAuthChecked(true);
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        setForm((p) => ({ name: p.name || u?.name || "", phone: p.phone || u?.phone || "" }));
      }
    } catch {
      /* ignore */
    }
  }, [router]);

  // Load config
  useEffect(() => {
    if (!authChecked) return;
    (async () => {
      try {
        const res = await fetch(API("ge-blaster"));
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error(json?.message || "Could not load GE Blaster.");
        setConfig(json.data);
      } catch (e: any) {
        setError(e?.message || "Could not load GE Blaster.");
      } finally {
        setLoading(false);
      }
    })();
  }, [authChecked]);

  const upcomingDates = useMemo(() => {
    if (!config) return [];
    const today = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
    return config.activeDates.filter((d) => d >= today).slice(0, 21);
  }, [config]);

  const pricePerPlayer = config?.pricePerPlayer ?? 300;
  const total = players * pricePerPlayer;

  const loadAvailability = async (date: string) => {
    setSlotsLoading(true);
    setSelectedSlot("");
    setError("");
    try {
      const res = await fetch(API(`ge-blaster/availability?date=${encodeURIComponent(date)}`));
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Could not load slots.");
      setSlots(json.data.slots || []);
    } catch (e: any) {
      setError(e?.message || "Could not load slots.");
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const pickDate = (date: string) => {
    setSelectedDate(date);
    loadAvailability(date);
  };

  const handleBook = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedDate) return setError("Please select a date.");
    if (!selectedSlot) return setError("Please select an available time slot.");
    if (players < (config?.minPlayers ?? 2) || players > (config?.maxPlayers ?? 6))
      return setError(`Group size must be ${config?.minPlayers ?? 2}–${config?.maxPlayers ?? 6} players.`);
    if (!form.name.trim()) return setError("Please enter the primary customer name.");
    if (form.phone.replace(/\D/g, "").length < 10) return setError("Please enter a valid phone number.");
    if (!consent) return setError("Please accept the safety rules to continue.");

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.push(`/auth?redirect=${encodeURIComponent("/ge-blaster")}`);
      return;
    }

    setSubmitting(true);
    try {
      const initRes = await fetch(API("ge-blaster/initiate"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          date: selectedDate,
          slotId: selectedSlot,
          players,
          customerName: form.name.trim(),
          customerPhone: form.phone.trim(),
          needSpecialBullets,
        }),
      });
      const initJson = await initRes.json();
      if (!initRes.ok || !initJson?.success) {
        if (initRes.status === 409) loadAvailability(selectedDate);
        throw new Error(initJson?.message || "Could not start the booking.");
      }

      const { order, bookingId } = initJson;

      const verifyPayment = async (resp: RazorpayResponse) => {
        try {
          const vRes = await fetch(API("ge-blaster/verify"), {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_signature: resp.razorpay_signature,
              bookingId,
            }),
          });
          const vJson = await vRes.json();
          if (vRes.ok && vJson?.success) {
            setConfirmed(vJson.booking);
            if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
          } else {
            setError(vJson?.message || "Payment verification failed.");
          }
        } catch (err) {
          setError("Something went wrong verifying your payment. Please contact support.");
        } finally {
          setSubmitting(false);
          setRazorpayCheckoutActive(false);
        }
      };

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "GE Blaster",
        description: `${selectedSlot ? "" : ""}GE Blaster · ${players} players`,
        image: "/ge-blaster/banner.jpg",
        order_id: order.id,
        handler(resp: RazorpayResponse) {
          runAfterRazorpay(() => verifyPayment(resp));
        },
        prefill: { name: form.name, contact: form.phone },
        theme: { color: "#2a5bd7" },
        modal: {
          ondismiss() {
            setRazorpayCheckoutActive(false);
            setSubmitting(false);
          },
        },
      };

      setRazorpayCheckoutActive(true);
      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", () => {
        setRazorpayCheckoutActive(false);
        setSubmitting(false);
        setError("Payment failed. Please try again.");
      });
      rzp.open();
    } catch (e: any) {
      setError(e?.message || "Could not start the booking.");
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    setConfirmed(null);
    setSelectedDate("");
    setSlots([]);
    setSelectedSlot("");
    setPlayers(2);
    setNeedSpecialBullets(false);
    setConsent(false);
    setError("");
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading || !authChecked) {
    return (
      <div className="min-h-screen bg-[#0a1628]">
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-6 w-6 animate-spin text-[#4f83ff]" />
            <p className="text-sm text-slate-300">Loading GE Blaster…</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="min-h-screen bg-[#0a1628]">
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center px-4 text-center">
          <div>
            <p className="text-lg font-semibold text-white">GE Blaster is unavailable</p>
            <p className="mt-2 text-sm text-slate-400">{error}</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a1628] text-slate-100">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <Navbar />

      {confirmed ? (
        // ── Confirmation ───────────────────────────────────────────────────────
        <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0e1f3b] shadow-2xl">
            <div className="bg-gradient-to-br from-[#2a5bd7] to-[#17307a] px-8 py-10 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Booking Confirmed
              </h2>
              <p className="mt-2 text-sm text-white/85">Your GE Blaster slot is locked in. Game on!</p>
            </div>
            <div className="px-6 py-6 sm:px-8">
              {confirmed.qrCode ? (
                <div className="mb-6 flex flex-col items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={confirmed.qrCode} alt="Check-in QR" className="h-44 w-44 rounded-xl bg-white p-2" />
                  <p className="mt-2 text-xs text-slate-400">Show this QR at the venue for check-in</p>
                </div>
              ) : null}
              <dl className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
                {[
                  ["Reference", confirmed.reference],
                  ["Date", prettyDate(confirmed.date)],
                  ["Time slot", confirmed.slot],
                  ["Players", String(confirmed.players)],
                  ["Amount paid", `₹${confirmed.total.toLocaleString("en-IN")}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-5 py-3.5">
                    <dt className="text-sm text-slate-400">{k}</dt>
                    <dd className="text-right text-sm font-semibold text-white">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => router.push("/profile")}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2a5bd7] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#2450bd]"
                >
                  View on my dashboard
                </button>
                <button
                  onClick={resetAll}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-transparent px-5 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
                >
                  Book another slot <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <>
          {/* ── Hero ─────────────────────────────────────────────────────────── */}
          <section className="relative">
            <div className="relative h-[60vh] min-h-[400px] w-full overflow-hidden sm:h-[46vh] sm:min-h-[340px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={config!.banner} alt={config!.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/70 to-[#0a1628]/30" />
              <div className="absolute inset-x-0 bottom-0">
                <div className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#6f9bff]">
                    Precision • Power • Performance
                  </p>
                  <h1 className="mt-2 text-[28px] font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
                    GE Blaster
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
                    Book a private 40-minute gel blaster session for your group. Each slot is exclusive to one
                    booking — 2 to 6 players.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      { Icon: Target, label: "Quality Gel · Non-Toxic" },
                      { Icon: Zap, label: "Max Impact" },
                      { Icon: Users, label: "2–6 players / slot" },
                      { Icon: ShieldCheck, label: `₹${pricePerPlayer} per player` },
                    ].map(({ Icon, label }) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur"
                      >
                        <Icon className="h-3.5 w-3.5 text-[#6f9bff]" />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
            <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:gap-8">
              {/* Booking flow */}
              <form onSubmit={handleBook} className="order-1 lg:order-1">
                <div className="rounded-3xl border border-white/10 bg-[#0e1f3b] p-4 sm:p-7">
                  <h2 className="text-lg font-bold text-white">Book your session</h2>

                  {/* Step 1 — Date */}
                  <div className="mt-5">
                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
                      <CalendarDays className="h-4 w-4 text-[#6f9bff]" /> 1. Select a date
                    </p>
                    {upcomingDates.length === 0 ? (
                      <p className="text-sm text-slate-400">No upcoming dates are open right now.</p>
                    ) : (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {upcomingDates.map((d) => {
                          const active = selectedDate === d;
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => pickDate(d)}
                              className={`flex-none rounded-xl border px-3.5 py-2.5 text-center transition ${
                                active
                                  ? "border-[#4f83ff] bg-[#1b3a74] text-white"
                                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25"
                              }`}
                            >
                              <span className="block text-sm font-semibold">{prettyDate(d)}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Step 2 — Slot */}
                  <div className="mt-6">
                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
                      <Clock className="h-4 w-4 text-[#6f9bff]" /> 2. Choose a 40-minute slot
                    </p>
                    {!selectedDate ? (
                      <p className="text-sm text-slate-500">Pick a date first.</p>
                    ) : slotsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" /> Checking availability…
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                        {slots.map((s) => {
                          const isSel = selectedSlot === s.id;
                          const booked = s.status !== "available";
                          return (
                            <button
                              key={s.id}
                              type="button"
                              disabled={booked}
                              onClick={() => setSelectedSlot(s.id)}
                              className={`rounded-xl border px-3 py-3 text-left transition ${
                                booked
                                  ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-slate-600"
                                  : isSel
                                  ? "border-[#4f83ff] bg-[#1b3a74] text-white"
                                  : "border-white/10 bg-white/5 text-slate-200 hover:border-white/25"
                              }`}
                            >
                              <span className="block text-sm font-semibold">{s.name}</span>
                              <span
                                className={`mt-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide ${
                                  booked ? "text-rose-400/80" : "text-emerald-400"
                                }`}
                              >
                                {booked ? (
                                  <>
                                    <Ban className="h-3 w-3" /> {s.status === "closed" ? "Closed" : "Booked"}
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-3 w-3" /> Available
                                  </>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Step 3 — Players */}
                  <div className="mt-6">
                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
                      <Users className="h-4 w-4 text-[#6f9bff]" /> 3. Number of players
                    </p>
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => setPlayers((p) => Math.max(config!.minPlayers, p - 1))}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40"
                          disabled={players <= config!.minPlayers}
                          aria-label="Fewer players"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center text-xl font-bold text-white">{players}</span>
                        <button
                          type="button"
                          onClick={() => setPlayers((p) => Math.min(config!.maxPlayers, p + 1))}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40"
                          disabled={players >= config!.maxPlayers}
                          aria-label="More players"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-right">
                        <span className="block text-xs text-slate-400">
                          {players} × ₹{pricePerPlayer}
                        </span>
                        <span className="text-lg font-extrabold text-white">
                          ₹{total.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      Minimum {config!.minPlayers}, maximum {config!.maxPlayers} players. The whole 40-minute slot
                      is reserved for your group.
                    </p>
                  </div>

                  {/* Special bullets box */}
                  <div className="mt-6 rounded-xl border border-[#4f83ff]/30 bg-[#4f83ff]/10 p-4">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={needSpecialBullets}
                        onChange={(e) => setNeedSpecialBullets(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[#4f83ff]"
                      />
                      <span className="text-sm text-slate-200">
                        <span className="font-semibold text-white">We need special bullets</span>
                        <span className="mt-1 block text-xs text-slate-300">
                          Special bullets are arranged directly with the operator. Contact{" "}
                          <a
                            href={`tel:${config!.specialBulletsContact.replace(/\s/g, "")}`}
                            className="font-semibold text-[#6f9bff] underline"
                          >
                            {config!.specialBulletsContact}
                          </a>{" "}
                          or{" "}
                          <a
                            href={`https://wa.me/${config!.specialBulletsContact.replace(/[^\d]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-[#6f9bff] underline"
                          >
                            WhatsApp
                          </a>
                          .
                        </span>
                      </span>
                    </label>
                  </div>

                  {/* Details */}
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-slate-200">Primary name</span>
                      <div className="relative">
                        <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                          value={form.name}
                          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                          placeholder="Full name"
                          className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#4f83ff]"
                          required
                        />
                      </div>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-slate-200">Mobile number</span>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                          value={form.phone}
                          onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                          placeholder="10-digit number"
                          type="tel"
                          inputMode="numeric"
                          className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#4f83ff]"
                          required
                        />
                      </div>
                    </label>
                  </div>

                  {/* Consent */}
                  <label className="mt-4 flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[#4f83ff]"
                    />
                    <span className="text-xs text-slate-300">
                      I agree to the GE Blaster safety rules, operator eligibility requirements and venue
                      instructions. I confirm the details provided are accurate.
                    </span>
                  </label>

                  {error ? (
                    <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                      {error}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2a5bd7] px-5 py-4 text-sm font-bold text-white shadow-lg shadow-[#2a5bd7]/25 transition hover:bg-[#2450bd] disabled:cursor-not-allowed disabled:bg-[#2a5bd7]/50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Processing…
                      </>
                    ) : (
                      <>
                        Pay ₹{total.toLocaleString("en-IN")} &amp; Reserve Slot
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Gallery + info */}
              <aside className="order-2 space-y-6 lg:order-2">
                <div className="rounded-3xl border border-white/10 bg-[#0e1f3b] p-6">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[#6f9bff]">The Arena</h3>
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    {config!.gallery.slice(0, 6).map((g, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={g.url}
                        alt={g.caption || "GE Blaster"}
                        loading="lazy"
                        className="aspect-square w-full rounded-xl object-cover"
                      />
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-[#0e1f3b] p-6 text-sm text-slate-300">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[#6f9bff]">How it works</h3>
                  <ol className="mt-3 space-y-2">
                    {[
                      "Pick a date and an open 40-minute slot.",
                      "Choose your group size (2–6 players).",
                      "Pay securely — the slot is then yours alone.",
                      "Get a QR confirmation and check in at the venue.",
                    ].map((t, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[#2a5bd7] text-[11px] font-bold text-white">
                          {i + 1}
                        </span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </aside>
            </div>
          </main>
        </>
      )}

      <Footer />
    </div>
  );
}
