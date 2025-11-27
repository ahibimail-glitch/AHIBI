import { motion } from "framer-motion";

interface DaySelectorProps {
  selectedDay: number;
  onSelectDay: (day: number) => void;
  totalDays?: number;
  freeDays?: number[];
  normalDays?: number[];
  highProfileDays?: number[];
}

const DaySelectorHF = ({ 
  selectedDay, 
  onSelectDay, 
  totalDays = 10, 
  freeDays = [],
  normalDays = [],
  highProfileDays = []
}: DaySelectorProps) => {
  const getDayType = (day: number) => {
    if (freeDays.includes(day)) return "free";
    if (normalDays.includes(day)) return "normal";
    if (highProfileDays.includes(day)) return "highProfile";
    return "default";
  };

  return (
    <div className="gradient-card rounded-2xl p-6 md:p-8 shadow-card border border-border/30 mb-10">
      <h3 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
        <span className="w-2 h-8 gradient-hero rounded-full" />
        Select Your Day
      </h3>
      
      {/*  */}

      <div className="grid grid-cols-5 md:grid-cols-10 gap-3 md:gap-4">
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
          const dayType = getDayType(day);
          const isFree = dayType === "free";
          const isHighProfile = dayType === "highProfile";
          
          return (
            <motion.button
              key={day}
              whileHover={{ scale: 1.1, y: -4 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelectDay(day)}
              className={`py-4 px-4 rounded-xl font-bold transition-all duration-300 relative overflow-hidden ${
                selectedDay === day
                  ? isFree
                    ? "bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 text-white shadow-glow"
                    : isHighProfile
                    ? "bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 text-white shadow-glow"
                    : "gradient-hero text-white shadow-glow"
                  : isFree
                  ? "bg-gradient-to-r from-emerald-400/20 via-green-400/20 to-teal-400/20 text-foreground border-2 border-emerald-400/40 hover:from-emerald-400/30 hover:via-green-400/30 hover:to-teal-400/30 hover:border-emerald-400/60"
                  : isHighProfile
                  ? "bg-gradient-to-r from-amber-400/20 via-orange-400/20 to-rose-400/20 text-foreground border-2 border-amber-400/40 hover:from-amber-400/30 hover:via-orange-400/30 hover:to-rose-400/30 hover:border-amber-400/60"
                  : "gradient-card text-foreground border-2 border-primary/30 hover:border-primary/50 hover:gradient-hero hover:text-white"
              }`}
            >
              <span className="relative z-10 text-sm md:text-base flex flex-col items-center">
                Day {day}
                {isFree && <span className="text-[10px] font-extrabold tracking-wider">FREE</span>}
              </span>
              {selectedDay === day && (
                <motion.div
                  layoutId="daySelector"
                  className={isFree 
                    ? "absolute inset-0 bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400" 
                    : isHighProfile
                    ? "absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400"
                    : "absolute inset-0 gradient-hero"
                  }
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default DaySelectorHF;
