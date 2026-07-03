const Event = require('../models/Event');
const EventTeamMember = require('../models/EventTeamMember');
const EventDepartment = require('../models/EventDepartment');
const EventChecklist = require('../models/EventChecklist');
const EventChecklistItem = require('../models/EventChecklistItem');
const EventTask = require('../models/EventTask');
const EventIncident = require('../models/EventIncident');
const ApiResponse = require('../utils/apiResponse');
const { formatTask } = require('./eventTaskController');
const { formatIncident } = require('./eventIncidentController');

async function getOrganizerEvent(eventId, organizerId) {
  return Event.findOne({ _id: eventId, organizer: organizerId }).lean();
}

function formatVenue(location) {
  if (!location) return '';
  return [location.address, location.city, location.state].filter(Boolean).join(', ');
}

function formatMemberForReport(member, deptByKey) {
  const departmentKey = member.departmentKey || '';
  const department = departmentKey ? deptByKey.get(departmentKey) : null;

  return {
    id: member._id,
    userId: member.user || null,
    name: member.name || '',
    email: member.email || '',
    role: member.eventRole || 'Team Member',
    departmentId: department?._id || null,
    departmentName: department?.name || null,
  };
}

function formatChecklistItemForReport(item, checklistDeptMap) {
  const checklistId = String(item.checklist?._id || item.checklist);
  const department = checklistDeptMap.get(checklistId);

  return {
    id: item._id,
    status: item.status || 'not_started',
    departmentId: department?._id || department || null,
    departmentName: department?.name || null,
  };
}

exports.getCrmReport = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const eventFilter = { event: eventId };

    const [departments, members, tasks, checklists, checklistItems, incidents] = await Promise.all([
      EventDepartment.find(eventFilter).sort({ sortOrder: 1, name: 1 }).lean(),
      EventTeamMember.find({
        ...eventFilter,
        status: { $in: ['accepted', 'active'] },
      })
        .sort({ isOwner: -1, createdAt: 1 })
        .lean(),
      EventTask.find(eventFilter)
        .populate('department', 'name key color')
        .populate('assignee', 'name phone email')
        .sort({ createdAt: -1 })
        .lean(),
      EventChecklist.find(eventFilter).populate('department', 'name key color').lean(),
      EventChecklistItem.find(eventFilter).sort({ position: 1, createdAt: 1 }).lean(),
      EventIncident.find(eventFilter)
        .populate('department', 'name key color')
        .sort({ reportedAt: -1 })
        .lean(),
    ]);

    const deptByKey = new Map(departments.map((d) => [d.key, d]));
    const checklistDeptMap = new Map(
      checklists.map((c) => [String(c._id), c.department || null])
    );

    return ApiResponse.success(res, 'CRM report fetched successfully', {
      event: {
        id: event._id,
        name: event.title,
        venue: formatVenue(event.location),
        status: event.status,
        startsAt: event.startDate,
        endsAt: event.endDate,
        description: event.description || '',
      },
      departments: departments.map((d) => ({
        id: d._id,
        name: d.name,
        color: d.color,
        key: d.key,
      })),
      members: members.map((m) => formatMemberForReport(m, deptByKey)),
      tasks: tasks.map(formatTask),
      checklistItems: checklistItems.map((item) =>
        formatChecklistItemForReport(item, checklistDeptMap)
      ),
      incidents: incidents.map(formatIncident),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('getCrmReport error:', error);
    return ApiResponse.serverError(res, 'Failed to fetch CRM report', error);
  }
};
