const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const MEMBER_TICKET_COLORS = {
  headerStart: '#312e81',
  indigo: '#4F46E5',
  violet: '#7C3AED',
  pink: '#db2777',
  ink: '#111827',
  muted: '#6b7280',
  faint: '#9ca3af',
  border: '#e5e7eb',
  pageCutout: '#f3f4f6',
};

const MEMBER_TICKET_LOGO = path.join(__dirname, '..', 'assets', 'ahibi-ticket-logo.png');
const SERIAL_NUMBER_EVENT_ID = '6a17f0cfcea3b566702e86a9';

function mergeTicketEvent(eventDoc, eventSnapshot) {
  if (!eventDoc) return eventSnapshot || null;
  if (!eventSnapshot) return eventDoc;
  return {
    ...eventDoc,
    ...eventSnapshot,
    location: {
      ...(eventDoc.location || {}),
      ...(eventSnapshot.location || {}),
    },
  };
}

function attendeeDetails(booking, attendeeOverride) {
  return {
    name: attendeeOverride?.name || booking.user?.name || booking.customerName || '-',
    email: attendeeOverride?.email || booking.user?.email || booking.customerEmail || '-',
    phone: attendeeOverride?.phone || booking.user?.phone || booking.customerPhone || '-',
  };
}

function formatPriceLabel(amount) {
  if (Number(amount) === 0) return 'RSVP';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount));
}

function getTicketPriceText(booking, includedWith) {
  return includedWith || formatPriceLabel(booking.price);
}

function ticketDisplayData(booking, { includedWith, attendee } = {}) {
  return {
    attendee: attendeeDetails(booking, attendee),
    priceText: getTicketPriceText(booking, includedWith),
  };
}

function formatDateShort(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'Date TBA';
  return new Date(value).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatDateTime(value, options) {
  if (!value || Number.isNaN(new Date(value).getTime())) return '';
  return new Date(value).toLocaleTimeString('en-US', options);
}

function memberTicketId(booking) {
  const showSerial = String(booking.event?._id || booking.event || booking.eventSnapshot?._id) === SERIAL_NUMBER_EVENT_ID
    && typeof booking.ticketSerialNumber === 'number';
  return showSerial
    ? `SN-${booking.ticketSerialNumber}`
    : `${booking._id}_ticket_${booking.ticketIndex || 1}`;
}

// This object mirrors booking-invoice.tsx's rawDataObject so the PDF QR
// contains the same booking identity and attendee details as AHIBI's member ticket.
function createMemberTicketQrPayload(booking, event) {
  const attendee = attendeeDetails(booking);
  const showSerial = String(event?._id || booking.event?._id || booking.event || booking.eventSnapshot?._id) === SERIAL_NUMBER_EVENT_ID
    && typeof booking.ticketSerialNumber === 'number';
  const ticketIndex = booking.ticketIndex || 1;
  return {
    bookingId: String(booking._id),
    bookingCode: booking.bookingCode,
    name: attendee.name,
    email: attendee.email,
    phone: attendee.phone,
    event: event?.title || booking.eventSnapshot?.title,
    ticketType: booking.ticketType,
    ticketIndex,
    totalTickets: booking.totalTickets || 1,
    ...(showSerial && { ticketSerialNumber: booking.ticketSerialNumber }),
    pricePerTicket: formatPriceLabel(booking.price),
    total: formatPriceLabel(booking.total),
    ticketId: showSerial ? `SN-${booking.ticketSerialNumber}` : `${booking._id}_ticket_${ticketIndex}`,
  };
}

function createGradient(doc, x, y, width, height) {
  return doc.linearGradient(x, y, x + width, y + height)
    .stop(0, MEMBER_TICKET_COLORS.headerStart)
    .stop(0.45, MEMBER_TICKET_COLORS.indigo)
    .stop(0.75, MEMBER_TICKET_COLORS.violet)
    .stop(1, MEMBER_TICKET_COLORS.pink);
}

function formatTimeRange(booking, event) {
  const start = event?.startDate || event?.startTime || booking.startTime;
  const end = event?.endDate || event?.endTime || booking.endTime;
  const startTime = formatDateTime(start, { hour: '2-digit', minute: '2-digit' });
  if (!startTime) return 'Time TBA';
  if (end) return `${startTime} - ${formatDateTime(end, { hour: '2-digit', minute: '2-digit' })}`;
  const fallbackEnd = new Date(start);
  fallbackEnd.setHours(fallbackEnd.getHours() + 2);
  return `${startTime} - ${formatDateTime(fallbackEnd, { hour: '2-digit', minute: '2-digit' })}`;
}

function drawHeaderChip(doc, x, y, text, maxWidth) {
  const fontSize = 8.5;
  const contentWidth = Math.min(doc.widthOfString(text, { font: 'Helvetica', fontSize }), maxWidth - 20);
  const width = contentWidth + 20;
  doc.roundedRect(x, y, width, 22, 11).fillColor('#ffffff', 0.16).fill();
  doc.font('Helvetica').fontSize(fontSize).fillColor('#ffffff', 1)
    .text(text, x + 10, y + 7, { width: width - 20, lineBreak: false, ellipsis: true });
  return width;
}

function drawInfoCell(doc, x, y, width, label, value, highlight = false) {
  const fill = highlight ? '#f0fdf4' : '#f9fafb';
  const border = highlight ? '#86efac' : '#f3f4f6';
  const labelColor = highlight ? '#16a34a' : MEMBER_TICKET_COLORS.muted;
  const valueColor = highlight ? '#15803d' : MEMBER_TICKET_COLORS.ink;
  doc.roundedRect(x, y, width, 48, 8).fillColor(fill, 1).fill();
  doc.roundedRect(x, y, width, 48, 8).lineWidth(0.7).strokeColor(border).stroke();
  doc.font('Helvetica-Bold').fontSize(7.2).fillColor(labelColor, 1)
    .text(label.toUpperCase(), x + 9, y + 7, { width: width - 18, height: 10, ellipsis: true });
  doc.font('Helvetica-Bold').fontSize(9).fillColor(valueColor, 1)
    .text(value || '-', x + 9, y + 21, { width: width - 18, height: 23, lineBreak: true, ellipsis: true });
}

function drawTearLine(doc, x, y, width, edgeInset, cutoutRadius) {
  doc.circle(x + edgeInset, y, cutoutRadius).fillColor(MEMBER_TICKET_COLORS.pageCutout, 1).fill();
  doc.circle(x + width - edgeInset, y, cutoutRadius).fillColor(MEMBER_TICKET_COLORS.pageCutout, 1).fill();
  doc.save();
  doc.lineWidth(1).dash(4, { space: 4 }).strokeColor(MEMBER_TICKET_COLORS.border)
    .moveTo(x + 18, y).lineTo(x + width - 18, y).stroke();
  doc.undash().restore();
}

function drawMemberTicketPdf(doc, booking, event, qrCodeDataUrl, { includedWith, attendee } = {}) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const width = 484;
  const height = 690;
  const x = (pageWidth - width) / 2;
  const y = (pageHeight - height) / 2 - 8;
  const headerHeight = 186;
  const displayData = ticketDisplayData(booking, { includedWith, attendee });
  const eventTitle = event?.title || booking.eventSnapshot?.title || 'Event Title';
  const eventDate = event?.startDate || event?.startTime || booking.startTime;
  const venue = event?.location?.address || event?.venue || '-';
  const ticketId = memberTicketId(booking);
  const ticketBenefits = event?.ticketTypes?.find((ticket) => ticket.name === booking.ticketType)?.benefits || [];

  doc.save();
  doc.roundedRect(x, y, width, height, 18).fillColor('#ffffff', 1).fill();
  doc.save();
  doc.roundedRect(x, y, width, height, 18).clip();

  // Gradient header and soft circles follow the branded member ticket header.
  doc.save();
  doc.roundedRect(x, y, width, headerHeight, 18).clip();
  doc.rect(x, y, width, headerHeight).fill(createGradient(doc, x, y, width, headerHeight));
  doc.circle(x + width - 16, y + 8, 66).fillColor('#ffffff', 0.08).fill();
  doc.circle(x + 48, y + headerHeight - 2, 48).fillColor('#ffffff', 0.06).fill();
  doc.restore();

  if (fs.existsSync(MEMBER_TICKET_LOGO)) {
    doc.image(MEMBER_TICKET_LOGO, x + 20, y + 16, { fit: [136, 40] });
  } else {
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#ffffff', 1).text('AHIBI', x + 20, y + 26);
  }
  doc.roundedRect(x + width - 126, y + 22, 106, 22, 11).fillColor('#ffffff', 0.2).fill();
  doc.font('Helvetica-Bold').fontSize(7.3).fillColor('#ffffff', 1)
    .text('CONFIRMED', x + width - 119, y + 29, { width: 92, align: 'center' });

  doc.font('Helvetica-Bold').fontSize(7.4).fillColor('#ffffff', 0.72)
    .text('BOOKING CONFIRMED FOR', x + 22, y + 68, { width: width - 44 });
  doc.font('Helvetica-Bold').fontSize(18.5).fillColor('#ffffff', 1)
    .text(eventTitle, x + 22, y + 82, { width: width - 44, height: 44, lineBreak: true, ellipsis: true });

  const chipTexts = [formatDateShort(eventDate), formatTimeRange(booking, event), venue].filter(Boolean);
  let chipX = x + 22;
  const chipY = y + 143;
  for (const text of chipTexts) {
    const remainingWidth = x + width - 20 - chipX;
    if (remainingWidth < 42) break;
    const chipWidth = drawHeaderChip(doc, chipX, chipY, text, remainingWidth);
    chipX += chipWidth + 7;
  }

  drawTearLine(doc, x, y + headerHeight + 1, width, 1, 11);

  const typeX = x + 22;
  const typeY = y + 206;
  const typeWidth = width - 44;
  const typeGradient = doc.linearGradient(typeX, typeY, typeX + typeWidth, typeY + 80)
    .stop(0, '#eef2ff').stop(1, '#f5f3ff');
  doc.roundedRect(typeX, typeY, typeWidth, 80, 11).fill(typeGradient);
  doc.roundedRect(typeX, typeY, typeWidth, 80, 11).lineWidth(0.8).strokeColor('#c7d2fe').stroke();
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#6366f1', 1)
    .text('TICKET TYPE', typeX + 12, typeY + 12, { width: typeWidth - 24, align: 'center', characterSpacing: 0.8 });
  doc.font('Helvetica-Bold').fontSize(20).fillColor('#3730a3', 1)
    .text(booking.ticketType || 'Ticket', typeX + 12, typeY + 26, { width: typeWidth - 24, height: 26, align: 'center', ellipsis: true });
  if (ticketBenefits.length) {
    doc.font('Helvetica-Bold').fontSize(8.2).fillColor('#0d9488', 1)
      .text(ticketBenefits.slice(0, 2).join(' | '), typeX + 12, typeY + 54, { width: typeWidth - 24, align: 'center', ellipsis: true });
  } else if (booking.nuscGeneralZone) {
    doc.font('Helvetica-Bold').fontSize(8.2).fillColor('#4338ca', 1)
      .text(`Zone ${booking.nuscGeneralZone}`, typeX + 12, typeY + 54, { width: typeWidth - 24, align: 'center' });
  }

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(MEMBER_TICKET_COLORS.faint, 1)
    .text('ATTENDEE DETAILS', x + 22, y + 304, { characterSpacing: 0.8 });
  const cellsTop = y + 321;
  const cellGap = 8;
  const cellWidth = (width - 44 - cellGap) / 2;
  drawInfoCell(doc, x + 22, cellsTop, cellWidth, 'Name', displayData.attendee.name);
  drawInfoCell(doc, x + 22 + cellWidth + cellGap, cellsTop, cellWidth, 'Email', displayData.attendee.email);
  drawInfoCell(doc, x + 22, cellsTop + 56, cellWidth, 'Phone', displayData.attendee.phone);
  drawInfoCell(doc, x + 22 + cellWidth + cellGap, cellsTop + 56, cellWidth, 'Price', displayData.priceText, Boolean(includedWith));

  drawTearLine(doc, x, y + 452, width, 11, 11);

  const qrSectionY = y + 464;
  const qrSize = 104;
  const qrFrameX = x + 22;
  const qrFrameY = qrSectionY + 7;
  doc.roundedRect(qrFrameX, qrFrameY, qrSize + 14, qrSize + 14, 9).fillColor('#ffffff', 1).fill();
  doc.roundedRect(qrFrameX, qrFrameY, qrSize + 14, qrSize + 14, 9).lineWidth(2.3).strokeColor('#e0e7ff').stroke();
  if (qrCodeDataUrl) {
    doc.image(Buffer.from(qrCodeDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'), qrFrameX + 7, qrFrameY + 7, { width: qrSize, height: qrSize });
  }

  const detailsX = qrFrameX + qrSize + 30;
  const detailsWidth = width - (detailsX - x) - 20;
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#6366f1', 1).text('Scan for Entry', detailsX, qrSectionY + 10, { width: detailsWidth });
  doc.font('Helvetica').fontSize(8).fillColor(MEMBER_TICKET_COLORS.muted, 1)
    .text(`Show at ${venue === '-' ? 'the venue' : venue}`, detailsX, qrSectionY + 25, { width: detailsWidth, height: 25, ellipsis: true });
  doc.roundedRect(detailsX, qrSectionY + 54, detailsWidth, 36, 6).fillColor('#ffffff', 1).fill();
  doc.roundedRect(detailsX, qrSectionY + 54, detailsWidth, 36, 6).lineWidth(0.7).strokeColor('#e0e7ff').stroke();
  doc.font('Helvetica-Bold').fontSize(6.8).fillColor(MEMBER_TICKET_COLORS.faint, 1)
    .text('TICKET ID', detailsX + 8, qrSectionY + 59, { width: detailsWidth - 16 });
  doc.font('Courier-Bold').fontSize(7.3).fillColor('#1e1b4b', 1)
    .text(ticketId, detailsX + 8, qrSectionY + 72, { width: detailsWidth - 16, ellipsis: true });
  doc.font('Helvetica').fontSize(7.4).fillColor(MEMBER_TICKET_COLORS.faint, 1)
    .text(`Booked ${formatDateShort(booking.bookedAt)}`, detailsX, qrSectionY + 97, { width: detailsWidth, ellipsis: true });

  const footerY = y + 610;
  doc.rect(x, footerY, width, height - (footerY - y)).fillColor('#f9fafb', 1).fill();
  doc.moveTo(x, footerY).lineTo(x + width, footerY).lineWidth(0.7).strokeColor('#f3f4f6').stroke();
  const buttonWidth = width - 44;
  const buttonX = x + 22;
  const buttonY = footerY + 10;
  doc.roundedRect(buttonX, buttonY, buttonWidth, 42, 10)
    .fill(createGradient(doc, buttonX, buttonY, buttonWidth, 42));
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff', 1)
    .text('  Download Ticket', buttonX, buttonY + 15, { width: buttonWidth, align: 'center' });

  doc.restore();
  doc.roundedRect(x, y, width, height, 18).lineWidth(0.7).strokeColor('#e5e7eb').stroke();
  doc.restore();

  const serialNumber = String(booking.event?._id || booking.event || booking.eventSnapshot?._id) === SERIAL_NUMBER_EVENT_ID
    && typeof booking.ticketSerialNumber === 'number';
  const footerText = serialNumber
    ? `Serial No: ${booking.ticketSerialNumber}`
    : `Ticket ID: ${String(booking._id)}_ticket_${booking.ticketIndex || 1}`;
  doc.font('Helvetica').fontSize(7).fillColor('#969696', 1)
    .text(footerText, 0, pageHeight - 17, { width: pageWidth, align: 'center' });
}

async function createMemberTicketQrDataUrl(booking, event) {
  return QRCode.toDataURL(JSON.stringify(createMemberTicketQrPayload(booking, event)), {
    errorCorrectionLevel: 'M',
    margin: 6,
    width: 160,
    color: { dark: '#000000', light: '#ffffff' },
  });
}

async function createTicketQrDataUrl(booking, event) {
  const eventId = event?._id || booking.event?._id || booking.event || booking.eventSnapshot?._id;
  const payload = {
    bookingId: String(booking._id),
    eventId: String(eventId),
    ticketType: booking.ticketType,
    quantity: booking.quantity,
    ...(booking.selectedDate && { selectedDate: booking.selectedDate }),
  };
  return QRCode.toDataURL(JSON.stringify(payload), {
    errorCorrectionLevel: 'H',
    margin: 2,
    color: { dark: '#4a154b', light: '#ffffff' },
  });
}

async function createOfficialTicketPdfBuffer(booking, event, { includedWith, useMemberTicketQrSource = false, attendee } = {}) {
  const qrCodeDataUrl = useMemberTicketQrSource
    ? await createMemberTicketQrDataUrl(booking, event)
    : booking.qrCode || await createTicketQrDataUrl(booking, event);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.once('error', reject);
    doc.once('end', () => resolve(Buffer.concat(chunks)));
    drawMemberTicketPdf(doc, booking, event, qrCodeDataUrl, { includedWith, attendee });
    doc.end();
  });
}

function writeOfficialTicketPdf(doc, booking, event, qrCodeDataUrl, options = {}) {
  // Keep streaming downloads on the same branded design as buffered partner PDFs.
  drawMemberTicketPdf(doc, booking, event, qrCodeDataUrl, options);
}

module.exports = {
  createMemberTicketQrPayload,
  createOfficialTicketPdfBuffer,
  createTicketQrDataUrl,
  attendeeDetails,
  getTicketPriceText,
  ticketDisplayData,
  mergeTicketEvent,
  writeOfficialTicketPdf,
};
