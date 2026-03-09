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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-md">
          <ShieldCheck className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Confirmation</h2>
          <p className="text-sm text-muted-foreground">Review and confirm before submitting</p>
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
            className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
              checks[i]
                ? "border-primary/40 bg-accent shadow-card"
                : "border-border bg-card hover:border-primary/15 hover:shadow-card"
            }`}
          >
            <Checkbox id={`${baseId}-${i}`} checked={checks[i]} onCheckedChange={() => toggle(i)} className="mt-0.5" />
            <Label htmlFor={`${baseId}-${i}`} className="font-medium cursor-pointer leading-relaxed text-sm">{label}</Label>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default StepConfirmation;
