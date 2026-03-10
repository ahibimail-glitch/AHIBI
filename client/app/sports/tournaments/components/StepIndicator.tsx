import { Check } from "lucide-react";
import { motion } from "framer-motion";

interface StepIndicatorProps {
  currentStep: number;
  steps: string[];
}

const StepIndicator = ({ currentStep, steps }: StepIndicatorProps) => (
  <div className="flex items-center justify-center w-full max-w-2xl mx-auto py-2 md:py-4">
    {steps.map((label, i) => {
      const isComplete = i < currentStep;
      const isActive = i === currentStep;
      return (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-2.5">
            <motion.div
              initial={false}
              animate={{
                scale: isActive ? 1.08 : 1,
                boxShadow: isActive
                  ? "0 0 0 6px rgba(245,98,16,0.14), 0 12px 28px rgba(245,98,16,0.28)"
                  : isComplete
                  ? "0 10px 20px rgba(7,17,38,0.14)"
                  : "none",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-black transition-colors duration-300 ${
                isComplete || isActive
                  ? "bg-[#f56210] text-white"
                  : "bg-slate-100 text-slate-500 border border-slate-200"
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
              className={`text-[11px] font-black tracking-[0.22em] uppercase hidden sm:block transition-colors duration-300 ${
                isActive ? "text-[#f56210]" : isComplete ? "text-slate-800" : "text-slate-400"
              }`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="relative h-[4px] flex-1 mx-3 rounded-full bg-slate-200 overflow-hidden">
              <motion.div
                initial={false}
                animate={{ width: isComplete ? "100%" : "0%" }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="absolute inset-y-0 left-0 rounded-full bg-[#f56210]"
              />
            </div>
          )}
        </div>
      );
    })}
  </div>
);

export default StepIndicator;
