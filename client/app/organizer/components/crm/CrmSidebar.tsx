"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Layers,
  ClipboardList,
  ListChecks,
  AlertTriangle,
  Folder,
  ChevronLeft,
  Menu,
  X,
  Shield,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import type { EventDetails } from "./CrmContext";

export interface CrmNavItem {
  label: string;
  segment: string;
  icon: React.ElementType;
  exact?: boolean;
}

export const CRM_NAV_ITEMS: CrmNavItem[] = [
  { label: "Overview", segment: "", icon: LayoutDashboard, exact: true },
  { label: "Departments", segment: "departments", icon: Layers },
  { label: "Team Members", segment: "team", icon: Users },
  { label: "Roles & Responsibilities", segment: "roles", icon: Shield },
  { label: "Checklists", segment: "checklists", icon: ListChecks },
  { label: "Tasks", segment: "tasks", icon: ClipboardList },
  { label: "Incidents", segment: "incidents", icon: AlertTriangle },
  { label: "Files", segment: "files", icon: Folder },
  { label: "Communication", segment: "communication", icon: MessageSquare },
  { label: "Reports", segment: "reports", icon: BarChart3 },
];

interface CrmSidebarProps {
  event: EventDetails;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  backHref?: string;
  backLabel?: string;
  basePath?: string;
}

function SidebarLink({
  icon: Icon,
  label,
  active,
  href,
  onNavigate,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  href: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
        active
          ? "bg-[#1e2433] text-white"
          : "text-[#8b949e] hover:bg-[#161b26] hover:text-white"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[#f97316]" : ""}`} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export default function CrmSidebar({
  event,
  sidebarOpen,
  setSidebarOpen,
  backHref = "/organizer/dashboard",
  backLabel = "All events",
  basePath,
}: CrmSidebarProps) {
  const pathname = usePathname();
  const resolvedBasePath = basePath || `/organizer/dashboard/crm/${event._id}`;

  const isActive = (item: CrmNavItem) => {
    const href = item.segment ? `${resolvedBasePath}/${item.segment}` : resolvedBasePath;
    if (item.exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const closeSidebar = () => setSidebarOpen(false);
  const eventSubtitle =
    [event.location?.city, event.location?.state].filter(Boolean).join(", ") ||
    new Date(event.startDate).toLocaleDateString();

  return (
    <>
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-[#0d1117] border-r border-[#21262d]
          flex flex-col pt-[57px] transform transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:static lg:translate-x-0 lg:pt-0
        `}
      >
        <div className="flex flex-col h-full px-4 py-5">
          <Link
            href={backHref}
            onClick={closeSidebar}
            className="flex items-center gap-1.5 text-sm text-[#8b949e] hover:text-white mb-6 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {backLabel}
          </Link>

          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6e7681] mb-2">
              Event
            </p>
            <h2 className="text-sm font-semibold text-white line-clamp-2 leading-snug">
              {event.title}
            </h2>
            <p className="text-xs text-[#8b949e] mt-1 line-clamp-2">{eventSubtitle}</p>
          </div>

          <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto">
            {CRM_NAV_ITEMS.map((item) => {
              const href = item.segment ? `${resolvedBasePath}/${item.segment}` : resolvedBasePath;
              return (
                <SidebarLink
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  active={isActive(item)}
                  href={href}
                  onNavigate={closeSidebar}
                />
              );
            })}
          </nav>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={closeSidebar} />
      )}
    </>
  );
}

export function CrmMobileHeader({
  sidebarOpen,
  setSidebarOpen,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}) {
  return (
    <div className="lg:hidden fixed top-[57px] left-0 right-0 z-10 bg-[#0d1117] border-b border-[#21262d] px-4 py-2 flex justify-end">
      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="p-2 text-[#8b949e] hover:text-white rounded-lg hover:bg-[#161b26]"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
    </div>
  );
}
