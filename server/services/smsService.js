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
      const axios = require('axios');
      const apiKey = process.env.FAST2SMS_API_KEY;
      const templateId = process.env.FAST2SMS_TEMPLATE_ID || '184006'; // fallback to your DLT template
      const senderId = process.env.FAST2SMS_SENDER_ID || 'MELITA';
      const validityMinutes = process.env.FAST2SMS_OTP_VALIDITY || '30';
      
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
  }
};

module.exports = smsService;
