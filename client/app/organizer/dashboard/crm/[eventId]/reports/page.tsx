"use client";

import { BarChart3 } from "lucide-react";
import CrmComingSoon from "@/app/organizer/components/crm/CrmComingSoon";

export default function CrmReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-white mb-8">Reports</h1>
      <CrmComingSoon
        title="Reports"
        description="View analytics and export event operation reports."
        icon={BarChart3}
      />
    </div>
  );
}
