const PDFDocument = require('pdfkit');

class DanceLeagueInvoiceService {
   constructor() { }

   async generateInvoice(registration) {
      return new Promise((resolve, reject) => {
         try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('error', reject);
            doc.on('end', () => {
               const buffer = Buffer.concat(chunks);
               resolve({
                  buffer,
                  contentType: 'application/pdf'
               });
            });

            // Header with gradient effect
            doc.rect(0, 0, doc.page.width, 150).fill('#4F46E5');

            // Logo/Title
            doc.fontSize(32)
               .fillColor('#FFFFFF')
               .font('Helvetica-Bold')
               .text('Northeast Grand Dance League', 50, 40, { align: 'center' });

            doc.fontSize(14)
               .fillColor('#E0E7FF')
               .font('Helvetica')
               .text('Registration Invoice', 50, 80, { align: 'center' });

            // Invoice Details Box
            doc.rect(50, 170, doc.page.width - 100, 80)
               .fillAndStroke('#F3F4F6', '#E5E7EB');

            doc.fontSize(10)
               .fillColor('#6B7280')
               .font('Helvetica-Bold')
               .text('INVOICE NUMBER:', 70, 185);
            doc.font('Helvetica')
               .fillColor('#111827')
               .text(registration.invoiceNumber, 200, 185);

            doc.font('Helvetica-Bold')
               .fillColor('#6B7280')
               .text('REGISTRATION NUMBER:', 70, 205);
            doc.font('Helvetica')
               .fillColor('#111827')
               .text(registration.registrationNumber, 200, 205);

            doc.font('Helvetica-Bold')
               .fillColor('#6B7280')
               .text('DATE:', 70, 225);
            doc.font('Helvetica')
               .fillColor('#111827')
               .text(new Date(registration.registrationDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
               }), 200, 225);

            doc.font('Helvetica-Bold')
               .fillColor('#6B7280')
               .text('PAYMENT STATUS:', 350, 185);
            doc.font('Helvetica-Bold')
               .fillColor('#10B981')
               .text('CONFIRMED', 470, 185);

            // Participant Information
            doc.fontSize(16)
               .fillColor('#111827')
               .font('Helvetica-Bold')
               .text('Participant Information', 50, 280);

            doc.moveTo(50, 300).lineTo(doc.page.width - 50, 300).stroke('#E5E7EB');

            let yPos = 320;

            doc.fontSize(11)
               .font('Helvetica-Bold')
               .fillColor('#6B7280')
               .text('Full Name:', 70, yPos);
            doc.font('Helvetica')
               .fillColor('#111827')
               .text(registration.fullName, 200, yPos);
            yPos += 25;

            doc.font('Helvetica-Bold')
               .fillColor('#6B7280')
               .text('Email:', 70, yPos);
            doc.font('Helvetica')
               .fillColor('#111827')
               .text(registration.email, 200, yPos);
            yPos += 25;

            doc.font('Helvetica-Bold')
               .fillColor('#6B7280')
               .text('Phone:', 70, yPos);
            doc.font('Helvetica')
               .fillColor('#111827')
               .text(registration.phone, 200, yPos);
            yPos += 25;

            doc.font('Helvetica-Bold')
               .fillColor('#6B7280')
               .text('Date of Birth:', 70, yPos);
            doc.font('Helvetica')
               .fillColor('#111827')
               .text(new Date(registration.dateOfBirth).toLocaleDateString(), 200, yPos);
            yPos += 25;

            doc.font('Helvetica-Bold')
               .fillColor('#6B7280')
               .text('Address:', 70, yPos);
            doc.font('Helvetica')
               .fillColor('#111827')
               .text(`${registration.address.street}, ${registration.address.city}`, 200, yPos);
            yPos += 20;
            doc.text(`${registration.address.state}, ${registration.address.zip}`, 200, yPos);
            yPos += 20;
            doc.text(registration.address.country, 200, yPos);
            yPos += 35;

            // Registration Details
            doc.fontSize(16)
               .fillColor('#111827')
               .font('Helvetica-Bold')
               .text('Registration Details', 50, yPos);
            yPos += 20;

            doc.moveTo(50, yPos).lineTo(doc.page.width - 50, yPos).stroke('#E5E7EB');
            yPos += 20;

            doc.fontSize(11)
               .font('Helvetica-Bold')
               .fillColor('#6B7280')
               .text('Registration Type:', 70, yPos);
            doc.font('Helvetica')
               .fillColor('#111827')
               .text(registration.registrationType.toUpperCase(), 200, yPos);
            yPos += 25;

            if (registration.registrationType === 'solo') {
               doc.font('Helvetica-Bold')
                  .fillColor('#6B7280')
                  .text('Dance Styles:', 70, yPos);
               const styles = [...registration.danceStyle];
               if (registration.otherStyle) styles.push(registration.otherStyle);
               doc.font('Helvetica')
                  .fillColor('#111827')
                  .text(styles.join(', '), 200, yPos, { width: 300 });
               yPos += 25;
            } else {
               doc.font('Helvetica-Bold')
                  .fillColor('#6B7280')
                  .text('Group Name:', 70, yPos);
               doc.font('Helvetica')
                  .fillColor('#111827')
                  .text(registration.groupName, 200, yPos);
               yPos += 25;

               doc.font('Helvetica-Bold')
                  .fillColor('#6B7280')
                  .text('Number of Dancers:', 70, yPos);
               doc.font('Helvetica')
                  .fillColor('#111827')
                  .text(registration.numDancers.toString(), 200, yPos);
               yPos += 25;

               doc.font('Helvetica-Bold')
                  .fillColor('#6B7280')
                  .text('Dance Styles:', 70, yPos);
               const styles = [...registration.groupDanceStyle];
               if (registration.groupOtherStyle) styles.push(registration.groupOtherStyle);
               doc.font('Helvetica')
                  .fillColor('#111827')
                  .text(styles.join(', '), 200, yPos, { width: 300 });
               yPos += 25;
            }

            yPos += 20;

            // Payment Summary
            doc.fontSize(16)
               .fillColor('#111827')
               .font('Helvetica-Bold')
               .text('Payment Summary', 50, yPos);
            yPos += 20;

            doc.moveTo(50, yPos).lineTo(doc.page.width - 50, yPos).stroke('#E5E7EB');
            yPos += 20;

            // Payment details table
            doc.rect(50, yPos, doc.page.width - 100, 40)
               .fillAndStroke('#F9FAFB', '#E5E7EB');

            doc.fontSize(11)
               .font('Helvetica-Bold')
               .fillColor('#111827')
               .text('Description', 70, yPos + 12);
            doc.text('Amount', doc.page.width - 150, yPos + 12);

            yPos += 40;

            doc.rect(50, yPos, doc.page.width - 100, 30)
               .fillAndStroke('#FFFFFF', '#E5E7EB');

            doc.font('Helvetica')
               .fillColor('#374151')
               .text(`${registration.registrationType === 'solo' ? 'Solo' : 'Group'} Registration Fee`, 70, yPos + 8);
            doc.text(`₹${registration.amount}`, doc.page.width - 150, yPos + 8);

            yPos += 30;

            // Total
            doc.rect(50, yPos, doc.page.width - 100, 40)
               .fillAndStroke('#4F46E5', '#4F46E5');

            doc.fontSize(14)
               .font('Helvetica-Bold')
               .fillColor('#FFFFFF')
               .text('TOTAL PAID', 70, yPos + 12);
            doc.text(`₹${registration.amount}`, doc.page.width - 150, yPos + 12);

            yPos += 60;

            // Transaction Details
            doc.fontSize(10)
               .font('Helvetica-Bold')
               .fillColor('#6B7280')
               .text('Transaction ID:', 70, yPos);
            doc.font('Helvetica')
               .fillColor('#111827')
               .text(registration.razorpayPaymentId || 'N/A', 200, yPos);
            yPos += 20;



            // Footer
            // const footerY = doc.page.height - 100;
            // doc.rect(0, footerY, doc.page.width, 100).fill('#F3F4F6');

            // doc.fontSize(10)
            //    .fillColor('#6B7280')
            //    .font('Helvetica')
            //    .text('Thank you for registering with Northeast Grand Dance League!', 50, footerY + 20, { align: 'center' });

            // doc.fontSize(9)
            //    .fillColor('#9CA3AF')
            //    .text('For inquiries, contact us at info@northeastdanceleague.com', 50, footerY + 40, { align: 'center' });

            // doc.fontSize(8)
            //    .text(' 2026 Northeast Grand Dance League. All rights reserved.', 50, footerY + 60, { align: 'center' });

            doc.end();
         } catch (error) {
            reject(error);
         }
      });
   }
}

module.exports = new DanceLeagueInvoiceService();  