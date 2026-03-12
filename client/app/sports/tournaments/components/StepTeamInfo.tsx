import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StepTeamInfoProps {
  teamName: string;
  onChange: (value: string) => void;
  error?: string;
}

const StepTeamInfo = ({ teamName, onChange, error }: StepTeamInfoProps) => {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="rounded-[24px] bg-slate-950 p-5 text-white">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">Team Details</p>
        <h2 className="mt-2 text-2xl font-black text-white">Enter Team Name</h2>
        <p className="mt-1 text-sm text-white/70">Provide the official team name that should appear on the registration and invoice.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="teamName" className="flex items-center gap-1.5 text-sm font-black uppercase tracking-[0.18em] text-slate-700">
          <Users className="h-3.5 w-3.5 text-[#f56210]" /> Team Name
        </Label>
        <Input
          id="teamName"
          placeholder="Enter team name"
          value={teamName}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 rounded-2xl border-slate-200 bg-slate-50 focus:border-orange-300 focus:bg-white transition-colors"
        />
        {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
      </div>
       <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
        <div className="flex gap-3">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-800">
            <span className="text-xs font-black">i</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">Important Note</p>
            <p className="mt-1 text-sm text-amber-800 leading-relaxed">
              Players registered for open categories are qualified to register for team events.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StepTeamInfo;
