const otpStore = new Map();
const OTP_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutes

const set = (key, value) => {
  otpStore.set(key, value);
  // Automatically remove the OTP after the expiration time
  setTimeout(() => {
    if (otpStore.has(key)) {
        otpStore.delete(key);
    }
  }, OTP_EXPIRATION_TIME);
};

const get = (key) => {
  return otpStore.get(key);
};

const del = (key) => {
  return otpStore.delete(key);
};

module.exports = {
  set,
  get,
  delete: del,
};
