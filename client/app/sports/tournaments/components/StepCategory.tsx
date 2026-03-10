import { Users, User, UserCheck, Shuffle, Trophy } from "lucide-react";
import { motion } from "framer-motion";

const individualCategories = [
  { id: "mens_doubles", label: "Men's Doubles", desc: "Two male players", icon: Users },
  { id: "womens_doubles", label: "Women's Doubles", desc: "Two female players", icon: Users },
  { id: "mixed_doubles", label: "Mixed Doubles", desc: "One male and one female player", icon: Shuffle },
];

const teamCategories = [
  { id: "mens_doubles", label: "Men's Doubles", desc: "Two male players under one team", icon: Users },
  { id: "womens_doubles", label: "Women's Doubles", desc: "Two female players under one team", icon: Users },
  { id: "mixed_doubles", label: "Mixed Doubles", desc: "One male and one female player", icon: Shuffle },
];

interface StepCategoryProps {
  registrationType: "individual" | "team" | "";
  selected: string[];
  onChange: (selected: string[]) => void;
}

const StepCategory = ({ registrationType, selected, onChange }: StepCategoryProps) => {
  const categories = registrationType === "team" ? teamCategories : individualCategories;

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else if (selected.length < 2) {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] bg-slate-950 p-5 text-white">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">Category Selection</p>
        <h2 className="mt-2 text-2xl font-black text-white">Choose Tournament Event</h2>
        <p className="text-sm text-white/70 mt-1.5">
          Select up to <span className="font-bold text-orange-400">2 categories</span>. Singles require 1 player, while doubles or team events require 2 players.
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
              className={`relative flex items-center gap-4 p-4 rounded-[24px] border-2 text-left transition-all duration-200 ${
                isSelected
                  ? "border-[#f56210] bg-orange-50 shadow-[0_16px_40px_rgba(245,98,16,0.16)]"
                  : "border-slate-200 bg-white shadow-sm hover:shadow-lg hover:border-orange-200"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                  isSelected ? "bg-[#f56210] text-white shadow-lg" : "bg-slate-100 text-slate-600"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className={`font-black text-sm uppercase tracking-wide block ${isSelected ? "text-[#071126]" : "text-slate-900"}`}>
                  {label}
                </span>
                <span className={`text-xs ${isSelected ? "text-slate-600" : "text-slate-500"}`}>{desc}</span>
              </div>
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                  isSelected ? "border-[#f56210] bg-[#f56210] scale-110" : "border-slate-300"
                }`}
              >
                {isSelected && (
                  <motion.svg
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                    className="w-3 h-3 text-white"
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
          className="text-xs text-center font-semibold text-slate-500 uppercase tracking-[0.18em]"
        >
          {selected.length}/2 categories selected
        </motion.p>
      )}
    </div>
  );
};

export default StepCategory;
