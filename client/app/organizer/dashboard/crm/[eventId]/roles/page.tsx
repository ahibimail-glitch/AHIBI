"use client";

import { useParams } from "next/navigation";
import CrmRoles from "@/app/organizer/components/crm/CrmRoles";

export default function CrmRolesPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  return <CrmRoles eventId={eventId} />;
}
