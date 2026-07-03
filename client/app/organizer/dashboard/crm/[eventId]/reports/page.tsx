"use client";

import { useParams } from "next/navigation";
import CrmReports from "@/app/organizer/components/crm/CrmReports";

export default function CrmReportsPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  return <CrmReports eventId={eventId} />;
}
