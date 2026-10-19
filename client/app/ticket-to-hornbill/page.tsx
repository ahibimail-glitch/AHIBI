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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0f]">
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-amber-300" />
        </div>
        <Footer />
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-[#0b0b0f] text-white">
        <Navbar />
        <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#14141c] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
            <div className="bg-gradient-to-br from-amber-500 to-orange-700 px-6 py-10 text-center">
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
                <div className="flex flex-col items-center rounded-2xl bg-white p-5 text-[#111]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={result.qrCodeDataUrl} alt="Entry QR pass" className="h-52 w-52" />
                  <p className="mt-3 text-sm font-semibold">{result.name}</p>
                  <p className="font-mono text-xs text-[#666]">{result.registrationNumber}</p>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => router.push(result.passUrl)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3.5 text-sm font-bold text-black transition hover:bg-amber-400"
                >
                  <Ticket className="h-4 w-4" />
                  View / download pass
                </button>
                <button
                  type="button"
                  onClick={() => router.push(result.dashboardUrl || "/profile")}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
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
    <div className="min-h-screen bg-[#0b0b0f] text-white">
      <Navbar />

      <section className="relative w-full bg-black">
        {/* Mobile portrait banner */}
        <div className="relative w-full sm:hidden">
          <Image
            src={config?.bannerMobile || "/images/hornbill-showcase-day1-mobile.jpg"}
            alt={config?.title || "Ticket to Hornbill"}
            width={819}
            height={1024}
            priority
            className="h-auto w-full object-cover object-center"
            sizes="100vw"
          />
        </div>
        {/* Desktop landscape banner */}
        <div className="relative hidden w-full sm:block">
          <Image
            src={config?.bannerDesktop || "/images/hornbill-showcase-day1-desktop.jpg"}
            alt={config?.title || "Ticket to Hornbill"}
            width={1024}
            height={576}
            priority
            className="h-auto w-full object-cover object-center"
            sizes="100vw"
          />
        </div>
      </section>

      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold">About the event</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-white/75">
              {config?.description}
            </p>
          </div>

          {config?.termsAndConditions ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-300">
                Terms & conditions
              </h3>
              <p className="mt-3 text-sm leading-6 text-white/70">{config.termsAndConditions}</p>
              {config.website ? (
                <a
                  href={config.website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-300 hover:text-amber-200"
                >
                  hornbillmusicfestival.com
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#14141c] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:p-7">
          {!config?.isOpen ? (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                <Ban className="h-6 w-6 text-white/80" />
              </div>
              <h2 className="mt-4 text-xl font-bold">Registration closed</h2>
              <p className="mt-2 text-sm text-white/65">
                Free registration for Ticket to Hornbill is no longer available.
              </p>
              <Link
                href="/events"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-black"
              >
                Browse other events
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold">Register for free</h2>
                <p className="mt-1 text-sm text-white/65">
                  One pass per phone number. Your pass will appear on your dashboard after you register.
                </p>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-white/85">Full name</span>
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Enter your full name"
                    className="h-12 w-full rounded-xl border border-white/10 bg-black/30 pl-11 pr-4 text-sm outline-none transition placeholder:text-white/30 focus:border-amber-400"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-white/85">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="you@example.com"
                    className="h-12 w-full rounded-xl border border-white/10 bg-black/30 pl-11 pr-4 text-sm outline-none transition placeholder:text-white/30 focus:border-amber-400"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-white/85">Phone number</span>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="10-digit mobile number"
                    className="h-12 w-full rounded-xl border border-white/10 bg-black/30 pl-11 pr-4 text-sm outline-none transition placeholder:text-white/30 focus:border-amber-400"
                    required
                  />
                </div>
              </label>

              {error ? (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-4 text-sm font-bold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-amber-500/40"
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
              <p className="text-center text-xs leading-5 text-white/45">
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
