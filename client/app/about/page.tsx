import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Ticket,
  Users,
  Calendar,
  Building2,
  Music,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import Footer from "../Footer";
import Navbar from "../Navbar";

export default function AboutPage() {
  const stats = [
    { number: "15+", label: "Events Hosted" },
    { number: "35,000+", label: "Tickets Sold" },
    { number: "10,000+", label: "Happy Users" },
  ];

  const team = [
    {
      name: "Founder & CEO",
      role: "Visionary Leader",
      description:
        "Leading the digital transformation of event management in Northeast India",
    },
    {
      name: "Tech Team",
      role: "Innovation Drivers",
      description: "Building scalable solutions for the event ecosystem",
    },
    {
      name: "Community Team",
      role: "Culture Connectors",
      description: "Bridging creators, organizers, and audiences across India",
    },
  ];

  const values = [
    {
      title: "Creator-First",
      description:
        "We put artists, organizers, and venue owners at the center of everything we build",
      icon: Music,
    },
    {
      title: "Community-Driven",
      description:
        "From grassroots collectives to large-scale events, we serve everyone who creates or attends",
      icon: Users,
    },
    {
      title: "Innovation-Focused",
      description:
        "We use technology to solve real problems in the event industry",
      icon: Calendar,
    },
    {
      title: "Locally Rooted",
      description:
        "Born in Nagaland, built for India, with culture and community in mind",
      icon: Building2,
    },
  ];

  const features = [
    "Unified platform for all event needs",
    "Real-time updates and smart alerts",
    "Built for collaboration between all stakeholders",
    "Mobile-first design for on-the-go management",
    "Secure payments and booking system",
    "Analytics and insights for better decisions",
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="py-12 md:py-20 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            About Ahibi
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A new way to create, manage and experience events
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg max-w-none mb-12">
              <p className="text-lg text-muted-foreground mb-6">
                Events today are more than entertainment. They are movements,
                milestones and memories in the making. Ahibi is the all-in-one
                platform that powers this shift.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                We bring together event organizers, artists, venue owners and
                audiences into one seamless system. From planning and discovery
                to booking and execution, Ahibi simplifies every step of the
                journey.
              </p>
              <p className="text-lg text-muted-foreground mb-8">
                Whether you are launching a local festival, performing at a
                showcase or searching for your next unforgettable experience,
                Ahibi helps you do it better, faster and smarter.
              </p>
            </div>

            {/* Mission */}
            <Card className="mb-12">
              <CardHeader>
                <CardTitle className="text-2xl">Our Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-muted-foreground">
                  To digitize, professionalize and scale the event ecosystem by
                  putting creators, organizers and audiences at the center.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 md:py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Milestones So Far</h2>
            <p className="text-lg text-muted-foreground">
              Our tools are shaped by real event experience from intimate gigs
              to stadium-scale productions.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index}>
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                  {stat.number}
                </div>
                <div className="text-lg text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Offer */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What We Offer</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>For Audiences</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Discover top events, book your tickets and get support with
                  ease
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>For Artists</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Showcase your talent, receive bookings, manage your calendar
                  and build your brand
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>For Venue Owners</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  List your space, manage availability and receive verified
                  event bookings
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>For Event Organizers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Create events, hire artists, book venues and manage payments
                  in one dashboard
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>For Admins</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Oversee platform activity, approve listings and access
                  performance analytics in real time
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Choose Ahibi */}
      <section className="py-12 md:py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose Ahibi</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-3">Unified platform</h3>
              <p className="text-muted-foreground mb-6">
                From ticketing and talent to venue management and payments,
                everything works together
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3">
                Built for collaboration
              </h3>
              <p className="text-muted-foreground mb-6">
                Organizers, artists and venues operate in sync without hassle
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3">Live control</h3>
              <p className="text-muted-foreground mb-6">
                Real-time updates, status tracking and smart alerts for every
                stakeholder
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3">
                Born local, built to scale
              </h3>
              <p className="text-muted-foreground mb-6">
                We began in Nagaland with creators and culture in mind and we
                are ready to serve events across India
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3">
                Inclusive by design
              </h3>
              <p className="text-muted-foreground mb-6">
                From grassroots collectives to large-scale events, Ahibi is made
                for everyone who creates or attends
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* More Than a Platform */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">More Than a Platform</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Ahibi is building digital infrastructure for the cultural economy.
              We want to help artists get discovered, organizers go professional
              and communities enjoy better-managed events.
            </p>
            <p className="text-lg text-muted-foreground mb-8">
              We believe the future of events is organized, connected and
              creator-first. Ahibi is here to make that future a reality.
            </p>
          </div>
        </div>
      </section>

      {/* Work With Us */}
      <section className="py-12 md:py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Work With Us</h2>
            <p className="text-lg text-muted-foreground mb-8">
              We collaborate with event organizers, tourism bodies, institutions
              and creators across India. If you're building an event or looking
              to modernize how events are run, we're ready to help.
            </p>
            <p className="text-xl font-semibold mb-8">
              Let's build better events together.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="mailto:connect@ahibi.in">
                  Contact Us <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/auth">Book a Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Get in Touch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <span>connect@ahibi.in</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <span>+91 7005727288</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span>Dimapur, Nagaland, India</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
