"use client";

import {
  Users,
  Layers,
  ClipboardList,
  ListChecks,
  AlertTriangle,
  Folder,
} from "lucide-react";
import { useCrm } from "@/app/organizer/components/crm/CrmContext";
import CrmMetricCard from "@/app/organizer/components/crm/CrmMetricCard";

export default function CrmOverviewPage() {
  const { eventId, uniqueAttendees } = useCrm();
  const basePath = `/organizer/dashboard/crm/${eventId}`;

  const cards = [
    { label: "Team Members", value: uniqueAttendees.length, icon: Users, to: "team" },
    { label: "Departments", value: 0, icon: Layers, to: "departments" },
    { label: "Tasks Open", value: 0, icon: ClipboardList, to: "tasks" },
    { label: "Tasks Completed", value: 0, icon: ClipboardList, to: "tasks", tone: "success" as const },
    { label: "Tasks Overdue", value: 0, icon: ClipboardList, to: "tasks", tone: "warning" as const },
    { label: "Checklist Items", value: 0, icon: ListChecks, to: "checklists" },
    { label: "Incidents Open", value: 0, icon: AlertTriangle, to: "incidents", tone: "warning" as const },
    { label: "Incidents Resolved", value: 0, icon: AlertTriangle, to: "incidents", tone: "success" as const },
    { label: "Files", value: 0, icon: Folder, to: "files" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-white">Event Overview</h1>
      <p className="text-sm text-[#8b949e] mt-1">Live operations snapshot.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <CrmMetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            href={`${basePath}/${card.to}`}
            tone={card.tone}
          />
        ))}
      </div>
    </div>
  );
}
