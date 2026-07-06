require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./config/db');
const { initSocket } = require('./socket');

// Import routes
const classRoutes = require('./routes/classRoutes');
const topicMaterialRoutes = require('./routes/topicMaterialRoutes');
const exerciseSubmissionRoutes = require('./routes/exerciseSubmissionRoutes');
const gradeNoteRoutes = require('./routes/gradeNoteRoutes');
const streamRoutes = require('./routes/streamRoutes');
const systemLogRoutes = require('./routes/systemLogRoutes');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// Configure Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LMS Core API Documentation',
      version: '1.0.0',
      description: 'API documentation for the LMS Core API system',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [path.join(__dirname, 'routes/*.js')],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoints
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({ status: 'UP', service: 'core-api' });
});

// Mount MVC routes
app.use('/api/classes', classRoutes);
app.use('/api', topicMaterialRoutes);
app.use('/api', exerciseSubmissionRoutes);
app.use('/api', gradeNoteRoutes);
app.use('/api', streamRoutes);
app.use('/api', systemLogRoutes);

// Catch-all route
app.get('*', (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.path}` });
});

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

const start = async () => {
  try {
    // Only attempt DB connection if not running tests
    if (process.env.NODE_ENV !== 'test') {
      await connectDB();
    }
    
    server.listen(PORT, () => {
      console.log(`Core API running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start Core API:', error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  start();
}

// Export app for test compatibility
module.exports = app;
