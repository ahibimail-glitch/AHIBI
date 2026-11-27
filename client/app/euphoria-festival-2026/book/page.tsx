"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getApiUrl } from "@/config";

interface EuphoriaConfig {
  festivalDays: string[];
  entryPrices: { oneDay: number; twoDay: number; threeDay: number };
  campingNoTentPerNight: number;
  campingTent: { oneNight: number; twoNight: number; threeNight: number };
  campingIncludesEntry: boolean;
  campingCapacity: number;
  campingAvailable: number;
  bookingOpen: boolean;
}

interface IssuedTicket {
  ticketNumber: string;
  type: "entry" | "camping";
  campingType: string | null;
  validDays: string[];
  qrCode: string | null;
}

const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

function toggle(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function EuphoriaBookingPage() {
  const router = useRouter();
  const [config, setConfig] = useState<EuphoriaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entryDays, setEntryDays] = useState<Set<string>>(new Set());
  const [entryPeople, setEntryPeople] = useState(1);

  const [wantCamping, setWantCamping] = useState(false);
  const [campingType, setCampingType] = useState<"tent" | "no-tent">("tent");
  const [campingDays, setCampingDays] = useState<Set<string>>(new Set());
  const [campingPeople, setCampingPeople] = useState(1);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [issued, setIssued] = useState<IssuedTicket[] | null>(null);

  useEffect(() => {
    // prefill from logged-in user if present
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.name) setName(u.name);
        if (u?.email) setEmail(u.email);
        if (u?.phone) setPhone(u.phone);
      }
    } catch {}
    (async () => {
      try {
        const res = await fetch(getApiUrl("euphoria/config"));
        const json = await res.json();
        if (json?.success) setConfig(json.data);
        else setError("Could not load festival details.");
      } catch {
        setError("Could not load festival details.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const entryUnit = useMemo(() => {
    if (!config) return 0;
    const n = entryDays.size;
    if (n === 1) return config.entryPrices.oneDay;
    if (n === 2) return config.entryPrices.twoDay;
    if (n === 3) return config.entryPrices.threeDay;
    return 0;
  }, [config, entryDays]);

  const campingUnit = useMemo(() => {
    if (!config || !wantCamping) return 0;
    const n = campingDays.size;
    if (campingType === "no-tent") return config.campingNoTentPerNight * n;
    if (n === 1) return config.campingTent.oneNight;
    if (n === 2) return config.campingTent.twoNight;
    if (n === 3) return config.campingTent.threeNight;
    return 0;
  }, [config, wantCamping, campingType, campingDays]);

  const entryAmount = entryDays.size > 0 ? entryUnit * entryPeople : 0;
  const campingAmount = wantCamping && campingDays.size > 0 ? campingUnit * campingPeople : 0;
  const total = entryAmount + campingAmount;

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  async function handlePay() {
    setError(null);
    if (!token) {
      router.push(`/auth?redirect=${encodeURIComponent("/euphoria-festival-2026/book")}`);
      return;
    }
    if (!name.trim()) return setError("Please enter a name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Please enter a valid email.");
    if (entryDays.size === 0 && !(wantCamping && campingDays.size > 0)) {
      return setError("Select festival days and/or camping to continue.");
    }
    if ((window as any).Razorpay === undefined) {
      return setError("Payment library is still loading. Please try again in a moment.");
    }

    setSubmitting(true);
    try {
      const body = {
        contact: { name: name.trim(), email: email.trim(), phone: phone.trim() || undefined },
        entry: entryDays.size > 0 ? { days: Array.from(entryDays), people: entryPeople } : undefined,
        camping:
          wantCamping && campingDays.size > 0
            ? { type: campingType, days: Array.from(campingDays), people: campingPeople }
            : undefined,
      };
      const orderRes = await fetch(getApiUrl("euphoria/order"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const orderJson = await orderRes.json();
      if (!orderRes.ok || !orderJson?.success) {
        setSubmitting(false);
        return setError(orderJson?.message || "Could not start payment.");
      }
      const d = orderJson.data;
      const options = {
        key: d.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: d.amount,
        currency: d.currency,
        name: "Euphoria Festival 2026",
        description: d.description || "Festival entry & camping",
        image: "/logo.png",
        order_id: d.orderId,
        handler: (response: any) => {
          void verify(response);
        },
        prefill: d.prefill || { name: name.trim(), email: email.trim(), contact: phone.trim() },
        theme: { color: "#7c3aed" },
        modal: { ondismiss: () => setSubmitting(false) },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", () => {
        setSubmitting(false);
        setError("Payment failed. You were not charged. Please try again.");
      });
      rzp.open();
    } catch {
      setSubmitting(false);
      setError("Something went wrong starting your payment.");
    }
  }

  async function verify(response: any) {
    try {
      const res = await fetch(getApiUrl("euphoria/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        }),
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        setIssued(json.data.tickets || []);
      } else {
        setError(json?.message || "Payment received — your tickets are being confirmed. Check your email shortly.");
      }
    } catch {
      setError("Payment received — your tickets are being confirmed. Please do not pay again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading…</div>;
  }

  if (issued) {
    return (
      <div className="min-h-screen bg-black text-white px-4 py-10">
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold text-green-400">You're in! 🎉</h1>
          <p className="text-white/70 mt-1">Your Euphoria Festival 2026 tickets are confirmed. A copy is in your email.</p>
          <div className="mt-6 space-y-4">
            {issued.map((t) => (
              <div key={t.ticketNumber} className="rounded-xl border border-white/15 bg-white/5 p-4 flex gap-4 items-center">
                {t.qrCode ? <img src={t.qrCode} alt="QR" className="w-24 h-24 rounded bg-white p-1" /> : null}
                <div>
                  <div className="font-semibold">
                    {t.type === "camping" ? `Camping (${t.campingType})` : "Festival Entry"}
                  </div>
                  <div className="text-xs text-white/60 mt-1">{t.ticketNumber}</div>
                  <div className="text-xs text-white/60 mt-1">Valid: {t.validDays.map(fmtDay).join(", ")}</div>
                </div>
              </div>
            ))}
          </div>
          <Link href="/euphoria-festival-2026" className="inline-block mt-8 text-violet-400 underline">
            Back to festival page
          </Link>
        </div>
      </div>
    );
  }

  if (config && !config.bookingOpen) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-3xl font-bold">Euphoria Festival 2026</h1>
          <p className="mt-3 text-white/70">Bookings open soon. Check back shortly.</p>
          <Link href="/euphoria-festival-2026" className="inline-block mt-6 text-violet-400 underline">Festival details</Link>
        </div>
      </div>
    );
  }

  const days = config?.festivalDays || [];
  const Counter = ({ value, setValue }: { value: number; setValue: (n: number) => void }) => (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => setValue(Math.max(1, value - 1))} className="w-9 h-9 rounded-lg border border-white/20 text-lg">−</button>
      <span className="w-8 text-center font-semibold">{value}</span>
      <button type="button" onClick={() => setValue(Math.min(20, value + 1))} className="w-9 h-9 rounded-lg border border-white/20 text-lg">+</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold">Book Euphoria Festival 2026</h1>
        <p className="text-white/60 mt-1">11–13 December · Avora Resort, Chümoukedima</p>

        {/* Festival entry */}
        <section className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Festival Entry</h2>
          <p className="text-sm text-white/60 mt-1">Per person. Pick the days you'll attend.</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {days.map((d) => {
              const on = entryDays.has(d);
              return (
                <button key={d} type="button" onClick={() => setEntryDays(toggle(entryDays, d))}
                  className={`px-4 py-2 rounded-lg border text-sm ${on ? "bg-violet-600 border-violet-500" : "border-white/20"}`}>
                  {fmtDay(d)}
                </button>
              );
            })}
          </div>
          {entryDays.size > 0 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-white/70">People</span>
              <Counter value={entryPeople} setValue={setEntryPeople} />
            </div>
          )}
          <div className="text-right mt-3 text-sm text-white/80">
            {entryDays.size > 0 ? `₹${entryUnit} × ${entryPeople} = ₹${entryAmount}` : "—"}
          </div>
        </section>

        {/* Camping */}
        <section className="mt-5 rounded-2xl border border-white/15 bg-white/5 p-5">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-lg font-semibold">Add Camping</span>
            <input type="checkbox" checked={wantCamping} onChange={(e) => setWantCamping(e.target.checked)} className="w-5 h-5 accent-violet-600" />
          </label>
          {config && (
            <p className="text-xs text-white/50 mt-1">{config.campingAvailable} of {config.campingCapacity} spots left.</p>
          )}
          {wantCamping && (
            <div className="mt-4 space-y-4">
              {config?.campingIncludesEntry && (
                <p className="text-xs text-emerald-400">Camping includes festival entry on your camping days.</p>
              )}
              <div className="flex gap-2">
                {(["tent", "no-tent"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setCampingType(t)}
                    className={`px-4 py-2 rounded-lg border text-sm capitalize ${campingType === t ? "bg-violet-600 border-violet-500" : "border-white/20"}`}>
                    {t === "tent" ? "Tent provided" : "No tent (own tent)"}
                  </button>
                ))}
              </div>
              <div>
                <span className="text-sm text-white/70">Nights</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {days.map((d) => {
                    const on = campingDays.has(d);
                    return (
                      <button key={d} type="button" onClick={() => setCampingDays(toggle(campingDays, d))}
                        className={`px-4 py-2 rounded-lg border text-sm ${on ? "bg-violet-600 border-violet-500" : "border-white/20"}`}>
                        Night of {fmtDay(d)}
                      </button>
                    );
                  })}
                </div>
              </div>
              {campingDays.size > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">People</span>
                  <Counter value={campingPeople} setValue={setCampingPeople} />
                </div>
              )}
              <div className="text-right text-sm text-white/80">
                {campingDays.size > 0 ? `₹${campingUnit} × ${campingPeople} = ₹${campingAmount}` : "—"}
              </div>
            </div>
          )}
        </section>

        {/* Contact */}
        <section className="mt-5 rounded-2xl border border-white/15 bg-white/5 p-5 space-y-3">
          <h2 className="text-lg font-semibold">Your details</h2>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name"
            className="w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 outline-none" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (for your tickets)" type="email"
            className="w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 outline-none" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)"
            className="w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 outline-none" />
        </section>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex items-center justify-between">
          <div className="text-2xl font-bold">₹{total}</div>
          <button type="button" onClick={handlePay} disabled={submitting || total <= 0}
            className="px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 font-semibold">
            {submitting ? "Processing…" : token ? "Pay & Book" : "Log in to book"}
          </button>
        </div>
        <p className="text-xs text-white/40 mt-3">Secure payment via Razorpay. Tickets are emailed and shown in your account.</p>
      </div>
    </div>
  );
}
