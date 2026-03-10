import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { motion } from "framer-motion";
import { User } from "lucide-react";

export interface TeamPlayerData {
  fullName: string;
  gender: string;
}

interface StepTeamPlayerDetailsProps {
  category: string;
  playerNumber: number;
  data: TeamPlayerData;
  onChange: (data: TeamPlayerData) => void;
  errors: Partial<Record<keyof TeamPlayerData, string>>;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const StepTeamPlayerDetails = ({ category, playerNumber, data, onChange, errors }: StepTeamPlayerDetailsProps) => {
  const update = (field: keyof TeamPlayerData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const getCategoryLabel = (categoryId: string) => {
    const labels: Record<string, string> = {
      mens_singles: "Men's Singles",
      mens_doubles: "Men's Doubles",
      mixed_doubles: "Mixed Doubles",
    };
    return labels[categoryId] || categoryId;
  };

  const getRequiredPlayers = (categoryId: string) => {
    if (categoryId === 'mens_singles') return 1;
    return 2; // mens_doubles and mixed_doubles
  };

  const requiredPlayers = getRequiredPlayers(category);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="rounded-[24px] bg-slate-950 p-5 text-white">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">Team Player Details</p>
        <h2 className="mt-2 text-2xl font-black text-white">{getCategoryLabel(category)}</h2>
        <p className="mt-1 text-sm text-white/70">
          {requiredPlayers === 1 ? 'Enter player details for this event' : `Enter details for Player ${playerNumber} of ${requiredPlayers}`}
        </p>
      </motion.div>

      <div className="space-y-4">
        <motion.div variants={item} className="space-y-1.5">
          <Label htmlFor={`fullName-${category}-${playerNumber}`} className="text-sm font-black uppercase tracking-[0.18em] text-slate-700 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#f56210]" /> Full Name
          </Label>
          <Input 
            id={`fullName-${category}-${playerNumber}`} 
            placeholder="Enter full name" 
            value={data.fullName} 
            onChange={(e) => update("fullName", e.target.value)} 
            className="h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white focus:border-orange-300 transition-colors" 
          />
          {errors.fullName && <p className="text-xs text-destructive font-medium">{errors.fullName}</p>}
        </motion.div>

        <motion.div variants={item} className="space-y-1.5">
          <Label className="text-sm font-black uppercase tracking-[0.18em] text-slate-700">Gender</Label>
          <RadioGroup value={data.gender} onValueChange={(v) => update("gender", v)} className="flex gap-3 pt-2">
            {['male', 'female'].map((g) => (
              <label
                key={g}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 cursor-pointer transition-all text-sm font-black uppercase tracking-wide ${
                  data.gender === g
                    ? "border-[#f56210] bg-orange-50 text-[#071126]"
                    : "border-slate-200 bg-slate-50 text-slate-500 hover:border-orange-200"
                }`}
              >
                <RadioGroupItem value={g} id={`${g}-${category}-${playerNumber}`} className="sr-only" />
                {g === "male" ? "Male" : "Female"}
              </label>
            ))}
          </RadioGroup>
          {errors.gender && <p className="text-xs text-destructive font-medium">{errors.gender}</p>}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default StepTeamPlayerDetails;
