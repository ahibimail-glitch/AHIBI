import { NextResponse } from "next/server";

type FestivalEvent = {
  _id?: string;
  title?: string;
  slug?: string;
  startDate?: string;
  ticketTypes?: Array<{ price?: number; quantity?: number; sold?: number; unlimited?: boolean }>;
};

function getEvents(payload: any): FestivalEvent[] {
  if (Array.isArray(payload?.data?.events)) return payload.data.events;
  if (Array.isArray(payload?.events)) return payload.events;
  if (Array.isArray(payload?.data) && payload.data.every((item: any) => item?._id)) return payload.data;
  return [];
}

function isBookableFestivalEvent(event: FestivalEvent, kind: "day" | "music") {
  const label = `${event.title || ""} ${event.slug || ""}`.toLowerCase();
  const isLegacyShowcase = label.includes("ticket-to-hornbill-showcase") || label.includes("showcase day1");
  const is2026Event = label.includes("2026") || String(event.startDate || "").startsWith("2026-");
  const isCorrectFestival = label.includes("hornbill") && (kind === "music"
    ? label.includes("music")
    : label.includes("festival") && !label.includes("music"));
  const hasAvailableTicket = (event.ticketTypes || []).some((ticket) => {
    const available = ticket.unlimited === true || ticket.quantity == null || Number(ticket.quantity) > Number(ticket.sold || 0);
    // The configured event price is the source of truth. Avoid hard-coding it
    // here: the redirect must keep working when the festival price changes.
    return Number.isFinite(Number(ticket.price)) && Number(ticket.price) >= 0 && available;
  });

  return Boolean(event._id && is2026Event && isCorrectFestival && !isLegacyShowcase && hasAvailableTicket);
}

export async function GET(
  request: Request,
  context: { params: { kind: string } },
) {
  const kind = context.params.kind === "music" ? "music" : context.params.kind === "day" ? "day" : null;
  if (!kind) return NextResponse.json({ message: "Festival not found." }, { status: 404 });

  const pagePath = kind === "music" ? "/hornbill-music-festival-2026" : "/hornbill-festival-2026";
  const unavailableUrl = new URL(`${pagePath}?booking=unavailable`, request.url);

  try {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || new URL(request.url).origin).replace(/\/+$/, "");
    const response = await fetch(`${apiBase}/api/events?limit=1000&includePast=true`, { cache: "no-store" });
    if (!response.ok) return NextResponse.redirect(unavailableUrl);

    const events = getEvents(await response.json());
    const event = events.find((item) => isBookableFestivalEvent(item, kind));
    if (!event?._id) return NextResponse.redirect(unavailableUrl);

    return NextResponse.redirect(new URL(`/events/${event._id}/checkout`, request.url));
  } catch (error) {
    console.error("Unable to resolve Hornbill festival checkout:", error);
    return NextResponse.redirect(unavailableUrl);
  }
}
