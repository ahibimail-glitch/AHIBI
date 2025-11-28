import { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";


export default function FAQCard() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-6 sm:mx-12 my-10">
      <div
        className="flex-1 min-w-[200px] bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-500 rounded-xl px-4 py-3 shadow-lg 
         cursor-pointer text-white"
        onClick={() => setOpen(!open)}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            <div>
         
              <div className="font-bold text-sm md:text-base">
               Frequently Asked Questions
              </div>
            </div>
          </div>
          {open ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </div>

        {/* Content */}
        <div
          className={`overflow-hidden transition-all duration-700 ease-in-out ${
            open ? "max-h-[2020px] mt-4" : "max-h-0"
          }`}
        >
          <div className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-lg p-4 sm:p-6 text-sm sm:text-base space-y-3">
            <div className="mb-4">
              <p><span className="font-bold text-orange-600">Q1) When and where is the show?</span></p>
              <p className="ml-4 text-gray-700">A: 17 Oct 2025 (Fri)<br/>Location, Gates & set times will be shared closer to show day.</p>
            </div>
            
            <div className="mb-4">
              <p><span className="font-bold text-orange-600">Q2) Who's performing?</span></p>
              <p className="ml-4 text-gray-700">A: International headliner Iyaz ("Replay") Full supporting lineup drops soon.</p>
            </div>
            
            <div className="mb-4">
              <p><span className="font-bold text-orange-600">Q3) When do tickets go live?</span></p>
              <p className="ml-4 text-gray-700">A: Early Bird opens very soon. Turn on post notifications and watch our bio link for the on-sale announcement.</p>
            </div>
            
            <div className="mb-4">
              <p><span className="font-bold text-orange-600">Q4) What are the ticket tiers?</span></p>
              <p className="ml-4 text-gray-700">A: Final prices + seating map will be revealed on the on-sale post.</p>
            </div>
            
            <div className="mb-4">
              <p><span className="font-bold text-orange-600">Q5) Is there a meet-and-greet with Iyaz?</span></p>
              <p className="ml-4 text-gray-700">A: Details at ticket launch.</p>
            </div>
            
            <div className="mb-4">
              <p><span className="font-bold text-orange-600">Q6) Age policy?</span></p>
              <p className="ml-4 text-gray-700">A: All ages welcome. Under-16s must come with a parent/guardian. 21+ only inside any Beverage Garden (if permitted by authorities).</p>
            </div>
            
            <div className="mb-4">
              <p><span className="font-bold text-orange-600">Q7) Will alcohol be served?</span></p>
              <p className="ml-4 text-gray-700">A: Details will be announced soon</p>
            </div>
            
            <div className="mb-4">
              <p><span className="font-bold text-orange-600">Q10) Can I re-enter if I leave?</span></p>
              <p className="ml-4 text-gray-700">A: No re-entry (standard festival policy). Plan accordingly.</p>
            </div>
            
            <div className="mb-4">
              <p><span className="font-bold text-orange-600">Q11) What's the refund policy?</span></p>
              <p className="ml-4 text-gray-700">A: Tickets are non-refundable, except in case of full cancellation. If there's a date change, your ticket remains valid for the rescheduled date.</p>
            </div>
            
            <div className="mb-4">
              <p><span className="font-bold text-orange-600">Q12) What happens if it rains?</span></p>
              <p className="ml-4 text-gray-700">A: The event is rain-or-shine with safety protocols. Severe weather plans and updates will be shared on our official channels.</p>
            </div>
            
            <div className="mb-4">
              <p><span className="font-bold text-orange-600">Q13) How do I avoid fake tickets/scams?</span></p>
              <p className="ml-4 text-gray-700">A: Buy only via the official link in our bio/website. Avoid resellers—scanned fake tickets will be denied entry.</p>
            </div>
            
            <div className="mb-4">
              <p><span className="font-bold text-orange-600">Q14) Parking & transport?</span></p>
              <p className="ml-4 text-gray-700">A: Limited on-site parking with marshals; rideshare/drop-off zones will be signposted. We'll share a traffic plan and gate map closer to show day.</p>
            </div>
            
            <div className="mb-4">
              <p><span className="font-bold text-orange-600">Q15) Food & water?</span></p>
              <p className="ml-4 text-gray-700">A: A curated F&B village with regional favorites + water refill points.</p>
            </div>
            
            <div className="mb-4">
              <p><span className="font-bold text-orange-600">Q16) Safety & medical?</span></p>
              <p className="ml-4 text-gray-700">A: On-site first-aid & ambulance, trained security, CCTV, and crowd-management teams. Please follow crew instructions at all times.</p>
            </div>
            
            <div className="mb-4">
              <p><span className="font-bold text-orange-600">Q17) Content & cameras?</span></p>
              <p className="ml-4 text-gray-700">A: Phone filming and personal content = welcome. Drones and pro rigs require written permission.</p>
            </div>
            
            <div className="mb-4">
              <p><span className="font-bold text-orange-600">Q18) Volunteering or working at the fest?</span></p>
              <p className="ml-4 text-gray-700">A: Volunteer/crew applications open soon—watch our stories for the link.</p>
            </div>
            
            <div className="mb-4">
              <p><span className="font-bold text-orange-600">Q19) Will there be merch?</span></p>
              <p className="ml-4 text-gray-700">A: Yes—official AHIBI FEST and artist merchandise on site (limited quantities).</p>
            </div>
            
            <div className="mb-4">
              <p><span className="font-bold text-orange-600">Q20) Official contacts?</span></p>
              <p className="ml-4 text-gray-700">A: For accessibility, media, or brand queries: connect@ahibifest.in</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
