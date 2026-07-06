import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import { startGrpcServer } from './grpc/grpcServer';

const app = express();
const PORT = process.env.PORT || 3001;
const GRPC_PORT = process.env.GRPC_PORT || 50051;

app.use(cors());
app.use(express.json());

// Swagger configuration
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LMS Auth Service API',
      version: '1.0.0',
      description: 'Authentication and user management API for the LMS platform',
    },
    servers: [{ url: `http://localhost:${PORT}`, description: 'Development Server' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [path.join(__dirname, 'routes/*.ts'), path.join(__dirname, 'routes/*.js')],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get(['/health', '/api/auth/health'], (_req, res) => {
  res.status(200).json({ status: 'UP', service: 'auth-service' });
});

const start = async (): Promise<void> => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Express HTTP server running on port ${PORT}`);
    });
    startGrpcServer(GRPC_PORT as string);
  } catch (error) {
    console.error('Failed to start auth-service:', error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  start();
}

export default app;
