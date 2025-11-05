const mongoose = require('mongoose');
require('dotenv').config();

const dropPhoneIndexes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Collections that have phone unique indexes
    const collections = ['users', 'artists', 'organizers', 'venues'];
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        
        // Get all indexes for the collection
        const indexes = await collection.indexes();
        console.log(`\nIndexes for ${collectionName}:`, indexes.map(idx => ({ name: idx.name, key: idx.key })));
        
        // Find and drop phone unique index
        const phoneIndex = indexes.find(idx => 
          idx.key && idx.key.phone === 1 && idx.unique === true
        );
        
        if (phoneIndex) {
          console.log(`Dropping phone unique index "${phoneIndex.name}" from ${collectionName}...`);
          await collection.dropIndex(phoneIndex.name);
          console.log(`✓ Successfully dropped phone unique index from ${collectionName}`);
        } else {
          console.log(`No phone unique index found in ${collectionName}`);
        }
      } catch (error) {
        if (error.code === 26) {
          console.log(`Collection ${collectionName} does not exist, skipping...`);
        } else {
          console.error(`Error processing ${collectionName}:`, error.message);
        }
      }
    }
    
    console.log('\n✓ Phone index cleanup completed');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the script
dropPhoneIndexes();
