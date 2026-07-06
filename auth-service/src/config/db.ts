import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms-auth-db';
  try {
    await mongoose.connect(mongoURI);
    console.log(`MongoDB connected successfully to ${mongoURI}`);
  } catch (error: any) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
};

export default connectDB;
