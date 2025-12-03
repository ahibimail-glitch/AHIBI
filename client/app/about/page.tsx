import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
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
  Star,
  Trophy,
  Target,
  Zap,
  Globe,
  CheckCircle,
  TrendingUp,
  Award,
  Sparkles,
  Rocket,
  Shield,
  Clock,
  DollarSign,
  BarChart3,
  Headphones,
  Camera,
  Mic,
  Play,
  Quote,
} from "lucide-react"
import Link from "next/link"
import Footer from "../Footer"
import Navbar from "../Navbar"

export default function AboutPage() {
  const stats = [
    { number: "₹1 Cr+", label: "Event Revenue Processed For Clients", icon: DollarSign, gradient: "from-green-500 to-emerald-500" },
    { number: "60,000+", label: "Tickets Sold", icon: Ticket, gradient: "from-blue-500 to-cyan-500" },
    { number: "50,000+", label: "Users Onboarded", icon: Users, gradient: "from-purple-500 to-pink-500" },
    { number: "36+", label: "Major Events Delivered", icon: Calendar, gradient: "from-orange-500 to-red-500" },
    { number: "90%+", label: "Organizer Retention", icon: TrendingUp, gradient: "from-indigo-500 to-purple-500" },
  ]

  const journey = [
    {
      year: "October 2024",
      title: "Ahibi Launches",
      description: "Ahibi launches with a simple idea: make events easier.",
      icon: Rocket,
      color: "bg-blue-500",
    },
    {
      year: "Late 2024 – Early 2025",
      title: "Local Events Take Off",
      description: "We start powering local events, concerts, and tournaments. Our ticketing and QR check-in systems take off.",
      icon: Trophy,
      color: "bg-green-500",
    },
    {
      year: "Mid 2025",
      title: "Platform Expansion",
      description: "We expand into Ahibi Venue and Ahibi Organizer. Events, venues, and organizers now use one platform.",
      icon: Sparkles,
      color: "bg-purple-500",
    },
    {
      year: "Today",
      title: "Powering Major Festivals",
      description: "Ahibi is the digital backbone for major events like Hornbill Festival & Hornbill Music Festival.",
      icon: TrendingUp,
      color: "bg-orange-500",
    },
  ]

  const values = [
    {
      title: "Creator-First Philosophy",
      description: "Every feature we build starts with asking: 'How does this help creators succeed?'",
      icon: Music,
      color: "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200",
      features: ["Artist-friendly pricing", "Easy profile setup", "Direct booking system", "Revenue analytics"],
    },
    {
      title: "Community-Driven Growth",
      description: "We grow by empowering communities, not by extracting from them",
      icon: Users,
      color: "bg-gradient-to-br from-green-50 to-green-100 border-green-200",
      features: ["Local partnerships", "Community events", "Grassroots support", "Cultural preservation"],
    },
    {
      title: "Innovation with Purpose",
      description: "Technology should solve real problems, not create new ones",
      icon: Zap,
      color: "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200",
      features: ["Smart automation", "AI-powered matching", "Real-time updates", "Mobile-first design"],
    },
    {
      title: "Locally Rooted, Globally Minded",
      description: "Born in Northeast India, built for the world's diverse event landscape",
      icon: Globe,
      color: "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200",
      features: ["Cultural sensitivity", "Multi-language support", "Regional customization", "Global standards"],
    },
  ]

  const offerings = [
    {
      title: "Event Attendees",
      subtitle: "Discover & Experience",
      description: "Find amazing events, book instantly, and create unforgettable memories",
      icon: Star,
      features: [
        "Smart event discovery",
        "One-click booking",
        "Digital tickets",
        "Event reminders",
        "Social sharing",
        "Review system",
      ],
      color: "bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200",
      cta: "Browse Events",
      link: "/events",
    },
    {
      title: "Artists & Performers",
      subtitle: "Showcase & Grow",
      description: "Build your brand, get discovered, and manage your performance career",
      icon: Music,
      features: [
        "Professional profiles",
        "Booking management",
        "Calendar integration",
        "Payment processing",
        "Performance analytics",
        "Fan engagement tools",
      ],
      color: "bg-gradient-to-br from-purple-50 to-pink-100 border-purple-200",
      cta: "Join as Artist",
      link: "/artist/auth/signup",
    },
    {
      title: "Venue Owners",
      subtitle: "List & Monetize",
      description: "Maximize your space utilization with verified bookings and seamless management",
      icon: Building2,
      features: [
        "Space showcase",
        "Availability calendar",
        "Booking automation",
        "Revenue tracking",
        "Maintenance scheduling",
        "Customer reviews",
      ],
      color: "bg-gradient-to-br from-green-50 to-emerald-100 border-green-200",
      cta: "List Your Venue",
      link: "/venue/auth/signup",
    },
    {
      title: "Event Organizers",
      subtitle: "Plan & Execute",
      description: "Create spectacular events with our comprehensive planning and management tools",
      icon: Calendar,
      features: [
        "Event creation wizard",
        "Artist marketplace",
        "Venue booking",
        "Ticket management",
        "Marketing tools",
        "Real-time analytics",
      ],
      color: "bg-gradient-to-br from-orange-50 to-yellow-100 border-orange-200",
      cta: "Start Organizing",
      link: "/organizer/auth/signup",
    },
  ]

  const testimonials = [
    {
      name: "Atemsü",
      role: "Attendee",
      location: "Kohima",
      content:
        "Used Ahibi for the first time at the match. Honestly didn't expect it to be this smooth. Scanned my code and walked in. Very smooth at the gate.",
      rating: 5,
      image: "/placeholder.svg?height=60&width=60",
    },
    {
      name: "Lemtila",
      role: "Attendee",
      location: "Dimapur",
      content:
        "Bought my ticket online and I didn't have to chase anyone for updates. The whole thing felt organized. Even the entry was faster than usual.",
      rating: 5,
      image: "/placeholder.svg?height=60&width=60",
    },
    {
      name: "Alobo Naga",
      role: "Organizer • Annie the Musical",
      location: "Dimapur",
      content:
        "Annie was a sold-out show and Ahibi made the whole ticketing and entry flow smooth. Everything worked the way it should, so we could focus on the performance.",
      rating: 5,
      image: "/placeholder.svg?height=60&width=60",
    },
  ]

  const team = [
    {
      name: "Founder & CEO",
      role: "Visionary Leader",
      description: "15+ years in tech and events, passionate about empowering creators",
      image: "/placeholder.svg?height=120&width=120",
      expertise: ["Product Strategy", "Business Development", "Team Leadership"],
    },
    {
      name: "CTO",
      role: "Technology Architect",
      description: "Former Google engineer, expert in scalable systems and AI",
      image: "/placeholder.svg?height=120&width=120",
      expertise: ["System Architecture", "AI/ML", "Mobile Development"],
    },
    {
      name: "Head of Community",
      role: "Culture Connector",
      description: "Deep roots in Northeast India's cultural scene, community builder",
      image: "/placeholder.svg?height=120&width=120",
      expertise: ["Community Building", "Cultural Relations", "Partnership Development"],
    },
  ]

  const whyChoose = [
    {
      title: "All-in-One Ecosystem",
      description: "From discovery to payment, everything works seamlessly together in one platform",
      icon: Target,
      stats: "5 platforms replaced by 1",
    },
    {
      title: "Real-Time Collaboration",
      description: "Artists, organizers, and venues stay in sync with live updates and smart notifications",
      icon: Zap,
      stats: "99.9% uptime guarantee",
    },
    {
      title: "Transparent Pricing",
      description: "No hidden fees, no surprise charges. What you see is what you pay",
      icon: Shield,
      stats: "0 hidden fees",
    },
    {
      title: "24/7 Support",
      description: "Our dedicated support team is always ready to help you succeed",
      icon: Clock,
      stats: "< 2 hour response time",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <Navbar />
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10" />
        <div className="container mx-auto px-4 text-center relative">

          <h1 className="text-5xl md:text-7xl font-bold mb-8 bg-gradient-to-r from-primary via-purple-600 to-secondary bg-clip-text text-transparent leading-tight">
            Click. Book. Go.
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-4xl mx-auto leading-relaxed">
            Events become simpler when organizers, venues, and artists connect on one platform.
          </p>
          <p className="text-2xl md:text-3xl font-semibold text-primary mb-12">
            Ahibi brings it all together seamlessly.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Button size="lg" className="px-8 py-4 text-lg" asChild>
              <Link href="/auth">
                Start Your Journey <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="px-8 py-4 text-lg bg-transparent" asChild>
              <Link href="/events">
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Why Trust Ahibi</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Because we built everything from real ground experience — not theory.
            </p>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mt-4">
              In about 1 year, Ahibi has powered major events across the state including the Nagaland Super League, Dr. T. Ao Trophy, TFC, WENN Bazaar, and AHIBI Fest featuring IYAZ.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center group hover:scale-105 transition-all duration-500"
              >
                <Card className="p-6 border border-indigo-200/50 shadow-xl hover:shadow-2xl transition-all duration-500 bg-white/80 backdrop-blur-sm hover:bg-white">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-r ${stat.gradient} mb-4 shadow-lg`}>
                    <stat.icon className="h-7 w-7 text-white" />
                  </div>
                  <div className={`text-4xl md:text-5xl font-black bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mb-3`}>
                    {stat.number}
                  </div>
                  <div className="text-base font-semibold text-gray-600">{stat.label}</div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-6 px-4 py-2">
                What is Ahibi?
              </Badge>
              <h2 className="text-4xl font-bold mb-6">A Modern Event-Tech Platform</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Ahibi is a modern event-tech platform that helps you run better events.
              </p>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                We power ticketing, check-ins, payments, venues, and bookings — all in one place.
              </p>
              <div className="flex flex-wrap gap-4">
                <Badge variant="secondary" className="px-4 py-2">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Creator-First
                </Badge>
                <Badge variant="secondary" className="px-4 py-2">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Technology-Driven
                </Badge>
                <Badge variant="secondary" className="px-4 py-2">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Community-Focused
                </Badge>
              </div>
            </div>
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-primary/10 via-white to-secondary/10">
              <CardContent className="p-8">
                <Target className="h-16 w-16 text-primary mb-6" />
                <h3 className="text-2xl font-bold mb-4">Why We Exist</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Events are stressful when everything happens on calls and WhatsApp.
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed mt-4">
                  Ahibi was built to make events smoother, faster, and more organized.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Journey Timeline */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Our Journey</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              From a small idea in Northeast India to a pan-India platform transforming events
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {journey.map((milestone, index) => (
              <Card
                key={index}
                className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50"
              >
                <CardContent className="p-6 text-center">
                  <div className={`inline-flex p-3 rounded-full ${milestone.color} text-white mb-4`}>
                    <milestone.icon className="h-6 w-6" />
                  </div>
                  <div className="text-2xl font-bold text-primary mb-2">{milestone.year}</div>
                  <h3 className="text-lg font-semibold mb-3">{milestone.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{milestone.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Core Values */}
      {/* <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">What Drives Us</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our core values shape every decision we make and every feature we build
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <Card key={index} className={`border-2 ${value.color} hover:shadow-xl transition-all duration-300 group`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="bg-primary/10 p-3 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <value.icon className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{value.title}</CardTitle>
                    </div>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{value.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {value.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section> */}

      {/* What We Offer */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">What We're Building</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Simple tools to help everyone in the event ecosystem
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {offerings.map((offering, index) => (
              <Card
                key={index}
                className={`border-2 ${offering.color} hover:shadow-xl transition-all duration-300 group`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary/10 p-3 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <offering.icon className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{offering.title}</CardTitle>
                        <p className="text-sm text-primary font-medium">{offering.subtitle}</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-4">{offering.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {offering.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full" asChild>
                    <Link href={offering.link}>
                      {offering.cta} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Reviews</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Real feedback from people who've experienced Ahibi
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card
                key={index}
                className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50"
              >
                <CardContent className="p-6">
                  <Quote className="h-8 w-8 text-primary mb-4" />
                  <p className="text-muted-foreground mb-6 leading-relaxed">"{testimonial.content}"</p>
                  <div className="flex items-center space-x-4">
                    <img
                      src={"/images/testimonial.jpg"}
                      alt={testimonial.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role} • {testimonial.location}
                      </p>
                    </div>
                  </div>
                  <div className="flex mt-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Ahibi */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Why Choose Ahibi</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              The advantages that make Ahibi the preferred choice for event management across India
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {whyChoose.map((item, index) => (
              <Card
                key={index}
                className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-gray-50 to-white group"
              >
                <CardContent className="p-8">
                  <div className="flex items-start space-x-6">
                    <div className="bg-primary/10 p-4 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <item.icon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                      <p className="text-muted-foreground leading-relaxed mb-4">{item.description}</p>
                      <Badge variant="secondary" className="px-3 py-1">
                        <BarChart3 className="h-3 w-3 mr-1" />
                        {item.stats}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      {/* <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Meet Our Team</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Passionate individuals working together to transform the event industry
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <Card
                key={index}
                className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50 text-center"
              >
                <CardContent className="p-8">
                  <img
                    src={member.image || "/placeholder.svg"}
                    alt={member.name}
                    className="h-24 w-24 rounded-full object-cover mx-auto mb-6"
                  />
                  <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
                  <p className="text-primary font-medium mb-3">{member.role}</p>
                  <p className="text-muted-foreground mb-6 leading-relaxed">{member.description}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {member.expertise.map((skill, skillIndex) => (
                      <Badge key={skillIndex} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section> */}

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-primary to-purple-600  text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Events?</h2>
          <p className="text-xl mb-12 max-w-3xl mx-auto opacity-90">
            Join thousands of creators, organizers, and venues who are already building the future of events with Ahibi
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button size="lg" variant="secondary" className="px-8 py-4 text-lg" asChild>
              <Link href="/auth">
                Start Free Today <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-8 py-4 text-lg border-white text-white hover:bg-white hover:text-primary bg-transparent"
              asChild
            >
              <Link href="mailto:connect@ahibi.in">
                <Mail className="mr-2 h-5 w-5" />
                Contact Sales
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      {/* <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto border-0 shadow-xl bg-gradient-to-br from-primary/5 to-secondary/5">
            <CardContent className="p-8 text-center">
              <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-4">Stay Updated</h3>
              <p className="text-muted-foreground mb-6">
                Get the latest updates on new features, events, and industry insights
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Input placeholder="Enter your email" className="flex-1" />
                <Button className="px-6">
                  Subscribe <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section> */}

      {/* Contact Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Get in Touch</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Have questions? Want to partner with us? We'd love to hear from you.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-8 text-center">
                <div className="bg-blue-500 p-4 rounded-full inline-block mb-4">
                  <Mail className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Email Us</h3>
                <p className="text-muted-foreground mb-4">For general inquiries and support</p>
                <p className="font-medium text-blue-600">connect@ahibi.in</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-8 text-center">
                <div className="bg-green-500 p-4 rounded-full inline-block mb-4">
                  <Phone className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Call Us</h3>
                <p className="text-muted-foreground mb-4">Speak directly with our team</p>
                <p className="font-medium text-green-600">+91 7005727288</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-50 to-orange-100">
              <CardContent className="p-8 text-center">
                <div className="bg-orange-500 p-4 rounded-full inline-block mb-4">
                  <MapPin className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Visit Us</h3>
                <p className="text-muted-foreground mb-4">Our headquarters</p>
                <p className="font-medium text-orange-600">Dimapur, Nagaland</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
