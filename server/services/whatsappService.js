const axios = require('axios');

const normalizeToE164 = (phone) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
};

const whatsappService = {
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
      return { success: false, message: 'WhatsApp is not configured' };
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
      return {
        success: false,
        message: error.response?.data?.error?.message || error.message,
        error: error.response?.data || error.message
      };
    }
  }
};

module.exports = whatsappService;
