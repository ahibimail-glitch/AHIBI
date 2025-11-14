import { cn } from "@/lib/utils";

interface DaySelectorProps {
  selectedDay: string;
  onSelectDay: (day: string) => void;
}

// const days = [
//   { value: "4", label: "4th December", link: "http://localhost:3000/events/6917510439a9643fb98027c0" },
//   { value: "5", label: "5th December", link: "http://localhost:3000/events/69176cdf39a9643fb9802a5d" },
//   { value: "6", label: "6th December", link: "http://localhost:3000/events/69176d6839a9643fb9802ad1" },
// ];
const days = [
  { value: "4", label: "4th December", link: "https://ahibi.in/events/6917510439a9643fb98027c0" },
  { value: "5", label: "5th December", link: "https://ahibi.in/events/69176cdf39a9643fb9802a5d" },
  { value: "6", label: "6th December", link: "https://ahibi.in/events/69176d6839a9643fb9802ad1" },
];

export const DaySelector = ({ selectedDay, onSelectDay }: DaySelectorProps) => {
  const handleClick = (day: any) => {
    onSelectDay(day.value);
    window.location.href = day.link; // 🚀 Redirect immediately
  };

  return (
    <div className="space-y-4">
      <h2 className="text-4xl font-bold text-center text-primary">Select a Day</h2>

      <div className="flex flex-wrap justify-center gap-3">
        {days.map((day) => (
          <button
            key={day.value}
            onClick={() => handleClick(day)}
            className={cn(
              "px-8 py-3 rounded-full font-semibold transition-all duration-300",
              "border-2 text-sm md:text-base",
              selectedDay === day.value
                ? "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-glow)]"
                : "bg-card text-foreground border-border hover:border-primary/50 hover:shadow-[var(--shadow-card)]"
            )}
          >
            {day.label}
          </button>
        ))}
      </div>
    </div>
  );
};
