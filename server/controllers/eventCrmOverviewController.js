const Event = require('../models/Event');
const Booking = require('../models/Booking');
const EventTeamMember = require('../models/EventTeamMember');
const EventDepartment = require('../models/EventDepartment');
const EventChecklistItem = require('../models/EventChecklistItem');
const EventTask = require('../models/EventTask');
const EventIncident = require('../models/EventIncident');
const EventFile = require('../models/EventFile');
const EventDiscordLink = require('../models/EventDiscordLink');
const ApiResponse = require('../utils/apiResponse');

async function getOrganizerEvent(eventId, organizerId) {
  return Event.findOne({ _id: eventId, organizer: organizerId }).lean();
}

exports.getCrmOverview = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const now = new Date();
    const eventFilter = { event: eventId };

    const [
      bookingStats,
      teamMembers,
      pendingInvites,
      departments,
      checklistItems,
      checklistCompleted,
      tasksOpen,
      tasksCompleted,
      tasksOverdue,
      incidentsOpen,
      incidentsResolved,
      files,
      discordLinks,
    ] = await Promise.all([
      Booking.aggregate([
        {
          $match: {
            event: event._id,
            paymentStatus: 'completed',
          },
        },
        {
          $group: {
            _id: null,
            ticketsSold: { $sum: '$quantity' },
            totalRevenue: { $sum: '$total' },
            uniqueAttendees: { $addToSet: '$user' },
          },
        },
      ]),
      EventTeamMember.countDocuments({
        ...eventFilter,
        status: { $in: ['accepted', 'active'] },
      }),
      EventTeamMember.countDocuments({ ...eventFilter, status: 'pending' }),
      EventDepartment.countDocuments(eventFilter),
      EventChecklistItem.countDocuments(eventFilter),
      EventChecklistItem.countDocuments({ ...eventFilter, status: 'completed' }),
      EventTask.countDocuments({
        ...eventFilter,
        status: { $nin: ['completed', 'cancelled'] },
      }),
      EventTask.countDocuments({ ...eventFilter, status: 'completed' }),
      EventTask.countDocuments({
        ...eventFilter,
        status: { $nin: ['completed', 'cancelled'] },
        deadline: { $ne: null, $lt: now },
      }),
      EventIncident.countDocuments({
        ...eventFilter,
        status: { $nin: ['resolved', 'closed'] },
      }),
      EventIncident.countDocuments({
        ...eventFilter,
        status: { $in: ['resolved', 'closed'] },
      }),
      EventFile.countDocuments(eventFilter),
      EventDiscordLink.countDocuments(eventFilter),
    ]);

    const stats = bookingStats[0] || {};
    const ticketsSold = stats.ticketsSold || 0;
    const totalRevenue = stats.totalRevenue || 0;
    const uniqueAttendees = Array.isArray(stats.uniqueAttendees)
      ? stats.uniqueAttendees.filter(Boolean).length
      : 0;
    const totalTickets = Array.isArray(event.ticketTypes)
      ? event.ticketTypes.reduce((sum, ticket) => sum + (ticket.quantity || 0), 0)
      : 0;

    return ApiResponse.success(res, 'CRM overview fetched successfully', {
      event: {
        _id: event._id,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        status: event.status,
        location: event.location || {},
        ticketsSold,
        totalTickets,
        totalRevenue,
      },
      stats: {
        teamMembers,
        pendingInvites,
        departments,
        checklistItems,
        checklistCompleted,
        tasksOpen,
        tasksCompleted,
        tasksOverdue,
        incidentsOpen,
        incidentsResolved,
        files,
        discordLinks,
        uniqueAttendees,
        ticketsSold,
        totalRevenue,
      },
    });
  } catch (error) {
    console.error('getCrmOverview error:', error);
    return ApiResponse.serverError(res, 'Failed to fetch CRM overview', error);
  }
};
