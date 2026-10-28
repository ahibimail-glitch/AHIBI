"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Download, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";
import NuscPriceBreakdown from "@/components/NuscPriceBreakdown";
import {
  clearNuscCheckoutRequestId,
  getNuscCheckoutRequestId,
  NUSC_HOME_MATCHES,
} from "@/lib/nuscHomeMatches";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const SEASON_PASSES = {
  "general-season": { name: "General Season Pass", ticketType: "General Pass", actualPrice: 2700, price: 3240 },
  "premium-season": { name: "Premium Season Pass", ticketType: "Premium Pass", actualPrice: 11250, price: 13500 },
} as const;

type SeasonPassId = keyof typeof SEASON_PASSES;
type GeneralZone = "G-1" | "G-2" | "G-3" | "G-4" | "G-5";
type UserProfile = { name: string; email: string; phone: string };
type SeasonMatchReceipt = { matchDate: string; eventId: string; eventTitle?: string; bookingIds: string[] };
type RazorpayPaymentResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type SeasonTicketBooking = {
  _id: string;
  ticketCode?: string;
  bookingCode?: string;
  ticketType: string;
  nuscGeneralZone?: GeneralZone;
  ticketIndex?: number;
  totalTickets?: number;
  price: number;
  total: number;
  bookedAt: string;
  user?: { name?: string };
  event: {
    title: string;
    startDate: string;
    endDate?: string;
    location?: { address?: string; city?: string };
  };
};

function formatRupees(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export default function NuscSeasonCheckoutPage() {
  const router = useRouter();
  const [passId, setPassId] = useState<SeasonPassId | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [seasonZone, setSeasonZone] = useState<GeneralZone | "">("");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [isDownloadingTickets, setIsDownloadingTickets] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ticketDownloadError, setTicketDownloadError] = useState<string | null>(null);
  const [seasonMatches, setSeasonMatches] = useState<SeasonMatchReceipt[] | null>(null);
  const ticketQrCanvases = useRef<Record<string, HTMLCanvasElement | null>>({});

  const pass = passId ? SEASON_PASSES[passId] : null;
  const totalAmount = useMemo(() => pass ? pass.price * quantity : 0, [pass, quantity]);
  const seasonTicketIds = seasonMatches?.flatMap((fixture) => fixture.bookingIds) || [];

  const handleDownloadAllTickets = async () => {
    if (!seasonMatches || seasonMatches.length !== NUSC_HOME_MATCHES.length) {
      setTicketDownloadError("All 10 match tickets are not ready yet. Please refresh your bookings or contact support.");
      return;
    }
    if (seasonTicketIds.length !== NUSC_HOME_MATCHES.length * quantity || seasonTicketIds.some((id) => !id)) {
      setTicketDownloadError("The season pass ticket list is incomplete. Please refresh your bookings or contact support.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setTicketDownloadError("Please sign in again to download your season tickets.");
      return;
    }

    setIsDownloadingTickets(true);
    setTicketDownloadError(null);
    try {
      const bookings: SeasonTicketBooking[] = [];
      for (let start = 0; start < seasonTicketIds.length; start += 5) {
        const batch = seasonTicketIds.slice(start, start + 5);
        const batchBookings = await Promise.all(batch.map(async (bookingId) => {
          const response = await fetch(`${API_URL}/api/bookings/${encodeURIComponent(bookingId)}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          const result = await response.json();
          if (!response.ok || !result.success || !result.data?.event) {
            throw new Error(result.message || "A match ticket could not be loaded.");
          }
          return result.data as SeasonTicketBooking;
        }));
        bookings.push(...batchBookings);
      }

      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const qrCanvases = seasonTicketIds.map((bookingId) => ticketQrCanvases.current[bookingId]);
      if (qrCanvases.some((canvas) => !canvas || canvas.width === 0 || canvas.height === 0)) {
        throw new Error("Ticket QR codes are still loading. Please try again.");
      }

      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const money = (value: number) => formatRupees(Number(value) || 0);

      bookings.forEach((booking, index) => {
        if (index > 0) pdf.addPage();
        const fixtureIndex = Math.floor(index / quantity);
        const match = NUSC_HOME_MATCHES[fixtureIndex];
        const date = new Date(booking.event.startDate);
        const time = date.toLocaleTimeString("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: "Asia/Kolkata",
        });
        const venue = [booking.event.location?.address, booking.event.location?.city]
          .filter(Boolean)
          .join(", ") || "Chümoukedima Football Stadium";
        const ticketNumber = (index % quantity) + 1;
        const ticketId = `${booking._id}_ticket_${booking.ticketIndex || ticketNumber}`;

        pdf.setFillColor(244, 245, 241);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
        pdf.setFillColor(7, 18, 13);
        pdf.roundedRect(12, 12, pageWidth - 24, 62, 5, 5, "F");
        pdf.setFillColor(213, 31, 52);
        pdf.rect(12, 12, 3, 62, "F");

        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(18);
        pdf.text("AHIBI", 21, 25);
        pdf.setFontSize(9);
        pdf.setTextColor(255, 130, 143);
        pdf.text("NUSC HOME MATCHES · SEASON PASS", 21, 33);
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(15);
        const eventTitleLines = pdf.splitTextToSize(booking.event.title || `NUSC vs ${match.opponent}`, pageWidth - 46);
        pdf.text(eventTitleLines.slice(0, 2), 21, 45);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.text(`${date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })} · ${time}`, 21, 65);

        pdf.setDrawColor(218, 225, 218);
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(12, 82, pageWidth - 24, 158, 5, 5, "FD");

        const qrCanvas = qrCanvases[index] as HTMLCanvasElement;
        pdf.addImage(qrCanvas.toDataURL("image/png"), "PNG", 20, 96, 58, 58);
        pdf.setTextColor(89, 100, 89);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.text("SCAN FOR ENTRY", 20, 161);
        pdf.setTextColor(55, 65, 55);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.text("This QR is valid for this match only.", 20, 166);

        const detailX = 91;
        const detailRows = [
          ["MATCH", `Match ${fixtureIndex + 1} of 10${quantity > 1 ? ` · Pass ${ticketNumber} of ${quantity}` : ""}`],
          ["TICKET TYPE", booking.ticketType],
          ...(booking.nuscGeneralZone ? [["SEATING ZONE", booking.nuscGeneralZone]] : []),
          ["ATTENDEE", booking.user?.name || "Season pass holder"],
          ["VENUE", venue],
          ["PRICE", money(booking.price)],
        ];
        detailRows.forEach(([label, value], rowIndex) => {
          const rowY = 100 + rowIndex * 24;
          pdf.setTextColor(115, 123, 115);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          pdf.text(label, detailX, rowY);
          pdf.setTextColor(17, 23, 19);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(10);
          pdf.text(pdf.splitTextToSize(String(value), pageWidth - detailX - 20).slice(0, 2), detailX, rowY + 6);
        });

        pdf.setDrawColor(223, 228, 222);
        pdf.line(20, 184, pageWidth - 20, 184);
        pdf.setTextColor(115, 123, 115);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.text("TICKET ID", 20, 197);
        pdf.setTextColor(17, 23, 19);
        pdf.setFont("courier", "normal");
        pdf.setFontSize(9);
        pdf.text(pdf.splitTextToSize(ticketId, pageWidth - 40).slice(0, 2), 20, 204);
        pdf.setTextColor(115, 123, 115);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text("Show this ticket at the stadium entrance on match day.", 20, 224);

        pdf.setTextColor(115, 123, 115);
        pdf.setFontSize(8);
        pdf.text("NUSC · Indian Football League", 12, pageHeight - 12);
        pdf.text(`${index + 1} / ${bookings.length}`, pageWidth - 12, pageHeight - 12, { align: "right" });
      });

      const passFileName = passId || "season-pass";
      pdf.save(`nusc-${passFileName}-all-tickets.pdf`);
      toast.success(`${bookings.length} match tickets downloaded as one PDF.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to download all season tickets.";
      setTicketDownloadError(message);
      toast.error(message);
    } finally {
      setIsDownloadingTickets(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawPassId = params.get("passId");
    const rawQuantity = Number(params.get("quantity") || 1);
    const rawZone = params.get("zone") || "";
    if (rawPassId === "general-season" || rawPassId === "premium-season") setPassId(rawPassId);
    if (Number.isInteger(rawQuantity) && rawQuantity >= 1 && rawQuantity <= 10) setQuantity(rawQuantity);
    if (["G-1", "G-2", "G-3", "G-4", "G-5"].includes(rawZone)) setSeasonZone(rawZone as GeneralZone);

    const token = localStorage.getItem("token");
    if (!token) {
      const redirect = encodeURIComponent(`/nusc-home-matches/season-checkout${window.location.search}`);
      router.replace(`/auth?redirect=${redirect}`);
      return;
    }

    fetch(`${API_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      cache: "no-store",
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success || !data.data?.user) throw new Error("Your session has expired. Please log in again.");
        setUser(data.data.user);
      })
      .catch((error: Error) => {
        localStorage.removeItem("token");
        toast.error(error.message || "Please log in to continue.");
        router.replace(`/auth?redirect=${encodeURIComponent(`/nusc-home-matches/season-checkout${window.location.search}`)}`);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleBooking = async () => {
    if (!passId || !pass) {
      setErrorMessage("Choose a valid season pass from the NUSC home matches page.");
      return;
    }
    if (passId === "general-season" && !seasonZone) {
      setErrorMessage("Choose a General seating zone for all 10 match tickets.");
      return;
    }
    if (!acceptedTerms) {
      setErrorMessage("Accept the Terms and Conditions to continue.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      router.push(`/auth?redirect=${encodeURIComponent(`/nusc-home-matches/season-checkout${window.location.search}`)}`);
      return;
    }

    setIsBooking(true);
    setErrorMessage(null);
    try {
      const checkoutScope = passId === "general-season"
        ? `season:${passId}:${quantity}:${seasonZone}`
        : `season:${passId}:${quantity}`;
      const checkoutRequestId = getNuscCheckoutRequestId(checkoutScope);
      if (!window.Razorpay) throw new Error("Secure checkout is still loading. Please try again in a moment.");
      const orderResponse = await fetch(`${API_URL}/api/nusc-home-matches/checkout/season/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ passId, quantity, ...(passId === "general-season" && { zone: seasonZone }), checkoutRequestId }),
      });
      const order = await orderResponse.json();
      if (orderResponse.ok && order.alreadyCompleted) {
        clearNuscCheckoutRequestId(checkoutScope, checkoutRequestId);
        toast.success("This season pass payment is already confirmed. Opening My Tickets.");
        router.push("/profile");
        return;
      }
      if (!orderResponse.ok || !order.id) throw new Error(order.message || "Unable to start season pass checkout.");

      const checkout = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "AHIBI",
        description: `${quantity} ${pass.name} · all 10 home matches`,
        order_id: order.id,
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        theme: { color: "#d51f34" },
        handler: async (payment: RazorpayPaymentResponse) => {
          try {
            const verificationResponse = await fetch(`${API_URL}/api/nusc-home-matches/checkout/verify-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify(payment),
            });
            const verification = await verificationResponse.json();
            if (!verificationResponse.ok || !verification.success) {
              throw new Error(verification.message || "Payment was received but ticket confirmation is still pending. Please check My Tickets or contact AHIBI support.");
            }
            clearNuscCheckoutRequestId(checkoutScope, checkoutRequestId);
            setSeasonMatches(verification.seasonMatches || []);
            toast.success("Season pass confirmed for all 10 home matches.");
          } catch (error) {
            const message = error instanceof Error ? error.message : "Payment was received but ticket confirmation failed.";
            setErrorMessage(message);
            toast.error(message);
          } finally {
            setIsBooking(false);
          }
        },
        modal: { ondismiss: () => setIsBooking(false) },
      });
      checkout.on("payment.failed", (failure: { error?: { description?: string } }) => {
        setIsBooking(false);
        setErrorMessage(failure.error?.description || "Payment did not complete. Your season pass was not issued.");
      });
      checkout.open();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start season pass checkout.";
      setErrorMessage(message);
      toast.error(message);
      setIsBooking(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f5f1] text-[#111713]">
      <Navbar />
      <section className="px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl">
          <Link href="/nusc-home-matches" className="inline-flex items-center gap-2 text-sm font-semibold text-[#59645a] hover:text-[#111713]">
            <ArrowLeft className="h-4 w-4" /> Back to NUSC home matches
          </Link>

          {seasonMatches ? (
            <div className="mt-7 rounded-3xl border border-[#dfe4de] bg-white p-6 shadow-sm sm:p-9">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#edf7ed] px-4 py-2 text-sm font-bold text-[#23573a]"><CheckCircle2 className="h-4 w-4" /> Payment confirmed</span>
              <h1 className="mt-5 text-3xl font-black tracking-tight">Your season pass is ready</h1>
              <p className="mt-2 text-[#69716a]">We created one AHIBI ticket for each home match{seasonZone ? ` in seating zone ${seasonZone}` : ""}. Open each match booking to view its ticket.</p>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleDownloadAllTickets}
                  disabled={isDownloadingTickets || !seasonTicketIds.length}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#d51f34] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#b91629] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDownloadingTickets ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {isDownloadingTickets ? "Preparing tickets…" : `Download all ${seasonTicketIds.length} tickets (PDF)`}
                </button>
                {ticketDownloadError && <p role="alert" className="mt-3 text-sm text-[#9c1b2b]">{ticketDownloadError}</p>}
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {seasonMatches.map((fixture, index) => {
                  const match = NUSC_HOME_MATCHES.find((item) => item.date === fixture.matchDate);
                  return (
                    <Link key={fixture.matchDate} href={`/events/${fixture.eventId}/bookings`} className="rounded-xl border border-[#e2e6e1] p-4 transition hover:border-[#d51f34] hover:bg-[#fff8f8]">
                      <span className="text-xs font-bold uppercase tracking-[.12em] text-[#737b73]">Match {index + 1}</span>
                      <span className="mt-1 block font-bold">{match?.label || fixture.matchDate} · {match?.opponent || fixture.eventTitle}</span>
                      <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#b7192d]">View ticket <span aria-hidden="true">→</span></span>
                    </Link>
                  );
                })}
              </div>
              <div aria-hidden="true" className="pointer-events-none fixed left-[-10000px] top-0 h-px w-px overflow-hidden">
                {seasonMatches.flatMap((fixture) => fixture.bookingIds.map((bookingId) => (
                  <QRCodeCanvas
                    key={bookingId}
                    ref={(canvas) => { ticketQrCanvases.current[bookingId] = canvas; }}
                    value={JSON.stringify({ bookingId, eventId: fixture.eventId })}
                    size={512}
                    level="M"
                  />
                )))}
              </div>
            </div>
          ) : (
            <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_360px]">
              <div className="rounded-3xl border border-[#dfe4de] bg-white p-6 shadow-sm sm:p-9">
                <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b7192d]">NUSC season pass</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight">Review your pass</h1>
                <p className="mt-2 leading-6 text-[#69716a]">One pass gives one attendee access to every fixture below. Each match ticket will appear in your AHIBI bookings.</p>

                <div className="mt-7 divide-y divide-[#e7ebe6] rounded-2xl border border-[#e7ebe6]">
                  {NUSC_HOME_MATCHES.map((match, index) => (
                    <div key={match.date} className="flex items-center justify-between gap-4 px-4 py-3.5">
                      <div><p className="text-xs font-bold uppercase tracking-[.1em] text-[#737b73]">Match {index + 1} · {match.day}</p><p className="mt-1 font-semibold">{match.label} · {match.opponent}</p></div>
                      <span className="shrink-0 text-sm text-[#69716a]">6:30 PM</span>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="h-fit rounded-3xl border border-[#dfe4de] bg-white p-6 shadow-sm">
                {pass ? (
                  <>
                    <h2 className="text-xl font-black">{pass.name}</h2>
                    <p className="mt-1 text-sm text-[#69716a]">All 10 home matches · 1 match day free</p>
                    <label htmlFor="season-quantity" className="mt-6 block text-sm font-semibold">Number of season passes</label>
                    <select id="season-quantity" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="mt-2 h-11 w-full rounded-lg border border-[#cfd7cf] bg-white px-3">
                      {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}
                    </select>
                    {passId === "general-season" && (
                      <div className="mt-5 rounded-xl border border-[#dfe4de] bg-[#f8faf7] p-4">
                        <p className="text-sm font-semibold">General seating zone</p>
                        <p className="mt-1 text-sm text-[#69716a]">All 10 match tickets will be assigned to {seasonZone || "the zone you selected"}.</p>
                      </div>
                    )}
                    <div className="mt-6 flex justify-between border-t border-[#e7ebe6] pt-4 text-sm"><span>Each pass</span><span>{formatRupees(pass.price)}</span></div>
                    <NuscPriceBreakdown items={[{ passId: passId || "", quantity, actualUnitPrice: pass.actualPrice, checkoutUnitPrice: pass.price }]} totalPayable={totalAmount} />
                    <p className="mt-3 text-xs leading-5 text-[#737b73]">Season pricing includes the one free match day. The total includes SDF and convenience fee.</p>

                    <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm leading-5 text-[#4c554d]">
                      <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#d51f34]" />
                      <span>I accept AHIBI’s <Link href="/terms" target="_blank" className="font-semibold underline">Terms and Conditions</Link>.</span>
                    </label>
                    {errorMessage && <p role="alert" className="mt-4 rounded-lg border border-[#f0c4c8] bg-[#fff4f4] p-3 text-sm text-[#9c1b2b]">{errorMessage}</p>}
                    <button type="button" onClick={handleBooking} disabled={loading || isBooking || !acceptedTerms || !passId || (passId === "general-season" && !seasonZone)} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#d51f34] px-5 font-bold text-white shadow-sm transition hover:bg-[#b91629] disabled:cursor-not-allowed disabled:opacity-50">
                      {loading || isBooking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      {isBooking ? "Starting secure checkout…" : "Proceed to payment"}
                    </button>
                    <p className="mt-3 text-center text-xs text-[#737b73]">Secure payment through AHIBI checkout</p>
                  </>
                ) : (
                  <div className="py-4">
                    <h2 className="text-xl font-black">Invalid season pass</h2>
                    <p className="mt-2 text-sm leading-6 text-[#69716a]">Choose General Season Pass or Premium Season Pass from the NUSC home matches page.</p>
                    <Link href="/nusc-home-matches" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#d51f34] px-5 text-sm font-bold text-white">Choose a pass</Link>
                  </div>
                )}
                {user && <p className="mt-5 border-t border-[#e7ebe6] pt-4 text-xs leading-5 text-[#737b73]">Booking as {user.name || user.email}.</p>}
              </aside>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
