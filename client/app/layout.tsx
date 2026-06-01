import type React from "react"
import { Suspense } from "react"
import type { Metadata } from "next"
import Script from "next/script"
import "./globals.css"
import ConditionalFloatingChat from "@/components/ConditionalFloatingChat"
import GoogleAnalytics from "@/components/GoogleAnalytics"
import { VenueAuthProvider } from "@/hooks/useVenueAuth"
import { Toaster } from "@/components/ui/sonner"
import { Toaster as HotToaster } from "react-hot-toast"

export const metadata: Metadata = {
  title: "Ahibi - Next-Gen Event Management",
  description:
    "Mobile-first ticketing and event management ecosystem for seamless event experiences",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <VenueAuthProvider>
          {children}
          <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 50 }}>
            <ConditionalFloatingChat />
          </div>

          {/* Razorpay */}
          <Script
            id="razorpay-checkout-js"
            src="https://checkout.razorpay.com/v1/checkout.js"
          />

          <Suspense fallback={null}>
            <GoogleAnalytics />
          </Suspense>

          {/* Meta Pixel */}
          <Script
            id="meta-pixel-lib"
            src="https://connect.facebook.net/en_US/fbevents.js"
            strategy="afterInteractive"
          />
          <Script
            id="meta-pixel-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.fbq = window.fbq || function () {
                  (window.fbq.q = window.fbq.q || []).push(arguments);
                };
                window._fbq = window._fbq || window.fbq;
                window.fbq.loaded = true;
                window.fbq.version = '2.0';
                window.fbq('init', '626872173187308');
                window.fbq('track', 'PageView');
              `,
            }}
          />
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src="https://www.facebook.com/tr?id=626872173187308&ev=PageView&noscript=1"
            />
          </noscript>
        </VenueAuthProvider>
        <Toaster />
        <HotToaster position="top-right" />
      </body>
    </html>
  )
}
