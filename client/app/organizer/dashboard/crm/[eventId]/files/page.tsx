"use client";

import { useParams } from "next/navigation";
import CrmFiles from "@/app/organizer/components/crm/CrmFiles";

export default function CrmFilesPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  return <CrmFiles eventId={eventId} />;
}
