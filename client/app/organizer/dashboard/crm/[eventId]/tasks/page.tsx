"use client";

import { useParams } from "next/navigation";
import CrmTasks from "@/app/organizer/components/crm/CrmTasks";

export default function CrmTasksPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  return <CrmTasks eventId={eventId} />;
}
