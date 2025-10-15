import { useState, useEffect } from "react";

const announcements = [
  "🚨 Phase 2 Tickets Almost Gone — Book Now Before It’s Too Late!",
  "BUY AHIBI FEST TICKETS WORTH ₹4,000+ AND GET ₹2,500 MADAME SHOPPING VOUCHERS! Redeem exclusively at Madame Store, Dimapur!"
];

export default function AnnouncementCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full   mx-auto ">
      <div className="overflow-hidden shadow-lg">
        <div
          className="flex transition-transform duration-700 ease-in-out flex-nowrap"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {announcements.map((msg, idx) => (
            <div
              key={idx}
              className="flex-shrink-0 w-full bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 py-1 sm:py-2 px-2 sm:px-4 flex justify-center items-center"
            >
              <p className="text-white font-bold text-sm sm:text-base md:text-lg text-center uppercase tracking-wide leading-snug drop-shadow-lg">
                {msg}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      
    </div>
  );
}
