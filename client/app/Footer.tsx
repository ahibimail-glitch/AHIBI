import Link from "next/link";

export default function Footer() {
  return (
    <div>
      <footer className="bg-[#0F172A] py-5">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <Link href="/">
                <img
                  src="/images/Logo.png"
                  alt="Ahibi logo"
                  className="h-10 w-auto object-contain cursor-pointer mb-4"
                />
              </Link>
              <p className="text-gray-400 text-sm">
                Next-generation event management ecosystem for seamless event experiences.
              </p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">For Users</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>
                  <Link href="/events" className="hover:text-white">
                    Browse Events
                  </Link>
                </li>
                <li>
                  <Link href="/profile" className="hover:text-white">
                    My Tickets
                  </Link>
                </li>
                <li>
                  <Link href="mailto:connect@ahibi.in" className="hover:text-white">
                    Support
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">For Partners</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>
                  <Link href="/organizer" className="hover:text-white">
                    Organizers
                  </Link>
                </li>
                <li>
                  <Link href="/artist" className="hover:text-white">
                    Artists
                  </Link>
                </li>
                <li>
                  <Link href="/venue" className="hover:text-white">
                    Venues
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>
                  <Link href="/about" className="hover:text-white">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="mailto:connect@ahibi.in" className="hover:text-white">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white">
                    Terms and Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/shipping" className="hover:text-white">
                    Shipping and Delivery Policy
                  </Link>
                </li>
                <li>
                  <Link href="/refund" className="hover:text-white">
                    Refund Policy
                  </Link>
                </li>
                <li>
                  <Link href="/accessibility" className="hover:text-white">
                    Accessibility Statement
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-white">
                    FAQs
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4  text-center text-gray-500 text-sm">
            <p>&copy; 2024 Ahibi. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
