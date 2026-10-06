"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Phone, User, CheckCircle2, CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";

type Workshop = {
  name: string;
  day: string;
};

type EventConfig = {
  title: string;
  slug: string;
  isFreeEvent: boolean;
  registrationLabel: string;
  description: string;
  workshops: Workshop[];
  days: Array<{
    day: string;
    workshops: string[];
  }>;
};

type Registration = {
  registrationNumber: string;
  name: string;
  phone: string;
  location: string;
  workshop: string;
  day: string;
  status: string;
};

const initialForm = {
  name: "",
  phone: "",
  location: "",
  workshop: "",
};

export default function WorkshopRsvpPage() {
  const router = useRouter();
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [form, setForm] = useState(initialForm);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<Registration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("token");
    const tokenExpiry = localStorage.getItem("tokenExpiry");

    if (tokenExpiry) {
      const expiresAt = new Date(tokenExpiry).getTime();
      if (Number.isFinite(expiresAt) && Date.now() > expiresAt) {
        localStorage.removeItem("token");
        localStorage.removeItem("tokenExpiry");
      }
    }

    const activeToken = localStorage.getItem("token");
    if (!activeToken) {
      router.replace(`/auth?redirect=${encodeURIComponent("/events/workshop-rsvp")}`);
      return;
    }

    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;

    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/workshop-rsvp");
        const result = await response.json();

        if (!response.ok || !result?.success) {
          throw new Error(result?.message || "Failed to load workshop RSVP details.");
        }

        setConfig(result.data);
      } catch (fetchError: any) {
        setError(fetchError?.message || "Failed to load workshop RSVP details.");
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [authChecked]);

  const selectedDay = useMemo(() => {
    if (!config || !form.workshop) return "";
    return config.workshops.find((item) => item.name === form.workshop)?.day || "";
  }, [config, form.workshop]);

  const handleChange = (field: keyof typeof initialForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/workshop-rsvp/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to complete registration.");
      }

      setSuccess(result.data);
    } catch (submitError: any) {
      setError(submitError?.message || "Failed to complete registration.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setSuccess(null);
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-[#111827] via-[#1d4ed8] to-[#312e81] text-white shadow-2xl">
          <div className="grid gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-12 lg:py-14">
            <div>
              <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em]">
                Free RSVP Event
              </div>
              <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
                {config?.title || "AHIBI Workshop RSVP"}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-50 sm:text-base">
                {config?.description ||
                  "Complete your workshop registration by selecting a session and providing your attendee details. The corresponding event day will be assigned automatically."}
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-blue-100">Registration</p>
                  <p className="mt-2 text-lg font-semibold">Free</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-blue-100">Workshops</p>
                  <p className="mt-2 text-lg font-semibold">{config?.workshops?.length || 7} options</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-blue-100">Days</p>
                  <p className="mt-2 text-lg font-semibold">Day 1 to Day 3</p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/15 bg-white p-5 text-slate-900 shadow-xl sm:p-6">
              {loading ? (
                <div className="flex min-h-[420px] items-center justify-center">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>{authChecked ? "Loading workshop details..." : "Checking your session..."}</span>
                  </div>
                </div>
              ) : success ? (
                <div className="flex min-h-[420px] flex-col justify-between">
                  <div>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <CheckCircle2 className="h-9 w-9" />
                    </div>
                    <h2 className="mt-5 text-center text-2xl font-bold">Registration Confirmed</h2>
                    <p className="mt-2 text-center text-sm text-slate-500">
                      Your RSVP has been saved successfully.
                    </p>

                    <div className="mt-6 space-y-3 rounded-3xl bg-slate-50 p-5">
                      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
                        <span className="text-sm text-slate-500">Workshop</span>
                        <span className="text-right font-semibold">{success.workshop}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
                        <span className="text-sm text-slate-500">Day</span>
                        <span className="text-right font-semibold">{success.day}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
                        <span className="text-sm text-slate-500">Registration</span>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                          Confirmed
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-500">Reference</span>
                        <span className="font-mono text-sm font-semibold">{success.registrationNumber}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="mt-6 rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
                  >
                    Register another attendee
                  </button>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Workshop Registration</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Please complete the attendee details below and select your preferred workshop.
                    </p>
                  </div>

                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <User className="h-4 w-4" />
                      Name
                    </span>
                    <input
                      value={form.name}
                      onChange={(event) => handleChange("name", event.target.value)}
                      placeholder="Enter your full name"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </span>
                    <input
                      value={form.phone}
                      onChange={(event) => handleChange("phone", event.target.value)}
                      placeholder="Enter your phone number"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <MapPin className="h-4 w-4" />
                      Location
                    </span>
                    <input
                      value={form.location}
                      onChange={(event) => handleChange("location", event.target.value)}
                      placeholder="Enter your location"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <CalendarDays className="h-4 w-4" />
                      Select Workshop
                    </span>
                    <select
                      value={form.workshop}
                      onChange={(event) => handleChange("workshop", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      required
                    >
                      <option value="">Choose a workshop</option>
                      {(config?.workshops || []).map((workshop) => (
                        <option key={workshop.name} value={workshop.name}>
                          {workshop.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                      Auto-assigned day
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {selectedDay || "Select a workshop to see the assigned day"}
                    </p>
                  </div> */}

                  {error ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                  >
                    {submitting ? "Submitting..." : "Confirm Free RSVP"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">How it works</h2>
            <div className="mt-5 space-y-4">
              {[
                "Provide your name, phone number, and location.",
                "Select the workshop you would like to attend.",
                "The selected workshop is automatically assigned to Day 1, Day 2, or Day 3.",
                "Your registration is confirmed immediately as this is a complimentary event.",
              ].map((step, index) => (
                <div key={step} className="flex items-start gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-sm leading-6 text-slate-600">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Workshop schedule</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {(config?.days || []).map((item) => (
                <div key={item.day} className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">{item.day}</p>
                  <div className="mt-4 space-y-2">
                    {item.workshops.map((workshop) => (
                      <div
                        key={workshop}
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        {workshop}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section> */}
      </main>

      <Footer />
    </div>
  );
}
