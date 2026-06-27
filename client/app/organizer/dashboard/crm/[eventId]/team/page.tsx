"use client";

import { useParams } from "next/navigation";
import CrmTeamMembers from "@/app/organizer/components/crm/CrmTeamMembers";

export default function CrmTeamPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  return <CrmTeamMembers eventId={eventId} />;
}
