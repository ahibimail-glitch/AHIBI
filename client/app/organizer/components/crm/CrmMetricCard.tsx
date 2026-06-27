"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface CrmMetricCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  href: string;
  tone?: "default" | "success" | "warning";
}

export default function CrmMetricCard({
  label,
  value,
  icon: Icon,
  href,
  tone = "default",
}: CrmMetricCardProps) {
  const iconColor =
    tone === "success"
      ? "text-[#22c55e]"
      : tone === "warning"
        ? "text-[#f97316]"
        : "text-[#f97316]";

  return (
    <Link
      href={href}
      className="group rounded-xl border border-[#21262d] bg-[#131820] p-5 hover:border-[#f97316]/40 hover:bg-[#161b26] transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6e7681]">
          {label}
        </span>
        <Icon className={`h-4 w-4 ${iconColor} opacity-80 group-hover:opacity-100`} />
      </div>
      <div className="font-mono text-3xl font-semibold text-white">{value}</div>
    </Link>
  );
}
