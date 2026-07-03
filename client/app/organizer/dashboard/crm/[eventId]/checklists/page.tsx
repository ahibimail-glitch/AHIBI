"use client";

import { useParams } from "next/navigation";
import CrmChecklists from "@/app/organizer/components/crm/CrmChecklists";

export default function CrmChecklistsPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  return <CrmChecklists eventId={eventId} />;
}
