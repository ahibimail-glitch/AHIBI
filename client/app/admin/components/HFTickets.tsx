"use client";

import EventTicketBookings from "./EventTicketBookings";

const HF_EVENT_IDS = [
  "6927f5532cd1c48b94f5bd94",
  "6927f5f02cd1c48b94f5be37",
  "6927f61d2cd1c48b94f5be3d",
  "6927f66e2cd1c48b94f5be88",
  "6927f69c2cd1c48b94f5be8c",
  "6927f6cf2cd1c48b94f5be91",
  "6927f7102cd1c48b94f5bedb",
  "6927f73c2cd1c48b94f5bee0",
  "6927f7a32cd1c48b94f5bf36",
  "6927f7dd2cd1c48b94f5bf3b",
  "6927f84d2cd1c48b94f5bf48",
  "6ab402a990e6bc7f24d420a2",
];

export default function HFTickets() {
  return <EventTicketBookings title="HF Tickets" eventIds={HF_EVENT_IDS} />;
}
