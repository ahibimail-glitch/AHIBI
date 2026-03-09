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
      <motion.h2 variants={item} className="text-xl font-bold text-foreground">{title}</motion.h2>

      <div className="space-y-4">
        <motion.div variants={item} className="space-y-1.5">
          <Label htmlFor="fullName" className="text-sm font-semibold flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-primary" /> Full Name
          </Label>
          <Input id="fullName" placeholder="Enter full name" value={data.fullName} onChange={(e) => update("fullName", e.target.value)} className="h-11 rounded-xl bg-secondary/50 border-border/60 focus:bg-card transition-colors" />
          {errors.fullName && <p className="text-xs text-destructive font-medium">{errors.fullName}</p>}
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
          <motion.div variants={item} className="space-y-1.5">
            <Label htmlFor="age" className="text-sm font-semibold flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-primary" /> Age
            </Label>
            <Input id="age" type="number" placeholder="Age" value={data.age} onChange={(e) => update("age", e.target.value)} className="h-11 rounded-xl bg-secondary/50 border-border/60 focus:bg-card transition-colors" />
            {errors.age && <p className="text-xs text-destructive font-medium">{errors.age}</p>}
          </motion.div>
          <motion.div variants={item} className="space-y-1.5">
            <Label className="text-sm font-semibold">Gender</Label>
            <RadioGroup value={data.gender} onValueChange={(v) => update("gender", v)} className="flex gap-3 pt-2">
              {["male", "female"].map((g) => (
                <label
                  key={g}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium ${
                    data.gender === g
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/20"
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
          <Label htmlFor="phone" className="text-sm font-semibold flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-primary" /> Phone Number
          </Label>
          <Input id="phone" type="tel" placeholder="Enter phone number" value={data.phone} onChange={(e) => update("phone", e.target.value)} className="h-11 rounded-xl bg-secondary/50 border-border/60 focus:bg-card transition-colors" />
          {errors.phone && <p className="text-xs text-destructive font-medium">{errors.phone}</p>}
        </motion.div>

        <motion.div variants={item} className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-primary" /> Email Address
          </Label>
          <Input id="email" type="email" placeholder="Enter email address" value={data.email} onChange={(e) => update("email", e.target.value)} className="h-11 rounded-xl bg-secondary/50 border-border/60 focus:bg-card transition-colors" />
          {errors.email && <p className="text-xs text-destructive font-medium">{errors.email}</p>}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default StepPlayerDetails;
