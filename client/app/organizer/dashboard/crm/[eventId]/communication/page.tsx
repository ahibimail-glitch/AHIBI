"use client";

import { useParams } from "next/navigation";
import CrmCommunication from "@/app/organizer/components/crm/CrmCommunication";

export default function CrmCommunicationPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  return <CrmCommunication eventId={eventId} />;
}
