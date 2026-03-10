import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useId } from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

interface StepConfirmationProps {
  checks: boolean[];
  onChange: (checks: boolean[]) => void;
}

const labels = [
  "All details submitted are correct",
  "I agree to the tournament rules and decisions of the organizers",
  "I understand each player can only participate in a maximum of 2 categories",
];

const StepConfirmation = ({ checks, onChange }: StepConfirmationProps) => {
  const baseId = useId();

  const toggle = (i: number) => {
    const next = [...checks];
    next[i] = !next[i];
    onChange(next);
  };

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
