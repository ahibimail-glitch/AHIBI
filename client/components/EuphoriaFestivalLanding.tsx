"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, CalendarDays, Check, MapPin, Tent, Ticket } from "lucide-react";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";

type PublicEvent = { _id: string; title?: string; slug?: string; startDate?: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function EuphoriaFestivalLanding() {
  const [eventId, setEventId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/events?search=Euphoria&limit=100&page=1`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const events: PublicEvent[] = Array.isArray(payload?.data?.events)
          ? payload.data.events
          : Array.isArray(payload?.events)
            ? payload.events
            : [];
        const festival = events.find((event) => {
          const label = `${event.title || ""} ${event.slug || ""}`.toLowerCase();
          return label.includes("euphoria") && label.includes("2026");
        });
        if (active) setEventId(festival?._id || null);
      })
      .catch(() => {
        if (active) setEventId(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const bookingHref = eventId ? `/events/${eventId}` : "/events?search=Euphoria";

  return (
    <main className="euphoria-page">
      <Navbar />
      <section className="euphoria-hero" aria-labelledby="euphoria-title">
        <picture className="euphoria-artwork">
          <source media="(max-width: 700px)" srcSet="/euphoria/euphoria-mobile.jpeg" />
          <img src="/euphoria/euphoria-desktop.jpeg" alt="Euphoria Festival, 11–13 December 2026 at Avora Resort, Nagaland" fetchPriority="high" />
        </picture>
        <div className="euphoria-shade" />
        <div className="euphoria-hero-copy">
          <span className="euphoria-kicker"><span /> FIRST EDITION · NAGALAND</span>
          <h1 id="euphoria-title">Three days.<br />One wild escape.</h1>
          <p>Music · Culture · Sports · Lifestyle</p>
          <a className="euphoria-cta" href="#passes">Explore tickets <ArrowDown size={17} /></a>
        </div>
        <div className="euphoria-date-pill"><CalendarDays size={17} /> 11–13 December 2026</div>
      </section>

      <section className="euphoria-intro">
        <div>
          <span className="euphoria-eyebrow">THE FIRST EVER FESTIVAL IN NAGALAND</span>
          <h2>Make a weekend of it.</h2>
          <p>Spend three December days at Avora Resort for music, culture, competitions, DJ nights, riverside camping and more.</p>
        </div>
        <div className="euphoria-place"><MapPin size={19} /><span><strong>Avora Resort</strong><br />Seitheke Basa, Chümoukedima, Nagaland</span></div>
      </section>

      <section className="euphoria-pricing" id="passes">
        <div className="euphoria-section-heading">
          <span className="euphoria-eyebrow">CHOOSE YOUR FESTIVAL EXPERIENCE</span>
          <h2>Tickets & camping</h2>
          <p>Two-day passes cover consecutive days. Camping can be booked with or without a tent.</p>
        </div>
        <div className="euphoria-cards">
          <article className="euphoria-card euphoria-ticket-card">
            <div className="euphoria-card-icon"><Ticket size={20} /></div>
            <p className="euphoria-card-label">FESTIVAL ENTRY</p>
            <h3>Day passes</h3>
            <div className="euphoria-price-list">
              <div><span>1 day</span><strong>₹200</strong></div>
              <div><span>2 consecutive days</span><strong>₹400</strong></div>
              <div><span>All 3 days</span><strong>₹600</strong></div>
            </div>
            <p className="euphoria-card-note">Entry pass per person</p>
            <Link href={bookingHref} className="euphoria-card-link">View event & tickets <ArrowRight size={16} /></Link>
          </article>

          <article className="euphoria-card">
            <div className="euphoria-card-icon"><Tent size={20} /></div>
            <p className="euphoria-card-label">SLEEP UNDER THE STARS</p>
            <h3>Camping without a tent</h3>
            <div className="euphoria-price-list">
              <div><span>Per person, per night</span><strong>₹500</strong></div>
            </div>
            <p className="euphoria-card-note">Choose one, two or three nights. Festival entry is priced separately.</p>
            <div className="euphoria-included"><Check size={15} /> No tent booking required</div>
          </article>

          <article className="euphoria-card euphoria-tent-card">
            <div className="euphoria-card-icon"><Tent size={20} /></div>
            <p className="euphoria-card-label">TENT CAMPING</p>
            <h3>Book a tent</h3>
            <div className="euphoria-price-list">
              <div><span>1 night · per tent</span><strong>₹1,500</strong></div>
              <div><span>2 nights · per tent</span><strong>₹2,000</strong></div>
              <div><span>3 nights · per tent</span><strong>₹3,000</strong></div>
            </div>
            <p className="euphoria-card-note">Anyone can book a tent and camp. Festival entry is priced separately.</p>
            <Link href={bookingHref} className="euphoria-card-link">View event & tickets <ArrowRight size={16} /></Link>
          </article>
        </div>
        <p className="euphoria-capacity"><Tent size={16} /> Camping is limited to 1,000 spaces per night.</p>
        {!eventId && <p className="euphoria-booking-status" role="status">Online booking is being connected. You can view the festival listing on AHIBI.</p>}
      </section>

      <section className="euphoria-highlights">
        <div><span className="euphoria-eyebrow">THREE DAYS OF</span><h2>Big energy.<br />Open skies.</h2><p>Bring your people, find your rhythm and make the riverside your home for the weekend.</p></div>
        <ul>
          {["Solo Dance Battle", "Rap Battle", "Miss & Mr. Euphoria 2026", "Cosplay Competition", "Sand Volleyball", "Amateur Boxing", "Arm Wrestling & Tug-of-War", "DJ Nights, Bull Ride & Ethnic Food"].map((item) => <li key={item}><Check size={16} />{item}</li>)}
        </ul>
      </section>

      <section className="euphoria-bottom-cta">
        <p className="euphoria-eyebrow">11–13 DECEMBER 2026 · AVORA RESORT</p>
        <h2>Your December story starts here.</h2>
        <Link href={bookingHref} className="euphoria-cta">{eventId ? "See event details" : "Find Euphoria on AHIBI"}<ArrowRight size={17} /></Link>
      </section>
      <Footer />

      <style jsx>{`
        .euphoria-page{min-height:100vh;background:#f5f8f3;color:#123b35;overflow:hidden}
        .euphoria-hero{height:min(850px,calc(100svh - 65px));min-height:620px;position:relative;isolation:isolate;background:#267d72;display:flex;align-items:flex-end}
        .euphoria-artwork,.euphoria-artwork img{position:absolute;inset:0;width:100%;height:100%}
        .euphoria-artwork img{object-fit:cover;object-position:center;animation:euphoria-reveal 1s ease-out both}
        .euphoria-shade{position:absolute;inset:0;background:linear-gradient(90deg,#072e2bce 0%,#0b39307a 45%,transparent 85%),linear-gradient(0deg,#092a2790 0%,transparent 55%)}
        .euphoria-hero-copy{position:relative;color:#fff;padding:70px clamp(24px,8vw,120px);max-width:900px;animation:euphoria-rise .75s .1s both}
        .euphoria-kicker{display:flex;align-items:center;gap:10px;font-size:11px;font-weight:800;letter-spacing:.18em}.euphoria-kicker span{width:8px;height:8px;background:#ffd77b;border-radius:50%;box-shadow:0 0 15px #ffd77b}
        .euphoria-hero h1{font-size:clamp(48px,8vw,100px);line-height:.92;letter-spacing:-.065em;margin:24px 0 14px;text-wrap:balance}
        .euphoria-hero-copy>p{font-size:clamp(13px,2vw,19px);letter-spacing:.2em;font-weight:750;text-transform:uppercase}
        .euphoria-cta{display:inline-flex;align-items:center;gap:10px;border-radius:999px;background:#a83c25;color:#fff;text-decoration:none;padding:15px 21px;font-size:13px;font-weight:800;box-shadow:0 12px 30px #102f2d42;transition:transform .2s,background .2s}.euphoria-cta:hover{transform:translateY(-2px);background:#8d301e}
        .euphoria-hero-copy .euphoria-cta{margin-top:22px}
        .euphoria-date-pill{position:absolute;right:clamp(20px,7vw,100px);top:36px;display:flex;align-items:center;gap:8px;border:1px solid #ffffff70;border-radius:999px;background:#123d3585;color:#fff;padding:12px 17px;font-size:12px;font-weight:750;backdrop-filter:blur(10px)}
        .euphoria-intro{max-width:1120px;margin:auto;padding:82px 24px 70px;display:flex;align-items:flex-end;justify-content:space-between;gap:35px}
        .euphoria-eyebrow{font-size:10px;line-height:1.4;font-weight:900;letter-spacing:.17em;color:#a33c28}
        .euphoria-intro h2,.euphoria-section-heading h2,.euphoria-highlights h2,.euphoria-bottom-cta h2{font-size:clamp(35px,5vw,59px);line-height:1;letter-spacing:-.06em;margin:14px 0}
        .euphoria-intro p,.euphoria-highlights p{max-width:590px;color:#5c7068;line-height:1.7;font-size:15px}
        .euphoria-place{display:flex;gap:10px;align-items:flex-start;min-width:245px;font-size:12px;line-height:1.7;color:#63756f}.euphoria-place :global(svg){color:#a33c28;flex:none;margin-top:3px}.euphoria-place strong{font-size:14px;color:#163b34}
        .euphoria-pricing{background:#e8f0e8;padding:82px 24px 78px}
        .euphoria-section-heading{text-align:center;max-width:690px;margin:0 auto 34px}.euphoria-section-heading p{margin:0;color:#5e7068;font-size:14px;line-height:1.6}
        .euphoria-cards{max-width:1120px;margin:auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
        .euphoria-card{background:#fff;border:1px solid #dbe6dc;border-radius:20px;padding:25px;box-shadow:0 14px 35px #153e3410;display:flex;flex-direction:column;min-height:375px}
        .euphoria-ticket-card{border-color:#cfad6e;box-shadow:0 18px 45px #85622318}.euphoria-tent-card{background:#123b35;color:#fff;border-color:#123b35}
        .euphoria-card-icon{width:42px;height:42px;border-radius:13px;background:#e8f0e8;color:#a33c28;display:grid;place-items:center}.euphoria-tent-card .euphoria-card-icon{background:#ffffff18;color:#ffe49a}
        .euphoria-card-label{font-size:9px;font-weight:900;letter-spacing:.16em;color:#a33c28;margin:20px 0 5px}.euphoria-tent-card .euphoria-card-label{color:#f3d68a}
        .euphoria-card h3{font-size:23px;letter-spacing:-.04em;margin:0 0 16px}.euphoria-price-list{display:grid;gap:0;border-top:1px solid #e5ece5}.euphoria-price-list>div{display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid #e5ece5;padding:13px 0;font-size:13px}.euphoria-price-list span{color:#65776f}.euphoria-price-list strong{font-size:17px;color:#153e35;white-space:nowrap}.euphoria-tent-card .euphoria-price-list{border-color:#ffffff2a}.euphoria-tent-card .euphoria-price-list>div{border-color:#ffffff2a}.euphoria-tent-card .euphoria-price-list span{color:#d2e1d8}.euphoria-tent-card .euphoria-price-list strong{color:#fff}
        .euphoria-card-note{font-size:11px;color:#77877f;line-height:1.55;margin:12px 0}.euphoria-tent-card .euphoria-card-note{color:#d2e1d8}
        .euphoria-card-link{display:inline-flex;align-items:center;gap:7px;margin-top:auto;padding-top:14px;color:#a33c28;text-decoration:none;font-size:12px;font-weight:850}.euphoria-tent-card .euphoria-card-link{color:#ffe49a}
        .euphoria-included{display:flex;align-items:center;gap:7px;color:#446d4d;font-size:11px;font-weight:750;margin-top:auto;padding-top:12px}
        .euphoria-capacity{display:flex;justify-content:center;align-items:center;gap:8px;color:#4d6759;font-size:12px;font-weight:750;margin:24px 0 0}.euphoria-capacity :global(svg){color:#a33c28}
        .euphoria-booking-status{text-align:center;font-size:12px;color:#65776f;margin:13px 0 0}
        .euphoria-highlights{max-width:1120px;margin:auto;padding:92px 24px;display:grid;grid-template-columns:1fr 1fr;gap:70px;align-items:center}.euphoria-highlights h2{font-size:clamp(44px,6vw,72px)}
        .