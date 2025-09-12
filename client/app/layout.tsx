import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import FloatingWhatsapp from "@/components/ui/FloatingWhatsapp"
import { VenueAuthProvider } from "@/hooks/useVenueAuth"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Ahibi - Next-Gen Event Management",
  description: "Mobile-first ticketing and event management ecosystem for seamless event experiences",
    generator: 'v0.dev'
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
          <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50 }}>
            <FloatingWhatsapp />
          </div>
          <Script id="razorpay-checkout-js" src="https://checkout.razorpay.com/v1/checkout.js" />
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
        </VenueAuthProvider>
      </body>
    </html>
  )
}
