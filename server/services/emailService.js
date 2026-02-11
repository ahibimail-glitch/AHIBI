const nodemailer = require('nodemailer');

/**
 * Service for sending emails in the application
 */
class EmailService {
  constructor() {
    const port = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined;

    const transportConfig = {
      ...(process.env.EMAIL_SERVICE ? { service: process.env.EMAIL_SERVICE } : {}),
      ...(process.env.EMAIL_HOST ? { host: process.env.EMAIL_HOST } : {}),
      ...(Number.isFinite(port) ? { port } : {}),
      ...(Number.isFinite(port) ? { secure: port === 465 } : {}),
      ...(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD
        ? {
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASSWORD,
            },
          }
        : {}),
    };

    this.transporter = nodemailer.createTransport(transportConfig);
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
        <img src="https://res.cloudinary.com/dovc3lfgz/image/upload/v1770467388/ahibi/al2s8xllifmscvj7vicq.png" alt="Ahibi Logo" style="max-width: 150px; margin-bottom: 20px;">
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
        <img src="https://res.cloudinary.com/dovc3lfgz/image/upload/v1770467388/ahibi/al2s8xllifmscvj7vicq.png" alt="Ahibi Logo" style="max-width: 150px; margin-bottom: 20px;">
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
        <img src="https://res.cloudinary.com/dovc3lfgz/image/upload/v1770467388/ahibi/al2s8xllifmscvj7vicq.png" alt="Ahibi Logo" style="max-width: 150px; margin-bottom: 20px;">
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
   * Send organizer account approval notification
   * @param {Object} organizer - Organizer object
   * @param {Boolean} approved - Whether the organizer was approved
   * @param {String} rejectionReason - Reason for rejection if not approved
   * @returns {Promise<Object>} - Send result
   */
  async sendOrganizerApprovalNotification(organizer, approved, rejectionReason = '') {
    const subject = approved 
      ? 'Your Organizer Account Has Been Approved!' 
      : 'Your Organizer Account Application Requires Changes';

    let html;
    
    if (approved) {
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <img src="https://res.cloudinary.com/dovc3lfgz/image/upload/v1770467388/ahibi/al2s8xllifmscvj7vicq.png" alt="Ahibi Logo" style="max-width: 150px; margin-bottom: 20px;">
          <h1 style="color: #4a154b; margin-bottom: 20px;">🎉 Account Approved!</h1>
          <p>Hi ${organizer.name || 'there'},</p>
          <p>Great news! Your organizer account has been approved by the Ahibi team.</p>
          <div style="background-color: #f0f9ff; border-left: 4px solid #4a154b; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #4a154b;">What's Next?</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li style="margin: 8px 0;">Log in to your organizer dashboard</li>
              <li style="margin: 8px 0;">Create and publish your first event</li>
              <li style="margin: 8px 0;">Start selling tickets to your audience</li>
              <li style="margin: 8px 0;">Track bookings and manage your events</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://ahibi.in'}/organizer/dashboard" 
               style="background-color: #4a154b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Go to Dashboard
            </a>
          </div>
          <p>We're excited to have you as part of the Ahibi community. If you need any help getting started, our support team is here for you.</p>
          <p>Best regards,<br>The Ahibi Team</p>
        </div>
      `;
    } else {
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <img src="https://res.cloudinary.com/dovc3lfgz/image/upload/v1770467388/ahibi/al2s8xllifmscvj7vicq.png" alt="Ahibi Logo" style="max-width: 150px; margin-bottom: 20px;">
          <h1 style="color: #4a154b; margin-bottom: 20px;">Account Application Update</h1>
          <p>Hi ${organizer.name || 'there'},</p>
          <p>Thank you for applying to become an organizer on Ahibi.</p>
          <p>Our team has reviewed your application and we need some additional information or changes before we can approve your account:</p>
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
            <strong>Required Changes:</strong>
            <p style="margin: 10px 0 0;">${rejectionReason}</p>
          </div>
          <p>Please update your information and resubmit your application. If you have any questions, feel free to contact our support team.</p>
          <p>Best regards,<br>The Ahibi Team</p>
        </div>
      `;
    }

    return this.sendMail({
      to: organizer.email,
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
      const eventDate = event.startDate ? 
        new Date(event.startDate).toLocaleDateString('en-IN', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : 'TBA';
        
      const eventTime = event.startDate ? 
        new Date(event.startDate).toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : 'TBA';

      const eventLocation = event.location?.address || event.location?.city || 'Location details available in dashboard';

      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <img src="https://res.cloudinary.com/dovc3lfgz/image/upload/v1770467388/ahibi/al2s8xllifmscvj7vicq.png" alt="Ahibi Logo" style="max-width: 150px; margin-bottom: 20px;">
          <h1 style="color: #4a154b; margin-bottom: 20px;">🎉 Event Approved!</h1>
          <p>Hi ${event.organizer.name || 'there'},</p>
          <p>Congratulations! Your event has been approved by the Ahibi team and is now live on our platform.</p>
          
          <div style="background-color: #f0f9ff; border-left: 4px solid #4a154b; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3 style="margin-top: 0; color: #4a154b;">Event Details</h3>
            <p style="margin: 8px 0;"><strong>Event Name:</strong> ${event.title}</p>
            <p style="margin: 8px 0;"><strong>Date:</strong> ${eventDate}</p>
            <p style="margin: 8px 0;"><strong>Time:</strong> ${eventTime}</p>
            <p style="margin: 8px 0;"><strong>Location:</strong> ${eventLocation}</p>
            ${event.category ? `<p style="margin: 8px 0;"><strong>Category:</strong> ${event.category}</p>` : ''}
          </div>

          <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3 style="margin-top: 0; color: #10b981;">What's Next?</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li style="margin: 8px 0;">Your event is now visible to all Ahibi users</li>
              <li style="margin: 8px 0;">Start promoting your event on social media</li>
              <li style="margin: 8px 0;">Monitor ticket sales in your dashboard</li>
              <li style="margin: 8px 0;">Manage attendees and bookings</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://ahibi.in'}/organizer/dashboard" 
               style="background-color: #4a154b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View Event Dashboard
            </a>
          </div>

          <p>Best of luck with your event! We're excited to see it succeed.</p>
          <p>Best regards,<br>The Ahibi Team</p>
        </div>
      `;
    } else {
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <img src="https://res.cloudinary.com/dovc3lfgz/image/upload/v1770467388/ahibi/al2s8xllifmscvj7vicq.png" alt="Ahibi Logo" style="max-width: 150px; margin-bottom: 20px;">
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
   * Send venue account approval notification
   * @param {Object} venue - Venue object
   * @param {Boolean} approved - Whether the venue was approved
   * @param {String} rejectionReason - Reason for rejection if not approved
   * @returns {Promise<Object>} - Send result
   */
  async sendVenueApprovalNotification(venue, approved, rejectionReason = '') {
    const subject = approved 
      ? 'Your Venue Account Has Been Approved!' 
      : 'Your Venue Account Application Requires Changes';

    const venueName = venue.ownerDetails?.businessName || venue.name;
    const ownerName = venue.ownerDetails?.fullName || 'Venue Owner';

    let html;
    
    if (approved) {
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <img src="https://res.cloudinary.com/dovc3lfgz/image/upload/v1770467388/ahibi/al2s8xllifmscvj7vicq.png" alt="Ahibi Logo" style="max-width: 150px; margin-bottom: 20px;">
          <h1 style="color: #4a154b; margin-bottom: 20px;">🎉 Venue Account Approved!</h1>
          <p>Hi ${ownerName},</p>
          <p>Great news! Your venue <strong>${venueName}</strong> has been approved by the Ahibi team.</p>
          <div style="background-color: #f0f9ff; border-left: 4px solid #4a154b; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #4a154b;">What's Next?</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li style="margin: 8px 0;">Log in to your venue dashboard</li>
              <li style="margin: 8px 0;">Complete your venue profile with photos and details</li>
              <li style="margin: 8px 0;">Set your availability and pricing</li>
              <li style="margin: 8px 0;">Start receiving booking requests from organizers</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://ahibi.in'}/venue/dashboard" 
               style="background-color: #4a154b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Go to Dashboard
            </a>
          </div>
          <p>We're excited to have ${venueName} as part of the Ahibi platform. If you need any help getting started, our support team is here for you.</p>
          <p>Best regards,<br>The Ahibi Team</p>
        </div>
      `;
    } else {
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <img src="https://res.cloudinary.com/dovc3lfgz/image/upload/v1770467388/ahibi/al2s8xllifmscvj7vicq.png" alt="Ahibi Logo" style="max-width: 150px; margin-bottom: 20px;">
          <h1 style="color: #4a154b; margin-bottom: 20px;">Venue Application Update</h1>
          <p>Hi ${ownerName},</p>
          <p>Thank you for applying to list your venue <strong>${venueName}</strong> on Ahibi.</p>
          <p>Our team has reviewed your application and we need some additional information or changes before we can approve your venue:</p>
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
            <strong>Required Changes:</strong>
            <p style="margin: 10px 0 0;">${rejectionReason}</p>
          </div>
          <p>Please update your venue information and resubmit your application. If you have any questions, feel free to contact our support team.</p>
          <p>Best regards,<br>The Ahibi Team</p>
        </div>
      `;
    }

    return this.sendMail({
      to: venue.email,
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
        <img src="https://res.cloudinary.com/dovc3lfgz/image/upload/v1770467388/ahibi/al2s8xllifmscvj7vicq.png" alt="Ahibi Logo" style="max-width: 150px; margin-bottom: 20px;">
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

  async sendVenueBookingConfirmationEmail(toEmail, customerName, details = {}) {
    const subject = `Venue Booking Confirmed${details.venueName ? `: ${details.venueName}` : ''}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; background-color: #4a154b; padding: 20px; border-radius: 8px 8px 0 0;">
          <img src="https://res.cloudinary.com/dovc3lfgz/image/upload/v1770467388/ahibi/al2s8xllifmscvj7vicq.png" alt="Ahibi Logo" style="max-width: 150px;">
          <h1 style="color: white; margin: 15px 0 5px;">Venue Booking Confirmed</h1>
        </div>

        <div style="padding: 20px;">
          <p style="margin: 0 0 10px;">Hi ${customerName || 'Customer'},</p>
          <p style="margin: 0 0 20px;">Your venue booking has been confirmed.</p>

          <div style="background-color: #f8f8f8; border-left: 4px solid #4a154b; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 5px 0;"><strong>Booking ID:</strong> ${details.bookingId || ''}</p>
            <p style="margin: 5px 0;"><strong>Venue:</strong> ${details.venueName || ''}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${details.bookingDate || 'TBA'}</p>
            <p style="margin: 5px 0;"><strong>Time Slot:</strong> ${details.timeSlot || 'TBA'}</p>
            <p style="margin: 5px 0;"><strong>Guests:</strong> ${details.guestCount || 'TBA'}</p>
            ${typeof details.totalAmount === 'number' ? `<p style="margin: 5px 0;"><strong>Amount Paid:</strong> ₹${details.totalAmount.toLocaleString()}</p>` : ''}
          </div>

          <p style="margin: 0; font-size: 14px;">If you have any questions, reply to this email and we’ll help you out.</p>
        </div>
      </div>
    `;

    return this.sendMail({
      to: toEmail,
      subject,
      html,
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
      // Backward-compatible signature: (toEmail, customerName, ticketDetails)
      if (typeof booking === 'string') {
        const toEmail = booking;
        const customerName = typeof qrCodeDataUrl === 'string' ? qrCodeDataUrl : 'Customer';
        const details = arguments.length >= 3 && arguments[2] ? arguments[2] : {};

        const subject = `Your Ticket for ${details.eventName || 'Upcoming Event'}`;

        const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="text-align: center; background-color: #4a154b; padding: 20px; border-radius: 8px 8px 0 0;">
            <img src="https://res.cloudinary.com/dovc3lfgz/image/upload/v1770467388/ahibi/al2s8xllifmscvj7vicq.png" alt="Ahibi Logo" style="max-width: 150px;">
            <h1 style="color: white; margin: 15px 0 5px;">Booking Confirmed</h1>
          </div>
          <div style="padding: 20px;">
            <p style="margin: 0 0 10px;">Hi ${customerName || 'Customer'},</p>
            <p style="margin: 0 0 20px;">Your booking has been confirmed.</p>
            <div style="background-color: #f8f8f8; border-left: 4px solid #4a154b; padding: 15px; margin-bottom: 20px;">
              <p style="margin: 5px 0;"><strong>Booking ID:</strong> ${details.bookingId || ''}</p>
              <p style="margin: 5px 0;"><strong>Event:</strong> ${details.eventName || ''}</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${details.eventDate || 'TBA'}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${details.eventTime || 'TBA'}</p>
              <p style="margin: 5px 0;"><strong>Ticket Type:</strong> ${details.ticketType || 'Standard'}</p>
              <p style="margin: 5px 0;"><strong>Quantity:</strong> ${details.quantity || 1}</p>
            </div>
            <p style="margin: 0; font-size: 14px;">You can access your tickets anytime in the "My Tickets" section of Ahibi.</p>
          </div>
        </div>
        `;

        const result = await this.sendMail({
          to: toEmail,
          subject,
          html,
        });

        if (result.success) {
          console.log(`Ticket email sent to ${toEmail} for booking ${details.bookingId || ''}`);
        }

        return result;
      }

      const subject = 'Your Ticket for ' + ((booking?.event && booking.event.title) || 'Upcoming Event');
      
      // Format date and time
      const eventDate = booking?.event?.startDate ? 
        new Date(booking.event.startDate).toLocaleDateString('en-IN', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : 'TBA';
        
      const eventTime = booking?.event?.startDate ? 
        new Date(booking.event.startDate).toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : 'TBA';

      // Format location
      const eventLocation = booking?.event?.location ? 
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
        to: booking?.user?.email,
        subject,
        html
      });

      if (result.success) {
        console.log(`Ticket email sent to ${booking?.user?.email} for booking ${booking?._id || booking?.id}`);
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

  /**
   * Send merch order confirmation email
   * @param {Object} order - MerchOrder object with populated user
   * @returns {Promise<Object>} - Send result
   */
  async sendMerchOrderConfirmation(order) {
    try {
      const subject = 'Your Hornbill Merch Order Confirmation';
      
      // Format order date
      const orderDate = order.createdAt ? 
        new Date(order.createdAt).toLocaleDateString('en-IN', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : new Date().toLocaleDateString();

      // Build items list
      const itemsHtml = order.items.map(item => `
        <tr style="border-bottom: 1px solid #e0e0e0;">
          <td style="padding: 12px; text-align: left;">
            <div style="font-weight: 600;">${item.name || 'Merch Item'}</div>
            ${item.variant ? `<div style="font-size: 12px; color: #666;">Variant: ${item.variant}</div>` : ''}
            ${item.sku ? `<div style="font-size: 12px; color: #666;">SKU: ${item.sku}</div>` : ''}
          </td>
          <td style="padding: 12px; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; text-align: right;">₹${(item.price || 0).toFixed(2)}</td>
          <td style="padding: 12px; text-align: right;">₹${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
        </tr>
      `).join('');

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; color: white;">
            <h1 style="color: white; margin: 0 0 10px; font-size: 28px;">Order Confirmed!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Thank you for your purchase</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #333; margin-top: 0; margin-bottom: 15px; font-size: 20px;">Order Details</h2>
              <p style="margin: 8px 0;"><strong>Order ID:</strong> ${order._id || order.id}</p>
              <p style="margin: 8px 0;"><strong>Order Date:</strong> ${orderDate}</p>
              <p style="margin: 8px 0;"><strong>Status:</strong> <span style="color: #10b981; font-weight: 600;">Confirmed</span></p>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #333; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Items Ordered</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f5f5f5; border-bottom: 2px solid #e0e0e0;">
                    <th style="padding: 12px; text-align: left; font-weight: 600;">Item</th>
                    <th style="padding: 12px; text-align: center; font-weight: 600;">Qty</th>
                    <th style="padding: 12px; text-align: right; font-weight: 600;">Price</th>
                    <th style="padding: 12px; text-align: right; font-weight: 600;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #333; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Order Summary</h3>
              <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                <span>Subtotal:</span>
                <span>₹${(order.subtotal || 0).toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                <span>Tax:</span>
                <span>₹${(order.tax || 0).toFixed(2)}</span>
              </div>
            <div>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      margin: "8px 0",
    }}
  >
    <span>Shipping:</span>
    <span>
      There may be additional shipping cost based on the location. Our team will
      contact you before dispatch.
    </span>
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      margin: "8px 0",
      paddingTop: "12px",
      borderTop: "2px solid #e0e0e0",
      fontSize: "18px",
      fontWeight: 600,
    }}
  >
    <span>Total:</span>
    <span style={{ color: "#667eea" }}>
      ₹{(order.total || 0).toFixed(2)}
    </span>
  </div>
</div>


            <div style="background: white; padding: 20px; border-radius: 8px;">
              <h3 style="color: #333; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Shipping Address</h3>
              <p style="margin: 5px 0;">${order.shippingAddress?.fullName || ''}</p>
              <p style="margin: 5px 0;">${order.shippingAddress?.addressLine1 || ''}</p>
              ${order.shippingAddress?.addressLine2 ? `<p style="margin: 5px 0;">${order.shippingAddress.addressLine2}</p>` : ''}
              <p style="margin: 5px 0;">${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} ${order.shippingAddress?.postalCode || ''}</p>
              <p style="margin: 5px 0;">${order.shippingAddress?.country || ''}</p>
              <p style="margin: 10px 0 0;">Phone: ${order.shippingAddress?.phone || ''}</p>
            </div>
          </div>

          <div style="text-align: center; padding: 20px; background: #f0f4ff; border-radius: 0 0 8px 8px;">
            <p style="margin: 0 0 15px; color: #333; font-size: 16px;">Shop more at <a href="https://hornbillmusicfestival.com/merch" style="color: #667eea; text-decoration: none; font-weight: 600;">Hornbill Merch Store</a></p>
            <p style="margin: 0; font-size: 12px; color: #666;">We'll send you tracking information once your order ships.</p>
          </div>

          <div style="text-align: center; font-size: 12px; color: #666; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p>If you have any questions, please contact at 8794696995</p>
            <p>&copy; ${new Date().getFullYear()} Ahibi. All rights reserved.</p>
          </div>
        </div>
      `;

      const result = await this.sendMail({
        to: order.user?.email || order.shippingAddress?.email,
        subject,
        html
      });

      if (result.success) {
        console.log(`Merch order confirmation email sent for order ${order._id || order.id}`);
      }

      return result;
    } catch (error) {
      console.error('Error sending merch order confirmation email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new EmailService();
