const SupportConversation = require('../models/SupportConversation');
const User = require('../models/User');
const Admin = require('../models/Admin');
const ApiResponse = require('../utils/apiResponse');
const { validationResult } = require('express-validator');

const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

function normalizeAttachments(rawAttachments) {
  if (!Array.isArray(rawAttachments)) return [];

  return rawAttachments
    .filter(
      (item) =>
        item &&
        typeof item.url === 'string' &&
        item.url.trim() &&
        typeof item.filename === 'string' &&
        item.filename.trim() &&
        typeof item.contentType === 'string' &&
        ALLOWED_ATTACHMENT_TYPES.includes(item.contentType)
    )
    .map((item) => ({
      url: item.url.trim(),
      filename: item.filename.trim(),
      contentType: item.contentType,
    }));
}

function validateMessagePayload(message, attachments) {
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';
  const normalizedAttachments = normalizeAttachments(attachments);

  if (!trimmedMessage && normalizedAttachments.length === 0) {
    return { error: 'Message or attachment is required' };
  }

  return { message: trimmedMessage, attachments: normalizedAttachments };
}

/**
 * @desc    Get or create user's support conversation
 * @route   GET /api/support/chat
 * @access  Private
 */
exports.getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { new: isNewConversation } = req.query;
    
    // If requesting a new conversation, create one regardless of existing conversations
    if (isNewConversation === 'true') {
      const user = await User.findById(userId).select('name email phone');
      
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }
      
      const conversation = new SupportConversation({
        user: userId,
        userName: user.name || 'User',
        userEmail: user.email,
        userPhone: user.phone,
        category: 'general',
        status: 'active',
        messages: []
      });
      
      await conversation.save();
      
      return ApiResponse.success(res, 'New conversation created successfully', { conversation });
    }
    
    // Find existing active conversation
    let conversation = await SupportConversation.findOne({ user: userId, status: 'active' })
      .populate('assignedTo', 'name email')
      .populate('messages.sender', 'name role profilePic');
    
    // If no active conversation, return the most recent one (including resolved) so history is preserved
    if (!conversation) {
      conversation = await SupportConversation.findOne({ user: userId })
        .sort({ updatedAt: -1 })
        .populate('assignedTo', 'name email')
        .populate('messages.sender', 'name role profilePic');
    }
    
    // Only create a new conversation if the user has never had one
    if (!conversation) {
      const user = await User.findById(userId).select('name email phone');
      
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }
      
      conversation = new SupportConversation({
        user: userId,
        userName: user.name || 'User',
        userEmail: user.email,
        userPhone: user.phone,
        category: 'general',
        status: 'active',
        messages: []
      });
      
      await conversation.save();
    }
    
    return ApiResponse.success(res, 'Conversation retrieved successfully', { conversation });
  } catch (error) {
    console.error('Get or create conversation error:', error);
    return ApiResponse.serverError(res, 'Error retrieving conversation', error);
  }
};

/**
 * @desc    Send message in support conversation
 * @route   POST /api/support/chat/message
 * @access  Private
 */
exports.sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, 'Validation error', errors.array());
    }

    const payload = validateMessagePayload(req.body.message, req.body.attachments);
    if (payload.error) {
      return ApiResponse.error(res, payload.error);
    }

    const { message, attachments } = payload;
    const userId = req.user.id;
    
    // Get user details
    const user = await User.findById(userId).select('name email phone role');
    
    if (!user) {
      return ApiResponse.notFound(res, 'User not found');
    }
    
    // Find active conversation or most recent one
    let conversation = await SupportConversation.findOne({ user: userId, status: 'active' });
    if (!conversation) {
      conversation = await SupportConversation.findOne({ user: userId }).sort({ updatedAt: -1 });
    }
    
    if (!conversation) {
      conversation = new SupportConversation({
        user: userId,
        userName: user.name || 'User',
        userEmail: user.email,
        userPhone: user.phone,
        category: 'general',
        status: 'active',
        messages: []
      });
    }
    
    // If conversation was resolved, reactivate it
    if (conversation.status === 'resolved') {
      conversation.status = 'active';
      conversation.resolvedAt = undefined;
      conversation.resolvedBy = undefined;
    }
    
    // Add message
    conversation.messages.push({
      sender: userId,
      senderName: user.name || 'User',
      senderRole: 'user',
      message,
      attachments,
    });
    
    // Auto-assign to first available admin if not assigned
    if (!conversation.assignedTo) {
      const admin = await Admin.findById(conversation.assignedTo) || await Admin.findOne();
      if (admin) {
        conversation.assignedTo = admin._id;
        conversation.assignedToName = admin.username;
      }
    }
    
    await conversation.save();
    
    // Populate for response
    await conversation.populate('assignedTo', 'name email');
    await conversation.populate('messages.sender', 'name role profilePic');
    
    return ApiResponse.success(res, 'Message sent successfully', { conversation });
  } catch (error) {
    console.error('Send message error:', error);
    return ApiResponse.serverError(res, 'Error sending message', error);
  }
};

/**
 * @desc    Get all conversations (admin only)
 * @route   GET /api/support/chat/admin/conversations
 * @access  Private (Admin only)
 */
exports.getAllConversations = async (req, res) => {
  try {
    const { status = 'active', search, limit = 20, page = 1 } = req.query;
    
    // Build filter
    const filter = {};
    if (status && ['active', 'resolved'].includes(status)) {
      filter.status = status;
    }
    
    // Add search if provided
    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
        { userPhone: { $regex: search, $options: 'i' } },
        { 'messages.message': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    
    // Get conversations
    const conversations = await SupportConversation.find(filter)
      .select('-messages')
      .populate('user', 'name email phone')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));
    
    // Populate assignedTo from Admin model
    for (let conv of conversations) {
      if (conv.assignedTo) {
        const admin = await Admin.findById(conv.assignedTo).select('username');
        if (admin) {
          conv.assignedToName = admin.username;
        }
      }
    }
    
    // Get total count
    const total = await SupportConversation.countDocuments(filter);
    
    return ApiResponse.success(res, 'Conversations retrieved successfully', {
      conversations,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('Get all conversations error:', error);
    return ApiResponse.serverError(res, 'Error retrieving conversations', error);
  }
};

/**
 * @desc    Get conversation by ID (admin only)
 * @route   GET /api/support/chat/admin/:id
 * @access  Private (Admin only)
 */
exports.getConversationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const conversation = await SupportConversation.findById(id)
      .populate('user', 'name email phone')
      .populate('messages.sender', 'name role profilePic');
    
    if (!conversation) {
      return ApiResponse.notFound(res, 'Conversation not found');
    }
    
    // Populate assignedTo from Admin model
    if (conversation.assignedTo) {
      const admin = await Admin.findById(conversation.assignedTo).select('username');
      if (admin) {
        conversation.assignedToName = admin.username;
      }
    }
    
    return ApiResponse.success(res, 'Conversation retrieved successfully', { conversation });
  } catch (error) {
    console.error('Get conversation error:', error);
    return ApiResponse.serverError(res, 'Error retrieving conversation', error);
  }
};

/**
 * @desc    Send admin reply to conversation
 * @route   POST /api/support/chat/admin/:id/reply
 * @access  Private (Admin only)
 */
exports.sendAdminReply = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, 'Validation error', errors.array());
    }

    const { id } = req.params;
    const payload = validateMessagePayload(req.body.message, req.body.attachments);
    if (payload.error) {
      return ApiResponse.error(res, payload.error);
    }

    const { message, attachments } = payload;
    const adminId = req.user.id;
    
    // Get admin details from Admin model
    const admin = await Admin.findById(adminId).select('username');
    
    if (!admin) {
      return ApiResponse.notFound(res, 'Admin user not found');
    }
    
    // Find conversation
    const conversation = await SupportConversation.findById(id);
    
    if (!conversation) {
      return ApiResponse.notFound(res, 'Conversation not found');
    }
    
    // Add admin message
    conversation.messages.push({
      sender: adminId,
      senderName: admin.username || 'Admin',
      senderRole: 'admin',
      message,
      attachments,
    });
    
    // Assign to this admin if not assigned
    if (!conversation.assignedTo) {
      conversation.assignedTo = adminId;
      conversation.assignedToName = admin.username;
    }
    
    // Mark as active if it was resolved
    if (conversation.status === 'resolved') {
      conversation.status = 'active';
      conversation.resolvedAt = undefined;
      conversation.resolvedBy = undefined;
    }
    
    await conversation.save();
    
    // Populate for response
    await conversation.populate('assignedTo', 'name email');
    await conversation.populate('messages.sender', 'name role profilePic');
    
    return ApiResponse.success(res, 'Reply sent successfully', { conversation });
  } catch (error) {
    console.error('Send admin reply error:', error);
    return ApiResponse.serverError(res, 'Error sending reply', error);
  }
};

/**
 * @desc    Update conversation status
 * @route   PUT /api/support/chat/admin/:id/status
 * @access  Private (Admin only)
 */
exports.updateConversationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['active', 'resolved'].includes(status)) {
      return ApiResponse.error(res, 'Invalid status value');
    }
    
    const conversation = await SupportConversation.findById(id);
    
    if (!conversation) {
      return ApiResponse.notFound(res, 'Conversation not found');
    }
    
    conversation.status = status;
    
    if (status === 'resolved') {
      conversation.resolvedAt = Date.now();
      conversation.resolvedBy = req.user.id;
    } else if (status === 'active') {
      conversation.resolvedAt = undefined;
      conversation.resolvedBy = undefined;
    }
    
    await conversation.save();
    
    return ApiResponse.success(res, `Conversation marked as ${status}`, { conversation });
  } catch (error) {
    console.error('Update status error:', error);
    return ApiResponse.serverError(res, 'Error updating conversation status', error);
  }
};

/**
 * @desc    Assign conversation to admin
 * @route   PUT /api/support/chat/admin/:id/assign
 * @access  Private (Admin only)
 */
exports.assignConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;
    
    const conversation = await SupportConversation.findById(id);
    
    if (!conversation) {
      return ApiResponse.notFound(res, 'Conversation not found');
    }
    
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return ApiResponse.notFound(res, 'Admin user not found');
    }
    
    conversation.assignedTo = adminId;
    conversation.assignedToName = admin.username;
    
    await conversation.save();
    
    return ApiResponse.success(res, 'Conversation assigned successfully', { conversation });
  } catch (error) {
    console.error('Assign conversation error:', error);
    return ApiResponse.serverError(res, 'Error assigning conversation', error);
  }
};

/**
 * @desc    Get conversation statistics (admin only)
 * @route   GET /api/support/chat/admin/stats
 * @access  Private (Admin only)
 */
exports.getStats = async (req, res) => {
  try {
    const totalConversations = await SupportConversation.countDocuments();
    const activeConversations = await SupportConversation.countDocuments({ status: 'active' });
    const resolvedConversations = await SupportConversation.countDocuments({ status: 'resolved' });
    const unassignedConversations = await SupportConversation.countDocuments({ assignedTo: null, status: 'active' });
    
    return ApiResponse.success(res, 'Statistics retrieved successfully', {
      stats: {
        total: totalConversations,
        active: activeConversations,
        resolved: resolvedConversations,
        unassigned: unassignedConversations
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return ApiResponse.serverError(res, 'Error retrieving statistics', error);
  }
};
