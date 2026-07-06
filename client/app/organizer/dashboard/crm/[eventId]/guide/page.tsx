"use client";

import { useParams } from "next/navigation";
import CrmGuide from "@/app/organizer/components/crm/CrmGuide";

export default function CrmGuidePage() {
  const params = useParams();
  const eventId = params.eventId as string;

  return <CrmGuide eventId={eventId} />;
}
