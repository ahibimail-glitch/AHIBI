"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Loader2,
  Mail,
  Phone,
  User,
  CheckCircle2,
  ArrowRight,
  Ticket,
  Ban,
  ExternalLink,
  CalendarDays,
  Clock,
  MapPin,
} from "lucide-react";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";

type EventConfig = {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  bannerDesktop: string;
  bannerMobile: string;
  dateLabel: string;
  gatesOpenLabel: string;
  endTimeLabel?: string;
  location?: { address?: string; city?: string };
  termsAndConditions?: string;
  isOpen: boolean;
  website?: string;
};

type PassResult = {
  bookingId: string;
  registrationNumber: string;
  name: string;
  qrCodeDataUrl?: string;
  passUrl: string;
  dashboardUrl?: string;
  message: string;
  alreadyRegistered?: boolean;
};

const BANNER = "/images/hornbill-showcase-day1-desktop.jpg";

export default function TicketToHornbillPage() {
  const router = useRouter();
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [result, setResult] = useState<PassResult | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/hornbill-showcase/day1");
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || "Failed to load event details.");
        }
        setConfig(json.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load event details.");
      } finally {
        setLoading(false);
      }
    };
    load();

    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        setForm((prev) => ({
          ...prev,
          name: prev.name || u?.name || "",
          email: prev.email || u?.email || "",
          phone: prev.phone || u?.phone || "",
        }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const validate = () => {
    if (!form.name.trim() || form.name.trim().length < 2) return "Please enter your full name.";
    if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/.test(form.email.trim())) {
      return "Please enter a valid email address.";
    }
    const digits = form.phone.replace(/\D/g, "");
    const normalized =
      digits.length === 12 && digits.startsWith("91")
        ? digits.slice(2)
        : digits.length === 11 && digits.startsWith("0")
        ? digits.slice(1)
        : digits;
    if (!/^\d{10}$/.test(normalized)) return "Please enter a valid 10-digit phone number.";
    return "";
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!config?.isOpen) {
      setError("Registration for this event has closed.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/hornbill-showcase/day1/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Could not complete registration.");
      }

      if (json.data?.token && typeof window !== "undefined") {
        localStorage.setItem("token", json.data.token);
        const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        localStorage.setItem("tokenExpiry", expiry);
        localStorage.setItem(
          "user",
          JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim(),
          })
        );
      }

      setResult({
        bookingId: json.data.bookingId,
        registrationNumber: json.data.registrationNumber,
        name: json.data.name,
        qrCodeDataUrl: json.data.qrCodeDataUrl,
        passUrl: json.data.passUrl || `/ticket-to-hornbill/pass/${json.data.bookingId}`,
        dashboardUrl: json.data.dashboardUrl || "/profile",
        message:
          json.message ||
          "Thank you for registering! Your free pass is ready — download it below or find it in My Tickets on your dashboard.",
        alreadyRegistered: Boolean(json.alreadyRegistered),
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err?.message || "Could not complete registration.");
    } finally {
      setSubmitting(false);
    }
  };

  const venue = [config?.location?.address, config?.location?.city].filter(Boolean).join(", ");
  const bannerSrc = config?.bannerDesktop || config?.bannerMobile || BANNER;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5]">
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-[#ff0e0e]" />
        </div>
        <Footer />
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-[#f5f5f5]">
        <Navbar />
        <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="bg-[#ff0e0e] px-6 py-10 text-center text-white">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight">
                {result.alreadyRegistered ? "You're already registered" : "Thank you for registering!"}
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/90">{result.message}</p>
            </div>

            <div className="space-y-5 px-6 py-6">
              {result.qrCodeDataUrl ? (
                <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={result.qrCodeDataUrl} alt="Entry QR pass" className="h-52 w-52" />
                  <p className="mt-3 text-sm font-semibold text-gray-900">{result.name}</p>
                  <p className="font-mono text-xs text-gray-500">{result.registrationNumber}</p>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => router.push(result.passUrl)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#ff0e0e] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#e00d0d]"
                >
                  <Ticket className="h-4 w-4" />
                  View / download pass
                </button>
                <button
                  type="button"
                  onClick={() => router.push(result.dashboardUrl || "/profile")}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                >
                  Open dashboard
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />

      {/* Same banner for desktop + mobile */}
      <section className="w-full bg-white">
        <div className="relative mx-auto w-full max-w-5xl">
          <Image
            src={bannerSrc}
            alt={config?.title || "Ticket to Hornbill"}
            width={800}
            height={1000}
            priority
            className="h-auto w-full object-contain object-center"
            sizes="(max-width: 1024px) 100vw, 1024px"
          />
        </div>
      </section>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:py-10">
        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff0e0e]">
              Free registration · Personalised pass
            </p>
            <h1 className="mt-2 text-2xl font-bold leading-tight text-[#1C1C1C] sm:text-3xl">
              {config?.title || "Ticket to Hornbill"}
            </h1>
            {config?.subtitle ? (
              <p className="mt-2 text-sm font-medium text-gray-600 sm:text-base">{config.subtitle}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-700">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5">
                <CalendarDays className="h-4 w-4 text-[#ff0e0e]" />
                {config?.dateLabel || "6th November, 2026"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5">
                <Clock className="h-4 w-4 text-[#ff0e0e]" />
                {config?.gatesOpenLabel || "Gates open at 4:00 PM"}
                {config?.endTimeLabel ? ` · Ends ${config.endTimeLabel}` : ""}
              </span>
              {venue ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5">
                  <MapPin className="h-4 w-4 text-[#ff0e0e]" />
                  {venue}
                </span>
              ) : null}
            </div>

            <p className="mt-5 whitespace-pre-line text-sm leading-7 text-gray-600">
              {config?.description}
            </p>
          </div>

          {config?.termsAndConditions ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
                Terms & conditions
              </h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">{config.termsAndConditions}</p>
              {config.website ? (
                <a
                  href={config.website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#ff0e0e] hover:underline"
                >
                  hornbillmusicfestival.com
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          {!config?.isOpen ? (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                <Ban className="h-6 w-6 text-[#ff0e0e]" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-[#1C1C1C]">Registration closed</h2>
              <p className="mt-2 text-sm text-gray-500">
                Free registration for Ticket to Hornbill is no longer available.
              </p>
              <Link
                href="/events"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff0e0e] px-5 py-3 text-sm font-bold text-white hover:bg-[#e00d0d]"
              >
                Browse other events
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-[#1C1C1C]">Register for free</h2>
                <p className="mt-1 text-sm text-gray-500">
                  One pass per phone number. Your pass will appear on your dashboard after you register.
                </p>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-800">Full name</span>
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Enter your full name"
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#ff0e0e] focus:ring-2 focus:ring-[#ff0e0e]/15"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-800">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="you@example.com"
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#ff0e0e] focus:ring-2 focus:ring-[#ff0e0e]/15"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-800">Phone number</span>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="10-digit mobile number"
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#ff0e0e] focus:ring-2 focus:ring-[#ff0e0e]/15"
                    required
                  />
                </div>
              </label>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff0e0e] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#e00d0d] disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Confirming registration…
                  </>
                ) : (
                  <>
                    Get my free pass
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
              <p className="text-center text-xs leading-5 text-gray-400">
                By registering you confirm your details are accurate. One free pass per phone number.
              </p>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
