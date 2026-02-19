"use client"

import { useRef } from "react"
import { useScroll, useTransform, motion } from "framer-motion"
import Link from "next/link"

const HERO_CARDS = [
  {
    badge: "EVENTS",
    heading: "Post your own",
    accent: "listings",
    sub: "Fast setup. Live in under",
    subBold: "5 minutes.",
    href: "/allOrganizers",
    dotColor: "#e6cfc7",
  },
  {
    badge: "VENUE",
    heading: "List your",
    accent: "Venue Space",
    sub: "The right audience. Live in under",
    subBold: "5 minutes.",
    href: "/allVenues",
    dotColor: "#c7d8e6",
  },
  {
    badge: "ARTIST",
    heading: "Showcase your",
    accent: "artistic talent",
    sub: "Reach more fans. Live in under",
    subBold: "5 minutes.",
    href: "/allArtists",
    dotColor: "#d4e6c7",
  },
  {
    badge: "SPORTS",
    heading: "Post your",
    accent: "sports events",
    sub: "Fill the stands. Live in under",
    subBold: "5 minutes.",
    href: "/sports",
    dotColor: "#e6c7c7",
  },
]

// Each transition uses CARD_VH of scroll; last card only needs LAST_VH to land
const CARD_VH  = 65
const LAST_VH  = 12
const TOTAL_VH = (HERO_CARDS.length - 1) * CARD_VH + LAST_VH

function buildRanges(): [number, number][] {
  const ranges: [number, number][] = []
  let cursor = 0
  for (let i = 0; i < HERO_CARDS.length; i++) {
    const seg = i < HERO_CARDS.length - 1 ? CARD_VH : LAST_VH
    ranges.push([cursor / TOTAL_VH, (cursor + seg) / TOTAL_VH])
    cursor += seg
  }
  return ranges
}
const RANGES = buildRanges()

function StickyCard({
  i,
  badge,
  heading,
  accent,
  sub,
  subBold,
  href,
  dotColor,
  progress,
  range,
  targetScale,
}: (typeof HERO_CARDS)[number] & {
  i: number
  progress: ReturnType<typeof useScroll>["scrollYProgress"]
  range: [number, number]
  targetScale: number
}) {
  const scale = useTransform(progress, range, [1, targetScale])

  return (
    <div
      className="sticky flex items-start justify-center "
      style={{ top: `${i * 24}px` }}
    >
      <motion.section
        style={{ scale, transformOrigin: "top center", background: "#fff" }}
        className="relative w-full overflow-hidden rounded-2xl py-16 sm:py-20 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.10)]"
      >
        {/* Dotted background — identical to original sections */}
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage: `radial-gradient(${dotColor} 1px, transparent 1px)`,
            backgroundSize: "18px 18px",
          }}
        />

        <div className="relative z-10 mx-auto max-w-2xl px-4 text-center">
          <div className="inline-block rounded bg-black px-4 py-1 text-lg font-semibold tracking-widest text-white">
            {badge}
          </div>

          <h1 className="mt-6 text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
            {heading}{" "}
            <span className="text-red-600">{accent}</span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-gray-600">
            {sub}{" "}
            <span className="font-semibold text-gray-900">{subBold}</span>
          </p>

          <div className="mt-8">
            <Link href={href}>
              <button className="rounded-full bg-red-600 px-10 py-4 text-sm sm:text-base font-semibold text-white shadow-lg hover:bg-red-700 transition">
                GET STARTED
              </button>
            </Link>
          </div>
        </div>
      </motion.section>
    </div>
  )
}

export default function StickyHeroCards() {
  const container = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end end"],
  })

  return (
    <div
      ref={container}
      style={{ height: `${TOTAL_VH}vh` }}
      className="relative"
    >
      {HERO_CARDS.map((card, i) => {
        const targetScale =
          i === HERO_CARDS.length - 1
            ? 1
            : 1 - (HERO_CARDS.length - i - 1) * 0.04

        return (
          <StickyCard
            key={card.badge}
            i={i}
            {...card}
            progress={scrollYProgress}
            range={RANGES[i]}
            targetScale={targetScale}
          />
        )
      })}
    </div>
  )
}