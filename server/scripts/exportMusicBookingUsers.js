const { MongoClient } = require('mongodb');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function exportMusicBookingUsers() {
  let client;
  
  try {
    console.log('Connecting to MongoDB...');
    
    // Connect directly using MongoDB driver
    client = new MongoClient(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
      socketTimeoutMS: 45000, // Socket timeout
      connectTimeoutMS: 30000 // Connection timeout
    });
    
    await client.connect();
    console.log('MongoDB Connected');
    
    // Get database name from connection string
    const dbName = process.env.MONGO_URI.split('/').pop().split('?')[0];
    const db = client.db(dbName);
    
    console.log('Fetching music bookings...');
    
    // Find all bookings with ticketType 'Music'
    const bookingsCollection = db.collection('bookings');
    const usersCollection = db.collection('users');
    const eventsCollection = db.collection('events');
    
    // Find all music bookings
    const musicBookings = await bookingsCollection.find({ ticketType: 'Music' }).toArray();
    
    console.log(`Found ${musicBookings.length} music bookings`);
    
    if (musicBookings.length === 0) {
      console.log('No music bookings found');
      await client.close();
      return;
    }
    
    // Get user details for each booking
    const userDetails = [];
    
    for (const booking of musicBookings) {
      // Get user details
      const user = await usersCollection.findOne({ _id: booking.user });
      
      // Get event details
      const event = await eventsCollection.findOne({ _id: booking.event });
      
      if (user) {
        userDetails.push({
          booking,
          user,
          event
        });
      }
    }
    
    console.log(`Retrieved details for ${userDetails.length} users`);
    
    // Create Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Music Booking Users');
    
    // Define columns
    worksheet.columns = [
      { header: 'User ID', key: 'userId', width: 25 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'Event Name', key: 'eventName', width: 25 },
      { header: 'Event Date', key: 'eventDate', width: 15 },
      { header: 'Booking Date', key: 'bookingDate', width: 15 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Status', key: 'status', width: 15 },
    ];
    
    // Add data rows
    userDetails.forEach(({ booking, user, event }) => {
      worksheet.addRow({
        userId: user._id.toString(),
        name: user.name || 'N/A',
        phone: user.phone || 'N/A',
        email: user.email || 'N/A',
        city: user.city || 'N/A',
        eventName: event ? event.name : 'N/A',
        eventDate: event && event.startDate ? 
          new Date(event.startDate).toLocaleDateString() : 'N/A',
        bookingDate: new Date(booking.bookedAt).toLocaleDateString(),
        quantity: booking.quantity,
        status: booking.status
      });
    });
    
    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const filename = `music_booking_users_${timestamp}.xlsx`;
    const filePath = path.join(__dirname, '../exports', filename);
    
    // Ensure exports directory exists
    const exportDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    // Write to file
    await workbook.xlsx.writeFile(filePath);
    
    console.log(`Excel file created successfully: ${filePath}`);
    
    // Close MongoDB connection
    await client.close();
    console.log('MongoDB disconnected');
    
  } catch (error) {
    console.error('Error exporting music booking users:', error);
    // Ensure we disconnect from MongoDB even if there's an error
    if (client) {
      try {
        await client.close();
        console.log('MongoDB disconnected after error');
      } catch (disconnectError) {
        console.error('Error disconnecting from MongoDB:', disconnectError);
      }
    }
    process.exit(1);
  }
}

// Run the export function
exportMusicBookingUsers();
