import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Ticket,
  ArrowLeft,
  Users,
  Music,
  Building2,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import Footer from "../Footer";
import Navbar from "../Navbar";

export default function FAQPage() {
  const audienceFAQs = [
    {
      question: "How do I book tickets on Ahibi?",
      answer:
        "Visit the AHIBI website or app → Browse or search for an event → Click 'Book Tickets' → Choose ticket type and quantity → Complete the payment → Receive your e-ticket instantly via email and dashboard",
    },
    {
      question: "Where can I access my ticket after booking?",
      answer:
        "Your ticket will be available in the 'My Tickets' section of your Ahibi account and sent to your registered email.",
    },
    {
      question: "Can I enter the event with a digital ticket?",
      answer:
        "Yes. Show the QR code from your phone or print a copy. Event staff will scan it for verification.",
    },
    {
      question: "How do I get event or venue information?",
      answer:
        "Go to the event page. Scroll down to see venue address, timing, event description, and contact details.",
    },
    {
      question: "Can I leave a review after an event?",
      answer:
        "Yes. Go to 'My Events' → Select the event → Click 'Add Review,' rate it, and submit your feedback",
    },
    {
      question: "How do I find events near me or on a specific date?",
      answer:
        "Use the filter options in the event search bar. Choose 'Ongoing Events' or 'Events by Date' to narrow results.",
    },
    {
      question: "Can I add events to my calendar?",
      answer:
        "Yes. Go to 'My Events' → select the event → click 'Add to Calendar' and choose your preferred calendar app.",
    },
  ];

  const artistFAQs = [
    {
      question: "How do I create my artist profile on Ahibi?",
      answer:
        "Sign up as an Artist → Fill in your profile with name, genre, bio, photos, and sample videos → Set your availability and preferred performance types",
    },
    {
      question: "How will I receive bookings?",
      answer:
        "Organizers can send you direct booking requests. You will receive notifications by email and in your dashboard.",
    },
    {
      question: "Can I decline a booking?",
      answer:
        "Yes, you can accept or decline a request from your dashboard based on availability or preference.",
    },
    {
      question: "How do I manage my schedule?",
      answer:
        "Use the built-in calendar to set available dates, block off-time, and track upcoming gigs.",
    },
    {
      question: "When do I get paid?",
      answer:
        "Payments are released to your account after the event is completed and confirmed by the organizer.",
    },
    {
      question: "Can I be rated or reviewed?",
      answer:
        "Yes. Organizers can leave reviews which appear on your public profile. These help boost visibility for future bookings.",
    },
    {
      question: "Can I update my artist profile anytime?",
      answer:
        "Yes, log in to your account and make changes to your media, performance preferences, or availability.",
    },
    {
      question: "Is there a fee to list myself as an artist?",
      answer:
        "No listing fee is charged. Ahibi takes a small commission per confirmed booking.",
    },
  ];

  const venueFAQs = [
    {
      question: "How do I list my venue on Ahibi?",
      answer:
        "Register as a Venue Owner → Add venue name, address, capacity, photos, and amenities → Set your availability calendar and publish",
    },
    {
      question: "Can I set different rates for different dates or times?",
      answer:
        "Yes, you can configure variable pricing and custom availability through your dashboard.",
    },
    {
      question: "How do I accept or reject a booking request?",
      answer:
        "You will receive notifications. Log in to view requests and choose to approve or decline them instantly.",
    },
    {
      question: "What information is shared with organizers?",
      answer:
        "Your public venue page displays essential details like capacity, location, amenities, and rules. Private contact info is only shared upon confirmed booking.",
    },
    {
      question: "How and when do I get paid?",
      answer:
        "You'll receive payment after the event is successfully completed. Payouts are processed to your registered account.",
    },
    {
      question: "Can I see booking and payment history?",
      answer:
        "Yes. Your dashboard includes a full history of past and upcoming bookings, payouts, and communication records.",
    },
    {
      question: "Can I update my venue details?",
      answer:
        "Yes. Log in to your account to update photos, descriptions, capacity, and availability at any time.",
    },
  ];

  const organizerFAQs = [
    {
      question: "How do I create an event on Ahibi?",
      answer:
        "Sign up as an Organizer → Click 'Create Event' and enter all event details → Set ticket types, pricing, and venue → Publish and start selling",
    },
    {
      question: "Can I book artists and venues through Ahibi?",
      answer:
        "Yes. Use the Artist and Venue directories to send direct booking requests. You can manage confirmations within your dashboard.",
    },
    {
      question: "How do I monitor ticket sales and attendee data?",
      answer:
        "Your organizer dashboard gives you real-time insights into ticket sales, attendance, revenue, and check-in analytics.",
    },
    {
      question: "Can I offer discounts or promo codes?",
      answer:
        "Yes. Create and manage promo codes for early bird tickets, special offers, or bulk discounts.",
    },
    {
      question: "Can I set a refund policy?",
      answer:
        "Yes. You can define your refund and cancellation terms during event creation. Ahibi will follow your stated policy.",
    },
    {
      question: "When do I get paid for ticket sales?",
      answer:
        "Your payout is processed after the event ends and successful completion is confirmed.",
    },
    {
      question: "Do I need to pay to list my event?",
      answer:
        "No. Listing is free. Ahibi charges a small platform fee (2 percent) on total ticket sales.",
    },
    {
      question: "Can I collect custom attendee information?",
      answer:
        "Yes. You can add custom fields during ticket checkout to collect any specific data required for your event.",
    },
    {
      question: "What kind of marketing support is available?",
      answer:
        "Ahibi offers: Featured placement on homepage, Promo code tools, Social media promotion, Email campaign support (for premium events)",
    },
  ];

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
            <h1 className="text-4xl font-bold mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-muted-foreground">
              Find answers to common questions about using the Ahibi platform
            </p>
          </div>

          <div className="space-y-12">
            {/* For Audiences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                  <Users className="mr-3 h-6 w-6 text-blue-500" />
                  For Audiences
                </CardTitle>
                <CardDescription>
                  Questions about booking tickets and attending events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {audienceFAQs.map((faq, index) => (
                    <AccordionItem key={index} value={`audience-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* For Artists */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                  <Music className="mr-3 h-6 w-6 text-green-500" />
                  For Artists
                </CardTitle>
                <CardDescription>
                  Questions about creating profiles and receiving bookings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {artistFAQs.map((faq, index) => (
                    <AccordionItem key={index} value={`artist-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* For Venue Owners */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                  <Building2 className="mr-3 h-6 w-6 text-purple-500" />
                  For Venue Owners
                </CardTitle>
                <CardDescription>
                  Questions about listing venues and managing bookings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {venueFAQs.map((faq, index) => (
                    <AccordionItem key={index} value={`venue-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* For Event Organizers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                  <Calendar className="mr-3 h-6 w-6 text-orange-500" />
                  For Event Organizers
                </CardTitle>
                <CardDescription>
                  Questions about creating events and managing operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {organizerFAQs.map((faq, index) => (
                    <AccordionItem key={index} value={`organizer-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* Contact Support */}
            <Card>
              <CardHeader>
                <CardTitle>Still Have Questions?</CardTitle>
                <CardDescription>
                  Can't find what you're looking for? Get in touch with our
                  support team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <h4 className="font-semibold mb-2">Email Support</h4>
                      <p className="text-muted-foreground">connect@ahibi.in</p>
                    </div>
                    <div className="text-center">
                      <h4 className="font-semibold mb-2">Phone Support</h4>
                      <p className="text-muted-foreground">+91 7005727288</p>
                    </div>
                    <div className="text-center">
                      <h4 className="font-semibold mb-2">Live Chat</h4>
                      <p className="text-muted-foreground">
                        Available during business hours
                      </p>
                    </div>
                  </div>
                  <div className="text-center pt-4">
                    <Button asChild>
                      <Link href="mailto:connect@ahibi.in">
                        Contact Support
                      </Link>
                    </Button>
                  </div>
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
