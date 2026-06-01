"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

import { GA_MEASUREMENT_ID } from "@/lib/analytics/constants";
import { trackPageView } from "@/lib/analytics/google-analytics";

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedUrl = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isReady || !pathname) return;

    const queryString = searchParams.toString();
    const url = queryString ? `${pathname}?${queryString}` : pathname;

    if (lastTrackedUrl.current === url) return;

    lastTrackedUrl.current = url;
    trackPageView(url);
  }, [isReady, pathname, searchParams]);

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="ga-gtag"
        strategy="afterInteractive"
        onReady={() => setIsReady(true)}
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = window.gtag || gtag;
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
          `,
        }}
      />
    </>
  );
}
