const Artist = require('../models/Artist');
const ArtistBooking = require('../models/ArtistBooking');
const Notification = require('../models/Notification');
const emailService = require('./emailService');
const smsService = require('./smsService');

class ArtistNotificationService {
  /**
   * Send booking request notification to artist
   * @param {string} bookingId - Booking ID
   */
  static async notifyBookingRequest(bookingId) {
    try {
      const booking = await ArtistBooking.findById(bookingId)
        .populate('artist', 'name email phone')
        .populate('organizer', 'name email phone companyName');

      if (!booking) {
        throw new Error('Booking not found');
      }

      const artist = booking.artist;
      const organizer = booking.organizer;

      // Create in-app notification
      await Notification.create({
        recipient: artist._id,
        recipientModel: 'Artist',
        type: 'booking_request',
        title: 'New Booking Request',
        message: `${organizer.name} from ${organizer.companyName} has sent you a booking request for ${booking.event.name}`,
        data: {
          bookingId: booking._id,
          eventName: booking.event.name,
          eventDate: booking.event.date,
          organizerName: organizer.name,
          requestedAmount: booking.booking.requestedAmount
        }
      });

      // Send email notification
      const emailData = {
        artistName: artist.name,
        organizerName: organizer.name,
        organizerCompany: organizer.companyName,
        eventName: booking.event.name,
        eventDate: booking.event.date.toLocaleDateString(),
        eventTime: `${booking.event.startTime} - ${booking.event.endTime}`,
        venue: `${booking.event.venue.name}, ${booking.event.venue.address}`,
        requestedAmount: booking.booking.requestedAmount,
        bookingId: booking._id,
        dashboardUrl: `${process.env.CLIENT_URL}/artist/dashboard`
      };

      await emailService.sendArtistBookingRequest(artist.email, emailData);

      // Send SMS notification
      const smsMessage = `New booking request from ${organizer.name} for ${booking.event.name} on ${booking.event.date.toLocaleDateString()}. Amount: ₹${booking.booking.requestedAmount}. Check your dashboard to respond.`;
      await smsService.sendNotification(artist.phone, smsMessage);

    } catch (error) {
      console.error('Error sending booking request notification:', error);
    }
  }

  /**
   * Send booking status update notification to artist
   * @param {string} bookingId - Booking ID
   * @param {string} status - New status
   * @param {string} message - Additional message
   */
  static async notifyBookingStatusUpdate(bookingId, status, message = '') {
    try {
      const booking = await ArtistBooking.findById(bookingId)
        .populate('artist', 'name email phone')
        .populate('organizer', 'name email phone companyName');

      if (!booking) {
        throw new Error('Booking not found');
      }

      const artist = booking.artist;
      const organizer = booking.organizer;

      let notificationTitle = '';
      let notificationMessage = '';
      let emailTemplate = '';

      switch (status) {
        case 'confirmed':
          notificationTitle = 'Booking Confirmed';
          notificationMessage = `Your booking for ${booking.event.name} has been confirmed by ${organizer.name}`;
          emailTemplate = 'artistBookingConfirmed';
          break;
        case 'cancelled':
          notificationTitle = 'Booking Cancelled';
          notificationMessage = `Your booking for ${booking.event.name} has been cancelled by ${organizer.name}`;
          emailTemplate = 'artistBookingCancelled';
          break;
        case 'counter_offer_accepted':
          notificationTitle = 'Counter Offer Accepted';
          notificationMessage = `${organizer.name} has accepted your counter offer for ${booking.event.name}`;
          emailTemplate = 'artistCounterOfferAccepted';
          break;
        case 'counter_offer_rejected':
          notificationTitle = 'Counter Offer Rejected';
          notificationMessage = `${organizer.name} has rejected your counter offer for ${booking.event.name}`;
          emailTemplate = 'artistCounterOfferRejected';
          break;
      }

      // Create in-app notification
      await Notification.create({
        recipient: artist._id,
        recipientModel: 'Artist',
        type: 'booking_update',
        title: notificationTitle,
        message: notificationMessage + (message ? `. ${message}` : ''),
        data: {
          bookingId: booking._id,
          status: status,
          eventName: booking.event.name,
          organizerName: organizer.name
        }
      });

      // Send email notification if template exists
      if (emailTemplate) {
        const emailData = {
          artistName: artist.name,
          organizerName: organizer.name,
          organizerCompany: organizer.companyName,
          eventName: booking.event.name,
          eventDate: booking.event.date.toLocaleDateString(),
          bookingId: booking._id,
          message: message,
          dashboardUrl: `${process.env.CLIENT_URL}/artist/dashboard`
        };

        // Note: You would need to implement these email templates
        // await emailService[emailTemplate](artist.email, emailData);
      }

      // Send SMS notification
      const smsMessage = `${notificationTitle}: ${notificationMessage}${message ? `. ${message}` : ''}`;
      await smsService.sendNotification(artist.phone, smsMessage);

    } catch (error) {
      console.error('Error sending booking status update notification:', error);
    }
  }

  /**
   * Send approval status notification to artist
   * @param {string} artistId - Artist ID
   * @param {string} status - Approval status
   * @param {string} rejectionReason - Reason for rejection (if applicable)
   */
  static async notifyApprovalStatus(artistId, status, rejectionReason = '') {
    try {
      const artist = await Artist.findById(artistId);
      if (!artist) {
        throw new Error('Artist not found');
      }

      let notificationTitle = '';
      let notificationMessage = '';
      let emailSubject = '';
      let emailMessage = '';

      switch (status) {
        case 'approved':
          notificationTitle = 'Account Approved';
          notificationMessage = 'Congratulations! Your artist account has been approved. You can now start receiving booking requests.';
          emailSubject = 'Welcome to Ahibi - Your Artist Account is Approved!';
          emailMessage = `
            <h2>Congratulations ${artist.name}!</h2>
            <p>Your artist account has been approved and you're now part of the Ahibi community.</p>
            <p>You can now:</p>
            <ul>
              <li>Set your availability calendar</li>
              <li>Receive and manage booking requests</li>
              <li>Update your profile and gallery</li>
              <li>Connect with event organizers</li>
            </ul>
            <p><a href="${process.env.CLIENT_URL}/artist/dashboard" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a></p>
          `;
          break;
        case 'rejected':
          notificationTitle = 'Account Rejected';
          notificationMessage = `Your artist account application has been rejected. ${rejectionReason}`;
          emailSubject = 'Ahibi Artist Account Application Update';
          emailMessage = `
            <h2>Hello ${artist.name},</h2>
            <p>We regret to inform you that your artist account application has been rejected.</p>
            ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
            <p>If you believe this is an error or would like to reapply, please contact our support team.</p>
            <p><a href="mailto:support@ahibi.com">Contact Support</a></p>
          `;
          break;
      }

      // Create in-app notification
      await Notification.create({
        recipient: artistId,
        recipientModel: 'Artist',
        type: 'account_update',
        title: notificationTitle,
        message: notificationMessage,
        data: {
          status: status,
          rejectionReason: rejectionReason
        }
      });

      // Send email notification
      await emailService.sendCustomEmail(artist.email, emailSubject, emailMessage);

      // Send SMS notification
      const smsMessage = status === 'approved' 
        ? `Congratulations! Your Ahibi artist account has been approved. Start receiving bookings now!`
        : `Your Ahibi artist account application has been rejected. ${rejectionReason}`;
      
      await smsService.sendNotification(artist.phone, smsMessage);

    } catch (error) {
      console.error('Error sending approval status notification:', error);
    }
  }

  /**
   * Send upcoming event reminder to artist
   * @param {string} bookingId - Booking ID
   * @param {number} hoursBeforeEvent - Hours before event
   */
  static async sendEventReminder(bookingId, hoursBeforeEvent = 24) {
    try {
      const booking = await ArtistBooking.findById(bookingId)
        .populate('artist', 'name email phone')
        .populate('organizer', 'name phone');

      if (!booking || booking.booking.status !== 'confirmed') {
        return;
      }

      const artist = booking.artist;
      const organizer = booking.organizer;

      // Create in-app notification
      await Notification.create({
        recipient: artist._id,
        recipientModel: 'Artist',
        type: 'event_reminder',
        title: 'Upcoming Event Reminder',
        message: `You have an event "${booking.event.name}" in ${hoursBeforeEvent} hours`,
        data: {
          bookingId: booking._id,
          eventName: booking.event.name,
          eventDate: booking.event.date,
          hoursBeforeEvent: hoursBeforeEvent
        }
      });

      // Send email reminder
      const emailData = {
        artistName: artist.name,
        eventName: booking.event.name,
        eventDate: booking.event.date.toLocaleDateString(),
        eventTime: `${booking.event.startTime} - ${booking.event.endTime}`,
        venue: `${booking.event.venue.name}, ${booking.event.venue.address}`,
        organizerName: organizer.name,
        organizerPhone: organizer.phone,
        hoursBeforeEvent: hoursBeforeEvent
      };

      await emailService.sendArtistEventReminder(artist.email, emailData);

      // Send SMS reminder
      const smsMessage = `Reminder: You have "${booking.event.name}" in ${hoursBeforeEvent} hours at ${booking.event.venue.name}. Contact: ${organizer.phone}`;
      await smsService.sendNotification(artist.phone, smsMessage);

    } catch (error) {
      console.error('Error sending event reminder:', error);
    }
  }

  /**
   * Send payment received notification to artist
   * @param {string} bookingId - Booking ID
   * @param {number} amount - Payment amount
   * @param {string} paymentType - Type of payment (advance/full)
   */
  static async notifyPaymentReceived(bookingId, amount, paymentType = 'advance') {
    try {
      const booking = await ArtistBooking.findById(bookingId)
        .populate('artist', 'name email phone')
        .populate('organizer', 'name companyName');

      if (!booking) {
        throw new Error('Booking not found');
      }

      const artist = booking.artist;
      const organizer = booking.organizer;

      // Create in-app notification
      await Notification.create({
        recipient: artist._id,
        recipientModel: 'Artist',
        type: 'payment_received',
        title: 'Payment Received',
        message: `You received ${paymentType} payment of ₹${amount} for ${booking.event.name}`,
        data: {
          bookingId: booking._id,
          amount: amount,
          paymentType: paymentType,
          eventName: booking.event.name
        }
      });

      // Send SMS notification
      const smsMessage = `Payment received: ₹${amount} (${paymentType}) for ${booking.event.name} from ${organizer.name}`;
      await smsService.sendNotification(artist.phone, smsMessage);

    } catch (error) {
      console.error('Error sending payment notification:', error);
    }
  }

  /**
   * Get artist's unread notifications
   * @param {string} artistId - Artist ID
   * @param {number} limit - Number of notifications to fetch
   * @returns {Array} Unread notifications
   */
  static async getUnreadNotifications(artistId, limit = 10) {
    try {
      return await Notification.find({
        recipient: artistId,
        recipientModel: 'Artist',
        isRead: false
      })
      .sort({ createdAt: -1 })
      .limit(limit);
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      return [];
    }
  }

  /**
   * Mark notifications as read
   * @param {string} artistId - Artist ID
   * @param {Array} notificationIds - Array of notification IDs
   */
  static async markNotificationsAsRead(artistId, notificationIds) {
    try {
      await Notification.updateMany(
        {
          _id: { $in: notificationIds },
          recipient: artistId,
          recipientModel: 'Artist'
        },
        { isRead: true, readAt: new Date() }
      );
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }

  /**
   * Send bulk notifications to all artists
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {Object} data - Additional data
   */
  static async sendBulkNotification(title, message, data = {}) {
    try {
      const artists = await Artist.find({ 
        approvalStatus: 'approved',
        status: 'active' 
      }).select('_id name email phone');

      const notifications = artists.map(artist => ({
        recipient: artist._id,
        recipientModel: 'Artist',
        type: 'announcement',
        title: title,
        message: message,
        data: data
      }));

      await Notification.insertMany(notifications);

      // Send email to all artists (consider using a queue for large numbers)
      const emailPromises = artists.map(artist => 
        emailService.sendCustomEmail(artist.email, title, message)
      );
      
      await Promise.allSettled(emailPromises);

    } catch (error) {
      console.error('Error sending bulk notifications:', error);
    }
  }
}

module.exports = ArtistNotificationService;
