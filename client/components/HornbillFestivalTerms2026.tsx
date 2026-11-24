const sections = [
  { title: "1. Ticket Purchase", items: ["Tickets must be purchased through AHIBI.in or authorised offline ticketing counters.", "Provide accurate booking information. A confirmation and ticket are issued after successful payment.", "Keep your ticket available digitally or in print for entry verification."] },
  { title: "2. Separate Festival Tickets", items: ["Hornbill Festival daytime entry and Hornbill Music Festival nighttime entry are separate events with different schedules and entry requirements.", "Tickets are valid only for the event, date and category selected. A ticket for one event does not grant access to the other.", "Purchase separate tickets to attend both events."] },
  { title: "3. Entry & Verification", items: ["Entry requires a valid ticket, verified by QR code or another authorised method. Each ticket is valid for one entry unless stated otherwise.", "Attendees must cooperate with event security and entry personnel.", "The organiser may deny entry for invalid, duplicated, altered or fraudulent tickets."] },
  { title: "4. Refunds & Cancellations", items: ["All ticket sales are final. Tickets are strictly non-refundable.", "Tickets cannot be exchanged or cancelled after booking. No refund is available for non-attendance or a change in personal plans.", "If the organiser cancels or postpones the event, refund or alternative arrangements will be communicated by the organiser.", "Convenience fees and payment processing charges are non-refundable."] },
  { title: "5. Event Schedule", items: ["Artist lineups, timings and schedules may change. The organiser may modify programming, venue arrangements or timings when necessary.", "Changes to performers or schedules do not automatically entitle ticket holders to a refund."] },
  { title: "6. Event Rules & Security", items: ["Attendees must follow organiser and venue authority instructions. Entry may be subject to security screening.", "Prohibited items may be restricted, and entry may be denied to individuals violating event rules.", "Attendees must maintain appropriate conduct throughout the event."] },
  { title: "7. Lost or Misused Tickets", items: ["Customers are responsible for keeping their tickets and booking details secure.", "AHIBI and the organiser are not responsible for unauthorised ticket use resulting from ticket sharing, duplication or disclosure of booking details.", "Duplicate tickets or screenshots of already-used tickets will not admit another person."] },
  { title: "8. Photography & Recording", items: ["The event may be photographed, filmed or recorded for promotional and documentation purposes. Attendees may appear in material used by the organiser or its authorised partners.", "Professional photography, recording equipment and stage access may be restricted."] },
  { title: "9. Liability", items: ["Attendees are responsible for their belongings and conduct. The organiser and partners are not responsible for loss, theft or damage except where liability cannot legally be excluded.", "Follow all safety instructions and venue regulations."] },
  { title: "10. Contact & Support", items: ["For booking assistance, payment issues or ticket queries, contact AHIBI through ahibi.in."] },
];

export default function HornbillFestivalTerms2026() {
  return (
    <div className="space-y-5 text-sm leading-6 text-gray-700">
      <p>By purchasing a Hornbill Festival 2026 ticket through AHIBI.in, you agree to these Terms & Conditions.</p>
      {sections.map((section) => (
        <section key={section.title}>
          <h3 className="mb-2 font-semibold text-gray-900">{section.title}</h3>
          <ul className="list-disc space-y-1 pl-5">
            {section.items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      ))}
      <p>By completing your purchase, you acknowledge that you have read and agreed to these Terms & Conditions.</p>
    </div>
  );
}
