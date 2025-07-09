import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Ticket, ArrowLeft, RefreshCw, AlertCircle, Clock } from "lucide-react"
import Link from "next/link"
import Footer from "../Footer"
import Navbar from "../Navbar"

export default function RefundPage() {
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
            <h1 className="text-4xl font-bold mb-4">Refund Policy</h1>
            <p className="text-muted-foreground">Effective Date: January 1, 2024</p>
          </div>

          <div className="prose prose-lg max-w-none space-y-8">
            <div>
              <p className="text-lg text-muted-foreground mb-6">
                This Refund Policy outlines the conditions under which refunds are applicable for services booked
                through the Ahibi platform.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                Ahibi is operated by KAKI (CHISHIKAKI CREATIVE SOLUTIONS (OPC) PRIVATE LIMITED), based in Dimapur,
                Nagaland, India.
              </p>
              <p className="text-lg text-muted-foreground mb-8">
                By using the Ahibi platform, you agree to the terms outlined below.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <RefreshCw className="mr-2 h-5 w-5" />
                  1. General Refund Policy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Ahibi is a digital platform that facilitates event ticket sales, artist bookings, and venue listings.
                  We do not directly organize events. Refunds are subject to the refund policies of individual event
                  organizers, artists, or venue owners.
                </p>
                <div>
                  <p className="mb-2">Ahibi only processes refunds in the following cases:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>The event is cancelled by the organizer</li>
                    <li>The event is rescheduled and you cannot attend the new date</li>
                    <li>The artist or venue cancels after a confirmed booking</li>
                    <li>The transaction was duplicated or charged in error</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Event Ticket Refunds</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    All ticket sales are final unless the organizer has clearly stated a refund option on the event
                    page.
                  </li>
                  <li>
                    If an event is cancelled or rescheduled, Ahibi will notify you by email and offer instructions for
                    claiming a refund if eligible.
                  </li>
                  <li>
                    Service or convenience fees charged at the time of booking are non-refundable unless otherwise
                    stated.
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Artist and Venue Booking Refunds</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">For organizers:</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>
                      Booking fees for artists or venues are refundable only if the artist or venue cancels the
                      confirmed engagement or fails to appear.
                    </li>
                    <li>
                      Partial refunds may be considered in cases of breach of agreement or failure to deliver agreed
                      services.
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">For artists and venues:</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>
                      Booking cancellations made by the organizer after confirmation may be subject to refund deductions
                      based on platform policies and notice period.
                    </li>
                    <li>Disputes will be reviewed on a case-by-case basis by the Ahibi support team.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  4. Refund Process
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2">If you are eligible for a refund:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Contact our support team within 72 hours of the event cancellation or issue</li>
                  <li>Provide your booking ID, email address, and reason for refund</li>
                  <li>
                    Approved refunds will be processed back to your original payment method within 7 to 10 business days
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="mr-2 h-5 w-5" />
                  5. Non-Refundable Scenarios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2">Refunds will not be issued for:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>No-shows or late arrivals at events</li>
                  <li>Change of mind or personal scheduling conflicts</li>
                  <li>Incomplete or inaccurate information provided during booking</li>
                  <li>
                    Delays or rescheduling due to unforeseen circumstances such as weather, traffic, or venue issues
                    (unless the event is fully cancelled)
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. Dispute Resolution</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  If you believe a refund has been unfairly denied or incorrectly processed, you may raise a formal
                  dispute by contacting our support team with all relevant details. Ahibi will mediate and provide a
                  resolution based on platform records and communication history.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>7. Contact Us</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">For any refund-related queries or support, please contact:</p>
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
