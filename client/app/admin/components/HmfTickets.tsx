"use client";

import EventTicketBookings from "./EventTicketBookings";

const HMF_EVENT_IDS = [
  "691b1066a9a25d4fec36f96c",
  "691b13caa9a25d4fec36fa70",
  "691b146fa9a25d4fec36fb25",
  "691b14f1a9a25d4fec36fbd7",
  "691b156ea9a25d4fec36fc8d",
  "691b15c5a9a25d4fec36fd3a",
  "691b15faa9a25d4fec36fd3f",
  "691b162ca9a25d4fec36fd44",
  "691b1771a9a25d4fec36feaf",
];

export default function HmfTickets() {
  return <EventTicketBookings title="HMF Tickets" eventIds={HMF_EVENT_IDS} />;
}
