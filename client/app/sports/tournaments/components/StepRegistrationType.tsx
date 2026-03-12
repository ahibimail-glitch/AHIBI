import { Users, User } from "lucide-react";
import { motion } from "framer-motion";

interface StepRegistrationTypeProps {
  value: "individual" | "team" | "";
  onChange: (value: "individual" | "team") => void;
}

const options = [
  {
    id: "individual" as const,
    label: "Player Entry",
    description: "Register as a player for Mixed Doubles, Men's Doubles, or Women's Doubles events.",
    icon: User,
  },
  {
    id: "team" as const,
    label: "Team",
    description: "Register under a team name before selecting the event category.",
    icon: Users,
  },
];

const StepRegistrationType = ({ value, onChange }: StepRegistrationTypeProps) => {
  return (
    <div className="space-y-6">
      <div className="rounded-[24px] bg-slate-950 p-5 text-white">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">Step 1</p>
        <h2 className="mt-2 text-2xl font-black text-white">Choose Registration Type</h2>
        <p className="mt-1.5 text-sm text-white/70">Select whether this entry is being submitted as an individual or a team.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {options.map(({ id, label, description, icon: Icon }, index) => {
          const isSelected = value === id;

          return (
            <motion.button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.3 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-start gap-4 rounded-[24px] border-2 p-5 text-left transition-all duration-200 ${
                isSelected
                  ? "border-[#f56210] bg-orange-50 shadow-[0_16px_40px_rgba(245,98,16,0.16)]"
                  : "border-slate-200 bg-white shadow-sm hover:border-orange-200 hover:shadow-lg"
              }`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isSelected ? "bg-[#f56210] text-white" : "bg-slate-100 text-slate-600"}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-base font-black uppercase tracking-wide text-slate-900">{label}</p>
                <p className="mt-1 text-sm text-slate-600">{description}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default StepRegistrationType;
