import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import FloatingWhatsapp from "@/components/ui/FloatingWhatsapp"

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
        {children}
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50 }}>
       <FloatingWhatsapp />
        </div>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      </body>
    </html>
  )
}
