import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Ticket, ArrowLeft, Mail, Clock, Smartphone } from "lucide-react"
import Link from "next/link"
import Footer from "../Footer"
import Navbar from "../Navbar"

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        {/* <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Ticket className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Ahibi</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div> */}
        <Navbar/>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Shipping & Delivery Policy</h1>
            <p className="text-muted-foreground">Effective Date: January 1, 2024</p>
          </div>

          <div className="prose prose-lg max-w-none space-y-8">
            <div>
              <p className="text-lg text-muted-foreground mb-6">
                This Shipping & Delivery Policy outlines how digital products such as event tickets, booking
                confirmations, and related services are delivered through the Ahibi platform.
              </p>
              <p className="text-lg text-muted-foreground mb-8">
                Ahibi is operated by KAKI (CHISHIKAKI CREATIVE SOLUTIONS (OPC) PRIVATE LIMITED), based in Dimapur,
                Nagaland, India.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Smartphone className="mr-2 h-5 w-5" />
                  1. Digital-Only Delivery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Ahibi is a fully digital platform. We do not ship or deliver any physical goods. All services,
                  including ticket purchases, artist bookings, and venue confirmations, are delivered electronically.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Ticket className="mr-2 h-5 w-5" />
                  2. Ticket Delivery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Once you complete a successful payment for an event:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>A digital ticket or confirmation will be sent to your registered email address.</li>
                  <li>
                    The ticket will also be available under your "My Tickets" section within your Ahibi user account.
                  </li>
                  <li>You are responsible for ensuring that your email address is accurate and accessible.</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  3. Delivery Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Digital confirmations are typically sent within 5 minutes of a successful transaction. In rare cases,
                  it may take up to 30 minutes due to network or server delays.
                </p>
                <div>
                  <p className="mb-2">If you do not receive your ticket or booking confirmation:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Please check your email spam or promotions folder.</li>
                    <li>Log in to your Ahibi account to check your ticket dashboard.</li>
                    <li>Contact our support team if the issue persists.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Artist and Venue Bookings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">For organizers:</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>
                      Artist or venue booking confirmations will be visible in your organizer dashboard upon approval.
                    </li>
                    <li>Ahibi will notify all parties involved through email or in-app notifications.</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">For artists and venue owners:</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Booking requests and confirmations can be tracked within your respective dashboards.</li>
                    <li>Notifications and messages will be delivered via email and in-app alerts.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Failed Deliveries</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2">
                  If a digital delivery fails due to incorrect email information or technical issues:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Please notify our support team immediately.</li>
                  <li>We will verify the transaction and resend the ticket or booking confirmation to your account.</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. No Physical Shipping</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Ahibi does not offer physical delivery of tickets, wristbands, merchandise, or printed material unless
                  agreed upon by all parties involved. All services and confirmations are delivered electronically.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="mr-2 h-5 w-5" />
                  7. Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  If you experience any delay or issue with receiving your tickets or confirmations, please reach out to
                  us:
                </p>
                <div className="space-y-2">
                  <p>
                    <strong>KAKI (CHISHIKAKI CREATIVE SOLUTIONS (OPC) PRIVATE LIMITED)</strong>
                  </p>
                  <p>Dimapur, Nagaland, India</p>
                  <p>Email: connect@ahibi.in</p>
                  <p>Phone: +91 7005727288</p>
                  <p>Live Chat: Available on the AHIBI website during business hours</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer/>
    </div>
  )
}
