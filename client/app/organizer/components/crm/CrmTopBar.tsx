"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface OrganizerUser {
  name: string;
  email: string;
}

export default function CrmTopBar({ signOutMode = "organizer" }: { signOutMode?: "organizer" | "user" }) {
  const router = useRouter();
  const [organizer, setOrganizer] = useState<OrganizerUser | null>(null);
  const { user: authUser } = useAuth({
    tokenName: signOutMode === "user" ? "token" : "organizer_token",
    redirectPath: null,
  });

  useEffect(() => {
    if (signOutMode !== "organizer") return;
    const userData = localStorage.getItem("organizer_user");
    if (userData) {
      try {
        setOrganizer(JSON.parse(userData));
      } catch {
        setOrganizer(null);
      }
    }
  }, [signOutMode]);

  const displayEmail =
    signOutMode === "user" ? authUser?.email : organizer?.email;

  const handleSignOut = () => {
    if (signOutMode === "user") {
      localStorage.removeItem("token");
      localStorage.removeItem("tokenExpiry");
      router.push("/auth");
      return;
    }
    localStorage.removeItem("organizer_token");
    localStorage.removeItem("organizer_user");
    router.push("/organizer/auth/login");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-[57px] bg-[#0b0e14] border-b border-[#21262d] flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-[#f97316] flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        <span className="text-white font-semibold text-sm sm:text-base tracking-tight">
          AHIBI Event Command
        </span>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {displayEmail && (
          <span className="hidden sm:inline text-sm text-[#8b949e] truncate max-w-[200px]">
            {displayEmail}
          </span>
        )}
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm text-[#8b949e] hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden xs:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
