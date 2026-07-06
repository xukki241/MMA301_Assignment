const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms-core-db';
  try {
    await mongoose.connect(mongoURI);
    console.log(`MongoDB connected successfully to ${mongoURI}`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
};

module.exports = connectDB;
