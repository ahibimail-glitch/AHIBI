const TimeSlot = require('../models/TimeSlot');
const Court = require('../models/Court');
const ApiResponse = require('../utils/apiResponse');

/**
 * @desc    Regenerate slots for a court
 * @route   POST /api/sports/courts/:courtId/regenerate-slots
 * @access  Private (Arena Partner)
 */
exports.regenerateSlots = async (req, res) => {
  try {
    const { date } = req.body;
    const courtId = req.params.courtId;

    if (!date) {
      return ApiResponse.badRequest(res, 'Date is required');
    }

    // Verify the court belongs to the arena partner
    const court = await Court.findOne({
      _id: courtId,
      arenaPartner: req.user.id
    });

    if (!court) {
      return ApiResponse.notFound(res, 'Court not found');
    }

    // Regenerate slots for the specific date
    const slots = await TimeSlot.regenerateSlotsForDate(courtId, date);

    return ApiResponse.success(res, 'Slots regenerated successfully', {
      courtId,
      date,
      slotsGenerated: slots.length,
      courtDuration: court.pricing.duration
    });

  } catch (error) {
    console.error('Regenerate slots error:', error);
    return ApiResponse.serverError(res, 'Error regenerating slots', error);
  }
};

/**
 * @desc    Bulk regenerate slots for a date range
 * @route   POST /api/sports/courts/:courtId/regenerate-slots-bulk
 * @access  Private (Arena Partner)
 */
exports.regenerateSlotsBulk = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const courtId = req.params.courtId;

    if (!startDate || !endDate) {
      return ApiResponse.badRequest(res, 'Start date and end date are required');
    }

    // Verify the court belongs to the arena partner
    const court = await Court.findOne({
      _id: courtId,
      arenaPartner: req.user.id
    });

    if (!court) {
      return ApiResponse.notFound(res, 'Court not found');
    }

    // Generate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0]);
    }

    const results = [];
    let totalSlotsGenerated = 0;

    for (const date of dates) {
      try {
        const slots = await TimeSlot.regenerateSlotsForDate(courtId, date);
        results.push({
          date,
          slotsGenerated: slots.length,
          success: true
        });
        totalSlotsGenerated += slots.length;
      } catch (error) {
        results.push({
          date,
          slotsGenerated: 0,
          success: false,
          error: error.message
        });
      }
    }

    return ApiResponse.success(res, 'Bulk slot regeneration completed', {
      courtId,
      dateRange: { startDate, endDate },
      totalSlotsGenerated,
      courtDuration: court.pricing.duration,
      results
    });

  } catch (error) {
    console.error('Bulk regenerate slots error:', error);
    return ApiResponse.serverError(res, 'Error regenerating slots', error);
  }
};
