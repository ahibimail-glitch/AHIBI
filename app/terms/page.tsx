import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Footer from "../Footer";
import Navbar from "../Navbar";

export default function TermsPage() {
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

        <Navbar />
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Terms and Conditions</h1>
            <p className="text-muted-foreground">
              Effective Date: January 1, 2024
            </p>
          </div>

          <div className="prose prose-lg max-w-none space-y-8">
            <div>
              <p className="text-lg text-muted-foreground mb-6">
                Welcome to Ahibi. Please read these Terms and Conditions
                ("Terms") carefully before using our website, platform, mobile
                app, or any associated services (collectively, the "Service").
                By accessing or using Ahibi, you agree to be bound by these
                Terms.
              </p>
              <p className="text-lg text-muted-foreground mb-8">
                If you do not agree with any part of these Terms, you may not
                access or use the Service.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>1. Introduction</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Ahibi is a digital event management platform that enables
                  users to browse events, purchase tickets, book artists, list
                  venues, manage event logistics, and collaborate with other
                  stakeholders in the event ecosystem. The platform is operated
                  by KAKI (CHISHIKAKI CREATIVE SOLUTIONS (OPC) PRIVATE LIMITED),
                  based in Dimapur, Nagaland, India.
                </p>
                <p>
                  These Terms apply to all users of the platform, including but
                  not limited to:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Event Organizers</li>
                  <li>Artists and Performers</li>
                  <li>Venue Owners</li>
                  <li>Attendees and Ticket Buyers</li>
                  <li>Platform Administrators</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Eligibility</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  You must be at least 18 years old to use Ahibi. By accessing
                  the platform, you confirm that you meet the legal age
                  requirement and have the authority to enter into these Terms
                  on your own behalf or on behalf of an organization.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. User Accounts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    Users are required to register an account to access certain
                    features.
                  </li>
                  <li>
                    You are responsible for maintaining the confidentiality of
                    your account credentials.
                  </li>
                  <li>
                    All information provided during registration must be
                    accurate and kept up to date.
                  </li>
                  <li>
                    Ahibi reserves the right to suspend or terminate accounts
                    for fraudulent, abusive, or illegal activity.
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Event Listings and Ticketing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">4.1 Event Organizers</h4>
                  <p className="mb-2">
                    Organizers can create, manage and promote events through the
                    platform. By listing an event:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>
                      You confirm that you have the rights and permissions to
                      host the event.
                    </li>
                    <li>
                      You are responsible for the accuracy of event details,
                      pricing, schedules and venue information.
                    </li>
                    <li>
                      You must honor all ticket sales and commitments made
                      through Ahibi.
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">4.2 Ticket Buyers</h4>
                  <p className="mb-2">
                    Users can browse and purchase tickets for available events.
                    All ticket purchases are:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>
                      Final and non-refundable unless stated otherwise in the
                      event policy.
                    </li>
                    <li>Subject to availability and confirmation.</li>
                    <li>Issued electronically via user accounts or email.</li>
                  </ul>
                  <p>
                    Ahibi is not responsible for changes, postponements or
                    cancellations made by event organizers.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Artist and Venue Bookings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">5.1 Artists</h4>
                  <p className="mb-2">
                    Artists may create public profiles and receive booking
                    requests from organizers. Artists are expected to:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Honor agreed performance times and terms.</li>
                    <li>
                      Communicate promptly regarding availability and special
                      requirements.
                    </li>
                    <li>Deliver services as promised during booking.</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">5.2 Venue Owners</h4>
                  <p className="mb-2">
                    Venue partners can list spaces, set availability, and accept
                    bookings. You agree to:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>
                      Ensure listed information is accurate and up to date.
                    </li>
                    <li>
                      Maintain the safety, cleanliness and operational readiness
                      of the space.
                    </li>
                    <li>Comply with local laws and venue safety standards.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. Payments and Fees</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    Ahibi facilitates payments through secure third-party
                    gateways.
                  </li>
                  <li>
                    A platform service fee or commission may apply to certain
                    transactions including ticket sales, artist bookings or
                    venue listings.
                  </li>
                  <li>
                    Event organizers are responsible for any applicable taxes on
                    ticket sales.
                  </li>
                  <li>
                    Payouts to artists and venues will follow timelines stated
                    in the user dashboard or agreed terms.
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>7. Refunds and Cancellations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    Refunds are issued only under specific conditions set by the
                    event organizer.
                  </li>
                  <li>
                    In the event of a cancellation, postponement or major
                    change, Ahibi may assist in processing refunds but is not
                    liable for the organizer's obligations.
                  </li>
                  <li>
                    Service fees may be non-refundable unless otherwise stated.
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>8. Code of Conduct</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2">All users agree to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Use the platform responsibly and legally.</li>
                  <li>
                    Refrain from impersonation, harassment, hate speech, or any
                    form of abuse.
                  </li>
                  <li>
                    Respect the rights and safety of others during physical
                    events.
                  </li>
                  <li>
                    Not upload harmful or unauthorized content to the platform.
                  </li>
                </ul>
                <p className="mt-4">
                  Violations may lead to suspension or permanent termination of
                  your account.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>9. Intellectual Property</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2">
                  All content, branding, software, and design elements of the
                  platform are the property of Ahibi or its licensors. Users may
                  not:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    Copy, reproduce, or modify platform content without written
                    permission.
                  </li>
                  <li>
                    Use Ahibi branding or materials for commercial purposes
                    without authorization.
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>10. Platform Access and Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    Ahibi strives to ensure uninterrupted access but does not
                    guarantee constant uptime.
                  </li>
                  <li>
                    We may temporarily suspend access for maintenance, upgrades,
                    or legal compliance.
                  </li>
                  <li>
                    We are not liable for any loss of data, revenue, or
                    opportunity due to downtime.
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>11. Limitation of Liability</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2">
                  Ahibi provides the platform "as is" without any guarantees. We
                  are not liable for:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    Errors, delays, or failures caused by third-party services
                    or external events.
                  </li>
                  <li>
                    Any loss or damage arising from attendance at or
                    organization of listed events.
                  </li>
                  <li>
                    The actions or omissions of organizers, artists, or venue
                    owners.
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>12. Termination</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  We reserve the right to suspend or terminate user access
                  without notice for any breach of these Terms. Users may also
                  request account deletion by contacting support.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>13. Governing Law</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  These Terms are governed by the laws of Nagaland State, India.
                  Any disputes shall be resolved in the courts located in
                  Nagaland, India.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>14. Changes to Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  We may update these Terms at any time. Continued use of the
                  platform after changes are posted will constitute acceptance
                  of the revised Terms.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>15. Contact Us</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  If you have questions, feedback, or concerns about these
                  Terms, please contact:
                </p>
                <div className="space-y-2">
                  <p>
                    <strong>Support Team</strong>
                  </p>
                  <p>Dimapur, Nagaland, India</p>
                  <p>Email: connect@ahibi.in</p>
                  <p>Phone: +91 7005727288</p>
                  <p>
                    Live Chat: Available on the AHIBI website during business
                    hours
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
