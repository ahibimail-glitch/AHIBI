const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const notificationController = require('../controllers/notificationController');
const { validationResult } = require('express-validator');

/**
 * @desc    Create a new support ticket
 * @route   POST /api/support/tickets
 * @access  Private
 */
exports.createTicket = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, 'Validation error', errors.array());
    }

    const { subject, message, category, priority, relatedTo } = req.body;
    
    // Create ticket
    const ticket = new SupportTicket({
      user: req.user.id,
      subject,
      category: category || 'general',
      priority: priority || 'medium',
      relatedTo
    });
    
    // Add first message
    ticket.messages.push({
      sender: req.user.id,
      message,
      isStaff: req.user.role === 'admin'
    });
    
    await ticket.save();
    
    // Notify admin about new ticket
    // Find an admin to notify
    const admin = await User.findOne({ role: 'admin' });
    if (admin) {
      await notificationController.sendNotification({
        userId: admin._id,
        title: 'New Support Ticket',
        message: `A new support ticket has been created: ${subject}`,
        type: 'info',
        category: 'support',
        data: { ticketId: ticket._id },
        redirectUrl: `/admin/support/${ticket._id}`,
        sendEmail: true
      });
    }
    
    return ApiResponse.success(res, 'Support ticket created successfully', { ticket }, 201);
  } catch (error) {
    console.error('Create support ticket error:', error);
    return ApiResponse.serverError(res, 'Error creating support ticket', error);
  }
};

/**
 * @desc    Get all tickets for a user
 * @route   GET /api/support/tickets
 * @access  Private
 */
exports.getUserTickets = async (req, res) => {
  try {
    const { status, limit = 10, page = 1 } = req.query;
    
    // Build filter
    const filter = { user: req.user.id };
    if (status && ['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
      filter.status = status;
    }
    
    // Calculate pagination
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    
    // Get tickets
    const tickets = await SupportTicket.find(filter)
      .select('-messages')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));
    
    // Get total count
    const total = await SupportTicket.countDocuments(filter);
    
    return ApiResponse.success(res, 'Support tickets retrieved successfully', {
      tickets,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('Get user tickets error:', error);
    return ApiResponse.serverError(res, 'Error retrieving support tickets', error);
  }
};

/**
 * @desc    Get a ticket by ID
 * @route   GET /api/support/tickets/:id
 * @access  Private
 */
exports.getTicket = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find ticket
    const ticket = await SupportTicket.findById(id)
      .populate('user', 'name email phone')
      .populate('assignedTo', 'name email')
      .populate('messages.sender', 'name role profilePic');
    
    // Check if ticket exists
    if (!ticket) {
      return ApiResponse.notFound(res, 'Support ticket not found');
    }
    
    // Check if user has access to this ticket
    if (
      ticket.user._id.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return ApiResponse.forbidden(res, 'You do not have permission to access this ticket');
    }
    
    return ApiResponse.success(res, 'Support ticket retrieved successfully', { ticket });
  } catch (error) {
    console.error('Get ticket error:', error);
    return ApiResponse.serverError(res, 'Error retrieving support ticket', error);
  }
};

/**
 * @desc    Reply to a ticket
 * @route   POST /api/support/tickets/:id/reply
 * @access  Private
 */
exports.replyToTicket = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, 'Validation error', errors.array());
    }

    const { id } = req.params;
    const { message } = req.body;
    
    // Find ticket
    const ticket = await SupportTicket.findById(id);
    
    // Check if ticket exists
    if (!ticket) {
      return ApiResponse.notFound(res, 'Support ticket not found');
    }
    
    // Check if user has access to this ticket
    if (
      ticket.user.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return ApiResponse.forbidden(res, 'You do not have permission to reply to this ticket');
    }
    
    // Check if ticket is open or in-progress
    if (!['open', 'in-progress'].includes(ticket.status)) {
      return ApiResponse.error(res, 'Cannot reply to a resolved or closed ticket');
    }
    
    // Add reply
    ticket.messages.push({
      sender: req.user.id,
      message,
      isStaff: req.user.role === 'admin'
    });
    
    // Update status to in-progress if it was open and admin replied
    if (ticket.status === 'open' && req.user.role === 'admin') {
      ticket.status = 'in-progress';
      ticket.assignedTo = req.user.id;
    }
    
    await ticket.save();
    
    // Send notification to the other party
    const recipientId = req.user.role === 'admin' ? ticket.user : ticket.assignedTo || (await User.findOne({ role: 'admin' }))._id;
    
    if (recipientId) {
      await notificationController.sendNotification({
        userId: recipientId,
        title: 'New Reply to Your Support Ticket',
        message: `There is a new reply to your support ticket: ${ticket.subject}`,
        type: 'info',
        category: 'support',
        data: { ticketId: ticket._id },
        redirectUrl: `/support/${ticket._id}`,
        sendEmail: true
      });
    }
    
    return ApiResponse.success(res, 'Reply added successfully', { ticket });
  } catch (error) {
    console.error('Reply to ticket error:', error);
    return ApiResponse.serverError(res, 'Error replying to support ticket', error);
  }
};

/**
 * @desc    Update ticket status
 * @route   PUT /api/support/tickets/:id/status
 * @access  Private (Admin only)
 */
exports.updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    if (!['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
      return ApiResponse.error(res, 'Invalid status value', { validStatus: ['open', 'in-progress', 'resolved', 'closed'] });
    }
    
    // Find ticket
    const ticket = await SupportTicket.findById(id);
    
    // Check if ticket exists
    if (!ticket) {
      return ApiResponse.notFound(res, 'Support ticket not found');
    }
    
    // Only admin can change status (or user can close their own ticket)
    if (
      req.user.role !== 'admin' &&
      (ticket.user.toString() !== req.user.id || status !== 'closed')
    ) {
      return ApiResponse.forbidden(res, 'You do not have permission to update this ticket');
    }
    
    // Update status
    ticket.status = status;
    
    // Set additional fields based on status
    if (status === 'in-progress' && !ticket.assignedTo) {
      ticket.assignedTo = req.user.id;
    } else if (status === 'resolved') {
      ticket.resolvedAt = Date.now();
      ticket.resolvedBy = req.user.id;
    }
    
    await ticket.save();
    
    // Notify user about status change if admin made the change
    if (req.user.role === 'admin' && ticket.user.toString() !== req.user.id) {
      await notificationController.sendNotification({
        userId: ticket.user,
        title: 'Support Ticket Status Updated',
        message: `Your support ticket "${ticket.subject}" has been ${status === 'resolved' ? 'resolved' : status === 'closed' ? 'closed' : 'updated to ' + status}`,
        type: 'info',
        category: 'support',
        data: { ticketId: ticket._id },
        redirectUrl: `/support/${ticket._id}`,
        sendEmail: true
      });
    }
    
    return ApiResponse.success(res, `Ticket status updated to ${status}`, { ticket });
  } catch (error) {
    console.error('Update ticket status error:', error);
    return ApiResponse.serverError(res, 'Error updating ticket status', error);
  }
};

/**
 * @desc    Assign ticket to an admin (admin only)
 * @route   PUT /api/support/tickets/:id/assign
 * @access  Private (Admin only)
 */
exports.assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;
    
    // Find ticket
    const ticket = await SupportTicket.findById(id);
    
    // Check if ticket exists
    if (!ticket) {
      return ApiResponse.notFound(res, 'Support ticket not found');
    }
    
    // Check if admin exists
    const admin = await User.findOne({ _id: adminId, role: 'admin' });
    if (!admin) {
      return ApiResponse.notFound(res, 'Admin user not found');
    }
    
    // Update assignment
    ticket.assignedTo = adminId;
    if (ticket.status === 'open') {
      ticket.status = 'in-progress';
    }
    
    await ticket.save();
    
    // Notify the assigned admin
    await notificationController.sendNotification({
      userId: adminId,
      title: 'Support Ticket Assigned',
      message: `A support ticket "${ticket.subject}" has been assigned to you`,
      type: 'info',
      category: 'support',
      data: { ticketId: ticket._id },
      redirectUrl: `/admin/support/${ticket._id}`,
      sendEmail: true
    });
    
    return ApiResponse.success(res, 'Ticket assigned successfully', { ticket });
  } catch (error) {
    console.error('Assign ticket error:', error);
    return ApiResponse.serverError(res, 'Error assigning ticket', error);
  }
};

/**
 * @desc    Get all tickets (admin only)
 * @route   GET /api/admin/support/tickets
 * @access  Private (Admin only)
 */
exports.getAllTickets = async (req, res) => {
  try {
    const { status, category, priority, limit = 10, page = 1, search } = req.query;
    
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    
    // Add search if provided
    if (search) {
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { ticketId: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    
    // Get tickets
    const tickets = await SupportTicket.find(filter)
      .select('-messages')
      .populate('user', 'name email phone')
      .populate('assignedTo', 'name email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));
    
    // Get total count
    const total = await SupportTicket.countDocuments(filter);
    
    return ApiResponse.success(res, 'Support tickets retrieved successfully', {
      tickets,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('Get all tickets error:', error);
    return ApiResponse.serverError(res, 'Error retrieving support tickets', error);
  }
};
