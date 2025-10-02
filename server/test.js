import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

console.log('Testing Razorpay credentials...');
console.log('Key ID:', keyId.slice(0, 12) + '*');
console.log('Key Secret Length:', keySecret.length);
console.log('Key Secret Prefix:', keySecret.slice(0, 4) + '*');

if (!keyId || !keySecret) {
    console.error('❌ Missing credentials in .env file');
    process.exit(1);
}

const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret
});

async function testOrder() {
    try {
        console.log('\nAttempting to create test order...');
        const order = await razorpay.orders.create({
            amount: 100, // Rs. 1 (minimum)
            currency: 'INR',
            receipt: `test_receipt_${Date.now()}`
        });

        console.log('✅ SUCCESS! Razorpay order created:', order.id);
        console.log('Order details:', JSON.stringify(order, null, 2));
        process.exit(0);
} catch (error) {
    console.error('❌ FAILED to create Razorpay order');
    console.error('Status Code:', error?.statusCode);
    console.error('Error:', error?.error);
    console.error('Full error:', JSON.stringify(error, null, 2));

    if (error?.statusCode === 401) {
        console.error('\n⚠  Authentication failed - Your Razorpay credentials are invalid or expired.');
        console.error('Please verify:');
        console.error('1. Go to Razorpay Dashboard → Settings → API Keys');
        console.error('2. Make sure you are in TEST MODE');
        console.error('3. Copy fresh Key ID and Key Secret');
        console.error('4. Update server/.env file');
        console.error('5. Restart the server');
    }

    process.exit(1);
}
}

testOrder();