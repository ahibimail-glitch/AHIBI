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
  Ban,
  MapPin,
  LockKeyhole,
  Sparkles,
  Trophy,
  Crosshair,
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
const BRAND = "GEL Blaster";

function prettyDate(iso: string) {
  try {
    const d = new Date(`${iso}T12:00:00+05:30`);
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return iso;
  }
}

function dateParts(iso: string) {
  try {
    const d = new Date(`${iso}T12:00:00+05:30`);
    return {
      weekday: d.toLocaleDateString("en-IN", { weekday: "short" }),
      day: d.toLocaleDateString("en-IN", { day: "2-digit" }),
      month: d.toLocaleDateString("en-IN", { month: "short" }),
    };
  } catch {
    return { weekday: "", day: iso, month: "" };
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

  useEffect(() => {
    if (!authChecked) return;
    (async () => {
      try {
        const res = await fetch(API("ge-blaster"));
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error(json?.message || `Could not load ${BRAND}.`);
        setConfig(json.data);
      } catch (e: any) {
        setError(e?.message || `Could not load ${BRAND}.`);
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
  const displayTitle = (config?.title || `${BRAND} — Daily Blaster Experience`).replace(
    /GE Blaster/gi,
    BRAND
  );

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
        } catch {
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
        name: BRAND,
        description: `${BRAND} · ${players} players`,
        image: "/ge-blaster/banner.jpg",
        order_id: order.id,
        handler(resp: RazorpayResponse) {
          runAfterRazorpay(() => verifyPayment(resp));
        },
        prefill: { name: form.name, contact: form.phone },
        theme: { color: "#ff0e0e" },
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

  if (loading || !authChecked) {
    return (
      <div className="min-h-screen bg-[#f5f5f5]">
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-[#ff0e0e]" />
            <p className="text-sm font-medium text-gray-500">Loading {BRAND}…</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="min-h-screen bg-[#f5f5f5]">
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center px-4 text-center">
          <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <Crosshair className="mx-auto h-9 w-9 text-[#ff0e0e]" />
            <p className="mt-5 text-xl font-bold text-gray-900">Temporarily unavailable</p>
            <p className="mt-2 text-sm leading-6 text-gray-500">{error}</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f5f5] pb-16 text-gray-900 md:pb-0">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <Navbar />

      {confirmed ? (
        <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="bg-[#ff0e0e] px-6 py-10 text-center text-white sm:px-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/85">Booking confirmed</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Slot secured</h2>
              <p className="mt-3 text-sm text-white/90">Your {BRAND} session is locked in. Gear up.</p>
            </div>
            <div className="px-5 py-6 sm:px-10 sm:py-8">
              {confirmed.qrCode ? (
                <div className="mb-7 flex flex-col items-center">
                  <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={confirmed.qrCode} alt="Check-in QR" className="h-40 w-40 rounded-xl sm:h-44 sm:w-44" />
                  </div>
                  <p className="mt-3 text-xs text-gray-500">Show this QR at the venue for check-in</p>
                </div>
              ) : null}
              <dl className="grid overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 sm:grid-cols-2">
                {[
                  ["Reference", confirmed.reference],
                  ["Date", prettyDate(confirmed.date)],
                  ["Time slot", confirmed.slot],
                  ["Players", String(confirmed.players)],
                  ["Amount paid", `₹${confirmed.total.toLocaleString("en-IN")}`],
                ].map(([k, v]) => (
                  <div key={k} className="border-b border-gray-200 px-5 py-4 last:border-b-0 sm:border-r sm:odd:border-r sm:even:border-r-0">
                    <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">{k}</dt>
                    <dd className="mt-1 text-sm font-bold text-gray-900">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => router.push("/profile")}
                  className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#ff0e0e] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#e00d0d]"
                >
                  View on my dashboard
                </button>
                <button
                  onClick={resetAll}
                  className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                >
                  Book another slot <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <>
          <section className="border-b border-gray-200 bg-white">
            <div className="relative mx-auto w-full max-w-7xl">
              <div className="relative aspect-[16/9] w-full overflow-hidden sm:aspect-[21/9]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={config!.banner}
                  alt={displayTitle}
                  className="h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 px-4 pb-6 sm:px-6 lg:px-8 lg:pb-10">
                  <div className="max-w-3xl text-white">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/85">
                      Daily tactical experience
                    </p>
                    <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                      GEL BLASTER
                    </h1>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-white/90 sm:text-base">
                      Your squad. Your arena. One private 40-minute gel blaster session for precision,
                      movement and bragging rights.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px border-t border-gray-200 bg-gray-200 sm:grid-cols-4">
              {[
                { Icon: Clock, label: "40 min", meta: "Private session" },
                { Icon: Users, label: "2–6", meta: "Players" },
                { Icon: ShieldCheck, label: `₹${pricePerPlayer}`, meta: "Per player" },
                { Icon: Target, label: "Daily", meta: "Open slots" },
              ].map(({ Icon, label, meta }) => (
                <div key={meta} className="bg-white px-4 py-4 sm:px-5">
                  <Icon className="h-4 w-4 text-[#ff0e0e]" />
                  <p className="mt-2 text-lg font-bold text-gray-900">{label}</p>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{meta}</p>
                </div>
              ))}
            </div>
          </section>

          <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
            <div className="mb-6 flex items-end justify-between gap-4 lg:mb-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff0e0e]">Book your slot</p>
                <h2 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">Reserve the arena</h2>
              </div>
              <div className="hidden items-center gap-2 text-xs font-semibold text-gray-400 sm:flex">
                <LockKeyhole className="h-4 w-4 text-[#ff0e0e]" /> Secure checkout
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)] lg:gap-8">
              <form onSubmit={handleBook} className="min-w-0">
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff0e0e] text-sm font-bold text-white">
                        01
                      </span>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Session details</p>
                        <p className="text-xs text-gray-500">Date, time and squad size</p>
                      </div>
                    </div>
                    <Crosshair className="h-5 w-5 text-gray-300" />
                  </div>

                  <div className="p-4 sm:p-6">
                    <div>
                      <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-700">
                        <CalendarDays className="h-4 w-4 text-[#ff0e0e]" /> Select a date
                      </p>
                      {upcomingDates.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-400">
                          No upcoming dates are open right now.
                        </p>
                      ) : (
                        <div className="-mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          {upcomingDates.map((d) => {
                            const active = selectedDate === d;
                            const parts = dateParts(d);
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => pickDate(d)}
                                className={`min-w-[74px] flex-none snap-start rounded-2xl border px-3 py-3 text-center transition sm:min-w-[82px] ${
                                  active
                                    ? "border-[#ff0e0e] bg-[#ff0e0e] text-white shadow-sm"
                                    : "border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:bg-gray-50"
                                }`}
                                aria-label={prettyDate(d)}
                              >
                                <span className={`block text-[9px] font-bold uppercase tracking-wide ${active ? "text-white/70" : "text-gray-400"}`}>
                                  {parts.weekday}
                                </span>
                                <span className="mt-1 block text-xl font-bold leading-none">{parts.day}</span>
                                <span className={`mt-1 block text-[10px] font-semibold uppercase ${active ? "text-white/75" : "text-gray-500"}`}>
                                  {parts.month}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="mt-6 border-t border-gray-100 pt-6">
                      <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-700">
                        <Clock className="h-4 w-4 text-[#ff0e0e]" /> Choose a 40-minute slot
                      </p>
                      {!selectedDate ? (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center text-xs font-medium text-gray-400">
                          Select a date to reveal available slots
                        </div>
                      ) : slotsLoading ? (
                        <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin text-[#ff0e0e]" /> Checking availability…
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                          {slots.map((s) => {
                            const isSel = selectedSlot === s.id;
                            const booked = s.status !== "available";
                            return (
                              <button
                                key={s.id}
                                type="button"
                                disabled={booked}
                                onClick={() => setSelectedSlot(s.id)}
                                className={`relative min-h-[76px] overflow-hidden rounded-xl border px-3 py-3 text-left transition ${
                                  booked
                                    ? "cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300"
                                    : isSel
                                    ? "border-[#ff0e0e] bg-red-50 text-gray-900"
                                    : "border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                <span className="block text-sm font-semibold">{s.name}</span>
                                <span
                                  className={`mt-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide ${
                                    booked ? "text-rose-400" : isSel ? "text-[#ff0e0e]" : "text-emerald-600"
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

                    <div className="mt-6 border-t border-gray-100 pt-6">
                      <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-700">
                        <Users className="h-4 w-4 text-[#ff0e0e]" /> Build your squad
                      </p>
                      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:px-4">
                        <div className="flex items-center gap-2 sm:gap-4">
                          <button
                            type="button"
                            onClick={() => setPlayers((p) => Math.max(config!.minPlayers, p - 1))}
                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-800 transition hover:bg-gray-100 disabled:opacity-30"
                            disabled={players <= config!.minPlayers}
                            aria-label="Fewer players"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center text-2xl font-bold text-gray-900">{players}</span>
                          <button
                            type="button"
                            onClick={() => setPlayers((p) => Math.min(config!.maxPlayers, p + 1))}
                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-800 transition hover:bg-gray-100 disabled:opacity-30"
                            disabled={players >= config!.maxPlayers}
                            aria-label="More players"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-right">
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-gray-400">
                            {players} × ₹{pricePerPlayer}
                          </span>
                          <span className="text-xl font-bold text-[#ff0e0e]">
                            ₹{total.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] leading-5 text-gray-400">
                        Minimum {config!.minPlayers}, maximum {config!.maxPlayers} players. The whole 40-minute slot
                        is reserved for your group.
                      </p>
                    </div>

                    <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={needSpecialBullets}
                          onChange={(e) => setNeedSpecialBullets(e.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-[#ff0e0e]"
                        />
                        <span className="text-sm text-gray-700">
                          <span className="font-semibold text-gray-900">We need special bullets</span>
                          <span className="mt-1 block text-xs leading-5 text-gray-500">
                            Special bullets are arranged directly with the operator. Contact{" "}
                            <a
                              href={`tel:${config!.specialBulletsContact.replace(/\s/g, "")}`}
                              className="font-bold text-[#ff0e0e] underline underline-offset-2"
                            >
                              {config!.specialBulletsContact}
                            </a>{" "}
                            or{" "}
                            <a
                              href={`https://wa.me/${config!.specialBulletsContact.replace(/[^\d]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-[#ff0e0e] underline underline-offset-2"
                            >
                              WhatsApp
                            </a>
                            .
                          </span>
                        </span>
                      </label>
                    </div>

                    <div className="mt-7 border-t border-gray-100 pt-6">
                      <div className="mb-4 flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-xs font-bold text-[#ff0e0e]">
                          02
                        </span>
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-700">Player details</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-gray-500">
                            Primary name
                          </span>
                          <div className="relative">
                            <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                              value={form.name}
                              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                              placeholder="Full name"
                              className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#ff0e0e] focus:ring-2 focus:ring-[#ff0e0e]/15"
                              required
                            />
                          </div>
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-gray-500">
                            Mobile number
                          </span>
                          <div className="relative">
                            <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                              value={form.phone}
                              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                              placeholder="10-digit number"
                              type="tel"
                              inputMode="numeric"
                              className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#ff0e0e] focus:ring-2 focus:ring-[#ff0e0e]/15"
                              required
                            />
                          </div>
                        </label>
                      </div>
                    </div>

                    <label className="mt-5 flex items-start gap-3 rounded-xl bg-gray-50 p-3">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="mt-0.5 h-4 w-4 flex-none accent-[#ff0e0e]"
                      />
                      <span className="text-[11px] leading-5 text-gray-500">
                        I agree to the {BRAND} safety rules, operator eligibility requirements and venue
                        instructions. I confirm the details provided are accurate.
                      </span>
                    </label>

                    {error ? (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                        {error}
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="group mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#ff0e0e] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#e00d0d] disabled:cursor-not-allowed disabled:bg-red-300"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Processing…
                        </>
                      ) : (
                        <>
                          Pay ₹{total.toLocaleString("en-IN")} &amp; Reserve Slot
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </button>
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-medium text-gray-400">
                      <LockKeyhole className="h-3 w-3" /> Secure payment powered by Razorpay
                    </p>
                  </div>
                </div>
              </form>

              <aside className="min-w-0 space-y-5 lg:sticky lg:top-6">
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between px-5 pb-3 pt-5 sm:px-6">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff0e0e]">Gallery</p>
                      <h3 className="mt-1 text-lg font-bold text-gray-900">Inside the arena</h3>
                    </div>
                    <Sparkles className="h-5 w-5 text-gray-300" />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 px-1.5 pb-1.5">
                    {config!.gallery.slice(0, 6).map((g, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={g.url}
                        alt={g.caption || BRAND}
                        loading="lazy"
                        className={`w-full object-cover ${i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-square"}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm shadow-sm sm:p-6">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-[#ff0e0e]" />
                    <h3 className="text-xs font-bold uppercase tracking-wide text-gray-900">Your game plan</h3>
                  </div>
                  <ol className="mt-5 space-y-4">
                    {[
                      "Pick a date and an open 40-minute slot.",
                      "Choose your group size (2–6 players).",
                      "Pay securely — the slot is then yours alone.",
                      "Get a QR confirmation and check in at the venue.",
                    ].map((t, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-red-50 text-[10px] font-bold text-[#ff0e0e]">
                          0{i + 1}
                        </span>
                        <span className="pt-1 text-xs leading-5 text-gray-500">{t}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <ShieldCheck className="h-5 w-5 text-[#ff0e0e]" />
                    <p className="mt-3 text-sm font-bold text-gray-900">Safety first</p>
                    <p className="mt-1 text-[11px] leading-4 text-gray-500">
                      Protective gear and operator guidance included.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <MapPin className="h-5 w-5 text-[#ff0e0e]" />
                    <p className="mt-3 text-sm font-bold text-gray-900">Private arena</p>
                    <p className="mt-1 text-[11px] leading-4 text-gray-500">
                      Your selected slot belongs only to your squad.
                    </p>
                  </div>
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
