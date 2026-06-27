"use client";

import { AlertTriangle } from "lucide-react";
import CrmComingSoon from "@/app/organizer/components/crm/CrmComingSoon";

export default function CrmIncidentsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-white mb-8">Incidents</h1>
      <CrmComingSoon
        title="Incidents"
        description="Log and resolve on-site incidents."
        icon={AlertTriangle}
      />
    </div>
  );
}
