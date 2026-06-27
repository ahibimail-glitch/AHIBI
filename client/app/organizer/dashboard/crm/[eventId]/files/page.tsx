"use client";

import { Folder } from "lucide-react";
import CrmComingSoon from "@/app/organizer/components/crm/CrmComingSoon";

export default function CrmFilesPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-white mb-8">Files</h1>
      <CrmComingSoon
        title="Files"
        description="Store and share event documents."
        icon={Folder}
      />
    </div>
  );
}
