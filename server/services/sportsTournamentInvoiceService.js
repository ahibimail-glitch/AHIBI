const PDFDocument = require('pdfkit');

const categoryLabels = {
  mixed_doubles: "Mixed Doubles",
  mens_doubles: "Men's Doubles",
  womens_doubles: "Women's Doubles",
  veterans_battle: 'Veterans Battle',
};

class SportsTournamentInvoiceService {
  async generateInvoice(registration) {
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

        doc.rect(0, 0, doc.page.width, 120).fill('#15803D');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(24).text('Nagaland Pickleball Classic', 40, 30, { align: 'center' });
        doc.fontSize(14).font('Helvetica').text('Tournament Registration Receipt', 40, 65, { align: 'center' });

        doc.roundedRect(40, 140, doc.page.width - 80, 85, 8).fillAndStroke('#F8FAFC', '#CBD5E1');
        doc.fillColor('#475569').fontSize(10).font('Helvetica-Bold');
        doc.text('REGISTRATION ID', 60, 158);
        doc.text('INVOICE NUMBER', 60, 180);
        doc.text('PAYMENT STATUS', 340, 158);
        doc.text('DATE', 340, 180);

        doc.fillColor('#0F172A').font('Helvetica').fontSize(11);
        doc.text(registration.registrationNumber || 'Pending', 170, 158);
        doc.text(registration.invoiceNumber || 'Pending', 170, 180);
        doc.text(String(registration.paymentStatus || 'confirmed').toUpperCase(), 450, 158);
        doc.text(new Date(registration.registrationDate || registration.updatedAt || Date.now()).toLocaleDateString('en-IN'), 450, 180);

        let y = 255;
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(15).text('Tournament Details', 40, y);
        y += 24;
        doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke('#CBD5E1');
        y += 16;

        doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text('Tournament', 50, y);
        doc.font('Helvetica').fillColor('#0F172A').text(registration.tournamentName, 160, y);
        y += 18;
        doc.font('Helvetica-Bold').fillColor('#475569').text('Categories', 50, y);
        doc.font('Helvetica').fillColor('#0F172A').text(registration.categories.map((category) => categoryLabels[category] || category).join(', '), 160, y, { width: 360 });
        y += 18;
        
        doc.font('Helvetica-Bold').fillColor('#475569').text('Registration Fee', 50, y);
        doc.font('Helvetica').fillColor('#0F172A').text(`₹${registration.amount.toLocaleString('en-IN')}`, 160, y);
        y += 36;

        doc.font('Helvetica-Bold').fontSize(15).fillColor('#0F172A').text('Player Details', 40, y);
        y += 24;
        doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke('#CBD5E1');
        y += 16;

        const player = registration.player;
        const boxHeight = 70;
        
        doc.roundedRect(50, y, doc.page.width - 90, boxHeight, 8).fillAndStroke('#FFFFFF', '#E2E8F0');
        
        // Name
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text('Name:', 65, y + 12);
        doc.font('Helvetica').fontSize(10).fillColor('#0F172A').text(player.fullName, 130, y + 12, { width: 380 });
        
        // Phone and Age
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text('Phone:', 65, y + 32);
        doc.font('Helvetica').fontSize(10).fillColor('#0F172A').text(player.phone, 130, y + 32);
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text('Age:', 310, y + 32);
        doc.font('Helvetica').fontSize(10).fillColor('#0F172A').text(String(player.age), 350, y + 32);
        
        // Email (if provided)
        if (player.email) {
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text('Email:', 65, y + 52);
          doc.font('Helvetica').fontSize(10).fillColor('#0F172A').text(player.email, 130, y + 52, { width: 380 });
        }
        
        y += boxHeight + 20;

        // Categories and Partners Section
        doc.font('Helvetica-Bold').fontSize(15).fillColor('#0F172A').text('Categories & Partners', 40, y);
        y += 24;
        doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke('#CBD5E1');
        y += 16;
        
        registration.categories.forEach((category) => {
          const categoryLabel = categoryLabels[category] || category;
          let partnerName = null;
          
          // Handle both Map and Object formats for partnerNames
          if (registration.partnerNames) {
            if (typeof registration.partnerNames.get === 'function') {
              // It's a Map
              partnerName = registration.partnerNames.get(category);
            } else if (typeof registration.partnerNames === 'object') {
              // It's an Object
              partnerName = registration.partnerNames[category];
            }
          }
          
          // Category header
          doc.font('Helvetica-Bold').fontSize(11).fillColor('#F97316').text(categoryLabel.toUpperCase(), 50, y);
          y += 18;
          
          // Partner name
          if (partnerName) {
            doc.font('Helvetica').fontSize(10).fillColor('#475569').text('Partner:', 65, y);
            doc.font('Helvetica').fillColor('#0F172A').text(partnerName, 120, y);
            y += 16;
          }
          
          y += 8; // Space between categories
        });
        
        y += 12;

        doc.font('Helvetica-Bold').fontSize(15).fillColor('#0F172A').text('Payment Details', 40, y);
        y += 24;
        doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke('#CBD5E1');
        y += 16;
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text('Razorpay Payment ID', 50, y);
        doc.font('Helvetica').fillColor('#0F172A').text(registration.razorpayPaymentId || 'N/A', 180, y);
        y += 18;
        doc.font('Helvetica-Bold').fillColor('#475569').text('Razorpay Order ID', 50, y);
        doc.font('Helvetica').fillColor('#0F172A').text(registration.razorpayOrderId || 'N/A', 180, y, { width: 340 });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new SportsTournamentInvoiceService();
