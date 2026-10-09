"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarButtonProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}

export default function SidebarButton({
  icon: Icon,
  label,
  active,
  onClick,
}: SidebarButtonProps) {
  return (
    <button
      className={cn(
        "flex items-center space-x-3 w-full px-3 py-2 rounded-lg text-left transition-all",
        active
          ? "bg-blue-50 text-blue-700 font-medium"
          : "text-gray-600 hover:bg-gray-100"
      )}
      onClick={onClick}
    >
      <Icon className={cn("h-5 w-5", active ? "text-blue-700" : "text-gray-500")} />
      <span>{label}</span>
    </button>
  );
}
