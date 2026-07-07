// Mock grpc and proto-loader before importing app
jest.mock('@grpc/grpc-js', () => {
  return {
    credentials: {
      createInsecure: jest.fn(),
    },
    loadPackageDefinition: jest.fn().mockReturnValue({
      auth: {
        AuthService: jest.fn().mockImplementation(() => {
          return {
            ValidateToken: jest.fn().mockImplementation((req, callback) => {
              if (req.token === 'invalid-token') {
                callback(null, { isValid: false });
              } else {
                callback(null, {
                  isValid: true,
                  userId: 'mock-user-id-123',
                  email: 'test@example.com',
                  fullName: 'Test User',
                  roles: ['Teacher', 'Student'],
                });
              }
            }),
          };
        }),
      },
    }),
  };
});

jest.mock('@grpc/proto-loader', () => {
  return {
    loadSync: jest.fn().mockReturnValue({}),
  };
});

// Spy on Socket.IO helper before controllers use it
const socketHelper = require('../socket');
const broadcastSpy = jest.spyOn(socketHelper, 'broadcastToClass').mockImplementation(() => {});

// Mock Mongoose Models
const mockClassSave = jest.fn();
const mockSettingsSave = jest.fn();
const mockEnrollmentSave = jest.fn();
const mockSubmissionSave = jest.fn();
const mockSubmissionFileSave = jest.fn();
const mockPostSave = jest.fn();
const mockCommentSave = jest.fn();
const mockAttendanceLogSave = jest.fn();
const mockGradeSave = jest.fn();

jest.mock('../models', () => {
  const mongoose = require('mongoose');
  
  const mockClassInstance = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Test Class',
    description: 'A test class',
    classCode: 'ABCDEF',
    teacherId: 'mock-user-id-123',
    status: 'active',
    save: mockClassSave
  };

  const mockSettingsInstance = {
    _id: new mongoose.Types.ObjectId(),
    classId: mockClassInstance._id,
    allowStudentPosts: true,
    allowStudentComments: true,
    theme: 'default',
    save: mockSettingsSave
  };

  const mockEnrollmentInstance = {
    _id: new mongoose.Types.ObjectId(),
    classId: mockClassInstance._id,
    studentId: 'mock-user-id-123',
    status: 'enrolled',
    save: mockEnrollmentSave
  };

  const mockSubmissionInstance = {
    _id: new mongoose.Types.ObjectId(),
    exerciseId: new mongoose.Types.ObjectId(),
    studentId: 'mock-user-id-123',
    submittedAt: new Date(),
    status: 'submitted',
    save: mockSubmissionSave
  };

  const mockPostInstance = {
    _id: new mongoose.Types.ObjectId(),
    classId: mockClassInstance._id,
    authorId: 'mock-user-id-123',
    content: 'Test post content',
    attachmentUrls: [],
    save: mockPostSave
  };

  const mockCommentInstance = {
    _id: new mongoose.Types.ObjectId(),
    postId: new mongoose.Types.ObjectId(),
    authorId: 'mock-user-id-123',
    content: 'Test comment content',
    save: mockCommentSave
  };

  const mockAttendanceLogInstance = {
    _id: new mongoose.Types.ObjectId(),
    classId: mockClassInstance._id,
    studentId: 'mock-user-id-123',
    date: new Date(),
    status: 'present',
    recordedBy: 'mock-user-id-123',
    save: mockAttendanceLogSave
  };

  const mockGradeInstance = {
    _id: new mongoose.Types.ObjectId(),
    submissionId: new mongoose.Types.ObjectId(),
    points: 85,
    feedback: 'Good work',
    gradedBy: 'mock-user-id-123',
    gradedAt: new Date(),
    save: mockGradeSave
  };

  return {
    Class: Object.assign(jest.fn().mockImplementation(() => mockClassInstance), {
      find: jest.fn().mockImplementation(() => {
        const query = Promise.resolve([mockClassInstance]);
        query.populate = jest.fn().mockReturnThis();
        query.sort = jest.fn().mockReturnThis();
        return query;
      }),
      findOne: jest.fn().mockResolvedValue(mockClassInstance),
      findById: jest.fn().mockResolvedValue(mockClassInstance),
    }),
    ClassSettings: Object.assign(jest.fn().mockImplementation(() => mockSettingsInstance), {
      findOne: jest.fn().mockResolvedValue(mockSettingsInstance),
    }),
    Enrollment: Object.assign(jest.fn().mockImplementation(() => mockEnrollmentInstance), {
      find: jest.fn().mockImplementation(() => {
        const query = Promise.resolve([mockEnrollmentInstance]);
        query.populate = jest.fn().mockResolvedValue([mockEnrollmentInstance]);
        query.sort = jest.fn().mockReturnThis();
        return query;
      }),
      findOne: jest.fn().mockResolvedValue(null),
    }),
    Topic: Object.assign(jest.fn(), {
      find: jest.fn().mockImplementation(() => {
        const query = Promise.resolve([{ _id: new mongoose.Types.ObjectId(), classId: mockClassInstance._id }]);
        query.sort = jest.fn().mockResolvedValue([{ _id: new mongoose.Types.ObjectId(), classId: mockClassInstance._id }]);
        return query;
      }),
      findById: jest.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId(), classId: mockClassInstance._id }),
    }),
    Material: Object.assign(jest.fn(), {
      find: jest.fn().mockImplementation(() => {
        const query = Promise.resolve([]);
        query.sort = jest.fn().mockResolvedValue([]);
        return query;
      }),
    }),
    Exercise: Object.assign(jest.fn(), {
      find: jest.fn().mockImplementation(() => {
        const query = Promise.resolve([]);
        query.sort = jest.fn().mockResolvedValue([]);
        return query;
      }),
      findById: jest.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        topicId: new mongoose.Types.ObjectId(),
        title: 'Test Exercise',
        maxPoints: 100
      }),
    }),
    Submission: Object.assign(jest.fn().mockImplementation(() => mockSubmissionInstance), {
      findOne: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(mockSubmissionInstance),
    }),
    SubmissionFile: Object.assign(jest.fn().mockImplementation(() => ({
      save: mockSubmissionFileSave
    })), {
      find: jest.fn().mockResolvedValue([]),
    }),
    Grade: Object.assign(jest.fn().mockImplementation(() => mockGradeInstance), {
      findOne: jest.fn().mockResolvedValue(null),
    }),
    PrivateNote: Object.assign(jest.fn(), {
      find: jest.fn().mockImplementation(() => {
        const query = Promise.resolve([]);
        query.sort = jest.fn().mockResolvedValue([]);
        return query;
      }),
    }),
    ClassPost: Object.assign(jest.fn().mockImplementation(() => mockPostInstance), {
      find: jest.fn().mockImplementation(() => {
        const query = Promise.resolve([mockPostInstance]);
        query.sort = jest.fn().mockResolvedValue([mockPostInstance]);
        return query;
      }),
      findById: jest.fn().mockResolvedValue(mockPostInstance),
    }),
    PostComment: Object.assign(jest.fn().mockImplementation(() => mockCommentInstance), {
      find: jest.fn().mockImplementation(() => {
        const query = Promise.resolve([mockCommentInstance]);
        query.sort = jest.fn().mockResolvedValue([mockCommentInstance]);
        return query;
      }),
    }),
    AttendanceLog: Object.assign(jest.fn().mockImplementation(() => mockAttendanceLogInstance), {
      findOne: jest.fn().mockResolvedValue(null),
    })
  };
});

const request = require('supertest');
const app = require('../index').default || require('../index');

describe('Core API Routes & Middleware Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    broadcastSpy.mockClear();
  });

  describe('Health Check Routes', () => {
    it('should return UP for /health', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'UP', service: 'core-api' });
    });
  });

  describe('Swagger API Documentation', () => {
    it('should serve Swagger UI at /api/docs', async () => {
      const response = await request(app).get('/api/docs/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('swagger');
    });
  });

  describe('Auth Middleware', () => {
    it('should reject requests without authorization header', async () => {
      const response = await request(app).get('/api/classes');
      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Authorization header is missing');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/classes')
        .set('Authorization', 'Bearer invalid-token');
      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid or expired token');
    });

    it('should allow requests with valid token', async () => {
      const response = await request(app)
        .get('/api/classes')
        .set('Authorization', 'Bearer valid-token');
      expect(response.status).toBe(200);
    });
  });

  describe('Classes endpoints & Attendance Logging', () => {
    it('should create a class with default settings', async () => {
      mockClassSave.mockResolvedValueOnce({});
      mockSettingsSave.mockResolvedValueOnce({});

      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Node.js MVC Class', description: 'Learning Express and Mongoose' });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('Class created successfully');
      expect(response.body.class).toBeDefined();
      expect(response.body.settings).toBeDefined();
    });

    it('should join a class using code', async () => {
      mockEnrollmentSave.mockResolvedValueOnce({});

      const response = await request(app)
        .post('/api/classes/join')
        .set('Authorization', 'Bearer valid-token')
        .send({ classCode: 'ABCDEF' });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('Joined class successfully');
    });

    it('should log attendance and broadcast attendance:logged event', async () => {
      mockAttendanceLogSave.mockResolvedValueOnce({});

      const classId = new (require('mongoose')).Types.ObjectId();
      const response = await request(app)
        .post(`/api/classes/${classId}/attendance`)
        .set('Authorization', 'Bearer valid-token')
        .send({
          studentId: 'mock-user-id-123',
          date: '2026-07-06',
          status: 'present'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Attendance logged successfully');
      expect(broadcastSpy).toHaveBeenCalledWith(classId.toString(), 'attendance:logged', expect.any(Object));
    });
  });

  describe('Submissions and S3 Mock Presigned URLs', () => {
    it('should register submission and return mock S3 pre-signed urls', async () => {
      mockSubmissionSave.mockResolvedValueOnce({});
      mockSubmissionFileSave.mockResolvedValue({});

      const response = await request(app)
        .post('/api/exercises/some-exercise-id/submissions')
        .set('Authorization', 'Bearer valid-token')
        .send({
          files: [
            { fileName: 'assignment1.pdf', fileSize: 10240 },
            { fileName: 'notes.txt', fileSize: 500 }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('Work submitted successfully');
      expect(response.body.mockS3PresignedUploads).toHaveLength(2);
      expect(response.body.mockS3PresignedUploads[0].presignedUploadUrl).toContain('mockSignatureSignature');
    });
  });

  describe('Grading and socket broadcast', () => {
    it('should grade submission and broadcast grade:updated event', async () => {
      mockGradeSave.mockResolvedValueOnce({});

      const submissionId = new (require('mongoose')).Types.ObjectId();
      const response = await request(app)
        .post(`/api/submissions/${submissionId}/grade`)
        .set('Authorization', 'Bearer valid-token')
        .send({
          points: 90,
          feedback: 'Excellent work!'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Submission graded successfully');
      expect(broadcastSpy).toHaveBeenCalledWith(expect.any(String), 'grade:updated', expect.any(Object));
    });
  });

  describe('Stream Posts & Comments socket broadcasts', () => {
    it('should create stream post and broadcast post:created event', async () => {
      mockPostSave.mockResolvedValueOnce({});

      const classId = new (require('mongoose')).Types.ObjectId();
      const response = await request(app)
        .post(`/api/classes/${classId}/posts`)
        .set('Authorization', 'Bearer valid-token')
        .send({
          content: 'Hello Class!'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('Post created successfully');
      expect(broadcastSpy).toHaveBeenCalledWith(classId.toString(), 'post:created', expect.any(Object));
    });

    it('should create comment and broadcast comment:created event', async () => {
      mockCommentSave.mockResolvedValueOnce({});

      const postId = new (require('mongoose')).Types.ObjectId();
      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', 'Bearer valid-token')
        .send({
          content: 'Nice post!'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('Comment added successfully');
      expect(broadcastSpy).toHaveBeenCalledWith(expect.any(String), 'comment:created', expect.any(Object));
    });
  });
});
