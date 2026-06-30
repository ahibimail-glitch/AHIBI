"use client";

import { useParams } from "next/navigation";
import CrmDepartments from "@/app/organizer/components/crm/CrmDepartments";

export default function CrmDepartmentsPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  return <CrmDepartments eventId={eventId} />;
}
