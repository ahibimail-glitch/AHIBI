import { useState } from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";

export default function TermsAndConditionsNIS() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-6 sm:mx-12 my-10">
      <div
        className="flex-1 min-w-[200px] bg-gradient-to-r from-pink-400 via-purple-400 to-pink-500 rounded-xl px-4 py-3 shadow-lg 
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
            open ? "max-h-[2000px] mt-4" : "max-h-0"
          }`}
        >
          <div className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-lg p-4 sm:p-6 text-xs sm:text-sm space-y-4">
            <div className="space-y-3">
              <h3 className="font-bold text-indigo-600 mb-2">Eligibility</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>
                  Open to all influencers/content creators with a minimum of{" "}
                  <strong>4,000 followers</strong> and at least{" "}
                  <strong>70% original content</strong> on their platforms.
                </li>
                <li>
                  For <strong>Rising  Creator Award (U- 21)”</strong>, the
                  applicant must be below 21 years as of{" "}
                  <strong>September 30, 2025</strong>.
                </li>
                <li>
                  Campus Influencer nominees must be{" "}
                  <strong>
                    currently enrolled in a recognized college/university
                  </strong>
                  .
                </li>
                <li>
                  Only <strong>indigenous inhabitants of Nagaland</strong> are
                  eligible to participate.
                </li>
                <li>
                  All submitted social media profiles must be set to{" "}
                  <strong>PUBLIC</strong> for the entire duration of the
                  Nagaland Influencers Summit 2025 selection and voting process.
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-indigo-600 mb-2">
                Submission for Nomination
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>
                  Submission of this application does{" "}
                  <strong>not guarantee nomination</strong>.
                </li>
                <li>
                  The shortlisted nominations will be announced by the organiser
                  in consultation with the jury, based on the{" "}
                  <strong>relevance of each category</strong>.
                </li>
              </ul>
            </div>

            <div className="mt-6 p-3 bg-indigo-50 rounded-lg border-l-4 border-indigo-400">
              <p className="text-indigo-800 font-medium text-sm">
                <strong>Note:</strong> These Terms & Conditions ensure fairness
                and transparency in the Nagaland Influencers Summit 2025
                nomination process.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
