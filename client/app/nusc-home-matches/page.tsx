"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, CalendarDays, Clock3, MapPin, Phone, Ticket, Trophy } from "lucide-react";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";
import type { Event, EventsResponse } from "@/types/event";
import { getNextNuscMatch, getNuscMatchSlug, NUSC_HOME_MATCHES, NUSC_MATCH_EVENT_SLUG_PREFIX } from "@/lib/nuscHomeMatches";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type PassCategory = "single-match" | "season";
const GENERAL_ZONES = ["G-1", "G-2", "G-3", "G-4", "G-5"] as const;
type GeneralZone = typeof GENERAL_ZONES[number];

const SINGLE_MATCH_PASSES = [
  {
    id: "general-single",
    name: "General Pass",
    price: "₹358.80 / match",
    actualPrice: "₹299 / Match",
    detail: "Single match ticket",
    benefits: ["General Gallery seating", "Designated General Gates", "Digital QR ticket entry"],
  },
  {
    id: "premium-single",
    name: "Premium Pass",
    price: "₹1,500 / match",
    actualPrice: "₹1,250 / Match",
    detail: "Single match premium experience",
    benefits: ["Reserved chair seating", "Better viewing location", "Complimentary snack box"],
  },
  {
    id: "suite-single",
    name: "United Suite — Single pass",
    price: "₹7,200 / person",
    actualPrice: "₹6,000 / Person",
    detail: "Single person · single match",
    benefits: ["One seat in an 8-person VIP box", "Food and beverages", "Dedicated VIP entry and parking"],
  },
  {
    id: "suite-box-single",
    name: "United Suite — Full Box",
    price: "₹60,000 / match",
    actualPrice: "₹50,000 / Match",
    detail: "One private box · up to 8 people · one match",
    benefits: ["Private VIP Box and best viewing", "Food, beverages and butler service", "Merchandise and dedicated parking"],
  },
];

const SEASON_PASSES = [
  {
    id: "general-season",
    amount: 3240,
    name: "General Season Pass",
    price: "₹3,240",
    actualPrice: "₹2,700",
    detail: "All 10 home matches · 1 match day free",
    benefits: ["General Gallery access for all fixtures", "Early access to important match tickets"],
  },
  {
    id: "premium-season",
    amount: 10800,
    name: "Premium Season Pass",
    price: "₹10,800",
    actualPrice: "₹9,000",
    detail: "All 10 home matches · 1 match day free",
    benefits: ["Reserved premium chair at every match", "Premium entry and snack box each match"],
  },
  {
    id: "suite-season",
    name: "United Suite — Season",
    price: "₹4,50,000",
    detail: "All 10 home matches · call to book",
    benefits: ["One reserved box for up to 8 guests at every match", "Hospitality, parking and merchandise", "Season-long VIP experiences"],
  },
];

const NUSC_PASS_TICKET_TYPES: Record<string, string> = {
  "general-single": "General Pass",
  "premium-single": "Premium Pass",
  "suite-single": "United Suite — Single pass",
  "suite-box-single": "United Suite — Full Box",
};

export default function NuscHomeMatchesPage() {
  const [matchEvents, setMatchEvents] = useState<Record<string, Event>>({});
  const [passCategory, setPassCategory] = useState<PassCategory>("single-match");
  const [selectedPass, setSelectedPass] = useState<string | null>(null);
  const [selectedMatchDates, setSelectedMatchDates] = useState<string[]>([]);
  const [seasonPassQuantity, setSeasonPassQuantity] = useState(1);
  const [seasonPassZone, setSeasonPassZone] = useState<GeneralZone | "">("");
  const shouldScrollToPassOptions = useRef(false);
  const [completedMatchCount, setCompletedMatchCount] = useState(0);
  const [lastCompletedMatchDate, setLastCompletedMatchDate] = useState<string | null>(null);
  const nextMatch = getNextNuscMatch();
  const seasonTicketType = selectedPass === "general-season"
    ? "General Pass"
    : selectedPass === "premium-season"
      ? "Premium Pass"
      : null;
  const seasonPassAvailableQuantity = seasonTicketType
    ? Math.min(...NUSC_HOME_MATCHES.map((match) => {
      const event = matchEvents[getNuscMatchSlug(match.date)];
      const ticket = event?.ticketTypes?.find((item) => item.name === seasonTicketType);
      return Number(ticket?.quantity || 0);
    }))
    : 0;
  const canBuySeasonPassQuantity = !!seasonTicketType && seasonPassAvailableQuantity > 0 &&
    seasonPassQuantity <= Math.min(10, seasonPassAvailableQuantity);
  const seasonZoneAvailability = (zoneName: GeneralZone) => {
    const availability = NUSC_HOME_MATCHES.map((match) => {
      const event = matchEvents[getNuscMatchSlug(match.date)];
      const ticket = event?.ticketTypes?.find((item) => item.name === "General Pass") as
        { zones?: Array<{ name: string; available: number }> } | undefined;
      return ticket?.zones?.find((zone) => zone.name === zoneName)?.available;
    });
    return availability.every((value) => typeof value === "number")
      ? Math.min(...availability as number[])
      : null;
  };
  const canBuySeasonPass = canBuySeasonPassQuantity &&
    (selectedPass !== "general-season" || (!!seasonPassZone && (seasonZoneAvailability(seasonPassZone) ?? 0) >= seasonPassQuantity));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dates = (params.get("continueDates") || "")
      .split(",")
      .filter((date) => NUSC_HOME_MATCHES.some((match) => match.date === date));
    const passId = params.get("nuscPass");
    const validPass = SINGLE_MATCH_PASSES.some((pass) => pass.id === passId);
    const completedCount = Number.parseInt(params.get("nuscCompletedCount") || "0", 10);
    const completedDate = params.get("nuscCompletedDate");
    if (dates.length > 0) {
      setSelectedMatchDates(dates);
      if (validPass) shouldScrollToPassOptions.current = true;
    }
    if (Number.isInteger(completedCount) && completedCount > 0) setCompletedMatchCount(completedCount);
    if (NUSC_HOME_MATCHES.some((match) => match.date === completedDate)) {
      setLastCompletedMatchDate(completedDate);
    }
    if (validPass) {
      setPassCategory("single-match");
      setSelectedPass(passId);
    }
  }, []);

  useEffect(() => {
    if (!shouldScrollToPassOptions.current || !selectedMatchDates.length || !selectedPass || completedMatchCount > 0) return;
    shouldScrollToPassOptions.current = false;
    document.getElementById("pass-card-options")?.scrollIntoView({ block: "start" });
  }, [selectedMatchDates.length, selectedPass, completedMatchCount]);

  useEffect(() => {
    if (completedMatchCount > 0) {
      document.getElementById("nusc-match-checkout-options")?.scrollIntoView({ block: "start" });
    }
  }, [completedMatchCount]);

  useEffect(() => {
    let cancelled = false;

    const loadMatchEvents = async () => {
      try {
        const response = await fetch(`${API_URL}/api/events?limit=10000&includePast=true`, { cache: "no-store" });
        if (!response.ok) return;
        const result: EventsResponse = await response.json();
        const events = result.data?.events || [];
        const indexed = Object.fromEntries(
          events
            .filter((event) => event.slug?.startsWith(NUSC_MATCH_EVENT_SLUG_PREFIX))
            .map((event) => [event.slug!, event])
        );
        if (!cancelled) setMatchEvents(indexed);
      } catch {
        // Keep the fixture list visible if event booking data is unavailable.
      }
    };

    loadMatchEvents();
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="min-h-screen bg-[#f4f5f1] text-[#111713]">
      <Navbar />

      <section className="relative isolate overflow-hidden bg-[#07120d] text-white">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_28%,rgba(210,24,48,0.2),transparent_42%)]" />
        <div aria-hidden="true" className="absolute -right-40 -top-44 -z-10 h-[34rem] w-[34rem] rounded-full border border-white/10" />
        <div aria-hidden="true" className="absolute -right-20 -top-24 -z-10 h-[27rem] w-[27rem] rounded-full border border-white/[0.07]" />
        <div className="mx-auto grid min-h-0 max-w-7xl items-center gap-8 px-5 py-10 sm:gap-10 sm:px-8 sm:py-16 lg:min-h-[720px] lg:grid-cols-[1.08fr_.92fr] lg:px-12">
          <div className="max-w-2xl">
            <Link href="/" className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-white/75 transition hover:text-white sm:mb-12">
              <ArrowLeft className="h-4 w-4" /> Back to Ahibi
            </Link>
            <p className="mb-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.22em] text-[#ff6c78] sm:mb-5 sm:text-xs sm:tracking-[.28em]">
              <span className="h-px w-8 bg-[#ff3347]" /> Indian Football League
            </p>
            <h1 className="max-w-xl text-[clamp(3rem,13vw,4.5rem)] font-black leading-[.95] tracking-[-.055em] sm:text-7xl">
              NUSC <span className="text-[#ff3347]">at home.</span>
            </h1>
            <p className="mt-4 hidden max-w-lg text-[15px] leading-6 text-white/75 sm:mt-6 sm:block sm:text-lg sm:leading-7">
              Ten home dates. One stadium. Come stand behind NUSC through the Indian Football League season.
            </p>
            <div className="mt-7 grid grid-cols-2 gap-3 text-[13px] sm:mt-9 sm:flex sm:flex-wrap sm:text-sm">
              <a href="#passes" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#ed2035] px-3 font-semibold text-white transition hover:bg-[#c9172a] sm:hidden">
                Choose tickets <ArrowDown className="h-4 w-4" />
              </a>
              <a href="#fixtures" className="hidden min-h-12 items-center justify-center gap-2 rounded-full bg-[#ed2035] px-3 font-semibold text-white transition hover:bg-[#c9172a] sm:inline-flex sm:px-6">
                View fixtures <ArrowDown className="h-4 w-4" />
              </a>
              <a href="#passes" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/35 px-3 font-semibold text-white transition hover:bg-white/10 sm:hidden">
                Match tickets <Ticket className="h-4 w-4" />
              </a>
              <a href="#fixtures" className="hidden min-h-12 items-center justify-center gap-2 rounded-full border border-white/35 px-3 font-semibold text-white transition hover:bg-white/10 sm:inline-flex sm:px-6">
                Match tickets <Ticket className="h-4 w-4" />
              </a>
            </div>
            <div className="relative mx-auto mt-8 w-full max-w-[370px] sm:max-w-[440px] lg:hidden">
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/20 shadow-2xl shadow-black/50">
                <Image src="/images/match-2.jpeg" alt="NUSC vs Gokulam Kerala FC, 14 November 2026 at 6:30 PM" fill priority sizes="(max-width: 640px) calc(100vw - 40px), 440px" className="object-cover" />
              </div>
            </div>
            <div className="mt-8 hidden max-w-xl grid-cols-2 gap-x-5 gap-y-5 border-t border-white/20 pt-5 sm:mt-12 sm:grid sm:grid-cols-3 sm:gap-x-8 sm:pt-6">
              <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-white/45">Next match</p><p className="mt-2 font-semibold">{nextMatch.label}</p><p className="mt-1 text-sm text-white/65">vs {nextMatch.opponent}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-white/45">Kickoff</p><p className="mt-2 font-semibold">6:30 PM</p></div>
              <div className="col-span-2 sm:col-span-1"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-white/45">Ground</p><p className="mt-2 font-semibold">Chümoukedima Football Stadium</p></div>
            </div>
          </div>

          <div className="relative mx-auto hidden w-full max-w-[370px] lg:block">
            <div className="absolute -inset-5 rounded-[2rem] border border-white/10" />
            <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/20 shadow-2xl shadow-black/50">
              <Image src="/images/match-1.jpeg" alt="NUSC vs Gokulam Kerala FC, 14 November 2026 at 6:30 PM" fill priority sizes="370px" className="object-cover" />
            </div>
            <div className="absolute -bottom-5 -left-8 rounded-xl border border-white/10 bg-[#101e16]/95 px-5 py-4 shadow-xl backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-white/50">Next home match</p>
              <p className="mt-1 text-lg font-bold">vs {nextMatch.opponent} <span className="text-[#ff3347]">· {nextMatch.time}</span></p>
            </div>
          </div>
        </div>
      </section>

      <section className="hidden border-b border-[#dfe3dc] bg-white md:block">
        <div className="mx-auto grid max-w-7xl gap-0 px-5 sm:px-8 md:grid-cols-3 lg:px-12">
          <div className="flex items-center gap-4 border-b border-[#e7e9e4] py-6 md:border-b-0 md:border-r md:pr-8"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef4ec] text-[#23573a]"><CalendarDays className="h-5 w-5" /></span><div><p className="text-xs uppercase tracking-[.14em] text-[#737b73]">The season</p><p className="mt-1 font-semibold">November 2026 — March 2027</p></div></div>
          <div className="flex items-center gap-4 border-b border-[#e7e9e4] py-6 md:border-b-0 md:border-r md:px-8"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fbeded] text-[#c91c30]"><Clock3 className="h-5 w-5" /></span><div><p className="text-xs uppercase tracking-[.14em] text-[#737b73]">Every kickoff</p><p className="mt-1 font-semibold">6:30 PM</p></div></div>
          <div className="flex items-center gap-4 py-6 md:pl-8"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef4ec] text-[#23573a]"><MapPin className="h-5 w-5" /></span><div><p className="text-xs uppercase tracking-[.14em] text-[#737b73]">Home ground</p><p className="mt-1 font-semibold">Chümoukedima Football Stadium</p></div></div>
        </div>
      </section>

      <section id="fixtures" className="hidden mx-auto max-w-7xl px-5 py-12 sm:block sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="grid gap-7 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
          <div className="max-w-md">
            <p className="text-xs font-bold uppercase tracking-[.24em] text-[#d41e32]">Mark the dates</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-.04em] sm:mt-4 sm:text-5xl">The home run.</h2>
            <p className="mt-4 text-[15px] leading-6 text-[#626a63] sm:mt-5 sm:leading-7">Choose a fixture below to select its date and jump to pass options. All listed matches kick off at 6:30 PM at Chümoukedima Football Stadium.</p>
            <div className="mt-5 flex items-center gap-3 rounded-xl bg-[#eaf0e9] p-4 text-sm text-[#273c2d] sm:mt-8"><Trophy className="h-5 w-5 shrink-0 text-[#d41e32]" /><span>Ten chances to make the home ground loud.</span></div>
          </div>
          <div className="divide-y divide-[#dce1db] border-y border-[#dce1db]">
            {NUSC_HOME_MATCHES.map((match) => {
              const [year, monthNumber, dayNumber] = match.date.split("-");
              const month = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(Number(year), Number(monthNumber) - 1, 1)));
              const event = matchEvents[getNuscMatchSlug(match.date)];
              const row = (
                <>
                  <span className="text-center"><span className="block text-[10px] font-bold uppercase tracking-[.14em] text-[#737b73]">{month}</span><span className="mt-0.5 block text-2xl font-black tracking-tight">{dayNumber}</span></span>
                  <span><span className="block font-semibold">NUSC vs {match.opponent}</span><span className="mt-1 block text-sm text-[#707970]">{match.label} · {match.day} · {match.time}</span></span>
                  <span className="col-span-2 flex items-center justify-between gap-2 text-sm font-semibold text-[#c91d31] sm:col-span-1 sm:justify-self-auto">
                    {event ? "Book tickets" : "Tickets soon"}
                    {event && <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d9dfd8] text-[#535e55] transition group-hover:border-[#d41e32] group-hover:bg-[#d41e32] group-hover:text-white"><ArrowRight className="h-4 w-4" /></span>}
                  </span>
                </>
              );
              return event ? (
                <Link
                  key={match.date}
                  href="#passes"
                  onClick={() => {
                    setPassCategory("single-match");
                    setSelectedPass(null);
                    setSelectedMatchDates([match.date]);
                  }}
                  className="group grid grid-cols-[42px_1fr] items-center gap-x-3 gap-y-2 py-4 transition hover:bg-white sm:grid-cols-[70px_1fr_auto] sm:gap-6 sm:py-5"
                >
                  {row}
                </Link>
              ) : (
                <div key={match.date} className="group grid grid-cols-[42px_1fr] items-center gap-x-3 gap-y-2 py-4 text-left sm:grid-cols-[70px_1fr_auto] sm:gap-6 sm:py-5">{row}</div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="passes" className="scroll-mt-20 bg-white px-5 py-12 sm:scroll-mt-24 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 border-b border-[#e2e6e1] pb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:pb-8">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[.24em] text-[#d41e32]">NUSC home match tickets</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-.04em] sm:mt-4 sm:text-5xl">Make match day yours.</h2>
              <p className="mt-3 text-[15px] leading-6 text-[#626a63] sm:mt-4 sm:leading-7">Prices are displayed as supplied for each pass option.</p>
            </div>
            <div className="rounded-xl border border-[#f0c6ca] bg-[#fff7f7] px-5 py-4 sm:max-w-sm">
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#b7192d]">Ticket sales</p>
              <p className="mt-1 font-semibold text-[#2d302d]">Tickets are live on AHIBI</p>
            </div>
          </div>

          <div role="tablist" aria-label="Ticket pass category" className="mt-6 grid w-full grid-cols-2 rounded-full bg-[#eef1ec] p-1 sm:mt-8 sm:inline-flex sm:w-auto">
            <button type="button" role="tab" aria-selected={passCategory === "single-match"} onClick={() => { setPassCategory("single-match"); setSelectedPass(null); }} className={`min-h-11 rounded-full px-3 py-3 text-[13px] font-semibold transition sm:px-5 sm:text-sm ${passCategory === "single-match" ? "bg-[#0b1710] text-white shadow" : "text-[#5f675f] hover:text-[#111713]"}`}>
              Single Match
            </button>
            <button type="button" role="tab" aria-selected={passCategory === "season"} onClick={() => { setPassCategory("season"); setSelectedPass(null); }} className={`min-h-11 rounded-full px-3 py-3 text-[13px] font-semibold transition sm:px-5 sm:text-sm ${passCategory === "season" ? "bg-[#0b1710] text-white shadow" : "text-[#5f675f] hover:text-[#111713]"}`}>
              Season Passes
            </button>
          </div>

          {passCategory === "single-match" && (
            <fieldset className="mt-7">
              <legend className="text-sm font-semibold text-[#343b35]">Step 1 · Choose match dates</legend>
              <p className="mt-1 text-sm leading-5 text-[#69716a]">Select one or more matches. Next, choose a pass below.</p>
              {selectedMatchDates.length > 0 && (
                <Link
                  href="#pass-card-options"
                  className="mt-3 inline-flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-[#0b1710] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1b3022] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d41e32] sm:hidden"
                >
                  <span>{selectedMatchDates.length} {selectedMatchDates.length === 1 ? "match" : "matches"} selected · Continue to passes</span>
                  <ArrowDown className="h-4 w-4 shrink-0" />
                </Link>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-5">
                {NUSC_HOME_MATCHES.map((match) => {
                  const checked = selectedMatchDates.includes(match.date);
                  return (
                    <label key={match.date} className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 transition sm:gap-3 sm:p-4 ${checked ? "border-[#d41e32] bg-[#fff8f8] ring-1 ring-[#d41e32]" : "border-[#dfe4de] bg-white hover:border-[#b8c3b8]"}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => setSelectedMatchDates((dates) => event.target.checked ? [...dates, match.date] : dates.filter((date) => date !== match.date))}
                        className="mt-0.5 h-5 w-5 shrink-0 accent-[#c91d31]"
                        aria-label={`${match.label}, ${match.opponent}, ${match.time}`}
                      />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold leading-5 text-[#151b16] sm:text-sm">{match.label}</span>
                        <span className="mt-1 block text-[13px] leading-5 text-[#4c554d] sm:text-sm">vs {match.opponent}</span>
                        <span className="mt-1 block text-xs text-[#737b73]">{match.day} · {match.time}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {passCategory === "single-match" ? (
            <p id="pass-card-options" className="mb-3 mt-6 scroll-mt-20 text-sm font-semibold text-[#343b35] sm:mb-4 sm:mt-7">Step 2 · Choose a pass for your selected matches</p>
          ) : (
            <p id="pass-card-options" className="mb-3 mt-6 scroll-mt-20 text-sm font-semibold text-[#343b35] sm:mb-4 sm:mt-7">Choose your season pass</p>
          )}
          <div className={`grid gap-3 sm:gap-4 ${passCategory === "single-match" ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
            {(passCategory === "single-match" ? SINGLE_MATCH_PASSES : SEASON_PASSES).map((pass) => {
              const selected = selectedPass === pass.id;
              const isCallToBook = pass.id === "suite-season";
              return (
              <button key={pass.id} type="button" aria-pressed={selected} onClick={() => setSelectedPass(pass.id)} className={`group flex h-full min-h-0 flex-col rounded-2xl border p-5 text-left transition sm:min-h-[290px] sm:p-6 ${selected ? "border-[#d41e32] bg-[#fff8f8] shadow-[0_12px_35px_rgba(212,30,50,0.12)] ring-1 ring-[#d41e32]" : "border-[#dfe4de] bg-white hover:-translate-y-1 hover:border-[#b8c3b8] hover:shadow-lg"}`}>
                  <span className="flex w-full items-start justify-between gap-3">
                    <span className="text-lg font-bold leading-6 text-[#151b16]">{pass.name}</span>
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? "border-[#d41e32] bg-[#d41e32]" : "border-[#c8d0c8]"}`} aria-hidden="true">{selected && <span className="h-2 w-2 rounded-full bg-white" />}</span>
                  </span>
                  {"actualPrice" in pass && <span className="mt-5 text-lg font-bold text-[#111713]">Actual Price: {pass.actualPrice}</span>}
                  <span className="mt-1 text-sm font-medium text-[#69716a]">{pass.detail}</span>
                  <span className="my-5 h-px w-full bg-[#e7ebe6]" />
                  <span className="space-y-2 text-sm leading-5 text-[#4c554d]">
                    {pass.benefits.map((benefit) => <span key={benefit} className="flex gap-2"><span className="text-[#d41e32]">✓</span><span>{benefit}</span></span>)}
                  </span>
                  {isCallToBook && <span className="mt-auto pt-5 text-sm font-bold text-[#b7192d]">Call to book</span>}
                </button>
              );
            })}
          </div>

          {selectedPass?.startsWith("suite-") && (
            <p className="mt-5 max-w-3xl text-sm leading-6 text-[#69716a]">
              United Suite has 4 boxes with space for up to 8 people each. A full-box booking reserves one box for that match; a single pass uses one seat. A season booking reserves one box across all 10 home matches.
            </p>
          )}

          {passCategory === "single-match" && selectedMatchDates.length > 0 && (
            <div id="nusc-match-checkout-options" className="mt-6 scroll-mt-20 rounded-xl border border-[#e2e6e1] bg-[#f8faf7] p-4 sm:mt-7 sm:scroll-mt-24 sm:p-5">
              <p className="font-semibold text-[#151b16]">
                {selectedPass && `${SINGLE_MATCH_PASSES.find((pass) => pass.id === selectedPass)?.name} · `}
                {completedMatchCount > 0
                  ? `${selectedMatchDates.length} ${selectedMatchDates.length === 1 ? "match checkout" : "match checkouts"} remaining`
                  : `${selectedMatchDates.length} ${selectedMatchDates.length === 1 ? "match date" : "match dates"} selected`}
              </p>
              {completedMatchCount > 0 && (
                <div role="status" aria-live="polite" className="mt-4 rounded-lg border border-[#b8d8bf] bg-[#edf7ef] p-4 text-[#173e24]">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold">
                    <span>Checkout progress</span>
                    <span>{completedMatchCount} of {completedMatchCount + selectedMatchDates.length} complete</span>
                  </div>
                  {lastCompletedMatchDate && (
                    <p className="mt-2 text-sm">
                      Ticket confirmed: NUSC vs {NUSC_HOME_MATCHES.find((match) => match.date === lastCompletedMatchDate)?.opponent} · {NUSC_HOME_MATCHES.find((match) => match.date === lastCompletedMatchDate)?.label}.
                    </p>
                  )}
                  <p className="mt-1 text-sm leading-6">
                    {selectedMatchDates.length === 1
                      ? "1 fixture checkout remains. Continue below to complete your selected matches."
                      : `${selectedMatchDates.length} fixture checkouts remain. Continue below to complete your selected matches.`}
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#d3e6d7]" role="progressbar" aria-label="Selected match checkouts completed" aria-valuemin={0} aria-valuemax={completedMatchCount + selectedMatchDates.length} aria-valuenow={completedMatchCount}>
                    <div className="h-full rounded-full bg-[#26713a]" style={{ width: `${(completedMatchCount / (completedMatchCount + selectedMatchDates.length)) * 100}%` }} />
                  </div>
                </div>
              )}
              <p className="mt-1 text-sm leading-6 text-[#69716a]">
                {completedMatchCount > 0
                  ? "Each remaining match has its own AHIBI checkout and payment."
                  : selectedPass
                  ? "Each match has a separate AHIBI checkout. Your selected pass will be preselected; confirm the quantity and complete checkout for each date."
                  : "Choose a pass to continue. Each match will use its own AHIBI checkout."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {NUSC_HOME_MATCHES.filter((match) => selectedMatchDates.includes(match.date)).map((match) => {
                  const event = matchEvents[getNuscMatchSlug(match.date)];
                  const selectedTicketName = selectedPass ? NUSC_PASS_TICKET_TYPES[selectedPass] : undefined;
                  const selectedTicket = selectedTicketName
                    ? event?.ticketTypes?.find((ticket) => ticket.name === selectedTicketName)
                    : undefined;
                  const hasSelectedTicket = !!selectedTicket && selectedTicket.quantity > (selectedTicket.sold || 0);
                  const checkoutParams = new URLSearchParams({
                    nuscPass: selectedPass || "",
                    nuscDates: selectedMatchDates.join(","),
                  });
                  if (completedMatchCount > 0) checkoutParams.set("nuscCompletedCount", String(completedMatchCount));
                  if (lastCompletedMatchDate) checkoutParams.set("nuscCompletedDate", lastCompletedMatchDate);
                  return event && selectedPass && hasSelectedTicket ? (
                    <Link key={match.date} href={`/events/${event._id}/checkout?${checkoutParams.toString()}`} aria-label={`${completedMatchCount > 0 ? "Continue checkout for" : "Checkout"} NUSC vs ${match.opponent}, ${match.label}`} className="inline-flex min-h-12 w-full max-w-full items-center justify-between gap-3 rounded-xl bg-[#d51f34] px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-[#b91629] sm:w-auto sm:rounded-full sm:py-2">
                      <span className="min-w-0 leading-5">{completedMatchCount > 0 ? "Continue: " : ""}NUSC vs {match.opponent} · {match.label}</span><ArrowRight className="h-4 w-4 shrink-0" />
                    </Link>
                  ) : event && !selectedPass ? (
                    <span key={match.date} className="inline-flex min-h-10 items-center rounded-full bg-[#ecefea] px-4 text-sm font-medium text-[#6d756e]">
                      NUSC vs {match.opponent} · Choose a pass
                    </span>
                  ) : event && selectedPass && !selectedTicket ? (
                    <span key={match.date} className="inline-flex min-h-10 items-center rounded-full bg-[#ecefea] px-4 text-sm font-medium text-[#6d756e]">
                      NUSC vs {match.opponent} · Tickets soon
                    </span>
                  ) : event && selectedPass && !hasSelectedTicket ? (
                    <span key={match.date} className="inline-flex min-h-10 items-center rounded-full bg-[#ecefea] px-4 text-sm font-medium text-[#6d756e]">
                      NUSC vs {match.opponent} · {selectedTicket?.quantity === 0 && selectedTicket?.sold === 0 ? "Tickets soon" : "Sold out"}
                    </span>
                  ) : (
                    <span key={match.date} className="inline-flex min-h-10 items-center rounded-full bg-[#ecefea] px-4 text-sm font-medium text-[#6d756e]">
                      NUSC vs {match.opponent} · Tickets soon
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {selectedPass && (selectedPass === "general-season" || selectedPass === "premium-season") && passCategory === "season" && (
            <div className="mt-6 flex flex-col gap-4 rounded-xl border border-[#e2e6e1] bg-[#f8faf7] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <label htmlFor="season-pass-quantity" className="font-semibold text-[#151b16]">Season pass quantity</label>
                <select
                  id="season-pass-quantity"
                  value={seasonPassQuantity}
                  onChange={(event) => setSeasonPassQuantity(Number(event.target.value))}
                  className="ml-2 min-h-11 rounded-lg border border-[#cfd7cf] bg-white px-3 py-2 sm:ml-3"
                  aria-label="Season pass quantity"
                >
                  {Array.from({ length: Math.max(1, Math.min(10, seasonPassAvailableQuantity)) }, (_, index) => index + 1).map((quantity) => (
                    <option key={quantity} value={quantity}>{quantity}</option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-[#69716a]">Each pass covers one seat at all 10 home matches. Maximum 10 tickets per match per account.</p>
                {selectedPass === "general-season" && (
                  <div className="mt-5 max-w-xl">
                    <label htmlFor="general-season-zone" className="block font-semibold text-[#151b16]">General seating zone <span className="text-[#d51f34]">*</span></label>
                    <select
                      id="general-season-zone"
                      value={seasonPassZone}
                      onChange={(event) => setSeasonPassZone(event.target.value as GeneralZone | "")}
                      className="mt-2 min-h-11 w-full rounded-lg border border-[#cfd7cf] bg-white px-3"
                    >
                      <option value="">Choose a zone</option>
                      {GENERAL_ZONES.map((zone) => {
                        const available = seasonZoneAvailability(zone);
                        return <option key={zone} value={zone} disabled={available === null || available < seasonPassQuantity}>{zone}{available === null ? " · availability loading" : ` · ${available} seats across all 10 matches`}</option>;
                      })}
                    </select>
                    <p className="mt-2 text-sm text-[#69716a]">All 10 match tickets for each pass will use this zone.</p>
                    <figure className="mt-4">
                      <figcaption className="mb-2 text-sm font-semibold text-[#151b16]">Stadium seating map</figcaption>
                      <Image src="/images/site-map.webp" alt="Stadium seating map showing General zones G-1 through G-5" width={1600} height={900} sizes="(max-width: 640px) calc(100vw - 64px), 560px" className="h-auto w-full max-w-xl rounded-lg border border-[#dfe4de]" />
                    </figure>
                  </div>
                )}
              </div>
              {canBuySeasonPass ? (
                <Link
                  href={`/nusc-home-matches/season-checkout?passId=${encodeURIComponent(selectedPass)}&quantity=${seasonPassQuantity}${selectedPass === "general-season" ? `&zone=${encodeURIComponent(seasonPassZone)}` : ""}`}
                  className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#d51f34] px-5 text-sm font-semibold text-white transition hover:bg-[#b91629] sm:w-auto sm:rounded-full sm:min-h-11"
                >
                  Continue to checkout <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="text-sm font-medium text-[#69716a]">
                  {canBuySeasonPassQuantity && selectedPass === "general-season"
                    ? "Choose a zone with enough seats across all 10 matches."
                    : "Season pass sales are not available yet."}
                </span>
              )}
            </div>
          )}
          {selectedPass === "suite-season" && (
            <div className="mt-6 flex flex-col gap-3 rounded-xl border border-[#f0d2d6] bg-[#fff8f8] p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-[#4c554d]">United Suite season bookings are by phone. Call to ask about availability and booking details.</p>
              <a href="tel:+917005427394" className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#d51f34] px-5 text-sm font-semibold text-white transition hover:bg-[#b91629] sm:w-auto sm:rounded-full sm:min-h-11">
                <Phone className="h-4 w-4" /> Call +91 7005427394
              </a>
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#0b1710] px-5 py-12 text-white sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
          <div><p className="text-xs font-bold uppercase tracking-[.22em] text-[#ff6977]">See you at the ground</p><h2 className="mt-2 text-2xl font-bold">Chümoukedima Football Stadium · 6:30 PM</h2></div>
          <Link href="/events" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-white/35 px-6 text-sm font-semibold transition hover:bg-white/10 sm:w-auto">Browse all events <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
