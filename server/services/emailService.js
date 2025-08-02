const nodemailer = require('nodemailer');

/**
 * Service for sending emails in the application
 */
class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  /**
   * Send an email
   * @param {Object} options - Email options
   * @param {String} options.to - Recipient email
   * @param {String} options.subject - Email subject
   * @param {String} options.text - Plain text content
   * @param {String} options.html - HTML content
   * @returns {Promise<Object>} - Send result
   */
  async sendMail(options) {
    try {
      const mailOptions = {
        from: `Ahibi <${process.env.EMAIL_FROM}>`,
        to: options.to,
        subject: options.subject,
        text: options.text || '',
        html: options.html || ''
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('Email service error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send welcome email to new user
   * @param {Object} user - User object
   * @returns {Promise<Object>} - Send result
   */
  async sendWelcomeEmail(user) {
    const subject = 'Welcome to Ahibi!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <img src="https://ahibi.com/logo.png" alt="Ahibi Logo" style="max-width: 150px; margin-bottom: 20px;">
        <h1 style="color: #4a154b; margin-bottom: 20px;">Welcome to Ahibi!</h1>
        <p>Hi ${user.name || 'there'},</p>
        <p>Thank you for joining Ahibi - your go-to platform for discovering and booking amazing events!</p>
        <p>With your new account, you can:</p>
        <ul>
          <li>Discover and book tickets to trending events</li>
          <li>Create and manage your own events</li>
          <li>Connect with artists and venues</li>
          <li>Keep track of your bookings in one place</li>
        </ul>
        <p>If you have any questions, simply reply to this email. We're always happy to help!</p>
        <p>Best regards,<br>The Ahibi Team</p>
      </div>
    `;

    return this.sendMail({
      to: user.email,
      subject,
      html
    });
  }

  /**
   * Send OTP verification email
   * @param {Object} user - User object
   * @param {String} otp - OTP code
   * @returns {Promise<Object>} - Send result
   */
  async sendOtpEmail(user, otp) {
    const subject = 'Your Ahibi Verification Code';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <img src="https://ahibi.com/logo.png" alt="Ahibi Logo" style="max-width: 150px; margin-bottom: 20px;">
        <h1 style="color: #4a154b; margin-bottom: 20px;">Verification Code</h1>
        <p>Hi ${user.name || 'there'},</p>
        <p>Your verification code for Ahibi is:</p>
        <div style="background-color: #f7f7f7; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, you can safely ignore this email.</p>
        <p>Best regards,<br>The Ahibi Team</p>
      </div>
    `;

    return this.sendMail({
      to: user.email,
      subject,
      html
    });
  }

  /**
   * Send booking confirmation email
   * @param {Object} ticket - Ticket object with populated event and user
   * @returns {Promise<Object>} - Send result
   */
  async sendBookingConfirmation(ticket) {
    const subject = 'Your Booking Confirmation';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <img src="https://ahibi.com/logo.png" alt="Ahibi Logo" style="max-width: 150px; margin-bottom: 20px;">
        <h1 style="color: #4a154b; margin-bottom: 20px;">Booking Confirmed!</h1>
        <p>Hi ${ticket.user.name || 'there'},</p>
        <p>Your booking for <strong>${ticket.event.title}</strong> has been confirmed!</p>
        <div style="background-color: #f7f7f7; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h2 style="margin-top: 0;">Ticket Details</h2>
          <p><strong>Ticket Number:</strong> ${ticket._id || ticket.id}</p>
          <p><strong>Event:</strong> ${ticket.event.title}</p>
          <p><strong>Date:</strong> ${new Date(ticket.event.startDate).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${new Date(ticket.event.startDate).toLocaleTimeString()}</p>
          <p><strong>Ticket Type:</strong> ${ticket.ticketType}</p>
          <p><strong>Quantity:</strong> ${ticket.quantity}</p>
          <p><strong>Price:</strong> ₹${ticket.price || ticket.totalAmount}</p>
        </div>
        <p>Please present your QR code at the venue for entry. You can also access your tickets anytime in the "My Tickets" section of the Ahibi app or website.</p>
        <p>We hope you have a great time at the event!</p>
        <p>Best regards,<br>The Ahibi Team</p>
      </div>
    `;

    return this.sendMail({
      to: ticket.user.email,
      subject,
      html
    });
  }

  /**
   * Send event approval notification to organizer
   * @param {Object} event - Event object with populated organizer
   * @param {Boolean} approved - Whether the event was approved
   * @param {String} rejectionReason - Reason for rejection if not approved
   * @returns {Promise<Object>} - Send result
   */
  async sendEventApprovalNotification(event, approved, rejectionReason = '') {
    const subject = approved 
      ? 'Your Event Has Been Approved!' 
      : 'Your Event Requires Changes';

    let html;
    
    if (approved) {
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <img src="https://ahibi.com/logo.png" alt="Ahibi Logo" style="max-width: 150px; margin-bottom: 20px;">
          <h1 style="color: #4a154b; margin-bottom: 20px;">Event Approved!</h1>
          <p>Hi ${event.organizer.name || 'there'},</p>
          <p>Great news! Your event <strong>${event.title}</strong> has been approved and is now live on Ahibi.</p>
          <p>You can now start promoting your event and selling tickets.</p>
          <p>Best of luck with your event!</p>
          <p>Best regards,<br>The Ahibi Team</p>
        </div>
      `;
    } else {
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <img src="https://ahibi.com/logo.png" alt="Ahibi Logo" style="max-width: 150px; margin-bottom: 20px;">
          <h1 style="color: #4a154b; margin-bottom: 20px;">Event Requires Changes</h1>
          <p>Hi ${event.organizer.name || 'there'},</p>
          <p>Thank you for submitting your event <strong>${event.title}</strong>.</p>
          <p>Our team has reviewed your submission and we need some changes before we can approve it:</p>
          <div style="background-color: #f7f7f7; padding: 15px; margin: 20px 0; border-left: 4px solid #4a154b;">
            ${rejectionReason}
          </div>
          <p>Please make the necessary changes and resubmit your event for approval.</p>
          <p>If you have any questions, feel free to contact our support team.</p>
          <p>Best regards,<br>The Ahibi Team</p>
        </div>
      `;
    }

    return this.sendMail({
      to: event.organizer.email,
      subject,
      html
    });
  }

  /**
   * Send payout confirmation email
   * @param {Object} payout - Payout object with user details
   * @returns {Promise<Object>} - Send result
   */
  async sendPayoutConfirmation(payout) {
    const subject = 'Your Payout Has Been Processed';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <img src="https://ahibi.com/logo.png" alt="Ahibi Logo" style="max-width: 150px; margin-bottom: 20px;">
        <h1 style="color: #4a154b; margin-bottom: 20px;">Payout Processed</h1>
        <p>Hi ${payout.user.name || 'there'},</p>
        <p>We're pleased to inform you that your payout of <strong>₹${payout.amount}</strong> has been processed and will be credited to your bank account within 2-3 business days.</p>
        <div style="background-color: #f7f7f7; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h2 style="margin-top: 0;">Payout Details</h2>
          <p><strong>Amount:</strong> ₹${payout.amount}</p>
          <p><strong>Transaction ID:</strong> ${payout.transactionId}</p>
          <p><strong>Processed on:</strong> ${new Date(payout.processedAt).toLocaleDateString()}</p>
          <p><strong>Bank Account:</strong> XXXX${payout.user.bankDetails?.accountNumber.slice(-4) || ''}</p>
        </div>
        <p>You can view your complete payout history in your dashboard.</p>
        <p>Thank you for being a part of the Ahibi community!</p>
        <p>Best regards,<br>The Ahibi Team</p>
      </div>
    `;

    return this.sendMail({
      to: payout.user.email,
      subject,
      html
    });
  }

  /**
   * Send ticket details as email with QR code
   * @param {Object} booking - Booking object with populated event and user
   * @param {String} qrCodeDataUrl - Base64 encoded QR code image URL
   * @returns {Promise<Object>} - Send result
   */
  async sendTicketEmail(booking, qrCodeDataUrl = null) {
    try {
      const subject = 'Your Ticket for ' + (booking.event.title || 'Upcoming Event');
      
      // Format date and time
      const eventDate = booking.event.startDate ? 
        new Date(booking.event.startDate).toLocaleDateString('en-IN', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : 'TBA';
        
      const eventTime = booking.event.startDate ? 
        new Date(booking.event.startDate).toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : 'TBA';

      // Format location
      const eventLocation = booking.event.location ? 
        (booking.event.location.address ? 
          `${booking.event.location.address}, ${booking.event.location.city || ''}` : 
          'Location details available in the app'
        ) : 'TBA';

      // Create HTML with or without QR code
      const qrCodeHtml = qrCodeDataUrl ? 
        `<div style="text-align: center; margin: 20px 0;">
          <img src="${qrCodeDataUrl}" alt="Ticket QR Code" style="max-width: 200px; width: 100%;">
          <p style="margin-top: 10px; font-size: 12px; color: #666;">Scan this QR code at the venue for entry</p>
        </div>` : '';

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="text-align: center; background-color: #4a154b; padding: 20px; border-radius: 8px 8px 0 0;">
            <img src="https://ahibi.com/logo.png" alt="Ahibi Logo" style="max-width: 150px;">
            <h1 style="color: white; margin: 15px 0 5px;">Your Ticket</h1>
          </div>
          
          <div style="padding: 20px;">
            <h2 style="color: #4a154b; margin-bottom: 20px; text-align: center;">${booking.event.title || 'Event Ticket'}</h2>
            
            <div style="background-color: #f8f8f8; border-left: 4px solid #4a154b; padding: 15px; margin-bottom: 20px;">
              <p style="margin: 5px 0;"><strong>Ticket ID:</strong> ${booking._id || booking.id}</p>
              <p style="margin: 5px 0;"><strong>Ticket Type:</strong> ${booking.ticketType || 'Standard'}</p>
              <p style="margin: 5px 0;"><strong>Quantity:</strong> ${booking.quantity || 1}</p>
              <p style="margin: 5px 0;"><strong>Name:</strong> ${booking.user.name || 'Guest'}</p>
              <p style="margin: 5px 0;"><strong>Booked On:</strong> ${new Date(booking.bookedAt || Date.now()).toLocaleDateString()}</p>
            </div>
            
            <div style="background-color: #f8f8f8; border-left: 4px solid #4a154b; padding: 15px; margin-bottom: 20px;">
              <h3 style="margin-top: 0; color: #4a154b;">Event Details</h3>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${eventDate}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${eventTime}</p>
              <p style="margin: 5px 0;"><strong>Venue:</strong> ${eventLocation}</p>
            </div>
            
            ${qrCodeHtml}
            
            <div style="background-color: #f8f8f8; border: 1px dashed #ccc; padding: 15px; margin-top: 20px; text-align: center;">
              <p style="margin: 5px 0; font-weight: bold;">Important Notes</p>
              <p style="margin: 5px 0; font-size: 14px;">Please present this ticket (digital or printed) at the venue entrance.</p>
              <p style="margin: 5px 0; font-size: 14px;">This ticket is non-transferable and valid only for the specified event.</p>
            </div>
          </div>
          
          <div style="text-align: center; font-size: 12px; color: #666; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p>If you have any questions, please contact support@ahibi.com</p>
            <p>&copy; ${new Date().getFullYear()} Ahibi. All rights reserved.</p>
          </div>
        </div>
      `;

      const result = await this.sendMail({
        to: booking.user.email,
        subject,
        html
      });

      if (result.success) {
        console.log(`Ticket email sent to ${booking.user.email} for booking ${booking._id || booking.id}`);
      }

      return result;
    } catch (error) {
      console.error('Error sending ticket email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new EmailService();
