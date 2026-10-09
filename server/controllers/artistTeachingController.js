const mongoose = require('mongoose');
const TeachingClass = require('../models/TeachingClass');
const TeachingInquiry = require('../models/TeachingInquiry');
const TeachingBooking = require('../models/TeachingBooking');
const Artist = require('../models/Artist');
const ApiResponse = require('../utils/apiResponse');
const { validationResult } = require('express-validator');

exports.getClasses = async (req, res) => {
  try {
    const classes = await TeachingClass.find({ artistId: req.user.id })
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, 'Teaching classes fetched', { classes });
  } catch (error) {
    console.error('Get teaching classes error:', error);
    return ApiResponse.serverError(res, 'Failed to fetch teaching classes', error.message);
  }
};

exports.createClass = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.badRequest(res, 'Validation failed', errors.array());
    }

    const teachingClass = await TeachingClass.create({
      ...req.body,
      artistId: req.user.id,
      maxStudents: Math.max(1, Number(req.body.maxStudents) || 1),
    });

    return ApiResponse.success(res, 'Teaching class created', { class: teachingClass }, 201);
  } catch (error) {
    console.error('Create teaching class error:', error);
    return ApiResponse.serverError(res, 'Failed to create teaching class', error.message);
  }
};

exports.updateClass = async (req, res) => {
  try {
    const teachingClass = await TeachingClass.findOne({
      _id: req.params.classId,
      artistId: req.user.id,
    });

    if (!teachingClass) {
      return ApiResponse.notFound(res, 'Teaching class not found');
    }

    const allowed = [
      'title', 'description', 'subject', 'level', 'mode', 'pricing',
      'schedule', 'offlineLocation', 'onlineDetails', 'maxStudents', 'isActive',
    ];

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        teachingClass[field] = field === 'maxStudents'
          ? Math.max(1, Number(req.body.maxStudents) || 1)
          : req.body[field];
      }
    });

    await teachingClass.save();

    return ApiResponse.success(res, 'Teaching class updated', { class: teachingClass });
  } catch (error) {
    console.error('Update teaching class error:', error);
    return ApiResponse.serverError(res, 'Failed to update teaching class', error.message);
  }
};

exports.deleteClass = async (req, res) => {
  try {
    const result = await TeachingClass.findOneAndDelete({
      _id: req.params.classId,
      artistId: req.user.id,
    });

    if (!result) {
      return ApiResponse.notFound(res, 'Teaching class not found');
    }

    return ApiResponse.success(res, 'Teaching class deleted');
  } catch (error) {
    console.error('Delete teaching class error:', error);
    return ApiResponse.serverError(res, 'Failed to delete teaching class', error.message);
  }
};

exports.getInquiries = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { artistId: req.user.id };
    if (status) query.status = status;

    const inquiries = await TeachingInquiry.find(query)
      .populate('classId', 'title mode pricing')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, 'Teaching inquiries fetched', { inquiries });
  } catch (error) {
    console.error('Get teaching inquiries error:', error);
    return ApiResponse.serverError(res, 'Failed to fetch teaching inquiries', error.message);
  }
};

exports.createInquiry = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.badRequest(res, 'Validation failed', errors.array());
    }

    const inquiry = await TeachingInquiry.create({
      ...req.body,
      artistId: req.user.id,
    });

    return ApiResponse.success(res, 'Inquiry added', { inquiry }, 201);
  } catch (error) {
    console.error('Create teaching inquiry error:', error);
    return ApiResponse.serverError(res, 'Failed to add inquiry', error.message);
  }
};

exports.updateInquiry = async (req, res) => {
  try {
    const inquiry = await TeachingInquiry.findOne({
      _id: req.params.inquiryId,
      artistId: req.user.id,
    });

    if (!inquiry) {
      return ApiResponse.notFound(res, 'Inquiry not found');
    }

    const { status, notes, classId, preferredMode, preferredDate } = req.body;
    if (status !== undefined) inquiry.status = status;
    if (notes !== undefined) inquiry.notes = notes;
    if (classId !== undefined) inquiry.classId = classId || undefined;
    if (preferredMode !== undefined) inquiry.preferredMode = preferredMode;
    if (preferredDate !== undefined) inquiry.preferredDate = preferredDate;

    await inquiry.save();

    return ApiResponse.success(res, 'Inquiry updated', { inquiry });
  } catch (error) {
    console.error('Update teaching inquiry error:', error);
    return ApiResponse.serverError(res, 'Failed to update inquiry', error.message);
  }
};

exports.deleteInquiry = async (req, res) => {
  try {
    const result = await TeachingInquiry.findOneAndDelete({
      _id: req.params.inquiryId,
      artistId: req.user.id,
    });

    if (!result) {
      return ApiResponse.notFound(res, 'Inquiry not found');
    }

    return ApiResponse.success(res, 'Inquiry deleted');
  } catch (error) {
    console.error('Delete teaching inquiry error:', error);
    return ApiResponse.serverError(res, 'Failed to delete inquiry', error.message);
  }
};

exports.getTeachingOverview = async (req, res) => {
  try {
    const artistId = req.user.id;
    const [classes, totalBookings, confirmedBookings, completedBookings] = await Promise.all([
      TeachingClass.countDocuments({ artistId, isActive: true }),
      TeachingBooking.countDocuments({ artistId }),
      TeachingBooking.countDocuments({ artistId, status: { $in: ['confirmed', 'completed'] } }),
      TeachingBooking.countDocuments({ artistId, status: 'completed' }),
    ]);

    return ApiResponse.success(res, 'Teaching overview fetched', {
      activeClasses: classes,
      totalBookings,
      confirmedBookings,
      completedBookings,
    });
  } catch (error) {
    console.error('Teaching overview error:', error);
    return ApiResponse.serverError(res, 'Failed to fetch teaching overview', error.message);
  }
};

exports.submitPublicInquiry = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.badRequest(res, 'Validation failed', errors.array());
    }

    const { artistId } = req.params;
    const artist = await Artist.findOne({ _id: artistId, approvalStatus: 'approved' });

    if (!artist) {
      return ApiResponse.notFound(res, 'Artist not found');
    }

    if (req.body.classId) {
      const teachingClass = await TeachingClass.findOne({
        _id: req.body.classId,
        artistId,
        isActive: true,
      });
      if (!teachingClass) {
        return ApiResponse.notFound(res, 'Class not found');
      }
    }

    const inquiry = await TeachingInquiry.create({
      artistId,
      classId: req.body.classId,
      studentName: req.body.studentName,
      studentEmail: req.body.studentEmail,
      studentPhone: req.body.studentPhone,
      message: req.body.message,
      preferredMode: req.body.preferredMode,
      preferredDate: req.body.preferredDate,
      status: 'new',
    });

    return ApiResponse.success(res, 'Inquiry submitted successfully', { inquiry }, 201);
  } catch (error) {
    console.error('Public teaching inquiry error:', error);
    return ApiResponse.serverError(res, 'Failed to submit inquiry', error.message);
  }
};

exports.getPublicClasses = async (req, res) => {
  try {
    const { artistId } = req.params;
    const classes = await TeachingClass.find({ artistId, isActive: true })
      .select('-onlineDetails.meetingLink')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, 'Public teaching classes fetched', { classes });
  } catch (error) {
    console.error('Public teaching classes error:', error);
    return ApiResponse.serverError(res, 'Failed to fetch classes', error.message);
  }
};
