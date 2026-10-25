"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";
import NuscPriceBreakdown from "@/components/NuscPriceBreakdown";
import { clearNuscCheckoutRequestId, getNuscCheckoutRequestId, NUSC_HOME_MATCHES } from "@/lib/nuscHomeMatches";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const PASS_OPTIONS = {
  "general-single": { name: "General Pass", ticketType: "General Pass", actualPrice: 299, totalPrice: 358.8 },
  "premium-single": { name: "Premium Pass", ticketType: "Premium Pass", actualPrice: 1250, totalPrice: 1500 },
  "suite-single": { name: "United Suite — Single pass", ticketType: "United Suite — Single pass", actualPrice: 6000, totalPrice: 7200 },
  "suite-box-single": { name: "United Suite — Full Box", ticketType: "United Suite — Full Box", actualPrice: 50000, totalPrice: 60000 },
} as const;
type PassId = keyof typeof PASS_OPTIONS;
type GeneralZone = "G-1" | "G-2" | "G-3" | "G-4" | "G-5";
type SelectedMatch = { date: string; quantity: number; zone: GeneralZone | "" };
type UserProfile = { name?: string; email?: string; phone?: string };
type RazorpayResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type MatchEvent = {
  _id: string;
  slug?: string;
  ticketTypes?: Array<{
    name: string;
    quantity: number;
    sold?: number;
    zones?: Array<{ name: GeneralZone; available: number; capacity: number }>;
  }>;
};
type EventsResponse = { data?: { events?: MatchEvent[] } };
type RazorpayCheckoutOptions = {
  key?: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name?: string; email?: string; contact?: string };
  theme: { color: string };
  handler: (payment: RazorpayResponse) => void;
  modal: { ondismiss: () => void };
};

function formatRupees(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export default function NuscMultiMatchCheckoutPage() {
  const router = useRouter();
  const [passId, setPassId] = useState<PassId | null>(null);
  const [matches, setMatches] = useState<SelectedMatch[]>([]);
  const [eventsByDate, setEventsByDate] = useState<Record<string, MatchEvent>>({});
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pass = passId ? PASS_OPTIONS[passId] : null;
  const selections = useMemo(() => matches.map((match) => {
    const event = eventsByDate[match.date];
    const ticket = event?.ticketTypes?.find((item) => item.name === pass?.ticketType);
    const available = pass?.ticketType === "General Pass"
      ? match.zone ? ticket?.zones?.find((zone) => zone.name === match.zone)?.available : ticket?.quantity
      : ticket ? Math.max(0, ticket.quantity - (ticket.sold || 0)) : 0;
    return { ...match, event, ticket, available: Number(available || 0) };
  }), [matches, eventsByDate, pass]);
  const totalPayable = pass ? matches.reduce((sum, match) => sum + pass.totalPrice * match.quantity, 0) : 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawPass = params.get("passId") as PassId | null;
    const dates = [...new Set((params.get("dates") || "").split(",").filter((date) => NUSC_HOME_MATCHES.some((match) => match.date === date)))];
    if (rawPass && rawPass in PASS_OPTIONS) setPassId(rawPass);
    if (dates.length >= 2) setMatches(dates.map((date) => ({ date, quantity: 1, zone: "" })));
    else setErrorMessage("Select at least two match dates and a pass to continue.");

    const token = localStorage.getItem("token");
    if (!token) {
      router.replace(`/auth?redirect=${encodeURIComponent(`/nusc-home-matches/checkout${window.location.search}`)}`);
      return;
    }
    Promise.all([
      fetch(`${API_URL}/api/auth/profile`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
      fetch(`${API_URL}/api/events?limit=10000&includePast=true`, { cache: "no-store" }),
    ])
      .then(async ([profileResponse, eventsResponse]) => {
        const profile = await profileResponse.json();
        const eventResult: EventsResponse = await eventsResponse.json();
        if (!profileResponse.ok || !profile.success || !profile.data?.user) throw new Error("Your session has expired. Please log in again.");
        if (!eventsResponse.ok) throw new Error("Match availability could not be loaded. Refresh and try again.");
        setUser(profile.data.user);
        const events = eventResult.data?.events || [];
        const listedMatches = events.flatMap((event) => {
          if (!event.slug?.startsWith("nusc-home-match-")) return [];
          const date = event.slug.match(/^nusc-home-match-(\d{4})(\d{2})(\d{2})$/);
          return date ? [{ date: `${date[1]}-${date[2]}-${date[3]}`, event }] : [];
        }).filter(({ date }) => dates.includes(date));
        const detailedMatches = await Promise.all(listedMatches.map(async ({ date, event }) => {
          const detailResponse = await fetch(`${API_URL}/api/events/${event._id}`, { cache: "no-store" });
          if (!detailResponse.ok) throw new Error(`Availability for ${date} could not be loaded. Refresh and try again.`);
          const detailedEvent: MatchEvent = await detailResponse.json();
          return [date, detailedEvent] as const;
        }));
        setEventsByDate(Object.fromEntries(detailedMatches));
      })
      .catch((error: Error) => {
        const message = error.message || "Please log in to continue.";
        setErrorMessage(message);
        if (message.includes("session has expired")) {
          localStorage.removeItem("token");
          router.replace(`/auth?redirect=${encodeURIComponent(`/nusc-home-matches/checkout${window.location.search}`)}`);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const changeMatch = (date: string, patch: Partial<SelectedMatch>) => {
    setMatches((current) => current.map((match) => match.date === date ? { ...match, ...patch } : match));
  };

  const handleBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!passId || !pass || matches.length < 2) {
      setErrorMessage("Return to match selection and choose at least two dates and a pass.");
      return;
    }
    if (selections.some((match) => !match.event || !match.ticket || match.available < match.quantity)) {
      setErrorMessage("One or more selected matches no longer have enough tickets. Update the quantity or seating zone and try again.");
      return;
    }
    if (pass.ticketType === "General Pass" && matches.some((match) => !match.zone)) {
      setErrorMessage("Choose a seating zone for each General Pass match.");
      return;
    }
    if (!acceptedTerms) {
      setErrorMessage("Accept the Terms and Conditions to continue.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      router.push(`/auth?redirect=${encodeURIComponent(`/nusc-home-matches/checkout${window.location.search}`)}`);
      return;
    }
    const checkoutMatches = selections.map((match) => ({
      eventId: match.event!._id,
      matchDate: match.date,
      ticketType: pass.ticketType,
      quantity: match.quantity,
      ...(pass.ticketType === "General Pass" && { zone: match.zone }),
    }));
    const requestScope = `multi:${passId}:${JSON.stringify(checkoutMatches)}`;
    setIsBooking(true);
    setErrorMessage(null);
    try {
      const checkoutRequestId = getNuscCheckoutRequestId(requestScope);
      if (!(window as unknown as { Razorpay?: unknown }).Razorpay) throw new Error("Secure checkout is still loading. Please try again in a moment.");
      const orderResponse = await fetch(`${API_URL}/api/nusc-home-matches/checkout/multi/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ matches: checkoutMatches, checkoutRequestId }),
      });
      const order = await orderResponse.json();
      if (orderResponse.ok && order.alreadyCompleted) {
        clearNuscCheckoutRequestId(requestScope, checkoutRequestId);
        toast.success("This multi-match booking is already confirmed. Opening My Tickets.");
        router.push("/profile");
        return;
      }
      if (!orderResponse.ok || !order.id) throw new Error(order.message || "Unable to start checkout.");
      const Razorpay = (window as unknown as { Razorpay: new (options: RazorpayCheckoutOptions) => { open: () => void; on: (name: string, callback: (failure: { error?: { description?: string } }) => void) => void } }).Razorpay;
      const checkout = new Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "AHIBI",
        description: `${matches.length} NUSC home match tickets`,
        order_id: order.id,
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        theme: { color: "#d51f34" },
        handler: async (payment) => {
          try {
            const verificationResponse = await fetch(`${API_URL}/api/nusc-home-matches/checkout/verify-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify(payment),
            });
            const verification = await verificationResponse.json();
            if (!verificationResponse.ok || !verification.success) throw new Error(verification.message || "Payment was received but ticket confirmation is pending. Check My Tickets or contact support.");
            clearNuscCheckoutRequestId(requestScope, checkoutRequestId);
            toast.success(`${verification.totalTickets || matches.length} match tickets confirmed.`);
            router.push("/profile");
          } catch (error) {
            const message = error instanceof Error ? error.message : "Payment confirmation is pending. Check My Tickets before retrying.";
            setErrorMessage(message);
            toast.error(message);
          } finally {
            setIsBooking(false);
          }
        },
        modal: { ondismiss: () => setIsBooking(false) },
      });
      checkout.on("payment.failed", (failure) => {
        setIsBooking(false);
        setErrorMessage(failure.error?.description || "Payment did not complete. Your tickets were not issued.");
      });
      checkout.open();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start checkout.";
      setErrorMessage(message);
      toast.error(message);
      setIsBooking(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f5f1] text-[#111713]">
      <Navbar />
      <section className="px-5 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <Link href="/nusc-home-matches#passes" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#59645a] hover:text-[#111713]"><ArrowLeft className="h-4 w-4" /> Back to match selection</Link>
          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Review your matches</h1>
          <p className="mt-2 text-[#69716a]">Choose a zone and quantity for each match, then pay once.</p>
          {loading ? (
            <div className="mt-8 flex items-center gap-3 rounded-xl border border-[#e2e6e1] bg-white p-5 text-sm text-[#69716a]"><Loader2 className="h-5 w-5 animate-spin" /> Loading matches and availability…</div>
          ) : errorMessage && matches.length === 0 ? (
            <p role="alert" className="mt-6 rounded-xl border border-[#f0c6ca] bg-[#fff7f7] p-4 text-sm text-[#a4172a]">{errorMessage}</p>
          ) : !pass ? (
            <p role="alert" className="mt-6 rounded-xl border border-[#f0c6ca] bg-[#fff7f7] p-4 text-sm text-[#a4172a]">The selected pass is invalid. Return to match selection and choose a pass.</p>
          ) : (
            <form onSubmit={handleBooking} className="mt-7 space-y-4">
              {pass.ticketType === "General Pass" && (
                <figure className="overflow-hidden rounded-2xl border border-[#dfe4de] bg-white p-3 sm:p-4">
                  <figcaption className="mb-3 text-sm font-semibold">Stadium seating map</figcaption>
                  <Image src="/images/site-map.webp" alt="Stadium map showing General seating zones G-1 through G-5" width={1600} height={900} sizes="(max-width: 640px) calc(100vw - 64px), 720px" className="h-auto w-full rounded-xl" />
                </figure>
              )}
              {selections.map((match) => {
                const fixture = NUSC_HOME_MATCHES.find((item) => item.date === match.date);
                const unavailable = !match.event || !match.ticket || match.available < match.quantity;
                return (
                  <article key={match.date} className="rounded-2xl border border-[#dfe4de] bg-white p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><h2 className="font-bold">{fixture?.label} · {fixture?.opponent}</h2><p className="mt-1 text-sm text-[#69716a]">{pass.name} · {fixture?.time}</p></div>
                      <div className="flex items-center gap-3"><p className="font-bold">{formatRupees(pass.actualPrice * match.quantity)}</p>{matches.length > 2 && <button type="button" onClick={() => setMatches((current) => current.filter((item) => item.date !== match.date))} className="text-sm font-semibold text-[#a4172a] underline">Remove</button>}</div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="text-sm font-semibold">Tickets
                        <select value={match.quantity} onChange={(event) => changeMatch(match.date, { quantity: Number(event.target.value) })} className="mt-1 min-h-11 w-full rounded-lg border border-[#cfd7cf] bg-white px-3 font-normal">
                          {Array.from({ length: Math.max(1, Math.min(10, match.ticket?.quantity || 10)) }, (_, index) => index + 1).map((quantity) => <option key={quantity} value={quantity}>{quantity}</option>)}
                        </select>
                      </label>
                      {pass.ticketType === "General Pass" && (
                        <label className="text-sm font-semibold">Seating zone
                          <select value={match.zone} onChange={(event) => changeMatch(match.date, { zone: event.target.value as GeneralZone | "" })} className="mt-1 min-h-11 w-full rounded-lg border border-[#cfd7cf] bg-white px-3 font-normal">
                            <option value="">Choose a zone</option>
                            {(match.ticket?.zones || []).map((zone) => <option key={zone.name} value={zone.name} disabled={zone.available < match.quantity}>{zone.name} · {zone.available} seats</option>)}
                          </select>
                        </label>
                      )}
                    </div>
                    {unavailable && <div role="status" className="mt-3 text-sm text-[#a4172a]">Tickets or the selected zone are unavailable for this match. Adjust your selection or {matches.length > 2 ? "remove this match" : <Link href="/nusc-home-matches#passes" className="font-semibold underline">go back and choose a replacement match</Link>}.</div>}
                  </article>
                );
              })}
              <section className="rounded-2xl border border-[#dfe4de] bg-white p-4 sm:p-5">
                <NuscPriceBreakdown items={matches.map((match) => ({ passId: passId || "", quantity: match.quantity, actualUnitPrice: pass.actualPrice, checkoutUnitPrice: pass.totalPrice }))} totalPayable={totalPayable} />
                <label className="mt-5 flex items-start gap-3 text-sm text-[#4c554d]"><input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#d51f34]" /><span>I accept the <Link href="/terms" className="font-semibold underline">Terms and Conditions</Link>.</span></label>
                {errorMessage && <p role="alert" className="mt-4 rounded-lg bg-[#fff1f2] p-3 text-sm text-[#a4172a]">{errorMessage}</p>}
                <button type="submit" disabled={isBooking || loading || !matches.length} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d51f34] px-5 font-semibold text-white transition hover:bg-[#b91629] disabled:cursor-not-allowed disabled:opacity-60">
                  {isBooking ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting secure checkout…</> : <>Pay {formatRupees(totalPayable)} once <ArrowRight className="h-4 w-4" /></>}
                </button>
                <p className="mt-3 flex items-center justify-center gap-2 text-xs text-[#737b73]"><ShieldCheck className="h-4 w-4" /> One payment for all selected matches</p>
              </section>
            </form>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
