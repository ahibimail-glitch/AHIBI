"use client";

import { Shield } from "lucide-react";
import CrmComingSoon from "@/app/organizer/components/crm/CrmComingSoon";

export default function CrmRolesPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-white mb-8">
        Roles & Responsibilities
      </h1>
      <CrmComingSoon
        title="Roles & Responsibilities"
        description="Define roles and assign responsibilities across your event team."
        icon={Shield}
      />
    </div>
  );
}
