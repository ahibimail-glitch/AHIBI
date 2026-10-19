"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  Download,
  CalendarDays,
  Clock,
  MapPin,
  Ticket,
} from "lucide-react";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";

type PassData = {
  bookingId: string;
  registrationNumber: string;
  name: string;
  phone?: string;
  email?: string;
  qrCodeDataUrl?: string;
  message?: string;
  event?: {
    title?: string;
    subtitle?: string;
    dateLabel?: string;
    gatesOpenLabel?: string;
    venue?: string;
  };
};

export default function TicketToHornbillPassPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = String(params?.bookingId || "");
  const [pass, setPass] = useState<PassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookingId) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/hornbill-showcase/day1/pass/${bookingId}`);
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || "Could not load your pass.");
        }
        setPass(json.data);
      } catch (err: any) {
        setError(err?.message || "Could not load your pass.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookingId]);

  const downloadPass = () => {
    if (!pass?.qrCodeDataUrl) return;
    const link = document.createElement("a");
    link.href = pass.qrCodeDataUrl;
    link.download = `${pass.registrationNumber || "ticket-to-hornbill-pass"}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />
      <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <button
          type="button"
          onClick={() => router.push("/profile")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>

        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#ff0e0e]" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : pass ? (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="bg-[#ff0e0e] px-6 py-8 text-center text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/85">
                Free entry pass
              </p>
              <h1 className="mt-2 text-xl font-bold leading-snug">
                {pass.event?.title || "Ticket to Hornbill"}
              </h1>
              {pass.event?.subtitle ? (
                <p className="mt-1 text-sm text-white/85">{pass.event.subtitle}</p>
              ) : null}
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-gray-50 p-5">
                {pass.qrCodeDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pass.qrCodeDataUrl} alt="Entry QR pass" className="h-56 w-56" />
                ) : null}
                <p className="mt-3 text-base font-bold text-gray-900">{pass.name}</p>
                <p className="font-mono text-xs text-gray-500">{pass.registrationNumber}</p>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                {pass.event?.dateLabel ? (
                  <p className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-[#ff0e0e]" />
                    {pass.event.dateLabel}
                  </p>
                ) : null}
                {pass.event?.gatesOpenLabel ? (
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#ff0e0e]" />
                    {pass.event.gatesOpenLabel}
                  </p>
                ) : null}
                {pass.event?.venue ? (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#ff0e0e]" />
                    {pass.event.venue}
                  </p>
                ) : null}
              </div>

              {pass.message ? (
                <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-600">
                  {pass.message}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={downloadPass}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#ff0e0e] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#e00d0d]"
                >
                  <Download className="h-4 w-4" />
                  Download pass
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/profile")}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                >
                  <Ticket className="h-4 w-4" />
                  My Tickets
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
