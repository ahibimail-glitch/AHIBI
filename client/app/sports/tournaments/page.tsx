"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, MapPin, Calendar, IndianRupee, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const EventHeader = () => (
  <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
    <Card className="border-0 shadow-card overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/40 via-transparent to-transparent pointer-events-none" />
      <div className="h-1 gradient-shine" />
      <CardContent className="p-6 md:p-10 text-center space-y-5 relative">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-premium"
        >
          <Trophy className="w-8 h-8 text-primary-foreground" />
        </motion.div>
        <div className="space-y-1">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary mb-2"
          >
            <Sparkles className="w-3.5 h-3.5" /> Official Registration <Sparkles className="w-3.5 h-3.5" />
          </motion.div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
            Nagaland Pickleball Classic
          </h1>
          <p className="text-xl md:text-2xl font-bold text-primary">Tournament 2026</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5 md:gap-4">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-sm font-medium text-foreground/80 shadow-card">
            <Calendar className="w-4 h-4 text-primary" /> 21–22 March 2026
          </span>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-sm font-medium text-foreground/80 shadow-card">
            <MapPin className="w-4 h-4 text-primary" /> The Heritage Pickleball Arena
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full gradient-primary text-sm font-bold text-primary-foreground shadow-premium">
            <IndianRupee className="w-4 h-4" /> Prize Pool: ₹1,00,000
          </span>
          <span className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border-2 border-primary/20 text-sm font-semibold text-foreground bg-accent/50">
            Entry: ₹1,500 / team
          </span>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export default EventHeader;