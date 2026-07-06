require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const { startGrpcServer } = require('./grpc/grpcServer');

const app = express();
const PORT = process.env.PORT || 3001;
const GRPC_PORT = process.env.GRPC_PORT || 50051;

app.use(cors());
app.use(express.json());

// HTTP routing setup
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get(['/health', '/api/auth/health'], (req, res) => {
  res.status(200).json({ status: 'UP', service: 'auth-service' });
});

const start = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`Express HTTP server running on port ${PORT}`);
    });

    startGrpcServer(GRPC_PORT);
  } catch (error) {
    console.error('Failed to start auth-service:', error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  start();
}

module.exports = app;
