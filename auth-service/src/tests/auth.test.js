const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../index');
const User = require('../models/User');
const Role = require('../models/Role');
const UserRole = require('../models/UserRole');
const { validateToken, getUser } = require('../grpc/grpcServer');

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms-auth-db-test';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey123!';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.db.dropDatabase();
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
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('userId');
      expect(res.body.email).toBe(testUser.email);
      expect(res.body.role).toBe(testUser.role);

      // Verify DB states
      const user = await User.findOne({ email: testUser.email });
      expect(user).toBeTruthy();
      expect(user.fullName).toBe(testUser.fullName);

      const role = await Role.findOne({ roleName: testUser.role });
      expect(role).toBeTruthy();

      const userRole = await UserRole.findOne({ userId: user._id, roleId: role._id });
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
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe(testUser.email);
    });

    test('should fail login with invalid credentials', async () => {
      await request(app).post('/api/auth/register').send(testUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
    });

    test('should fetch user profile using JWT token', async () => {
      await request(app).post('/api/auth/register').send(testUser);
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      
      const token = loginRes.body.accessToken;

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(testUser.email);
      expect(res.body.role).toBe(testUser.role);
    });

    test('should refresh tokens using refresh token', async () => {
      await request(app).post('/api/auth/register').send(testUser);
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      
      const rToken = loginRes.body.refreshToken;

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: rToken });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    test('should return UP status on /health endpoint', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'UP', service: 'auth-service' });
    });

    test('should return UP status on /api/auth/health endpoint', async () => {
      const res = await request(app).get('/api/auth/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'UP', service: 'auth-service' });
    });
  });

  describe('gRPC Handlers', () => {
    test('ValidateToken should verify valid token and return response payload', (done) => {
      const payload = {
        userId: 'usr_mock123',
        email: 'mock@lms.edu',
        fullName: 'Mock User',
        roles: ['Teacher'],
      };
      const token = jwt.sign(payload, JWT_SECRET);

      const mockCall = {
        request: {
          token: `Bearer ${token}`,
        },
      };

      validateToken(mockCall, (err, response) => {
        expect(err).toBeNull();
        expect(response.isValid).toBe(true);
        expect(response.userId).toBe(payload.userId);
        expect(response.email).toBe(payload.email);
        expect(response.fullName).toBe(payload.fullName);
        expect(response.roles).toEqual(payload.roles);
        done();
      });
    });

    test('ValidateToken should return isValid=false for invalid token', (done) => {
      const mockCall = {
        request: {
          token: 'Bearer invalidtokenhere',
        },
      };

      validateToken(mockCall, (err, response) => {
        expect(err).toBeNull();
        expect(response.isValid).toBe(false);
        expect(response.userId).toBe('');
        expect(response.email).toBe('');
        expect(response.fullName).toBe('');
        expect(response.roles).toEqual([]);
        done();
      });
    });

    test('GetUser should retrieve correct user details', async () => {
      const user = await User.create({
        email: 'grpc@lms.edu',
        passwordHash: 'dummyhash',
        fullName: 'gRPC Tester',
      });
      const role = await Role.create({ roleName: 'Student' });
      await UserRole.create({ userId: user._id, roleId: role._id });

      const mockCall = {
        request: {
          userId: user._id.toString(),
        },
      };

      return new Promise((resolve) => {
        getUser(mockCall, (err, response) => {
          expect(err).toBeNull();
          expect(response.userId).toBe(user._id.toString());
          expect(response.email).toBe(user.email);
          expect(response.fullName).toBe(user.fullName);
          expect(response.role).toBe('Student');
          expect(response.createdAt).toBeTruthy();
          resolve();
        });
      });
    });

    test('GetUser should return error if user not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const mockCall = {
        request: {
          userId: nonExistentId,
        },
      };

      return new Promise((resolve) => {
        getUser(mockCall, (err, response) => {
          expect(err).toBeTruthy();
          expect(err.code).toBe(5); // NOT_FOUND status code
          expect(err.message).toBe('User not found');
          resolve();
        });
      });
    });
  });
});
