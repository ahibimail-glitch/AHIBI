import Link from "next/link";

export default function Footer() {
  return (
    <div>
      {/* Footer */}
      <footer className="bg-[#0F172A] text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2">
                <img
                  src="/images/Logo.png"
                  alt="Ahibi logo"
                  className="h-10 w-auto object-contain"
                />
              </div>

              <p className="">
                Next-generation event management ecosystem for seamless event
                experiences.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">For Users</h3>
              <ul className="space-y-2 ">
                <li>
                  <Link href="/events" className="hover:text-foreground">
                    Browse Events
                  </Link>
                </li>
                <li>
                  <Link href="/tickets" className="hover:text-foreground">
                    My Tickets
                  </Link>
                </li>
                <li>
                  <Link href="/support" className="hover:text-foreground">
                    Support
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">For Partners</h3>
              <ul className="space-y-2 ">
                <li>
                  <Link href="/organizer" className="hover:text-foreground">
                    Organizers
                  </Link>
                </li>
                <li>
                  <Link href="/artist" className="hover:text-foreground">
                    Artists
                  </Link>
                </li>
                <li>
                  <Link href="/venue" className="hover:text-foreground">
                    Venues
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 ">
                <li>
                  <Link href="/about" className="hover:text-foreground">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-foreground">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-foreground">
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 Ahibi. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
