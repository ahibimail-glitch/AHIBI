const AdminNotification = require('../models/AdminNotification');
const emailService = require('./emailService');

/**
 * Service for creating notifications and sending emails for sports-related actions
 */
class NotificationService {
  /**
   * Create admin notification and send email for arena partner approval
   * @param {Object} partner - ArenaPartner object
   * @param {Boolean} approved - Whether approved
   * @param {String} rejectionReason - Reason for rejection if not approved
   * @param {Object} adminUser - Admin who performed the action
   */
  async handleArenaPartnerApproval(partner, approved, rejectionReason = '', adminUser = null) {
    try {
      // Create admin notification
      const notificationData = {
        type: approved ? 'sports_partner_approved' : 'sports_partner_rejected',
        title: approved ? 'Arena Partner Approved' : 'Arena Partner Rejected',
        message: approved 
          ? `Arena partner "${partner.name}" (${partner.businessDetails?.businessName || 'N/A'}) has been approved.`
          : `Arena partner "${partner.name}" (${partner.businessDetails?.businessName || 'N/A'}) has been rejected. Reason: ${rejectionReason}`,
        priority: approved ? 'medium' : 'high',
        category: 'sports',
        entityType: 'ArenaPartner',
        entityId: partner._id,
        actionRequired: false,
        actionType: 'none',
        metadata: {
          partnerName: partner.name,
          businessName: partner.businessDetails?.businessName,
          email: partner.email,
          phone: partner.phone,
          approved,
          rejectionReason
        },
        triggeredBy: adminUser ? {
          userType: 'Admin',
          userId: adminUser._id,
          name: adminUser.name || 'Admin',
          email: adminUser.email
        } : {
          userType: 'System',
          name: 'System'
        },
        redirectUrl: `/admin/sports/partners/${partner._id}`
      };

      await AdminNotification.createNotification(notificationData);

      // Send email to arena partner
      await emailService.sendArenaPartnerApprovalNotification(partner, approved, rejectionReason);

      console.log(`Arena partner ${approved ? 'approval' : 'rejection'} notification sent for ${partner.name}`);
      
    } catch (error) {
      console.error('Error handling arena partner approval notification:', error);
    }
  }

  /**
   * Create admin notification and send email for sports venue approval
   * @param {Object} venue - SportsVenue object with populated arenaPartner
   * @param {Boolean} approved - Whether approved
   * @param {String} rejectionReason - Reason for rejection if not approved
   * @param {Object} adminUser - Admin who performed the action
   */
  async handleSportsVenueApproval(venue, approved, rejectionReason = '', adminUser = null) {
    try {
      // Create admin notification
      const notificationData = {
        type: approved ? 'sports_venue_approved' : 'sports_venue_rejected',
        title: approved ? 'Sports Venue Approved' : 'Sports Venue Rejected',
        message: approved 
          ? `Sports venue "${venue.venueName}" in ${venue.address.city} has been approved.`
          : `Sports venue "${venue.venueName}" in ${venue.address.city} has been rejected. Reason: ${rejectionReason}`,
        priority: approved ? 'medium' : 'high',
        category: 'sports',
        entityType: 'SportsVenue',
        entityId: venue._id,
        actionRequired: false,
        actionType: 'none',
        metadata: {
          venueName: venue.venueName,
          city: venue.address.city,
          state: venue.address.state,
          sportsSupported: venue.sportsSupported,
          arenaPartnerId: venue.arenaPartner._id,
          arenaPartnerName: venue.arenaPartner.name,
          approved,
          rejectionReason
        },
        triggeredBy: adminUser ? {
          userType: 'Admin',
          userId: adminUser._id,
          name: adminUser.name || 'Admin',
          email: adminUser.email
        } : {
          userType: 'System',
          name: 'System'
        },
        redirectUrl: `/admin/sports/management`
      };

      await AdminNotification.createNotification(notificationData);

      // Send email to arena partner
      await emailService.sendSportsVenueApprovalNotification(venue, approved, rejectionReason);

      console.log(`Sports venue ${approved ? 'approval' : 'rejection'} notification sent for ${venue.venueName}`);
      
    } catch (error) {
      console.error('Error handling sports venue approval notification:', error);
    }
  }

  /**
   * Create admin notification and send email for court approval
   * @param {Object} court - Court object with populated arenaPartner
   * @param {Boolean} approved - Whether approved
   * @param {String} rejectionReason - Reason for rejection if not approved
   * @param {Object} adminUser - Admin who performed the action
   */
  async handleCourtApproval(court, approved, rejectionReason = '', adminUser = null) {
    try {
      // Create admin notification
      const notificationData = {
        type: approved ? 'court_approved' : 'court_rejected',
        title: approved ? 'Court Approved' : 'Court Rejected',
        message: approved 
          ? `Court "${court.courtName}" (${court.sportType}) has been approved.`
          : `Court "${court.courtName}" (${court.sportType}) has been rejected. Reason: ${rejectionReason}`,
        priority: approved ? 'medium' : 'high',
        category: 'sports',
        entityType: 'Court',
        entityId: court._id,
        actionRequired: false,
        actionType: 'none',
        metadata: {
          courtName: court.courtName,
          sportType: court.sportType,
          venueId: court.venue._id,
          venueName: court.venue.venueName,
          arenaPartnerId: court.arenaPartner._id,
          arenaPartnerName: court.arenaPartner.name,
          approved,
          rejectionReason
        },
        triggeredBy: adminUser ? {
          userType: 'Admin',
          userId: adminUser._id,
          name: adminUser.name || 'Admin',
          email: adminUser.email
        } : {
          userType: 'System',
          name: 'System'
        },
        redirectUrl: `/admin/sports/management`
      };

      await AdminNotification.createNotification(notificationData);

      // Send email to arena partner
      await emailService.sendCourtApprovalNotification(court, approved, rejectionReason);

      console.log(`Court ${approved ? 'approval' : 'rejection'} notification sent for ${court.courtName}`);
      
    } catch (error) {
      console.error('Error handling court approval notification:', error);
    }
  }

  /**
   * Create admin notification for sports partner registration
   * @param {Object} partner - ArenaPartner object
   */
  async handleSportsPartnerRegistration(partner) {
    try {
      const notificationData = {
        type: 'sports_partner_registration',
        title: 'New Arena Partner Registration',
        message: `New arena partner "${partner.name}" (${partner.businessDetails?.businessName || 'N/A'}) has registered and is awaiting approval.`,
        priority: 'high',
        category: 'sports',
        entityType: 'ArenaPartner',
        entityId: partner._id,
        actionRequired: true,
        actionType: 'approve',
        metadata: {
          partnerName: partner.name,
          businessName: partner.businessDetails?.businessName,
          email: partner.email,
          phone: partner.phone
        },
        triggeredBy: {
          userType: 'System',
          name: 'System'
        },
        redirectUrl: `/admin/sports/partners/${partner._id}`
      };

      await AdminNotification.createNotification(notificationData);
      console.log(`Sports partner registration notification created for ${partner.name}`);
      
    } catch (error) {
      console.error('Error handling sports partner registration notification:', error);
    }
  }

  /**
   * Create admin notification for sports venue creation
   * @param {Object} venue - SportsVenue object with populated arenaPartner
   */
  async handleSportsVenueCreation(venue) {
    try {
      const notificationData = {
        type: 'sports_venue_created',
        title: 'New Sports Venue Added',
        message: `New sports venue "${venue.venueName}" in ${venue.address.city} has been added by ${venue.arenaPartner.name} and is awaiting approval.`,
        priority: 'high',
        category: 'sports',
        entityType: 'SportsVenue',
        entityId: venue._id,
        actionRequired: true,
        actionType: 'approve',
        metadata: {
          venueName: venue.venueName,
          city: venue.address.city,
          state: venue.address.state,
          sportsSupported: venue.sportsSupported,
          arenaPartnerId: venue.arenaPartner._id,
          arenaPartnerName: venue.arenaPartner.name
        },
        triggeredBy: {
          userType: 'ArenaPartner',
          userId: venue.arenaPartner._id,
          name: venue.arenaPartner.name,
          email: venue.arenaPartner.email
        },
        redirectUrl: `/admin/sports/management`
      };

      await AdminNotification.createNotification(notificationData);
      console.log(`Sports venue creation notification created for ${venue.venueName}`);
      
    } catch (error) {
      console.error('Error handling sports venue creation notification:', error);
    }
  }

  /**
   * Create admin notification for court creation
   * @param {Object} court - Court object with populated arenaPartner
   */
  async handleCourtCreation(court) {
    try {
      const notificationData = {
        type: 'court_created',
        title: 'New Court Added',
        message: `New court "${court.courtName}" (${court.sportType}) has been added to ${court.venue.venueName} by ${court.arenaPartner.name}.`,
        priority: 'medium',
        category: 'sports',
        entityType: 'Court',
        entityId: court._id,
        actionRequired: true,
        actionType: 'approve',
        metadata: {
          courtName: court.courtName,
          sportType: court.sportType,
          venueId: court.venue._id,
          venueName: court.venue.venueName,
          arenaPartnerId: court.arenaPartner._id,
          arenaPartnerName: court.arenaPartner.name
        },
        triggeredBy: {
          userType: 'ArenaPartner',
          userId: court.arenaPartner._id,
          name: court.arenaPartner.name,
          email: court.arenaPartner.email
        },
        redirectUrl: `/admin/sports/management`
      };

      await AdminNotification.createNotification(notificationData);
      console.log(`Court creation notification created for ${court.courtName}`);
      
    } catch (error) {
      console.error('Error handling court creation notification:', error);
    }
  }
}

module.exports = new NotificationService();
