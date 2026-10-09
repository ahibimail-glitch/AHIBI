"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import { CrmProvider, useCrm } from "@/app/organizer/components/crm/CrmContext";
import CrmSidebar, { CrmMobileHeader } from "@/app/organizer/components/crm/CrmSidebar";
import CrmTopBar from "@/app/organizer/components/crm/CrmTopBar";

function CrmLayoutShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { event, loading, error } = useCrm();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#f97316] mx-auto mb-4" />
          <p className="text-[#8b949e]">Loading event command...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center p-4">
        <div className="rounded-xl border border-[#21262d] bg-[#131820] p-6 max-w-md w-full text-center">
          <h2 className="text-lg font-semibold text-white mb-2">Unable to open CRM</h2>
          <p className="text-sm text-red-400 mb-6">{error || "Event not found"}</p>
          <button
            type="button"
            onClick={() => router.push("/organizer/dashboard")}
            className="inline-flex items-center gap-2 text-sm text-[#8b949e] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white">
      <CrmTopBar />

      <div className="flex pt-[57px] min-h-screen">
        <CrmSidebar
          event={event}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <CrmMobileHeader sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="flex-1 min-w-0 lg:ml-0">
          <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 lg:pt-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <CrmProvider>
      <CrmLayoutShell>{children}</CrmLayoutShell>
    </CrmProvider>
  );
}
