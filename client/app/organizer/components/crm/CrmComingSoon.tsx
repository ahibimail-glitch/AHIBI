"use client";

import type { LucideIcon } from "lucide-react";

interface CrmComingSoonProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export default function CrmComingSoon({ title, description, icon: Icon }: CrmComingSoonProps) {
  return (
    <div className="rounded-xl border border-[#21262d] bg-[#131820] p-8 sm:p-12 text-center max-w-lg mx-auto">
      <div className="mx-auto mb-5 w-14 h-14 rounded-xl bg-[#1e2433] flex items-center justify-center">
        <Icon className="h-7 w-7 text-[#f97316]" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
      <p className="text-sm text-[#8b949e] mb-4">{description}</p>
      <p className="text-xs text-[#6e7681]">This section is coming soon.</p>
    </div>
  );
}
