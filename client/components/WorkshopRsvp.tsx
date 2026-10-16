"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Loader2,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  Check,
  CalendarDays,
  Clock,
  Users,
  ArrowRight,
  PartyPopper,
  Ticket,
  Ban,
} from "lucide-react";

type Workshop = {
  name: string;
  day: string;
  dateLabel?: string;
  timeLabel?: string;
  startDateTime?: string;
  endDateTime?: string;
  speaker?: string;
  image?: string;
  capacity?: number | string | null;
  isClosed?: boolean;
};

type EventConfig = {
  eventId: string;
  title: string;
  slug: string;
  isFreeEvent: boolean;
  registrationLabel: string;
  description: string;
  isClosed?: boolean;
  closesAt?: string | null;
  workshops: Workshop[];
  days: Array<{ day: string; workshops: string[]; isClosed?: boolean; closesAt?: string | null }>;
};

type ConfirmedItem = {
  workshop: string;
  day: string;
  timeLabel?: string;
  reference: string;
};

const DAY_META: Record<string, string> = {
  "Day 1": "15 Oct 2026",
  "Day 2": "16 Oct 2026",
  "Day 3": "17 Oct 2026",
};

function shortReference(bookingId: string) {
  return `AWR-${String(bookingId).slice(-6).toUpperCase()}`;
}

export default function WorkshopRsvp() {
  const router = useRouter();
  const pathname = usePathname();

  const [config, setConfig] = useState<EventConfig | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [confirmed, setConfirmed] = useState<ConfirmedItem[] | null>(null);

  // ─── Auth gate ──────────────────────────────────────────────────────────────
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
      router.replace(`/auth?redirect=${encodeURIComponent(pathname || "/events/workshop-rsvp")}`);
      return;
    }

    setAuthChecked(true);
  }, [router, pathname]);

  // ─── Load workshop config ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!authChecked) return;

    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/workshop-rsvp");
        const result = await response.json();
        if (!response.ok || !result?.success) {
          throw new Error(result?.message || "Failed to load workshop details.");
        }
        setConfig(result.data);
        // Drop any selections that belong to days already closed.
        const closedNames = new Set(
          (result.data?.workshops || [])
            .filter((w: Workshop) => w.isClosed)
            .map((w: Workshop) => w.name)
        );
        if (closedNames.size > 0) {
          setSelected((prev) => prev.filter((name) => !closedNames.has(name)));
        }
      } catch (fetchError: any) {
        setError(fetchError?.message || "Failed to load workshop details.");
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [authChecked]);

  // ─── Prefill name/phone from saved profile if available ───────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        setForm((prev) => ({
          ...prev,
          name: prev.name || u?.name || "",
          phone: prev.phone || u?.phone || "",
          address: prev.address || u?.city || "",
        }));
      }
    } catch {
      /* ignore */
    }
  }, [authChecked]);

  const workshopsByDay = useMemo(() => {
    const groups: Array<{ day: string; items: Workshop[]; isClosed: boolean }> = [];
    (config?.workshops || []).forEach((w) => {
      let group = groups.find((g) => g.day === w.day);
      if (!group) {
        const dayMeta = config?.days?.find((d) => d.day === w.day);
        group = {
          day: w.day,
          items: [],
          isClosed: Boolean(w.isClosed || dayMeta?.isClosed),
        };
        groups.push(group);
      }
      group.items.push(w);
      if (w.isClosed) group.isClosed = true;
    });
    return groups;
  }, [config]);

  const openWorkshops = useMemo(
    () => (config?.workshops || []).filter((w) => !w.isClosed),
    [config]
  );

  const selectedWorkshops = useMemo(
    () => openWorkshops.filter((w) => selected.includes(w.name)),
    [openWorkshops, selected]
  );

  const toggle = (name: string) => {
    const workshop = config?.workshops?.find((w) => w.name === name);
    if (workshop?.isClosed) {
      setError(`Registration for ${workshop.day} has closed.`);
      return;
    }
    setError("");
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const validate = () => {
    if (selectedWorkshops.length === 0) {
      return openWorkshops.length === 0
        ? "Workshop RSVP has closed."
        : "Please select at least one open workshop to attend.";
    }
    if (!form.name.trim()) return "Please enter your full name.";
    const phoneDigits = form.phone.replace(/\D/g, "");
    const normalized =
      phoneDigits.length === 12 && phoneDigits.startsWith("91")
        ? phoneDigits.slice(2)
        : phoneDigits.length === 11 && phoneDigits.startsWith("0")
        ? phoneDigits.slice(1)
        : phoneDigits;
    if (!/^\d{10}$/.test(normalized)) return "Please enter a valid 10-digit phone number.";
    if (!form.address.trim()) return "Please enter your address.";
    return "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!config?.eventId) {
      setError("Workshop event is not configured correctly.");
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.push(`/auth?redirect=${encodeURIComponent(pathname || "/events/workshop-rsvp")}`);
      return;
    }

    setSubmitting(true);

    try {
      const results: ConfirmedItem[] = [];
      for (const workshop of selectedWorkshops) {
        const response = await fetch("/api/bookings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            event: config.eventId,
            quantity: 1,
            price: 0,
            ticketType: `${workshop.day} • ${workshop.name}`,
            customerName: form.name.trim(),
            customerPhone: form.phone.trim(),
            state: form.address.trim(),
            eventSnapshotStartDate: workshop.startDateTime,
            eventSnapshotEndDate: workshop.endDateTime,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(
            result?.message || `Could not register for ${workshop.name}. Please try again.`
          );
        }

        const bookingId = result?.booking?.id;
        results.push({
          workshop: workshop.name,
          day: workshop.day,
          timeLabel: workshop.timeLabel,
          reference: bookingId ? shortReference(bookingId) : "Confirmed",
        });
      }

      setConfirmed(results);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (submitError: any) {
      setError(submitError?.message || "Failed to complete registration.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelected([]);
    setForm({ name: "", phone: "", address: "" });
    setConfirmed(null);
    setError("");
  };

  // ─── Loading ──────────────────────────────────────────────────────────────────
  if (loading || !authChecked) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#faf6ef]">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#b23a33]/10">
            <Loader2 className="h-5 w-5 animate-spin text-[#b23a33]" />
          </div>
          <p className="text-sm font-medium text-[#6b5e4d]">Preparing your registration…</p>
        </div>
      </div>
    );
  }

  // ─── Fully closed after Day 3 ───────────────────────────────────────────────────
  if (config?.isClosed || (config && openWorkshops.length === 0)) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#faf6ef] px-4 py-12">
        <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-[#ecdfc9] bg-white text-center shadow-[0_24px_70px_rgba(90,60,20,0.12)]">
          <div className="bg-gradient-to-br from-[#b23a33] to-[#8f2d27] px-8 py-10 text-white">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
              <Ban className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-2xl font-bold tracking-tight">Registration closed</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/85">
              Workshop RSVP for WENN Bazaar 2026 has ended. Thank you to everyone who registered.
            </p>
          </div>
          <div className="px-6 py-6 sm:px-8">
            <button
              type="button"
              onClick={() => router.push("/events")}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#b23a33] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#8f2d27]"
            >
              Browse other events
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Success / confirmation ─────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <div className="min-h-[70vh] bg-[#faf6ef] px-4 py-12 sm:px-6">
        <div className="mx-auto w-full max-w-2xl">
          <div className="overflow-hidden rounded-[28px] border border-[#ecdfc9] bg-white shadow-[0_24px_70px_rgba(90,60,20,0.12)]">
            <div className="bg-gradient-to-br from-[#b23a33] to-[#8f2d27] px-8 py-10 text-center text-white">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                <PartyPopper className="h-10 w-10" />
              </div>
              <h2 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">You're registered!</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/85">
                Your spot{confirmed.length > 1 ? "s are" : " is"} confirmed for the WENN Bazaar 2026 workshop
                {confirmed.length > 1 ? "s" : ""} below. See you at Agri Expo, Chumoukedima.
              </p>
            </div>

            <div className="px-6 py-6 sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a08a68]">
                Your workshops ({confirmed.length})
              </p>
              <div className="mt-4 space-y-3">
                {confirmed.map((item) => (
                  <div
                    key={item.workshop}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-[#ecdfc9] bg-[#faf6ef] px-4 py-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-emerald-100">
                        <Check className="h-4 w-4 text-emerald-700" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[#2f261a]">{item.workshop}</p>
                        <p className="mt-0.5 text-xs text-[#6b5e4d]">
                          {item.day} · {DAY_META[item.day]}
                          {item.timeLabel ? ` · ${item.timeLabel}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="flex-none rounded-lg bg-white px-2.5 py-1 font-mono text-[11px] font-semibold text-[#8f2d27] ring-1 ring-[#ecdfc9]">
                      {item.reference}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => router.push("/profile")}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#b23a33] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#8f2d27]"
                >
                  <Ticket className="h-4 w-4" />
                  View on my dashboard
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#ecdfc9] bg-white px-5 py-3.5 text-sm font-semibold text-[#6b5e4d] transition hover:bg-[#faf6ef]"
                >
                  Register another
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main form ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[70vh] bg-[#faf6ef]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#e8b04b] via-[#d99a3c] to-[#b23a33]">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/85">
            WENN Bazaar 2026 · 5th Edition
          </p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Workshop RSVP
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/90 sm:text-base">
            Agri Expo, 4th Mile, Chumoukedima · 15–17 October 2026. Day 1 and Day 2 registration is
            closed. Day 3 workshops are still open — entry is free.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur">
              <CheckCircle2 className="h-4 w-4" />
              Free RSVP
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-black/20 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur">
              <Ban className="h-4 w-4" />
              Day 1 & Day 2 closed
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        {/* Workshop selection, grouped by day */}
        <div className="space-y-10">
          {workshopsByDay.map((group) => (
            <div key={group.day} className={group.isClosed ? "opacity-75" : undefined}>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white ${
                    group.isClosed ? "bg-[#8a7a66]" : "bg-[#b23a33]"
                  }`}
                >
                  {group.day}
                </span>
                <span className="text-sm font-semibold text-[#6b5e4d]">{DAY_META[group.day]}</span>
                {group.isClosed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f1e7d5] px-2.5 py-1 text-xs font-semibold text-[#6b5e4d]">
                    <Ban className="h-3 w-3" />
                    Registration closed
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((workshop) => {
                  const isClosed = Boolean(workshop.isClosed || group.isClosed);
                  const isSelected = !isClosed && selected.includes(workshop.name);
                  return (
                    <button
                      key={workshop.name}
                      type="button"
                      onClick={() => toggle(workshop.name)}
                      disabled={isClosed}
                      aria-pressed={isSelected}
                      aria-disabled={isClosed}
                      className={`group relative overflow-hidden rounded-3xl border-2 bg-white text-left transition-all focus:outline-none ${
                        isClosed
                          ? "cursor-not-allowed border-transparent opacity-70 shadow-[0_10px_30px_rgba(90,60,20,0.06)]"
                          : isSelected
                          ? "border-[#b23a33] shadow-[0_18px_50px_rgba(178,58,51,0.22)]"
                          : "border-transparent shadow-[0_10px_30px_rgba(90,60,20,0.08)] hover:border-[#ecdfc9] hover:shadow-[0_16px_40px_rgba(90,60,20,0.14)]"
                      }`}
                    >
                      {/* Selected / closed badge */}
                      <span
                        className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition ${
                          isClosed
                            ? "border-white/80 bg-[#6b5e4d] text-white"
                            : isSelected
                            ? "border-white bg-[#b23a33] text-white"
                            : "border-white/80 bg-white/70 text-transparent backdrop-blur group-hover:bg-white"
                        }`}
                      >
                        {isClosed ? <Ban className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </span>

                      <div className="relative aspect-[3/4] overflow-hidden bg-[#f1e7d5]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={encodeURI(workshop.image || "")}
                          alt={workshop.name}
                          loading="lazy"
                          className={`h-full w-full object-cover transition-transform duration-500 ${
                            isClosed ? "grayscale-[35%]" : "group-hover:scale-[1.03]"
                          }`}
                        />
                        {isClosed && (
                          <span className="absolute inset-x-0 bottom-0 bg-black/55 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-white">
                            Closed
                          </span>
                        )}
                        {isSelected && (
                          <span className="absolute inset-0 ring-4 ring-inset ring-[#b23a33]/70" />
                        )}
                      </div>

                      <div className="p-4">
                        <p className="text-sm font-bold leading-snug text-[#2f261a]">{workshop.name}</p>
                        {workshop.speaker ? (
                          <p className="mt-1 text-xs font-medium text-[#8f2d27]">{workshop.speaker}</p>
                        ) : null}

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#6b5e4d]">
                          {workshop.timeLabel ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {workshop.timeLabel}
                            </span>
                          ) : null}
                          {workshop.capacity ? (
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {typeof workshop.capacity === "number"
                                ? `${workshop.capacity} seats`
                                : workshop.capacity}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Registration form */}
        <form
          onSubmit={handleSubmit}
          className="mt-12 overflow-hidden rounded-3xl border border-[#ecdfc9] bg-white shadow-[0_18px_50px_rgba(90,60,20,0.1)]"
        >
          <div className="border-b border-[#f0e7d6] bg-[#faf6ef] px-6 py-5 sm:px-8">
            <h2 className="text-lg font-bold text-[#2f261a]">Your details</h2>
            <p className="mt-1 text-sm text-[#6b5e4d]">
              {selectedWorkshops.length > 0
                ? `${selectedWorkshops.length} workshop${selectedWorkshops.length > 1 ? "s" : ""} selected`
                : openWorkshops.length > 0
                ? (() => {
                    const openDays = [...new Set(openWorkshops.map((w) => w.day))];
                    return `Only ${openDays.join(" & ")} ${
                      openDays.length === 1 ? "is" : "are"
                    } open for RSVP. Select a workshop above, then fill in your details.`;
                  })()
                : "Registration is closed for all workshop days."}
            </p>
          </div>

          <div className="grid gap-5 px-6 py-6 sm:grid-cols-2 sm:px-8">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#3f3524]">Full Name</span>
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b9a784]" />
                <input
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Enter your full name"
                  className="h-12 w-full rounded-xl border border-[#e7dcc5] bg-white pl-11 pr-4 text-sm text-[#2f261a] outline-none transition placeholder:text-[#b9a784] hover:border-[#d8c8a6] focus:border-[#b23a33] focus:ring-4 focus:ring-[#b23a33]/10"
                  required
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#3f3524]">Phone Number</span>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b9a784]" />
                <input
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="10-digit mobile number"
                  type="tel"
                  inputMode="numeric"
                  className="h-12 w-full rounded-xl border border-[#e7dcc5] bg-white pl-11 pr-4 text-sm text-[#2f261a] outline-none transition placeholder:text-[#b9a784] hover:border-[#d8c8a6] focus:border-[#b23a33] focus:ring-4 focus:ring-[#b23a33]/10"
                  required
                />
              </div>
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-[#3f3524]">Address</span>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-[#b9a784]" />
                <textarea
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Your address (town / district, state)"
                  rows={2}
                  className="w-full rounded-xl border border-[#e7dcc5] bg-white py-3 pl-11 pr-4 text-sm text-[#2f261a] outline-none transition placeholder:text-[#b9a784] hover:border-[#d8c8a6] focus:border-[#b23a33] focus:ring-4 focus:ring-[#b23a33]/10"
                  required
                />
              </div>
            </label>
          </div>

          {/* Selected summary */}
          {selectedWorkshops.length > 0 && (
            <div className="border-t border-[#f0e7d6] bg-[#faf6ef] px-6 py-5 sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a08a68]">
                Selected workshops
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedWorkshops.map((w) => (
                  <span
                    key={w.name}
                    className="inline-flex items-center gap-2 rounded-full border border-[#ecdfc9] bg-white px-3 py-1.5 text-xs font-semibold text-[#3f3524]"
                  >
                    <CalendarDays className="h-3.5 w-3.5 text-[#b23a33]" />
                    {w.name}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(w.name);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggle(w.name);
                        }
                      }}
                      className="ml-0.5 cursor-pointer rounded-full px-1 text-[#b9a784] hover:text-[#b23a33]"
                      aria-label={`Remove ${w.name}`}
                    >
                      ×
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mx-6 mb-2 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700 sm:mx-8">
              {error}
            </div>
          )}

          <div className="px-6 pb-7 pt-4 sm:px-8">
            <button
              type="submit"
              disabled={submitting || openWorkshops.length === 0}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#b23a33] px-5 py-4 text-sm font-bold text-white shadow-lg shadow-[#b23a33]/20 transition hover:bg-[#8f2d27] disabled:cursor-not-allowed disabled:bg-[#d8a9a5] disabled:shadow-none"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirming your RSVP…
                </>
              ) : (
                <>
                  Confirm Free RSVP
                  {selectedWorkshops.length > 0 ? ` (${selectedWorkshops.length})` : ""}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
            <p className="mt-3 text-center text-xs leading-5 text-[#a08a68]">
              By registering, you confirm the information provided is accurate. You can view your
              registrations anytime on your dashboard.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
