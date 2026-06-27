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
      const apiKey = process.env.FAST2SMS_API_KEY;
      if (!apiKey) {
        console.error('SMS service error: FAST2SMS_API_KEY not found in .env file');
        return {
          success: false,
          message: 'SMS service is not configured.'
        };
      }

      // Fast2SMS DLT API (GET request)
      const templateId = '194850'; // fallback to your DLT template
      const senderId = 'AHIBII';
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
      console.error('SMS service error:', error.message);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Fast2SMS Error Response Data:', error.response.data);
        console.error('Fast2SMS Error Response Status:', error.response.status);
        console.error('Fast2SMS Error Response Headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Fast2SMS No Response:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('SMS Service Setup Error:', error.message);
      }

      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send OTP due to a server error.',
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

      const apiKey = process.env.FAST2SMS_API_KEY;
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
      const variablesValues = `${ticketDetails.eventName}|${ticketDetails.ticketType}|${ticketDetails.bookingId}|${ticketDetails.quantity || 1}|`;

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
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Fast2SMS Error Response Data:', error.response.data);
        console.error('Fast2SMS Error Response Status:', error.response.status);
        console.error('Fast2SMS Error Response Headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Fast2SMS No Response:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('SMS Service Setup Error:', error.message);
      }

      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send ticket SMS due to a server error.',
        error: error.response?.data || error.message
      };
    }
  },

  /**
   * Send booking confirmation to user's phone number using Fast2SMS
   * @param {String} phone - User's phone number
   * @param {String} eventName - Name of the event
   * @param {String} bookingId - Booking ID
   * @param {String} ticketType - Type of ticket (optional)
   * @param {Number} quantity - Number of tickets (optional)
   * @returns {Promise<Object>} - Response from Fast2SMS API
   */
  sendBookingConfirmation: async (phone, eventName, bookingId, ticketType = 'Standard', quantity = 1) => {
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
      const apiKey = process.env.FAST2SMS_API_KEY;
      const templateId = '191089'; // Specific template ID for booking confirmations
      const senderId = '600406';

      // Format the variables according to the provided DLT template
      const variablesValues = `${eventName}|${ticketType}|${bookingId}|${quantity}|`;

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
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Fast2SMS Error Response Data:', error.response.data);
        console.error('Fast2SMS Error Response Status:', error.response.status);
        console.error('Fast2SMS Error Response Headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Fast2SMS No Response:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('SMS Service Setup Error:', error.message);
      }

      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send booking confirmation SMS due to a server error.',
        error: error.response?.data || error.message
      };
    }
  },

  /**
   * Send event team invitation SMS
   */
  sendEventTeamInvite: async (phone, { eventName, inviteUrl, role }) => {
    try {
      const apiKey = process.env.FAST2SMS_API_KEY;
      if (!apiKey) {
        console.error('SMS service error: FAST2SMS_API_KEY not found');
        return { success: false, message: 'SMS service is not configured.' };
      }

      const message =
        `AHIBI Event Command: You are invited to "${eventName}" as ${role}. ` +
        `Sign in with this mobile number and accept your invite: ${inviteUrl}`;

      const params = {
        authorization: apiKey,
        route: 'q',
        message,
        language: 'english',
        flash: '0',
        numbers: phone,
      };

      const response = await axios.get('https://www.fast2sms.com/dev/bulkV2', { params });
      return {
        success: response.data.return === true,
        message: response.data.message,
        data: response.data,
      };
    } catch (error) {
      console.error('[SMS Service] Failed to send team invite SMS:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send invitation SMS.',
        error: error.response?.data || error.message,
      };
    }
  },
};

module.exports = smsService;
