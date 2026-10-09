/** Ticket to Hornbill — Day 1 Festival Showcase (16 Oct 2026) */

const SLUG = 'ticket-to-hornbill-showcase-day1';

const EVENT = {
  slug: SLUG,
  title: 'Ticket to Hornbill — Festival Showcase (Day 1)',
  subtitle: "Window to Nagaland — A Cultural Showcase",
  description:
    "Casio presents Ticket to Hornbill — India's Biggest Band Battle, 2026.\n\n" +
    'Day 1: Hornbill Festival Showcase — Window to Nagaland, a cultural showcase at Talkatora Stadium, New Delhi.\n\n' +
    'Free entry. Register below to receive your personalised digital pass with a QR code for check-in.',
  banner: '/images/hornbill-showcase-day1-desktop.jpg',
  coverImage: '/images/hornbill-showcase-day1-mobile.jpg',
  category: 'Music',
  tags: ['Hornbill', 'Ticket to Hornbill', 'Nagaland', 'Free Entry', 'Cultural Showcase'],
  isExternal: true,
  externalBookingUrl: '/ticket-to-hornbill',
  isFeatured: true,
  // 16 Oct 2026, gates 4:00 PM IST → store as UTC
  startDate: new Date('2026-10-16T10:30:00.000Z'), // 16:00 IST
  endDate: new Date('2026-10-16T18:29:59.000Z'), // end of day IST
  bookingEndTime: new Date('2026-10-16T10:30:00.000Z'), // close when gates open
  location: {
    address: 'Talkatora Stadium',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    pincode: '110001',
  },
  ticketType: {
    name: 'Free Entry Pass',
    description: 'Complimentary entry for Hornbill Festival Showcase — Day 1',
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
};

module.exports = { SLUG, EVENT };
