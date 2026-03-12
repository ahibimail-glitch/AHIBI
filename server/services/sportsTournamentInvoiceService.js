const PDFDocument = require('pdfkit');

const categoryLabels = {
  mixed_doubles: "Mixed Doubles",
  mens_doubles: "Men's Doubles",
  womens_doubles: "Women's Doubles",
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
        doc.font('Helvetica-Bold').fillColor('#475569').text('Registration Type', 50, y);
        doc.font('Helvetica').fillColor('#0F172A').text(registration.registrationType === 'team' ? 'Team Entry' : 'Player Entry', 160, y);
        y += 18;
        if (registration.teamName) {
          doc.font('Helvetica-Bold').fillColor('#475569').text('Team Name', 50, y);
          doc.font('Helvetica').fillColor('#0F172A').text(registration.teamName, 160, y, { width: 360 });
          y += 18;
        }
        doc.font('Helvetica-Bold').fillColor('#475569').text('Categories', 50, y);
        doc.font('Helvetica').fillColor('#0F172A').text(registration.categories.map((category) => categoryLabels[category] || category).join(', '), 160, y, { width: 360 });
        y += 32;
        // Calculate unique players and show pricing breakdown
        let pricingText = '₹0 (Direct registration - no payment required)';
        if (registration.amount > 0) {
          const uniquePlayerNames = new Set(
            registration.players.map(p => String(p.fullName || '').trim().toLowerCase())
          );
          const uniquePlayerCount = uniquePlayerNames.size;
          pricingText = `₹${registration.amount.toLocaleString('en-IN')} (${uniquePlayerCount} unique player${uniquePlayerCount > 1 ? 's' : ''} × ₹1,500)`;
        }
        
        doc.font('Helvetica-Bold').fillColor('#475569').text('Player Fee Paid', 50, y);
        doc.font('Helvetica').fillColor('#0F172A').text(pricingText, 160, y);
        y += 36;

        doc.font('Helvetica-Bold').fontSize(15).fillColor('#0F172A').text('Player Details', 40, y);
        y += 24;
        doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke('#CBD5E1');
        y += 16;

        const isTeamRegistration = registration.registrationType === 'team';
        
        if (isTeamRegistration) {
          // Group players by category for team registrations
          const getRequiredPlayers = (cat) => 2; // All categories require 2 players
          let playerIndex = 0;
          
          registration.categories.forEach((category) => {
            const requiredPlayers = getRequiredPlayers(category);
            const categoryLabel = categoryLabels[category] || category;
            
            // Category header
            doc.font('Helvetica-Bold').fontSize(11).fillColor('#F97316').text(categoryLabel.toUpperCase(), 50, y);
            y += 20;
            
            // Players for this category
            for (let i = 0; i < requiredPlayers && playerIndex < registration.players.length; i++) {
              const player = registration.players[playerIndex];
              const boxHeight = 60;
              
              doc.roundedRect(50, y, doc.page.width - 90, boxHeight, 8).fillAndStroke('#FFFFFF', '#E2E8F0');
              doc.font('Helvetica-Bold').fontSize(10).fillColor('#15803D').text(requiredPlayers === 1 ? 'Player' : `Player ${i + 1}`, 65, y + 12);
              doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text('Name', 65, y + 34);
              doc.font('Helvetica').fillColor('#0F172A').text(player.fullName, 130, y + 34);
              doc.font('Helvetica-Bold').fillColor('#475569').text('Gender', 310, y + 34);
              doc.font('Helvetica').fillColor('#0F172A').text(player.gender === 'male' ? 'Male' : 'Female', 400, y + 34);
              
              y += 77;
              playerIndex++;
            }
            
            y += 10; // Extra space between categories
          });
        } else {
          // Individual registration - group players by category and show pricing breakdown
          const getRequiredPlayers = (cat) => 2; // All categories require 2 players
          let playerIndex = 0;
          
          // Add pricing breakdown section
          if (registration.amount > 0) {
            const uniquePlayerNames = new Set(
              registration.players.map(p => String(p.fullName || '').trim().toLowerCase())
            );
            const uniquePlayerCount = uniquePlayerNames.size;
            
            doc.roundedRect(40, y, doc.page.width - 80, 60, 8).fillAndStroke('#FEF3C7', '#F59E0B');
            doc.font('Helvetica-Bold').fontSize(11).fillColor('#92400E').text('PRICING BREAKDOWN', 55, y + 12);
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#78350F').text('Unique Players', 55, y + 34);
            doc.font('Helvetica').fillColor('#92400E').text(String(uniquePlayerCount), 160, y + 34);
            doc.font('Helvetica-Bold').fillColor('#78350F').text('Rate per Player', 300, y + 34);
            doc.font('Helvetica').fillColor('#92400E').text('₹1,500', 400, y + 34);
            y += 75;
          }
          
          registration.categories.forEach((category) => {
            const requiredPlayers = getRequiredPlayers(category);
            const categoryLabel = categoryLabels[category] || category;
            
            // Category header
            doc.font('Helvetica-Bold').fontSize(11).fillColor('#F97316').text(categoryLabel.toUpperCase(), 50, y);
            y += 20;
            
            // Players for this category
            for (let i = 0; i < requiredPlayers && playerIndex < registration.players.length; i++) {
              const player = registration.players[playerIndex];
              const boxHeight = 85;
              
              doc.roundedRect(50, y, doc.page.width - 90, boxHeight, 8).fillAndStroke('#FFFFFF', '#E2E8F0');
              doc.font('Helvetica-Bold').fontSize(10).fillColor('#15803D').text(requiredPlayers === 1 ? 'Player' : `Player ${i + 1}`, 65, y + 12);
              doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text('Name', 65, y + 34);
              doc.font('Helvetica').fillColor('#0F172A').text(player.fullName, 130, y + 34);
              doc.font('Helvetica-Bold').fillColor('#475569').text('Age / Gender', 310, y + 34);
              doc.font('Helvetica').fillColor('#0F172A').text(`${player.age} / ${player.gender === 'male' ? 'Male' : 'Female'}`, 400, y + 34);
              doc.font('Helvetica-Bold').fillColor('#475569').text('Phone', 65, y + 56);
              doc.font('Helvetica').fillColor('#0F172A').text(player.phone, 130, y + 56);
              doc.font('Helvetica-Bold').fillColor('#475569').text('Email', 310, y + 56);
              doc.font('Helvetica').fillColor('#0F172A').text(player.email, 400, y + 56, { width: 150 });
              
              y += 102;
              playerIndex++;
            }
            
            y += 10; // Extra space between categories
          });
        }

        doc.font('Helvetica-Bold').fontSize(15).fillColor('#0F172A').text('Transaction Details', 40, y);
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
