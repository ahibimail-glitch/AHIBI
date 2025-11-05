"use client";

import { motion } from "framer-motion";

interface DaySelectorProps {
  selectedDay: number;
  onSelectDay: (day: number) => void;
  totalDays?: number;
}

const DaySelector = ({ selectedDay, onSelectDay, totalDays = 10 }: DaySelectorProps) => {
  return (
    <div className="gradient-card rounded-2xl p-6 md:p-8 shadow-card border border-border/30 mb-10">
      <h3 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
        <span className="w-2 h-8 gradient-hero rounded-full" />
        Select Your Day
      </h3>
      <div className="grid grid-cols-5 md:grid-cols-10 gap-3 md:gap-4">
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
          <motion.button
            key={day}
            whileHover={{ scale: 1.1, y: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectDay(day)}
            className={`py-4 px-4 rounded-xl font-bold transition-all duration-300 relative overflow-hidden ${
              selectedDay === day
                ? "gradient-hero text-white shadow-glow"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30"
            }`}
          >
            <span className="relative z-10 text-sm md:text-base">Day {day}</span>
            {selectedDay === day && (
              <motion.div
                layoutId="daySelector"
                className="absolute inset-0 gradient-hero"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default DaySelector;
