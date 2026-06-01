"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView } from "@/lib/analytics";

/**
 * Sends GA4 page_view on App Router navigations (no full page reload).
 * Wrap in Suspense in the root layout because useSearchParams() requires it.
 */
export function GoogleAnalyticsPageView(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    const query = searchParams.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;

    if (lastTrackedPath.current === pagePath) return;
    lastTrackedPath.current = pagePath;

    trackPageView({ pagePath });
  }, [pathname, searchParams]);

  return null;
}
