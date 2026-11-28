"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, ShieldCheck, Ticket } from "lucide-react";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";

const festivals = {
  day: {
    title: "Hornbill Festival",
    image: "/images/hornbill-2026/hornbill-day-desktop.jpg",
    mobileImage: "/images/hornbill-2026/hornbill-day-mobile.jpg",
    ticketFee: 100,
    fund: 50,
    total: 150,
    dateLabel: "December 1–10, 2026",
    venue: "The Naga Heritage Village, Kohima",
    color: "#8c2419",
  },
  music: {
    title: "Hornbill Music Festival",
    image: "/images/hornbill-2026/hornbill-music-desktop.jpg",
    mobileImage: "/images/hornbill-2026/hornbill-music-mobile.jpg",
    ticketFee: 150,
    fund: 50,
    total: 200,
    dateLabel: "December 2–10, 2026",
    venue: "The Naga Heritage Village, Kohima",
    color: "#9a1031",
  },
} as const;

export default function Hornbill2026Landing({ kind }: { kind: "day" | "music" }) {
  const festival = festivals[kind];
  const [bookingUnavailable, setBookingUnavailable] = useState(false);
  const bookingHref = `/book-hornbill/${kind}`;

  useEffect(() => {
    setBookingUnavailable(new URLSearchParams(window.location.search).get("booking") === "unavailable");
  }, []);

  return (
    <main className="hornbill-landing" style={{ "--festival-color": festival.color } as CSSProperties}>
      <Navbar />
      <section className="hornbill-landing-hero" aria-labelledby="festival-title">
        <picture className="hornbill-landing-banner">
          <source media="(max-width: 640px)" srcSet={festival.mobileImage} />
          <img src={festival.image} alt={`${festival.title} 2026 official event banner`} fetchPriority="high" />
        </picture>
        <div className="hornbill-landing-overlay" />
        <div className="hornbill-landing-intro">
          <h1 id="festival-title">{festival.title}</h1>
          {bookingUnavailable && <p className="hornbill-booking-unavailable" role="status">Online booking is being set up. Please check back shortly.</p>}
          <div className="hornbill-landing-actions">
            <Link className="hornbill-primary-action" href={bookingHref}><Ticket size={18} /> Book now <ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>

      <section className="hornbill-ticket-section" id="festival-ticket">
        <div className="hornbill-ticket-heading">
          <span>ONE PRICE FOR EVERYONE</span>
          <h2>Choose your festival ticket</h2>
          <p>Local, domestic and international visitors pay the same price. Choose ticket quantity at checkout.</p>
        </div>
        <div className="hornbill-ticket-card">
          <div className="hornbill-ticket-card-top"><span><Ticket size={17} /> General admission</span><span>1 person</span></div>
          <div className="hornbill-ticket-amount">₹{festival.total}</div>
          <div className="hornbill-ticket-lines">
            <div><span>Ticket fee</span><strong>₹{festival.ticketFee}</strong></div>
            <div><span>Festival Sustainability Fund</span><strong>₹{festival.fund}</strong></div>
          </div>
          <div className="hornbill-ticket-total"><span>Total per person</span><strong>₹{festival.total}</strong></div>
          <p className="hornbill-fund-note"><ShieldCheck size={15} /> The Festival Sustainability Fund is shown separately in your ticket price.</p>
          <Link href={bookingHref} className="hornbill-details-link">Book now — ₹{festival.total} per person <ArrowRight size={16} /></Link>
        </div>
        <div className="hornbill-date-strip">
          <div><CalendarDays size={18} /><span>{festival.dateLabel}</span></div>
          <div><MapPin size={18} /><span>{festival.venue}</span></div>
        </div>
      </section>

      <section className="hornbill-separate-note">
        <Image src="/images/LogoB.png" alt="AHIBI" width={88} height={38} />
        <p>Hornbill Festival daytime entry and Hornbill Music Festival nighttime entry are separate experiences. Each requires its own ticket.</p>
      </section>

      <style jsx>{`
        .hornbill-landing{background:#fff;color:#171717;min-height:100vh;overflow:hidden}
        .hornbill-landing-hero{position:relative;min-height:clamp(620px,70vw,830px);display:flex;align-items:flex-end;isolation:isolate;overflow:hidden;background:#25110e}
        .hornbill-landing-banner,.hornbill-landing-banner img{position:absolute;inset:0;width:100%;height:100%}
        .hornbill-landing-banner img{object-fit:cover;object-position:center;animation:festival-reveal 1.1s ease-out both}
        .hornbill-landing-overlay{position:absolute;inset:0;background:linear-gradient(90deg,#100807d9 0%,#17090685 45%,#17090612 100%),linear-gradient(0deg,#0d0606a6 0%,transparent 60%)}
        .hornbill-landing-tag{position:absolute;top:35px;left:clamp(22px,7vw,100px);display:flex;align-items:center;gap:9px;color:#fff;font-size:10px;font-weight:800;letter-spacing:.17em}
        .hornbill-landing-tag span{width:8px;height:8px;border-radius:50%;background:#ffd66e;box-shadow:0 0 15px #ffd66e;animation:glow 2s ease-in-out infinite}
        .hornbill-landing-intro{position:relative;max-width:780px;padding:145px clamp(22px,7vw,100px) 80px;color:white;animation:festival-rise .8s .15s both}
        .hornbill-landing-intro h1{margin:15px 0 8px;font-size:clamp(48px,8.2vw,112px);line-height:.91;letter-spacing:-.075em;text-wrap:balance}
        .hornbill-landing-actions{display:flex;align-items:center;gap:22px;flex-wrap:wrap;margin-top:27px}
        .hornbill-primary-action{display:inline-flex;align-items:center;gap:10px;border:0;border-radius:999px;padding:15px 19px;background:#ed1c24;color:white;font-size:13px;font-weight:800;text-decoration:none;box-shadow:0 10px 35px #ed1c2444;transition:transform .2s,box-shadow .2s}
        a.hornbill-primary-action:hover{transform:translateY(-3px);box-shadow:0 14px 40px #ed1c2466}

        .hornbill-booking-unavailable{display:inline-flex;align-items:center;min-height:48px;border-radius:999px;padding:12px 18px;background:#2c1715d9;color:#fff;font-size:13px;font-weight:700}

        .hornbill-ticket-section{max-width:1100px;margin:auto;padding:clamp(62px,9vw,112px) 22px}
        .hornbill-ticket-heading{text-align:center;margin-bottom:32px}
        .hornbill-ticket-heading>span{color:var(--festival-color);font-size:10px;font-weight:850;letter-spacing:.18em}
        .hornbill-ticket-heading h2{margin:12px 0 8px;font-size:clamp(32px,5vw,54px);letter-spacing:-.06em}
        .hornbill-ticket-heading p{margin:0;color:#6b6b6b;font-size:14px}
        .hornbill-ticket-card{max-width:570px;margin:auto;padding:clamp(22px,4vw,38px);border:1px solid #e9e3df;border-radius:22px;background:linear-gradient(140deg,#fff 55%,#fff7ef);box-shadow:0 18px 55px #35161012;animation:festival-rise .7s .25s both}
        .hornbill-ticket-card-top{display:flex;justify-content:space-between;gap:12px;align-items:center;color:#5d5a58;font-size:12px}
        .hornbill-ticket-card-top span:first-child{display:inline-flex;align-items:center;gap:8px;font-weight:750;color:#292321}
        .hornbill-ticket-card-top span:last-child{color:#86807b}
        .hornbill-ticket-amount{margin-top:14px;font-size:52px;font-weight:900;letter-spacing:-.08em;color:var(--festival-color)}
        .hornbill-ticket-lines{padding:17px 0 13px;border-top:1px dashed #d9d1cc;display:grid;gap:11px}
        .hornbill-ticket-lines>div,.hornbill-ticket-total{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:13px}
        .hornbill-ticket-lines span{color:#625f5c}.hornbill-ticket-lines strong{color:#24211f}
        .hornbill-ticket-total{padding-top:15px;border-top:1px solid #ebe5e1;font-weight:850;font-size:14px}
        .hornbill-fund-note{display:flex;align-items:flex-start;gap:7px;color:#79716c;font-size:11px;line-height:1.45;margin:15px 0 0}
        .hornbill-fund-note :global(svg){flex:none;color:var(--festival-color)}
        .hornbill-details-link{display:inline-flex;align-items:center;gap:7px;margin-top:20px;color:var(--festival-color);font-size:12px;font-weight:800;text-decoration:none}
        .hornbill-date-strip{max-width:570px;margin:15px auto 0;display:flex;justify-content:center;gap:12px 28px;flex-wrap:wrap;color:#6e6966;font-size:12px}
        .hornbill-date-strip div{display:flex;align-items:center;gap:8px}.hornbill-date-strip :global(svg){color:var(--festival-color)}
        .hornbill-separate-note{display:flex;align-items:center;justify-content:center;gap:18px;padding:21px 22px 38px;color:#777;font-size:11px;text-align:left}
        .hornbill-separate-note img{width:82px;height:auto;object-fit:contain;flex:none}
        .hornbill-separate-note p{max-width:520px;line-height:1.5}
        @keyframes festival-rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes festival-reveal{from{opacity:.6;transform:scale(1.035)}to{opacity:1;transform:scale(1)}}
        @media(max-width:640px){.hornbill-landing-hero{min-height:100svh;max-height:900px}.hornbill-landing-overlay{background:linear-gradient(0deg,#100706df 4%,#1508066b 52%,#17090610 100%)}.hornbill-landing-intro{padding:160px 22px 58px}.hornbill-ticket-section{padding-top:58px}.hornbill-separate-note{align-items:flex-start;justify-content:flex-start}}
        @media(prefers-reduced-motion:reduce){.hornbill-landing-banner img,.hornbill-landing-intro,.hornbill-ticket-card{animation:none!important;transition:none!important}}
      `}</style>
      <Footer />
    </main>
  );
}
