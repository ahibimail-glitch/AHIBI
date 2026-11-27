const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const BLUE = '#0b5cab';
const DARK = '#1C1C1C';
const GRAY = '#6b7280';

function fmtDate(iso) {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
    });
  } catch (e) { return iso; }
}

async function buildHeliTicket(booking) {
  const qrBuffer = await QRCode.toBuffer(booking.bookingRef || booking.orderId, { type: 'png', margin: 1, width: 300 });

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  doc.rect(0, 0, doc.page.width, 92).fill(BLUE);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20).text('AHIBI · Hornbill Heli Taxi 2026', 40, 30);
  doc.font('Helvetica').fontSize(11).text('Booking confirmation', 40, 58);

  const top = 130;
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(17).text(`${booking.productName}${booking.sector ? ` — ${booking.sector}` : ''}`, 40, top);

  const row = (label, value, y) => {
    doc.font('Helvetica').fontSize(10).fillColor(GRAY).text(label, 40, y);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(DARK).text(value, 40, y + 13);
  };
  row('Date', fmtDate(booking.date), top + 36);
  row('Slot', booking.slotLabel || '-', top + 76);
  row('Seats', String(booking.seats), top + 116);
  row('Booking reference', booking.bookingRef || booking.orderId, top + 156);
  row('Amount paid', `₹${Number(booking.amount).toLocaleString('en-IN')} (incl. GST)`, top + 196);

  // QR
  doc.image(qrBuffer, doc.page.width - 210, top, { width: 170, height: 170 });
  doc.font('Helvetica').fontSize(9).fillColor(GRAY).text('Show at check-in', doc.page.width - 210, top + 176, { width: 170, align: 'center' });

  // Passengers
  let py = top + 240;
  doc.font('Helvetica-Bold').fontSize(12).fillColor(DARK).text('Passengers', 40, py);
  py += 20;
  (booking.passengers || []).forEach((p, i) => {
    doc.font('Helvetica').fontSize(11).fillColor(DARK).text(`${i + 1}. ${p.name}${p.phone ? `  (${p.phone})` : ''}`, 48, py);
    py += 18;
  });

  doc.font('Helvetica').fontSize(9).fillColor(GRAY)
    .text('Note: each flight carries 6 passengers and operates only when full. Our team will confirm your flight time. No landing on aerial rides — aerial view only.', 40, doc.page.height - 90, { width: doc.page.width - 80 });
  doc.text(`Order ${booking.orderId} · Powered by AHIBI`, 40, doc.page.height - 50, { width: doc.page.width - 80 });

  doc.end();
  const buffer = await done;
  return { buffer, qrBuffer };
}

module.exports = { buildHeliTicket, fmtDate };
