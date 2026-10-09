"use client";

import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";
import WorkshopRsvp from "@/components/WorkshopRsvp";

export default function WorkshopRsvpPage() {
  return (
    <div className="min-h-screen bg-[#faf6ef] text-slate-900">
      <Navbar />
      <WorkshopRsvp />
      <Footer />
    </div>
  );
}
