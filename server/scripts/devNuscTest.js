const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function fail(message) {
  console.error(`[NUSC test mode] ${message}`);
  process.exit(1);
}

if (process.env.NODE_ENV === 'production') {
  fail('Refusing to start NUSC test mode in a production environment.');
}

if (!/^rzp_test_/.test(process.env.RAZORPAY_KEY_ID || '')) {
  fail('A Razorpay test key is required. No server was started.');
}

if (!process.env.MONGO_URI) {
  fail('MONGO_URI is not configured. No server was started.');
}

try {
  const mongoUri = new URL(process.env.MONGO_URI);
  const currentDatabase = decodeURIComponent(mongoUri.pathname.replace(/^\/+/, '')).split('/')[0];
  if (currentDatabase && !['ahibi', 'ahibi-test'].includes(currentDatabase)) {
    fail('The configured Mongo database is not an AHIBI database. No server was started.');
  }
  mongoUri.pathname = '/ahibi-test';
  process.env.MONGO_URI = mongoUri.toString();
} catch (error) {
  fail('MONGO_URI could not be safely redirected to ahibi-test. No server was started.');
}

process.env.NUSC_HOME_MATCH_TEST_MODE = 'true';
process.env.NUSC_HOME_MATCH_TICKET_SALES_ENABLED = 'true';
process.env.NODE_ENV = 'development';

console.log('[NUSC test mode] Database: ahibi-test; Razorpay: test key; no production database selected.');
require('../index');
