"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Star, Sparkles, ArrowRight, Trophy, Mic, Camera, Zap, ChevronRight, Clock, Globe, Heart} from "lucide-react";
import { useState } from "react";
import Footer from "../Footer";
import Navbar from "../Navbar";
export default function NagalandInfluencerSummit() {
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);
    const [selectedCategory, setSelectedCategory] = useState(0);

    const awardCategories = [
        {
            id: 1,
            name: "Fashion Voice of the Year",
            icon: Sparkles,
            color: "from-violet-500 to-purple-600",
            description:
                "Recognizes individuals who have made a significant impact on the fashion industry through compelling content creation, innovative storytelling, and influential promotion across digital platforms.",
            stats: "50K+ Reach Required"
        },
        {
            id: 2,
            name: "Beauty & Glamour Creator Award",
            icon: Heart,
            color: "from-pink-500 to-rose-600",
            description:
                "Honors creators who have driven beauty and glamour through engaging content, expert knowledge, and impactful storytelling that inspires and influences audiences across platforms.",
            stats: "100+ Beauty Posts"
        },
        {
            id: 3,
            name: "Entertainment Impact Award",
            icon: Mic,
            color: "from-amber-500 to-orange-600",
            description:
                "Recognizes creators whose content has significantly shaped popular culture through humor, storytelling, or performance, leaving a lasting impact on the digital entertainment landscape.",
            stats: "1M+ Total Views"
        },
    ];

    const highlights = [
        {
            icon: Users,
            title: "500+ Influencers",
            description: "Connect with fellow creators and industry leaders",
            gradient: "from-blue-500 to-cyan-500"
        },
        {
            icon: Star,
            title: "20+ Sessions",
            description: "Learn from experts and thought leaders",
            gradient: "from-yellow-500 to-orange-500"
        },
        {
            icon: Globe,
            title: "Cultural Festival",
            description: "Experience the rich heritage of Nagaland",
            gradient: "from-green-500 to-emerald-500"
        },
        {
            icon: Trophy,
            title: "₹10L+ Prizes",
            description: "Win recognition and valuable rewards",
            gradient: "from-purple-500 to-pink-500"
        },
    ];

    const speakers = [
        { name: "Digital Expert", role: "Content Strategy", followers: "2.5M" },
        { name: "Fashion Icon", role: "Style Influencer", followers: "1.8M" },
        { name: "Tech Creator", role: "Innovation Leader", followers: "3.2M" },
    ];

    const schedule = [
        { day: "Day 1", date: "Oct 18", focus: "Opening Ceremony & Keynotes", icon: Zap },
        { day: "Day 2", date: "Oct 19", focus: "Workshops & Masterclasses", icon: Camera },
        { day: "Day 3", date: "Oct 20", focus: "Awards Night & Gala", icon: Trophy },
    ];

    return (
        <div className="min-h-screen  overflow-x-hidden">


            {/* Hero Section */}
            <Navbar />
            <section className="relative min-h-screen flex items-center justify-center px-6 py-10 ">

                <div className="relative mx-auto max-w-4xl text-center  z-10">


                    {/* Logo with glow effect */}
                    <div className="flex justify-center ">
                        <div className="relative">
                            <div className="absolute inset-0 " />
                            <img
                                src="/images/NIS-logo.png"
                                alt="Nagaland Influencer Summit"

                            />
                        </div>
                    </div>

                    {/* Animated Text */}
                    <div className="space-y-6">
                        <h1 className="text-5xl md:text-7xl font-black">
                            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent bg-300% animate-gradient">
                                Where Influence
                            </span>
                            <span className="block mt-2 text-slate-900">Meets Impact</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                            Join <span className="font-semibold text-purple-600">500+ creators</span> for an extraordinary
                            celebration of digital innovation, cultural heritage, and creative excellence in the heart of Nagaland.
                        </p>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                        <Link href="/NagalandInfluencerSummit/register" passHref>
                            <Button
                                asChild
                                size="lg"
                                className="group bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-2xl hover:scale-105 transition-all duration-300 text-lg px-8 py-6 rounded-full"
                            >
                                <span>Register Now</span>
                            </Button>
                        </Link>
                        {/* <Button
                            size="lg"
                            variant="outline"
                            className="border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-all duration-300 text-lg px-8 py-6 rounded-full"
                        >
                            Download Brochure
                        </Button> */}
                    </div>



                </div>
            </section>

            {/* Event Schedule Timeline */}
            <section className="py-20 px-4 bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="mx-auto max-w-6xl">
                    <div className="text-center mb-16">
                        <Badge className="mb-4 bg-purple-100 text-purple-700 border-0">Schedule</Badge>
                        <h2 className="text-4xl md:text-5xl font-black mb-6">
                            3 Days of Pure
                            <span className="block bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Creative Energy
                            </span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {schedule.map((day, index) => (
                            <Card
                                key={index}
                                className={`group relative overflow-hidden border-2 transition-all duration-300 hover:scale-105 hover:shadow-2xl ${index === 1 ? 'border-purple-400 shadow-xl' : 'border-slate-200'
                                    }`}
                            >
                                <CardContent className="p-8">
                                    <div className="flex items-center justify-between mb-4">
                                        <Badge variant={index === 1 ? "default" : "outline"}>
                                            {day.day}
                                        </Badge>
                                        <day.icon className="w-6 h-6 text-purple-600" />
                                    </div>
                                    <div className="text-2xl font-bold mb-2">{day.date}</div>
                                    <p className="text-slate-600">{day.focus}</p>
                                    {index === 1 && (
                                        <div className="absolute -top-2 -right-2">
                                            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0">
                                                Main Event
                                            </Badge>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Summit Highlights */}
            <section className="py-24 px-6">
                <div className="mx-auto max-w-6xl">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Attend?</h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Unlock opportunities, insights, and experiences curated for the digital age.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
                        {highlights.map((highlight, index) => (
                            <Card
                                key={index}
                                className="text-center p-8 shadow-xl border-0 bg-white/70 backdrop-blur-md hover:shadow-2xl hover:scale-105 transition-all duration-300"
                            >
                                <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center shadow-md">
                                    <highlight.icon className="h-8 w-8 text-white" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{highlight.title}</h3>
                                <p className="text-muted-foreground">{highlight.description}</p>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Award Categories */}
            <section className="py-20 px-4 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
                <div className="mx-auto max-w-6xl">
                    <div className="text-center mb-16">
                        <Badge className="mb-4 bg-yellow-500 text-slate-900 border-0">Awards Night</Badge>
                        <h2 className="text-4xl md:text-5xl font-black mb-6">
                            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                                Recognition & Glory
                            </span>
                        </h2>
                        <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                            Celebrating exceptional creators who are shaping the digital landscape
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {awardCategories.map((category, index) => {
                            const Icon = category.icon;
                            return (
                                <Card
                                    key={category.id}
                                    className={`group relative overflow-hidden border-2 bg-slate-800/50 backdrop-blur transition-all duration-500 cursor-pointer transform hover:scale-105 ${selectedCategory === index ? 'border-yellow-400 shadow-2xl shadow-yellow-400/20' : 'border-slate-700'
                                        }`}
                                    onClick={() => setSelectedCategory(index)}
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
                                    <CardContent className="p-8 relative z-10">
                                        <div className={`mb-6 h-16 w-16 rounded-2xl bg-gradient-to-r ${category.color} flex items-center justify-center`}>
                                            <Icon className="h-8 w-8 text-white" />
                                        </div>
                                        <h3 className="text-2xl font-bold mb-3 text-white">
                                            {category.name}
                                        </h3>
                                        <p className="text-slate-400 mb-4 line-clamp-3">
                                            {category.description}
                                        </p>
                                        <Badge className="bg-slate-700 text-slate-300 border-0">
                                            {category.stats}
                                        </Badge>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Featured Speakers */}
            <section className="py-20 px-4">
                <div className="mx-auto max-w-6xl">
                    <div className="text-center mb-16">
                        <Badge className="mb-4 bg-purple-100 text-purple-700 border-0">Speakers</Badge>
                        <h2 className="text-4xl md:text-5xl font-black mb-6">
                            Learn from the
                            <span className="block bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Industry Leaders
                            </span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {speakers.map((speaker, index) => (
                            <Card key={index} className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500">
                                <div className="h-48 bg-gradient-to-br from-purple-400 to-pink-400 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-black/20" />
                                    <Users className="absolute bottom-4 right-4 w-24 h-24 text-white/20" />
                                </div>
                                <CardContent className="p-6">
                                    <h3 className="text-xl font-bold mb-1">{speaker.name}</h3>
                                    <p className="text-slate-600 mb-3">{speaker.role}</p>
                                    <Badge variant="outline" className="border-purple-200 text-purple-600">
                                        {speaker.followers} Followers
                                    </Badge>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-20 px-4 bg-gradient-to-r from-purple-600 to-pink-600">
                <div className="mx-auto max-w-4xl text-center text-white">
                    <h2 className="text-4xl md:text-6xl font-black mb-6">
                        Ready to Make History?
                    </h2>
                    <p className="text-xl mb-8 text-white/90">
                        Join us at the most anticipated influencer event of the year
                    </p>

                    <div className="grid md:grid-cols-2 gap-6 mb-10 max-w-2xl mx-auto">
                        <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                            <Calendar className="w-10 h-10 mb-3 text-yellow-300" />
                            <div className="font-bold text-2xl">Oct 18-20</div>
                            <div className="text-white/80">2025</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                            <MapPin className="w-10 h-10 mb-3 text-yellow-300" />
                            <div className="font-bold text-2xl">The Heritage</div>
                            <div className="text-white/80">Kohima, Nagaland</div>
                        </div>
                    </div>

                    <Button
                        size="lg"
                        className="bg-white text-purple-600 hover:bg-white/90 hover:scale-105 transition-all duration-300 text-lg px-12 py-8 rounded-full shadow-2xl font-bold"
                    >
                        Secure Your Spot Now
                        <ChevronRight className="ml-2 h-6 w-6" />
                    </Button>

                    <p className="mt-6 text-sm text-white/70">
                        Early bird discount ends soon • Only 50 seats remaining
                    </p>
                </div>
            </section>

            {/* Footer */}
            <Footer />

            <style jsx>{`
                @keyframes gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient {
                    animation: gradient 3s ease infinite;
                }
                .bg-300\% {
                    background-size: 300% 300%;
                }
            `}</style>
        </div>
    );
}