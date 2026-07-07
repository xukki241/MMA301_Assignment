const path = require('path');
const mongoose = require('mongoose');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Mock mongoose connect
mongoose.connect = () => Promise.resolve();

// Start a mock gRPC notification server on port 50052
const PROTO_PATH = path.join(__dirname, '../../proto/notification.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const notificationProto = grpc.loadPackageDefinition(packageDefinition).notification;

let grpcServer;
let gRpcReceivedPayload = null;

function StreamNotification(call) {}
function SendNotification(call, callback) {
  gRpcReceivedPayload = call.request;
  console.log('Mock gRPC Notification Server received:', call.request);
  callback(null, {
    success: true,
    notificationId: 'mock-notif-12345'
  });
}

function startMockGrpcServer() {
  return new Promise((resolve) => {
    grpcServer = new grpc.Server();
    grpcServer.addService(notificationProto.NotificationService.service, {
      StreamNotification,
      SendNotification
    });
    grpcServer.bindAsync('127.0.0.1:50052', grpc.ServerCredentials.createInsecure(), (err, port) => {
      if (err) {
        console.error('Failed to bind mock gRPC server:', err);
        process.exit(1);
      }
      grpcServer.start();
      console.log(`Mock gRPC Notification Server listening on port ${port}`);
      resolve();
    });
  });
}

const {
  runDailyAnalyticsJob: processAnalytics
} = require('../dist/index');

const Class = mongoose.model('Class');
const Enrollment = mongoose.model('Enrollment');
const Topic = mongoose.model('Topic');
const Exercise = mongoose.model('Exercise');
const Submission = mongoose.model('Submission');
const AlertThreshold = mongoose.model('AlertThreshold');
const AttendanceLog = mongoose.model('AttendanceLog');
const StudentPerformanceMetrics = mongoose.model('StudentPerformanceMetrics');
const AlertLog = mongoose.model('AlertLog');

// Mock data
const mockClassId = new mongoose.Types.ObjectId();
const mockTopicId = new mongoose.Types.ObjectId();
const mockEx1Id = new mongoose.Types.ObjectId();
const mockEx2Id = new mongoose.Types.ObjectId();
const mockEx3Id = new mongoose.Types.ObjectId();

const mockClass = { _id: mockClassId, name: 'Active Class', status: 'active' };
const mockEnrollment = { classId: mockClassId, studentId: 'student-123', status: 'enrolled' };
const mockTopic = { _id: mockTopicId, classId: mockClassId, title: 'Topic 1' };

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const mockExercises = [
  { _id: mockEx1Id, topicId: mockTopicId, title: 'Ex 1 (Past, Sub)', dueDate: yesterday, maxPoints: 100 },
  { _id: mockEx2Id, topicId: mockTopicId, title: 'Ex 2 (Past, Missing)', dueDate: yesterday, maxPoints: 100 },
  { _id: mockEx3Id, topicId: mockTopicId, title: 'Ex 3 (Future)', dueDate: tomorrow, maxPoints: 100 }
];

const mockSubmissions = [
  { exerciseId: mockEx1Id, studentId: 'student-123', status: 'graded', points: 80 }
];

const mockAttendanceLogs = [
  { classId: mockClassId, studentId: 'student-123', date: yesterday, status: 'present' },
  { classId: mockClassId, studentId: 'student-123', date: yesterday, status: 'absent' },
  { classId: mockClassId, studentId: 'student-123', date: yesterday, status: 'late' },
  { classId: mockClassId, studentId: 'student-123', date: yesterday, status: 'present' }
];

const mockThresholds = [
  { classId: mockClassId, metricType: 'grades', thresholdValue: 60, severity: 'medium' },
  { classId: mockClassId, metricType: 'submissions', thresholdValue: 0, severity: 'high' },
  { classId: mockClassId, metricType: 'attendance', thresholdValue: 80, severity: 'medium' }
];

// Stubs
Class.find = () => Promise.resolve([mockClass]);
Enrollment.find = () => Promise.resolve([mockEnrollment]);
Topic.find = () => Promise.resolve([mockTopic]);
Exercise.find = () => Promise.resolve(mockExercises);
AlertThreshold.find = () => Promise.resolve(mockThresholds);
Submission.find = () => Promise.resolve(mockSubmissions);
AttendanceLog.find = () => Promise.resolve(mockAttendanceLogs);

let savedMetrics = null;
StudentPerformanceMetrics.findOneAndUpdate = (query, update, options) => {
  savedMetrics = { ...query, ...update };
  return Promise.resolve(savedMetrics);
};

StudentPerformanceMetrics.findOne = () => Promise.resolve(null);

let savedAlert = null;
AlertLog.create = (doc) => {
  savedAlert = doc;
  return Promise.resolve(doc);
};

async function runTest() {
  await startMockGrpcServer();
  console.log('Running worker business logic tests...');
  try {
    await processAnalytics();
    
    console.log('Calculated Metrics:', savedMetrics);
    console.log('Triggered Alert:', savedAlert);

    // Assertions
    if (savedMetrics.currentAverage !== 80) {
      throw new Error(`Expected currentAverage to be 80, got ${savedMetrics.currentAverage}`);
    }

    if (savedMetrics.missingCount !== 1) {
      throw new Error(`Expected missingCount to be 1, got ${savedMetrics.missingCount}`);
    }

    if (savedMetrics.attendanceRate !== 75) {
      throw new Error(`Expected attendanceRate to be 75, got ${savedMetrics.attendanceRate}`);
    }

    if (savedMetrics.riskLevel !== 'Critical') {
      throw new Error(`Expected riskLevel to be 'Critical', got ${savedMetrics.riskLevel}`);
    }

    if (!savedAlert || savedAlert.severity !== 'high' || !savedAlert.message.includes('Missing assignments 1 exceed maximum allowed of 0.')) {
      throw new Error(`Expected AlertLog to be created with high severity, got: ${JSON.stringify(savedAlert)}`);
    }

    // Verify gRPC received payload
    if (!gRpcReceivedPayload) {
      throw new Error('Expected gRPC notification payload to be received by mock server, but it was not.');
    }
    console.log('Verified gRPC transmission payload:', gRpcReceivedPayload);

    console.log('Worker Verification: PASSED!');
    grpcServer.forceShutdown();
    process.exit(0);
  } catch (err) {
    console.error('Worker Verification FAILED:', err);
    if (grpcServer) grpcServer.forceShutdown();
    process.exit(1);
  }
}

runTest();
