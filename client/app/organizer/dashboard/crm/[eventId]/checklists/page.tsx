"use client";

import { ListChecks } from "lucide-react";
import CrmComingSoon from "@/app/organizer/components/crm/CrmComingSoon";

export default function CrmChecklistsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-white mb-8">Checklists</h1>
      <CrmComingSoon
        title="Checklists"
        description="Run pre-event and day-of checklists."
        icon={ListChecks}
      />
    </div>
  );
}
