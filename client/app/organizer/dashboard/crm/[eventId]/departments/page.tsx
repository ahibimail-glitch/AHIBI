"use client";

import { Layers } from "lucide-react";
import CrmComingSoon from "@/app/organizer/components/crm/CrmComingSoon";

export default function CrmDepartmentsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-white mb-8">Departments</h1>
      <CrmComingSoon
        title="Departments"
        description="Organize teams by department and role."
        icon={Layers}
      />
    </div>
  );
}
