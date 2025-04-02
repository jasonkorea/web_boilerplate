const mongoose = require('mongoose');
require('dotenv').config();

function connectToDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not set in .env');
    process.exit(1);
  }

  mongoose.connect(uri);

  mongoose.connection.on('connected', () => {
    console.log('✅ Connected to MongoDB');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
  });
}

module.exports = { connectToDB };
