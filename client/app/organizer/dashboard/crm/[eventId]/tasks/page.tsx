"use client";

import { ClipboardList } from "lucide-react";
import CrmComingSoon from "@/app/organizer/components/crm/CrmComingSoon";

export default function CrmTasksPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-white mb-8">Tasks</h1>
      <CrmComingSoon
        title="Tasks"
        description="Track open, completed, and overdue event tasks."
        icon={ClipboardList}
      />
    </div>
  );
}
