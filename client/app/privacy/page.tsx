import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Ticket, ArrowLeft } from "lucide-react"
import Link from "next/link"
import Navbar from "../Navbar"
import Footer from "../Footer"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
      <Navbar/>
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
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-muted-foreground">Effective Date: January 1, 2024</p>
          </div>

          <div className="prose prose-lg max-w-none space-y-8">
            <div>
              <p className="text-lg text-muted-foreground mb-6">
                This Privacy Policy outlines how Ahibi ("we", "our", or "us") collects, uses, discloses, and protects
                your personal information when you use our platform.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                Ahibi is operated by KAKI (CHISHIKAKI CREATIVE SOLUTIONS (OPC) PRIVATE LIMITED), based in Dimapur,
                Nagaland, India.
              </p>
              <p className="text-lg text-muted-foreground mb-8">
                By accessing or using the Ahibi platform, you agree to the collection and use of your information in
                accordance with this Privacy Policy.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>1. Information We Collect</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>We collect the following types of personal and usage information:</p>

                <div>
                  <h4 className="font-semibold mb-2">a. Information You Provide</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Name, email, phone number and password (at registration)</li>
                    <li>Payment and billing details when making purchases</li>
                    <li>Event information when creating or listing events</li>
                    <li>Profile details for artists, organizers or venue owners</li>
                    <li>Communications sent to us through support or contact forms</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">b. Information We Automatically Collect</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Device information such as IP address, browser type, and OS</li>
                    <li>Usage data including pages visited, clicks, and interactions</li>
                    <li>Location data (if enabled)</li>
                    <li>Cookies and similar tracking technologies</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. How We Use Your Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2">We use the information we collect for the following purposes:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>To create and manage user accounts</li>
                  <li>To process ticket purchases, bookings, and payments</li>
                  <li>To display event, artist, and venue listings</li>
                  <li>To provide customer support and respond to inquiries</li>
                  <li>To personalize your experience on the platform</li>
                  <li>To send transactional emails, updates, or promotional content (you can opt out anytime)</li>
                  <li>To monitor and improve platform performance and security</li>
                  <li>To comply with legal requirements or obligations</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Sharing Your Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2">We do not sell your personal information. We may share your data with:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Event organizers, artists, or venue owners when you engage with their services</li>
                  <li>Payment gateways and financial service providers to complete transactions</li>
                  <li>Service providers who help us operate the platform (e.g., cloud hosting, analytics)</li>
                  <li>Government authorities or law enforcement, if required by applicable law</li>
                </ul>
                <p className="mt-4">
                  All third-party services are bound by contractual obligations to protect your data.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Your Choices and Rights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">a. Account Management</h4>
                  <p>You can access, update, or delete your personal data from your account settings.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">b. Communications</h4>
                  <p>
                    You can opt out of promotional emails or SMS by following the unsubscribe link or contacting us
                    directly.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">c. Cookies</h4>
                  <p>
                    Most browsers allow you to control cookies through settings. However, disabling cookies may affect
                    certain functionalities.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Data Security</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  We take appropriate security measures to protect your personal information from unauthorized access,
                  alteration, or disclosure. This includes secure servers, encryption, and access controls.
                </p>
                <p className="mt-4">
                  However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute
                  security.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. Data Retention</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  We retain your personal information only for as long as necessary to fulfill the purposes outlined in
                  this policy or to comply with legal obligations.
                </p>
                <p className="mt-4">
                  You may request the deletion of your data by contacting us, subject to applicable legal and
                  contractual retention requirements.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>7. Children's Privacy</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Ahibi is not intended for use by individuals under the age of 18. We do not knowingly collect personal
                  information from minors. If we discover such data has been collected, it will be deleted promptly.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>8. International Data Transfers</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  While our platform is based in India, some service providers may process data in other countries. By
                  using the platform, you consent to the transfer of your data to countries outside India where
                  necessary.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>9. Changes to This Privacy Policy</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  We may update this Privacy Policy from time to time. Any changes will be posted on this page with an
                  updated effective date. Continued use of the platform indicates your acceptance of the revised policy.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>10. Contact Us</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  If you have questions or concerns about this Privacy Policy, or would like to exercise your data
                  rights, please contact:
                </p>
                <div className="space-y-2">
                  <p>
                    <strong>AHIBI SUPPORT</strong>
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
