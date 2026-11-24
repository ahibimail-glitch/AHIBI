"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

const FESTIVALS = [
  {
    key: "day",
    title: "Hornbill Festival",
    image: "/images/hornbill-2026/hornbill-day-desktop.jpg",
    mobileImage: "/images/hornbill-2026/hornbill-day-mobile.jpg",
    href: "/hornbill-festival-2026",
    className: "hornbill-day-card",
  },
  {
    key: "music",
    title: "Hornbill Music Festival",
    image: "/images/hornbill-2026/hornbill-music-desktop.jpg",
    mobileImage: "/images/hornbill-2026/hornbill-music-mobile.jpg",
    href: "/hornbill-music-festival-2026",
    className: "hornbill-music-card",
  },
];

export default function HornbillFestivalShowcase({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`hornbill-showcase ${compact ? "hornbill-showcase-compact" : ""}`} aria-labelledby="hornbill-showcase-title">
      <div className="hornbill-showcase-heading">
        <div>
          <span className="hornbill-kicker"><Sparkles size={14} /> NAGALAND, IN FULL COLOUR</span>
          <h2 id="hornbill-showcase-title">Two festivals. Two ways to feel it.</h2>
          <p>Choose your festival and get your pass. Each ticket price is shown clearly before checkout.</p>
        </div>
        <Image src="/images/Logo.png" alt="AHIBI" width={116} height={40} className="hornbill-ahibi-logo" />
      </div>

      <div className="hornbill-showcase-grid">
        {FESTIVALS.map((festival) => {
          return (
            <article className={`hornbill-showcase-card ${festival.className}`} key={festival.key}>
              <picture className="hornbill-showcase-art">
                <source media="(max-width: 640px)" srcSet={festival.mobileImage} />
                <img src={festival.image} alt="" />
              </picture>
              <span className="hornbill-showcase-copy">
                <Link className="hornbill-showcase-title-link" href={festival.href}><strong>{festival.title}</strong></Link>
                <Link className="hornbill-showcase-cta" href={`/api/hornbill-booking/${festival.key}`} aria-label={`Book ${festival.title} tickets`}>
                  Book now <ArrowUpRight size={18} />
                </Link>
              </span>
            </article>
          );
        })}
      </div>
      <style jsx>{`
        .hornbill-showcase{padding:clamp(38px,6vw,84px) clamp(18px,5vw,72px);background:#fff;color:#171717}
        .hornbill-showcase-compact{padding-top:34px;padding-bottom:34px}
        .hornbill-showcase-heading{max-width:1440px;margin:0 auto 25px;display:flex;justify-content:space-between;align-items:flex-end;gap:18px}
        .hornbill-kicker{display:inline-flex;align-items:center;gap:7px;color:#b21c1c;font-size:10px;font-weight:800;letter-spacing:.16em}
        .hornbill-showcase-heading h2{font-size:clamp(25px,4vw,42px);letter-spacing:-.045em;line-height:1.04;margin:12px 0 7px}
        .hornbill-showcase-heading p{margin:0;color:#686868;font-size:14px;line-height:1.5}
        .hornbill-ahibi-logo{width:clamp(76px,9vw,116px);height:auto;object-fit:contain;flex:none}
        .hornbill-showcase-grid{max-width:1440px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:18px}
        .hornbill-showcase-card{position:relative;overflow:hidden;display:flex;flex-direction:column;border-radius:22px;background:#fff;color:#171717;isolation:isolate;box-shadow:0 12px 32px #33100f18;transform:translateZ(0);transition:transform .25s,box-shadow .25s}
        .hornbill-showcase-card:hover{transform:translateY(-4px);box-shadow:0 20px 45px #33100f25}
        .hornbill-showcase-art{position:relative;display:block;width:100%;aspect-ratio:2/1;overflow:hidden;background:#3f1714}
        .hornbill-showcase-art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;transition:transform .8s cubic-bezier(.2,.7,.2,1)}
        .hornbill-showcase-card:hover .hornbill-showcase-art img{transform:scale(1.045)}
        .hornbill-showcase-copy{display:flex;flex-direction:column;align-items:flex-start;padding:21px 23px 23px;animation:hornbill-rise .7s both}
        .hornbill-showcase-title-link{color:inherit;text-decoration:none}
        .hornbill-showcase-copy strong{font-size:clamp(23px,3.2vw,34px);letter-spacing:-.055em;line-height:1.03;margin-top:7px;text-wrap:balance}
        .hornbill-showcase-copy strong{display:block}
        .hornbill-showcase-cta{display:inline-flex;align-items:center;gap:9px;margin-top:15px;padding:10px 14px;border-radius:999px;background:#ed1c24;color:white;font-size:11px;font-weight:800;transition:gap .2s,background .2s}
        .hornbill-showcase-card:hover .hornbill-showcase-cta{gap:14px;background:#ff3037}
        @keyframes hornbill-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:700px){.hornbill-showcase-heading{align-items:flex-start}.hornbill-ahibi-logo{display:none}.hornbill-showcase-grid{grid-template-columns:1fr;gap:13px}.hornbill-showcase-card{border-radius:17px}.hornbill-showcase-art{aspect-ratio:2/3}.hornbill-showcase-copy{padding:16px 18px 18px}.hornbill-showcase-copy strong{font-size:clamp(26px,8vw,35px)}}
        @media(prefers-reduced-motion:reduce){.hornbill-showcase-card,.hornbill-showcase-art img,.hornbill-showcase-copy,.hornbill-showcase-cta{animation:none!important;transition:none!important}}
      `}</style>
    </section>
  );
}
