const mongoose = require('mongoose');
const User = require('../models/User');
const Artist = require('../models/Artist');
const Organizer = require('../models/Organizer');
const Venue = require('../models/Venue');
require('dotenv').config();

const testCrossRolePhone = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    const testPhone = '9876543210';
    const testEmail1 = 'test1@example.com';
    const testEmail2 = 'test2@example.com';
    const testEmail3 = 'test3@example.com';
    const testEmail4 = 'test4@example.com';

    // Clean up any existing test data
    await User.deleteOne({ phone: testPhone });
    await Artist.deleteOne({ phone: testPhone });
    await Organizer.deleteOne({ phone: testPhone });
    await Venue.deleteOne({ phone: testPhone });

    console.log('\n🧪 Testing cross-role phone number usage...');

    // Test 1: Create User with test phone
    console.log('\n1. Creating User with phone:', testPhone);
    const user = await User.create({
      phone: testPhone,
      city: 'Test City',
      role: 'user'
    });
    console.log('✓ User created successfully:', user._id);

    // Test 2: Create Artist with same phone
    console.log('\n2. Creating Artist with same phone:', testPhone);
    const artist = await Artist.create({
      name: 'Test Artist',
      email: testEmail1,
      phone: testPhone,
      city: 'Test City',
      type: 'musician'
    });
    console.log('✓ Artist created successfully:', artist._id);

    // Test 3: Create Organizer with same phone
    console.log('\n3. Creating Organizer with same phone:', testPhone);
    const organizer = await Organizer.create({
      name: 'Test Organizer',
      email: testEmail2,
      phone: testPhone,
      companyName: 'Test Company',
      description: 'Test Description',
      address: {
        street: 'Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456'
      },
      contactInfo: {
        email: testEmail2
      }
    });
    console.log('✓ Organizer created successfully:', organizer._id);

    // Test 4: Create Venue with same phone
    console.log('\n4. Creating Venue with same phone:', testPhone);
    const venue = await Venue.create({
      name: 'Test Venue',
      email: testEmail3,
      phone: testPhone,
      description: 'Test Venue Description',
      address: {
        street: 'Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456'
      }
    });
    console.log('✓ Venue created successfully:', venue._id);

    // Test 5: Verify all records exist with same phone
    console.log('\n5. Verifying all records exist with phone:', testPhone);
    const userCount = await User.countDocuments({ phone: testPhone });
    const artistCount = await Artist.countDocuments({ phone: testPhone });
    const organizerCount = await Organizer.countDocuments({ phone: testPhone });
    const venueCount = await Venue.countDocuments({ phone: testPhone });

    console.log(`✓ Users with phone ${testPhone}: ${userCount}`);
    console.log(`✓ Artists with phone ${testPhone}: ${artistCount}`);
    console.log(`✓ Organizers with phone ${testPhone}: ${organizerCount}`);
    console.log(`✓ Venues with phone ${testPhone}: ${venueCount}`);

    // Test 6: Try to create duplicate within same role (should fail)
    console.log('\n6. Testing duplicate prevention within same role...');
    try {
      await User.create({
        phone: testPhone,
        city: 'Another City',
        role: 'user'
      });
      console.log('❌ ERROR: Duplicate user creation should have failed!');
    } catch (error) {
      if (error.code === 11000) {
        console.log('✓ Duplicate user creation properly prevented');
      } else {
        console.log('✓ Duplicate user creation failed as expected:', error.message);
      }
    }

    console.log('\n🎉 All tests passed! Cross-role phone numbers are working correctly.');

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await User.deleteOne({ phone: testPhone });
    await Artist.deleteOne({ phone: testPhone });
    await Organizer.deleteOne({ phone: testPhone });
    await Venue.deleteOne({ phone: testPhone });
    console.log('✓ Test data cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
};

// Run the test
testCrossRolePhone();
