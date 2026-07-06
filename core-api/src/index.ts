import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import connectDB from './config/db';
import { initSocket } from './socket';

import classRoutes from './routes/classRoutes';
import topicMaterialRoutes from './routes/topicMaterialRoutes';
import exerciseSubmissionRoutes from './routes/exerciseSubmissionRoutes';
import gradeNoteRoutes from './routes/gradeNoteRoutes';
import streamRoutes from './routes/streamRoutes';
import systemLogRoutes from './routes/systemLogRoutes';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// Swagger configuration
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LMS Core API Documentation',
      version: '1.0.0',
      description: 'API documentation for the LMS Core API system',
    },
    servers: [{ url: `http://localhost:${PORT}`, description: 'Development Server' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [
    path.join(__dirname, 'routes/*.ts'),
    path.join(__dirname, 'routes/*.js'),
  ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get(['/health', '/api/health'], (_req, res) => {
  res.status(200).json({ status: 'UP', service: 'core-api' });
});

// Routes
app.use('/api/classes', classRoutes);
app.use('/api/topics', topicMaterialRoutes);
app.use('/api/exercises', exerciseSubmissionRoutes);
app.use('/api/grades', gradeNoteRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/logs', systemLogRoutes);

const start = async (): Promise<void> => {
  try {
    await connectDB();
    const server = http.createServer(app);
    initSocket(server);
    server.listen(PORT, () => {
      console.log(`Core API HTTP server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start core-api:', error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  start();
}

export default app;
