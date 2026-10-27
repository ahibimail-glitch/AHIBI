const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createMemberTicketQrPayload,
  createOfficialTicketPdfBuffer,
  attendeeDetails,
  getTicketPriceText,
  ticketDisplayData,
} = require('../services/officialTicketPdfService');

const booking = {
  _id: '0123456789abcdef01234567',
  bookingCode: 'AHB-TEST-1042',
  event: 'abcdefabcdefabcdefabcdef',
  ticketType: 'Premium Pass',
  ticketIndex: 1,
  totalTickets: 1,
  quantity: 1,
  price: 0,
  total: 0,
  status: 'confirmed',
  paymentStatus: 'completed',
  bookedAt: new Date('2026-10-20T10:30:00.000Z'),
  customerName: 'NUSC Test Member',
  customerEmail: 'member@example.test',
  customerPhone: '+91 90000 00000',
  nuscSeasonPassType: 'premium-season',
};

const event = {
  _id: booking.event,
  title: 'NUSC Home Match vs Gokulam Kerala FC',
  startDate: new Date('2026-10-26T13:30:00.000Z'),
  endDate: new Date('2026-10-26T15:30:00.000Z'),
  location: { address: 'Kohima Local Ground', city: 'Kohima' },
  ticketTypes: [{ name: 'Premium Pass', benefits: ['Premium seating'] }],
};

test('member ticket QR payload matches the AHIBI booking invoice source and keeps the booking ID', () => {
  assert.deepEqual(createMemberTicketQrPayload(booking, event), {
    bookingId: booking._id,
    bookingCode: booking.bookingCode,
    name: booking.customerName,
    email: booking.customerEmail,
    phone: booking.customerPhone,
    event: event.title,
    ticketType: booking.ticketType,
    ticketIndex: 1,
    totalTickets: 1,
    pricePerTicket: 'RSVP',
    total: 'RSVP',
    ticketId: `${booking._id}_ticket_1`,
  });
});

test('NUSC ticket price label replaces the individual ticket price', () => {
  assert.equal(getTicketPriceText(booking, 'Included with NUSC season pass'), 'Included with NUSC season pass');
});

test('attendee override is rendered without changing the member ticket QR payload source', () => {
  const attendee = { name: 'Member Name', email: 'member@example.test', phone: '+91 98765 43210' };
  assert.deepEqual(attendeeDetails(booking, attendee), attendee);
  assert.deepEqual(ticketDisplayData(booking, { attendee, includedWith: 'Included with NUSC season pass' }), {
    attendee,
    priceText: 'Included with NUSC season pass',
  });

  const accountlessBooking = { ...booking };
  delete accountlessBooking.customerName;
  delete accountlessBooking.customerEmail;
  delete accountlessBooking.customerPhone;
  const qrPayload = createMemberTicketQrPayload(accountlessBooking, event);
  assert.equal(qrPayload.name, '-');
  assert.equal(qrPayload.email, '-');
  assert.equal(qrPayload.phone, '-');
  assert.equal(qrPayload.bookingId, booking._id);
});

test('branded NUSC ticket PDF renders supplied attendee values with the member QR source', async () => {
  const attendee = { name: 'Member Name', email: 'member@example.test', phone: '+91 98765 43210' };
  const pdf = await createOfficialTicketPdfBuffer(booking, event, {
    includedWith: 'Included with NUSC season pass',
    useMemberTicketQrSource: true,
    attendee,
  });

  assert.equal(pdf.subarray(0, 5).toString('ascii'), '%PDF-');
  assert.ok(pdf.length > 10_000, 'PDF includes its branded ticket art and QR image');
});
