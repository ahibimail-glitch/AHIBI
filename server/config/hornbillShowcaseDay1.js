/** Ticket to Hornbill — Band Battle & Festival Showcase (6 Nov 2026) */

const SLUG = 'ticket-to-hornbill-showcase-day1';

const EVENT = {
  slug: SLUG,
  title: 'Ticket to Hornbill — India’s Biggest Band Battle & Hornbill Festival Showcase',
  subtitle: 'Window to Nagaland — Band Battle & Festival Showcase',
  description:
    'Casio presents Ticket to Hornbill 2026 — India’s Biggest Band Battle & Hornbill Festival Showcase: Window to Nagaland, bringing together Nagaland’s vibrant culture, music, and electrifying live performances at Talkatora Stadium, New Delhi, on 6th November 2026. Gates open at 4 PM.\n\n' +
    'Free entry. Register below to receive your personalised digital pass with a QR code for check-in.',
  banner: '/images/hornbill-showcase-day1-desktop.jpg',
  coverImage: '/images/hornbill-showcase-day1-mobile.jpg',
  category: 'Music',
  tags: ['Hornbill', 'Ticket to Hornbill', 'Nagaland', 'Free Entry', 'Band Battle', 'Festival Showcase'],
  isExternal: true,
  externalBookingUrl: '/ticket-to-hornbill',
  isFeatured: true,
  // 6 Nov 2026, 4:00 PM – 10:30 PM IST
  startDate: new Date('2026-11-06T10:30:00.000Z'), // 16:00 IST
  endDate: new Date('2026-11-06T17:00:00.000Z'), // 22:30 IST
  bookingEndTime: new Date('2026-11-06T17:00:00.000Z'), // close when event ends
  location: {
    address: 'Talkatora Stadium',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    pincode: '110001',
  },
  ticketType: {
    name: 'Free Entry Pass',
    description: 'Complimentary entry for Ticket to Hornbill — Band Battle & Festival Showcase',
    price: 0,
    basePrice: 0,
    quantity: 50000,
    capacity: 1,
    benefits: ['Free entry', 'Personalised QR pass for gate check-in'],
  },
  termsAndConditions:
    'Free entry. One registration (one pass) per phone number. ' +
    'Valid photo ID may be requested at the gate. Organisers reserve the right to refuse entry. ' +
    'For more information visit www.hornbillmusicfestival.com',
  dateLabel: '6th November, 2026',
  gatesOpenLabel: 'Gates open at 4:00 PM',
  venueLabel: 'Talkatora Stadium, New Delhi',
};

module.exports = { SLUG, EVENT };
