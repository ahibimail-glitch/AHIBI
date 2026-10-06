
"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";

type Workshop = {
  name: string;
  day: string;
  dateLabel?: string;
  timeLabel?: string;
  speaker?: string;
  image?: string;
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
      router.replace(
        `/auth?redirect=${encodeURIComponent("/events/workshop-rsvp")}`
      );
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
          throw new Error(
            result?.message || "Failed to load workshop RSVP details."
          );
        }

        setConfig(result.data);
      } catch (fetchError: any) {
        setError(
          fetchError?.message || "Failed to load workshop RSVP details."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [authChecked]);

  const selectedDay = useMemo(() => {
    if (!config || !form.workshop) return "";

    return (
      config.workshops.find((item) => item.name === form.workshop)?.day || ""
    );
  }, [config, form.workshop]);

  const workshopCards = useMemo(() => {
    return config?.workshops || [];
  }, [config]);

  const handleChange = (
    field: keyof typeof initialForm,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmitting(true);
    setError("");

    if (!form.workshop) {
      setError("Please select a workshop to continue.");
      setSubmitting(false);
      return;
    }

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
        throw new Error(
          result?.message || "Failed to complete registration."
        );
      }

      setSuccess(result.data);
    } catch (submitError: any) {
      setError(
        submitError?.message || "Failed to complete registration."
      );
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
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* Main Card */}
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
          <div className="bg-white px-6 py-8 sm:px-10 lg:px-12 lg:py-12">
              {loading ? (
                <div className="flex min-h-[520px] items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    </div>

                    <div className="text-center">
                      <p className="font-semibold text-slate-900">
                        Loading event
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Preparing your registration form...
                      </p>
                    </div>
                  </div>
                </div>
              ) : success ? (
                /* SUCCESS STATE */
                <div className="flex min-h-[520px] flex-col justify-center">
                  <div className="text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
                      <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                    </div>

                    <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
                      Registration Confirmed
                    </h2>

                    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                      Your workshop seat has been successfully reserved.
                    </p>
                  </div>

                  {/* Registration details */}
                  <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
                    <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Registration Details
                      </p>
                    </div>

                    <div className="divide-y divide-slate-100">
                      <div className="flex items-center justify-between gap-4 px-5 py-4">
                        <span className="text-sm text-slate-500">
                          Workshop
                        </span>
                        <span className="text-right text-sm font-semibold text-slate-900">
                          {success.workshop}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 px-5 py-4">
                        <span className="text-sm text-slate-500">
                          Event Day
                        </span>
                        <span className="text-sm font-semibold text-slate-900">
                          {success.day}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 px-5 py-4">
                        <span className="text-sm text-slate-500">
                          Status
                        </span>

                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Confirmed
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 px-5 py-4">
                        <span className="text-sm text-slate-500">
                          Reference
                        </span>

                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-800">
                          {success.registrationNumber}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Register another attendee
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                /* FORM */
                <div className="mx-auto w-full max-w-3xl">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                      Registration
                    </p>

                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                      Reserve your spot
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Enter your details and select one workshop session to attend.
                    </p>
                  </div>

                  <form
                    className="mt-8 space-y-5"
                    onSubmit={handleSubmit}
                  >
                    {/* Name */}
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">
                        Full Name
                      </span>

                      <div className="relative">
                        <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          value={form.name}
                          onChange={(event) =>
                            handleChange("name", event.target.value)
                          }
                          placeholder="Enter your full name"
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                          required
                        />
                      </div>
                    </label>

                    {/* Phone */}
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">
                        Phone Number
                      </span>

                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          value={form.phone}
                          onChange={(event) =>
                            handleChange("phone", event.target.value)
                          }
                          placeholder="Enter your phone number"
                          type="tel"
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                          required
                        />
                      </div>
                    </label>

                    {/* Location */}
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">
                        Location
                      </span>

                      <div className="relative">
                        <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          value={form.location}
                          onChange={(event) =>
                            handleChange(
                              "location",
                              event.target.value
                            )
                          }
                          placeholder="Enter your city"
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                          required
                        />
                      </div>
                    </label>

                    {/* Workshop */}
                    <div>
                      <span className="mb-2 block text-sm font-semibold text-slate-700">
                        Select Workshop
                      </span>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {workshopCards.map((workshop) => {
                          const isSelected = form.workshop === workshop.name;

                          return (
                            <button
                              key={workshop.name}
                              type="button"
                              onClick={() => handleChange("workshop", workshop.name)}
                              className={`overflow-hidden rounded-2xl border text-left transition-all focus:outline-none focus:ring-4 ${
                                isSelected
                                  ? "border-blue-500 ring-blue-500/15 shadow-lg shadow-blue-500/10"
                                  : "border-slate-200 hover:border-slate-300 hover:shadow-md focus:ring-blue-500/10"
                              }`}
                              aria-pressed={isSelected}
                            >
                              <div className="relative aspect-[3/4] overflow-hidden bg-slate-100">
                                <img
                                  src={encodeURI(workshop.image || "")}
                                  alt={workshop.name}
                                  className="h-full w-full object-cover"
                                />
                                {/* <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
                                  <p className="text-sm font-semibold text-white">
                                    {workshop.name}
                                  </p>
                                  <p className="mt-0.5 text-xs text-white/80">
                                    {workshop.day} {workshop.timeLabel ? `• ${workshop.timeLabel}` : ""}
                                  </p>
                                </div> */}
                              </div>

                              <div className="flex items-start justify-between gap-3 px-4 py-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {workshop.name}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {workshop.dateLabel} {workshop.timeLabel ? `• ${workshop.timeLabel}` : ""}
                                  </p>
                                  {workshop.speaker ? (
                                    <p className="mt-1 text-xs font-medium text-slate-600">
                                      {workshop.speaker}
                                    </p>
                                  ) : null}
                                </div>

                                <span
                                  className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                                    isSelected
                                      ? "border-blue-600 bg-blue-600"
                                      : "border-slate-300 bg-white"
                                  }`}
                                >
                                  <span
                                    className={`h-2 w-2 rounded-full ${
                                      isSelected ? "bg-white" : "bg-transparent"
                                    }`}
                                  />
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Selected day */}
                    {selectedDay && (
                      <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-600">
                            Scheduled for
                          </p>

                          <p className="mt-0.5 text-sm font-semibold text-slate-900">
                            {selectedDay}
                          </p>
                        </div>

                        <CalendarDays className="h-5 w-5 text-blue-600" />
                      </div>
                    )}

                    {/* Error */}
                    {error && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
                        {error}
                      </div>
                    )}

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 hover:shadow-blue-600/30 disabled:cursor-not-allowed disabled:bg-blue-300 disabled:shadow-none"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Confirm Free RSVP
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </button>

                    <p className="text-center text-xs leading-5 text-slate-400">
                      By registering, you confirm that the information
                      provided is accurate.
                    </p>
                  </form>
                </div>
              )}
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
