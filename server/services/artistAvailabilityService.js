const ArtistAvailability = require('../models/ArtistAvailability');
const Artist = require('../models/Artist');

class ArtistAvailabilityService {
  /**
   * Generate default time slots for a day
   * @param {string} startTime - Start time in HH:MM format
   * @param {string} endTime - End time in HH:MM format
   * @param {number} slotDuration - Duration of each slot in hours
   * @returns {Array} Array of time slots
   */
  static generateTimeSlots(startTime = '09:00', endTime = '21:00', slotDuration = 2) {
    const slots = [];
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    
    let current = new Date(start);
    
    while (current < end) {
      const slotStart = current.toTimeString().slice(0, 5);
      current.setHours(current.getHours() + slotDuration);
      
      if (current <= end) {
        const slotEnd = current.toTimeString().slice(0, 5);
        
        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          isAvailable: true,
          isBooked: false
        });
      }
    }
    
    return slots;
  }

  /**
   * Check if two time slots overlap
   * @param {Object} slot1 - First time slot
   * @param {Object} slot2 - Second time slot
   * @returns {boolean} True if slots overlap
   */
  static slotsOverlap(slot1, slot2) {
    const start1 = new Date(`2000-01-01T${slot1.startTime}:00`);
    const end1 = new Date(`2000-01-01T${slot1.endTime}:00`);
    const start2 = new Date(`2000-01-01T${slot2.startTime}:00`);
    const end2 = new Date(`2000-01-01T${slot2.endTime}:00`);
    
    return start1 < end2 && start2 < end1;
  }

  /**
   * Merge overlapping or adjacent time slots
   * @param {Array} slots - Array of time slots
   * @returns {Array} Merged time slots
   */
  static mergeTimeSlots(slots) {
    if (!slots || slots.length === 0) return [];
    
    // Sort slots by start time
    const sortedSlots = slots.sort((a, b) => {
      const timeA = new Date(`2000-01-01T${a.startTime}:00`);
      const timeB = new Date(`2000-01-01T${b.startTime}:00`);
      return timeA - timeB;
    });
    
    const merged = [sortedSlots[0]];
    
    for (let i = 1; i < sortedSlots.length; i++) {
      const current = sortedSlots[i];
      const last = merged[merged.length - 1];
      
      // Check if current slot overlaps or is adjacent to the last merged slot
      const lastEnd = new Date(`2000-01-01T${last.endTime}:00`);
      const currentStart = new Date(`2000-01-01T${current.startTime}:00`);
      
      if (currentStart <= lastEnd) {
        // Merge slots
        const currentEnd = new Date(`2000-01-01T${current.endTime}:00`);
        if (currentEnd > lastEnd) {
          last.endTime = current.endTime;
        }
      } else {
        merged.push(current);
      }
    }
    
    return merged;
  }

  /**
   * Calculate duration between two times in hours
   * @param {string} startTime - Start time in HH:MM format
   * @param {string} endTime - End time in HH:MM format
   * @returns {number} Duration in hours
   */
  static calculateDuration(startTime, endTime) {
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    return (end - start) / (1000 * 60 * 60);
  }

  /**
   * Find available slots that can accommodate the requested duration
   * @param {Array} timeSlots - Array of time slots
   * @param {number} requestedDuration - Requested duration in hours
   * @returns {Array} Available slots that can accommodate the duration
   */
  static findAvailableSlots(timeSlots, requestedDuration) {
    const availableSlots = timeSlots.filter(slot => 
      slot.isAvailable && 
      !slot.isBooked && 
      this.calculateDuration(slot.startTime, slot.endTime) >= requestedDuration
    );
    
    return availableSlots;
  }

  /**
   * Get artist's availability for a date range
   * @param {string} artistId - Artist ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} Availability records
   */
  static async getAvailabilityRange(artistId, startDate, endDate) {
    return await ArtistAvailability.find({
      artist: artistId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: 1 });
  }

  /**
   * Create bulk availability for multiple dates
   * @param {string} artistId - Artist ID
   * @param {Array} dates - Array of dates
   * @param {Array} timeSlots - Time slots template
   * @param {Object} options - Additional options
   * @returns {Array} Created availability records
   */
  static async createBulkAvailability(artistId, dates, timeSlots, options = {}) {
    const availabilityPromises = dates.map(async (date) => {
      const existingAvailability = await ArtistAvailability.findOne({
        artist: artistId,
        date: new Date(date)
      });

      if (existingAvailability) {
        return existingAvailability;
      }

      const availability = new ArtistAvailability({
        artist: artistId,
        date: new Date(date),
        timeSlots: timeSlots.map(slot => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
          isAvailable: slot.isAvailable !== undefined ? slot.isAvailable : true,
          price: slot.price
        })),
        specialPricing: options.specialPricing || {},
        minimumBookingDuration: options.minimumBookingDuration || 2,
        maximumBookingDuration: options.maximumBookingDuration || 8,
        advanceBookingDays: options.advanceBookingDays || 7
      });

      availability.updateDayStatus();
      return await availability.save();
    });

    return await Promise.all(availabilityPromises);
  }

  /**
   * Get artist's busy dates (fully booked or unavailable)
   * @param {string} artistId - Artist ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} Busy dates
   */
  static async getBusyDates(artistId, startDate, endDate) {
    const availability = await this.getAvailabilityRange(artistId, startDate, endDate);
    
    return availability
      .filter(avail => avail.dayStatus === 'fully_booked' || avail.dayStatus === 'unavailable')
      .map(avail => avail.date);
  }

  /**
   * Get artist's available dates with slot counts
   * @param {string} artistId - Artist ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Available dates with slot information
   */
  static async getAvailableDates(artistId, startDate, endDate) {
    const availability = await this.getAvailabilityRange(artistId, startDate, endDate);
    
    const availableDates = {};
    
    availability.forEach(avail => {
      if (avail.dayStatus === 'available' || avail.dayStatus === 'partially_booked') {
        const dateKey = avail.date.toISOString().split('T')[0];
        const availableSlots = avail.getAvailableSlots();
        
        availableDates[dateKey] = {
          totalSlots: avail.timeSlots.length,
          availableSlots: availableSlots.length,
          bookedSlots: avail.timeSlots.filter(slot => slot.isBooked).length,
          dayStatus: avail.dayStatus,
          slots: availableSlots.map(slot => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
            duration: this.calculateDuration(slot.startTime, slot.endTime),
            price: slot.price
          }))
        };
      }
    });
    
    return availableDates;
  }

  /**
   * Check if artist is available for a specific time slot
   * @param {string} artistId - Artist ID
   * @param {Date} date - Date
   * @param {string} startTime - Start time
   * @param {string} endTime - End time
   * @returns {Object} Availability status and details
   */
  static async checkSlotAvailability(artistId, date, startTime, endTime) {
    const availability = await ArtistAvailability.findOne({
      artist: artistId,
      date: new Date(date)
    });

    if (!availability) {
      return {
        available: false,
        reason: 'No availability set for this date'
      };
    }

    const requestedDuration = this.calculateDuration(startTime, endTime);
    
    // Check minimum and maximum duration constraints
    if (requestedDuration < availability.minimumBookingDuration) {
      return {
        available: false,
        reason: `Minimum booking duration is ${availability.minimumBookingDuration} hours`
      };
    }

    if (requestedDuration > availability.maximumBookingDuration) {
      return {
        available: false,
        reason: `Maximum booking duration is ${availability.maximumBookingDuration} hours`
      };
    }

    // Check advance booking requirement
    const today = new Date();
    const eventDate = new Date(date);
    const daysDifference = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysDifference < availability.advanceBookingDays) {
      return {
        available: false,
        reason: `Booking must be made at least ${availability.advanceBookingDays} days in advance`
      };
    }

    // Check if the time slot is available
    const isSlotAvailable = availability.isTimeSlotAvailable(startTime, endTime);
    
    if (!isSlotAvailable) {
      return {
        available: false,
        reason: 'Requested time slot is not available or already booked'
      };
    }

    // Get artist base price for calculation
    const artist = await Artist.findById(artistId).select('basePrice');
    const calculatedPrice = availability.calculatePrice(startTime, endTime, artist.basePrice);

    return {
      available: true,
      price: calculatedPrice,
      duration: requestedDuration,
      specialPricing: availability.specialPricing.isSpecialDay ? {
        reason: availability.specialPricing.reason,
        multiplier: availability.specialPricing.multiplier,
        fixedPrice: availability.specialPricing.fixedPrice
      } : null
    };
  }

  /**
   * Generate recurring availability
   * @param {string} artistId - Artist ID
   * @param {Object} pattern - Recurring pattern
   * @param {Array} timeSlots - Time slots template
   * @param {Object} options - Additional options
   * @returns {Array} Created availability records
   */
  static async generateRecurringAvailability(artistId, pattern, timeSlots, options = {}) {
    const { startDate, endDate, type, daysOfWeek } = pattern;
    const dates = [];
    
    let currentDate = new Date(startDate);
    const finalDate = new Date(endDate);
    
    while (currentDate <= finalDate) {
      let shouldAdd = false;
      
      switch (type) {
        case 'daily':
          shouldAdd = true;
          break;
        case 'weekly':
          shouldAdd = daysOfWeek.includes(currentDate.getDay());
          break;
        case 'monthly':
          shouldAdd = currentDate.getDate() === new Date(startDate).getDate();
          break;
      }
      
      if (shouldAdd) {
        dates.push(new Date(currentDate));
      }
      
      // Move to next date based on pattern
      switch (type) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }
    }
    
    return await this.createBulkAvailability(artistId, dates, timeSlots, options);
  }
}

module.exports = ArtistAvailabilityService;
