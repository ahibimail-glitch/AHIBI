"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  FileBarChart,
  Folder,
  Layers,
  MessageCircle,
  Rocket,
  Shield,
  ListChecks,
  UserPlus,
  Users,
} from "lucide-react";

type Step = {
  n: number;
  title: string;
  icon: typeof Rocket;
  body: string;
  bullets: string[];
  href?: string;
};

interface CrmGuideProps {
  eventId: string;
}

function buildOrganizerSteps(basePath: string): Step[] {
  return [
    {
      n: 1,
      title: "Create your organizer account",
      icon: UserPlus,
      body: "Sign up with phone OTP or log in as an organizer. Your account owns the events you create.",
      bullets: [
        "Go to Organizer login",
        "Verify with OTP or password",
        "Land on your Events dashboard",
      ],
      href: "/organizer/auth/login",
    },
    {
      n: 2,
      title: "Activate CRM on your event",
      icon: CalendarPlus,
      body: "Once your event is approved, open it from the dashboard and click Activate CRM to open the event command workspace.",
      bullets: [
        "Create or select an approved event",
        "Click Activate CRM on the event card",
        "You arrive in Event Overview",
      ],
      href: basePath,
    },
    {
      n: 3,
      title: "Set up departments",
      icon: Layers,
      body: "Departments are the backbone of your operation: Stage, Security, Hospitality, Medical, Ticketing — whatever your event needs.",
      bullets: [
        "Open Departments in the sidebar",
        "Add each team with a color tag",
        "Delete or rename anytime",
      ],
      href: `${basePath}/departments`,
    },
    {
      n: 4,
      title: "Define roles & responsibilities",
      icon: Shield,
      body: "Create roles inside each department and list what each role is accountable for on event day.",
      bullets: [
        "Open Roles & Responsibilities",
        "Create roles per department",
        "Add responsibility items with priority",
      ],
      href: `${basePath}/roles`,
    },
    {
      n: 5,
      title: "Invite your team",
      icon: Users,
      body: "Invite teammates by phone and email. They receive SMS/email and join via the manage event hub after accepting.",
      bullets: [
        "Open Team Members",
        "Pick a department for each invite",
        "Share the invite — they accept at /manageEvent",
      ],
      href: `${basePath}/team`,
    },
    {
      n: 6,
      title: "Build checklists",
      icon: ListChecks,
      body: "Create pre-event, event-day and post-event checklists scoped to a department or event-wide.",
      bullets: [
        "Open Checklists",
        "Create lists per phase",
        "Add items teammates can tick off on the day",
      ],
      href: `${basePath}/checklists`,
    },
    {
      n: 7,
      title: "Assign tasks with deadlines",
      icon: ClipboardList,
      body: "Tasks are units of work with a deadline, an assignee, and completion notes once done.",
      bullets: [
        "Open Tasks → create a task",
        "Set assignee + deadline",
        "Track status: not started → in progress → completed",
      ],
      href: `${basePath}/tasks`,
    },
    {
      n: 8,
      title: "Run incident command on the day",
      icon: AlertTriangle,
      body: "Anyone on the team can report an incident. You triage, update status, and resolve with a full log.",
      bullets: [
        "Open Incidents to monitor the queue",
        "Teammates report from their event hub",
        "Resolve and close when handled",
      ],
      href: `${basePath}/incidents`,
    },
    {
      n: 9,
      title: "Share files & connect Discord",
      icon: Folder,
      body: "Upload runsheets, floor plans and contracts. Link Discord channels per department so your team jumps straight into chat.",
      bullets: [
        "Files: upload and pin the important ones",
        "Communication: paste Discord invite URLs per department",
      ],
      href: `${basePath}/files`,
    },
    {
      n: 10,
      title: "Wrap up with the post-event report",
      icon: FileBarChart,
      body: "After the event, open Reports for task/checklist completion, incidents, and department performance.",
      bullets: [
        "Open Reports",
        "Review KPIs and incident log",
        "Export CSV or print for stakeholders",
      ],
      href: `${basePath}/reports`,
    },
  ];
}

const TEAMMATE_STEPS: Step[] = [
  {
    n: 1,
    title: "Accept your invite",
    icon: UserPlus,
    body: "Open the invite link your organizer sent. Sign in with the phone number on the invite and accept to join the event team.",
    bullets: [
      "Open the invite link (SMS/email)",
      "Sign in with your mobile number",
      "Accept the invitation",
    ],
    href: "/manageEvent",
  },
  {
    n: 2,
    title: "Open your event hub",
    icon: Rocket,
    body: "Your events live at /manageEvent. Pick the event you're working today to see tasks, checklists, and department info.",
    bullets: ["Go to /manageEvent", "Select the active event", "Use the tabs for each area"],
    href: "/manageEvent",
  },
  {
    n: 3,
    title: "Run your tasks & checklist",
    icon: CheckCircle2,
    body: "See only what's assigned to you. Update task status and add completion notes. Tick off checklist items as you go.",
    bullets: [
      "My Tasks: update status + completion note",
      "Checklist: one-tap check-off",
    ],
  },
  {
    n: 4,
    title: "Report incidents",
    icon: AlertTriangle,
    body: "If something goes wrong on site, file an incident from the Report Incident tab. Command sees it immediately in CRM.",
    bullets: ["Open Report Incident tab", "Add title, details, location and priority"],
  },
  {
    n: 5,
    title: "Use department info & comms",
    icon: MessageCircle,
    body: "Your Department Info tab shows responsibilities, shared files, and pinned docs. Communication tab opens Discord channels.",
    bullets: [
      "Responsibilities for your department",
      "Files: runsheets and maps",
      "Communication: Discord channel links",
    ],
  },
];

function StepCard({ step }: { step: Step }) {
  const Icon = step.icon;

  return (
    <div className="rounded-xl border border-[#21262d] bg-[#131820] p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-md bg-[#f97316]/15 font-mono text-sm font-semibold text-[#f97316]">
          {step.n.toString().padStart(2, "0")}
        </div>
        <Icon className="h-4 w-4 text-[#f97316] shrink-0" />
        <h3 className="font-semibold text-white">{step.title}</h3>
      </div>
      <p className="mt-3 text-sm text-[#8b949e]">{step.body}</p>
      <ul className="mt-3 space-y-1.5">
        {step.bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm text-[#c9d1d9]">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      {step.href && (
        <Link
          href={step.href}
          className="mt-4 inline-flex text-xs font-medium text-[#f97316] hover:text-[#fb923c] transition-colors"
        >
          Go to section →
        </Link>
      )}
    </div>
  );
}

export default function CrmGuide({ eventId }: CrmGuideProps) {
  const basePath = `/organizer/dashboard/crm/${eventId}`;
  const organizerSteps = buildOrganizerSteps(basePath);

  return (
    <div>
      <div className="inline-flex items-center gap-2 rounded-full border border-[#21262d] bg-[#131820] px-3 py-1 text-xs text-[#8b949e]">
        <BookOpen className="h-3 w-3 text-[#f97316]" />
        Step-by-step guide
      </div>

      <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-white">
        How to use Event CRM
      </h1>
      <p className="mt-2 text-sm text-[#8b949e] max-w-2xl">
        Two paths: the organiser flow to set up and run an event, and the teammate flow for
        everyone you invite. Pick the one that applies to you.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <a
          href="#organizers"
          className="rounded-md border border-[#21262d] bg-[#131820] px-3 py-1.5 text-[#c9d1d9] hover:bg-[#161b26] hover:text-white transition-colors"
        >
          For organisers
        </a>
        <a
          href="#teammates"
          className="rounded-md border border-[#21262d] bg-[#131820] px-3 py-1.5 text-[#c9d1d9] hover:bg-[#161b26] hover:text-white transition-colors"
        >
          For teammates
        </a>
      </div>

      <section id="organizers" className="mt-10 scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-white">For organisers</h2>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6e7681]">
            10 steps
          </span>
        </div>
        <p className="mt-1 text-sm text-[#8b949e]">From zero to a fully wired event command center.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {organizerSteps.map((s) => (
            <StepCard key={s.n} step={s} />
          ))}
        </div>
      </section>

      <section id="teammates" className="mt-12 scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-white">For teammates</h2>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6e7681]">
            5 steps
          </span>
        </div>
        <p className="mt-1 text-sm text-[#8b949e]">Everything an invited team member needs to know.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {TEAMMATE_STEPS.map((s) => (
            <StepCard key={s.n} step={s} />
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-xl border border-[#21262d] bg-[#131820] p-6 sm:p-8 text-center">
        <h2 className="text-xl font-semibold tracking-tight text-white">
          Ready to run this event?
        </h2>
        <p className="mt-2 text-sm text-[#8b949e]">
          Jump straight into departments, team invites, or your overview dashboard.
        </p>
        <div className="mt-5 flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href={`${basePath}/departments`}
            className="rounded-md bg-[#f97316] hover:bg-[#ea580c] px-5 py-2.5 text-sm font-semibold text-black transition-colors"
          >
            Set up departments
          </Link>
          <Link
            href={basePath}
            className="rounded-md border border-[#21262d] bg-[#0d1117] px-5 py-2.5 text-sm font-medium text-[#c9d1d9] hover:bg-[#161b26] hover:text-white transition-colors"
          >
            Back to overview
          </Link>
        </div>
      </section>
    </div>
  );
}
