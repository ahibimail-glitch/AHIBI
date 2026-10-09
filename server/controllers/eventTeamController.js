const crypto = require('crypto');
const { validationResult } = require('express-validator');
const Event = require('../models/Event');
const Organizer = require('../models/Organizer');
const EventTeamMember = require('../models/EventTeamMember');
const EventResponsibility = require('../models/EventResponsibility');
const EventDepartment = require('../models/EventDepartment');
const EventChecklist = require('../models/EventChecklist');
const EventChecklistItem = require('../models/EventChecklistItem');
const EventTask = require('../models/EventTask');
const EventIncident = require('../models/EventIncident');
const EventFile = require('../models/EventFile');
const EventDiscordLink = require('../models/EventDiscordLink');
const {
  formatIncident,
  createIncidentRecord,
  buildDepartmentIncidentQuery,
} = require('./eventIncidentController');
const { formatFile } = require('./eventFileController');
const { formatDiscordLink } = require('./eventDiscordLinkController');
const ApiResponse = require('../utils/apiResponse');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const { resolveDepartmentKey, ensureDefaultDepartments, getDepartmentDisplayName } = require('./eventDepartmentController');

const DEFAULT_TEAM_ROLE = 'Team Member';

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeMemberStatus(status) {
  return status === 'active' ? 'accepted' : status;
}

function isAcceptedStatus(status) {
  return status === 'accepted' || status === 'active';
}

function formatResponsibility(doc) {
  const department = doc.department;
  return {
    id: doc._id,
    title: doc.title,
    description: doc.description || '',
    departmentId: department?._id || department || null,
    departmentName: department?.name || null,
    priority: doc.priority || 'medium',
    expectedOutcome: doc.expectedOutcome || '',
  };
}

async function getResponsibilitiesForMember(eventId, membership, departmentKey) {
  let query = { event: eventId };

  if (!membership.isOwner) {
    if (departmentKey) {
      const dept = await EventDepartment.findOne({ event: eventId, key: departmentKey });
      if (dept) {
        query = {
          event: eventId,
          $or: [{ department: dept._id }, { department: null }],
        };
      } else {
        query = { event: eventId, department: null };
      }
    } else {
      query = { event: eventId, department: null };
    }
  }

  const docs = await EventResponsibility.find(query)
    .populate('department', 'name key color')
    .sort({ createdAt: -1 })
    .lean();

  return docs.map(formatResponsibility);
}

function formatChecklistItem(doc) {
  return {
    id: doc._id,
    checklistId: doc.checklist?._id || doc.checklist,
    title: doc.title,
    status: doc.status || 'not_started',
    deadline: doc.deadline || null,
    position: doc.position ?? 0,
  };
}

function formatChecklist(doc, items = []) {
  const department = doc.department;
  return {
    id: doc._id,
    name: doc.name,
    phase: doc.phase,
    departmentId: department?._id || department || null,
    departmentName: department?.name || null,
    items: items.map(formatChecklistItem),
  };
}

async function buildDepartmentFilterQuery(eventId, membership, departmentKey) {
  if (membership.isOwner) {
    return { event: eventId };
  }

  if (departmentKey) {
    const dept = await EventDepartment.findOne({ event: eventId, key: departmentKey });
    if (dept) {
      return {
        event: eventId,
        $or: [{ department: dept._id }, { department: null }],
      };
    }
    return { event: eventId, department: null };
  }

  return { event: eventId, department: null };
}

async function getChecklistsForMember(eventId, membership, departmentKey) {
  const query = await buildDepartmentFilterQuery(eventId, membership, departmentKey);

  const checklists = await EventChecklist.find(query)
    .populate('department', 'name key color')
    .sort({ createdAt: 1 })
    .lean();

  const checklistIds = checklists.map((c) => c._id);
  const allItems = checklistIds.length
    ? await EventChecklistItem.find({ checklist: { $in: checklistIds } })
        .sort({ position: 1, createdAt: 1 })
        .lean()
    : [];

  const itemsByChecklist = {};
  allItems.forEach((item) => {
    const key = String(item.checklist);
    if (!itemsByChecklist[key]) itemsByChecklist[key] = [];
    itemsByChecklist[key].push(item);
  });

  return checklists.map((c) => formatChecklist(c, itemsByChecklist[String(c._id)] || []));
}

function formatTask(doc) {
  const department = doc.department;
  const assignee = doc.assignee;

  return {
    id: doc._id,
    title: doc.title,
    description: doc.description || '',
    status: doc.status || 'not_started',
    priority: doc.priority || 'medium',
    departmentId: department?._id || department || null,
    departmentName: department?.name || null,
    assigneeId: assignee?._id || assignee || null,
    assigneeName: assignee?.name || assignee?.phone || assignee?.email || null,
    deadline: doc.deadline || null,
    completionComment: doc.completionComment || '',
    completedAt: doc.completedAt || null,
    createdAt: doc.createdAt,
  };
}

async function getTasksForMember(eventId, membership) {
  const docs = await EventTask.find({ event: eventId, assignee: membership._id })
    .populate('department', 'name key color')
    .populate('assignee', 'name phone email')
    .sort({ createdAt: -1 })
    .lean();

  return docs.map(formatTask);
}

async function getIncidentsForMember(eventId, membership, departmentKey) {
  const query = await buildDepartmentIncidentQuery(eventId, membership, departmentKey);

  const docs = await EventIncident.find(query)
    .populate('department', 'name key color')
    .sort({ reportedAt: -1 })
    .lean();

  return docs.map(formatIncident);
}

async function getFilesForMember(eventId, membership, departmentKey) {
  const query = await buildDepartmentIncidentQuery(eventId, membership, departmentKey);

  const docs = await EventFile.find(query)
    .populate('department', 'name key color')
    .sort({ pinned: -1, createdAt: -1 })
    .lean();

  return docs.map(formatFile);
}

async function getDiscordLinksForMember(eventId, membership, departmentKey) {
  const query = await buildDepartmentFilterQuery(eventId, membership, departmentKey);

  const docs = await EventDiscordLink.find(query)
    .populate('department', 'name key color')
    .sort({ createdAt: -1 })
    .lean();

  return docs.map(formatDiscordLink);
}

async function findActiveMembership(eventId, user) {
  const matchConditions = buildUserMatchConditions(user);
  if (matchConditions.length === 0) {
    return null;
  }

  return EventTeamMember.findOne({
    event: eventId,
    status: { $in: ['accepted', 'active'] },
    $and: [
      { $or: matchConditions },
      { $or: [{ accessExpiresAt: null }, { accessExpiresAt: { $gt: new Date() } }] },
    ],
  });
}

async function isChecklistVisibleToMember(eventId, membership, departmentKey, checklistId) {
  const query = await buildDepartmentFilterQuery(eventId, membership, departmentKey);
  const checklist = await EventChecklist.findOne({ ...query, _id: checklistId });
  return Boolean(checklist);
}

function formatMember(member) {
  return {
    id: member._id,
    phone: member.phone,
    email: member.email || '',
    name: member.name || '',
    role: member.eventRole,
    department: member.departmentKey || 'none',
    status: normalizeMemberStatus(member.status),
    isOwner: member.isOwner,
    accessExpiresAt: member.accessExpiresAt,
    acceptedAt: member.acceptedAt,
    createdAt: member.createdAt,
  };
}

function getInviteUrl(inviteToken) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const acceptPath = `/manageEvent?invite=${inviteToken}`;
  return `${frontendUrl}/auth?redirect=${encodeURIComponent(acceptPath)}`;
}

function buildUserMatchConditions(user) {
  const conditions = [];
  const phone = normalizePhone(user.phone);
  const email = normalizeEmail(user.email);

  if (phone) conditions.push({ phone });
  if (email) conditions.push({ email });

  return conditions;
}

function userMatchesInvite(user, invite) {
  const phone = normalizePhone(user.phone);
  const email = normalizeEmail(user.email);

  if (phone && invite.phone === phone) return true;
  if (email && invite.email && invite.email === email) return true;
  return false;
}

async function sendInviteNotifications({ member, event, organizer }) {
  const inviteUrl = getInviteUrl(member.inviteToken);
  const results = { email: null, sms: null };

  if (member.email) {
    results.email = await emailService.sendEventTeamInviteEmail({
      to: member.email,
      phone: member.phone,
      event,
      eventId: event._id?.toString() || event.id,
      organizer,
      inviteToken: member.inviteToken,
      role: member.eventRole,
    });
  }

  if (member.phone) {
    results.sms = await smsService.sendEventTeamInvite(member.phone, {
      eventName: event.title,
      inviteUrl,
      role: member.eventRole,
    });
  }

  return results;
}

async function getOrganizerEvent(eventId, organizerId) {
  return Event.findOne({ _id: eventId, organizer: organizerId });
}

async function ensureOwnerMember(event, organizer) {
  const ownerPhone = normalizePhone(organizer.phone);
  const ownerEmail = normalizeEmail(organizer.email || organizer.contactInfo?.email);
  if (!ownerPhone && !ownerEmail) return null;

  const ownerQuery = {
    event: event._id,
    isOwner: true,
    $or: [
      ...(ownerPhone ? [{ phone: ownerPhone }] : []),
      ...(ownerEmail ? [{ email: ownerEmail }] : []),
    ],
  };

  let ownerMember = await EventTeamMember.findOne(ownerQuery);

  if (!ownerMember) {
    ownerMember = await EventTeamMember.create({
      event: event._id,
      phone: ownerPhone || '0000000000',
      email: ownerEmail,
      name: organizer.name || '',
      eventRole: 'Admin',
      departmentKey: '',
      status: 'accepted',
      isOwner: true,
      invitedBy: organizer._id,
      acceptedAt: new Date(),
    });
  } else {
    if (ownerMember.status === 'active') {
      ownerMember.status = 'accepted';
    }
    if (ownerPhone && ownerMember.phone !== ownerPhone) {
      ownerMember.phone = ownerPhone;
    }
    if (ownerEmail) ownerMember.email = ownerEmail;
    if (ownerMember.isModified()) {
      await ownerMember.save();
    }
  }

  return ownerMember;
}

exports.getEventTeam = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const organizer = await Organizer.findById(req.user.id);
    if (organizer) {
      await EventTeamMember.updateMany(
        { event: eventId, status: 'active' },
        { $set: { status: 'accepted' } }
      );
      await ensureOwnerMember(event, organizer);
      await ensureDefaultDepartments(eventId);
    }

    const members = await EventTeamMember.find({ event: eventId, status: { $ne: 'revoked' } })
      .sort({ isOwner: -1, createdAt: 1 })
      .lean();

    const accepted = members.filter((m) => isAcceptedStatus(m.status)).map(formatMember);
    const pending = members.filter((m) => m.status === 'pending').map(formatMember);

    return ApiResponse.success(res, 'Team fetched successfully', { members: accepted, pendingInvites: pending });
  } catch (error) {
    console.error('getEventTeam error:', error);
    return ApiResponse.serverError(res, 'Failed to fetch team', error);
  }
};

exports.inviteTeamMember = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.badRequest(res, 'Validation failed', errors.array());
  }

  try {
    const { eventId } = req.params;
    const { email, phone, department, accessExpiresAt } = req.body;
    const normalizedPhone = normalizePhone(phone);
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedPhone) {
      return ApiResponse.error(res, 'Valid 10-digit phone number is required', {}, 400);
    }

    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    await ensureDefaultDepartments(eventId);
    let departmentKey = '';
    try {
      departmentKey = await resolveDepartmentKey(eventId, department);
    } catch (deptError) {
      return ApiResponse.error(res, deptError.message || 'Invalid department selected', {}, deptError.statusCode || 400);
    }

    const organizer = await Organizer.findById(req.user.id);
    const ownerPhone = normalizePhone(organizer?.phone);
    const ownerEmail = normalizeEmail(organizer?.email || organizer?.contactInfo?.email);
    const ownerMember = await EventTeamMember.findOne({ event: eventId, isOwner: true }).select('phone email').lean();
    const ownerMemberPhone = normalizePhone(ownerMember?.phone);
    const ownerMemberEmail = normalizeEmail(ownerMember?.email);

    const matchesOwnerPhone =
      normalizedPhone &&
      (normalizedPhone === ownerPhone || (ownerMemberPhone && normalizedPhone === ownerMemberPhone));
    const matchesOwnerEmail =
      normalizedEmail &&
      (normalizedEmail === ownerEmail || (ownerMemberEmail && normalizedEmail === ownerMemberEmail));

    if (matchesOwnerPhone || matchesOwnerEmail) {
      return ApiResponse.error(
        res,
        'You cannot invite yourself. Use the team member\'s mobile number and email, not your own.',
        {},
        400
      );
    }

    const duplicateConditions = [{ phone: normalizedPhone }];
    if (normalizedEmail) duplicateConditions.push({ email: normalizedEmail });

    const existing = await EventTeamMember.findOne({
      event: eventId,
      isOwner: { $ne: true },
      $or: duplicateConditions,
    });

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const invitePayload = {
      status: 'pending',
      phone: normalizedPhone,
      email: normalizedEmail,
      eventRole: DEFAULT_TEAM_ROLE,
      departmentKey,
      accessExpiresAt: accessExpiresAt ? new Date(accessExpiresAt) : null,
      inviteToken,
      invitedBy: req.user.id,
      acceptedAt: null,
      user: null,
    };

    if (existing) {
      if (existing.status === 'accepted' || existing.status === 'active') {
        return ApiResponse.error(res, 'This person is already a team member', {}, 400);
      }

      const member = await EventTeamMember.findOneAndUpdate(
        { _id: existing._id },
        { $set: invitePayload },
        { new: true, runValidators: true }
      );

      const delivery = await sendInviteNotifications({ member, event, organizer });
      const message =
        existing.status === 'pending' ? 'Invitation resent successfully' : 'Invitation sent successfully';

      return ApiResponse.success(res, message, {
        invite: formatMember(member),
        delivery,
      });
    }

    const member = await EventTeamMember.create({
      event: eventId,
      ...invitePayload,
    });

    const delivery = await sendInviteNotifications({ member, event, organizer });

    return ApiResponse.success(
      res,
      'Invitation sent successfully',
      { invite: formatMember(member), delivery },
      201
    );
  } catch (error) {
    console.error('inviteTeamMember error:', error);
    return ApiResponse.serverError(res, 'Failed to send invitation', error);
  }
};

exports.removeTeamMember = async (req, res) => {
  try {
    const { eventId, memberId } = req.params;
    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const member = await EventTeamMember.findOne({ _id: memberId, event: eventId });
    if (!member) {
      return ApiResponse.notFound(res, 'Team member not found');
    }
    if (member.isOwner) {
      return ApiResponse.error(res, 'Cannot remove the event owner', {}, 400);
    }

    await EventTeamMember.updateOne(
      { _id: memberId, event: eventId },
      { $set: { status: 'revoked', inviteToken: null } }
    );

    return ApiResponse.success(res, 'Team member removed successfully');
  } catch (error) {
    console.error('removeTeamMember error:', error);
    return ApiResponse.serverError(res, 'Failed to remove team member', error);
  }
};

exports.updateTeamMemberDepartment = async (req, res) => {
  try {
    const { eventId, memberId } = req.params;
    const { department } = req.body;

    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    await ensureDefaultDepartments(eventId);

    const member = await EventTeamMember.findOne({
      _id: memberId,
      event: eventId,
      status: { $ne: 'revoked' },
    });

    if (!member) {
      return ApiResponse.notFound(res, 'Team member not found');
    }

    if (member.isOwner) {
      return ApiResponse.error(res, 'Cannot change the event owner department', {}, 400);
    }

    let departmentKey = '';
    try {
      departmentKey = await resolveDepartmentKey(eventId, department);
    } catch (deptError) {
      return ApiResponse.error(res, deptError.message || 'Invalid department selected', {}, deptError.statusCode || 400);
    }

    const previousKey = member.departmentKey || '';
    if (previousKey === departmentKey) {
      return ApiResponse.success(res, 'Department unchanged', {
        member: formatMember(member),
        emailSent: false,
      });
    }

    const previousDepartment = await getDepartmentDisplayName(eventId, previousKey);
    const newDepartment = await getDepartmentDisplayName(eventId, departmentKey);

    await EventTeamMember.updateOne(
      { _id: memberId, event: eventId },
      { $set: { departmentKey } }
    );

    member.departmentKey = departmentKey;

    const organizer = await Organizer.findById(req.user.id);
    let emailResult = { success: false, message: 'No email on file' };

    if (member.email) {
      emailResult = await emailService.sendTeamMemberDepartmentUpdateEmail({
        to: member.email,
        memberName: member.name,
        event,
        eventId: event._id.toString(),
        organizer,
        previousDepartment,
        newDepartment,
        status: member.status,
        inviteToken: member.inviteToken,
      });
    }

    return ApiResponse.success(res, 'Department updated successfully', {
      member: formatMember(member),
      emailSent: emailResult.success,
      emailMessage: emailResult.message || emailResult.error,
    });
  } catch (error) {
    console.error('updateTeamMemberDepartment error:', error);
    return ApiResponse.serverError(res, 'Failed to update department', error);
  }
};

async function formatInviteForClient(invite, user = null) {
  const eventId = invite.event?._id || invite.event;
  const departmentKey = invite.departmentKey || '';
  const departmentName = eventId
    ? await getDepartmentDisplayName(eventId, departmentKey)
    : 'No department';

  return {
    id: invite._id,
    phone: invite.phone,
    email: invite.email || '',
    department: departmentKey || 'none',
    departmentName,
    inviteToken: invite.inviteToken,
    accessExpiresAt: invite.accessExpiresAt,
    createdAt: invite.createdAt,
    userMatches: user ? userMatchesInvite(user, invite) : null,
    event: invite.event
      ? {
          id: invite.event._id,
          title: invite.event.title,
          startDate: invite.event.startDate,
          endDate: invite.event.endDate,
          location: invite.event.location,
          status: invite.event.status,
          banner: invite.event.banner,
        }
      : null,
    invitedBy: invite.invitedBy
      ? {
          name: invite.invitedBy.name,
          companyName: invite.invitedBy.companyName,
        }
      : null,
  };
}

exports.getInviteByToken = async (req, res) => {
  try {
    const invite = await EventTeamMember.findOne({
      inviteToken: req.params.token,
      status: 'pending',
    })
      .populate('event', 'title startDate endDate location status banner')
      .populate('invitedBy', 'name companyName');

    if (!invite) {
      return ApiResponse.notFound(res, 'Invitation not found or already accepted');
    }

    if (invite.accessExpiresAt && invite.accessExpiresAt <= new Date()) {
      return ApiResponse.error(res, 'This invitation has expired', {}, 400);
    }

    const formatted = await formatInviteForClient(invite, req.user);

    return ApiResponse.success(res, 'Invitation fetched successfully', { invite: formatted });
  } catch (error) {
    console.error('getInviteByToken error:', error);
    return ApiResponse.serverError(res, 'Failed to fetch invitation', error);
  }
};

exports.getMyInvites = async (req, res) => {
  try {
    const matchConditions = buildUserMatchConditions(req.user);
    if (matchConditions.length === 0) {
      return ApiResponse.error(res, 'Phone number is required to view invitations', {}, 400);
    }

    const now = new Date();
    const invites = await EventTeamMember.find({
      status: 'pending',
      $and: [
        { $or: matchConditions },
        { $or: [{ accessExpiresAt: null }, { accessExpiresAt: { $gt: now } }] },
      ],
    })
      .populate('event', 'title startDate endDate location status banner')
      .populate('invitedBy', 'name companyName')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = await Promise.all(invites.map((invite) => formatInviteForClient(invite, req.user)));

    return ApiResponse.success(res, 'Invites fetched successfully', { invites: formatted });
  } catch (error) {
    console.error('getMyInvites error:', error);
    return ApiResponse.serverError(res, 'Failed to fetch invites', error);
  }
};

exports.getMyEvents = async (req, res) => {
  try {
    const matchConditions = buildUserMatchConditions(req.user);
    if (matchConditions.length === 0) {
      return ApiResponse.success(res, 'No events found', { events: [] });
    }

    const memberships = await EventTeamMember.find({
      status: { $in: ['accepted', 'active'] },
      $and: [
        { $or: matchConditions },
        { $or: [{ accessExpiresAt: null }, { accessExpiresAt: { $gt: new Date() } }] },
      ],
    })
      .populate('event', 'title startDate endDate location status banner')
      .sort({ acceptedAt: -1 })
      .lean();

    const events = await Promise.all(
      memberships
        .filter((m) => m.event)
        .map(async (m) => ({
          membershipId: m._id,
          department: m.departmentKey || 'none',
          departmentName: await getDepartmentDisplayName(m.event._id, m.departmentKey || ''),
          isOwner: m.isOwner,
          acceptedAt: m.acceptedAt,
          event: {
            id: m.event._id,
            title: m.event.title,
            startDate: m.event.startDate,
            endDate: m.event.endDate,
            location: m.event.location,
            status: m.event.status,
            banner: m.event.banner,
          },
        }))
    );

    return ApiResponse.success(res, 'Events fetched successfully', { events });
  } catch (error) {
    console.error('getMyEvents error:', error);
    return ApiResponse.serverError(res, 'Failed to fetch events', error);
  }
};

async function acceptInviteRecord(invite, user) {
  if (!userMatchesInvite(user, invite)) {
    const err = new Error('This invitation was sent to a different phone number or email');
    err.statusCode = 403;
    throw err;
  }

  if (invite.accessExpiresAt && invite.accessExpiresAt <= new Date()) {
    const err = new Error('This invitation has expired');
    err.statusCode = 400;
    throw err;
  }

  invite.status = 'accepted';
  invite.user = user._id;
  invite.name = user.name || invite.name;
  invite.phone = normalizePhone(user.phone) || invite.phone;
  if (normalizeEmail(user.email)) {
    invite.email = normalizeEmail(user.email);
  }
  invite.acceptedAt = new Date();
  invite.lastLoginAt = new Date();
  invite.inviteToken = null;
  await invite.save();

  return invite;
}

exports.acceptInvite = async (req, res) => {
  try {
    const matchConditions = buildUserMatchConditions(req.user);
    if (matchConditions.length === 0) {
      return ApiResponse.error(res, 'Phone number is required to accept invites', {}, 400);
    }

    const invite = await EventTeamMember.findOne({
      _id: req.params.inviteId,
      $or: matchConditions,
      status: 'pending',
    }).populate('event', 'title');

    if (!invite) {
      return ApiResponse.notFound(res, 'Invitation not found');
    }

    await acceptInviteRecord(invite, req.user);

    return ApiResponse.success(res, 'Invitation accepted successfully', {
      eventId: invite.event?._id || invite.event,
      eventTitle: invite.event?.title || '',
    });
  } catch (error) {
    console.error('acceptInvite error:', error);
    return ApiResponse.error(res, error.message || 'Failed to accept invitation', {}, error.statusCode || 500);
  }
};

exports.acceptInviteByToken = async (req, res) => {
  try {
    const matchConditions = buildUserMatchConditions(req.user);
    if (matchConditions.length === 0) {
      return ApiResponse.error(res, 'Phone number is required to accept invites', {}, 400);
    }

    const invite = await EventTeamMember.findOne({
      inviteToken: req.params.token,
      status: 'pending',
    }).populate('event', 'title');

    if (!invite) {
      return ApiResponse.notFound(res, 'Invitation not found or already accepted');
    }

    await acceptInviteRecord(invite, req.user);

    return ApiResponse.success(res, 'Invitation accepted successfully', {
      eventId: invite.event?._id || invite.event,
      eventTitle: invite.event?.title || '',
    });
  } catch (error) {
    console.error('acceptInviteByToken error:', error);
    return ApiResponse.error(res, error.message || 'Failed to accept invitation', {}, error.statusCode || 500);
  }
};

exports.declineInvite = async (req, res) => {
  try {
    const matchConditions = buildUserMatchConditions(req.user);
    const invite = await EventTeamMember.findOne({
      _id: req.params.inviteId,
      $or: matchConditions,
      status: 'pending',
    });

    if (!invite) {
      return ApiResponse.notFound(res, 'Invitation not found');
    }

    await EventTeamMember.updateOne(
      { _id: invite._id },
      { $set: { status: 'revoked', inviteToken: null } }
    );

    return ApiResponse.success(res, 'Invitation declined');
  } catch (error) {
    console.error('declineInvite error:', error);
    return ApiResponse.serverError(res, 'Failed to decline invitation', error);
  }
};

exports.checkEventAccess = async (req, res) => {
  try {
    const matchConditions = buildUserMatchConditions(req.user);
    if (matchConditions.length === 0) {
      return ApiResponse.error(res, 'Phone number required', {}, 403);
    }

    const membership = await EventTeamMember.findOne({
      event: req.params.eventId,
      status: { $in: ['accepted', 'active'] },
      $and: [
        { $or: matchConditions },
        { $or: [{ accessExpiresAt: null }, { accessExpiresAt: { $gt: new Date() } }] },
      ],
    });

    if (!membership) {
      return ApiResponse.error(res, 'You do not have access to this event', {}, 403);
    }

    membership.lastLoginAt = new Date();
    await EventTeamMember.updateOne(
      { _id: membership._id },
      { $set: { lastLoginAt: membership.lastLoginAt } }
    );

    return ApiResponse.success(res, 'Access granted', {
      role: membership.eventRole,
      department: membership.departmentKey || 'none',
      isOwner: membership.isOwner,
    });
  } catch (error) {
    console.error('checkEventAccess error:', error);
    return ApiResponse.serverError(res, 'Failed to verify access', error);
  }
};

exports.getEventForMember = async (req, res) => {
  try {
    const matchConditions = buildUserMatchConditions(req.user);
    if (matchConditions.length === 0) {
      return ApiResponse.error(res, 'Phone number required', {}, 403);
    }

    const membership = await EventTeamMember.findOne({
      event: req.params.eventId,
      status: { $in: ['accepted', 'active'] },
      $and: [
        { $or: matchConditions },
        { $or: [{ accessExpiresAt: null }, { accessExpiresAt: { $gt: new Date() } }] },
      ],
    });

    if (!membership) {
      return ApiResponse.error(res, 'You do not have access to this event', {}, 403);
    }

    const event = await Event.findById(req.params.eventId)
      .select('title startDate endDate status location banner')
      .lean();

    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const departmentKey = membership.departmentKey || '';
    const departmentName = await getDepartmentDisplayName(req.params.eventId, departmentKey);
    const responsibilities = await getResponsibilitiesForMember(
      req.params.eventId,
      membership,
      departmentKey
    );
    const checklists = await getChecklistsForMember(
      req.params.eventId,
      membership,
      departmentKey
    );
    const tasks = await getTasksForMember(req.params.eventId, membership);

    const incidents = await getIncidentsForMember(
      req.params.eventId,
      membership,
      departmentKey
    );
    const files = await getFilesForMember(req.params.eventId, membership, departmentKey);
    const discordLinks = await getDiscordLinksForMember(
      req.params.eventId,
      membership,
      departmentKey
    );
    const departments = await EventDepartment.find({ event: req.params.eventId })
      .sort({ sortOrder: 1, name: 1 })
      .select('name')
      .lean();

    return ApiResponse.success(res, 'Event fetched successfully', {
      event,
      membership: {
        department: departmentKey || 'none',
        departmentName,
        isOwner: membership.isOwner,
      },
      responsibilities,
      checklists,
      tasks,
      incidents,
      files,
      discordLinks,
      departments: departments.map((d) => ({ id: d._id, name: d.name })),
    });
  } catch (error) {
    console.error('getEventForMember error:', error);
    return ApiResponse.serverError(res, 'Failed to fetch event', error);
  }
};

exports.updateChecklistItemForMember = async (req, res) => {
  try {
    const { eventId, checklistId, itemId } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['not_started', 'in_progress', 'completed', 'blocked'];
    if (!allowedStatuses.includes(status)) {
      return ApiResponse.error(res, 'Invalid status', {}, 400);
    }

    const membership = await findActiveMembership(eventId, req.user);
    if (!membership) {
      return ApiResponse.error(res, 'You do not have access to this event', {}, 403);
    }

    const departmentKey = membership.departmentKey || '';
    const visible = await isChecklistVisibleToMember(
      eventId,
      membership,
      departmentKey,
      checklistId
    );
    if (!visible) {
      return ApiResponse.notFound(res, 'Checklist not found');
    }

    const item = await EventChecklistItem.findOneAndUpdate(
      { _id: itemId, checklist: checklistId, event: eventId },
      { $set: { status } },
      { new: true }
    );

    if (!item) {
      return ApiResponse.notFound(res, 'Checklist item not found');
    }

    return ApiResponse.success(res, 'Checklist item updated successfully', {
      item: formatChecklistItem(item),
    });
  } catch (error) {
    console.error('updateChecklistItemForMember error:', error);
    return ApiResponse.serverError(res, 'Failed to update checklist item', error);
  }
};

exports.updateTaskForMember = async (req, res) => {
  try {
    const { eventId, taskId } = req.params;
    const { status, completionComment } = req.body;

    const allowedStatuses = ['not_started', 'in_progress', 'waiting', 'completed', 'cancelled'];
    if (status !== undefined && !allowedStatuses.includes(status)) {
      return ApiResponse.error(res, 'Invalid status', {}, 400);
    }

    const membership = await findActiveMembership(eventId, req.user);
    if (!membership) {
      return ApiResponse.error(res, 'You do not have access to this event', {}, 403);
    }

    const updates = {};
    if (status !== undefined) {
      updates.status = status;
      updates.completedAt = status === 'completed' ? new Date() : null;
    }
    if (completionComment !== undefined) {
      updates.completionComment = String(completionComment).trim();
    }

    const task = await EventTask.findOneAndUpdate(
      { _id: taskId, event: eventId, assignee: membership._id },
      { $set: updates },
      { new: true }
    )
      .populate('department', 'name key color')
      .populate('assignee', 'name phone email');

    if (!task) {
      return ApiResponse.notFound(res, 'Task not found');
    }

    return ApiResponse.success(res, 'Task updated successfully', { task: formatTask(task) });
  } catch (error) {
    console.error('updateTaskForMember error:', error);
    return ApiResponse.serverError(res, 'Failed to update task', error);
  }
};

exports.createIncidentForMember = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { title, description, location, category, priority, departmentId } = req.body;

    if (!title || !String(title).trim()) {
      return ApiResponse.error(res, 'Title is required', {}, 400);
    }

    const membership = await findActiveMembership(eventId, req.user);
    if (!membership) {
      return ApiResponse.error(res, 'You do not have access to this event', {}, 403);
    }

    const incident = await createIncidentRecord({
      eventId,
      body: { title, description, location, category, priority, departmentId },
      reporterMember: membership._id,
    });

    return ApiResponse.success(res, 'Incident reported successfully', { incident }, 201);
  } catch (error) {
    console.error('createIncidentForMember error:', error);
    return ApiResponse.error(
      res,
      error.message || 'Failed to report incident',
      {},
      error.statusCode || 500
    );
  }
};
