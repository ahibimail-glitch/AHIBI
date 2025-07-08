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
      const response = await axios({
        method: 'post',
        url: 'https://www.fast2sms.com/dev/bulkV2',
        headers: {
          Authorization: process.env.FAST2SMS_API_KEY
        },
        data: {
          variables_values: otp,
          route: "otp",
          numbers: phone
        }
      });
      
      return {
        success: response.data.return,
        message: response.data.message,
        data: response.data
      };
    } catch (error) {
      console.error('SMS service error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Failed to send OTP',
        error: error.response?.data || error.message
      };
    }
  }
};

module.exports = smsService;
