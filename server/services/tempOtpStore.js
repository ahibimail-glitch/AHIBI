// A simple in-memory store for OTPs with expiration
const otpStore = new Map();

const OTP_EXPIRATION_TIME = 10 * 60 * 1000; // 10 minutes

const tempOtpStore = {
  /**
   * Set an OTP for a given key (e.g., phone number)
   * @param {string} key - The key to store the OTP against.
   * @param {string} otp - The OTP to store.
   */
  set: (key, otp) => {
    const expiresAt = Date.now() + OTP_EXPIRATION_TIME;
    otpStore.set(key, { otp, expiresAt });
  },

  /**
   * Get the OTP for a given key if it's not expired.
   * @param {string} key - The key to retrieve the OTP for.
   * @returns {string|null} - The OTP or null if not found or expired.
   */
  get: (key) => {
    const entry = otpStore.get(key);
    if (entry && Date.now() < entry.expiresAt) {
      return entry.otp;
    }
    // If expired, delete it
    if (entry) {
      otpStore.delete(key);
    }
    return null;
  },

  /**
   * Delete an OTP for a given key.
   * @param {string} key - The key to delete.
   */
  delete: (key) => {
    otpStore.delete(key);
  },
};

module.exports = { tempOtpStore };
