"use client";

import { MessageSquare } from "lucide-react";
import CrmComingSoon from "@/app/organizer/components/crm/CrmComingSoon";

export default function CrmCommunicationPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-white mb-8">Communication</h1>
      <CrmComingSoon
        title="Communication"
        description="Send announcements and messages to your event team."
        icon={MessageSquare}
      />
    </div>
  );
}
