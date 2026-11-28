"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getApiUrl } from "@/config";
import HeliTaxiPromo from "@/components/HeliTaxiPromo";

const BLUE = "#0b5cab";

interface Slot { id: string; label: string; capacity: number; }
interface Product {
  id: string; name: string; sector: string; type: string; description: string;
  pricePerSeat: number; seatsPerFlight: number; slots: Slot[];
}
interface HeliConfig { operatingDays: string[]; bookingOpen: boolean; products: Product[]; }
interface Avail { productId: string; slotId: string; capacity: number; booked: number; available: number; }
interface Passenger { name: string; phone: string; }

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

export default function HeliBookingPage() {
  const router = useRouter();
  const [config, setConfig] = useState<HeliConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [productId, setProductId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [slotId, setSlotId] = useState<string>("");
  const [avail, setAvail] = useState<Avail[] | null>(null);

  const [passengers, setPassengers] = useState<Passenger[]>([{ name: "", phone: "" }]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [issued, setIssued] = useState<any | null>(null);
  const [downloading, setDownloading] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.name) { setName(u.name); setPassengers([{ name: u.name, phone: u.phone || "" }]); }
        if (u?.email) setEmail(u.email);
        if (u?.phone) setPhone(u.phone);
      }
    } catch {}
    (async () => {
      try {
        const res = await fetch(getApiUrl("heli-2026/config"));
        const json = await res.json();
        if (json?.success) setConfig(json.data);
        else setError("Could not load Heli Taxi details.");
      } catch { setError("Could not load Heli Taxi details."); }
      finally { setLoading(false); }
    })();
  }, []);

  // load availability when date changes
  useEffect(() => {
    if (!date) { setAvail(null); return; }
    (async () => {
      try {
        const res = await fetch(getApiUrl(`heli-2026/availability?date=${encodeURIComponent(date)}`));
        const json = await res.json();
        if (json?.success) setAvail(json.data);
        else setAvail([]);
      } catch { setAvail([]); }
    })();
  }, [date]);

  const product = useMemo(() => config?.products.find((p) => p.id === productId) || null, [config, productId]);
  const slot = useMemo(() => product?.slots.find((s) => s.id === slotId) || null, [product, slotId]);
  const slotAvail = useMemo(() => {
    if (!product || !slot || !avail) return null;
    return avail.find((a) => a.productId === product.id && a.slotId === slot.id) || null;
  }, [product, slot, avail]);

  const seats = passengers.filter((p) => p.name.trim()).length;
  const total = product ? seats * product.pricePerSeat : 0;
  const maxSeats = Math.min(6, slotAvail ? slotAvail.available : 6);

  function setPax(i: number, field: keyof Passenger, val: string) {
    setPassengers((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)));
  }

  async function handlePay() {
    setError(null);
    if (!token) { router.push(`/auth?redirect=${encodeURIComponent("/HeliTaxii/book")}`); return; }
    if (!product || !slot || !date) return setError("Please choose a ride, date and time slot.");
    if (!name.trim()) return setError("Please enter a booking name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Please enter a valid email.");
    const pax = passengers.filter((p) => p.name.trim());
    if (pax.length < 1) return setError("Add at least one passenger.");
    if (slotAvail && pax.length > slotAvail.available) return setError(`Only ${slotAvail.available} seat(s) left for that slot.`);
    if ((window as any).Razorpay === undefined) return setError("Payment library is still loading. Try again in a moment.");

    setSubmitting(true);
    try {
      const body = {
        productId: product.id, slotId: slot.id, date,
        contact: { name: name.trim(), email: email.trim(), phone: phone.trim() || undefined },
        passengers: pax.map((p) => ({ name: p.name.trim(), phone: p.phone.trim() || undefined })),
      };
      const orderRes = await fetch(getApiUrl("heli-2026/order"), {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const orderJson = await orderRes.json();
      if (!orderRes.ok || !orderJson?.success) { setSubmitting(false); return setError(orderJson?.message || "Could not start payment."); }
      const d = orderJson.data;
      const options = {
        key: d.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: d.amount, currency: d.currency, name: "Hornbill Heli Taxi 2026",
        description: d.description, image: "/logo.png", order_id: d.orderId,
        handler: (response: any) => { void verify(response); },
        prefill: d.prefill || { name: name.trim(), email: email.trim(), contact: phone.trim() },
        theme: { color: BLUE }, modal: { ondismiss: () => setSubmitting(false) },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", () => { setSubmitting(false); setError("Payment failed. You were not charged. Please try again."); });
      rzp.open();
    } catch { setSubmitting(false); setError("Something went wrong starting your payment."); }
  }

  async function verify(response: any) {
    try {
      const res = await fetch(getApiUrl("heli-2026/verify"), {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        }),
      });
      const json = await res.json();
      if (res.ok && json?.success) setIssued(json.data);
      else setError(json?.message || "Payment received — your booking is being confirmed. Check your email shortly.");
    } catch { setError("Payment received — your booking is being confirmed. Please do not pay again."); }
    finally { setSubmitting(false); }
  }

  async function downloadPdf(orderId: string) {
    setDownloading(true);
    try {
      const res = await fetch(getApiUrl(`heli-2026/booking/${orderId}/ticket.pdf`), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("fail");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "hornbill-heli-taxi-2026.pdf";
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch { setError("Couldn't download the PDF — your booking has also been emailed to you."); }
    finally { setDownloading(false); }
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-900">Loading…</div>;

  if (issued) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 px-4 py-10">
        <div className="max-w-xl mx-auto">
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6">
            <h1 className="text-2xl font-bold text-emerald-600">Booking confirmed! 🚁</h1>
            <p className="text-gray-600 mt-1">Confirmation emailed to <span className="font-medium">{issued.contact?.email}</span>. Ref <span className="font-mono">{issued.bookingRef}</span>.</p>
            <div className="mt-4 text-sm text-gray-700">
              <div className="font-semibold text-gray-900">{issued.productName}{issued.sector ? ` — ${issued.sector}` : ""}</div>
              <div>{fmtDate(issued.date)} · {issued.slotLabel} · {issued.seats} seat(s)</div>
            </div>
            {issued.qrCode ? <img src={issued.qrCode} alt="QR" className="w-28 h-28 mt-4 rounded border border-gray-100" /> : null}
            <button onClick={() => downloadPdf(issued.orderId)} disabled={downloading}
              className="mt-4 inline-flex px-5 py-2.5 rounded-xl text-white font-semibold disabled:opacity-50" style={{ backgroundColor: BLUE }}>
              {downloading ? "Preparing…" : "Download booking (PDF)"}
            </button>
            <p className="text-xs text-gray-400 mt-3">Each flight carries 6 passengers and operates only when full — our team will confirm your flight time.</p>
          </div>
          <Link href="/HeliTaxii/book" className="inline-block mt-6 font-medium" style={{ color: BLUE }}>Book another ride</Link>
        </div>
      </div>
    );
  }

  if (config && !config.bookingOpen) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-3xl font-bold">Hornbill Heli Taxi 2026</h1>
          <p className="mt-3 text-gray-600">Bookings open soon. Check back shortly.</p>
        </div>
      </div>
    );
  }

  const chipOn = { backgroundColor: BLUE, color: "#fff", borderColor: "transparent" } as const;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 px-4 py-10">
      <div className="max-w-6xl mx-auto mb-8">
        <HeliTaxiPromo linked={false} />
      </div>
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold">Hornbill Heli Taxi 2026</h1>
        <p className="text-gray-500 mt-1">1–10 December · Shuttle & aerial joyrides</p>

        {/* Product selection */}
        <section className="mt-8 space-y-3">
          {config?.products.map((p) => {
            const on = p.id === productId;
            return (
              <button key={p.id} type="button" onClick={() => { setProductId(p.id); setSlotId(""); }}
                className="w-full text-left rounded-2xl border bg-white shadow-sm p-4 transition"
                style={on ? { borderColor: BLUE, boxShadow: `0 0 0 1px ${BLUE}` } : { borderColor: "#e5e7eb" }}>
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">{p.name}{p.sector ? ` — ${p.sector}` : ""}</div>
                  <div className="font-bold" style={{ color: BLUE }}>₹{p.pricePerSeat.toLocaleString("en-IN")}<span className="text-xs text-gray-400 font-normal">/seat</span></div>
                </div>
                <div className="text-sm text-gray-500 mt-1">{p.description}</div>
              </button>
            );
          })}
        </section>

        {product && (
          <>
            {/* Date */}
            <section className="mt-5 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
              <h2 className="text-lg font-semibold">Date</h2>
              <div className="flex flex-wrap gap-2 mt-3">
                {config?.operatingDays.map((d) => {
                  const on = d === date;
                  return (
                    <button key={d} type="button" onClick={() => { setDate(d); setSlotId(""); }}
                      className="px-3 py-2 rounded-lg border text-sm" style={on ? chipOn : { borderColor: "#d1d5db" }}>
                      {fmtDate(d)}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Slot */}
            {date && (
              <section className="mt-5 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
                <h2 className="text-lg font-semibold">Time slot</h2>
                <div className="space-y-2 mt-3">
                  {product.slots.map((s) => {
                    const a = avail?.find((x) => x.productId === product.id && x.slotId === s.id);
                    const soldOut = a ? a.available <= 0 : false;
                    const on = s.id === slotId;
                    return (
                      <button key={s.id} type="button" disabled={soldOut} onClick={() => setSlotId(s.id)}
                        className="w-full flex items-center justify-between rounded-lg border px-4 py-3 text-sm disabled:opacity-40"
                        style={on ? chipOn : { borderColor: "#d1d5db" }}>
                        <span>{s.label}</span>
                        <span className={on ? "" : "text-gray-500"}>{a ? (soldOut ? "Sold out" : `${a.available} left`) : ""}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Passengers */}
            {slot && (
              <section className="mt-5 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
                <h2 className="text-lg font-semibold">Passengers</h2>
                <p className="text-xs text-gray-400 mt-1">One name per seat (for the flight manifest). Up to {maxSeats}.</p>
                <div className="space-y-2 mt-3">
                  {passengers.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={p.name} onChange={(e) => setPax(i, "name", e.target.value)} placeholder={`Passenger ${i + 1} name`}
                        className="flex-1 rounded-lg bg-white border border-gray-300 px-3 py-2" />
                      <input value={p.phone} onChange={(e) => setPax(i, "phone", e.target.value)} placeholder="Phone (optional)"
                        className="w-36 rounded-lg bg-white border border-gray-300 px-3 py-2" />
                      {passengers.length > 1 && (
                        <button type="button" onClick={() => setPassengers((prev) => prev.filter((_, idx) => idx !== i))}
                          className="w-10 rounded-lg border border-gray-300 text-gray-500">×</button>
                      )}
                    </div>
                  ))}
                </div>
                {passengers.length < maxSeats && (
                  <button type="button" onClick={() => setPassengers((prev) => [...prev, { name: "", phone: "" }])}
                    className="mt-3 text-sm font-medium" style={{ color: BLUE }}>+ Add passenger</button>
                )}
              </section>
            )}

            {/* Contact */}
            {slot && (
              <section className="mt-5 rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-3">
                <h2 className="text-lg font-semibold">Booking contact</h2>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full rounded-lg bg-white border border-gray-300 px-3 py-2" />
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email (for your confirmation)" className="w-full rounded-lg bg-white border border-gray-300 px-3 py-2" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="w-full rounded-lg bg-white border border-gray-300 px-3 py-2" />
              </section>
            )}
          </>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex items-center justify-between">
          <div className="text-2xl font-bold">₹{total.toLocaleString("en-IN")}</div>
          <button type="button" onClick={handlePay} disabled={submitting || !slot || total <= 0}
            className="px-8 py-3 rounded-xl text-white font-semibold disabled:opacity-40" style={{ backgroundColor: BLUE }}>
            {submitting ? "Processing…" : token ? "Pay & Book" : "Log in to book"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">Secure payment via Razorpay. Prices incl. GST. Each flight seats 6 and flies only when full.</p>
      </div>
    </div>
  );
}
