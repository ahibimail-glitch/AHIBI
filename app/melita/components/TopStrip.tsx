import { useState, useEffect } from "react";

const TopStrip = () => {
  const messages = [
    "Free Shipping Pan India",
    "50% Off use Coupon: MELITA50",
    "Skincare That Works",
  ];

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="w-full h-10 overflow-hidden bg-[#835339] text-white relative flex items-center justify-center">
      <div className="absolute w-full flex justify-center">
        <span
          key={current}
          className="inline-block whitespace-nowrap"
          style={{
            animation: "slideInHoldOut 3s linear forwards",
          }}
        >
          {messages[current]}
        </span>
      </div>

      <style jsx>{`
        @keyframes slideInHoldOut {
          0% {
            transform: translateX(100vw);
          }
          10% {
            transform: translateX(0);
          }
          90% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-100vw);
          }
        }
      `}</style>
    </div>
  );
};

export default TopStrip;