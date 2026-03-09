import { Check } from "lucide-react";
import { motion } from "framer-motion";

const steps = ["Category", "Player 1", "Player 2", "Confirm"];

interface StepIndicatorProps {
  currentStep: number;
}

const StepIndicator = ({ currentStep }: StepIndicatorProps) => (
  <div className="flex items-center justify-center w-full max-w-md mx-auto py-8">
    {steps.map((label, i) => {
      const isComplete = i < currentStep;
      const isActive = i === currentStep;
      return (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-2.5">
            <motion.div
              initial={false}
              animate={{
                scale: isActive ? 1.15 : 1,
                boxShadow: isActive
                  ? "0 0 0 4px hsl(158 50% 93%), 0 4px 16px -4px hsl(158 64% 40% / 0.4)"
                  : isComplete
                  ? "0 2px 8px -2px hsl(158 64% 40% / 0.3)"
                  : "none",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-300 ${
                isComplete || isActive
                  ? "gradient-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {isComplete ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}>
                  <Check className="w-4 h-4" strokeWidth={3} />
                </motion.div>
              ) : (
                i + 1
              )}
            </motion.div>
            <span
              className={`text-[11px] font-bold tracking-wider uppercase hidden sm:block transition-colors duration-300 ${
                isActive ? "text-primary" : isComplete ? "text-primary/50" : "text-muted-foreground/60"
              }`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="relative h-[3px] flex-1 mx-3 rounded-full bg-secondary overflow-hidden">
              <motion.div
                initial={false}
                animate={{ width: isComplete ? "100%" : "0%" }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="absolute inset-y-0 left-0 rounded-full gradient-primary"
              />
            </div>
          )}
        </div>
      );
    })}
  </div>
);

export default StepIndicator;
