"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, CalendarDays, Clock3, MapPin, Phone, Ticket, Trophy } from "lucide-react";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";
import type { Event, EventsResponse } from "@/types/event";
import { getNextNuscMatch, getNuscMatchSlug, NUSC_HOME_MATCHES, NUSC_MATCH_EVENT_SLUG_PREFIX } from "@/lib/nuscHomeMatches";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type PassCategory = "single-match" | "season";

const SINGLE_MATCH_PASSES = [
  {
    id: "general-single",
    name: "General Pass",
    price: "₹360 / match",
    detail: "Single match ticket",
    benefits: ["General Gallery seating", "Designated General Gates", "Digital QR ticket entry"],
  },
  {
    id: "premium-single",
    name: "Premium Pass",
    price: "₹1,416 / match",
    detail: "Single match premium experience",
    benefits: ["Reserved chair seating", "Better viewing location", "Complimentary snack box"],
  },
  {
    id: "suite-single",
    name: "United Suite — Single pass",
    price: "₹8,896 / person",
    detail: "Single person · single match",
    benefits: ["One seat in an 8-person VIP box", "Food and beverages", "Dedicated VIP entry and parking"],
  },
  {
    id: "suite-box-single",
    name: "United Suite — Full Box",
    price: "₹70,800 / match",
    detail: "One private box · up to 8 people · one match",
    benefits: ["Private VIP Box and best viewing", "Food, beverages and butler service", "Merchandise and dedicated parking"],
  },
];

const SEASON_PASSES = [
  {
    id: "general-season",
    amount: 3825.2,
    name: "General Season Pass",
    price: "₹3,825.2",
    detail: "All 10 home matches · 1 match day free",
    benefits: ["General Gallery access for all fixtures", "Early access to important match tickets"],
  },
  {
    id: "premium-season",
    amount: 12744,
    name: "Premium Season Pass",
    price: "₹12,744",
    detail: "All 10 home matches · 1 match day free",
    benefits: ["Reserved premium chair at every match", "Premium entry and snack box each match"],
  },
  {
    id: "suite-season",
    name: "United Suite — Season",
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
  const canBuySeasonPass = !!seasonTicketType &&
    seasonPassAvailableQuantity > 0 &&
    seasonPassQuantity <= Math.min(10, seasonPassAvailableQuantity);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dates = (params.get("continueDates") || "")
      .split(",")
      .filter((date) => NUSC_HOME_MATCHES.some((match) => match.date === date));
    const passId = params.get("nuscPass");
    const validPass = SINGLE_MATCH_PASSES.some((pass) => pass.id === passId);
    const completedCount = Number.parseInt(params.get("nuscCompletedCount") || "0", 10);
    const completedDate = params.get("nuscCompletedDate");
    if (dates.length > 0) setSelectedMatchDates(dates);
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
        <div className="mx-auto grid min-h-[640px] max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 lg:min-h-[720px] lg:grid-cols-[1.08fr_.92fr] lg:px-12">
          <div className="max-w-2xl">
            <Link href="/" className="mb-12 inline-flex items-center gap-2 text-sm font-medium text-white/75 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Back to Ahibi
            </Link>
            <p className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[.28em] text-[#ff6c78]">
              <span className="h-px w-8 bg-[#ff3347]" /> Indian Football League
            </p>
            <h1 className="max-w-xl text-5xl font-black leading-[.95] tracking-[-.055em] sm:text-7xl">
              NUSC <span className="text-[#ff3347]">at home.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/75 sm:text-lg">
              Ten home dates. One stadium. Come stand behind NUSC through the Indian Football League season.
            </p>
            <div className="mt-9 flex flex-wrap gap-3 text-sm">
              <a href="#fixtures" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#ed2035] px-6 font-semibold text-white transition hover:bg-[#c9172a]">
                View fixtures <ArrowDown className="h-4 w-4" />
              </a>
              <a href="#fixtures" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/35 px-6 font-semibold text-white transition hover:bg-white/10">
                Match tickets <Ticket className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-12 grid max-w-xl grid-cols-2 gap-x-8 gap-y-5 border-t border-white/20 pt-6 sm:grid-cols-3">
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

      <section className="border-b border-[#dfe3dc] bg-white">
        <div className="mx-auto grid max-w-7xl gap-0 px-5 sm:px-8 md:grid-cols-3 lg:px-12">
          <div className="flex items-center gap-4 border-b border-[#e7e9e4] py-6 md:border-b-0 md:border-r md:pr-8"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef4ec] text-[#23573a]"><CalendarDays className="h-5 w-5" /></span><div><p className="text-xs uppercase tracking-[.14em] text-[#737b73]">The season</p><p className="mt-1 font-semibold">November 2026 — March 2027</p></div></div>
          <div className="flex items-center gap-4 border-b border-[#e7e9e4] py-6 md:border-b-0 md:border-r md:px-8"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fbeded] text-[#c91c30]"><Clock3 className="h-5 w-5" /></span><div><p className="text-xs uppercase tracking-[.14em] text-[#737b73]">Every kickoff</p><p className="mt-1 font-semibold">6:30 PM</p></div></div>
          <div className="flex items-center gap-4 py-6 md:pl-8"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef4ec] text-[#23573a]"><MapPin className="h-5 w-5" /></span><div><p className="text-xs uppercase tracking-[.14em] text-[#737b73]">Home ground</p><p className="mt-1 font-semibold">Chümoukedima Football Stadium</p></div></div>
        </div>
      </section>

      <section id="fixtures" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
          <div className="max-w-md">
            <p className="text-xs font-bold uppercase tracking-[.24em] text-[#d41e32]">Mark the dates</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-.04em] sm:text-5xl">The home run.</h2>
            <p className="mt-5 leading-7 text-[#626a63]">Choose a fixture below to select its date and jump to pass options. All listed matches kick off at 6:30 PM at Chümoukedima Football Stadium.</p>
            <div className="mt-8 flex items-center gap-3 rounded-xl bg-[#eaf0e9] p-4 text-sm text-[#273c2d]"><Trophy className="h-5 w-5 shrink-0 text-[#d41e32]" /><span>Ten chances to make the home ground loud.</span></div>
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
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#c91d31]">
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
                  className="group grid grid-cols-[54px_1fr_auto] items-center gap-4 py-4 transition hover:bg-white sm:grid-cols-[70px_1fr_auto] sm:gap-6 sm:py-5"
                >
                  {row}
                </Link>
              ) : (
                <div key={match.date} className="group grid grid-cols-[54px_1fr_auto] items-center gap-4 py-4 text-left sm:grid-cols-[70px_1fr_auto] sm:gap-6 sm:py-5">{row}</div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="passes" className="scroll-mt-24 bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 border-b border-[#e2e6e1] pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[.24em] text-[#d41e32]">Choose your pass</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-.04em] sm:text-5xl">Make match day yours.</h2>
              <p className="mt-4 leading-7 text-[#626a63]">Prices are displayed as supplied for each pass option.</p>
            </div>
            <div className="rounded-xl border border-[#f0c6ca] bg-[#fff7f7] px-5 py-4 sm:max-w-sm">
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#b7192d]">Ticket sales</p>
              <p className="mt-1 font-semibold text-[#2d302d]">Tickets are live on AHIBI</p>
            </div>
          </div>

          <div role="tablist" aria-label="Ticket pass category" className="mt-8 inline-flex rounded-full bg-[#eef1ec] p-1">
            <button type="button" role="tab" aria-selected={passCategory === "single-match"} onClick={() => { setPassCategory("single-match"); setSelectedPass(null); }} className={`rounded-full px-5 py-3 text-sm font-semibold transition ${passCategory === "single-match" ? "bg-[#0b1710] text-white shadow" : "text-[#5f675f] hover:text-[#111713]"}`}>
              Single Match
            </button>
            <button type="button" role="tab" aria-selected={passCategory === "season"} onClick={() => { setPassCategory("season"); setSelectedPass(null); }} className={`rounded-full px-5 py-3 text-sm font-semibold transition ${passCategory === "season" ? "bg-[#0b1710] text-white shadow" : "text-[#5f675f] hover:text-[#111713]"}`}>
              Season Passes
            </button>
          </div>

          {passCategory === "single-match" && (
            <fieldset className="mt-7">
              <legend className="text-sm font-semibold text-[#343b35]">Choose one or more match dates</legend>
              <p className="mt-1 text-sm text-[#69716a]">Each selected match continues through its own AHIBI event checkout.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {NUSC_HOME_MATCHES.map((match) => {
                  const checked = selectedMatchDates.includes(match.date);
                  return (
                    <label key={match.date} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${checked ? "border-[#d41e32] bg-[#fff8f8] ring-1 ring-[#d41e32]" : "border-[#dfe4de] bg-white hover:border-[#b8c3b8]"}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => setSelectedMatchDates((dates) => event.target.checked ? [...dates, match.date] : dates.filter((date) => date !== match.date))}
                        className="mt-1 h-4 w-4 shrink-0 accent-[#c91d31]"
                        aria-label={`${match.label}, ${match.opponent}, ${match.time}`}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#151b16]">{match.label}</span>
                        <span className="mt-1 block text-sm text-[#4c554d]">vs {match.opponent}</span>
                        <span className="mt-1 block text-xs text-[#737b73]">{match.day} · {match.time}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          <div className={`mt-7 grid gap-4 ${passCategory === "single-match" ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
            {(passCategory === "single-match" ? SINGLE_MATCH_PASSES : SEASON_PASSES).map((pass) => {
              const selected = selectedPass === pass.id;
              const isCallToBook = pass.id === "suite-season";
              return (
                <button key={pass.id} type="button" aria-pressed={selected} onClick={() => setSelectedPass(pass.id)} className={`group flex h-full min-h-[290px] flex-col rounded-2xl border p-6 text-left transition ${selected ? "border-[#d41e32] bg-[#fff8f8] shadow-[0_12px_35px_rgba(212,30,50,0.12)] ring-1 ring-[#d41e32]" : "border-[#dfe4de] bg-white hover:-translate-y-1 hover:border-[#b8c3b8] hover:shadow-lg"}`}>
                  <span className="flex w-full items-start justify-between gap-3">
                    <span className="text-lg font-bold leading-6 text-[#151b16]">{pass.name}</span>
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? "border-[#d41e32] bg-[#d41e32]" : "border-[#c8d0c8]"}`} aria-hidden="true">{selected && <span className="h-2 w-2 rounded-full bg-white" />}</span>
                  </span>
                  {!isCallToBook && <span className="mt-5 text-2xl font-black tracking-tight text-[#111713]">{pass.price}</span>}
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
            <div id="nusc-match-checkout-options" className="mt-7 scroll-mt-24 rounded-xl border border-[#e2e6e1] bg-[#f8faf7] p-5">
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
                    <Link key={match.date} href={`/events/${event._id}/checkout?${checkoutParams.toString()}`} aria-label={`${completedMatchCount > 0 ? "Continue checkout for" : "Checkout"} NUSC vs ${match.opponent}, ${match.label}`} className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-full bg-[#d51f34] px-4 py-2 text-left text-sm font-semibold text-white transition hover:bg-[#b91629]">
                      <span>{completedMatchCount > 0 ? "Continue: " : ""}NUSC vs {match.opponent} · {match.label}</span><ArrowRight className="h-4 w-4 shrink-0" />
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
            <div className="mt-6 flex flex-col gap-4 rounded-xl border border-[#e2e6e1] bg-[#f8faf7] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <label htmlFor="season-pass-quantity" className="font-semibold text-[#151b16]">Season pass quantity</label>
                <select
                  id="season-pass-quantity"
                  value={seasonPassQuantity}
                  onChange={(event) => setSeasonPassQuantity(Number(event.target.value))}
                  className="ml-3 rounded-lg border border-[#cfd7cf] bg-white px-3 py-2"
                  aria-label="Season pass quantity"
                >
                  {Array.from({ length: Math.max(1, Math.min(10, seasonPassAvailableQuantity)) }, (_, index) => index + 1).map((quantity) => (
                    <option key={quantity} value={quantity}>{quantity}</option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-[#69716a]">Each pass covers one seat at all 10 home matches. Maximum 10 tickets per match per account.</p>
              </div>
              {canBuySeasonPass ? (
                <Link
                  href={`/nusc-home-matches/season-checkout?passId=${encodeURIComponent(selectedPass)}&quantity=${seasonPassQuantity}`}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#d51f34] px-5 text-sm font-semibold text-white transition hover:bg-[#b91629]"
                >
                  Continue to checkout <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="text-sm font-medium text-[#69716a]">Season pass sales are not available yet.</span>
              )}
            </div>
          )}
          {selectedPass === "suite-season" && (
            <div className="mt-6 flex flex-col gap-3 rounded-xl border border-[#f0d2d6] bg-[#fff8f8] p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-[#4c554d]">United Suite season bookings are by phone. Call to ask about availability and booking details.</p>
              <a href="tel:+917005427394" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#d51f34] px-5 text-sm font-semibold text-white transition hover:bg-[#b91629]">
                <Phone className="h-4 w-4" /> Call +91 7005427394
              </a>
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#0b1710] px-5 py-12 text-white sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[.22em] text-[#ff6977]">See you at the ground</p><h2 className="mt-2 text-2xl font-bold">Chümoukedima Football Stadium · 6:30 PM</h2></div>
          <Link href="/events" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/35 px-6 text-sm font-semibold transition hover:bg-white/10">Browse all events <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
