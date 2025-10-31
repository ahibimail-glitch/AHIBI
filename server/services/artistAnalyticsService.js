const Artist = require('../models/Artist');
const ArtistBooking = require('../models/ArtistBooking');
const ArtistAvailability = require('../models/ArtistAvailability');

class ArtistAnalyticsService {
  /**
   * Get artist dashboard statistics
   * @param {string} artistId - Artist ID
   * @param {Object} dateRange - Date range filter
   * @returns {Object} Dashboard statistics
   */
  static async getDashboardStats(artistId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      let bookingQuery = { artist: artistId };
      
      if (startDate && endDate) {
        bookingQuery['event.date'] = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      // Get all bookings for the artist
      const bookings = await ArtistBooking.find(bookingQuery);
      
      // Calculate basic stats
      const totalBookings = bookings.length;
      const confirmedBookings = bookings.filter(b => b.booking.status === 'confirmed').length;
      const pendingBookings = bookings.filter(b => b.booking.status === 'pending').length;
      const completedBookings = bookings.filter(b => b.booking.status === 'completed').length;
      const cancelledBookings = bookings.filter(b => b.booking.status === 'cancelled').length;
      
      // Calculate earnings
      const totalEarnings = bookings
        .filter(b => ['confirmed', 'completed'].includes(b.booking.status))
        .reduce((sum, b) => sum + (b.booking.finalAmount || b.booking.requestedAmount || 0), 0);
      
      const pendingEarnings = bookings
        .filter(b => b.booking.status === 'pending')
        .reduce((sum, b) => sum + (b.booking.requestedAmount || 0), 0);

      // Calculate average booking amount
      const paidBookings = bookings.filter(b => 
        ['confirmed', 'completed'].includes(b.booking.status) && 
        (b.booking.finalAmount || b.booking.requestedAmount)
      );
      const averageBookingAmount = paidBookings.length > 0 
        ? totalEarnings / paidBookings.length 
        : 0;

      // Get booking status distribution
      const statusDistribution = {
        pending: pendingBookings,
        confirmed: confirmedBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
        declined: bookings.filter(b => b.booking.status === 'declined').length
      };

      // Calculate booking trends (monthly)
      const monthlyBookings = this.calculateMonthlyTrends(bookings);
      const monthlyEarnings = this.calculateMonthlyEarnings(bookings);

      // Get upcoming events
      const upcomingEvents = bookings
        .filter(b => 
          b.booking.status === 'confirmed' && 
          new Date(b.event.date) > new Date()
        )
        .sort((a, b) => new Date(a.event.date) - new Date(b.event.date))
        .slice(0, 5);

      return {
        totalBookings,
        confirmedBookings,
        pendingBookings,
        completedBookings,
        cancelledBookings,
        totalEarnings,
        pendingEarnings,
        averageBookingAmount,
        statusDistribution,
        monthlyBookings,
        monthlyEarnings,
        upcomingEvents: upcomingEvents.map(booking => ({
          id: booking._id,
          eventName: booking.event.name,
          date: booking.event.date,
          time: `${booking.event.startTime} - ${booking.event.endTime}`,
          venue: booking.event.venue.name,
          amount: booking.booking.finalAmount || booking.booking.requestedAmount
        }))
      };

    } catch (error) {
      console.error('Error calculating dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Calculate monthly booking trends
   * @param {Array} bookings - Array of bookings
   * @returns {Array} Monthly booking data
   */
  static calculateMonthlyTrends(bookings) {
    const monthlyData = {};
    
    bookings.forEach(booking => {
      const date = new Date(booking.event.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          total: 0,
          confirmed: 0,
          completed: 0,
          cancelled: 0
        };
      }
      
      monthlyData[monthKey].total++;
      
      if (booking.booking.status === 'confirmed') {
        monthlyData[monthKey].confirmed++;
      } else if (booking.booking.status === 'completed') {
        monthlyData[monthKey].completed++;
      } else if (booking.booking.status === 'cancelled') {
        monthlyData[monthKey].cancelled++;
      }
    });
    
    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Calculate monthly earnings
   * @param {Array} bookings - Array of bookings
   * @returns {Array} Monthly earnings data
   */
  static calculateMonthlyEarnings(bookings) {
    const monthlyEarnings = {};
    
    bookings
      .filter(b => ['confirmed', 'completed'].includes(b.booking.status))
      .forEach(booking => {
        const date = new Date(booking.event.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyEarnings[monthKey]) {
          monthlyEarnings[monthKey] = {
            month: monthKey,
            earnings: 0,
            bookings: 0
          };
        }
        
        monthlyEarnings[monthKey].earnings += (booking.booking.finalAmount || booking.booking.requestedAmount || 0);
        monthlyEarnings[monthKey].bookings++;
      });
    
    return Object.values(monthlyEarnings).sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Get artist performance metrics
   * @param {string} artistId - Artist ID
   * @returns {Object} Performance metrics
   */
  static async getPerformanceMetrics(artistId) {
    try {
      const artist = await Artist.findById(artistId);
      const bookings = await ArtistBooking.find({ artist: artistId });
      
      // Response rate (accepted / total requests)
      const totalRequests = bookings.length;
      const acceptedRequests = bookings.filter(b => 
        ['accepted', 'confirmed', 'completed'].includes(b.booking.status)
      ).length;
      const responseRate = totalRequests > 0 ? (acceptedRequests / totalRequests) * 100 : 0;
      
      // Completion rate (completed / confirmed)
      const confirmedBookings = bookings.filter(b => 
        ['confirmed', 'completed'].includes(b.booking.status)
      ).length;
      const completedBookings = bookings.filter(b => b.booking.status === 'completed').length;
      const completionRate = confirmedBookings > 0 ? (completedBookings / confirmedBookings) * 100 : 0;
      
      // Cancellation rate
      const cancelledBookings = bookings.filter(b => b.booking.status === 'cancelled').length;
      const cancellationRate = totalRequests > 0 ? (cancelledBookings / totalRequests) * 100 : 0;
      
      // Average response time (time to first response)
      const responseTimes = bookings
        .filter(b => b.timeline.length > 1)
        .map(b => {
          const requestTime = new Date(b.createdAt);
          const responseTime = new Date(b.timeline[1].timestamp);
          return (responseTime - requestTime) / (1000 * 60 * 60); // in hours
        });
      
      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0;
      
      // Rating and reviews
      const averageRating = artist.rating.average || 0;
      const totalReviews = artist.rating.count || 0;
      
      return {
        responseRate: Math.round(responseRate * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        cancellationRate: Math.round(cancellationRate * 100) / 100,
        averageResponseTime: Math.round(averageResponseTime * 100) / 100,
        averageRating,
        totalReviews,
        totalBookings: totalRequests,
        acceptedBookings: acceptedRequests,
        completedBookings
      };

    } catch (error) {
      console.error('Error calculating performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get booking analytics by event type
   * @param {string} artistId - Artist ID
   * @returns {Object} Event type analytics
   */
  static async getEventTypeAnalytics(artistId) {
    try {
      const bookings = await ArtistBooking.find({ artist: artistId });
      
      const eventTypeStats = {};
      
      bookings.forEach(booking => {
        const eventType = booking.event.eventType;
        
        if (!eventTypeStats[eventType]) {
          eventTypeStats[eventType] = {
            type: eventType,
            totalBookings: 0,
            confirmedBookings: 0,
            totalEarnings: 0,
            averageAmount: 0
          };
        }
        
        eventTypeStats[eventType].totalBookings++;
        
        if (['confirmed', 'completed'].includes(booking.booking.status)) {
          eventTypeStats[eventType].confirmedBookings++;
          eventTypeStats[eventType].totalEarnings += (booking.booking.finalAmount || booking.booking.requestedAmount || 0);
        }
      });
      
      // Calculate average amounts
      Object.values(eventTypeStats).forEach(stats => {
        if (stats.confirmedBookings > 0) {
          stats.averageAmount = stats.totalEarnings / stats.confirmedBookings;
        }
      });
      
      return Object.values(eventTypeStats).sort((a, b) => b.totalBookings - a.totalBookings);

    } catch (error) {
      console.error('Error calculating event type analytics:', error);
      throw error;
    }
  }

  /**
   * Get availability utilization metrics
   * @param {string} artistId - Artist ID
   * @param {Object} dateRange - Date range filter
   * @returns {Object} Availability metrics
   */
  static async getAvailabilityMetrics(artistId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      let availabilityQuery = { artist: artistId };
      
      if (startDate && endDate) {
        availabilityQuery.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const availability = await ArtistAvailability.find(availabilityQuery);
      
      let totalSlots = 0;
      let bookedSlots = 0;
      let availableSlots = 0;
      let unavailableSlots = 0;
      
      availability.forEach(avail => {
        totalSlots += avail.timeSlots.length;
        bookedSlots += avail.timeSlots.filter(slot => slot.isBooked).length;
        availableSlots += avail.timeSlots.filter(slot => slot.isAvailable && !slot.isBooked).length;
        unavailableSlots += avail.timeSlots.filter(slot => !slot.isAvailable).length;
      });
      
      const utilizationRate = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;
      const availabilityRate = totalSlots > 0 ? (availableSlots / totalSlots) * 100 : 0;
      
      return {
        totalSlots,
        bookedSlots,
        availableSlots,
        unavailableSlots,
        utilizationRate: Math.round(utilizationRate * 100) / 100,
        availabilityRate: Math.round(availabilityRate * 100) / 100,
        totalDays: availability.length
      };

    } catch (error) {
      console.error('Error calculating availability metrics:', error);
      throw error;
    }
  }

  /**
   * Get client analytics (organizers who book the artist)
   * @param {string} artistId - Artist ID
   * @returns {Array} Client analytics
   */
  static async getClientAnalytics(artistId) {
    try {
      const bookings = await ArtistBooking.find({ artist: artistId })
        .populate('organizer', 'name companyName email');
      
      const clientStats = {};
      
      bookings.forEach(booking => {
        const organizerId = booking.organizer._id.toString();
        
        if (!clientStats[organizerId]) {
          clientStats[organizerId] = {
            organizerId,
            name: booking.organizer.name,
            companyName: booking.organizer.companyName,
            email: booking.organizer.email,
            totalBookings: 0,
            confirmedBookings: 0,
            totalSpent: 0,
            lastBookingDate: null
          };
        }
        
        clientStats[organizerId].totalBookings++;
        
        if (['confirmed', 'completed'].includes(booking.booking.status)) {
          clientStats[organizerId].confirmedBookings++;
          clientStats[organizerId].totalSpent += (booking.booking.finalAmount || booking.booking.requestedAmount || 0);
        }
        
        const bookingDate = new Date(booking.event.date);
        if (!clientStats[organizerId].lastBookingDate || bookingDate > clientStats[organizerId].lastBookingDate) {
          clientStats[organizerId].lastBookingDate = bookingDate;
        }
      });
      
      return Object.values(clientStats)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10); // Top 10 clients

    } catch (error) {
      console.error('Error calculating client analytics:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive analytics report
   * @param {string} artistId - Artist ID
   * @param {Object} options - Report options
   * @returns {Object} Complete analytics report
   */
  static async generateAnalyticsReport(artistId, options = {}) {
    try {
      const { dateRange = {} } = options;
      
      const [
        dashboardStats,
        performanceMetrics,
        eventTypeAnalytics,
        availabilityMetrics,
        clientAnalytics
      ] = await Promise.all([
        this.getDashboardStats(artistId, dateRange),
        this.getPerformanceMetrics(artistId),
        this.getEventTypeAnalytics(artistId),
        this.getAvailabilityMetrics(artistId, dateRange),
        this.getClientAnalytics(artistId)
      ]);
      
      return {
        generatedAt: new Date(),
        dateRange,
        dashboardStats,
        performanceMetrics,
        eventTypeAnalytics,
        availabilityMetrics,
        clientAnalytics
      };

    } catch (error) {
      console.error('Error generating analytics report:', error);
      throw error;
    }
  }
}

module.exports = ArtistAnalyticsService;
