const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const RED = '#e31837';
const DARK = '#1C1C1C';
const GRAY = '#6b7280';

function fmtDay(iso) {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata',
    });
  } catch (e) { return iso; }
}

async function qrBuffer(text) {
  return QRCode.toBuffer(text, { type: 'png', margin: 1, width: 300 });
}

// Returns { buffer, qrBuffers: [{ticketNumber, buffer}] } so the email can embed
// the same QR images inline.
async function buildEuphoriaTickets(booking) {
  const qrBuffers = [];
  for (const t of booking.tickets || []) {
    qrBuffers.push({ ticketNumber: t.ticketNumber, buffer: await qrBuffer(t.ticketNumber) });
  }

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  const tickets = booking.tickets || [];
  tickets.forEach((t, i) => {
    if (i > 0) doc.addPage();

    // Header band
    doc.rect(0, 0, doc.page.width, 90).fill(RED);
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
      .text('EUPHORIA FESTIVAL 2026', 40, 30, { align: 'left' });
    doc.fontSize(11).font('Helvetica')
      .text('11–13 December 2026  ·  Avora Resort, Chümoukedima, Nagaland', 40, 60);

    // Ticket card
    const top = 130;
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(16)
      .text(t.type === 'camping' ? `Camping Pass (${t.campingType})` : 'Festival Entry', 40, top);

    doc.font('Helvetica').fontSize(11).fillColor(GRAY).text('Attendee', 40, top + 34);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(DARK).text(booking.contact?.name || '—', 40, top + 48);

    doc.font('Helvetica').fontSize(11).fillColor(GRAY).text('Valid on', 40, top + 82);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(DARK)
      .text((t.validDays || []).map(fmtDay).join('   ·   ') || '—', 40, top + 96);

    if (t.type === 'camping' && !t.admitsEntry) {
      doc.font('Helvetica').fontSize(10).fillColor(GRAY)
        .text('Campground access only — festival entry sold separately.', 40, top + 128);
    } else if (t.type === 'camping') {
      doc.font('Helvetica').fontSize(10).fillColor(GRAY)
        .text('Includes festival entry on the days above.', 40, top + 128);
    }

    doc.font('Helvetica').fontSize(11).fillColor(GRAY).text('Ticket No.', 40, top + 160);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(DARK).text(t.ticketNumber, 40, top + 174);

    // QR
    const qr = qrBuffers.find((q) => q.ticketNumber === t.ticketNumber);
    if (qr) {
      doc.image(qr.buffer, doc.page.width - 220, top, { width: 180, height: 180 });
      doc.font('Helvetica').fontSize(9).fillColor(GRAY)
        .text('Show this QR at the gate', doc.page.width - 220, top + 186, { width: 180, align: 'center' });
    }

    doc.font('Helvetica').fontSize(9).fillColor(GRAY)
      .text(`Order ${booking.orderId}  ·  Organised by Nova Entertainment Nagaland  ·  Powered by AHIBI`, 40, doc.page.height - 60, { width: doc.page.width - 80 });
  });

  doc.end();
  const buffer = await done;
  return { buffer, qrBuffers };
}

module.exports = { buildEuphoriaTickets, fmtDay };
