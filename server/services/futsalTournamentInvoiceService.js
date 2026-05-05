const PDFDocument = require('pdfkit');

const idTypeLabels = {
  aadhar: 'Aadhar Card',
  pan: 'PAN Card',
  voter_id: 'Voter ID',
};

class FutsalTournamentInvoiceService {
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

        // Header with green gradient background
        doc.rect(0, 0, doc.page.width, 140).fill('#15803D');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(28).text('Turf Titans Tournament T3', 40, 30, { align: 'center' });
        doc.fontSize(14).font('Helvetica').text('Team Registration Invoice', 40, 70, { align: 'center' });
        doc.fontSize(11).font('Helvetica').text('Kuda Futsal Arena, Dimapur, Nagaland', 40, 95, { align: 'center' });

        // Registration Info Box
        doc.roundedRect(40, 160, doc.page.width - 80, 100, 8).fillAndStroke('#F8FAFC', '#CBD5E1');
        doc.fillColor('#475569').fontSize(10).font('Helvetica-Bold');
        doc.text('REGISTRATION ID', 60, 178);
        doc.text('INVOICE NUMBER', 60, 200);
        doc.text('TEAM NAME', 60, 222);
        doc.text('PAYMENT STATUS', 340, 178);
        doc.text('DATE', 340, 200);
        doc.text('AMOUNT', 340, 222);

        doc.fillColor('#0F172A').font('Helvetica').fontSize(11);
        doc.text(registration.registrationNumber || 'Pending', 190, 178);
        doc.text(registration.invoiceNumber || 'Pending', 190, 200);
        doc.text(registration.teamName || 'N/A', 190, 222, { width: 130 });
        doc.text(String(registration.paymentStatus || 'confirmed').toUpperCase(), 450, 178);
        doc.text(new Date(registration.registrationDate || registration.updatedAt || Date.now()).toLocaleDateString('en-IN'), 450, 200);
        doc.text(`₹${registration.amount.toLocaleString('en-IN')}`, 450, 222);

        let y = 290;
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(15).text('Tournament Details', 40, y);
        y += 24;
        doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke('#CBD5E1');
        y += 16;

        doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text('Tournament', 50, y);
        doc.font('Helvetica').fillColor('#0F172A').text(registration.tournamentName, 160, y);
        y += 18;
        doc.font('Helvetica-Bold').fillColor('#475569').text('Dates', 50, y);
        doc.font('Helvetica').fillColor('#0F172A').text(registration.tournamentDetails?.dates || '21-23 May 2026', 160, y);
        y += 18;
        doc.font('Helvetica-Bold').fillColor('#475569').text('Venue', 50, y);
        doc.font('Helvetica').fillColor('#0F172A').text(registration.tournamentDetails?.venue || 'Kuda Futsal Arena, Dimapur, Nagaland', 160, y, { width: 360 });
        y += 18;
        doc.font('Helvetica-Bold').fillColor('#475569').text('Format', 50, y);
        doc.font('Helvetica').fillColor('#0F172A').text(registration.tournamentDetails?.format || '6v6 (Direct Knockout)', 160, y);
        y += 18;
        doc.font('Helvetica-Bold').fillColor('#475569').text('Prize Pool', 50, y);
        doc.font('Helvetica').fillColor('#0F172A').text(registration.tournamentDetails?.prizePool || '₹2,00,000', 160, y);
        y += 36;

        // Prize Distribution
        doc.font('Helvetica-Bold').fontSize(15).fillColor('#0F172A').text('Prize Distribution', 40, y);
        y += 24;
        doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke('#CBD5E1');
        y += 16;

        const prizes = [
          { position: 'Winner', amount: '₹1,00,000' },
          { position: 'Runners Up', amount: '₹60,000' },
          { position: 'Semi Finalists (each)', amount: '₹15,000' },
          { position: 'Top Scorer', amount: '₹5,000' },
          { position: 'Best Keeper', amount: '₹5,000' },
        ];

        prizes.forEach((prize) => {
          doc.font('Helvetica').fontSize(10).fillColor('#475569').text(prize.position, 50, y);
          doc.font('Helvetica-Bold').fillColor('#0F172A').text(prize.amount, 200, y);
          y += 16;
        });
        y += 20;

        // Team Details
        doc.font('Helvetica-Bold').fontSize(15).fillColor('#0F172A').text('Team Details', 40, y);
        y += 24;
        doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke('#CBD5E1');
        y += 16;

        doc.roundedRect(50, y, doc.page.width - 90, 90, 8).fillAndStroke('#FFFFFF', '#E2E8F0');
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text('Team Name:', 65, y + 12);
        doc.font('Helvetica').fontSize(10).fillColor('#0F172A').text(registration.teamName, 140, y + 12, { width: 380 });
        y += 20;
        
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text('Number of Players:', 65, y + 12);
        doc.font('Helvetica').fontSize(10).fillColor('#0F172A').text(String(registration.numberOfPlayers || 1), 170, y + 12);
        y += 20;

        if (registration.teamManager?.fullName) {
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text('Team Manager:', 65, y + 12);
          doc.font('Helvetica').fontSize(10).fillColor('#0F172A').text(registration.teamManager.fullName, 150, y + 12);
          if (registration.teamManager.phone) {
            doc.text(`(${registration.teamManager.phone})`, 300, y + 12);
          }
        }
        y += 20;

        if (registration.teamCoach?.fullName) {
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text('Team Coach:', 65, y + 12);
          doc.font('Helvetica').fontSize(10).fillColor('#0F172A').text(registration.teamCoach.fullName, 150, y + 12);
          if (registration.teamCoach.phone) {
            doc.text(`(${registration.teamCoach.phone})`, 300, y + 12);
          }
        }
        y += 90;

        // Captain/Representative Details
        doc.font('Helvetica-Bold').fontSize(15).fillColor('#0F172A').text('Captain/Representative Details', 40, y);
        y += 24;
        doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke('#CBD5E1');
        y += 16;

        if (registration.player) {
          const boxHeight = 55;
          if (y + boxHeight > doc.page.height - 60) {
            doc.addPage();
            y = 40;
          }

          doc.roundedRect(50, y, doc.page.width - 90, boxHeight, 8).fillAndStroke('#FFFFFF', '#E2E8F0');
          
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text('Captain/Representative:', 65, y + 12);
          doc.font('Helvetica').fontSize(10).fillColor('#0F172A').text(registration.player.fullName, 190, y + 12, { width: 380 });
          
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text('Phone:', 65, y + 28);
          doc.font('Helvetica').fontSize(10).fillColor('#0F172A').text(registration.player.phone || 'N/A', 105, y + 28);
          
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text('ID:', 65, y + 42);
          doc.font('Helvetica').fontSize(10).fillColor('#0F172A').text(`${idTypeLabels[registration.player.idType] || registration.player.idType}: ${registration.player.idNumber}`, 85, y + 42, { width: 400 });
          
          y += boxHeight + 12;
        }

        y += 12;

        // All Team Players
        if (registration.players && registration.players.length > 0) {
          doc.font('Helvetica-Bold').fontSize(15).fillColor('#0F172A').text('All Team Players', 40, y);
          y += 24;
          doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke('#CBD5E1');
          y += 16;

          const boxHeight = Math.ceil(registration.players.length / 2) * 18 + 30;
          if (y + boxHeight > doc.page.height - 60) {
            doc.addPage();
            y = 40;
          }

          doc.roundedRect(50, y, doc.page.width - 90, boxHeight, 8).fillAndStroke('#FFFFFF', '#E2E8F0');
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text(`Player Names (${registration.numberOfPlayers || registration.players.length}):`, 65, y + 12);
          y += 28;

          registration.players.forEach((playerName, index) => {
            const col = index % 2;
            const row = Math.floor(index / 2);
            const xPos = col === 0 ? 65 : 300;
            const yPos = y + (row * 18);
            
            doc.font('Helvetica').fontSize(9).fillColor('#0F172A').text(`${index + 1}. ${playerName}`, xPos, yPos);
          });

          y += boxHeight + 12;
        }

        y += 12;

        // Payment Details
        doc.font('Helvetica-Bold').fontSize(15).fillColor('#0F172A').text('Payment Details', 40, y);
        y += 24;
        doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke('#CBD5E1');
        y += 16;
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text('Razorpay Payment ID', 50, y);
        doc.font('Helvetica').fillColor('#0F172A').text(registration.razorpayPaymentId || 'N/A', 180, y);
        y += 18;
        doc.font('Helvetica-Bold').fillColor('#475569').text('Razorpay Order ID', 50, y);
        doc.font('Helvetica').fillColor('#0F172A').text(registration.razorpayOrderId || 'N/A', 180, y, { width: 340 });

        // Footer
        doc.addPage();
        doc.fontSize(10).fillColor('#64748B').text(
          'This is a computer-generated invoice. No signature is required.',
          40,
          doc.page.height - 60,
          { align: 'center' }
        );
        doc.text(
          'For queries, contact: Kuda Futsal Arena, Dimapur, Nagaland',
          40,
          doc.page.height - 45,
          { align: 'center' }
        );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new FutsalTournamentInvoiceService();
