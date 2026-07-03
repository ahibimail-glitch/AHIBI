"use client";

import { useParams } from "next/navigation";
import CrmIncidents from "@/app/organizer/components/crm/CrmIncidents";

export default function CrmIncidentsPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  return <CrmIncidents eventId={eventId} />;
}
