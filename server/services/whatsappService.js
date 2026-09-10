const axios = require('axios');

const normalizeToE164 = (phone) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
};

const normalizeToFast2SmsNumber = (phone) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return digits;
  return digits;
};

const redactNumber = (number = '') => {
  const digits = String(number);
  if (digits.length <= 6) return digits.replace(/\d/g, '*');
  return `${digits.slice(0, 2)}******${digits.slice(-2)}`;
};

const sendFast2SmsWhatsapp = async ({ number, messageId, variablesValues }) => {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    throw new Error('Fast2SMS API key is not configured');
  }

  if (!messageId) {
    throw new Error('Fast2SMS WhatsApp template ID is not configured');
  }

  if (!number) {
    throw new Error('Destination phone number is missing');
  }

  const params = {
    authorization: apiKey,
    message_id: messageId,
    numbers: number,
    variables_values: variablesValues
  };

  console.log('[Fast2SMS] Sending WhatsApp template', {
    number: redactNumber(number),
    messageId,
    varsCount: String(variablesValues || '').split('|').length
  });

  const response = await axios.get('https://www.fast2sms.com/dev/whatsapp', {
    params,
    timeout: 12000
  });

  console.log('[Fast2SMS] WhatsApp response', response.data);

  const success = response.data?.return === true;
  return {
    success,
    data: response.data
  };
};

const buildVarsPipe = (values = []) => values.map((value) => String(value ?? '').trim()).join('|');

const getFrontendUrl = () => (process.env.FRONTEND_URL || 'https://www.ahibi.in').replace(/\/$/, '');

const buildTicketLink = ({ eventId, bookingId, ticketLink }) => {
  if (ticketLink) return ticketLink;
  if (eventId && bookingId) {
    return `${getFrontendUrl()}/events/${eventId}/bookings?bookingId=${bookingId}`;
  }
  return `${getFrontendUrl()}/profile`;
};

const safeText = (value, fallback = '-') => String(value ?? fallback).trim() || fallback;

const whatsappService = {
  // Send a pre-approved Meta template message (required for business-initiated notifications).
  // Usage: sendTemplateMessage({ to, templateName, languageCode, bodyParams: ['John','Ahibi Fest'] })
  sendTemplateMessage: async ({ to, templateName, languageCode = 'en_US', components = [], bodyParams }) => {
    const enabled = String(process.env.WHATSAPP_ENABLED || '').toLowerCase() === 'true';
    if (!enabled) {
      console.log('[WhatsApp] Template skipped (disabled)');
      return { success: false, message: 'WhatsApp is disabled' };
    }
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      console.error('[WhatsApp] Missing Meta config (token / phoneNumberId)');
      return { success: false, message: 'WhatsApp is not configured' };
    }
    if (!templateName) {
      return { success: false, message: 'templateName is required' };
    }
    const toE164 = normalizeToE164(to);
    if (!toE164) {
      console.error('[WhatsApp] Invalid destination phone number:', to);
      return { success: false, message: 'Invalid destination phone number' };
    }

    let comp = Array.isArray(components) ? components : [];
    if (comp.length === 0 && Array.isArray(bodyParams) && bodyParams.length) {
      comp = [{ type: 'body', parameters: bodyParams.map((v) => ({ type: 'text', text: String(v ?? '') })) }];
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: toE164.replace('+', ''),
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(comp.length ? { components: comp } : {})
      }
    };

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    try {
      const response = await axios.post(url, payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 10000
      });
      console.log('[WhatsApp] Template sent:', templateName, '->', redactNumber(toE164));
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[WhatsApp] Template send failed:', {
        status: error.response?.status,
        message: error.response?.data?.error?.message || error.message,
        details: error.response?.data
      });
      return {
        success: false,
        message: error.response?.data?.error?.message || error.message,
        error: error.response?.data || error.message
      };
    }
  },

  sendTextMessage: async ({ to, body }) => {
    const enabled = String(process.env.WHATSAPP_ENABLED || '').toLowerCase() === 'true';
    if (!enabled) {
      console.log('[WhatsApp] Skipped (disabled)');
      return { success: false, message: 'WhatsApp is disabled' };
    }

    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      console.error('[WhatsApp] Missing configuration:', {
        hasToken: !!token,
        hasPhoneNumberId: !!phoneNumberId
      });

      // Fall back to Fast2SMS WhatsApp if Meta config is missing
      try {
        const digits = normalizeToFast2SmsNumber(to);
        const fallbackTemplate = process.env.FAST2SMS_WHATSAPP_FALLBACK_TEMPLATE_ID || process.env.FAST2SMS_MESSAGE_ID;
        if (!fallbackTemplate) {
          return { success: false, message: 'No WhatsApp provider configured' };
        }

        const varsPipe = buildVarsPipe([
          (body || 'Notification').slice(0, 60),
          '-',
          '-',
          '-',
          '-',
          'Info'
        ]);

        const result = await sendFast2SmsWhatsapp({
          number: digits,
          messageId: fallbackTemplate,
          variablesValues: varsPipe
        });
        return result;
      } catch (fallbackError) {
        console.error('[WhatsApp] Fast2SMS fallback failed:', fallbackError?.message || fallbackError);
        return { success: false, message: fallbackError?.message || 'WhatsApp is not configured' };
      }
    }

    const toE164 = normalizeToE164(to);
    if (!toE164) {
      console.error('[WhatsApp] Invalid destination phone number:', to);
      return { success: false, message: 'Invalid destination phone number' };
    }

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    try {
      console.log('[WhatsApp] Sending message:', {
        to: toE164,
        phoneNumberId,
        hasBody: !!body
      });
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: toE164.replace('+', ''),
          type: 'text',
          text: { body }
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      console.log('[WhatsApp] Sent successfully');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[WhatsApp] Send failed:', {
        status: error.response?.status,
        message: error.response?.data?.error?.message || error.message,
        details: error.response?.data
      });

      // Attempt Fast2SMS fallback if Meta call fails
      try {
        const digits = normalizeToFast2SmsNumber(to);
        const fallbackTemplate = process.env.FAST2SMS_WHATSAPP_FALLBACK_TEMPLATE_ID || process.env.FAST2SMS_MESSAGE_ID;
        if (!fallbackTemplate) {
          throw new Error(error.response?.data?.error?.message || error.message);
        }

        const varsPipe = buildVarsPipe([
          (body || 'Notification').slice(0, 60),
          '-',
          '-',
          '-',
          '-',
          'Info'
        ]);

        const result = await sendFast2SmsWhatsapp({
          number: digits,
          messageId: fallbackTemplate,
          variablesValues: varsPipe
        });
        return result;
      } catch (fallbackError) {
        console.error('[WhatsApp] Fast2SMS fallback failed:', fallbackError?.message || fallbackError);
        return {
          success: false,
          message: error.response?.data?.error?.message || error.message,
          error: error.response?.data || error.message
        };
      }
    }
  },

  sendBookingConfirmationTemplate: async ({
    phone,
    customerName,
    eventName,
    eventDate,
    ticketType,
    quantity,
    bookingId,
    templateId
  }) => {
    const normalized = normalizeToFast2SmsNumber(phone);
    if (!normalized) {
      throw new Error('Invalid destination phone number');
    }

    const messageId = templateId || process.env.FAST2SMS_MESSAGE_ID;
    const varsPipe = buildVarsPipe([
      customerName || 'Guest',
      eventName || 'Your event',
      eventDate || 'Date TBA',
      ticketType || 'General Admission',
      typeof quantity === 'number' ? quantity : (Number(quantity) || 1),
      bookingId || '-'
    ]);

    return sendFast2SmsWhatsapp({
      number: normalized,
      messageId,
      variablesValues: varsPipe
    });
  },

  sendTicketReadyTemplate: async ({
    phone,
    eventName,
    eventDate,
    venue,
    bookingId,
    eventId,
    ticketLink,
    languageCode = 'en'
  }) => {
    return whatsappService.sendTemplateMessage({
      to: phone,
      templateName: 'ahibi_ticket_ready',
      languageCode,
      bodyParams: [
        safeText(eventName, 'Your event'),
        safeText(eventDate, 'Date TBA'),
        safeText(venue, 'Venue TBA'),
        safeText(bookingId),
        buildTicketLink({ eventId, bookingId, ticketLink })
      ]
    });
  },

  sendPaymentSuccessTemplate: async ({
    phone,
    customerName,
    amount,
    eventName,
    bookingId,
    paymentId,
    eventId,
    ticketLink,
    languageCode = 'en'
  }) => {
    return whatsappService.sendTemplateMessage({
      to: phone,
      templateName: 'ahibi_payment_success',
      languageCode,
      bodyParams: [
        safeText(customerName, 'Guest'),
        Number(amount || 0).toFixed(2),
        safeText(eventName, 'Your event'),
        safeText(bookingId),
        safeText(paymentId),
        buildTicketLink({ eventId, bookingId, ticketLink })
      ]
    });
  },

  sendBookingConfirmedTemplate: async ({
    phone,
    customerName,
    eventName,
    eventDate,
    eventTime,
    venue,
    tickets,
    bookingId,
    eventId,
    ticketLink,
    languageCode = 'en'
  }) => {
    return whatsappService.sendTemplateMessage({
      to: phone,
      templateName: 'ahibi_booking_confirmed',
      languageCode,
      bodyParams: [
        safeText(customerName, 'Guest'),
        safeText(eventName, 'Your event'),
        safeText(eventDate, 'Date TBA'),
        safeText(eventTime, 'Time TBA'),
        safeText(venue, 'Venue TBA'),
        safeText(tickets, '1 ticket'),
        safeText(bookingId),
        buildTicketLink({ eventId, bookingId, ticketLink })
      ]
    });
  },

  sendAdminBookingAlert: async ({
    bookingId,
    customerName,
    itemsCount,
    totalAmount,
    shippingLabel,
    statusPretty,
    templateId,
    adminNumber
  }) => {
    const adminFallbackNumber = adminNumber || process.env.FAST2SMS_ADMIN_NUMBER;
    const normalized = normalizeToFast2SmsNumber(adminFallbackNumber);
    if (!normalized) {
      throw new Error('Admin phone number is not configured');
    }

    const messageId = templateId || process.env.FAST2SMS_ADMIN_MESSAGE_ID;
    const varsPipe = buildVarsPipe([
      customerName || 'Customer',
      bookingId || '-',
      typeof itemsCount === 'number' ? itemsCount : (Number(itemsCount) || 1),
      Number(totalAmount || 0).toFixed(2),
      shippingLabel || 'E-Ticket Delivery',
      statusPretty || 'Confirmed'
    ]);

    return sendFast2SmsWhatsapp({
      number: normalized,
      messageId,
      variablesValues: varsPipe
    });
  }
};

module.exports = whatsappService;
