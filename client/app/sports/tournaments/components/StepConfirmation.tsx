import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useId } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, IndianRupee } from "lucide-react";

interface StepConfirmationProps {
  checks: boolean[];
  onChange: (checks: boolean[]) => void;
  registrationType?: "individual" | "team" | "";
  uniquePlayerCount?: number;
  totalAmount?: number;
}

const labels = [
  "All details submitted are correct",
  "I agree to the tournament rules and decisions of the organizers",
  "I understand each player can only participate in a maximum of 2 categories",
];

const StepConfirmation = ({ checks, onChange, registrationType, uniquePlayerCount = 0, totalAmount = 0 }: StepConfirmationProps) => {
  const baseId = useId();

  const toggle = (i: number) => {
    const next = [...checks];
    next[i] = !next[i];
    onChange(next);
  };

  const isIndividual = registrationType === "individual";
  const showPricing = isIndividual && uniquePlayerCount > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] bg-slate-950 p-5 text-white">
        <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#f56210] flex items-center justify-center shadow-md">
          <ShieldCheck className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">Final Step</p>
          <h2 className="text-2xl font-black text-white">Confirmation</h2>
          <p className="text-sm text-white/70">Review and confirm before submitting</p>
        </div>
        </div>
      </div>

      {showPricing && (
        <div className="rounded-[24px] border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <IndianRupee className="w-5 h-5 text-orange-600" />
            <h3 className="text-sm font-black uppercase tracking-[0.24em] text-orange-600">Pricing Summary</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Unique Players</span>
              <span className="font-bold text-slate-900">{uniquePlayerCount}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Rate per Player</span>
              <span className="font-bold text-slate-900">₹1,500</span>
            </div>
            <div className="border-t-2 border-orange-200 my-2"></div>
            <div className="flex justify-between items-center">
              <span className="text-base font-black text-slate-900">Total Amount</span>
              <span className="text-2xl font-black text-orange-600">₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {labels.map((label, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ x: 2 }}
            onClick={() => toggle(i)}
            className={`flex items-start gap-3.5 p-4 rounded-[24px] border-2 cursor-pointer transition-all duration-200 ${
              checks[i]
                ? "border-[#f56210] bg-orange-50 shadow-[0_12px_28px_rgba(245,98,16,0.14)]"
                : "border-slate-200 bg-white hover:border-orange-200 hover:shadow-md"
            }`}
          >
            <Checkbox id={`${baseId}-${i}`} checked={checks[i]} onCheckedChange={() => toggle(i)} onClick={(event) => event.stopPropagation()} className="mt-0.5" />
            <Label htmlFor={`${baseId}-${i}`} onClick={(event) => event.stopPropagation()} className="font-semibold cursor-pointer leading-relaxed text-sm text-slate-700">{label}</Label>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default StepConfirmation;
