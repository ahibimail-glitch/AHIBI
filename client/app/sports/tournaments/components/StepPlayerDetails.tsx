import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { motion } from "framer-motion";
import { User, Phone, Mail, CalendarDays } from "lucide-react";

export interface PlayerData {
  fullName: string;
  age: string;
  gender: string;
  phone: string;
  email: string;
}

interface StepPlayerDetailsProps {
  title: string;
  data: PlayerData;
  onChange: (data: PlayerData) => void;
  errors: Partial<Record<keyof PlayerData, string>>;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const StepPlayerDetails = ({ title, data, onChange, errors }: StepPlayerDetailsProps) => {
  const update = (field: keyof PlayerData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="rounded-[24px] bg-slate-950 p-5 text-white">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">Player Details</p>
        <h2 className="mt-2 text-2xl font-black text-white">{title}</h2>
        <p className="mt-1 text-sm text-white/70">Enter accurate player information for registration and payment confirmation.</p>
      </motion.div>

      <div className="space-y-4">
        <motion.div variants={item} className="space-y-1.5">
          <Label htmlFor="fullName" className="text-sm font-black uppercase tracking-[0.18em] text-slate-700 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#f56210]" /> Full Name
          </Label>
          <Input id="fullName" placeholder="Enter full name" value={data.fullName} onChange={(e) => update("fullName", e.target.value)} className="h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white focus:border-orange-300 transition-colors" />
          {errors.fullName && <p className="text-xs text-destructive font-medium">{errors.fullName}</p>}
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
          <motion.div variants={item} className="space-y-1.5">
            <Label htmlFor="age" className="text-sm font-black uppercase tracking-[0.18em] text-slate-700 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-[#f56210]" /> Age
            </Label>
            <Input id="age" type="number" placeholder="Age" value={data.age} onChange={(e) => update("age", e.target.value)} className="h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white focus:border-orange-300 transition-colors" />
            {errors.age && <p className="text-xs text-destructive font-medium">{errors.age}</p>}
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
                  <RadioGroupItem value={g} id={g} className="sr-only" />
                  {g === "male" ? "Male" : "Female"}
                </label>
              ))}
            </RadioGroup>
            {errors.gender && <p className="text-xs text-destructive font-medium">{errors.gender}</p>}
          </motion.div>
        </div>

        <motion.div variants={item} className="space-y-1.5">
          <Label htmlFor="phone" className="text-sm font-black uppercase tracking-[0.18em] text-slate-700 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-[#f56210]" /> Phone Number
          </Label>
          <Input id="phone" type="tel" placeholder="Enter phone number" value={data.phone} onChange={(e) => update("phone", e.target.value)} className="h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white focus:border-orange-300 transition-colors" />
          {errors.phone && <p className="text-xs text-destructive font-medium">{errors.phone}</p>}
        </motion.div>

        <motion.div variants={item} className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-black uppercase tracking-[0.18em] text-slate-700 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-[#f56210]" /> Email Address
          </Label>
          <Input id="email" type="email" placeholder="Enter email address" value={data.email} onChange={(e) => update("email", e.target.value)} className="h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white focus:border-orange-300 transition-colors" />
          {errors.email && <p className="text-xs text-destructive font-medium">{errors.email}</p>}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default StepPlayerDetails;
