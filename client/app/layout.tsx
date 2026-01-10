import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import FloatingWhatsapp from "@/components/ui/FloatingWhatsapp"
import { VenueAuthProvider } from "@/hooks/useVenueAuth"
import { Toaster } from "@/components/ui/sonner"
import { Toaster as HotToaster } from "react-hot-toast"

const inter = Inter({ subsets: ["latin"] })

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
      <body className={inter.className}>
        <VenueAuthProvider>
          {children}
          <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 50 }}>
            <FloatingWhatsapp />
          </div>

          {/* Razorpay */}
          <Script
            id="razorpay-checkout-js"
            src="https://checkout.razorpay.com/v1/checkout.js"
          />

          {/* Google Analytics */}
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-6HK1GRM61F"
            strategy="afterInteractive"
          />
          <Script
            id="ga-gtag"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-6HK1GRM61F');
              `,
            }}
          />

          {/* Meta Pixel */}
          <Script
            id="meta-pixel"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '626872173187308');
                fbq('track', 'PageView');
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
