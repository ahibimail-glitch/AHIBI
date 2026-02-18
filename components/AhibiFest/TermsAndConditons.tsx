import { useState } from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";

export default function TermsAndConditions() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-6 sm:mx-12 my-10">
      <div
        className="flex-1 min-w-[200px] bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500 rounded-xl px-4 py-3 shadow-lg 
         cursor-pointer text-white"
        onClick={() => setOpen(!open)}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <div>
              <div className="font-bold text-sm md:text-base">
                Terms & Conditions
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
            open ? "max-h-[3000px] mt-4" : "max-h-0"
          }`}
        >
          <div className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-lg p-4 sm:p-6 text-xs sm:text-sm space-y-4 max-h-[600px] overflow-y-auto">
            <div className="mb-6">
              <p className="text-gray-600 leading-relaxed">
                These Terms & Conditions ("T&Cs") apply to all attendees, participants, sponsors, vendors, and guests of AHIBI Fest 2025. By purchasing a ticket, entering the venue, or participating in any way, you agree to comply with the following:
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-indigo-600 mb-2">1. General</h3>
                <div className="ml-4 space-y-1 text-gray-700">
                  <p>1.1 Ahibi Fest 2025 is organised and managed by AHIBI and its partners.</p>
                  <p>1.2 The organisers reserve the right to change, reschedule, or cancel the festival in part or in full, without prior notice, for reasons beyond their control.</p>
                  <p>1.3 All attendees are expected to follow these T&Cs and cooperate with staff, volunteers, and security at all times.</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-indigo-600 mb-2">2. Entry & Tickets</h3>
                <div className="ml-4 space-y-1 text-gray-700">
                  <p>2.1 Entry requires a valid ticket purchased from ahibi.in or official partners.</p>
                  <p>2.2 Tickets/wristbands are non-refundable, non-transferable, and non-replaceable.</p>
                  <p>2.3 Attendees must carry a valid government-issued photo ID.</p>
                  <p>2.4 Wristbands must be worn at all times inside the venue; tampering will lead to denied entry.</p>
                  <p>2.5 Once admitted into the venue, re-entry is strictly not allowed under any circumstances.</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-indigo-600 mb-2">3. Age Restrictions</h3>
                <div className="ml-4 space-y-1 text-gray-700">
                  <p>3.1 The festival is open to individuals aged 16+.</p>
                  <p>3.2 Attendees under 18 must be accompanied by a parent/guardian.</p>
                  <p>3.3 Alcoholic beverages will be served only to those 21+ upon valid ID verification.</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-indigo-600 mb-2">4. Prohibited Items</h3>
                <div className="ml-4 space-y-1 text-gray-700">
                  <p>4.1 Outside food & drinks, alcohol, narcotics, glass, and cans are not allowed.</p>
                  <p>4.2 Weapons, fireworks, sharp objects, or hazardous materials are strictly prohibited.</p>
                  <p>4.3 Professional cameras, drones, or recording equipment are not permitted without authorisation.</p>
                  <p>4.4 Pets are not allowed, except certified service animals.</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-indigo-600 mb-2">5. Festival Conduct</h3>
                <div className="ml-4 space-y-1 text-gray-700">
                  <p>5.1 Respect fellow attendees, staff, artists, and performers.</p>
                  <p>5.2 Any form of harassment, abuse, or violence will result in immediate removal without refund.</p>
                  <p>5.3 Illegal substance use, theft, or vandalism will result in police action.</p>
                  <p>5.4 Smoking is allowed only in designated zones.</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-indigo-600 mb-2">6. Health & Safety</h3>
                <div className="ml-4 space-y-1 text-gray-700">
                  <p>6.1 Bag checks and frisking will be conducted at entry points.</p>
                  <p>6.2 The organisers may deny entry to anyone deemed intoxicated, disorderly, or unfit.</p>
                  <p>6.3 First-aid and emergency medical services will be available on-site.</p>
                  <p>6.4 Attendees must follow all safety announcements and evacuation procedures.</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-indigo-600 mb-2">7. Event Changes & Cancellation</h3>
                <div className="ml-4 space-y-1 text-gray-700">
                  <p>7.1 Artist line-up, set times, schedules, and venues are subject to change.</p>
                  <p>7.2 In case of postponement, tickets remain valid for the new date.</p>
                  <p>7.3 In case of cancellation, refunds will be made for ticket face value only.</p>
                  <p>7.4 The organisers are not liable for losses due to travel, accommodation, or other expenses.</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-indigo-600 mb-2">8. Vendors & Sponsors</h3>
                <div className="ml-4 space-y-1 text-gray-700">
                  <p>8.1 Vendors and sponsors must operate only from designated stalls/activation zones.</p>
                  <p>8.2 No unauthorised selling, sampling, or brand promotion is permitted.</p>
                  <p>8.3 All commercial activities require prior written approval from the organisers.</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-indigo-600 mb-2">9. Liability</h3>
                <div className="ml-4 space-y-1 text-gray-700">
                  <p>9.1 Entry is at the attendee's own risk.</p>
                  <p>9.2 The organisers are not responsible for injury, theft, loss, or damage to personal property.</p>
                  <p>9.3 Attendees are responsible for their own belongings at all times.</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-indigo-600 mb-2">10. Photography & Media</h3>
                <div className="ml-4 space-y-1 text-gray-700">
                  <p>10.1 By attending, you consent to being photographed, filmed, or recorded.</p>
                  <p>10.2 The organisers may use your likeness in festival content, marketing, and media without compensation.</p>
                  <p>10.3 No unauthorised filming, live streaming, or professional photography is allowed.</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-indigo-600 mb-2">11. Environmental Responsibility</h3>
                <div className="ml-4 space-y-1 text-gray-700">
                  <p>11.1 Dispose of waste responsibly in designated bins.</p>
                  <p>11.2 Any littering, destruction of property, or damage to the venue will invite penalties.</p>
                  <p>11.3 Attendees are encouraged to support the organisers in keeping the festival eco-friendly.</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-indigo-600 mb-2">12. Accessibility</h3>
                <div className="ml-4 space-y-1 text-gray-700">
                  <p>12.1 The organisers will make reasonable efforts to provide accessibility for differently-abled attendees.</p>
                  <p>12.2 Attendees requiring assistance are encouraged to contact the organisers in advance.</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-indigo-600 mb-2">13. Governing Law</h3>
                <div className="ml-4 space-y-1 text-gray-700">
                  <p>13.1 These T&Cs are governed by the laws of India.</p>
                  <p>13.2 Any disputes will fall under the jurisdiction of the courts of Nagaland.</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-3 bg-indigo-50 rounded-lg border-l-4 border-indigo-400">
              <p className="text-indigo-800 font-medium text-sm">
                <strong>Note:</strong> These Terms & Conditions are designed to ensure a safe, enjoyable, and memorable experience for everyone at AHIBI Fest 2025.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
