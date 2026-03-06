/**
 * Test script to verify one-device-at-a-time restriction
 * Run this script to test if the session management is working correctly
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api/livestream`;

// Test configuration
const TEST_USER = {
  email: 'test@example.com',
  password: 'test123'
};

const TEST_STREAM_ID = 'your-stream-id-here'; // Replace with actual stream ID

async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, TEST_USER);
    return response.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testSingleDeviceRestriction() {
  console.log('🧪 Testing single device restriction...\n');
  
  // Get two different tokens (simulating two devices)
  const token1 = await login();
  const token2 = await login(); // In real scenario, this would be same user on different device
  
  const headers1 = { 'Authorization': `Bearer ${token1}` };
  const headers2 = { 'Authorization': `Bearer ${token2}` };
  
  try {
    // Device 1 joins the stream
    console.log('📱 Device 1 joining stream...');
    const join1 = await axios.post(`${API_URL}/streams/${TEST_STREAM_ID}/join`, {}, { headers: headers1 });
    console.log('✅ Device 1 joined successfully:', join1.data.sessionToken.substring(0, 8) + '...');
    
    // Device 2 tries to join the same stream (should be blocked)
    console.log('\n📱 Device 2 trying to join same stream...');
    try {
      const join2 = await axios.post(`${API_URL}/streams/${TEST_STREAM_ID}/join`, {}, { headers: headers2 });
      console.log('❌ UNEXPECTED: Device 2 also joined successfully!');
      console.log('This indicates the single-device restriction is NOT working.');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('✅ EXPECTED: Device 2 was blocked with 409 status');
        console.log('Message:', error.response.data.message);
        console.log('✅ Single-device restriction is WORKING correctly!');
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }
    
    // Test force join (Device 2 takes over)
    console.log('\n🔄 Testing force join (Device 2 takes over)...');
    try {
      const forceJoin = await axios.post(`${API_URL}/streams/${TEST_STREAM_ID}/join`, 
        { force: true }, 
        { headers: headers2 }
      );
      console.log('✅ Device 2 force-joined successfully:', forceJoin.data.sessionToken.substring(0, 8) + '...');
      
      // Device 1 should now be blocked when trying to heartbeat
      console.log('\n💓 Testing Device 1 heartbeat (should fail)...');
      try {
        await axios.post(`${API_URL}/streams/${TEST_STREAM_ID}/heartbeat`, 
          { sessionToken: join1.data.sessionToken }, 
          { headers: headers1 }
        );
        console.log('❌ UNEXPECTED: Device 1 heartbeat still works!');
      } catch (error) {
        if (error.response?.status === 404) {
          console.log('✅ EXPECTED: Device 1 heartbeat failed (session expired)');
        } else {
          console.log('❌ Unexpected heartbeat error:', error.response?.data || error.message);
        }
      }
    } catch (error) {
      console.log('❌ Force join failed:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('Test setup failed:', error.response?.data || error.message);
  }
}

// Run the test
if (require.main === module) {
  testSingleDeviceRestriction()
    .then(() => {
      console.log('\n🎉 Test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testSingleDeviceRestriction };
