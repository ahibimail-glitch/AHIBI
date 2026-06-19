const PDFDocument = require('pdfkit');

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatCurrency = (amount, currency = 'INR') =>
  `${currency === 'INR' ? '₹' : `${currency} `}${Number(amount || 0).toLocaleString('en-IN')}`;

class TeachingBookingInvoiceService {
  async generateInvoice(booking) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('error', reject);
        doc.on('end', () => {
          resolve({
            buffer: Buffer.concat(chunks),
            contentType: 'application/pdf',
          });
        });

        const artist = booking.artistId;
        const teachingClass = booking.classId;

        doc.rect(0, 0, doc.page.width, 120).fill('#5B6CFF');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(24)
          .text('AHiBi', 40, 28, { align: 'center' });
        doc.fontSize(14).font('Helvetica')
          .text('Teaching Session Invoice', 40, 62, { align: 'center' });

        doc.roundedRect(40, 140, doc.page.width - 80, 90, 8).fillAndStroke('#F8FAFC', '#CBD5E1');
        doc.fillColor('#475569').fontSize(10).font('Helvetica-Bold');
        doc.text('INVOICE NUMBER', 60, 158);
        doc.text('BOOKING ID', 60, 180);
        doc.text('PAYMENT STATUS', 340, 158);
        doc.text('INVOICE DATE', 340, 180);

        doc.fillColor('#0F172A').font('Helvetica').fontSize(11);
        doc.text(booking.invoiceNumber || 'Pending', 170, 158);
        doc.text(String(booking._id), 170, 180, { width: 150 });
        doc.text('PAID', 450, 158);
        doc.text(formatDate(booking.payment?.paidAt || booking.confirmedAt || booking.createdAt), 450, 180);

        let y = 255;
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(15).text('Student Details', 40, y);
        y += 24;
        doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke('#CBD5E1');
        y += 16;

        const studentRows = [
          ['Name', booking.studentName],
          ['Phone', booking.studentPhone],
          ['Email', booking.studentEmail || 'N/A'],
        ];
        studentRows.forEach(([label, value]) => {
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text(`${label}:`, 50, y);
          doc.font('Helvetica').fillColor('#0F172A').text(value, 160, y, { width: 360 });
          y += 18;
        });
        y += 16;

        doc.font('Helvetica-Bold').fontSize(15).fillColor('#0F172A').text('Session Details', 40, y);
        y += 24;
        doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke('#CBD5E1');
        y += 16;

        const sessionRows = [
          ['Artist', artist?.name || 'N/A'],
          ['Class', teachingClass?.title || 'N/A'],
          ['Subject', teachingClass?.subject || 'N/A'],
          ['Mode', (booking.mode || 'N/A').replace('_', ' ')],
          ['Session Date', formatDate(booking.bookingDate)],
          ['Time', `${booking.startTime} – ${booking.endTime}`],
          ['Duration', booking.durationMinutes ? `${booking.durationMinutes} minutes` : 'N/A'],
        ];
        sessionRows.forEach(([label, value]) => {
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text(`${label}:`, 50, y);
          doc.font('Helvetica').fillColor('#0F172A').text(value, 160, y, { width: 360 });
          y += 18;
        });
        y += 20;

        doc.font('Helvetica-Bold').fontSize(15).fillColor('#0F172A').text('Payment Summary', 40, y);
        y += 24;
        doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke('#CBD5E1');
        y += 14;

        doc.roundedRect(40, y, doc.page.width - 80, 34, 6).fillAndStroke('#F8FAFC', '#E2E8F0');
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text('Description', 55, y + 11);
        doc.text('Amount', doc.page.width - 120, y + 11);
        y += 34;

        doc.roundedRect(40, y, doc.page.width - 80, 30, 6).fillAndStroke('#FFFFFF', '#E2E8F0');
        doc.font('Helvetica').fontSize(10).fillColor('#0F172A')
          .text(`Teaching session – ${teachingClass?.title || 'Class'}`, 55, y + 10);
        doc.text(formatCurrency(booking.payment?.amountPaid || booking.pricing?.amount, booking.pricing?.currency), doc.page.width - 120, y + 10);
        y += 36;

        doc.roundedRect(40, y, doc.page.width - 80, 36, 6).fillAndStroke('#5B6CFF', '#5B6CFF');
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#FFFFFF').text('TOTAL PAID', 55, y + 12);
        doc.text(
          formatCurrency(booking.payment?.amountPaid || booking.pricing?.amount, booking.pricing?.currency),
          doc.page.width - 120,
          y + 12
        );
        y += 54;

        doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text('Razorpay Payment ID', 50, y);
        doc.font('Helvetica').fillColor('#0F172A').text(booking.payment?.razorpayPaymentId || 'N/A', 180, y);
        y += 18;
        doc.font('Helvetica-Bold').fillColor('#475569').text('Razorpay Order ID', 50, y);
        doc.font('Helvetica').fillColor('#0F172A').text(booking.payment?.razorpayOrderId || 'N/A', 180, y, { width: 340 });

        y += 36;
        doc.fontSize(9).fillColor('#64748B').font('Helvetica')
          .text('This is a computer-generated invoice from AHiBi. For support, contact the artist or AHiBi support.', 40, y, {
            align: 'center',
            width: doc.page.width - 80,
          });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new TeachingBookingInvoiceService();
