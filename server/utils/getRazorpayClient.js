const Razorpay = require('razorpay');

let client;

function getRazorpayClient() {
  if (client) return client;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    const error = new Error('Razorpay credentials are not configured');
    error.statusCode = 503;
    throw error;
  }

  client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return client;
}

module.exports = getRazorpayClient;
