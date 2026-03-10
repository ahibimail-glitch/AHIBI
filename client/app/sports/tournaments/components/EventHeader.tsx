"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Trophy, MapPin, Calendar, IndianRupee } from "lucide-react";
import { motion } from "framer-motion";

const EventHeader = () => (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
        <Card className="overflow-hidden rounded-[28px] border border-orange-500/20 bg-[#071126] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
                <CardContent className="p-6 md:p-10 text-left space-y-6 bg-[#071126] text-white">
                    <motion.div
                        initial={{ scale: 0.92, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.15, duration: 0.45 }}
                        className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2"
                    >
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f56210] text-white shadow-lg">
                            <Trophy className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-orange-300">Official Registration</p>
                            <p className="text-sm font-medium text-white/80">Nagaland Pickleball Association</p>
                        </div>
                    </motion.div>

                    <div className="space-y-3">
                        <p className="text-sm font-bold uppercase tracking-[0.28em] text-orange-400">The Heritage Pickleball Arena</p>
                        <h1 className="text-5xl font-black uppercase leading-[0.86] tracking-tight text-[#f56210] sm:text-6xl md:text-7xl">
                            Nagaland
                            <br />
                            Pickleball
                        </h1>
                        <div className="inline-block bg-[#f56210] px-5 py-3 text-3xl font-black uppercase tracking-tight text-[#071126] sm:text-4xl">
                            Classic Tournament
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                            <MapPin className="mt-0.5 h-5 w-5 text-orange-400" />
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Venue</p>
                                <p className="text-sm font-medium text-white/85">Old DC Bungalow, Officers Hill, Kohima</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                            <Calendar className="mt-0.5 h-5 w-5 text-orange-400" />
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Date</p>
                                <p className="text-sm font-medium text-white/85">21–22 March 2026</p>
                            </div>
                        </div>
                    </div>
                </CardContent>

                <div className="bg-[#f56210] p-6 md:p-8 text-[#071126] flex flex-col justify-between gap-6">
                    <div className="space-y-3">
                        <p className="text-sm font-bold uppercase tracking-[0.28em]">Powered by Ahibi Sports</p>
                        <div className="rounded-[24px] border border-[#071126]/15 bg-[#071126]/10 p-5">
                            <p className="text-sm font-bold uppercase tracking-[0.28em]">Prize Pool</p>
                            <div className="mt-2 flex items-center gap-2 text-4xl font-black sm:text-5xl">
                                <IndianRupee className="h-9 w-9" />
                                <span>1,00,000</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-[0.28em]">Categories</p>
                            <ul className="mt-3 space-y-2 text-sm font-semibold uppercase tracking-wide">
                                <li>Men&apos;s Doubles</li>
                                <li>Women&apos;s Doubles</li>
                                <li>Mixed Doubles</li>
                                <li>Team Event</li>
                            </ul>
                        </div>
                        <div className="rounded-[24px] bg-[#071126] p-5 text-white shadow-xl">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-300">Player Entry Fee</p>
                            <p className="mt-2 text-4xl font-black text-orange-400">₹1,500</p>
                            <p className="mt-2 text-sm text-white/75">₹1,500 per player. Two players register together.</p>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    </motion.div>
);

export default EventHeader;