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
      <div className="min-h-screen bg-[#07090d]">
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-[#c7ff3d]/25 bg-[#c7ff3d]/5">
              <Loader2 className="h-6 w-6 animate-spin text-[#c7ff3d]" />
              <span className="absolute inset-2 rounded-full border border-dashed border-white/10" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/55">Loading the arena</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="min-h-screen bg-[#07090d]">
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center px-4 text-center">
          <div className="max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
            <Crosshair className="mx-auto h-9 w-9 text-[#c7ff3d]" />
            <p className="mt-5 text-xl font-black uppercase tracking-tight text-white">Arena temporarily unavailable</p>
            <p className="mt-2 text-sm leading-6 text-white/50">{error}</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#07090d] pb-16 text-white selection:bg-[#c7ff3d] selection:text-black md:pb-0">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <Navbar />

      {confirmed ? (
        // ── Confirmation ───────────────────────────────────────────────────────
        <main className="relative mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_center,rgba(199,255,61,0.12),transparent_65%)]" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#101319] shadow-2xl shadow-black/50">
            <div className="relative overflow-hidden border-b border-white/10 bg-[#111821] px-6 py-10 text-center sm:px-10 sm:py-12">
              <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:32px_32px]" />
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#c7ff3d]/40 bg-[#c7ff3d]/10 shadow-[0_0_50px_rgba(199,255,61,0.18)]">
                <CheckCircle2 className="h-10 w-10 text-[#c7ff3d]" />
              </div>
              <p className="relative mt-6 text-[10px] font-black uppercase tracking-[0.32em] text-[#c7ff3d]">Mission accepted</p>
              <h2 className="relative mt-2 text-3xl font-black uppercase tracking-[-0.04em] text-white sm:text-5xl">
                Slot secured
              </h2>
              <p className="relative mt-3 text-sm text-white/55">Your GE Blaster session is locked in. Gear up.</p>
            </div>
            <div className="px-5 py-6 sm:px-10 sm:py-8">
              {confirmed.qrCode ? (
                <div className="mb-7 flex flex-col items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <div className="rounded-2xl border border-white/10 bg-white p-2 shadow-xl shadow-black/20">
                    <img src={confirmed.qrCode} alt="Check-in QR" className="h-40 w-40 rounded-xl sm:h-44 sm:w-44" />
                  </div>
                  <p className="mt-3 text-xs text-white/45">Show this QR at the venue for check-in</p>
                </div>
              ) : null}
              <dl className="grid overflow-hidden rounded-2xl border border-white/10 bg-black/20 sm:grid-cols-2">
                {[
                  ["Reference", confirmed.reference],
                  ["Date", prettyDate(confirmed.date)],
                  ["Time slot", confirmed.slot],
                  ["Players", String(confirmed.players)],
                  ["Amount paid", `₹${confirmed.total.toLocaleString("en-IN")}`],
                ].map(([k, v]) => (
                  <div key={k} className="border-b border-white/10 px-5 py-4 last:border-b-0 sm:border-r sm:last:border-r-0">
                    <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">{k}</dt>
                    <dd className="mt-1 text-sm font-bold text-white">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => router.push("/profile")}
                  className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#c7ff3d] px-5 py-3.5 text-sm font-black text-[#0a0c0f] transition hover:bg-[#d8ff79]"
                >
                  View on my dashboard
                </button>
                <button
                  onClick={resetAll}
                  className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-5 py-3.5 text-sm font-bold text-white/80 transition hover:bg-white/[0.07]"
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
          <section className="relative border-b border-white/10">
            <div className="relative h-[610px] w-full overflow-hidden sm:h-[620px] lg:h-[670px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={config!.banner} alt={config!.title} className="h-full w-full object-cover object-center sm:object-[center_48%]" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,10,.96)_0%,rgba(5,7,10,.72)_44%,rgba(5,7,10,.12)_100%)]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07090d] via-transparent to-black/45" />
              <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:54px_54px] [mask-image:linear-gradient(to_right,black,transparent_70%)]" />

              <div className="absolute inset-0">
                <div className="mx-auto flex h-full w-full max-w-7xl flex-col justify-end px-4 pb-10 pt-10 sm:px-6 sm:pb-12 lg:px-8 lg:pb-16">
                  <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/75 backdrop-blur-md">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-[#c7ff3d] shadow-[0_0_12px_#c7ff3d]" />
                      Daily tactical experience
                    </div>
                    <h1 className="mt-5 text-[3.45rem] font-black uppercase leading-[0.82] tracking-[-0.075em] text-white sm:text-7xl lg:text-[7rem]">
                      GE <span className="block text-[#c7ff3d]">Blaster</span>
                    </h1>
                    <p className="mt-6 max-w-xl text-sm font-medium leading-6 text-white/70 sm:text-base sm:leading-7">
                      Your squad. Your arena. One private 40-minute gel blaster session built for precision,
                      movement and serious bragging rights.
                    </p>
                  </div>

                  <div className="mt-8 grid max-w-3xl grid-cols-2 overflow-hidden rounded-2xl border border-white/15 bg-black/35 backdrop-blur-xl sm:grid-cols-4">
                    {[
                      { Icon: Clock, label: "40 min", meta: "Private session" },
                      { Icon: Users, label: "2–6", meta: "Players" },
                      { Icon: ShieldCheck, label: `₹${pricePerPlayer}`, meta: "Per player" },
                      { Icon: Target, label: "Daily", meta: "Open slots" },
                    ].map(({ Icon, label, meta }) => (
                      <div key={meta} className="border-b border-r border-white/10 p-3.5 last:border-r-0 sm:border-b-0 sm:p-4">
                        <Icon className="h-4 w-4 text-[#c7ff3d]" />
                        <p className="mt-2 text-base font-black leading-none text-white sm:text-lg">{label}</p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">{meta}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <main className="relative">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[700px] bg-[radial-gradient(circle_at_75%_0%,rgba(54,92,245,.12),transparent_50%)]" />
            <div className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
              <div className="mb-7 flex items-end justify-between gap-5 lg:mb-10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#c7ff3d]">Choose your mission</p>
                  <h2 className="mt-2 text-[1.75rem] font-black uppercase tracking-[-0.045em] text-white sm:text-5xl">Reserve the arena</h2>
                </div>
                <div className="hidden items-center gap-2 text-xs font-bold text-white/40 sm:flex">
                  <LockKeyhole className="h-4 w-4 text-[#c7ff3d]" /> Secure checkout
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-7 lg:grid-cols-[minmax(0,1.18fr)_minmax(330px,.82fr)] lg:gap-10">
              {/* Booking flow */}
              <form onSubmit={handleBook} className="order-1 min-w-0 lg:order-1">
                <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#101319] shadow-2xl shadow-black/20">
                  <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.025] px-5 py-4 sm:px-7">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#c7ff3d] text-sm font-black text-black">01</span>
                      <div>
                        <p className="text-sm font-black uppercase tracking-wide text-white">Session details</p>
                        <p className="text-xs text-white/35">Date, time and squad size</p>
                      </div>
                    </div>
                    <Crosshair className="h-5 w-5 text-white/20" />
                  </div>

                  <div className="p-4 sm:p-7">

                  {/* Step 1 — Date */}
                  <div>
                    <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.13em] text-white/70">
                      <CalendarDays className="h-4 w-4 text-[#c7ff3d]" /> Select a date
                    </p>
                    {upcomingDates.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/40">No upcoming dates are open right now.</p>
                    ) : (
                      <div className="-mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                                  ? "border-[#c7ff3d] bg-[#c7ff3d] text-[#080a0d] shadow-[0_10px_30px_rgba(199,255,61,.12)]"
                                  : "border-white/10 bg-white/[0.035] text-white hover:border-white/25 hover:bg-white/[0.06]"
                              }`}
                              aria-label={prettyDate(d)}
                            >
                              <span className={`block text-[9px] font-black uppercase tracking-[0.16em] ${active ? "text-black/50" : "text-white/35"}`}>{parts.weekday}</span>
                              <span className="mt-1 block text-xl font-black leading-none">{parts.day}</span>
                              <span className={`mt-1 block text-[10px] font-bold uppercase ${active ? "text-black/55" : "text-white/45"}`}>{parts.month}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Step 2 — Slot */}
                  <div className="mt-6 border-t border-white/10 pt-6">
                    <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.13em] text-white/70">
                      <Clock className="h-4 w-4 text-[#c7ff3d]" /> Choose a 40-minute slot
                    </p>
                    {!selectedDate ? (
                      <div className="rounded-xl border border-dashed border-white/10 bg-black/10 px-4 py-5 text-center text-xs font-medium text-white/30">Select a date to reveal available slots</div>
                    ) : slotsLoading ? (
                      <div className="flex items-center gap-2 py-4 text-sm text-white/40">
                        <Loader2 className="h-4 w-4 animate-spin" /> Checking availability…
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
                                  ? "cursor-not-allowed border-white/5 bg-white/[0.015] text-white/20"
                                  : isSel
                                  ? "border-[#c7ff3d] bg-[#c7ff3d]/10 text-white"
                                  : "border-white/10 bg-white/[0.035] text-white hover:border-white/25 hover:bg-white/[0.06]"
                              }`}
                            >
                              <span className="block text-sm font-semibold">{s.name}</span>
                              <span
                                className={`mt-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide ${
                                  booked ? "text-rose-400/70" : isSel ? "text-[#c7ff3d]" : "text-emerald-400"
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
                  <div className="mt-6 border-t border-white/10 pt-6">
                    <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.13em] text-white/70">
                      <Users className="h-4 w-4 text-[#c7ff3d]" /> Build your squad
                    </p>
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-3 sm:px-4 sm:py-3">
                      <div className="flex items-center gap-2 sm:gap-4">
                        <button
                          type="button"
                          onClick={() => setPlayers((p) => Math.max(config!.minPlayers, p - 1))}
                          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white transition hover:bg-white/10 disabled:opacity-30"
                          disabled={players <= config!.minPlayers}
                          aria-label="Fewer players"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center text-2xl font-black text-white">{players}</span>
                        <button
                          type="button"
                          onClick={() => setPlayers((p) => Math.min(config!.maxPlayers, p + 1))}
                          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white transition hover:bg-white/10 disabled:opacity-30"
                          disabled={players >= config!.maxPlayers}
                          aria-label="More players"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-white/35">
                          {players} × ₹{pricePerPlayer}
                        </span>
                        <span className="text-xl font-black text-[#c7ff3d]">
                          ₹{total.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-white/35">
                      Minimum {config!.minPlayers}, maximum {config!.maxPlayers} players. The whole 40-minute slot
                      is reserved for your group.
                    </p>
                  </div>

                  {/* Special bullets box */}
                  <div className="mt-6 rounded-2xl border border-[#365cf5]/25 bg-[#365cf5]/10 p-4">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={needSpecialBullets}
                        onChange={(e) => setNeedSpecialBullets(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[#c7ff3d]"
                      />
                      <span className="text-sm text-white/75">
                        <span className="font-semibold text-white">We need special bullets</span>
                        <span className="mt-1 block text-xs leading-5 text-white/45">
                          Special bullets are arranged directly with the operator. Contact{" "}
                          <a
                            href={`tel:${config!.specialBulletsContact.replace(/\s/g, "")}`}
                            className="font-bold text-[#8fa8ff] underline decoration-white/20 underline-offset-2"
                          >
                            {config!.specialBulletsContact}
                          </a>{" "}
                          or{" "}
                          <a
                            href={`https://wa.me/${config!.specialBulletsContact.replace(/[^\d]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-[#8fa8ff] underline decoration-white/20 underline-offset-2"
                          >
                            WhatsApp
                          </a>
                          .
                        </span>
                      </span>
                    </label>
                  </div>

                  {/* Details */}
                  <div className="mt-7 border-t border-white/10 pt-6">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-xs font-black text-[#c7ff3d]">02</span>
                      <p className="text-xs font-black uppercase tracking-[0.13em] text-white/70">Player details</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-white/45">Primary name</span>
                      <div className="relative">
                        <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                        <input
                          value={form.name}
                          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                          placeholder="Full name"
                          className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#c7ff3d]/70 focus:ring-2 focus:ring-[#c7ff3d]/10"
                          required
                        />
                      </div>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-white/45">Mobile number</span>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                        <input
                          value={form.phone}
                          onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                          placeholder="10-digit number"
                          type="tel"
                          inputMode="numeric"
                          className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#c7ff3d]/70 focus:ring-2 focus:ring-[#c7ff3d]/10"
                          required
                        />
                      </div>
                    </label>
                    </div>
                  </div>

                  {/* Consent */}
                  <label className="mt-5 flex items-start gap-3 rounded-xl bg-white/[0.025] p-3">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 flex-none accent-[#c7ff3d]"
                    />
                    <span className="text-[11px] leading-5 text-white/45">
                      I agree to the GE Blaster safety rules, operator eligibility requirements and venue
                      instructions. I confirm the details provided are accurate.
                    </span>
                  </label>

                  {error ? (
                    <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200" role="alert">
                      {error}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="group mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#c7ff3d] px-5 py-4 text-sm font-black text-[#080a0d] shadow-[0_16px_45px_rgba(199,255,61,.14)] transition hover:bg-[#d7ff73] disabled:cursor-not-allowed disabled:bg-[#c7ff3d]/40"
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
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-medium text-white/30">
                    <LockKeyhole className="h-3 w-3" /> Secure payment powered by Razorpay
                  </p>
                  </div>
                </div>
              </form>

              {/* Gallery + info */}
              <aside className="order-2 min-w-0 space-y-6 lg:sticky lg:top-6 lg:order-2">
                <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#101319]">
                  <div className="flex items-center justify-between px-5 pb-4 pt-5 sm:px-6">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#c7ff3d]">Field report</p>
                      <h3 className="mt-1 text-xl font-black uppercase tracking-tight text-white">Inside the arena</h3>
                    </div>
                    <Sparkles className="h-5 w-5 text-white/20" />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 px-1.5 pb-1.5">
                    {config!.gallery.slice(0, 6).map((g, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={g.url}
                        alt={g.caption || "GE Blaster"}
                        loading="lazy"
                        className={`w-full object-cover transition duration-500 hover:scale-[1.02] ${i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-square"}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="rounded-[1.75rem] border border-white/10 bg-[#101319] p-5 text-sm sm:p-6">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-[#c7ff3d]" />
                    <h3 className="text-xs font-black uppercase tracking-[0.17em] text-white">Your game plan</h3>
                  </div>
                  <ol className="mt-5 space-y-4">
                    {[
                      "Pick a date and an open 40-minute slot.",
                      "Choose your group size (2–6 players).",
                      "Pay securely — the slot is then yours alone.",
                      "Get a QR confirmation and check in at the venue.",
                    ].map((t, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-[#c7ff3d]/25 bg-[#c7ff3d]/10 text-[10px] font-black text-[#c7ff3d]">0{i + 1}</span>
                        <span className="pt-1 text-xs leading-5 text-white/55">{t}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <ShieldCheck className="h-5 w-5 text-[#c7ff3d]" />
                    <p className="mt-3 text-sm font-black text-white">Safety first</p>
                    <p className="mt-1 text-[11px] leading-4 text-white/40">Protective gear and operator guidance included.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <MapPin className="h-5 w-5 text-[#c7ff3d]" />
                    <p className="mt-3 text-sm font-black text-white">Private arena</p>
                    <p className="mt-1 text-[11px] leading-4 text-white/40">Your selected slot belongs only to your squad.</p>
                  </div>
                </div>
              </aside>
              </div>
            </div>
          </main>
        </>
      )}

      <Footer />
    </div>
  );
}
