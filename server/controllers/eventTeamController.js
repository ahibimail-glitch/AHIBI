const crypto = require('crypto');
const { validationResult } = require('express-validator');
const Event = require('../models/Event');
const Organizer = require('../models/Organizer');
const EventTeamMember = require('../models/EventTeamMember');
const ApiResponse = require('../utils/apiResponse');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');

const ROLE_LABELS = {
  'team-member': 'Team Member',
  admin: 'Admin',
  viewer: 'Viewer',
};

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
    const { email, phone, role, department, accessExpiresAt } = req.body;
    const normalizedPhone = normalizePhone(phone);
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedPhone) {
      return ApiResponse.error(res, 'Valid 10-digit phone number is required', {}, 400);
    }

    const event = await getOrganizerEvent(eventId, req.user.id);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
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
      eventRole: ROLE_LABELS[role] || role || 'Team Member',
      departmentKey: department && department !== 'none' ? department : '',
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

    const formatted = invites.map((invite) => ({
      id: invite._id,
      phone: invite.phone,
      email: invite.email,
      role: invite.eventRole,
      department: invite.departmentKey || 'none',
      inviteToken: invite.inviteToken,
      accessExpiresAt: invite.accessExpiresAt,
      createdAt: invite.createdAt,
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
    }));

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

    const events = memberships
      .filter((m) => m.event)
      .map((m) => ({
        membershipId: m._id,
        role: m.eventRole,
        department: m.departmentKey || 'none',
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
      }));

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

    return ApiResponse.success(res, 'Event fetched successfully', {
      event,
      membership: {
        role: membership.eventRole,
        department: membership.departmentKey || 'none',
        isOwner: membership.isOwner,
      },
    });
  } catch (error) {
    console.error('getEventForMember error:', error);
    return ApiResponse.serverError(res, 'Failed to fetch event', error);
  }
};
