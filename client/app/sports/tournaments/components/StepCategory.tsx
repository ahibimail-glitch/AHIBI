import { Users, UserCheck, Shuffle, Trophy } from "lucide-react";
import { motion } from "framer-motion";

const categories = [
  { id: "mens_doubles", label: "Men's Doubles", desc: "Two male players", icon: Users },
  { id: "womens_doubles", label: "Women's Doubles", desc: "Two female players", icon: UserCheck },
  { id: "mixed_doubles", label: "Mixed Doubles", desc: "One male, one female", icon: Shuffle },
  { id: "team_event", label: "Team Event", desc: "Full team format", icon: Trophy },
];

interface StepCategoryProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

const StepCategory = ({ selected, onChange }: StepCategoryProps) => {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else if (selected.length < 2) {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Team / Category Information</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          Select up to <span className="font-semibold text-primary">2 categories</span> per player
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories.map(({ id, label, desc, icon: Icon }, i) => {
          const isSelected = selected.includes(id);
          return (
            <motion.button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`relative flex items-center gap-3.5 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                isSelected
                  ? "border-primary bg-accent shadow-premium"
                  : "border-border bg-card shadow-card hover:shadow-card-hover hover:border-primary/20"
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isSelected ? "gradient-primary text-primary-foreground shadow-md" : "bg-secondary text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className={`font-semibold text-sm block ${isSelected ? "text-accent-foreground" : "text-foreground"}`}>
                  {label}
                </span>
                <span className="text-xs text-muted-foreground">{desc}</span>
              </div>
              <div
                className={`w-5.5 h-5.5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                  isSelected ? "border-primary bg-primary scale-110" : "border-muted-foreground/25"
                }`}
              >
                {isSelected && (
                  <motion.svg
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                    className="w-3 h-3 text-primary-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </motion.svg>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-center text-muted-foreground"
        >
          {selected.length}/2 categories selected
        </motion.p>
      )}
    </div>
  );
};

export default StepCategory;
