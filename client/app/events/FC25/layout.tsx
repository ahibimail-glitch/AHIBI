import type React from "react"
import type { Metadata } from "next"
import "./global.css"


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11" async></script>
      </head>
      <body className="font-sans" style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
        {children}
      </body>
    </html>
  )
}
