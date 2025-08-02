const axios = require('axios');

/**
 * Service to send OTP via Fast2SMS
 */
const smsService = {
  /**
   * Send OTP to user's phone number using Fast2SMS
   * @param {String} phone - User's phone number
   * @param {String} otp - OTP to be sent
   * @returns {Promise<Object>} - Response from Fast2SMS API
   */
  sendOtp: async (phone, otp) => {
    try {
      // Fast2SMS DLT API (GET request)
      const apiKey = "9b5m8NwFGIBuanxhWrRveM1Z0H4KtzJQLOC3lpESojf6AciTdymskyLJPF1pRDr0YacEIvO8HnU3AjNQ";
      const templateId = '184006'; // fallback to your DLT template
      const senderId = 'MELITA';
      const validityMinutes = '30';

      const params = {
        authorization: apiKey,
        route: 'dlt',
        sender_id: senderId,
        message: templateId,
        variables_values: `${otp}|${validityMinutes}|`,
        numbers: phone,
        flash: '0'
      };

      const response = await axios.get('https://www.fast2sms.com/dev/bulkV2', { params });

      return {
        success: response.data.return === true,
        message: response.data.message,
        data: response.data
      };
    } catch (error) {
      console.error('SMS service error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send OTP',
        error: error.response?.data || error.message
      };
    }
  },

  /**
   * Send booking ticket details to user's phone number using Fast2SMS
   * @param {String} phone - User's phone number
   * @param {Object} ticketDetails - Booking ticket details
   * @param {String} ticketDetails.bookingId - Booking ID
   * @param {String} ticketDetails.eventName - Event name
   * @param {String} ticketDetails.ticketType - Ticket type
   * @param {String} ticketDetails.eventDate - Event date
   * @returns {Promise<Object>} - Response from Fast2SMS API
   */
  sendTicket: async (phone, ticketDetails) => {
    try {
      console.log(`[SMS Service] Attempting to send ticket SMS to ${phone}`);

      if (!phone || !ticketDetails) {
        console.error('[SMS Service] Missing required parameters:', { phone: !!phone, ticketDetails: !!ticketDetails });
        throw new Error('Phone number and ticket details are required');
      }

      const apiKey = '218M5WzNhd5IJbyb9ONbQ4z86ft3nwYOVLsaT66VKBwZTplehvSjOcN3Lz64';
      if (!apiKey) {
        console.error('[SMS Service] Missing FAST2SMS_API_KEY environment variable');
        throw new Error('Fast2SMS API key not configured');
      }

      // Check if there's a specific ticket template ID in your Fast2SMS account
      // If not, you may need to create one or use a different route
      const ticketTemplateId = '191089';
      const senderId = '600406';

      console.log('[SMS Service] SMS configuration:', {
        templateId: ticketTemplateId,
        senderId,
        hasApiKey: !!apiKey
      });

      // Format the variables according to your DLT template
      // For debugging, let's try a simpler variables string and a different approach
      // Create a URL to the booking
      console.log(ticketDetails);
      const variablesValues = `${ticketDetails.eventName}|${ticketDetails.ticketType}|${ticketDetails.bookingId}|`;

      console.log('[SMS Service] Preparing SMS with variables:', variablesValues);

      // Use the regular route instead of DLT route for testing if DLT is the issue
      const params = {
        authorization: apiKey,
        route: 'dlt', // You may try 'q' (Quick SMS) if DLT is having issues
        sender_id: senderId,
        message: ticketTemplateId,
        variables_values: variablesValues,
        numbers: phone,
        flash: '0'
      };

      console.log('[SMS Service] Sending SMS request to Fast2SMS');
      const response = await axios.get('https://www.fast2sms.com/dev/bulkV2', { params });
      console.log('[SMS Service] Fast2SMS response:', response.data);

      return {
        success: response.data.return === true,
        message: response.data.message,
        data: response.data
      };
    } catch (error) {
      console.error('[SMS Service] Failed to send ticket SMS:', error);
      console.error('[SMS Service] Error details:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send ticket SMS',
        error: error.response?.data || error.message
      };
    }
  },

  /**
   * Send booking confirmation to user's phone number using Fast2SMS
   * @param {String} phone - User's phone number
   * @param {String} eventName - Name of the event
   * @param {String} bookingId - Booking ID
   * @returns {Promise<Object>} - Response from Fast2SMS API
   */
  sendBookingConfirmation: async (phone, eventName, bookingId) => {
    try {
      console.log(`[SMS Service] Sending booking confirmation SMS to ${phone}`);

      if (!phone || !eventName || !bookingId) {
        console.error('[SMS Service] Missing required parameters for booking confirmation:', {
          phone: !!phone,
          eventName: !!eventName,
          bookingId: !!bookingId
        });
        throw new Error('Phone number, event name, and booking ID are required');
      }

      // Using the specific parameters provided for booking confirmations
      const apiKey = '218M5WzNhd5IJbyb9ONbQ4z86ft3nwYOVLsaT66VKBwZTplehvSjOcN3Lz64';
      const templateId = '191089'; // Specific template ID for booking confirmations
      const senderId = '600406';

      // Format the variables according to the provided DLT template
      const variablesValues = `${eventName}|${ticketDetails.ticketType}|${ticketDetails.bookingId}|`;

      console.log('[SMS Service] Sending booking confirmation with variables:', variablesValues);

      const params = {
        authorization: apiKey,
        route: 'dlt',
        sender_id: senderId,
        message: templateId,
        variables_values: variablesValues,
        numbers: phone,
        flash: '0'
      };

      const response = await axios.get('https://www.fast2sms.com/dev/bulkV2', { params });
      console.log('[SMS Service] Fast2SMS booking confirmation response:', response.data);

      return {
        success: response.data.return === true,
        message: response.data.message,
        data: response.data
      };
    } catch (error) {
      console.error('[SMS Service] Failed to send booking confirmation SMS:', error);
      console.error('[SMS Service] Error details:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send booking confirmation SMS',
        error: error.response?.data || error.message
      };
    }
  }
};

module.exports = smsService;
