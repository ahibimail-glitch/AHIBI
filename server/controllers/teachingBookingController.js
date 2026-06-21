const crypto = require('crypto');
const Razorpay = require('razorpay');
const TeachingBooking = require('../models/TeachingBooking');
const TeachingClass = require('../models/TeachingClass');
const Artist = require('../models/Artist');
const ApiResponse = require('../utils/apiResponse');
const { validationResult } = require('express-validator');
const teachingBookingInvoiceService = require('../services/teachingBookingInvoiceService');
const {
  checkTeachingSlotAvailable,
  markTeachingSlotBooked,
  getMonthlySchedule,
  getBusySlotsForDate,
  normalizeDateOnly,
  timeToMinutes,
  toDateKey,
} = require('../utils/artistScheduleUtils');

let razorpayInstance;
const getRazorpay = () => {
  if (razorpayInstance) return razorpayInstance;
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials are not configured');
  }
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  return razorpayInstance;
};

async function generateAndAttachInvoice(bookingId) {
  let booking = await TeachingBooking.findById(bookingId)
    .populate('classId', 'title subject mode pricing')
    .populate('artistId', 'name email phone city');

  if (!booking || !['confirmed', 'completed'].includes(booking.status)) {
    return null;
  }

  if (!booking.invoiceNumber) {
    await booking.save();
    booking = await TeachingBooking.findById(bookingId)
      .populate('classId', 'title subject mode pricing')
      .populate('artistId', 'name email phone city');
  }

  if (!booking.invoicePdf) {
    const invoiceData = await teachingBookingInvoiceService.generateInvoice(booking);
    booking.invoicePdf = invoiceData.buffer;
    booking.invoicePdfContentType = invoiceData.contentType || 'application/pdf';
    booking.invoiceGeneratedAt = new Date();
    booking.invoiceUrl = `/api/artist/public/teaching/invoice/${booking.invoiceNumber}`;
    await booking.save();
  }

  return booking;
}

exports.getPublicTeachingCalendar = async (req, res) => {
  try {
    const { artistId } = req.params;
    const { month, year, classId } = req.query;

    if (!classId) {
      return ApiResponse.badRequest(res, 'classId is required');
    }

    const artist = await Artist.findOne({ _id: artistId, approvalStatus: 'approved' });
    if (!artist) {
      return ApiResponse.notFound(res, 'Artist not found');
    }

    const currentMonth = Number(month) || new Date().getMonth() + 1;
    const currentYear = Number(year) || new Date().getFullYear();
    const result = await getMonthlySchedule(artistId, currentMonth, currentYear, classId);

    if (result.error) {
      return ApiResponse.notFound(res, result.error);
    }

    return ApiResponse.success(res, 'Teaching calendar fetched', {
      month: currentMonth,
      year: currentYear,
      class: {
        _id: result.teachingClass._id,
        title: result.teachingClass.title,
        mode: result.teachingClass.mode,
        maxStudents: result.teachingClass.maxStudents,
        pricing: result.teachingClass.pricing,
        schedule: result.teachingClass.schedule,
      },
      calendarData: result.calendarData,
    });
  } catch (error) {
    console.error('Public teaching calendar error:', error);
    return ApiResponse.serverError(res, 'Failed to fetch teaching calendar', error.message);
  }
};

exports.getPublicDaySlots = async (req, res) => {
  try {
    const { artistId } = req.params;
    const { date, classId } = req.query;

    if (!date || !classId) {
      return ApiResponse.badRequest(res, 'date and classId are required');
    }

    const artist = await Artist.findOne({ _id: artistId, approvalStatus: 'approved' });
    if (!artist) {
      return ApiResponse.notFound(res, 'Artist not found');
    }

    const teachingClass = await TeachingClass.findOne({ _id: classId, artistId, isActive: true });
    if (!teachingClass) {
      return ApiResponse.notFound(res, 'Class not found');
    }

    const { getBusySlotsForDate, getActiveTeachingBookingsForDate, generateTeachingSlotsForClass, evaluateTeachingClassSlot } = require('../utils/artistScheduleUtils');

    const [busySlots, teachingBookings] = await Promise.all([
      getBusySlotsForDate(artistId, date),
      getActiveTeachingBookingsForDate(artistId, date),
    ]);
    const candidateSlots = generateTeachingSlotsForClass(teachingClass, date);
    const capacity = Math.max(1, teachingClass.maxStudents || 1);
    const availableSlots = candidateSlots
      .map((slot) => {
        const slotCheck = evaluateTeachingClassSlot(
          busySlots,
          teachingBookings,
          teachingClass._id,
          slot.startTime,
          slot.endTime,
          capacity
        );
        if (!slotCheck.available) return null;
        return {
          ...slot,
          price: teachingClass.pricing?.amount || 0,
          maxStudents: capacity,
          bookedCount: slotCheck.bookedCount,
          spotsLeft: slotCheck.spotsLeft,
        };
      })
      .filter(Boolean);

    return ApiResponse.success(res, 'Day slots fetched', {
      date,
      availableSlots,
      bookedSlots: busySlots,
      isAvailable: availableSlots.length > 0,
    });
  } catch (error) {
    console.error('Public day slots error:', error);
    return ApiResponse.serverError(res, 'Failed to fetch day slots', error.message);
  }
};

exports.createTeachingOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.badRequest(res, 'Validation failed', errors.array());
    }

    const { artistId } = req.params;
    const {
      classId,
      bookingDate,
      startTime,
      endTime,
      mode,
      studentName,
      studentEmail,
      studentPhone,
      message,
    } = req.body;

    const artist = await Artist.findOne({ _id: artistId, approvalStatus: 'approved' });
    if (!artist) {
      return ApiResponse.notFound(res, 'Artist not found');
    }

    const teachingClass = await TeachingClass.findOne({ _id: classId, artistId, isActive: true });
    if (!teachingClass) {
      return ApiResponse.notFound(res, 'Class not found');
    }

    const amount = teachingClass.pricing?.amount || 0;
    if (amount <= 0) {
      return ApiResponse.badRequest(res, 'This class does not have a bookable price configured');
    }

    const bookingDateOnly = normalizeDateOnly(bookingDate);
    const todayOnly = normalizeDateOnly(new Date());
    if (bookingDateOnly < todayOnly) {
      return ApiResponse.badRequest(res, 'Cannot book a past date');
    }

    if (!startTime || !endTime || timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      return ApiResponse.badRequest(res, 'Invalid time slot');
    }

    const allowedModes = teachingClass.mode === 'both'
      ? ['online', 'offline']
      : [teachingClass.mode];
    if (!allowedModes.includes(mode)) {
      return ApiResponse.badRequest(res, `This class only supports ${allowedModes.join(' or ')} mode`);
    }

    const availabilityCheck = await checkTeachingSlotAvailable(
      artistId,
      bookingDate,
      startTime,
      endTime,
      { classId, maxStudents: teachingClass.maxStudents }
    );
    if (!availabilityCheck.available) {
      return ApiResponse.badRequest(res, availabilityCheck.reason || 'Artist is not available at this time');
    }

    const durationMinutes = timeToMinutes(endTime) - timeToMinutes(startTime);
    const pendingBooking = await TeachingBooking.create({
      artistId,
      classId,
      userId: req.user?.id,
      studentName,
      studentEmail,
      studentPhone,
      message,
      mode,
      bookingDate: bookingDateOnly,
      startTime,
      endTime,
      durationMinutes,
      pricing: { amount, currency: teachingClass.pricing?.currency || 'INR' },
      status: 'pending_payment',
    });

    const receipt = `TCH_${Date.now()}_${pendingBooking._id.toString().slice(-6)}`;
    const razorpay = getRazorpay();
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt,
      notes: {
        type: 'teaching_booking',
        bookingId: pendingBooking._id.toString(),
        artistId: artistId.toString(),
        classId: classId.toString(),
        bookingDate,
        startTime,
        endTime,
        amount: String(amount),
      },
    });

    pendingBooking.payment.razorpayOrderId = razorpayOrder.id;
    await pendingBooking.save();

    return ApiResponse.success(res, 'Payment order created', {
      bookingId: pendingBooking._id,
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
      amount,
      classTitle: teachingClass.title,
    });
  } catch (error) {
    console.error('Create teaching order error:', error);
    return ApiResponse.serverError(res, 'Failed to create payment order', error.message);
  }
};

exports.verifyTeachingPayment = async (req, res) => {
  try {
    const { artistId } = req.params;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
      return ApiResponse.badRequest(res, 'Missing payment verification fields');
    }

    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
      return ApiResponse.badRequest(res, 'Invalid payment signature');
    }

    let booking = await TeachingBooking.findOne({
      _id: bookingId,
      artistId,
      'payment.razorpayOrderId': razorpay_order_id,
    }).populate('classId', 'title mode maxStudents');

    if (!booking) {
      return ApiResponse.notFound(res, 'Pending booking not found');
    }

    if (
      booking.status === 'confirmed' &&
      booking.payment?.razorpayPaymentId === razorpay_payment_id
    ) {
      let invoicedBooking = booking;
      if (!booking.invoiceNumber) {
        try {
          invoicedBooking = await generateAndAttachInvoice(booking._id);
        } catch (invoiceError) {
          console.error('Teaching invoice regeneration error:', invoiceError);
        }
      }
      return ApiResponse.success(res, 'Teaching session already confirmed', {
        booking: {
          _id: booking._id,
          bookingDate: booking.bookingDate,
          startTime: booking.startTime,
          endTime: booking.endTime,
          mode: booking.mode,
          status: booking.status,
          classTitle: booking.classId?.title,
          amountPaid: booking.payment.amountPaid,
          invoiceNumber: invoicedBooking?.invoiceNumber || booking.invoiceNumber,
          invoiceUrl: invoicedBooking?.invoiceUrl || booking.invoiceUrl,
        },
      });
    }

    if (booking.status !== 'pending_payment') {
      return ApiResponse.badRequest(res, 'This booking is no longer pending payment');
    }

    const availabilityCheck = await checkTeachingSlotAvailable(
      artistId,
      booking.bookingDate,
      booking.startTime,
      booking.endTime,
      {
        excludeTeachingBookingId: booking._id,
        classId: booking.classId?._id || booking.classId,
        maxStudents: booking.classId?.maxStudents,
      }
    );

    if (!availabilityCheck.available) {
      booking.status = 'cancelled';
      booking.cancellationReason = 'Slot no longer available';
      booking.payment.paymentStatus = 'failed';
      await booking.save();
      return ApiResponse.badRequest(res, 'Artist is no longer available at this time. Payment will be refunded if deducted.');
    }

    const paidAmount = Math.round(booking.pricing.amount);

    booking.payment.razorpayPaymentId = razorpay_payment_id;
    booking.payment.razorpaySignature = razorpay_signature;
    booking.payment.amountPaid = paidAmount;
    booking.payment.paymentStatus = 'completed';
    booking.payment.paidAt = new Date();
    booking.status = 'confirmed';
    booking.confirmedAt = new Date();
    await booking.save();

    await markTeachingSlotBooked(
      artistId,
      booking.bookingDate,
      booking.startTime,
      booking.endTime,
      booking._id,
      booking.classId?._id || booking.classId,
      booking.classId?.maxStudents
    );

    let invoicedBooking = null;
    try {
      invoicedBooking = await generateAndAttachInvoice(booking._id);
    } catch (invoiceError) {
      console.error('Teaching invoice generation error:', invoiceError);
    }

    return ApiResponse.success(res, 'Teaching session booked successfully', {
      booking: {
        _id: booking._id,
        bookingDate: booking.bookingDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        mode: booking.mode,
        status: booking.status,
        classTitle: booking.classId?.title,
        amountPaid: booking.payment.amountPaid,
        invoiceNumber: invoicedBooking?.invoiceNumber || booking.invoiceNumber,
        invoiceUrl: invoicedBooking?.invoiceUrl || booking.invoiceUrl,
      },
    });
  } catch (error) {
    console.error('Verify teaching payment error:', error);
    return ApiResponse.serverError(res, 'Failed to verify payment', error.message);
  }
};

exports.getArtistTeachingBookings = async (req, res) => {
  try {
    const { status, month, year } = req.query;
    const query = { artistId: req.user.id };

    if (status) query.status = status;

    if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
      query.bookingDate = { $gte: startDate, $lte: endDate };
    }

    const bookings = await TeachingBooking.find(query)
      .populate('classId', 'title mode pricing subject')
      .sort({ bookingDate: -1, startTime: -1 });

    return ApiResponse.success(res, 'Teaching bookings fetched', { bookings });
  } catch (error) {
    console.error('Get teaching bookings error:', error);
    return ApiResponse.serverError(res, 'Failed to fetch teaching bookings', error.message);
  }
};

exports.updateTeachingBookingStatus = async (req, res) => {
  try {
    const { status, cancellationReason } = req.body;
    const allowed = ['completed', 'cancelled'];
    if (!allowed.includes(status)) {
      return ApiResponse.badRequest(res, 'Invalid status');
    }

    const booking = await TeachingBooking.findOne({
      _id: req.params.bookingId,
      artistId: req.user.id,
    });

    if (!booking) {
      return ApiResponse.notFound(res, 'Booking not found');
    }

    booking.status = status;
    if (status === 'cancelled') {
      booking.cancelledAt = new Date();
      booking.cancellationReason = cancellationReason || 'Cancelled by artist';
    }
    await booking.save();

    return ApiResponse.success(res, 'Booking updated', { booking });
  } catch (error) {
    console.error('Update teaching booking error:', error);
    return ApiResponse.serverError(res, 'Failed to update booking', error.message);
  }
};

exports.getArtistTeachingCalendarOverview = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = Number(month) || new Date().getMonth() + 1;
    const currentYear = Number(year) || new Date().getFullYear();
    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    const bookings = await TeachingBooking.find({
      artistId: req.user.id,
      bookingDate: { $gte: startDate, $lte: endDate },
      status: { $in: ['confirmed', 'completed'] },
    })
      .populate('classId', 'title')
      .sort({ bookingDate: 1, startTime: 1 });

    const calendarData = {};
    for (const booking of bookings) {
      const dateKey = toDateKey(booking.bookingDate);
      if (!calendarData[dateKey]) calendarData[dateKey] = [];
      calendarData[dateKey].push({
        bookingId: booking._id,
        startTime: booking.startTime,
        endTime: booking.endTime,
        studentName: booking.studentName,
        classTitle: booking.classId?.title,
        mode: booking.mode,
        status: booking.status,
        amount: booking.pricing.amount,
      });
    }

    return ApiResponse.success(res, 'Teaching calendar overview fetched', {
      month: currentMonth,
      year: currentYear,
      calendarData,
    });
  } catch (error) {
    console.error('Teaching calendar overview error:', error);
    return ApiResponse.serverError(res, 'Failed to fetch teaching calendar overview', error.message);
  }
};

exports.downloadPublicInvoice = async (req, res) => {
  try {
    const { invoiceNumber } = req.params;

    let booking = await TeachingBooking.findOne({
      invoiceNumber,
      status: { $in: ['confirmed', 'completed'] },
    })
      .select('+invoicePdf')
      .populate('classId', 'title subject mode pricing')
      .populate('artistId', 'name email phone city');

    if (!booking) {
      return ApiResponse.notFound(res, 'Invoice not found');
    }

    if (!booking.invoicePdf) {
      booking = await generateAndAttachInvoice(booking._id);
      if (!booking?.invoicePdf) {
        return ApiResponse.serverError(res, 'Failed to generate invoice');
      }
      booking = await TeachingBooking.findById(booking._id).select('+invoicePdf');
    }

    res.setHeader('Content-Type', booking.invoicePdfContentType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoiceNumber}.pdf"`);
    return res.status(200).send(booking.invoicePdf);
  } catch (error) {
    console.error('Download teaching invoice error:', error);
    return ApiResponse.serverError(res, 'Failed to download invoice', error.message);
  }
};

exports.downloadArtistBookingInvoice = async (req, res) => {
  try {
    const booking = await TeachingBooking.findOne({
      _id: req.params.bookingId,
      artistId: req.user.id,
      status: { $in: ['confirmed', 'completed'] },
    }).select('+invoicePdf');

    if (!booking) {
      return ApiResponse.notFound(res, 'Booking not found');
    }

    let invoiced = booking;
    if (!booking.invoicePdf) {
      invoiced = await generateAndAttachInvoice(booking._id);
    }

    if (!invoiced?.invoicePdf) {
      invoiced = await TeachingBooking.findById(booking._id).select('+invoicePdf');
    }

    if (!invoiced?.invoicePdf) {
      return ApiResponse.serverError(res, 'Failed to generate invoice');
    }

    const filename = `${invoiced.invoiceNumber || invoiced._id}.pdf`;
    res.setHeader('Content-Type', invoiced.invoicePdfContentType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(invoiced.invoicePdf);
  } catch (error) {
    console.error('Artist download teaching invoice error:', error);
    return ApiResponse.serverError(res, 'Failed to download invoice', error.message);
  }
};
