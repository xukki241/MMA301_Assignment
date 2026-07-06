import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../index';
import User from '../models/User';
import Role from '../models/Role';
import UserRole from '../models/UserRole';
import { validateToken, getUser } from '../grpc/grpcServer';

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms-auth-db-test';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey123!';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.db!.dropDatabase();
    await mongoose.disconnect();
  }
});

describe('Auth Service Core', () => {
  const testUser = {
    email: 'test_dev@lms.edu',
    password: 'password123',
    fullName: 'Test Developer',
    role: 'Teacher',
  };

  beforeEach(async () => {
    await User.deleteMany({});
    await Role.deleteMany({});
    await UserRole.deleteMany({});
  });

  describe('HTTP Endpoints', () => {
    test('should register a new user and assign the requested role', async () => {
      const res = await request(app).post('/api/auth/register').send(testUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('userId');
      expect(res.body.email).toBe(testUser.email);
      expect(res.body.role).toBe(testUser.role);

      const user = await User.findOne({ email: testUser.email });
      expect(user).toBeTruthy();
      expect(user!.fullName).toBe(testUser.fullName);

      const role = await Role.findOne({ roleName: testUser.role });
      expect(role).toBeTruthy();

      const userRole = await UserRole.findOne({ userId: user!._id, roleId: role!._id });
      expect(userRole).toBeTruthy();
    });

    test('should fail registration with missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'only_email@test.com' });

      expect(res.status).toBe(400);
    });

    test('should login user and return JWT tokens', async () => {
      await request(app).post('/api/auth/register').send(testUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
    });
  });

  describe('gRPC ValidateToken', () => {
    test('should validate a valid JWT token', async () => {
      await request(app).post('/api/auth/register').send(testUser);
      const user = await User.findOne({ email: testUser.email });
      const role = await Role.findOne({ roleName: testUser.role });

      const token = jwt.sign(
        { userId: user!._id.toString(), email: user!.email, fullName: user!.fullName, roles: [role!.roleName] },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      await new Promise<void>((resolve) => {
        validateToken({ request: { token } } as any, (err: any, response: any) => {
          expect(err).toBeNull();
          expect(response.isValid).toBe(true);
          expect(response.userId).toBe(user!._id.toString());
          resolve();
        });
      });
    });

    test('should return isValid false for invalid token', async () => {
      await new Promise<void>((resolve) => {
        validateToken({ request: { token: 'invalid.token.here' } } as any, (err: any, response: any) => {
          expect(err).toBeNull();
          expect(response.isValid).toBe(false);
          resolve();
        });
      });
    });
  });
});
