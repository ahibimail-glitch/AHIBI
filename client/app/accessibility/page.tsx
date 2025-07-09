import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Ticket, ArrowLeft, Eye, Ear, Hand, Brain, Mail } from "lucide-react"
import Link from "next/link"
import Footer from "../Footer"
import Navbar from "../Navbar"

export default function AccessibilityPage() {
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
            <h1 className="text-4xl font-bold mb-4">Accessibility Statement</h1>
            <p className="text-muted-foreground">Effective Date: January 1, 2024</p>
          </div>

          <div className="prose prose-lg max-w-none space-y-8">
            <div>
              <p className="text-lg text-muted-foreground mb-6">
                At Ahibi, we are committed to ensuring that our platform is accessible and usable for everyone,
                including people with disabilities. We believe that events and digital tools should be inclusive,
                barrier-free, and available to all members of the community.
              </p>
              <p className="text-lg text-muted-foreground mb-8">
                Ahibi is operated by KAKI (CHISHIKAKI CREATIVE SOLUTIONS (OPC) PRIVATE LIMITED), based in Dimapur,
                Nagaland, India.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Our Commitment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  We aim to make the Ahibi website and platform accessible to as many users as possible, regardless of
                  technology, device, or ability. Our design and development teams follow best practices to support:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Screen readers and keyboard navigation</li>
                  <li>Adequate text contrast for readability</li>
                  <li>Scalable fonts and responsive design</li>
                  <li>Logical content structure with semantic HTML</li>
                  <li>Alternative text for important images</li>
                  <li>Captioning for major video content (ongoing rollout)</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Design Standards We Follow</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  We aim to align with the Web Content Accessibility Guidelines (WCAG) 2.1, Level AA standards wherever
                  feasible. These guidelines help make digital content more accessible to users with a wide range of
                  disabilities, including visual, auditory, motor, and cognitive impairments.
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Eye className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-center">Visual</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center">
                    High contrast, scalable text, and screen reader compatibility
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Ear className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-center">Auditory</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center">
                    Captions for videos and visual indicators for audio content
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Hand className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-center">Motor</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center">
                    Keyboard navigation and touch-friendly interface design
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-center">Cognitive</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center">
                    Clear navigation, consistent layout, and simple language
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Known Limitations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  While we strive for full compliance, some parts of the platform may not yet meet all accessibility
                  standards. This may include:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Some third-party integrations or embedded content</li>
                  <li>Older event pages or archived assets</li>
                  <li>User-submitted content that lacks alt text or formatting</li>
                </ul>
                <p className="mt-4">
                  We are actively working to address these issues through continuous updates and audits.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Feedback Matters</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  If you experience any difficulty accessing any part of the Ahibi platform or have suggestions for
                  improvement, we want to hear from you. We take accessibility seriously and will make every effort to
                  resolve the issue or provide alternative access to the information you need.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="mr-2 h-5 w-5" />
                  Contact Us
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  Please reach out with accessibility-related questions, feedback, or support needs:
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
